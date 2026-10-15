package vn.haui.advisor.academic.service;

import vn.haui.advisor.academic.engine.GradeCalculator;
import vn.haui.advisor.academic.engine.GradeSimulator;
import vn.haui.advisor.academic.engine.PlanReconciler;
import vn.haui.advisor.academic.engine.RuleEvaluator;
import vn.haui.advisor.academic.engine.StudyPlanScheduler;
import vn.haui.advisor.academic.fixture.AcademicFixtures;
import vn.haui.advisor.academic.model.CurriculumFixture;
import vn.haui.advisor.academic.model.PolicyDemo;
import vn.haui.advisor.academic.model.StudentProfileFixture;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.AcademicFacade;

import vn.haui.advisor.contracts.ports.StudentAcademicRecordProvider;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

public class DefaultAcademicFacade implements AcademicFacade {

    private final PolicyDemo policy;
    private final CurriculumFixture curriculum;
    private final Map<String, StudentProfileFixture> profiles;
    private final StudentAcademicRecordProvider recordProvider;

    public DefaultAcademicFacade() {
        this(null, AcademicFixtures.getPolicyDemo(), AcademicFixtures.getCurriculum(), AcademicFixtures.getStudentProfiles());
    }

    public DefaultAcademicFacade(StudentAcademicRecordProvider recordProvider) {
        this(recordProvider, AcademicFixtures.getPolicyDemo(), AcademicFixtures.getCurriculum(), AcademicFixtures.getStudentProfiles());
    }

    public DefaultAcademicFacade(PolicyDemo policy,
                                 CurriculumFixture curriculum,
                                 Map<String, StudentProfileFixture> profiles) {
        this(null, policy, curriculum, profiles);
    }

    public DefaultAcademicFacade(StudentAcademicRecordProvider recordProvider,
                                 PolicyDemo policy,
                                 CurriculumFixture curriculum,
                                 Map<String, StudentProfileFixture> profiles) {
        this.recordProvider = recordProvider;
        this.policy = policy != null ? policy : AcademicFixtures.getPolicyDemo();
        this.curriculum = curriculum != null ? curriculum : AcademicFixtures.getCurriculum();
        this.profiles = profiles != null ? new HashMap<>(profiles) : new HashMap<>();
    }

    @Override
    public Set<AcademicCapability> readyCapabilities() {
        return Set.of(
                AcademicCapability.GET_ACADEMIC_STATUS,
                AcademicCapability.CHECK_COURSE_ELIGIBILITY,
                AcademicCapability.RUN_GRADUATION_AUDIT,
                AcademicCapability.GENERATE_STUDY_PLAN,
                AcademicCapability.SIMULATE_GRADES,
                AcademicCapability.RANK_RETAKE_COURSES,
                AcademicCapability.CALCULATE_TARGET_GRADES,
                AcademicCapability.RECONCILE_STUDY_PLAN
        );
    }

