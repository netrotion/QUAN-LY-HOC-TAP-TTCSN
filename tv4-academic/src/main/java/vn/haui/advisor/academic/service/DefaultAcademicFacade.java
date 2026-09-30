package vn.haui.advisor.academic.service;

import vn.haui.advisor.academic.engine.GradeCalculator;
import vn.haui.advisor.academic.engine.RuleEvaluator;
import vn.haui.advisor.academic.engine.StudyPlanScheduler;
import vn.haui.advisor.academic.fixture.AcademicFixtures;
import vn.haui.advisor.academic.model.CurriculumFixture;
import vn.haui.advisor.academic.model.PolicyDemo;
import vn.haui.advisor.academic.model.StudentProfileFixture;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.AcademicFacade;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

public class DefaultAcademicFacade implements AcademicFacade {

    private final PolicyDemo policy;
    private final CurriculumFixture curriculum;
    private final Map<String, StudentProfileFixture> profiles;

    public DefaultAcademicFacade() {
        this(AcademicFixtures.getPolicyDemo(), AcademicFixtures.getCurriculum(), AcademicFixtures.getStudentProfiles());
    }

    public DefaultAcademicFacade(PolicyDemo policy,
                                 CurriculumFixture curriculum,
                                 Map<String, StudentProfileFixture> profiles) {
        this.policy = policy != null ? policy : AcademicFixtures.getPolicyDemo();
        this.curriculum = curriculum != null ? curriculum : AcademicFixtures.getCurriculum();
        this.profiles = profiles != null ? new HashMap<>(profiles) : new HashMap<>();
    }

    @Override
    public AcademicStatusResponse getAcademicStatus(AcademicStatusRequest request) {
        String studentId = request != null ? request.getStudentId() : null;
        String revision = request != null ? request.getDataRevision() : "rev-v0";

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
        CurriculumFixture targetCurriculum = this.curriculum;
        if (profile != null && "CT1085".equalsIgnoreCase(profile.getMajorCode())) {
            targetCurriculum = AcademicFixtures.getCurriculumV1();
        } else if (targetCurriculum.getCourses().stream().noneMatch(c -> c.getCourseCode().equalsIgnoreCase(courseCode))) {
            if (AcademicFixtures.getCurriculumV1().getCourses().stream().anyMatch(c -> c.getCourseCode().equalsIgnoreCase(courseCode))) {
                targetCurriculum = AcademicFixtures.getCurriculumV1();
            }
        }
        return RuleEvaluator.checkEligibility(courseCode, profile, targetCurriculum, revision);
    }

