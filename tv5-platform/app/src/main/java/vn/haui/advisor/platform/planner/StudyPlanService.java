package vn.haui.advisor.platform.planner;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.AcademicFacade;
import vn.haui.advisor.contracts.ports.StudentContextProvider;
import vn.haui.advisor.platform.error.ApiException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Vòng đời Kế hoạch học tập theo contracts-v1 (task-2.3 contract delta CD-01..CD-05).
 *
 * - Lưu nháp luôn DRAFT; sửa DRAFT/VALIDATED tăng planVersion và hủy validation; sửa ACTIVE tạo DRAFT kế thừa.
 * - Validate ủy quyền cho AcademicFacade (TV4); bản đã lưu hợp lệ chuyển VALIDATED.
 * - Activate chỉ nhận VALIDATED, thẩm định lại trên revision hiện tại và lưu trữ bản ACTIVE cũ trong cùng khối khóa.
 * - Restore tạo DRAFT mới từ bất kỳ kế hoạch nào; bản gốc giữ nguyên.
 *
 * Lưu trữ trong bộ nhớ theo từng sinh viên; persistence PostgreSQL thay thế ở Task 3.2 mà không đổi contract.
 */
@Service
public class StudyPlanService {

    private final AcademicFacade academicFacade;
    private final StudentContextProvider studentContextProvider;
    private final Map<String, Map<String, StoredPlan>> plansByStudent = new ConcurrentHashMap<>();
    private final AtomicLong sequence = new AtomicLong();

    public StudyPlanService(AcademicFacade academicFacade, StudentContextProvider studentContextProvider) {
        this.academicFacade = academicFacade;
        this.studentContextProvider = studentContextProvider;
    }

    public StudyPlanListResponse list(TrustedStudentContext context) {
        Map<String, StoredPlan> plans = plansOf(context);
        synchronized (plans) {
            List<StudyPlanSummaryItem> items = plans.values().stream()
                    .sorted(Comparator.comparing((StoredPlan p) -> p.updatedAt).reversed())
                    .map(StoredPlan::toSummary)
                    .toList();
            return new StudyPlanListResponse(new ArrayList<>(items));
        }
    }

    public StudyPlanDetailResponse get(TrustedStudentContext context, String planId) {
        Map<String, StoredPlan> plans = plansOf(context);
        synchronized (plans) {
            return find(plans, planId).toDetail();
        }
    }

    public SaveStudyPlanResponse save(TrustedStudentContext context, SaveStudyPlanRequest request) {
        if (request.getPlanName() == null || request.getPlanName().isBlank() || request.getSemesters() == null) {
            throw ApiException.badRequest("planName và semesters là bắt buộc khi lưu kế hoạch.");
        }
        requireFreshRevision(context, request.getDataRevision());

        Map<String, StoredPlan> plans = plansOf(context);
        synchronized (plans) {
            String now = Instant.now().toString();
            if (request.getPlanId() == null) {
                StoredPlan created = newDraft(context, null, now);
                created.applyContent(request);
                plans.put(created.planId, created);
                return created.toSaveResponse("Đã lưu nháp kế hoạch mới.");
            }

            StoredPlan existing = find(plans, request.getPlanId());
            requireVersion(existing, request.getPlanVersion());
            switch (existing.status) {
                case ACTIVE -> {
                    StoredPlan inherited = newDraft(context, existing.planId, now);
                    inherited.applyContent(request);
                    plans.put(inherited.planId, inherited);
                    return inherited.toSaveResponse("Đã lưu nháp. Kế hoạch đang theo dõi không thay đổi.");
                }
                case DRAFT, VALIDATED -> {
                    existing.applyContent(request);
                    existing.status = StudyPlanStatus.DRAFT;
                    existing.planVersion++;
                    existing.dataRevision = context.getDataRevision();
                    existing.updatedAt = now;
                    return existing.toSaveResponse("Đã lưu nháp. Cần kiểm tra điều kiện lại trước khi kích hoạt.");
                }
                default -> throw new ApiException(HttpStatus.CONFLICT, ApiErrorCode.PLAN_NOT_EDITABLE,
                        "Kế hoạch đã lưu trữ hoặc hoàn thành không sửa trực tiếp. Hãy khôi phục thành bản nháp mới.",
                        List.of("Trạng thái hiện tại: " + existing.status));
            }
        }
    }

    public ValidateStudyPlanResponse validate(TrustedStudentContext context, ValidateStudyPlanRequest request) {
        requireFreshRevision(context, request.getDataRevision());

        if (request.getPlanId() == null) {
            if (request.getSemesters() == null) {
                throw ApiException.badRequest("Cần planId (bản đã lưu) hoặc semesters (bản chưa lưu) để thẩm định.");
            }
            ValidateStudyPlanResponse result = callFacade(context, null, normalize(request.getSemesters()), null);
            result.setPlanVersion(null);
            return result;
        }

        Map<String, StoredPlan> plans = plansOf(context);
        synchronized (plans) {
            StoredPlan plan = find(plans, request.getPlanId());
            requireVersion(plan, request.getPlanVersion());
            ValidateStudyPlanResponse result = callFacade(context, plan.planId, plan.semesters, plan.planVersion);
            if (plan.status == StudyPlanStatus.DRAFT || plan.status == StudyPlanStatus.VALIDATED) {
                plan.status = result.isValid() ? StudyPlanStatus.VALIDATED : StudyPlanStatus.DRAFT;
                plan.warnings = copy(result.getWarnings());
                plan.dataRevision = context.getDataRevision();
            }
            result.setStatus(plan.status);
            return result;
        }
    }

