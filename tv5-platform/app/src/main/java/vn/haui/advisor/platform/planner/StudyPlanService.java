package vn.haui.advisor.platform.planner;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.AcademicFacade;
import vn.haui.advisor.platform.academic.AcademicEngineSources;
import vn.haui.advisor.platform.academic.AcademicToolGate;
import vn.haui.advisor.platform.academic.PolicyVersionSource;
import vn.haui.advisor.platform.config.PlannerProperties;
import vn.haui.advisor.platform.error.ApiException;
import vn.haui.advisor.platform.planner.StudyPlanRepository.Check;
import vn.haui.advisor.platform.planner.StudyPlanRepository.PlanRow;
import vn.haui.advisor.platform.planner.StudyPlanRepository.StudentLock;
import vn.haui.advisor.platform.transcript.DbStudentAcademicRecordProvider;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Vòng đời Kế hoạch học tập trên PostgreSQL (Task 3.7) nối với planner tool thật (Task 4.2b), giữ nguyên ngữ nghĩa
 * contracts-v1 (CD-01..CD-05).
 *
 * - Sinh phương án và thẩm định gọi planner tool của TV4 qua AcademicFacade trên hồ sơ server nạp từ DB, ghim cho lượt gọi;
 *   kết quả kèm dataRevision của đúng hồ sơ đó và policyVersion của quy chế đã áp dụng.
 * - Mọi thao tác ghi chạy trong một giao dịch và khóa hồ sơ sinh viên trước (SELECT ... FOR UPDATE), nên các yêu cầu
 *   đồng thời của cùng sinh viên được tuần tự hóa; planVersion là optimistic lock phía client.
 * - Lưu nháp luôn DRAFT và không mang kết quả thẩm định nào, kể cả khi nội dung vừa qua kiểm tra nhanh; sửa DRAFT/VALIDATED
 *   tăng planVersion và hủy kết quả thẩm định; sửa ACTIVE tạo DRAFT kế thừa.
 * - Chỉ thẩm định thật (AcademicFacade khai báo VALIDATE_STUDY_PLAN) mới đưa kế hoạch tới VALIDATED; chưa có công cụ thật
 *   thì trả 503 TOOL_NOT_READY, dev/test có thể thẩm định thử (MOCK) nhưng trạng thái không đổi.
 * - Kích hoạt: kiểm tra planVersion, dataRevision, thẩm định lại trên hồ sơ và quy chế hiện hành, lưu trữ bản ACTIVE cũ
 *   và ghi bản mới trong cùng giao dịch; DB giữ ràng buộc một ACTIVE mỗi sinh viên.
 * - Hồ sơ hoặc quy chế đổi: kế hoạch VALIDATED/ACTIVE được thẩm định lại trên dữ liệu mới ({@link #revalidate}).
 */
@Service
public class StudyPlanService {

    private static final Logger log = LoggerFactory.getLogger(StudyPlanService.class);
    private static final int MAX_NAME = 150;
    private static final int MAX_CODE = 30;
    private static final int MAX_COURSE_CODE = 50;
    private static final int MAX_TEXT = 255;
    private static final int MAX_CREDITS = 30;
    private static final int MAX_RETAKES = 50;
    private static final Pattern SEMESTER = Pattern.compile("^[0-9]{4}_(1|2|SUMMER)$");
    /** Trạng thái có kết quả thẩm định được ghi lại; ARCHIVED/COMPLETED là lịch sử, chỉ trả kết quả. */
    private static final Set<StudyPlanStatus> CHECKABLE = EnumSet.of(StudyPlanStatus.DRAFT, StudyPlanStatus.VALIDATED,
            StudyPlanStatus.ACTIVE);
    /** Lưu nháp không phải thẩm định: thông điệp lưu luôn nói rõ bản nháp chưa được kiểm tra điều kiện. */
    static final String NOT_CHECKED = "Bản nháp chưa được kiểm tra điều kiện; hãy bấm \"Kiểm tra điều kiện\" trước khi kích hoạt.";
    static final String NO_TRANSCRIPT_WARNING ="Chưa có bảng điểm đã xác nhận: phương án coi như bạn chưa học học phần nào. "
            + "Hãy nhập bảng điểm để phương án tính đúng các môn đã học.";

    private final StudyPlanRepository repository;
    private final AcademicFacade academicFacade;
    private final AcademicToolGate tools;
    private final PolicyVersionSource policy;
    private final PlannerProperties limits;
    private final TransactionTemplate transaction;
    private final TransactionTemplate revalidation;
    private final DbStudentAcademicRecordProvider records;
    private final AcademicEngineSources engine;

    public StudyPlanService(StudyPlanRepository repository, AcademicFacade academicFacade, AcademicToolGate tools,
                            PolicyVersionSource policy, PlannerProperties limits, TransactionTemplate transaction,
                            DbStudentAcademicRecordProvider records, AcademicEngineSources engine) {
        this.repository = repository;
        this.academicFacade = academicFacade;
        this.tools = tools;
        this.policy = policy;
        this.limits = limits;
        this.transaction = transaction;
        this.records = records;
        this.engine = engine;
        // Giao dịch riêng: thẩm định lại còn chạy sau khi giao dịch đổi dữ liệu học vụ đã commit
        this.revalidation = new TransactionTemplate(transaction.getTransactionManager());
        this.revalidation.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public StudyPlanListResponse list(TrustedStudentContext context) {
        revalidateOutdated(context);
        List<StudyPlanSummaryItem> items = repository.list(context.getStudentId()).stream()
                .map(p -> new StudyPlanSummaryItem(p.planId, p.planName, p.version, p.status, p.sourcePlanId, p.totalCredits,
                        p.projectedCpa, text(p.updatedAt)))
                .toList();
        return new StudyPlanListResponse(new ArrayList<>(items));
    }

    public StudyPlanDetailResponse get(TrustedStudentContext context, String planId) {
        revalidateOutdated(context);
        PlanRow plan = find(context.getStudentId(), planId);
        return detail(plan, context.getDataRevision());
    }

    /**
     * Sinh phương án xem trước bằng planner tool trên hồ sơ server nạp (không lưu, luôn DRAFT). Kết quả facade trả nguyên
     * văn; platform chỉ thêm policyVersion, tổng tín chỉ khi engine để trống và cảnh báo khi chưa có bảng điểm đã xác nhận.
     */
    public GenerateStudyPlanResponse generate(TrustedStudentContext context, GenerateStudyPlanRequest request) {
        if (request == null) {
            throw ApiException.badRequest("Thiếu nội dung yêu cầu sinh phương án.");
        }
        checkTargets(request.getTargetCpa(), request.getTargetGraduationSemester(), request.getMaxCreditsPerSemester());
        String targetSemester = isBlank(request.getTargetGraduationSemester()) ? null : request.getTargetGraduationSemester().trim();
        if (targetSemester != null && !SEMESTER.matcher(targetSemester).matches()) {
            throw ApiException.badRequest("targetGraduationSemester theo dạng yyyy_1, yyyy_2 hoặc yyyy_SUMMER.");
        }
        List<String> retakes = checkRetakes(request.getSelectedRetakeCourseCodes());
        tools.requireReal(AcademicCapability.GENERATE_STUDY_PLAN);
        StudentAcademicRecord record = loadRecord(context.getStudentId(), AcademicCapability.GENERATE_STUDY_PLAN);
        if (isStale(record.getDataRevision(), request.getDataRevision())) {
            throw ApiException.staleRevision(record.getDataRevision(), request.getDataRevision());
        }

        // studentId và hồ sơ do server nạp; studentId client gửi bị bỏ qua
        GenerateStudyPlanRequest input = new GenerateStudyPlanRequest(record.getStudentId(), targetSemester,
                request.getTargetCpa(), request.getMaxCreditsPerSemester(), request.getIncludeSummerSemesters(),
                record.getDataRevision());
        input.setSelectedRetakeCourseCodes(retakes);
        GenerateStudyPlanResponse result = records.withRecord(record, () -> academicFacade.generateStudyPlan(input));
        if (!record.getStudentId().equals(result.getStudentId()) || !record.getDataRevision().equals(result.getDataRevision())) {
            throw new IllegalStateException("Planner tool trả phương án không khớp hồ sơ đã nạp (" + record.getStudentId()
                    + ", " + record.getDataRevision() + ")");
        }
        // Phương án chưa lưu không mang trạng thái đã thẩm định; lưu thì thành DRAFT và phải kiểm tra điều kiện riêng
        result.setStatus(StudyPlanStatus.DRAFT);
        result.setSemesters(copy(result.getSemesters()));
        if (result.getTotalCredits() == null) {
            result.setTotalCredits(result.getSemesters().stream()
                    .mapToInt(s -> s.getTotalCredits() == null ? 0 : s.getTotalCredits()).sum());
        }
        result.setWarnings(copy(result.getWarnings()));
        if (record.getTranscriptStatus() != TranscriptStatus.CONFIRMED) {
            result.getWarnings().add(0, NO_TRANSCRIPT_WARNING);
        }
        result.setPolicyVersion(policy.currentPolicyVersion());
        return result;
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
                return saveResponse(created, "Đã lưu nháp kế hoạch mới. " + NOT_CHECKED);
            }

            PlanRow existing = find(studentId, request.getPlanId());
            requireVersion(existing, request.getPlanVersion());
            switch (existing.status) {
                case ACTIVE -> {
                    PlanRow inherited = newDraft(studentId, lock, existing.planId, now);
                    applyContent(inherited, request);
                    insert(inherited, semesters, actions);
                    return saveResponse(inherited, "Đã lưu nháp. Kế hoạch đang theo dõi không thay đổi. " + NOT_CHECKED);
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
                    return saveResponse(existing, "Đã lưu nháp. " + NOT_CHECKED);
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
            ValidationMode mode = tools.requireValidation();
            StudentAcademicRecord record = loadRecord(studentId, AcademicCapability.VALIDATE_STUDY_PLAN);
            if (isStale(record.getDataRevision(), request.getDataRevision())) {
                throw ApiException.staleRevision(record.getDataRevision(), request.getDataRevision());
            }
            ValidateStudyPlanResponse result = callFacade(record, null, semesters, null, mode);
            // Nội dung chưa lưu: không kế hoạch nào được thẩm định nên không báo VALIDATED; valid chỉ để tham khảo
            result.setStatus(StudyPlanStatus.DRAFT);
            return result;
        }

        return transaction.execute(status -> {
            StudentLock lock = lock(studentId);
            requireFreshRevision(lock, request.getDataRevision());
            PlanRow plan = find(studentId, request.getPlanId());
            requireVersion(plan, request.getPlanVersion());
            ValidationMode mode = tools.requireValidation();

            // Hồ sơ đọc sau khi khóa: không có xác nhận bảng điểm nào chen vào giữa lúc thẩm định và lúc ghi kết quả
            StudentAcademicRecord record = loadRecord(studentId, AcademicCapability.VALIDATE_STUDY_PLAN);
            ValidateStudyPlanResponse result = callFacade(record, plan.planId, repository.loadSemesters(plan.planId),
                    plan.version, mode);
            if (mode == ValidationMode.REAL && CHECKABLE.contains(plan.status)) {
                plan.status = recordCheck(plan, result, record.getDataRevision(), null);
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

            // Thẩm định lại trên hồ sơ (đọc sau khi khóa) và quy chế hiện hành, trong cùng giao dịch với việc kích hoạt
            StudentAcademicRecord record = loadRecord(studentId, AcademicCapability.VALIDATE_STUDY_PLAN);
            ValidateStudyPlanResponse revalidation = callFacade(record, plan.planId, repository.loadSemesters(plan.planId),
                    plan.version, ValidationMode.REAL);
            if (!revalidation.isValid()) {
                recordCheck(plan, revalidation, record.getDataRevision(), null);
                return ActivationOutcome.failed(revalidation.getViolations());
            }

            List<String> changed = new ArrayList<>();
            if (!Objects.equals(plan.validatedDataRevision, record.getDataRevision())) {
                changed.add("dữ liệu học vụ");
            }
            if (!Objects.equals(plan.validatedPolicyVersion, revalidation.getPolicyVersion())) {
                changed.add("quy chế");
            }

            Instant now = Instant.now();
            List<String> archived = repository.archiveActive(studentId, plan.planId, now);
            repository.activate(studentId, plan.planId, now, revalidation.getWarnings(), plan.version, record.getDataRevision(),
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

    /**
     * Thẩm định lại kế hoạch đang theo dõi kết quả thẩm định (VALIDATED, ACTIVE) khi lần thẩm định gần nhất dựa trên hồ sơ
     * hoặc quy chế cũ. Gọi sau khi dataRevision tăng ({@link PlanRevalidationListener}) và trước khi đọc kế hoạch (quy chế
     * chỉ đổi khi triển khai lại). Giao dịch riêng, khóa hồ sơ sinh viên như mọi thao tác ghi kế hoạch.
     *
     * - Có công cụ thẩm định thật: VALIDATED đạt giữ VALIDATED trên revision/quy chế mới, vi phạm về DRAFT; ACTIVE giữ ACTIVE,
     *   đạt thì ghi lần thẩm định mới, vi phạm thì kết quả cũ hết hiệu lực và kế hoạch kèm cảnh báo.
     * - Chưa có công cụ thật: VALIDATED về DRAFT vì kết quả cũ hết hiệu lực; ACTIVE giữ nguyên, chi tiết kèm cảnh báo theo dõi.
     */
    public void revalidate(String studentId) {
        revalidation.executeWithoutResult(status -> {
            StudentLock lock = lock(studentId);
            String policyVersion = policy.currentPolicyVersion();
            StudentAcademicRecord record = tools.isReal(AcademicCapability.VALIDATE_STUDY_PLAN) ? records.load(studentId) : null;
            boolean real = record != null && engine.curriculumId().equals(record.getCurriculumId());
            for (PlanRow plan : repository.findOutdatedChecks(studentId, lock.dataRevision(), policyVersion, outdatedScope(real))) {
                String reason = changeReason(plan, lock.dataRevision(), policyVersion);
                if (!real) {
                    repository.recordCheck(plan, new Check(StudyPlanStatus.DRAFT, false, List.of("Kết quả kiểm tra điều kiện hết "
                            + "hiệu lực vì " + reason + "; công cụ thẩm định chưa sẵn sàng nên chưa kiểm tra lại được."),
                            Instant.now(), plan.version, lock.dataRevision(), policyVersion));
                    continue;
                }
                ValidateStudyPlanResponse result = callFacade(record, plan.planId, repository.loadSemesters(plan.planId),
                        plan.version, ValidationMode.REAL);
                recordCheck(plan, result, record.getDataRevision(), "Đã tự kiểm tra lại vì " + reason + ": "
                        + (result.isValid() ? "kế hoạch vẫn đạt điều kiện." : "kế hoạch không còn đạt điều kiện."));
            }
        });
    }

    // ---------------------------------------------------------------------------------------------

    /**
     * Trước khi đọc: chỉ mở giao dịch thẩm định lại khi có kế hoạch dựa trên hồ sơ/quy chế cũ. Lỗi thẩm định lại không chặn
     * việc đọc: kế hoạch vẫn trả về, kèm cảnh báo theo dõi rằng chưa được kiểm tra lại.
     */
    private void revalidateOutdated(TrustedStudentContext context) {
        boolean real = tools.isReal(AcademicCapability.VALIDATE_STUDY_PLAN);
        if (repository.countOutdatedChecks(context.getStudentId(), context.getDataRevision(), policy.currentPolicyVersion(),
                outdatedScope(real)) == 0) {
            return;
        }
        try {
            revalidate(context.getStudentId());
        } catch (RuntimeException ex) {
            log.warn("Chưa thẩm định lại được kế hoạch trên dữ liệu {}; trả kế hoạch kèm cảnh báo theo dõi",
                    context.getDataRevision(), ex);
        }
    }

    /** Có công cụ thật thì kiểm tra lại cả VALIDATED và ACTIVE; chưa có thì chỉ hủy kết quả VALIDATED đã cũ. */
    private static Set<StudyPlanStatus> outdatedScope(boolean real) {
        return real ? EnumSet.of(StudyPlanStatus.VALIDATED, StudyPlanStatus.ACTIVE) : EnumSet.of(StudyPlanStatus.VALIDATED);
    }

    private static String changeReason(PlanRow plan, String dataRevision, String policyVersion) {
        List<String> reasons = new ArrayList<>();
        if (!Objects.equals(plan.checkedDataRevision, dataRevision)) {
            reasons.add(change("dữ liệu học vụ đã thay đổi", plan.checkedDataRevision, dataRevision));
        }
        if (!Objects.equals(plan.checkedPolicyVersion, policyVersion)) {
            reasons.add(change("quy chế đã cập nhật", plan.checkedPolicyVersion, policyVersion));
        }
        return String.join(" và ", reasons);
    }

    private static String change(String what, String from, String to) {
        return from == null ? what : what + " (" + from + " → " + to + ")";
    }

    /**
     * Ghi kết quả thẩm định thật lên kế hoạch đã lưu, trả trạng thái mới: DRAFT/VALIDATED theo kết quả; ACTIVE giữ nguyên
     * (vi phạm thì kết quả cũ hết hiệu lực, cảnh báo nêu vi phạm để sinh viên sửa qua bản nháp kế thừa).
     */
    private StudyPlanStatus recordCheck(PlanRow plan, ValidateStudyPlanResponse result, String dataRevision, String note) {
        boolean valid = result.isValid();
        StudyPlanStatus next = plan.status == StudyPlanStatus.ACTIVE ? StudyPlanStatus.ACTIVE
                : valid ? StudyPlanStatus.VALIDATED : StudyPlanStatus.DRAFT;
        List<String> warnings = new ArrayList<>();
        if (note != null) {
            warnings.add(note);
        }
        if (!valid && next == StudyPlanStatus.ACTIVE) {
            warnings.add("Kế hoạch đang theo dõi không còn đạt điều kiện trên dữ liệu học vụ và quy chế hiện hành. "
                    + "Hãy sửa kế hoạch (tạo bản nháp kế thừa) rồi kiểm tra điều kiện lại.");
        }
        if (!valid) {
            result.getViolations().forEach(v -> warnings.add("Vi phạm: " + v));
        }
        warnings.addAll(result.getWarnings());
        repository.recordCheck(plan, new Check(next, valid, warnings, Instant.now(), plan.version, dataRevision,
                result.getPolicyVersion()));
        return next;
    }

    /** Hồ sơ học vụ server nạp từ DB; CTĐT của sinh viên chưa có trong engine thì 503, không tính trên CTĐT sai. */
    private StudentAcademicRecord loadRecord(String studentId, AcademicCapability capability) {
        StudentAcademicRecord record = records.load(studentId);
        if (!engine.curriculumId().equals(record.getCurriculumId())) {
            throw ApiException.toolNotReady(capability.name(), "Công cụ học vụ chưa có CTĐT " + record.getCurriculumId()
                    + " của sinh viên nên chưa thể lập hay kiểm tra kế hoạch.");
        }
        return record;
    }

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

    private ValidateStudyPlanResponse callFacade(StudentAcademicRecord record, String planId, List<PlannedSemesterItem> semesters,
                                                 Integer planVersion, ValidationMode mode) {
        // studentId và hồ sơ luôn do server nạp, không lấy từ client; facade nhận đúng hồ sơ đã nạp
        ValidateStudyPlanResponse result = records.withRecord(record, () -> academicFacade.validateStudyPlan(
                new ValidateStudyPlanRequest(planId, record.getStudentId(), semesters, planVersion, record.getDataRevision())));
        result.setPlanVersion(planVersion);
        result.setDataRevision(record.getDataRevision());
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
        detail.setPolicyVersion(plan.validatedPolicyVersion);
        return detail;
    }

    /**
     * Theo dõi: lần thẩm định gần nhất dựa trên hồ sơ hoặc quy chế đã cũ mà chưa kiểm tra lại được (công cụ thẩm định
     * chưa sẵn sàng, hoặc dữ liệu vừa đổi trong lúc đọc).
     */
    private List<String> trackingWarnings(PlanRow plan, String currentRevision) {
        List<String> warnings = new ArrayList<>();
        if (plan.status != StudyPlanStatus.ACTIVE && plan.status != StudyPlanStatus.VALIDATED) {
            return warnings;
        }
        boolean revisionChanged = plan.checkedDataRevision != null && !plan.checkedDataRevision.equals(currentRevision);
        boolean policyChanged = plan.checkedPolicyVersion != null
                && !plan.checkedPolicyVersion.equals(policy.currentPolicyVersion());
        if (revisionChanged) {
            warnings.add("Dữ liệu học vụ đã thay đổi sau lần kiểm tra điều kiện gần nhất (" + plan.checkedDataRevision + " → "
                    + currentRevision + "); kế hoạch chưa được kiểm tra lại trên dữ liệu mới.");
        }
        if (policyChanged) {
            warnings.add("Quy chế đã cập nhật sau lần kiểm tra điều kiện gần nhất (" + plan.checkedPolicyVersion + " → "
                    + policy.currentPolicyVersion() + "); kế hoạch chưa được kiểm tra lại theo quy chế mới.");
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

    private static List<String> checkRetakes(List<String> courseCodes) {
        if (courseCodes == null) {
            return null;
        }
        if (courseCodes.size() > MAX_RETAKES) {
            throw ApiException.badRequest("Chọn tối đa " + MAX_RETAKES + " học phần học lại/cải thiện.");
        }
        List<String> result = new ArrayList<>();
        for (String code : courseCodes) {
            if (isBlank(code) || code.trim().length() > MAX_COURSE_CODE) {
                throw ApiException.badRequest("Mã học phần học lại/cải thiện không được trống, tối đa " + MAX_COURSE_CODE + " ký tự.");
            }
            result.add(code.trim());
        }
        return result;
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