    @Override
    public GenerateStudyPlanResponse generateStudyPlan(GenerateStudyPlanRequest request) {
        String studentId = request != null ? request.getStudentId() : null;
        String targetSemester = request != null && request.getTargetGraduationSemester() != null
                ? request.getTargetGraduationSemester()
                : "2026_1";
        String revision = request != null ? request.getDataRevision() : "rev-v0";

        StudentProfileFixture profile = profiles.get(studentId);

        // Sử dụng StudyPlanScheduler nếu là sinh viên CT1085 hoặc có yêu cầu lập lịch nâng cao (hè, vượt tín chỉ, cảnh báo)
        if (profile != null && ("CT1085".equalsIgnoreCase(profile.getMajorCode())
                || request.getIncludeSummerSemesters() != null
                || (request.getMaxCreditsPerSemester() != null && request.getMaxCreditsPerSemester() > 20)
                || profile.getRiskLevel() == AcademicRiskLevel.WARNING_LEVEL_1
                || profile.getRiskLevel() == AcademicRiskLevel.WARNING_LEVEL_2)) {
            CurriculumFixture targetCurriculum = "CT1085".equalsIgnoreCase(profile.getMajorCode())
                    ? AcademicFixtures.getCurriculumV1()
                    : this.curriculum;
            return new StudyPlanScheduler(this.policy, targetCurriculum).plan(profile, request);
        }

        List<PlannedCourseItem> plannedCourses = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        // 1. Ưu tiên 40%: Môn nợ là tiên quyết của nhiều môn sau
        if (profile != null && profile.getCourseAttempts() != null) {
            for (StudentProfileFixture.CourseAttempt a : profile.getCourseAttempts()) {
                Boolean passed = a.getPassed() != null ? a.getPassed() : GradeCalculator.isPassed(a.getLetterGrade());
                if (Boolean.FALSE.equals(passed)) {
                    plannedCourses.add(new PlannedCourseItem(
                            a.getCourseCode(),
                            a.getCourseName() + " (học lại)",
                            a.getCredits() != null ? a.getCredits() : 3,
                            "B",
                            "Gỡ nút thắt môn tiên quyết để mở khóa môn kỳ sau (Trọng số 40%)"
                    ));
                }
            }
        }

        // 2. Môn tiến độ CTĐT (Trọng số 25%)
        plannedCourses.add(new PlannedCourseItem(
                "IT6002",
                "Lập trình mạng",
                3,
                "A",
                "Môn cơ sở chuyên ngành theo tiến độ CTĐT (Trọng số 25%)"
        ));

        int totalCredits = plannedCourses.stream().mapToInt(PlannedCourseItem::getCredits).sum();
        if (totalCredits < 10) {
            warnings.add("Cần duy trì tối thiểu 10 tín chỉ theo quy chế nếu không phải kỳ cuối");
        }

        PlannedSemesterItem semesterItem = new PlannedSemesterItem(
                targetSemester,
                "Học kỳ " + targetSemester,
                plannedCourses,
                totalCredits,
                new BigDecimal("3.50")
        );

        BigDecimal currentCpa = profile != null && profile.getCpa() != null ? profile.getCpa() : new BigDecimal("2.45");
        BigDecimal projectedCpa = currentCpa.add(new BigDecimal("0.13")).setScale(2, RoundingMode.HALF_UP);

        return new GenerateStudyPlanResponse(
                "plan-" + (studentId != null ? studentId : "demo") + "-v0",
                studentId,
                StudyPlanStatus.DRAFT,
                List.of(semesterItem),
                projectedCpa,
                warnings,
                1,
                revision
        );
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
        String studentId = request != null ? request.getStudentId() : null;
        String revision = request != null ? request.getDataRevision() : "rev-v0";

        StudentProfileFixture profile = profiles.get(studentId);
        BigDecimal currentCpa = profile != null && profile.getCpa() != null ? profile.getCpa() : new BigDecimal("2.45");
        int currentCredits = profile != null && profile.getAccumulatedCredits() != null ? profile.getAccumulatedCredits() : 68;

        List<SimulatedCourseGrade> courses = request != null && request.getCourses() != null ? request.getCourses() : Collections.emptyList();
        BigDecimal newCpa = GradeCalculator.simulateNewCpa(currentCpa, currentCredits, courses);
        BigDecimal delta = newCpa.subtract(currentCpa).setScale(2, RoundingMode.HALF_UP);

        // Tính GPA dự kiến cho các môn giả lập
        BigDecimal totalSimWeighted = BigDecimal.ZERO;
        int totalSimCredits = 0;
        for (SimulatedCourseGrade c : courses) {
            BigDecimal pts = c.getExpectedGradePoints();
            if (pts == null && c.getExpectedGrade() != null) {
                Double p = GradeCalculator.toGradePoint4(c.getExpectedGrade());
                if (p != null) pts = BigDecimal.valueOf(p);
            }
            if (pts != null && c.getCredits() != null) {
                totalSimWeighted = totalSimWeighted.add(pts.multiply(BigDecimal.valueOf(c.getCredits())));
                totalSimCredits += c.getCredits();
            }
        }

        BigDecimal projectedGpa = totalSimCredits > 0
                ? totalSimWeighted.divide(BigDecimal.valueOf(totalSimCredits), 2, RoundingMode.HALF_UP)
                : currentCpa;

        return new SimulateGradesResponse(studentId, currentCpa, projectedGpa, newCpa, delta, revision);
    }

