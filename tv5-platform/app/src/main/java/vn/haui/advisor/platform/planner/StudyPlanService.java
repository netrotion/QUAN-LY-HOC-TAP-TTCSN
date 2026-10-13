package vn.haui.advisor.platform.planner;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.AcademicFacade;
import vn.haui.advisor.platform.academic.AcademicToolGate;
import vn.haui.advisor.platform.academic.PolicyVersionSource;
import vn.haui.advisor.platform.config.PlannerProperties;
import vn.haui.advisor.platform.error.ApiException;
import vn.haui.advisor.platform.planner.StudyPlanRepository.PlanRow;
import vn.haui.advisor.platform.planner.StudyPlanRepository.StudentLock;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Vòng đời Kế hoạch học tập trên PostgreSQL (Task 3.7), giữ nguyên ngữ nghĩa contracts-v1 (CD-01..CD-05).
 *
 * - Mọi thao tác ghi chạy trong một giao dịch và khóa hồ sơ sinh viên trước (SELECT ... FOR UPDATE), nên các yêu cầu
 *   đồng thời của cùng sinh viên được tuần tự hóa; planVersion là optimistic lock phía client.
 * - Lưu nháp luôn DRAFT; sửa DRAFT/VALIDATED tăng planVersion và hủy kết quả thẩm định; sửa ACTIVE tạo DRAFT kế thừa.
 * - Chỉ thẩm định thật (AcademicFacade khai báo VALIDATE_STUDY_PLAN) mới đưa kế hoạch tới VALIDATED; chưa có công cụ thật
 *   thì trả 503 TOOL_NOT_READY, dev/test có thể thẩm định thử (MOCK) nhưng trạng thái không đổi.
 * - Kích hoạt: kiểm tra planVersion, dataRevision, thẩm định lại trên hồ sơ và quy chế hiện hành, lưu trữ bản ACTIVE cũ
 *   và ghi bản mới trong cùng giao dịch; DB giữ ràng buộc một ACTIVE mỗi sinh viên.
 */
@Service
public class StudyPlanService {

    private static final int MAX_NAME = 150;
    private static final int MAX_CODE = 30;
    private static final int MAX_COURSE_CODE = 50;
    private static final int MAX_TEXT = 255;
    private static final int MAX_CREDITS = 30;

    private final StudyPlanRepository repository;
    private final AcademicFacade academicFacade;
    private final AcademicToolGate tools;
    private final PolicyVersionSource policy;
    private final PlannerProperties limits;
    private final TransactionTemplate transaction;

    public StudyPlanService(StudyPlanRepository repository, AcademicFacade academicFacade, AcademicToolGate tools,
                            PolicyVersionSource policy, PlannerProperties limits, TransactionTemplate transaction) {
        this.repository = repository;
        this.academicFacade = academicFacade;
        this.tools = tools;
        this.policy = policy;
        this.limits = limits;
        this.transaction = transaction;
    }

    public StudyPlanListResponse list(TrustedStudentContext context) {
        List<StudyPlanSummaryItem> items = repository.list(context.getStudentId()).stream()
                .map(p -> new StudyPlanSummaryItem(p.planId, p.planName, p.version, p.status, p.sourcePlanId, p.totalCredits,
                        p.projectedCpa, text(p.updatedAt)))
                .toList();
        return new StudyPlanListResponse(new ArrayList<>(items));
    }

    public StudyPlanDetailResponse get(TrustedStudentContext context, String planId) {
        PlanRow plan = find(context.getStudentId(), planId);
        return detail(plan, context.getDataRevision());
    }