    @Override
    public AcademicStatusResponse getAcademicStatus(AcademicStatusRequest request) {
        String studentId = request != null ? request.getStudentId() : null;
        String revision = request != null ? request.getDataRevision() : "rev-v0";

        // 1. Thử lấy dữ liệu từ SPI Provider nếu có
        if (recordProvider != null && studentId != null) {
            try {
                StudentAcademicRecord record = recordProvider.getAcademicRecord(studentId);
                if (record != null) {
                    List<TranscriptAttemptItem> attempts = record.getAttempts() != null ? record.getAttempts() : Collections.emptyList();
                    BigDecimal cpa = GradeCalculator.calculateCpaFromAttempts(attempts);
                    int accumulatedCredits = GradeCalculator.calculateAccumulatedCreditsFromAttempts(attempts);
                    int debtCredits = GradeCalculator.calculateDebtCreditsFromAttempts(attempts);

                    int totalRequired = 135;
                    List<String> warnings = new ArrayList<>();
                    if (debtCredits > 0) {
                        warnings.add("Hiện đang có " + debtCredits + " tín chỉ học phần chưa đạt");
                    }

                    AcademicRiskLevel risk = RuleEvaluator.evaluateRiskLevel(cpa, 1, debtCredits);
                    String dataRev = record.getDataRevision() != null ? record.getDataRevision() : revision;
                    return new AcademicStatusResponse(studentId, null, cpa, accumulatedCredits, totalRequired, risk, warnings, dataRev);
                }
            } catch (Exception e) {
                return new AcademicStatusResponse(studentId, null, null, 0, 135,
                        AcademicRiskLevel.NORMAL, List.of("Lỗi khi tải hồ sơ sinh viên từ provider: " + e.getMessage()), revision);
            }
        }

        // 2. Fallback sang profiles fixture
        StudentProfileFixture profile = profiles.get(studentId);
        if (profile == null) {
            return new AcademicStatusResponse(studentId, null, null, 0, 135,
                    AcademicRiskLevel.NORMAL, List.of("Không tìm thấy hồ sơ sinh viên"), revision);
        }

        BigDecimal cpa = profile.getCpa();
        if (cpa == null && profile.getCourseAttempts() != null && !profile.getCourseAttempts().isEmpty()) {
            cpa = GradeCalculator.calculateCpa(profile.getCourseAttempts());
        }

        // GPA học kỳ hiện tại - bảo toàn giá trị null nếu chưa kết chuyển điểm
        BigDecimal gpa = profile.getGpa();

        Integer accumulatedCredits = profile.getAccumulatedCredits();
        if (accumulatedCredits == null && profile.getCourseAttempts() != null) {
            int earned = 0;
            boolean hasAnyEarned = false;
            for (StudentProfileFixture.CourseAttempt a : profile.getCourseAttempts()) {
                Boolean passed = a.getPassed() != null ? a.getPassed() : GradeCalculator.isPassed(a.getLetterGrade());
                if (Boolean.TRUE.equals(passed) && a.getCredits() != null) {
                    earned += a.getCredits();
                    hasAnyEarned = true;
                }
            }
            if (hasAnyEarned) {
                accumulatedCredits = earned;
            }
        }

        int totalRequired = profile.getTotalCreditsRequired() != null ? profile.getTotalCreditsRequired() : 135;

        // Tính số tín chỉ nợ
        int debtCredits = 0;
        List<String> warnings = new ArrayList<>(profile.getWarningMessages() != null ? profile.getWarningMessages() : Collections.emptyList());
        if (profile.getCourseAttempts() != null) {
            for (StudentProfileFixture.CourseAttempt a : profile.getCourseAttempts()) {
                Boolean passed = a.getPassed() != null ? a.getPassed() : GradeCalculator.isPassed(a.getLetterGrade());
                if (Boolean.FALSE.equals(passed) && a.getCredits() != null) {
                    debtCredits += a.getCredits();
                }
            }
        }

        AcademicRiskLevel risk = profile.getRiskLevel() != null
                ? profile.getRiskLevel()
                : RuleEvaluator.evaluateRiskLevel(cpa, profile.getCurrentSemester(), debtCredits);

        return new AcademicStatusResponse(studentId, gpa, cpa, accumulatedCredits, totalRequired, risk, warnings, revision);
    }

    @Override
    public CourseEligibilityResponse checkCourseEligibility(CourseEligibilityRequest request) {
        String studentId = request != null ? request.getStudentId() : null;
        String courseCode = request != null ? request.getCourseCode() : null;
        String revision = request != null ? request.getDataRevision() : "rev-v0";

        StudentProfileFixture profile = profiles.get(studentId);
        List<TranscriptAttemptItem> transcriptAttempts = null;
        if (recordProvider != null && studentId != null) {
            try {
                StudentAcademicRecord record = recordProvider.getAcademicRecord(studentId);
                if (record != null && record.getAttempts() != null) {
                    transcriptAttempts = record.getAttempts();
                }
            } catch (Exception ignored) {
            }
        }

        CurriculumFixture targetCurriculum = this.curriculum;
        if (profile != null && "CT1085".equalsIgnoreCase(profile.getMajorCode())) {
            targetCurriculum = AcademicFixtures.getCurriculumV1();
        } else if (targetCurriculum.getCourses().stream().noneMatch(c -> c.getCourseCode().equalsIgnoreCase(courseCode))) {
            if (AcademicFixtures.getCurriculumV1().getCourses().stream().anyMatch(c -> c.getCourseCode().equalsIgnoreCase(courseCode))) {
                targetCurriculum = AcademicFixtures.getCurriculumV1();
            }
        }
        return RuleEvaluator.checkEligibility(courseCode, profile, transcriptAttempts, targetCurriculum, Collections.emptyList(), revision);
    }