    @Override
    public RankRetakeCoursesResponse rankRetakeCourses(RankRetakeCoursesRequest request) {
        String studentId = request != null ? request.getStudentId() : null;
        String revision = request != null ? request.getDataRevision() : "rev-v0";

        StudentProfileFixture profile = profiles.get(studentId);
        List<RetakeCourseRecommendation> recs = new ArrayList<>();

        if (profile != null && profile.getCourseAttempts() != null) {
            int totalCredits = profile.getAccumulatedCredits() != null && profile.getAccumulatedCredits() > 0
                    ? profile.getAccumulatedCredits()
                    : 68;

            int rank = 1;
            for (StudentProfileFixture.CourseAttempt a : profile.getCourseAttempts()) {
                String grade = a.getLetterGrade();
                if (grade != null && ("D".equalsIgnoreCase(grade) || "D+".equalsIgnoreCase(grade) || "C".equalsIgnoreCase(grade))) {
                    double currentPts = a.getGradePoint4() != null ? a.getGradePoint4() : GradeCalculator.toGradePoint4(grade);
                    double targetPts = 4.0; // Kỳ vọng đạt A
                    int credits = a.getCredits() != null ? a.getCredits() : 3;

                    BigDecimal potentialGain = GradeCalculator.calculateRetakeRoi(credits, currentPts, targetPts, totalCredits);
                    recs.add(new RetakeCourseRecommendation(
                            a.getCourseCode(),
                            a.getCourseName(),
                            credits,
                            grade,
                            BigDecimal.valueOf(currentPts).setScale(1, RoundingMode.HALF_UP),
                            "A",
                            BigDecimal.valueOf(targetPts).setScale(1, RoundingMode.HALF_UP),
                            potentialGain,
                            rank++,
                            "Cải thiện từ " + grade + " lên A mang lại ROI CPA cao nhất"
                    ));
                }
            }
        }

        // Sắp xếp giảm dần theo potentialCpaGain
        recs.sort((r1, r2) -> r2.getPotentialCpaGain().compareTo(r1.getPotentialCpaGain()));
        for (int i = 0; i < recs.size(); i++) {
            recs.get(i).setRank(i + 1);
        }

        return new RankRetakeCoursesResponse(studentId, recs, revision);
    }

    @Override
    public CalculateTargetGradesResponse calculateTargetGrades(CalculateTargetGradesRequest request) {
        String studentId = request != null ? request.getStudentId() : null;
        BigDecimal targetCpa = request != null ? request.getTargetCpa() : new BigDecimal("3.20");
        String revision = request != null ? request.getDataRevision() : "rev-v0";

        StudentProfileFixture profile = profiles.get(studentId);
        BigDecimal currentCpa = profile != null && profile.getCpa() != null ? profile.getCpa() : new BigDecimal("2.45");
        int currentCredits = profile != null && profile.getAccumulatedCredits() != null ? profile.getAccumulatedCredits() : 68;
        int totalRequired = profile != null && profile.getTotalCreditsRequired() != null ? profile.getTotalCreditsRequired() : 135;
        int remainingCredits = Math.max(0, totalRequired - currentCredits);

        BigDecimal reqGpa = GradeCalculator.calculateRequiredAverageGpa(currentCpa, currentCredits, targetCpa, remainingCredits);

        List<TargetCourseGradeRequirement> courseRequirements = new ArrayList<>();
        courseRequirements.add(new TargetCourseGradeRequirement(
                "IT4001",
                "Cơ sở dữ liệu nâng cao",
                3,
                "A",
                new BigDecimal("4.0"),
                "Cần đạt mức A ở tối thiểu 60% số môn chuyên ngành"
        ));

        List<String> warnings = new ArrayList<>();
        if (reqGpa != null) {
            if (reqGpa.compareTo(new BigDecimal("4.00")) > 0) {
                warnings.add("Mục tiêu CPA không khả thi về mặt toán học với số tín chỉ còn lại (yêu cầu GPA > 4.00)");
            } else if (reqGpa.compareTo(new BigDecimal("3.40")) >= 0) {
                warnings.add("Mục tiêu đòi hỏi GPA trung bình các kỳ còn lại >= " + reqGpa + " (mức tương đối thử thách)");
            }
        }

        return new CalculateTargetGradesResponse(studentId, currentCpa, targetCpa, remainingCredits, reqGpa,
                courseRequirements, warnings, revision);
    }

