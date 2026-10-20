package vn.haui.advisor.platform.academic;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import vn.haui.advisor.academic.engine.GradeCalculator;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.AcademicFacade;
import vn.haui.advisor.platform.curriculum.CurriculumRepository;
import vn.haui.advisor.platform.error.ApiException;
import vn.haui.advisor.platform.transcript.DbStudentAcademicRecordProvider;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Pattern;

/**
 * API học vụ trên AcademicFacade thật (Task 4.1): trạng thái học vụ, điều kiện học phần, cây CTĐT, rà soát tốt nghiệp.
 *
 * - Danh tính chỉ lấy từ TrustedStudentContext (phiên đăng nhập); studentId client gửi bị bỏ qua.
 * - Hồ sơ học vụ do server nạp từ DB một lần mỗi yêu cầu và gắn cho facade trong lúc gọi; kết quả trả kèm dataRevision của
 *   đúng hồ sơ đó và policyVersion của quy chế engine áp dụng. Kết quả facade được trả nguyên văn, trừ giá trị sai định dạng
 *   hợp đồng bị bỏ (xem {@link #dropNonDateDeadline}).
 * - Capability TV4 chưa khai báo thật → 503 TOOL_NOT_READY; không có nhánh dữ liệu mẫu hay kết quả thay thế.
 */
@Service
public class AcademicApiService {

    private static final Logger log = LoggerFactory.getLogger(AcademicApiService.class);
    private static final AtomicBoolean NON_DATE_DEADLINE_LOGGED = new AtomicBoolean();
    private static final int MAX_COURSE_CODE = 50;
    private static final Pattern SEMESTER = Pattern.compile("^[0-9]{4}_(1|2|SUMMER)$");

    private final AcademicFacade academicFacade;
    private final AcademicToolGate tools;
    private final DbStudentAcademicRecordProvider records;
    private final AcademicEngineSources engine;
    private final PolicyVersionSource policy;
    private final CurriculumRepository curriculumRepository;

    public AcademicApiService(AcademicFacade academicFacade, AcademicToolGate tools, DbStudentAcademicRecordProvider records,
                              AcademicEngineSources engine, PolicyVersionSource policy, CurriculumRepository curriculumRepository) {
        this.academicFacade = academicFacade;
        this.tools = tools;
        this.records = records;
        this.engine = engine;
        this.policy = policy;
        this.curriculumRepository = curriculumRepository;
    }

    public AcademicStatusResponse status(TrustedStudentContext context) {
        StudentAcademicRecord record = load(context, AcademicCapability.GET_ACADEMIC_STATUS);
        AcademicStatusResponse result = records.withRecord(record, () -> academicFacade.getAcademicStatus(
                new AcademicStatusRequest(record.getStudentId(), record.getDataRevision())));
        requireMatch(record, result.getStudentId(), result.getDataRevision());
        result.setPolicyVersion(policy.currentPolicyVersion());
        return result;
    }

    public CourseEligibilityResponse eligibility(TrustedStudentContext context, CourseEligibilityRequest request) {
        String courseCode = trim(request == null ? null : request.getCourseCode());
        if (courseCode == null || courseCode.length() > MAX_COURSE_CODE) {
            throw ApiException.badRequest("courseCode là bắt buộc, tối đa " + MAX_COURSE_CODE + " ký tự.");
        }
        String targetSemester = trim(request.getTargetSemester());
        if (targetSemester != null && !SEMESTER.matcher(targetSemester).matches()) {
            throw ApiException.badRequest("targetSemester theo dạng yyyy_1, yyyy_2 hoặc yyyy_SUMMER.");
        }
        StudentAcademicRecord record = load(context, AcademicCapability.CHECK_COURSE_ELIGIBILITY);
        String clientRevision = trim(request.getDataRevision());
        if (clientRevision != null && !clientRevision.equals(record.getDataRevision())) {
            throw ApiException.staleRevision(record.getDataRevision(), clientRevision);
        }
        CourseEligibilityResponse result = records.withRecord(record,
                () -> checkEligibility(record, courseCode, targetSemester));
        result.setPolicyVersion(policy.currentPolicyVersion());
        return result;
    }