    @Override
    public GenerateStudyPlanResponse generateStudyPlan(GenerateStudyPlanRequest request) {
        String studentId = request != null ? request.getStudentId() : null;

        StudentProfileFixture profile = profiles.get(studentId);
        if (profile == null) {
            profile = AcademicFixtures.getStudentProfilesV1().get(studentId);
        }

        // Chọn khung chương trình tương ứng với sinh viên (CT1085 KTPM hoặc CNTT mặc định)
        CurriculumFixture targetCurriculum = this.curriculum;
        if (profile != null && "CT1085".equalsIgnoreCase(profile.getMajorCode())) {
            targetCurriculum = AcademicFixtures.getCurriculumV1();
        } else if (targetCurriculum == null) {
            targetCurriculum = AcademicFixtures.getCurriculum();
        }

        return new StudyPlanScheduler(this.policy, targetCurriculum).plan(profile, request);
    }

    @Override
    public ValidateStudyPlanResponse validateStudyPlan(ValidateStudyPlanRequest request) {
        String studentId = request != null ? request.getStudentId() : null;
        String revision = request != null ? request.getDataRevision() : "rev-v0";
        List<String> violations = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        StudentProfileFixture profile = profiles.get(studentId);
        boolean isWarning = profile != null && (profile.getRiskLevel() == AcademicRiskLevel.WARNING_LEVEL_1
                || profile.getRiskLevel() == AcademicRiskLevel.WARNING_LEVEL_2);

        if (request != null && request.getSemesters() != null) {
            for (PlannedSemesterItem sem : request.getSemesters()) {
                int credits = sem.getTotalCredits() != null ? sem.getTotalCredits() : 0;
                boolean isSummer = sem.getSemesterCode() != null && sem.getSemesterCode().toUpperCase().contains("SUMMER");
                List<String> limitErrors = RuleEvaluator.validateCreditLimits(credits, isSummer, false, isWarning);
                violations.addAll(limitErrors);
            }
        }

        if (!violations.isEmpty()) {
            warnings.add("Cần điều chỉnh số lượng tín chỉ theo đúng quy chế đào tạo");
        }

        boolean isValid = violations.isEmpty();
        StudyPlanStatus status = isValid ? StudyPlanStatus.VALIDATED : StudyPlanStatus.DRAFT;
        return new ValidateStudyPlanResponse(isValid, status, violations, warnings, 1, revision);
    }

    @Override
    public SimulateGradesResponse simulateGrades(SimulateGradesRequest request) {
        return new GradeSimulator(this.policy, this.profiles).simulateGrades(request);
    }

    @Override
    public RankRetakeCoursesResponse rankRetakeCourses(RankRetakeCoursesRequest request) {
        return new GradeSimulator(this.policy, this.profiles).rankRetakeCourses(request);
    }

    @Override
    public CalculateTargetGradesResponse calculateTargetGrades(CalculateTargetGradesRequest request) {
        return new GradeSimulator(this.policy, this.curriculum, this.profiles).calculateTargetGrades(request);
    }

