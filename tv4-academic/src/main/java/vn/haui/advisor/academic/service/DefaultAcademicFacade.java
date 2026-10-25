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
import java.util.*;
import java.util.regex.Pattern;

public class DefaultAcademicFacade implements AcademicFacade {

    private static final Pattern MAIN_SEMESTER_PATTERN = Pattern.compile("^[0-9]{4}_(1|2)$");
    private static final Pattern DATE_PATTERN = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$");

    private final PolicyDemo policy;
    private final CurriculumFixture curriculum;
    private final Map<String, StudentProfileFixture> profiles;
    private final StudentAcademicRecordProvider recordProvider;
    private volatile boolean validateStudyPlanReady = false;

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

    public void setValidateStudyPlanReady(boolean ready) {
        this.validateStudyPlanReady = ready;
    }

    @Override
    public Set<AcademicCapability> readyCapabilities() {
        if (validateStudyPlanReady || Boolean.getBoolean("haui.academic.validate-study-plan.enabled")) {
            return Set.of(
                    AcademicCapability.GET_ACADEMIC_STATUS,
                    AcademicCapability.CHECK_COURSE_ELIGIBILITY,
                    AcademicCapability.RUN_GRADUATION_AUDIT,
                    AcademicCapability.GENERATE_STUDY_PLAN,
                    AcademicCapability.SIMULATE_GRADES,
                    AcademicCapability.RANK_RETAKE_COURSES,
                    AcademicCapability.CALCULATE_TARGET_GRADES,
                    AcademicCapability.RECONCILE_STUDY_PLAN,
                    AcademicCapability.VALIDATE_STUDY_PLAN
            );
        }
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

        CurriculumFixture targetCurriculum = this.curriculum;

        // 1. Thử lấy dữ liệu từ SPI Provider nếu có
        if (recordProvider != null && studentId != null) {
            try {
                StudentAcademicRecord record = recordProvider.getAcademicRecord(studentId);
                if (record != null) {
                    if (record.getCurriculumId() != null && record.getCurriculumId().contains("ktpm")) {
                        targetCurriculum = AcademicFixtures.getCurriculumV1();
                    }
                    int totalRequired = resolveTotalCredits(null, targetCurriculum);
                    List<TranscriptAttemptItem> attempts = record.getAttempts();

                    if (attempts == null || attempts.isEmpty()) {
                        // Thiếu bảng điểm: trả null (UNKNOWN) cho CPA, tín chỉ và mức cảnh báo (Task 4.3c)
                        return new AcademicStatusResponse(studentId, null, null, null, totalRequired, null,
                                List.of("Chưa có bảng điểm đã xác nhận"), record.getDataRevision() != null ? record.getDataRevision() : revision);
                    }

                    BigDecimal cpa = GradeCalculator.calculateCpaFromAttempts(attempts);
                    int accumulatedCredits = GradeCalculator.calculateAccumulatedCreditsFromAttempts(attempts);
                    int debtCredits = GradeCalculator.calculateDebtCreditsFromAttempts(attempts);

                    List<String> warnings = new ArrayList<>();
                    if (debtCredits > 0) {
                        warnings.add("Hiện đang có " + debtCredits + " tín chỉ học phần chưa đạt");
                    }

                    AcademicRiskLevel risk = RuleEvaluator.evaluateRiskLevel(cpa, 1, debtCredits);
                    String dataRev = record.getDataRevision() != null ? record.getDataRevision() : revision;
                    return new AcademicStatusResponse(studentId, null, cpa, accumulatedCredits, totalRequired, risk, warnings, dataRev);
                } else {
                    int totalRequired = resolveTotalCredits(null, targetCurriculum);
                    return new AcademicStatusResponse(studentId, null, null, null, totalRequired,
                            null, List.of("Không tìm thấy hồ sơ sinh viên"), revision);
                }
            } catch (Exception e) {
                int totalRequired = resolveTotalCredits(null, targetCurriculum);
                return new AcademicStatusResponse(studentId, null, null, null, totalRequired,
                        null, List.of("Lỗi khi tải hồ sơ sinh viên từ provider: " + e.getMessage()), revision);
            }
        }

        // 2. Fallback sang profiles fixture
        StudentProfileFixture profile = profiles.get(studentId);
        if (profile == null) {
            profile = AcademicFixtures.getStudentProfilesV1().get(studentId);
        }

        if (profile == null) {
            int totalRequired = resolveTotalCredits(null, targetCurriculum);
            return new AcademicStatusResponse(studentId, null, null, null, totalRequired,
                    null, List.of("Không tìm thấy hồ sơ sinh viên"), revision);
        }

        targetCurriculum = resolveCurriculum(profile, null);
        int totalRequired = resolveTotalCredits(profile, targetCurriculum);

        // Kiểm tra trường hợp thiếu bảng điểm hoàn toàn
        boolean hasNoAttempts = (profile.getCourseAttempts() == null || profile.getCourseAttempts().isEmpty());
        if (hasNoAttempts && profile.getAccumulatedCredits() == null && profile.getCpa() == null) {
            return new AcademicStatusResponse(studentId, null, null, null, totalRequired,
                    null, List.of("Chưa có bảng điểm đã xác nhận"), revision);
        }

        BigDecimal cpa = profile.getCpa();
        if (cpa == null && profile.getCourseAttempts() != null && !profile.getCourseAttempts().isEmpty()) {
            cpa = GradeCalculator.calculateCpa(profile.getCourseAttempts());
        }

        // GPA học kỳ hiện tại - bảo toàn giá trị null nếu chưa kết chuyển điểm
        BigDecimal gpa = profile.getGpa();

        Integer accumulatedCredits = profile.getAccumulatedCredits() != null ? profile.getAccumulatedCredits().intValue() : null;
        if (accumulatedCredits == null && profile.getCourseAttempts() != null && !profile.getCourseAttempts().isEmpty()) {
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
                : (cpa != null ? RuleEvaluator.evaluateRiskLevel(cpa, profile.getCurrentSemester(), debtCredits) : null);

        return new AcademicStatusResponse(studentId, gpa, cpa, accumulatedCredits, totalRequired, risk, warnings, revision);
    }

    @Override
    public CourseEligibilityResponse checkCourseEligibility(CourseEligibilityRequest request) {
        String studentId = request != null ? request.getStudentId() : null;
        String courseCode = request != null ? request.getCourseCode() : null;
        String revision = request != null ? request.getDataRevision() : "rev-v0";

        StudentProfileFixture profile = null;
        List<TranscriptAttemptItem> transcriptAttempts = null;

        // 1. Ưu tiên tra cứu Provider trước khi đọc fixture
        if (recordProvider != null && studentId != null) {
            try {
                StudentAcademicRecord record = recordProvider.getAcademicRecord(studentId);
                if (record != null) {
                    transcriptAttempts = record.getAttempts();
                    AcademicStatusResponse status = getAcademicStatus(new AcademicStatusRequest(studentId, record.getDataRevision()));
                    profile = toProfile(record, status);
                }
            } catch (Exception e) {
                // Provider lỗi: giữ profile null hoặc để exception hợp lệ được ghi nhận
            }
        }

        if (profile == null) {
            profile = profiles.get(studentId);
            if (profile == null) {
                profile = AcademicFixtures.getStudentProfilesV1().get(studentId);
            }
        }

        CurriculumFixture targetCurriculum = resolveCurriculum(profile, courseCode);
        return RuleEvaluator.checkEligibility(courseCode, profile, transcriptAttempts, targetCurriculum, Collections.emptyList(), revision);
    }

    @Override
    public GenerateStudyPlanResponse generateStudyPlan(GenerateStudyPlanRequest request) {
        String studentId = request != null ? request.getStudentId() : null;
        String revision = request != null && request.getDataRevision() != null ? request.getDataRevision() : "rev-v0";

        StudentProfileFixture profile = resolveProfile(studentId, revision);
        CurriculumFixture targetCurriculum = resolveCurriculum(profile, null);

        return new StudyPlanScheduler(this.policy, targetCurriculum).plan(profile, request);
    }

    @Override
    public ValidateStudyPlanResponse validateStudyPlan(ValidateStudyPlanRequest request) {
        String studentId = request != null ? request.getStudentId() : null;
        String revision = request != null && request.getDataRevision() != null ? request.getDataRevision() : "rev-v0";
        Integer planVersion = request != null && request.getPlanVersion() != null ? request.getPlanVersion() : 1;

        List<String> violations = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        StudentProfileFixture profile = resolveProfile(studentId, revision);
        CurriculumFixture targetCurriculum = resolveCurriculum(profile, null);

        boolean isWarning = profile != null && (profile.getRiskLevel() == AcademicRiskLevel.WARNING_LEVEL_1
                || profile.getRiskLevel() == AcademicRiskLevel.WARNING_LEVEL_2);

        // Tập hợp mục lục học phần trong CTĐT
        Map<String, CurriculumFixture.CourseDefinitionItem> courseCatalog = new HashMap<>();
        if (targetCurriculum != null && targetCurriculum.getCourses() != null) {
            for (CurriculumFixture.CourseDefinitionItem c : targetCurriculum.getCourses()) {
                if (c.getCourseCode() != null) {
                    courseCatalog.put(c.getCourseCode().toUpperCase(), c);
                }
            }
        }

        // Lịch sử học phần quá khứ
        Set<String> passedHistoricalCourses = new HashSet<>();
        Map<String, Double> historicalScores = new HashMap<>();
        if (profile != null && profile.getCourseAttempts() != null) {
            for (StudentProfileFixture.CourseAttempt a : profile.getCourseAttempts()) {
                if (a.getCourseCode() == null) continue;
                String code = a.getCourseCode().toUpperCase();
                Boolean passed = a.getPassed() != null ? a.getPassed() : GradeCalculator.isPassed(a.getLetterGrade());
                if (Boolean.TRUE.equals(passed)) {
                    passedHistoricalCourses.add(code);
                }
                Double score = a.getGradePoint4() != null ? a.getGradePoint4() : GradeCalculator.toGradePoint4(a.getLetterGrade());
                if (score != null) {
                    historicalScores.merge(code, score, Math::max);
                }
            }
        }

        // Kiểm tra từng học kỳ trong kế hoạch
        Set<String> allScheduledInPlan = new HashSet<>();
        Set<String> passedBeforeCurrentSemester = new HashSet<>(passedHistoricalCourses);

        if (request != null && request.getSemesters() != null) {
            for (PlannedSemesterItem sem : request.getSemesters()) {
                int credits = sem.getTotalCredits() != null ? sem.getTotalCredits() : 0;
                boolean isSummer = sem.getSemesterCode() != null && sem.getSemesterCode().toUpperCase().contains("SUMMER");
                List<String> limitErrors = RuleEvaluator.validateCreditLimits(credits, isSummer, false, isWarning);
                violations.addAll(limitErrors);

                if (sem.getCourses() == null || sem.getCourses().isEmpty()) {
                    continue;
                }

                Set<String> currentSemesterCodes = new HashSet<>();
                for (PlannedCourseItem item : sem.getCourses()) {
                    if (item.getCourseCode() == null) continue;
                    String code = item.getCourseCode().trim().toUpperCase();

                    // 1. Kiểm tra môn thuộc CTĐT
                    CurriculumFixture.CourseDefinitionItem courseDef = courseCatalog.get(code);
                    if (courseDef == null) {
                        violations.add("Học phần " + code + " không tồn tại trong chương trình đào tạo " + (targetCurriculum != null ? targetCurriculum.getCurriculumId() : ""));
                        continue;
                    }

                    // 2. Kiểm tra trùng lặp
                    if (currentSemesterCodes.contains(code) || allScheduledInPlan.contains(code)) {
                        violations.add("Học phần " + code + " bị xếp trùng lặp trong kế hoạch học tập");
                    }
                    currentSemesterCodes.add(code);
                    allScheduledInPlan.add(code);

                    // 3. Kiểm tra môn đã đạt quá khứ (BR-06)
                    if (passedHistoricalCourses.contains(code)) {
                        Double pastScore = historicalScores.get(code);
                        if (pastScore != null && pastScore >= 2.5) { // B, B+, A, A+
                            violations.add("Học phần " + code + " đã đạt điểm cao (" + pastScore + "), không đủ điều kiện đăng ký học cải thiện");
                        }
                    }

                    // 4. Kiểm tra môn tiên quyết (prerequisites)
                    if (courseDef.getPrerequisites() != null) {
                        for (String prereq : courseDef.getPrerequisites()) {
                            if (prereq == null || prereq.isBlank()) continue;
                            String pCode = prereq.trim().toUpperCase();
                            if (currentSemesterCodes.contains(pCode)) {
                                violations.add("Học phần " + code + " có môn tiên quyết " + pCode + " được xếp cùng kỳ (vi phạm quy chế tiên quyết)");
                            } else if (!passedBeforeCurrentSemester.contains(pCode)) {
                                violations.add("Học phần " + code + " chưa thỏa mãn môn tiên quyết " + pCode);
                            }
                        }
                    }

                    // 5. Kiểm tra môn học trước (priorCourses)
                    if (courseDef.getPriorCourses() != null) {
                        for (String prior : courseDef.getPriorCourses()) {
                            if (prior == null || prior.isBlank()) continue;
                            String qCode = prior.trim().toUpperCase();
                            boolean attemptedInHistory = profile != null && profile.getCourseAttempts() != null &&
                                    profile.getCourseAttempts().stream().anyMatch(a -> qCode.equalsIgnoreCase(a.getCourseCode()));
                            if (!attemptedInHistory && !passedBeforeCurrentSemester.contains(qCode)) {
                                violations.add("Học phần " + code + " chưa thỏa mãn môn học trước " + qCode);
                            }
                        }
                    }

                    // 6. Kiểm tra môn song hành (corequisites)
                    if (courseDef.getCorequisites() != null) {
                        for (String coreq : courseDef.getCorequisites()) {
                            if (coreq == null || coreq.isBlank()) continue;
                            String cCode = coreq.trim().toUpperCase();
                            boolean inSameSem = sem.getCourses().stream().anyMatch(c -> cCode.equalsIgnoreCase(c.getCourseCode()));
                            if (!passedBeforeCurrentSemester.contains(cCode) && !inSameSem) {
                                violations.add("Học phần " + code + " yêu cầu môn song hành " + cCode + " phải học cùng kỳ hoặc đã hoàn thành");
                            }
                        }
                    }
                }

                // Cập nhật các môn đã hoàn thành sau học kỳ này cho kỳ kế tiếp
                passedBeforeCurrentSemester.addAll(currentSemesterCodes);
            }
        }

        if (!violations.isEmpty()) {
            warnings.add("Kế hoạch học tập vi phạm một số ràng buộc học vụ cần điều chỉnh");
        }

        boolean isValid = violations.isEmpty();
        StudyPlanStatus status = isValid ? StudyPlanStatus.VALIDATED : StudyPlanStatus.DRAFT;
        return new ValidateStudyPlanResponse(isValid, status, violations, warnings, planVersion, revision);
    }

    @Override
    public SimulateGradesResponse simulateGrades(SimulateGradesRequest request) {
        String studentId = request != null ? request.getStudentId() : null;
        Map<String, StudentProfileFixture> contextProfiles = getContextProfiles(studentId, request != null ? request.getDataRevision() : null);
        return new GradeSimulator(this.policy, contextProfiles).simulateGrades(request);
    }

    @Override
    public RankRetakeCoursesResponse rankRetakeCourses(RankRetakeCoursesRequest request) {
        String studentId = request != null ? request.getStudentId() : null;
        Map<String, StudentProfileFixture> contextProfiles = getContextProfiles(studentId, request != null ? request.getDataRevision() : null);
        return new GradeSimulator(this.policy, contextProfiles).rankRetakeCourses(request);
    }

    @Override
    public CalculateTargetGradesResponse calculateTargetGrades(CalculateTargetGradesRequest request) {
        String studentId = request != null ? request.getStudentId() : null;
        Map<String, StudentProfileFixture> contextProfiles = getContextProfiles(studentId, request != null ? request.getDataRevision() : null);
        StudentProfileFixture profile = contextProfiles.get(studentId);
        CurriculumFixture targetCurriculum = resolveCurriculum(profile, null);
        return new GradeSimulator(this.policy, targetCurriculum, contextProfiles).calculateTargetGrades(request);
    }

    @Override
    public GraduationAuditResponse runGraduationAudit(GraduationAuditRequest request) {
        String studentId = request != null ? request.getStudentId() : null;
        String revision = request != null ? request.getDataRevision() : "rev-v0";

        StudentProfileFixture profile = null;
        int earnedCredits = 0;
        BigDecimal cpa = null;
        List<AuditChecklistItem> checklist = new ArrayList<>();
        List<AuditCertificateAction> actions = new ArrayList<>();

        if (recordProvider != null && studentId != null) {
            try {
                StudentAcademicRecord record = recordProvider.getAcademicRecord(studentId);
                if (record != null) {
                    AcademicStatusResponse status = getAcademicStatus(new AcademicStatusRequest(studentId, record.getDataRevision()));
                    profile = toProfile(record, status);

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
                                        null,       // Task 4.3c: Chuẩn ISO yyyy-MM-dd hoặc null, không ghi text
                                        "PENDING"   // Task 4.3c: Chuẩn PENDING thay vì "Chưa nộp"
                                ));
                            }
                        }
                    }
                }
            } catch (Exception ignored) {
            }
        }

        if (profile == null) {
            profile = profiles.get(studentId);
            if (profile == null) {
                profile = AcademicFixtures.getStudentProfilesV1().get(studentId);
            }
            if (profile != null) {
                earnedCredits = profile.getAccumulatedCredits() != null ? profile.getAccumulatedCredits().intValue() : 0;
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
                    for (AuditCertificateAction act : profile.getPendingActions()) {
                        String deadline = act.getDeadline();
                        if (deadline != null && !DATE_PATTERN.matcher(deadline).matches()) {
                            deadline = null;
                        }
                        String status = act.getStatus();
                        if ("Chưa nộp".equalsIgnoreCase(status) || status == null) {
                            status = "PENDING";
                        } else if ("Đã nộp".equalsIgnoreCase(status)) {
                            status = "DONE";
                        }
                        actions.add(new AuditCertificateAction(act.getCertificateType(), act.getRequiredStandard(),
                                act.getActionDescription(), deadline, status));
                    }
                }
            }
        }

        CurriculumFixture targetCurriculum = resolveCurriculum(profile, null);
        int totalRequired = resolveTotalCredits(profile, targetCurriculum);

        // Tính khối đại cương từ bảng điểm thực tế (Task 4.3c)
        int generalEducationEarned = 0;
        int requiredGeneralCredits = 30;
        if (targetCurriculum != null && targetCurriculum.getKnowledgeBlocks() != null) {
            for (CurriculumFixture.KnowledgeBlockItem block : targetCurriculum.getKnowledgeBlocks()) {
                if (block.getBlockName() != null && (block.getBlockName().toLowerCase().contains("đại cương") || block.getBlockId().contains("GEN"))) {
                    if (block.getRequiredCredits() != null) {
                        requiredGeneralCredits = block.getRequiredCredits();
                    }
                }
            }
        }

        Set<String> generalCourseCodes = new HashSet<>();
        if (targetCurriculum != null && targetCurriculum.getCourses() != null) {
            for (CurriculumFixture.CourseDefinitionItem c : targetCurriculum.getCourses()) {
                if (c.getKnowledgeBlock() != null && (c.getKnowledgeBlock().toLowerCase().contains("đại cương") || c.getKnowledgeBlock().contains("I."))) {
                    generalCourseCodes.add(c.getCourseCode().toUpperCase());
                }
            }
        }

        if (profile != null && profile.getCourseAttempts() != null) {
            Set<String> counted = new HashSet<>();
            for (StudentProfileFixture.CourseAttempt a : profile.getCourseAttempts()) {
                if (a.getCourseCode() != null && generalCourseCodes.contains(a.getCourseCode().toUpperCase())) {
                    Boolean passed = a.getPassed() != null ? a.getPassed() : GradeCalculator.isPassed(a.getLetterGrade());
                    if (Boolean.TRUE.equals(passed) && !counted.contains(a.getCourseCode().toUpperCase())) {
                        counted.add(a.getCourseCode().toUpperCase());
                        generalEducationEarned += (a.getCredits() != null ? a.getCredits().intValue() : 0);
                    }
                }
            }
        }

        int percentage = totalRequired > 0 ? (earnedCredits * 100 / totalRequired) : 0;

        // Mục tín chỉ tích lũy trong checklist
        checklist.add(0, new AuditChecklistItem(
                "TÍN CHỈ TÍCH LŨY",
                "Tổng số tín chỉ tích lũy",
                earnedCredits >= totalRequired,
                totalRequired,
                earnedCredits,
                earnedCredits >= totalRequired ? "Đã hoàn thành 100%" : "Còn thiếu " + (totalRequired - earnedCredits) + " tín chỉ"
        ));

        // Mục khối đại cương tính từ bảng điểm thực tế
        boolean generalCompleted = (generalEducationEarned >= requiredGeneralCredits);
        checklist.add(1, new AuditChecklistItem(
                "KHỐI ĐẠI CƯƠNG",
                "Khối kiến thức giáo dục đại cương",
                generalCompleted,
                requiredGeneralCredits,
                generalEducationEarned,
                generalCompleted ? "Đã hoàn thành 100%" : (generalEducationEarned == 0 ? "Chưa hoàn thành" : "Còn thiếu " + (requiredGeneralCredits - generalEducationEarned) + " tín chỉ")
        ));

        boolean allCertCompleted = checklist.stream().allMatch(AuditChecklistItem::isCompleted);
        boolean eligible = (earnedCredits >= totalRequired) && allCertCompleted &&
                (cpa != null && cpa.compareTo(new BigDecimal("2.00")) >= 0);

        return new GraduationAuditResponse(studentId, eligible, percentage, earnedCredits, totalRequired, checklist, actions, revision);
    }

    @Override
    public ReconcileStudyPlanResponse reconcileStudyPlan(ReconcileStudyPlanRequest request) {
        String studentId = request != null ? request.getStudentId() : null;
        Map<String, StudentProfileFixture> contextProfiles = getContextProfiles(studentId, request != null ? request.getDataRevision() : null);
        StudentProfileFixture profile = contextProfiles.get(studentId);
        CurriculumFixture targetCurriculum = resolveCurriculum(profile, null);
        return new PlanReconciler(this.policy, targetCurriculum, contextProfiles).reconcileStudyPlan(request);
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    private StudentProfileFixture resolveProfile(String studentId, String revision) {
        if (studentId == null || studentId.isBlank()) {
            return null;
        }
        if (recordProvider != null) {
            try {
                StudentAcademicRecord record = recordProvider.getAcademicRecord(studentId);
                if (record != null) {
                    AcademicStatusResponse status = getAcademicStatus(new AcademicStatusRequest(studentId, record.getDataRevision() != null ? record.getDataRevision() : revision));
                    return toProfile(record, status);
                }
            } catch (Exception ignored) {
            }
        }
        StudentProfileFixture profile = profiles.get(studentId);
        if (profile == null) {
            profile = AcademicFixtures.getStudentProfilesV1().get(studentId);
        }
        return profile;
    }

    private Map<String, StudentProfileFixture> getContextProfiles(String studentId, String revision) {
        Map<String, StudentProfileFixture> context = new HashMap<>(this.profiles);
        if (studentId != null) {
            StudentProfileFixture resolved = resolveProfile(studentId, revision);
            if (resolved != null) {
                context.put(studentId, resolved);
            }
        }
        return context;
    }

    private CurriculumFixture resolveCurriculum(StudentProfileFixture profile, String courseCodeOrCurriculumId) {
        CurriculumFixture target = this.curriculum;
        if (profile != null && "CT1085".equalsIgnoreCase(profile.getMajorCode())) {
            target = AcademicFixtures.getCurriculumV1();
        } else if (target != null && target.getCourses() != null && courseCodeOrCurriculumId != null) {
            boolean inTarget = target.getCourses().stream().anyMatch(c -> c.getCourseCode().equalsIgnoreCase(courseCodeOrCurriculumId));
            if (!inTarget && AcademicFixtures.getCurriculumV1().getCourses().stream().anyMatch(c -> c.getCourseCode().equalsIgnoreCase(courseCodeOrCurriculumId))) {
                target = AcademicFixtures.getCurriculumV1();
            }
        }
        if (target == null) {
            target = AcademicFixtures.getCurriculum();
        }
        return target;
    }

    private int resolveTotalCredits(StudentProfileFixture profile, CurriculumFixture targetCurriculum) {
        if (profile != null && profile.getTotalCreditsRequired() != null && profile.getTotalCreditsRequired() > 0) {
            return profile.getTotalCreditsRequired();
        }
        if (targetCurriculum != null && targetCurriculum.getTotalCredits() != null && targetCurriculum.getTotalCredits() > 0) {
            return targetCurriculum.getTotalCredits();
        }
        return 135;
    }

    private StudentProfileFixture toProfile(StudentAcademicRecord record, AcademicStatusResponse status) {
        List<TranscriptAttemptItem> attempts = record.getAttempts() == null ? List.of() : record.getAttempts();
        StudentProfileFixture profile = new StudentProfileFixture();
        profile.setStudentId(record.getStudentId());
        profile.setDataRevision(record.getDataRevision());
        if (record.getCurriculumId() != null && record.getCurriculumId().contains("ktpm")) {
            profile.setMajorCode("CT1085");
            profile.setTotalCreditsRequired(150);
        } else {
            profile.setTotalCreditsRequired(135);
        }
        if (status != null) {
            profile.setCpa(status.getCpa());
            profile.setAccumulatedCredits(status.getAccumulatedCredits() != null ? status.getAccumulatedCredits().doubleValue() : null);
            profile.setRiskLevel(status.getRiskLevel());
        }
        profile.setCurrentSemester(countCompletedMainSemesters(attempts));
        profile.setCourseAttempts(attempts.stream().map(this::toProfileAttempt).toList());
        return profile;
    }

    private Integer countCompletedMainSemesters(List<TranscriptAttemptItem> attempts) {
        if (attempts == null || attempts.isEmpty()) return null;
        long count = attempts.stream()
                .map(TranscriptAttemptItem::getSemesterCode)
                .filter(code -> code != null && MAIN_SEMESTER_PATTERN.matcher(code).matches())
                .distinct()
                .count();
        return count == 0 ? null : (int) count;
    }

    private StudentProfileFixture.CourseAttempt toProfileAttempt(TranscriptAttemptItem item) {
        StudentProfileFixture.CourseAttempt attempt = new StudentProfileFixture.CourseAttempt();
        attempt.setCourseCode(item.getCourseCode());
        attempt.setCourseName(item.getCourseName());
        attempt.setCredits(item.getCredits() == null ? null : item.getCredits().doubleValue());
        attempt.setSemesterCode(item.getSemesterCode());
        attempt.setLetterGrade(item.getLetterGrade());
        attempt.setScore10(item.getScore10() == null ? null : item.getScore10().doubleValue());
        attempt.setPassed(GradeCalculator.isPassed(item.getLetterGrade()));
        Double gpa4 = GradeCalculator.toGradePoint4(item.getLetterGrade());
        attempt.setGradePoint4(gpa4);
        return attempt;
    }
}
