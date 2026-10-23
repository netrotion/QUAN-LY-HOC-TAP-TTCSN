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

import java.math.BigDecimal;
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
 * API học vụ trên AcademicFacade thật (Task 4.1): trạng thái học vụ, điều kiện học phần, cây CTĐT, rà soát tốt nghiệp;
 * What-if (Task 4.3b): giả lập điểm, xếp hạng học cải thiện theo ROI, tính điểm mục tiêu ngược — chỉ xem thử, không ghi gì.
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
    private static final int MAX_CREDITS = 30;
    private static final int MAX_SIMULATED_COURSES = 30;
    private static final int MAX_SUGGESTIONS = 50;
    private static final BigDecimal MAX_POINTS = new BigDecimal("4");
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

    /** What-if: giả lập điểm các môn kỳ tới trên hồ sơ hiện tại; chỉ xem thử, không ghi bảng điểm hay kế hoạch. */
    public SimulateGradesResponse simulate(TrustedStudentContext context, SimulateGradesRequest request) {
        List<SimulatedCourseGrade> courses = checkSimulatedCourses(request == null ? null : request.getCourses());
        StudentAcademicRecord record = load(context, AcademicCapability.SIMULATE_GRADES);
        requireFresh(record, request.getDataRevision());
        SimulateGradesResponse result = records.withRecord(record, () -> academicFacade.simulateGrades(
                new SimulateGradesRequest(record.getStudentId(), courses, record.getDataRevision())));
        requireMatch(record, result.getStudentId(), result.getDataRevision());
        result.setPolicyVersion(policy.currentPolicyVersion());
        return result;
    }

    /** Xếp hạng môn nên học cải thiện theo mức CPA tăng thêm trên mỗi tín chỉ (ROI); chỉ xem thử. */
    public RankRetakeCoursesResponse rankRetakes(TrustedStudentContext context, RankRetakeCoursesRequest request) {
        Integer maxSuggestions = request == null ? null : request.getMaxSuggestions();
        if (maxSuggestions != null && (maxSuggestions < 1 || maxSuggestions > MAX_SUGGESTIONS)) {
            throw ApiException.badRequest("maxSuggestions trong khoảng 1–" + MAX_SUGGESTIONS + ".");
        }
        StudentAcademicRecord record = load(context, AcademicCapability.RANK_RETAKE_COURSES);
        requireFresh(record, request == null ? null : request.getDataRevision());
        RankRetakeCoursesResponse result = records.withRecord(record, () -> academicFacade.rankRetakeCourses(
                new RankRetakeCoursesRequest(record.getStudentId(), maxSuggestions, record.getDataRevision())));
        requireMatch(record, result.getStudentId(), result.getDataRevision());
        result.setPolicyVersion(policy.currentPolicyVersion());
        return result;
    }

    /** Mục tiêu ngược: điểm trung bình và điểm từng môn cần đạt cho CPA mục tiêu (dự kiến); chỉ xem thử. */
    public CalculateTargetGradesResponse targetGrades(TrustedStudentContext context, CalculateTargetGradesRequest request) {
        BigDecimal targetCpa = request == null ? null : request.getTargetCpa();
        if (targetCpa == null || targetCpa.compareTo(BigDecimal.ZERO) < 0 || targetCpa.compareTo(MAX_POINTS) > 0) {
            throw ApiException.badRequest("targetCpa là bắt buộc, trong khoảng 0–4.");
        }
        String targetSemester = trim(request.getTargetGraduationSemester());
        if (targetSemester != null && !SEMESTER.matcher(targetSemester).matches()) {
            throw ApiException.badRequest("targetGraduationSemester theo dạng yyyy_1, yyyy_2 hoặc yyyy_SUMMER.");
        }
        StudentAcademicRecord record = load(context, AcademicCapability.CALCULATE_TARGET_GRADES);
        requireFresh(record, request.getDataRevision());
        CalculateTargetGradesResponse result = records.withRecord(record, () -> academicFacade.calculateTargetGrades(
                new CalculateTargetGradesRequest(record.getStudentId(), targetCpa, targetSemester, record.getDataRevision())));
        requireMatch(record, result.getStudentId(), result.getDataRevision());
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

    private static void requireFresh(StudentAcademicRecord record, String clientRevision) {
        String revision = trim(clientRevision);
        if (revision != null && !revision.equals(record.getDataRevision())) {
            throw ApiException.staleRevision(record.getDataRevision(), revision);
        }
    }

    private static List<SimulatedCourseGrade> checkSimulatedCourses(List<SimulatedCourseGrade> courses) {
        if (courses == null || courses.isEmpty()) {
            throw ApiException.badRequest("courses là bắt buộc: chọn ít nhất một học phần để giả lập điểm.");
        }
        if (courses.size() > MAX_SIMULATED_COURSES) {
            throw ApiException.badRequest("Giả lập tối đa " + MAX_SIMULATED_COURSES + " học phần mỗi lần.");
        }
        List<SimulatedCourseGrade> result = new ArrayList<>();
        for (SimulatedCourseGrade course : courses) {
            String code = trim(course == null ? null : course.getCourseCode());
            if (code == null || code.length() > MAX_COURSE_CODE) {
                throw ApiException.badRequest("Mỗi học phần giả lập cần courseCode (tối đa " + MAX_COURSE_CODE + " ký tự).");
            }
            if (course.getCredits() == null || course.getCredits() < 1 || course.getCredits() > MAX_CREDITS) {
                throw ApiException.badRequest("Số tín chỉ của " + code + " phải trong khoảng 1–" + MAX_CREDITS + ".");
            }
            String grade = trim(course.getExpectedGrade());
            BigDecimal points = course.getExpectedGradePoints();
            if (grade == null && points == null) {
                throw ApiException.badRequest("Cần expectedGrade hoặc expectedGradePoints cho " + code + ".");
            }
            if (grade != null && grade.length() > 5) {
                throw ApiException.badRequest("expectedGrade tối đa 5 ký tự.");
            }
            if (points != null && (points.compareTo(BigDecimal.ZERO) < 0 || points.compareTo(MAX_POINTS) > 0)) {
                throw ApiException.badRequest("expectedGradePoints trong khoảng 0–4.");
            }
            result.add(new SimulatedCourseGrade(code, course.getCredits(), grade, points));
        }
        return result;
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