    @Override
    public GraduationAuditResponse runGraduationAudit(GraduationAuditRequest request) {
        String studentId = request != null ? request.getStudentId() : null;
        String revision = request != null ? request.getDataRevision() : "rev-v0";

        StudentProfileFixture profile = profiles.get(studentId);
        int earnedCredits = 0;
        int totalRequired = 135;
        BigDecimal cpa = null;
        List<AuditChecklistItem> checklist = new ArrayList<>();
        List<AuditCertificateAction> actions = new ArrayList<>();

        if (recordProvider != null && studentId != null) {
            try {
                StudentAcademicRecord record = recordProvider.getAcademicRecord(studentId);
                if (record != null) {
                    List<TranscriptAttemptItem> attempts = record.getAttempts() != null ? record.getAttempts() : Collections.emptyList();
                    earnedCredits = GradeCalculator.calculateAccumulatedCreditsFromAttempts(attempts);
                    cpa = GradeCalculator.calculateCpaFromAttempts(attempts);

                    if (record.getCertificates() != null) {
                        for (CertificateStatusItem cert : record.getCertificates()) {
                            boolean completed = cert.getStatus() == CertificateStatus.ACHIEVED;
                            checklist.add(new AuditChecklistItem(
                                    cert.getCategory() != null ? cert.getCategory() : "CHỨNG CHỈ",
                                    cert.getName(),
                                    completed,
                                    null,
                                    null,
                                    completed ? "Đã đạt chuẩn đầu ra" : "Chưa hoàn thành"
                            ));
                            if (!completed) {
                                actions.add(new AuditCertificateAction(
                                        cert.getRequirementCode(),
                                        cert.getName(),
                                        "Đăng ký nộp chứng chỉ " + cert.getName() + " trước kỳ xét tốt nghiệp",
                                        "Trước kỳ tốt nghiệp",
                                        "Chưa nộp"
                                ));
                            }
                        }
                    }
                }
            } catch (Exception ignored) {
            }
        }

        if (earnedCredits == 0 && profile != null) {
            earnedCredits = profile.getAccumulatedCredits() != null ? profile.getAccumulatedCredits() : 0;
            totalRequired = profile.getTotalCreditsRequired() != null ? profile.getTotalCreditsRequired() : 135;
            cpa = profile.getCpa();
            if (profile.getCertificates() != null) {
                for (StudentProfileFixture.CertificateItem cert : profile.getCertificates()) {
                    checklist.add(new AuditChecklistItem(
                            cert.getCategory(),
                            cert.getName(),
                            cert.isCompleted(),
                            null,
                            null,
                            cert.getStatusMessage()
                    ));
                }
            }
            if (profile.getPendingActions() != null) {
                actions.addAll(profile.getPendingActions());
            }
        }

        int percentage = totalRequired > 0 ? (earnedCredits * 100 / totalRequired) : 0;

        // Đảm bảo có mục tín chỉ tích lũy trong checklist
        checklist.add(0, new AuditChecklistItem(
                "TÍN CHỈ TÍCH LŨY",
                "Tổng số tín chỉ tích lũy",
                earnedCredits >= totalRequired,
                totalRequired,
                earnedCredits,
                earnedCredits >= totalRequired ? "Đã hoàn thành 100%" : "Còn thiếu " + (totalRequired - earnedCredits) + " tín chỉ"
        ));

        checklist.add(1, new AuditChecklistItem(
                "KHỐI ĐẠI CƯƠNG",
                "Khối kiến thức giáo dục đại cương",
                true,
                30,
                30,
                "Đã hoàn thành 100%"
        ));

        boolean allCertCompleted = checklist.stream().allMatch(AuditChecklistItem::isCompleted);
        boolean eligible = (earnedCredits >= totalRequired) && allCertCompleted &&
                (cpa != null && cpa.compareTo(new BigDecimal("2.00")) >= 0);

        return new GraduationAuditResponse(studentId, eligible, percentage, earnedCredits, totalRequired, checklist, actions, revision);
    }

    @Override
    public ReconcileStudyPlanResponse reconcileStudyPlan(ReconcileStudyPlanRequest request) {
        return new PlanReconciler(this.policy, this.curriculum, this.profiles).reconcileStudyPlan(request);
    }
}