    /** Cây CTĐT: mỗi học phần kèm trạng thái theo bảng điểm đã xác nhận và điều kiện đăng ký của AcademicFacade. */
    public CurriculumTreeResponse tree(TrustedStudentContext context) {
        StudentAcademicRecord record = load(context, AcademicCapability.CHECK_COURSE_ELIGIBILITY);
        CurriculumRepository.CurriculumRow curriculum = curriculumRepository.find(record.getCurriculumId())
                .orElseThrow(() -> ApiException.curriculumNotFound(record.getCurriculumId()));
        List<CurriculumCourseItem> courses = curriculumRepository.listCourses(curriculum.curriculumId());
        Map<String, List<TranscriptAttemptItem>> attempts = attemptsByCourse(record.getAttempts());

        List<CurriculumTreeCourseItem> nodes = records.withRecord(record, () -> courses.stream()
                .map(course -> node(course, record.getTranscriptStatus(),
                        attempts.getOrDefault(key(course.getCourseCode()), List.of()),
                        checkEligibility(record, course.getCourseCode(), null)))
                .toList());

        CurriculumTreeResponse response = new CurriculumTreeResponse();
        response.setStudentId(record.getStudentId());
        response.setCurriculumId(curriculum.curriculumId());
        response.setCurriculumName(curriculum.curriculumName());
        response.setMajorCode(curriculum.majorCode());
        response.setTotalCreditsRequired(curriculum.totalCreditsRequired());
        response.setTranscriptStatus(record.getTranscriptStatus());
        response.setCourses(new ArrayList<>(nodes));
        response.setDataRevision(record.getDataRevision());
        response.setPolicyVersion(policy.currentPolicyVersion());
        return response;
    }

    public GraduationAuditResponse audit(TrustedStudentContext context) {
        StudentAcademicRecord record = load(context, AcademicCapability.RUN_GRADUATION_AUDIT);
        GraduationAuditResponse result = records.withRecord(record, () -> academicFacade.runGraduationAudit(
                new GraduationAuditRequest(record.getStudentId(), record.getDataRevision())));
        requireMatch(record, result.getStudentId(), result.getDataRevision());
        if (result.getPendingActions() != null) {
            result.getPendingActions().forEach(AcademicApiService::dropNonDateDeadline);
        }
        result.setPolicyVersion(policy.currentPolicyVersion());
        return result;
    }

    /**
     * Hợp đồng: deadline là ngày yyyy-MM-dd hoặc null. Engine TV4 hiện ghi chữ (vd. "Trước kỳ tốt nghiệp") vào trường này;
     * platform bỏ giá trị không phải ngày thay vì trả JSON sai hợp đồng (việc cần làm vẫn nằm ở actionDescription).
     * Không thêm hay đổi dữ liệu nào khác của facade.
     */
    static void dropNonDateDeadline(AuditCertificateAction action) {
        String deadline = action.getDeadline();
        if (deadline == null) {
            return;
        }
        try {
            LocalDate.parse(deadline);
        } catch (DateTimeParseException ex) {
            if (NON_DATE_DEADLINE_LOGGED.compareAndSet(false, true)) {
                log.warn("AcademicFacade trả deadline không phải ngày yyyy-MM-dd (\"{}\"); bỏ giá trị theo hợp đồng", deadline);
            }
            action.setDeadline(null);
        }
    }

    /**
     * Trạng thái học phần trên cây. Đạt/không đạt theo GradeCalculator của TV4 (cùng quy tắc engine dùng tính CPA);
     * chưa học thì theo kết quả điều kiện của facade; chưa có bảng điểm đã xác nhận thì không khẳng định gì (UNKNOWN).
     */
    static CourseProgressStatus progress(TranscriptStatus transcriptStatus, List<TranscriptAttemptItem> attempts, boolean eligible) {
        if (transcriptStatus != TranscriptStatus.CONFIRMED) {
            return CourseProgressStatus.UNKNOWN;
        }
        if (attempts.isEmpty()) {
            return eligible ? CourseProgressStatus.ELIGIBLE : CourseProgressStatus.BLOCKED;
        }
        if (attempts.stream().anyMatch(a -> Boolean.TRUE.equals(GradeCalculator.isPassed(a.getLetterGrade())))) {
            return CourseProgressStatus.PASSED;
        }
        String latest = trim(attempts.get(attempts.size() - 1).getLetterGrade());
        if (latest == null) {
            return CourseProgressStatus.IN_PROGRESS;
        }
        return Boolean.FALSE.equals(GradeCalculator.isPassed(latest)) ? CourseProgressStatus.FAILED : CourseProgressStatus.UNKNOWN;
    }