    public SaveStudyPlanResponse save(TrustedStudentContext context, SaveStudyPlanRequest request) {
        if (request == null || isBlank(request.getPlanName()) || request.getSemesters() == null) {
            throw ApiException.badRequest("planName và semesters là bắt buộc khi lưu kế hoạch.");
        }
        checkName(request.getPlanName());
        List<PlannedSemesterItem> semesters = normalize(request.getSemesters());
        List<ChatActionItem> actions = checkActions(request.getActions());
        checkTargets(request.getTargetCpa(), request.getTargetGraduationSemester(), request.getMaxCreditsPerSemester());
        String studentId = context.getStudentId();

        return transaction.execute(status -> {
            StudentLock lock = lock(studentId);
            requireFreshRevision(lock, request.getDataRevision());
            Instant now = Instant.now();

            if (request.getPlanId() == null) {
                PlanRow created = newDraft(studentId, lock, null, now);
                applyContent(created, request);
                insert(created, semesters, actions);
                return saveResponse(created, "Đã lưu nháp kế hoạch mới.");
            }

            PlanRow existing = find(studentId, request.getPlanId());
            requireVersion(existing, request.getPlanVersion());
            switch (existing.status) {
                case ACTIVE -> {
                    PlanRow inherited = newDraft(studentId, lock, existing.planId, now);
                    applyContent(inherited, request);
                    insert(inherited, semesters, actions);
                    return saveResponse(inherited, "Đã lưu nháp. Kế hoạch đang theo dõi không thay đổi.");
                }
                case DRAFT, VALIDATED -> {
                    applyContent(existing, request);
                    existing.dataRevision = lock.dataRevision();
                    existing.updatedAt = now;
                    if (!repository.updateContent(existing, existing.version)) {
                        throw ApiException.versionConflict(existing.version, request.getPlanVersion());
                    }
                    repository.replaceChildren(existing.planId, semesters, actions);
                    existing.version++;
                    existing.status = StudyPlanStatus.DRAFT;
                    return saveResponse(existing, "Đã lưu nháp. Cần kiểm tra điều kiện lại trước khi kích hoạt.");
                }
                default -> throw ApiException.planNotEditable(
                        "Kế hoạch đã lưu trữ hoặc hoàn thành không sửa trực tiếp. Hãy khôi phục thành bản nháp mới.",
                        existing.status.name());
            }
        });
    }

    public ValidateStudyPlanResponse validate(TrustedStudentContext context, ValidateStudyPlanRequest request) {
        if (request == null || (request.getPlanId() == null && request.getSemesters() == null)) {
            throw ApiException.badRequest("Cần planId (bản đã lưu) hoặc semesters (bản chưa lưu) để thẩm định.");
        }
        String studentId = context.getStudentId();

        if (request.getPlanId() == null) {
            List<PlannedSemesterItem> semesters = normalize(request.getSemesters());
            if (isStale(context.getDataRevision(), request.getDataRevision())) {
                throw ApiException.staleRevision(context.getDataRevision(), request.getDataRevision());
            }
            ValidationMode mode = tools.requireValidation();
            ValidateStudyPlanResponse result = callFacade(studentId, null, semesters, null, context.getDataRevision(), mode);
            result.setStatus(mode == ValidationMode.REAL && result.isValid() ? StudyPlanStatus.VALIDATED : StudyPlanStatus.DRAFT);
            return result;
        }

        return transaction.execute(status -> {
            StudentLock lock = lock(studentId);
            requireFreshRevision(lock, request.getDataRevision());
            PlanRow plan = find(studentId, request.getPlanId());
            requireVersion(plan, request.getPlanVersion());
            ValidationMode mode = tools.requireValidation();

            ValidateStudyPlanResponse result = callFacade(studentId, plan.planId, repository.loadSemesters(plan.planId),
                    plan.version, lock.dataRevision(), mode);
            boolean editable = plan.status == StudyPlanStatus.DRAFT || plan.status == StudyPlanStatus.VALIDATED;
            if (mode == ValidationMode.REAL && editable) {
                plan.status = result.isValid() ? StudyPlanStatus.VALIDATED : StudyPlanStatus.DRAFT;
                Instant now = Instant.now();
                if (result.isValid()) {
                    repository.recordValidation(studentId, plan.planId, plan.status, result.getWarnings(), now, plan.version,
                            lock.dataRevision(), result.getPolicyVersion());
                } else {
                    repository.recordValidation(studentId, plan.planId, plan.status, result.getWarnings(), null, null, null, null);
                }
            }
            result.setStatus(plan.status);
            return result;
        });
    }