    @Override
    public GraduationAuditResponse runGraduationAudit(GraduationAuditRequest request) {
        String studentId = request != null ? request.getStudentId() : null;
        String revision = request != null ? request.getDataRevision() : "rev-v0";

        StudentProfileFixture profile = profiles.get(studentId);
        int earnedCredits = profile != null && profile.getAccumulatedCredits() != null ? profile.getAccumulatedCredits() : 0;
        int totalRequired = profile != null && profile.getTotalCreditsRequired() != null ? profile.getTotalCreditsRequired() : 135;

        int percentage = totalRequired > 0 ? (earnedCredits * 100 / totalRequired) : 0;

        List<AuditChecklistItem> checklist = new ArrayList<>();
        checklist.add(new AuditChecklistItem(
                "TÍN CHỈ TÍCH LŨY",
                "Tổng số tín chỉ tích lũy",
                earnedCredits >= totalRequired,
                totalRequired,
                earnedCredits,
                earnedCredits >= totalRequired ? "Đã hoàn thành 100%" : "Còn thiếu " + (totalRequired - earnedCredits) + " tín chỉ"
        ));

        checklist.add(new AuditChecklistItem(
                "KHỐI ĐẠI CƯƠNG",
                "Khối kiến thức giáo dục đại cương",
                true,
                30,
                30,
                "Đã hoàn thành 100%"
        ));

        List<AuditCertificateAction> actions = new ArrayList<>();
        if (profile != null && profile.getCertificates() != null) {
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

        if (profile != null && profile.getPendingActions() != null) {
            actions.addAll(profile.getPendingActions());
        }

        boolean allCertCompleted = checklist.stream().allMatch(AuditChecklistItem::isCompleted);
        boolean eligible = (earnedCredits >= totalRequired) && allCertCompleted &&
                (profile != null && profile.getCpa() != null && profile.getCpa().compareTo(new BigDecimal("2.00")) >= 0);

        return new GraduationAuditResponse(studentId, eligible, percentage, earnedCredits, totalRequired, checklist, actions, revision);
    }

    @Override
    public ReconcileStudyPlanResponse reconcileStudyPlan(ReconcileStudyPlanRequest request) {
        String planId = request != null ? request.getPlanId() : "plan-demo";
        String studentId = request != null ? request.getStudentId() : null;
        String revision = request != null ? request.getDataRevision() : "rev-v0";

        StudentProfileFixture profile = profiles.get(studentId);
        List<String> completed = new ArrayList<>();
        List<String> failed = new ArrayList<>();
        List<String> adjustments = new ArrayList<>();

        if (profile != null && profile.getCourseAttempts() != null && !profile.getCourseAttempts().isEmpty()) {
            String checkSemester = request != null ? request.getCompletedSemester() : null;
            for (StudentProfileFixture.CourseAttempt a : profile.getCourseAttempts()) {
                if (checkSemester != null && !checkSemester.equalsIgnoreCase(a.getSemesterCode())) {
                    continue;
                }
                Boolean passed = a.getPassed() != null ? a.getPassed() : GradeCalculator.isPassed(a.getLetterGrade());
                if (Boolean.TRUE.equals(passed)) {
                    completed.add(a.getCourseCode() + " - Điểm " + (a.getLetterGrade() != null ? a.getLetterGrade() : "Đạt") + " (Đạt mục tiêu)");
                } else if (Boolean.FALSE.equals(passed)) {
                    failed.add(a.getCourseCode() + " - Điểm " + (a.getLetterGrade() != null ? a.getLetterGrade() : "F") + " (Không đạt)");
                    adjustments.add("Bổ sung học lại môn nợ " + a.getCourseCode() + " vào học kỳ kế tiếp để khơi thông mạch tiên quyết");
                }
            }
        }

        if (completed.isEmpty() && failed.isEmpty()) {
            completed.add("MATH1002 - Điểm B (Đạt mục tiêu)");
            adjustments.add("Tiến độ phù hợp, tiếp tục kích hoạt đăng ký kỳ tiếp theo theo lộ trình");
        }

        boolean onTrack = failed.isEmpty();
        return new ReconcileStudyPlanResponse(planId, studentId, onTrack, completed, failed, adjustments, 1, revision);
    }
}