    private StudentAcademicRecord load(TrustedStudentContext context, AcademicCapability capability) {
        tools.requireReal(capability);
        StudentAcademicRecord record = records.load(context.getStudentId());
        if (!engine.curriculumId().equals(record.getCurriculumId())) {
            throw ApiException.toolNotReady(capability.name(), "Công cụ học vụ chưa có CTĐT " + record.getCurriculumId()
                    + " của sinh viên nên chưa thể tính kết quả.");
        }
        return record;
    }

    private CourseEligibilityResponse checkEligibility(StudentAcademicRecord record, String courseCode, String targetSemester) {
        CourseEligibilityResponse result = academicFacade.checkCourseEligibility(
                new CourseEligibilityRequest(record.getStudentId(), courseCode, targetSemester, record.getDataRevision()));
        requireMatch(record, record.getStudentId(), result.getDataRevision());
        return result;
    }

    private static CurriculumTreeCourseItem node(CurriculumCourseItem course, TranscriptStatus transcriptStatus,
                                                 List<TranscriptAttemptItem> attempts, CourseEligibilityResponse eligibility) {
        CurriculumTreeCourseItem node = new CurriculumTreeCourseItem();
        node.setCourseCode(course.getCourseCode());
        node.setCourseName(course.getCourseName());
        node.setCredits(course.getCredits());
        node.setKnowledgeBlock(course.getKnowledgeBlock());
        node.setSuggestedSemester(course.getSuggestedSemester());
        node.setMandatory(course.getMandatory());
        node.setPrerequisiteCourseCodes(course.getPrerequisiteCourseCodes());
        node.setPriorCourseCodes(course.getPriorCourseCodes());
        node.setCorequisiteCourseCodes(course.getCorequisiteCourseCodes());
        node.setStatus(progress(transcriptStatus, attempts, eligibility.isEligible()));
        if (!attempts.isEmpty()) {
            TranscriptAttemptItem latest = attempts.get(attempts.size() - 1);
            node.setLetterGrade(latest.getLetterGrade());
            node.setSemesterCode(latest.getSemesterCode());
        }
        node.setEligible(eligibility.isEligible());
        node.setMissingPrerequisites(eligibility.getMissingPrerequisites());
        node.setWarnings(eligibility.getWarnings());
        return node;
    }

    /** Lần học theo học phần, giữ thứ tự học kỳ của bảng điểm (lần cuối là lần gần nhất). */
    private static Map<String, List<TranscriptAttemptItem>> attemptsByCourse(List<TranscriptAttemptItem> attempts) {
        Map<String, List<TranscriptAttemptItem>> byCourse = new LinkedHashMap<>();
        if (attempts != null) {
            for (TranscriptAttemptItem attempt : attempts) {
                byCourse.computeIfAbsent(key(attempt.getCourseCode()), k -> new ArrayList<>()).add(attempt);
            }
        }
        return byCourse;
    }

    /** Kết quả facade phải thuộc đúng sinh viên và đúng hồ sơ đã nạp; lệch là lỗi tích hợp, không trả cho client. */
    private static void requireMatch(StudentAcademicRecord record, String studentId, String dataRevision) {
        if (!Objects.equals(record.getStudentId(), studentId) || !Objects.equals(record.getDataRevision(), dataRevision)) {
            throw new IllegalStateException("AcademicFacade trả kết quả không khớp hồ sơ đã nạp (" + record.getStudentId()
                    + ", " + record.getDataRevision() + ")");
        }
    }

    private static String key(String courseCode) {
        return courseCode == null ? "" : courseCode.trim().toUpperCase(Locale.ROOT);
    }

    private static String trim(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