    public ActivateStudyPlanResponse activate(TrustedStudentContext context, String planId, ActivateStudyPlanRequest request) {
        if (request == null) {
            throw ApiException.badRequest("planVersion là bắt buộc khi kích hoạt kế hoạch.");
        }
        String studentId = context.getStudentId();

        ActivationOutcome outcome = transaction.execute(status -> {
            StudentLock lock = lock(studentId);
            PlanRow plan = find(studentId, planId);
            requireVersion(plan, request.getPlanVersion());
            requireFreshRevision(lock, request.getDataRevision());
            tools.requireRealValidation();
            if (plan.status != StudyPlanStatus.VALIDATED || !Objects.equals(plan.validatedPlanVersion, plan.version)) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, ApiErrorCode.PLAN_NOT_VALIDATED,
                        "Chỉ kích hoạt được kế hoạch đã thẩm định hợp lệ. Hãy bấm \"Kiểm tra điều kiện\" trước.",
                        List.of("Trạng thái hiện tại: " + plan.status));
            }

            // Thẩm định lại trên hồ sơ và quy chế hiện hành, trong cùng giao dịch với việc kích hoạt
            ValidateStudyPlanResponse revalidation = callFacade(studentId, plan.planId, repository.loadSemesters(plan.planId),
                    plan.version, lock.dataRevision(), ValidationMode.REAL);
            if (!revalidation.isValid()) {
                repository.recordValidation(studentId, plan.planId, StudyPlanStatus.DRAFT, revalidation.getWarnings(),
                        null, null, null, null);
                return ActivationOutcome.failed(revalidation.getViolations());
            }

            List<String> changed = new ArrayList<>();
            if (!Objects.equals(plan.validatedDataRevision, lock.dataRevision())) {
                changed.add("dữ liệu học vụ");
            }
            if (!Objects.equals(plan.validatedPolicyVersion, revalidation.getPolicyVersion())) {
                changed.add("quy chế");
            }

            Instant now = Instant.now();
            List<String> archived = repository.archiveActive(studentId, plan.planId, now);
            repository.activate(studentId, plan.planId, now, revalidation.getWarnings(), plan.version, lock.dataRevision(),
                    revalidation.getPolicyVersion());

            StringBuilder message = new StringBuilder(archived.isEmpty()
                    ? "Đã kích hoạt kế hoạch."
                    : "Đã kích hoạt kế hoạch. Kế hoạch đang theo dõi trước đó đã được lưu trữ.");
            if (!changed.isEmpty()) {
                message.append(" ").append(capitalize(String.join(" và ", changed)))
                        .append(" đã thay đổi sau lần kiểm tra trước; kế hoạch đã được kiểm tra lại trên dữ liệu hiện tại.");
            }
            return ActivationOutcome.activated(new ActivateStudyPlanResponse(plan.planId, StudyPlanStatus.ACTIVE, text(now),
                    archived, message.toString()));
        });

        if (outcome.violations() != null) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, ApiErrorCode.PLAN_VALIDATION_FAILED,
                    "Kế hoạch vi phạm quy chế khi thẩm định lại lúc kích hoạt.", outcome.violations());
        }
        return outcome.response();
    }

    public StudyPlanDetailResponse restore(TrustedStudentContext context, String planId, RestoreStudyPlanRequest request) {
        String requestedName = request != null ? request.getPlanName() : null;
        if (!isBlank(requestedName)) {
            checkName(requestedName);
        }
        String studentId = context.getStudentId();

        return transaction.execute(status -> {
            StudentLock lock = lock(studentId);
            PlanRow origin = find(studentId, planId);
            PlanRow copy = newDraft(studentId, lock, origin.planId, Instant.now());
            copy.planName = !isBlank(requestedName) ? requestedName.trim() : truncate("Bản sao từ " + origin.planName, MAX_NAME);
            copy.targetCpa = origin.targetCpa;
            copy.targetGraduationSemester = origin.targetGraduationSemester;
            copy.maxCreditsPerSemester = origin.maxCreditsPerSemester;
            copy.projectedCpa = origin.projectedCpa;
            insert(copy, repository.loadSemesters(origin.planId), repository.loadActions(origin.planId));
            return detail(find(studentId, copy.planId), lock.dataRevision());
        });
    }

    /** Hủy bản nháp (DRAFT/VALIDATED). Bản ACTIVE/ARCHIVED/COMPLETED là lịch sử theo dõi, không xóa. */
    public void delete(TrustedStudentContext context, String planId, Integer planVersion) {
        String studentId = context.getStudentId();
        transaction.executeWithoutResult(status -> {
            lock(studentId);
            PlanRow plan = find(studentId, planId);
            requireVersion(plan, planVersion);
            if (plan.status != StudyPlanStatus.DRAFT && plan.status != StudyPlanStatus.VALIDATED) {
                throw ApiException.planNotEditable(plan.status == StudyPlanStatus.ACTIVE
                        ? "Không hủy được kế hoạch đang theo dõi. Hãy kích hoạt kế hoạch khác để thay thế."
                        : "Kế hoạch đã lưu trữ hoặc hoàn thành được giữ làm lịch sử, không hủy được.", plan.status.name());
            }
            repository.delete(studentId, planId);
        });
    }

    // ---------------------------------------------------------------------------------------------

    private record ActivationOutcome(ActivateStudyPlanResponse response, List<String> violations) {
        static ActivationOutcome activated(ActivateStudyPlanResponse response) {
            return new ActivationOutcome(response, null);
        }

        static ActivationOutcome failed(List<String> violations) {
            return new ActivationOutcome(null, violations == null ? List.of() : violations);
        }
    }

    private StudentLock lock(String studentId) {
        return repository.lockStudent(studentId)
                .orElseThrow(() -> new IllegalStateException("Không có hồ sơ sinh viên " + studentId));
    }

    private PlanRow find(String studentId, String planId) {
        if (planId == null) {
            throw ApiException.notFound(null);
        }
        return repository.find(studentId, planId).orElseThrow(() -> ApiException.notFound(planId));
    }

    private PlanRow newDraft(String studentId, StudentLock lock, String sourcePlanId, Instant now) {
        if (repository.count(studentId) >= limits.getMaxPlansPerStudent()) {
            throw ApiException.badRequest("Đã có tối đa " + limits.getMaxPlansPerStudent()
                    + " kế hoạch. Hãy hủy bớt bản nháp không dùng trước khi tạo kế hoạch mới.");
        }
        PlanRow plan = new PlanRow();
        plan.planId = repository.nextPlanId(studentId, lock);
        plan.studentId = studentId;
        plan.status = StudyPlanStatus.DRAFT;
        plan.version = 1;
        plan.sourcePlanId = sourcePlanId;
        plan.dataRevision = lock.dataRevision();
        plan.createdAt = now;
        plan.updatedAt = now;
        return plan;
    }

    private void insert(PlanRow plan, List<PlannedSemesterItem> semesters, List<ChatActionItem> actions) {
        repository.insert(plan);
        repository.replaceChildren(plan.planId, semesters, actions);
    }

    private static void applyContent(PlanRow plan, SaveStudyPlanRequest request) {
        plan.planName = request.getPlanName().trim();
        plan.targetCpa = request.getTargetCpa();
        plan.targetGraduationSemester = request.getTargetGraduationSemester();
        plan.maxCreditsPerSemester = request.getMaxCreditsPerSemester();
        plan.warnings = new ArrayList<>();
    }

    private static void requireFreshRevision(StudentLock lock, String clientRevision) {
        if (isStale(lock.dataRevision(), clientRevision)) {
            throw ApiException.staleRevision(lock.dataRevision(), clientRevision);
        }
    }

    private static boolean isStale(String currentRevision, String clientRevision) {
        return !isBlank(clientRevision) && !clientRevision.trim().equals(currentRevision);
    }

    private static void requireVersion(PlanRow plan, Integer clientVersion) {
        if (clientVersion == null) {
            throw ApiException.badRequest("planVersion là bắt buộc khi thao tác trên kế hoạch đã lưu.");
        }
        if (clientVersion != plan.version) {
            throw ApiException.versionConflict(plan.version, clientVersion);
        }
    }

    private ValidateStudyPlanResponse callFacade(String studentId, String planId, List<PlannedSemesterItem> semesters,
                                                 Integer planVersion, String dataRevision, ValidationMode mode) {
        // studentId luôn lấy từ context tin cậy, không lấy từ client
        ValidateStudyPlanResponse result = academicFacade.validateStudyPlan(new ValidateStudyPlanRequest(
                planId, studentId, semesters, planVersion, dataRevision));
        result.setPlanVersion(planVersion);
        result.setDataRevision(dataRevision);
        result.setViolations(copy(result.getViolations()));
        result.setWarnings(copy(result.getWarnings()));
        result.setValidationMode(mode);
        result.setPolicyVersion(policy.currentPolicyVersion());
        if (mode == ValidationMode.MOCK) {
            result.getWarnings().add(0, "Kết quả thẩm định thử (MOCK): công cụ thẩm định thật chưa sẵn sàng, "
                    + "kế hoạch chưa đủ điều kiện kích hoạt.");
        }
        return result;
    }

    private StudyPlanDetailResponse detail(PlanRow plan, String currentRevision) {
        List<PlannedSemesterItem> semesters = repository.loadSemesters(plan.planId);
        List<String> warnings = copy(plan.warnings);
        warnings.addAll(trackingWarnings(plan, currentRevision));

        StudyPlanDetailResponse detail = new StudyPlanDetailResponse();
        detail.setPlanId(plan.planId);
        detail.setStudentId(plan.studentId);
        detail.setPlanName(plan.planName);
        detail.setStatus(plan.status);
        detail.setPlanVersion(plan.version);
        detail.setSourcePlanId(plan.sourcePlanId);
        detail.setDataRevision(plan.dataRevision);
        detail.setTargetCpa(plan.targetCpa);
        detail.setTargetGraduationSemester(plan.targetGraduationSemester);
        detail.setMaxCreditsPerSemester(plan.maxCreditsPerSemester);
        detail.setTotalCredits(plan.totalCredits);
        detail.setProjectedCpa(plan.projectedCpa);
        detail.setSemesters(semesters);
        detail.setActions(repository.loadActions(plan.planId));
        detail.setWarnings(warnings);
        detail.setCreatedAt(text(plan.createdAt));
        detail.setUpdatedAt(text(plan.updatedAt));
        detail.setActivatedAt(text(plan.activatedAt));
        detail.setValidatedAt(text(plan.validatedAt));
        return detail;
    }

    /** Theo dõi: kết quả thẩm định/kích hoạt dựa trên hồ sơ hoặc quy chế đã cũ. */
    private List<String> trackingWarnings(PlanRow plan, String currentRevision) {
        List<String> warnings = new ArrayList<>();
        if (plan.status != StudyPlanStatus.ACTIVE && plan.status != StudyPlanStatus.VALIDATED) {
            return warnings;
        }
        boolean revisionChanged = plan.validatedDataRevision != null && !plan.validatedDataRevision.equals(currentRevision);
        boolean policyChanged = plan.validatedPolicyVersion != null
                && !plan.validatedPolicyVersion.equals(policy.currentPolicyVersion());
        String subject = plan.status == StudyPlanStatus.ACTIVE ? "kích hoạt" : "kiểm tra điều kiện";
        if (revisionChanged) {
            warnings.add("Dữ liệu học vụ đã thay đổi sau khi " + subject + " (" + plan.validatedDataRevision + " → "
                    + currentRevision + "); hãy đối chiếu lại kế hoạch.");
        }
        if (policyChanged) {
            warnings.add("Quy chế đã cập nhật sau khi " + subject + " (" + plan.validatedPolicyVersion + " → "
                    + policy.currentPolicyVersion() + "); hãy kiểm tra điều kiện lại.");
        }
        return warnings;
    }

    private static SaveStudyPlanResponse saveResponse(PlanRow plan, String message) {
        return new SaveStudyPlanResponse(plan.planId, plan.planName, plan.status, plan.version, plan.sourcePlanId,
                plan.dataRevision, text(plan.updatedAt), message);
    }

    // ----- Kiểm tra đầu vào: chặn dữ liệu quá lớn/sai trước khi tới DB -----

    /** Server là nguồn duy nhất của tổng tín chỉ: tính lại từ danh sách môn, đánh số thứ tự học kỳ. */
    private List<PlannedSemesterItem> normalize(List<PlannedSemesterItem> semesters) {
        if (semesters.size() > limits.getMaxSemesters()) {
            throw ApiException.badRequest("Kế hoạch có tối đa " + limits.getMaxSemesters() + " học kỳ.");
        }
        List<PlannedSemesterItem> result = new ArrayList<>();
        List<Integer> orders = new ArrayList<>();
        int order = 1;
        for (PlannedSemesterItem source : semesters) {
            if (source == null || isBlank(source.getSemesterCode()) || source.getSemesterCode().length() > MAX_CODE) {
                throw ApiException.badRequest("Mỗi học kỳ cần semesterCode (tối đa " + MAX_CODE + " ký tự).");
            }
            checkLength(source.getSemesterName(), 100, "semesterName");
            int semesterOrder = source.getSemesterOrder() != null ? source.getSemesterOrder() : order;
            if (semesterOrder < 1 || orders.contains(semesterOrder)) {
                throw ApiException.badRequest("semesterOrder phải dương và không trùng nhau.");
            }
            orders.add(semesterOrder);
            List<PlannedCourseItem> sourceCourses = source.getCourses() == null ? List.of() : source.getCourses();
            if (sourceCourses.size() > limits.getMaxCoursesPerSemester()) {
                throw ApiException.badRequest("Mỗi học kỳ có tối đa " + limits.getMaxCoursesPerSemester() + " học phần.");
            }
            if (source.getExpectedGpa() != null && outside(source.getExpectedGpa(), BigDecimal.ZERO, new BigDecimal("4"))) {
                throw ApiException.badRequest("expectedGpa phải trong khoảng 0–4.");
            }
            List<PlannedCourseItem> courses = new ArrayList<>();
            int total = 0;
            for (PlannedCourseItem c : sourceCourses) {
                if (c == null || isBlank(c.getCourseCode()) || c.getCourseCode().length() > MAX_COURSE_CODE) {
                    throw ApiException.badRequest("Mỗi học phần cần courseCode (tối đa " + MAX_COURSE_CODE + " ký tự).");
                }
                if (c.getCredits() != null && (c.getCredits() < 0 || c.getCredits() > MAX_CREDITS)) {
                    throw ApiException.badRequest("Số tín chỉ của " + c.getCourseCode() + " phải trong khoảng 0–" + MAX_CREDITS + ".");
                }
                checkLength(c.getCourseName(), MAX_TEXT, "courseName");
                checkLength(c.getTargetGrade(), 5, "targetGrade");
                checkLength(c.getCourseType(), MAX_CODE, "courseType");
                checkLength(c.getStatus(), 20, "status");
                checkLength(c.getRationale(), 2000, "rationale");
                courses.add(new PlannedCourseItem(c.getCourseCode().trim(), c.getCourseName(), c.getCredits(),
                        c.getTargetGrade(), c.getRationale(), c.getCourseType(), c.getStatus()));
                total += c.getCredits() != null ? c.getCredits() : 0;
            }
            result.add(new PlannedSemesterItem(semesterOrder, source.getSemesterCode().trim(), source.getSemesterName(),
                    courses, total, source.getExpectedGpa()));
            order++;
        }
        return result;
    }

    private List<ChatActionItem> checkActions(List<ChatActionItem> actions) {
        if (actions == null) {
            return List.of();
        }
        if (actions.size() > limits.getMaxActions()) {
            throw ApiException.badRequest("Kế hoạch có tối đa " + limits.getMaxActions() + " action.");
        }
        for (ChatActionItem action : actions) {
            if (action == null || isBlank(action.getActionType()) || action.getActionType().length() > 50) {
                throw ApiException.badRequest("Mỗi action cần actionType (tối đa 50 ký tự).");
            }
            checkLength(action.getLabel(), MAX_TEXT, "label");
            checkLength(action.getTargetRoute(), MAX_TEXT, "targetRoute");
            checkLength(action.getPayloadJson(), 20_000, "payloadJson");
            checkLength(action.getDescription(), 2000, "description");
        }
        return actions;
    }

    private static void checkTargets(BigDecimal targetCpa, String targetSemester, Integer maxCredits) {
        if (targetCpa != null && outside(targetCpa, BigDecimal.ZERO, new BigDecimal("4"))) {
            throw ApiException.badRequest("targetCpa phải trong khoảng 0–4.");
        }
        checkLength(targetSemester, MAX_CODE, "targetGraduationSemester");
        if (maxCredits != null && (maxCredits < 0 || maxCredits > 60)) {
            throw ApiException.badRequest("maxCreditsPerSemester phải trong khoảng 0–60.");
        }
    }

    private static void checkName(String name) {
        if (name.trim().length() > MAX_NAME) {
            throw ApiException.badRequest("Tên kế hoạch tối đa " + MAX_NAME + " ký tự.");
        }
    }

    private static void checkLength(String value, int max, String field) {
        if (value != null && value.length() > max) {
            throw ApiException.badRequest(field + " tối đa " + max + " ký tự.");
        }
    }

    private static boolean outside(BigDecimal value, BigDecimal min, BigDecimal max) {
        return value.compareTo(min) < 0 || value.compareTo(max) > 0;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String truncate(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max);
    }

    private static String capitalize(String value) {
        return value.isEmpty() ? value : Character.toUpperCase(value.charAt(0)) + value.substring(1);
    }

    private static String text(Instant instant) {
        return instant == null ? null : instant.toString();
    }

    private static <T> List<T> copy(List<T> source) {
        return source != null ? new ArrayList<>(source) : new ArrayList<>();
    }
}