    public ActivateStudyPlanResponse activate(TrustedStudentContext context, String planId, ActivateStudyPlanRequest request) {
        Map<String, StoredPlan> plans = plansOf(context);
        synchronized (plans) {
            StoredPlan plan = find(plans, planId);
            requireFreshRevision(context, request.getDataRevision());
            requireVersion(plan, request.getPlanVersion());
            if (plan.status != StudyPlanStatus.VALIDATED) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, ApiErrorCode.PLAN_NOT_VALIDATED,
                        "Chỉ kích hoạt được kế hoạch đã thẩm định hợp lệ. Hãy bấm \"Kiểm tra điều kiện\" trước.",
                        List.of("Trạng thái hiện tại: " + plan.status));
            }

            ValidateStudyPlanResponse revalidation = callFacade(context, plan.planId, plan.semesters, plan.planVersion);
            if (!revalidation.isValid()) {
                plan.status = StudyPlanStatus.DRAFT;
                plan.warnings = copy(revalidation.getWarnings());
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, ApiErrorCode.PLAN_VALIDATION_FAILED,
                        "Kế hoạch vi phạm quy chế khi thẩm định lại lúc kích hoạt.", copy(revalidation.getViolations()));
            }

            String now = Instant.now().toString();
            List<String> archived = new ArrayList<>();
            for (StoredPlan other : plans.values()) {
                if (other.status == StudyPlanStatus.ACTIVE && !other.planId.equals(plan.planId)) {
                    other.status = StudyPlanStatus.ARCHIVED;
                    archived.add(other.planId);
                }
            }
            plan.status = StudyPlanStatus.ACTIVE;
            plan.activatedAt = now;
            plan.dataRevision = context.getDataRevision();

            return new ActivateStudyPlanResponse(plan.planId, StudyPlanStatus.ACTIVE, now, archived,
                    archived.isEmpty()
                            ? "Đã kích hoạt kế hoạch."
                            : "Đã kích hoạt kế hoạch. Kế hoạch đang theo dõi trước đó đã được lưu trữ.");
        }
    }

    public StudyPlanDetailResponse restore(TrustedStudentContext context, String planId, RestoreStudyPlanRequest request) {
        Map<String, StoredPlan> plans = plansOf(context);
        synchronized (plans) {
            StoredPlan origin = find(plans, planId);
            StoredPlan copy = newDraft(context, origin.planId, Instant.now().toString());
            String requestedName = request != null ? request.getPlanName() : null;
            copy.planName = requestedName != null && !requestedName.isBlank()
                    ? requestedName
                    : "Bản sao từ " + origin.planName;
            copy.targetCpa = origin.targetCpa;
            copy.targetGraduationSemester = origin.targetGraduationSemester;
            copy.maxCreditsPerSemester = origin.maxCreditsPerSemester;
            copy.projectedCpa = origin.projectedCpa;
            copy.semesters = normalize(origin.semesters);
            copy.actions = copy(origin.actions);
            plans.put(copy.planId, copy);
            return copy.toDetail();
        }
    }

    // ---------------------------------------------------------------------------------------------

    private Map<String, StoredPlan> plansOf(TrustedStudentContext context) {
        return plansByStudent.computeIfAbsent(context.getStudentId(), id -> new ConcurrentHashMap<>());
    }

    private static StoredPlan find(Map<String, StoredPlan> plans, String planId) {
        StoredPlan plan = planId != null ? plans.get(planId) : null;
        if (plan == null) {
            throw ApiException.notFound(planId);
        }
        return plan;
    }

    private void requireFreshRevision(TrustedStudentContext context, String clientRevision) {
        if (studentContextProvider.isDataStale(context.getStudentId(), clientRevision)) {
            throw ApiException.staleRevision(context.getDataRevision(), clientRevision);
        }
    }

    private static void requireVersion(StoredPlan plan, Integer clientVersion) {
        if (clientVersion == null) {
            throw ApiException.badRequest("planVersion là bắt buộc khi thao tác trên kế hoạch đã lưu.");
        }
        if (clientVersion != plan.planVersion) {
            throw ApiException.versionConflict(plan.planVersion, clientVersion);
        }
    }

    private ValidateStudyPlanResponse callFacade(TrustedStudentContext context, String planId,
                                                 List<PlannedSemesterItem> semesters, Integer planVersion) {
        // studentId luôn lấy từ context tin cậy, không lấy từ client
        ValidateStudyPlanResponse result = academicFacade.validateStudyPlan(new ValidateStudyPlanRequest(
                planId, context.getStudentId(), semesters, planVersion, context.getDataRevision()));
        result.setPlanVersion(planVersion);
        result.setDataRevision(context.getDataRevision());
        result.setViolations(copy(result.getViolations()));
        result.setWarnings(copy(result.getWarnings()));
        return result;
    }

    private StoredPlan newDraft(TrustedStudentContext context, String sourcePlanId, String now) {
        StoredPlan plan = new StoredPlan();
        plan.planId = "plan-" + context.getStudentId() + "-" + String.format("%04d", sequence.incrementAndGet());
        plan.studentId = context.getStudentId();
        plan.status = StudyPlanStatus.DRAFT;
        plan.planVersion = 1;
        plan.sourcePlanId = sourcePlanId;
        plan.dataRevision = context.getDataRevision();
        plan.createdAt = now;
        plan.updatedAt = now;
        return plan;
    }

    /** Server là nguồn duy nhất của tổng tín chỉ: tính lại từ danh sách môn, đánh số thứ tự học kỳ. */
    static List<PlannedSemesterItem> normalize(List<PlannedSemesterItem> semesters) {
        List<PlannedSemesterItem> result = new ArrayList<>();
        if (semesters == null) {
            return result;
        }
        int order = 1;
        for (PlannedSemesterItem source : semesters) {
            List<PlannedCourseItem> courses = new ArrayList<>();
            int total = 0;
            if (source.getCourses() != null) {
                for (PlannedCourseItem c : source.getCourses()) {
                    courses.add(new PlannedCourseItem(c.getCourseCode(), c.getCourseName(), c.getCredits(),
                            c.getTargetGrade(), c.getRationale(), c.getCourseType(), c.getStatus()));
                    total += c.getCredits() != null ? c.getCredits() : 0;
                }
            }
            result.add(new PlannedSemesterItem(
                    source.getSemesterOrder() != null ? source.getSemesterOrder() : order,
                    source.getSemesterCode(), source.getSemesterName(), courses, total, source.getExpectedGpa()));
            order++;
        }
        return result;
    }

    private static <T> List<T> copy(List<T> source) {
        return source != null ? new ArrayList<>(source) : new ArrayList<>();
    }

    /** Trạng thái lưu trữ nội bộ của một kế hoạch. */
    private static final class StoredPlan {
        String planId;
        String studentId;
        String planName;
        StudyPlanStatus status;
        int planVersion;
        String sourcePlanId;
        String dataRevision;
        BigDecimal targetCpa;
        String targetGraduationSemester;
        Integer maxCreditsPerSemester;
        BigDecimal projectedCpa;
        List<PlannedSemesterItem> semesters = new ArrayList<>();
        List<ChatActionItem> actions = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        String createdAt;
        String updatedAt;
        String activatedAt;

        void applyContent(SaveStudyPlanRequest request) {
            planName = request.getPlanName();
            targetCpa = request.getTargetCpa();
            targetGraduationSemester = request.getTargetGraduationSemester();
            maxCreditsPerSemester = request.getMaxCreditsPerSemester();
            semesters = normalize(request.getSemesters());
            actions = copy(request.getActions());
            warnings = new ArrayList<>();
        }

        int totalCredits() {
            return semesters.stream().map(PlannedSemesterItem::getTotalCredits).filter(Objects::nonNull)
                    .mapToInt(Integer::intValue).sum();
        }

        SaveStudyPlanResponse toSaveResponse(String message) {
            return new SaveStudyPlanResponse(planId, planName, status, planVersion, sourcePlanId, dataRevision,
                    updatedAt, message);
        }

        StudyPlanSummaryItem toSummary() {
            return new StudyPlanSummaryItem(planId, planName, planVersion, status, sourcePlanId, totalCredits(),
                    projectedCpa, updatedAt);
        }

        StudyPlanDetailResponse toDetail() {
            StudyPlanDetailResponse detail = new StudyPlanDetailResponse();
            detail.setPlanId(planId);
            detail.setStudentId(studentId);
            detail.setPlanName(planName);
            detail.setStatus(status);
            detail.setPlanVersion(planVersion);
            detail.setSourcePlanId(sourcePlanId);
            detail.setDataRevision(dataRevision);
            detail.setTargetCpa(targetCpa);
            detail.setTargetGraduationSemester(targetGraduationSemester);
            detail.setMaxCreditsPerSemester(maxCreditsPerSemester);
            detail.setTotalCredits(totalCredits());
            detail.setProjectedCpa(projectedCpa);
            detail.setSemesters(normalize(semesters));
            detail.setActions(copy(actions));
            detail.setWarnings(copy(warnings));
            detail.setCreatedAt(createdAt);
            detail.setUpdatedAt(updatedAt);
            detail.setActivatedAt(activatedAt);
            return detail;
        }
    }
}
