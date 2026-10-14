package vn.haui.advisor.academic;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.academic.engine.StudyPlanScheduler;
import vn.haui.advisor.academic.fixture.AcademicFixtures;
import vn.haui.advisor.academic.model.CurriculumFixture;
import vn.haui.advisor.academic.model.PolicyDemo;
import vn.haui.advisor.academic.model.StudentProfileFixture;
import vn.haui.advisor.academic.service.DefaultAcademicFacade;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.AcademicFacade;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Task 3.6 - Study Plan Generator Tests (planner-tool-ready)")
public class StudyPlanGeneratorTest {

    private AcademicFacade academicFacade;
    private PolicyDemo policy;
    private CurriculumFixture curriculumKTPM;

    @BeforeEach
    void setUp() {
        this.academicFacade = new DefaultAcademicFacade();
        this.policy = AcademicFixtures.getPolicyDemo();
        this.curriculumKTPM = AcademicFixtures.getCurriculumV1();
    }

    @Test
    @DisplayName("Case 1: Sinh kế hoạch bình thường (10-20 TC/kỳ, DRAFT)")
    void testStandardPlanGeneration() {
        GenerateStudyPlanRequest req = new GenerateStudyPlanRequest(
                "2024604757", "2027_1", new BigDecimal("3.50"), 20, false, "rev-ktpm-v1"
        );
        GenerateStudyPlanResponse res = academicFacade.generateStudyPlan(req);

        assertThat(res).isNotNull();
        assertThat(res.getStatus()).isEqualTo(StudyPlanStatus.DRAFT);
        assertThat(res.getSemesters()).isNotEmpty();

        PlannedSemesterItem sem1 = res.getSemesters().get(0);
        assertThat(sem1.getTotalCredits()).isBetween(10, 20);
        assertThat(sem1.getCourses()).isNotEmpty();
    }

    @Test
    @DisplayName("Case 2: Ràng buộc trần cứng <= 14 TC với sinh viên cảnh báo học tập (REG-HAUI-02)")
    void testAcademicWarningCreditCap() {
        GenerateStudyPlanRequest req = new GenerateStudyPlanRequest(
                "std-warning-real", "2027_1", new BigDecimal("2.50"), 24, false, "rev-ktpm-v1"
        );
        GenerateStudyPlanResponse res = academicFacade.generateStudyPlan(req);

        assertThat(res).isNotNull();
        assertThat(res.getSemesters()).isNotEmpty();
        for (PlannedSemesterItem sem : res.getSemesters()) {
            assertThat(sem.getTotalCredits())
                    .as("Kỳ học sinh viên bị cảnh báo không được vượt quá 14 TC")
                    .isLessThanOrEqualTo(14);
        }
        assertThat(res.getWarnings()).anyMatch(w -> w.contains("14 tín chỉ") || w.contains("REG-HAUI-02"));
    }

    @Test
    @DisplayName("Case 3: Học vượt (Accelerated) cho phép đăng ký lên tới 24 TC ở kỳ chính")
    void testAcceleratedPlanGeneration() {
        GenerateStudyPlanRequest req = new GenerateStudyPlanRequest(
                "2024604757", "2026_2", new BigDecimal("3.60"), 24, false, "rev-ktpm-v1"
        );
        GenerateStudyPlanResponse res = academicFacade.generateStudyPlan(req);

        assertThat(res).isNotNull();
        PlannedSemesterItem mainSem = res.getSemesters().get(0);
        assertThat(mainSem.getTotalCredits()).isGreaterThan(14);
        assertThat(mainSem.getTotalCredits()).isLessThanOrEqualTo(24);
    }

    @Test
    @DisplayName("Case 4: Có kỳ hè khi includeSummerSemesters = true (Trần tối đa 12 TC, sàn 0 TC)")
    void testIncludeSummerSemester() {
        GenerateStudyPlanRequest req = new GenerateStudyPlanRequest(
                "2024604757", "2027_1", new BigDecimal("3.50"), 20, true, "rev-ktpm-v1"
        );
        GenerateStudyPlanResponse res = academicFacade.generateStudyPlan(req);

        assertThat(res).isNotNull();
        PlannedSemesterItem summerSem = res.getSemesters().stream()
                .filter(s -> s.getSemesterCode().contains("SUMMER"))
                .findFirst()
                .orElse(null);

        assertThat(summerSem).isNotNull();
        assertThat(summerSem.getTotalCredits()).isLessThanOrEqualTo(12);
    }

    @Test
    @DisplayName("Case 5: Không có kỳ hè theo mặc định khi includeSummerSemesters = false hoặc null")
    void testExcludeSummerSemesterByDefault() {
        GenerateStudyPlanRequest req = new GenerateStudyPlanRequest(
                "2024604757", "2027_1", new BigDecimal("3.50"), 20, false, "rev-ktpm-v1"
        );
        GenerateStudyPlanResponse res = academicFacade.generateStudyPlan(req);

        assertThat(res).isNotNull();
        boolean hasSummer = res.getSemesters().stream()
                .anyMatch(s -> s.getSemesterCode().contains("SUMMER"));
        assertThat(hasSummer).isFalse();
    }

    @Test
    @DisplayName("Case 6: Chained Prerequisites: Môn kỳ 2 mở khóa nhờ giả định môn kỳ 1 đạt")
    void testChainedPrerequisitesProgression() {
        GenerateStudyPlanRequest req = new GenerateStudyPlanRequest(
                "2024604757", "2027_1", new BigDecimal("3.50"), 20, false, "rev-ktpm-v1"
        );
        GenerateStudyPlanResponse res = academicFacade.generateStudyPlan(req);

        assertThat(res).isNotNull();
        assertThat(res.getSemesters().size()).isGreaterThanOrEqualTo(2);

        PlannedSemesterItem sem1 = res.getSemesters().get(0);
        PlannedSemesterItem sem2 = res.getSemesters().get(1);

        List<String> sem1Codes = sem1.getCourses().stream().map(PlannedCourseItem::getCourseCode).toList();
        List<String> sem2Codes = sem2.getCourses().stream().map(PlannedCourseItem::getCourseCode).toList();

        // Không trùng môn giữa các kỳ
        assertThat(Collections.disjoint(sem1Codes, sem2Codes)).isTrue();
    }

    @Test
    @DisplayName("Case 7: Corequisite pair được xếp cùng một học kỳ nếu cả hai chưa đạt")
    void testCorequisitePairScheduledTogether() {
        CurriculumFixture customCurriculum = new CurriculumFixture();
        customCurriculum.setCurriculumId("custom-coreq");
        customCurriculum.setTotalCredits(150);

        CurriculumFixture.CourseDefinitionItem courseA = new CurriculumFixture.CourseDefinitionItem();
        courseA.setCourseCode("TEST_A");
        courseA.setCourseName("Môn lý thuyết A");
        courseA.setCredits(3.0);
        courseA.setSuggestedSemester(1);
        courseA.setCorequisites(List.of("TEST_B"));

        CurriculumFixture.CourseDefinitionItem courseB = new CurriculumFixture.CourseDefinitionItem();
        courseB.setCourseCode("TEST_B");
        courseB.setCourseName("Thực hành song hành B");
        courseB.setCredits(1.0);
        courseB.setSuggestedSemester(1);

        customCurriculum.setCourses(List.of(courseA, courseB));

        StudentProfileFixture profile = new StudentProfileFixture();
        profile.setStudentId("std-test-coreq");
        profile.setCourseAttempts(Collections.emptyList());
        profile.setCurrentSemester(0);
        profile.setAccumulatedCredits(0.0);

        GenerateStudyPlanRequest req = new GenerateStudyPlanRequest(
                "std-test-coreq", "2025_2", new BigDecimal("3.00"), 20, false, "rev-test"
        );

        StudyPlanScheduler scheduler = new StudyPlanScheduler(policy, customCurriculum);
        GenerateStudyPlanResponse res = scheduler.plan(profile, req);

        assertThat(res.getSemesters()).isNotEmpty();
        PlannedSemesterItem sem1 = res.getSemesters().get(0);
        List<String> codes = sem1.getCourses().stream().map(PlannedCourseItem::getCourseCode).toList();

        assertThat(codes).contains("TEST_A", "TEST_B");
    }

    @Test
    @DisplayName("Case 8: Corequisite đã đạt từ trước -> Môn chính được phép xếp độc lập")
    void testCorequisiteWhenOneAlreadyPassed() {
        CurriculumFixture customCurriculum = new CurriculumFixture();
        customCurriculum.setCurriculumId("custom-coreq-passed");
        customCurriculum.setTotalCredits(150);

        CurriculumFixture.CourseDefinitionItem courseA = new CurriculumFixture.CourseDefinitionItem();
        courseA.setCourseCode("TEST_A");
        courseA.setCourseName("Môn lý thuyết A");
        courseA.setCredits(3.0);
        courseA.setSuggestedSemester(2);
        courseA.setCorequisites(List.of("TEST_B"));

        CurriculumFixture.CourseDefinitionItem courseB = new CurriculumFixture.CourseDefinitionItem();
        courseB.setCourseCode("TEST_B");
        courseB.setCourseName("Thực hành B");
        courseB.setCredits(1.0);
        courseB.setSuggestedSemester(1);

        customCurriculum.setCourses(List.of(courseA, courseB));

        StudentProfileFixture profile = new StudentProfileFixture();
        profile.setStudentId("std-test-coreq-passed");
        StudentProfileFixture.CourseAttempt attemptB = new StudentProfileFixture.CourseAttempt();
        attemptB.setCourseCode("TEST_B");
        attemptB.setPassed(true);
        attemptB.setLetterGrade("A");
        attemptB.setGradePoint4(4.0);
        profile.setCourseAttempts(List.of(attemptB));
        profile.setCurrentSemester(1);
        profile.setAccumulatedCredits(1.0);

        GenerateStudyPlanRequest req = new GenerateStudyPlanRequest(
                "std-test-coreq-passed", "2025_2", new BigDecimal("3.00"), 20, false, "rev-test"
        );

        StudyPlanScheduler scheduler = new StudyPlanScheduler(policy, customCurriculum);
        GenerateStudyPlanResponse res = scheduler.plan(profile, req);

        PlannedSemesterItem sem1 = res.getSemesters().get(0);
        List<String> codes = sem1.getCourses().stream().map(PlannedCourseItem::getCourseCode).toList();

        assertThat(codes).contains("TEST_A");
        assertThat(codes).doesNotContain("TEST_B"); // Đã đạt, không xếp lại
    }

    @Test
    @DisplayName("Case 9: Corequisite bundle vượt trần tín chỉ còn lại -> Hoãn cả bundle, không tách lẻ")
    void testCorequisiteBundleExceedsRemainingCredits() {
        CurriculumFixture customCurriculum = new CurriculumFixture();
        customCurriculum.setCurriculumId("custom-coreq-overflow");
        customCurriculum.setTotalCredits(150);

        // Môn 1 chiếm 12 TC (đạt trần 14 TC của SV cảnh báo)
        CurriculumFixture.CourseDefinitionItem filler = new CurriculumFixture.CourseDefinitionItem();
        filler.setCourseCode("FILL_01");
        filler.setCourseName("Môn nền tảng 12 TC");
        filler.setCredits(12.0);
        filler.setSuggestedSemester(1);

        // Cặp song hành cần 3 TC + 1 TC = 4 TC (12 + 4 = 16 > trần 14 TC)
        CurriculumFixture.CourseDefinitionItem courseA = new CurriculumFixture.CourseDefinitionItem();
        courseA.setCourseCode("TEST_A");
        courseA.setCourseName("Môn lý thuyết A");
        courseA.setCredits(3.0);
        courseA.setSuggestedSemester(1);
        courseA.setCorequisites(List.of("TEST_B"));

        CurriculumFixture.CourseDefinitionItem courseB = new CurriculumFixture.CourseDefinitionItem();
        courseB.setCourseCode("TEST_B");
        courseB.setCourseName("Thực hành song hành B");
        courseB.setCredits(1.0);
        courseB.setSuggestedSemester(1);
        courseB.setCorequisites(List.of("TEST_A"));

        customCurriculum.setCourses(List.of(filler, courseA, courseB));

        StudentProfileFixture profile = new StudentProfileFixture();
        profile.setStudentId("std-warning-coreq");
        profile.setRiskLevel(AcademicRiskLevel.WARNING_LEVEL_1); // Trần 14 TC
        StudentProfileFixture.CourseAttempt failedFiller = new StudentProfileFixture.CourseAttempt();
        failedFiller.setCourseCode("FILL_01");
        failedFiller.setCourseName("Môn nền tảng 12 TC");
        failedFiller.setPassed(false);
        failedFiller.setLetterGrade("F");
        failedFiller.setGradePoint4(0.0);
        profile.setCourseAttempts(List.of(failedFiller));
        profile.setCurrentSemester(0);
        profile.setAccumulatedCredits(0.0);

        GenerateStudyPlanRequest req = new GenerateStudyPlanRequest(
                "std-warning-coreq", "2025_2", new BigDecimal("2.50"), 20, false, "rev-test"
        );

        StudyPlanScheduler scheduler = new StudyPlanScheduler(policy, customCurriculum);
        GenerateStudyPlanResponse res = scheduler.plan(profile, req);

        PlannedSemesterItem sem1 = res.getSemesters().get(0);
        List<String> codesSem1 = sem1.getCourses().stream().map(PlannedCourseItem::getCourseCode).toList();

        // Trong sem1 chỉ có FILL_01 (12 TC), TEST_A và TEST_B không bị xé lẻ vào sem1
        assertThat(codesSem1).contains("FILL_01");
        assertThat(codesSem1).doesNotContain("TEST_A", "TEST_B");

        // Cả bundle TEST_A và TEST_B được hoãn sang sem2
        PlannedSemesterItem sem2 = res.getSemesters().get(1);
        List<String> codesSem2 = sem2.getCourses().stream().map(PlannedCourseItem::getCourseCode).toList();
        assertThat(codesSem2).contains("TEST_A", "TEST_B");
    }

    @Test
    @DisplayName("Case 10: Ưu tiên học lại môn F (điểm cao nhất, gỡ nợ và mở khóa tiên quyết)")
    void testRetakePriorityForFailedCourses() {
        GenerateStudyPlanRequest req = new GenerateStudyPlanRequest(
                "std-2026-001", "2026_1", new BigDecimal("3.00"), 20, false, "rev-1001"
        );
        GenerateStudyPlanResponse res = academicFacade.generateStudyPlan(req);

        assertThat(res).isNotNull();
        PlannedSemesterItem sem1 = res.getSemesters().get(0);

        // Môn nợ MATH1002 phải được xếp đầu tiên
        assertThat(sem1.getCourses().get(0).getCourseCode()).isEqualTo("MATH1002");
        assertThat(sem1.getCourses().get(0).getRationale()).contains("40%");
    }

    @Test
    @DisplayName("Case 11: Học cải thiện theo lựa chọn hợp lệ qua selectedRetakeCourseCodes (BR-06)")
    void testSelectedRetakeCoursesIncluded() {
        // Sinh viên std-2026-001 có môn IT2001 đạt điểm D+ (1.5)
        GenerateStudyPlanRequest req = new GenerateStudyPlanRequest(
                "std-2026-001", "2026_1", new BigDecimal("3.00"), 20, false, "rev-1001"
        );
        req.setSelectedRetakeCourseCodes(List.of("IT2001"));

        GenerateStudyPlanResponse res = academicFacade.generateStudyPlan(req);

        assertThat(res).isNotNull();
        boolean scheduledRetake = res.getSemesters().stream()
                .flatMap(s -> s.getCourses().stream())
                .anyMatch(c -> c.getCourseCode().equals("IT2001") && c.getCourseName().contains("cải thiện"));

        assertThat(scheduledRetake).isTrue();
    }

    @Test
    @DisplayName("Case 12: Điều kiện nhận Đồ án tốt nghiệp (BR-09: >= 85% tổng TC CTĐT)")
    void testGraduationThesisCreditPrerequisite() {
        // Sinh viên 2024604757 mới tích lũy 61 TC (< 128 TC của 150 TC KTPM)
        GenerateStudyPlanRequest req = new GenerateStudyPlanRequest(
                "2024604757", "2027_1", new BigDecimal("3.50"), 20, false, "rev-ktpm-v1"
        );
        GenerateStudyPlanResponse res = academicFacade.generateStudyPlan(req);

        // Đồ án tốt nghiệp IT6009 không được xuất hiện ở kỳ 1 khi chưa đủ tích lũy
        PlannedSemesterItem sem1 = res.getSemesters().get(0);
        assertThat(sem1.getCourses()).noneMatch(c -> c.getCourseCode().equals("IT6009"));
    }

    @Test
    @DisplayName("Case 13: Deterministic Tie-breaking: Cùng điểm -> credits giảm dần -> courseCode tăng dần")
    void testDeterministicTieBreaking() {
        CurriculumFixture customCurriculum = new CurriculumFixture();
        customCurriculum.setCurriculumId("custom-tie");
        customCurriculum.setTotalCredits(150);

        // Ba môn cùng kỳ 1, không tiên quyết, không học lại:
        // C1: 4 TC, code "ZZ400"
        CurriculumFixture.CourseDefinitionItem c1 = new CurriculumFixture.CourseDefinitionItem();
        c1.setCourseCode("ZZ400");
        c1.setCourseName("Môn Z 4 TC");
        c1.setCredits(4.0);
        c1.setSuggestedSemester(1);

        // C2: 3 TC, code "BB300"
        CurriculumFixture.CourseDefinitionItem c2 = new CurriculumFixture.CourseDefinitionItem();
        c2.setCourseCode("BB300");
        c2.setCourseName("Môn B 3 TC");
        c2.setCredits(3.0);
        c2.setSuggestedSemester(1);

        // C3: 3 TC, code "AA300"
        CurriculumFixture.CourseDefinitionItem c3 = new CurriculumFixture.CourseDefinitionItem();
        c3.setCourseCode("AA300");
        c3.setCourseName("Môn A 3 TC");
        c3.setCredits(3.0);
        c3.setSuggestedSemester(1);

        customCurriculum.setCourses(List.of(c1, c2, c3));

        StudentProfileFixture profile = new StudentProfileFixture();
        profile.setStudentId("std-tie");
        profile.setCourseAttempts(Collections.emptyList());
        profile.setCurrentSemester(0);
        profile.setAccumulatedCredits(0.0);

        GenerateStudyPlanRequest req = new GenerateStudyPlanRequest(
                "std-tie", "2025_2", new BigDecimal("3.00"), 20, false, "rev-test"
        );

        StudyPlanScheduler scheduler = new StudyPlanScheduler(policy, customCurriculum);
        GenerateStudyPlanResponse res = scheduler.plan(profile, req);

        PlannedSemesterItem sem1 = res.getSemesters().get(0);
        List<String> codes = sem1.getCourses().stream().map(PlannedCourseItem::getCourseCode).toList();

        // Môn 3 TC AA300 và BB300 có sBalance = 100, sProgression = 100 -> điểm cao hơn môn 4 TC (sBalance = 70)
        // Giữa AA300 và BB300 cùng điểm và cùng credits 3 -> AA300 xếp trước BB300 theo thứ tự từ điển
        assertThat(codes.indexOf("AA300")).isLessThan(codes.indexOf("BB300"));
    }

    @Test
    @DisplayName("Case 14: Chuẩn hóa trọng số khi môn không thuộc diện retake (tổng trọng số 80 về thang 100%)")
    void testNormalizedScoringWithoutRetake() {
        CurriculumFixture customCurriculum = new CurriculumFixture();
        customCurriculum.setCurriculumId("custom-norm");
        customCurriculum.setTotalCredits(150);

        CurriculumFixture.CourseDefinitionItem c1 = new CurriculumFixture.CourseDefinitionItem();
        c1.setCourseCode("NORM_01");
        c1.setCourseName("Môn mới chuẩn hóa");
        c1.setCredits(3.0);
        c1.setSuggestedSemester(1);

        customCurriculum.setCourses(List.of(c1));

        StudentProfileFixture profile = new StudentProfileFixture();
        profile.setStudentId("std-norm");
        profile.setCourseAttempts(Collections.emptyList());
        profile.setCurrentSemester(0);
        profile.setAccumulatedCredits(0.0);

        GenerateStudyPlanRequest req = new GenerateStudyPlanRequest(
                "std-norm", "2025_2", new BigDecimal("3.00"), 20, false, "rev-test"
        );

        StudyPlanScheduler scheduler = new StudyPlanScheduler(policy, customCurriculum);
        GenerateStudyPlanResponse res = scheduler.plan(profile, req);

        assertThat(res.getSemesters().get(0).getCourses()).isNotEmpty();
        assertThat(res.getSemesters().get(0).getCourses().get(0).getCourseCode()).isEqualTo("NORM_01");
    }

    @Test
    @DisplayName("Case 15: Cảnh báo ASSUMED_OFFERING_UNVERIFIED khi thiếu dữ liệu mở lớp chính thức")
    void testMissingOfferingDataWarning() {
        GenerateStudyPlanRequest req = new GenerateStudyPlanRequest(
                "2024604757", "2027_1", new BigDecimal("3.50"), 20, false, "rev-ktpm-v1"
        );
        GenerateStudyPlanResponse res = academicFacade.generateStudyPlan(req);

        assertThat(res.getWarnings()).anyMatch(w -> w.contains("ASSUMED_OFFERING_UNVERIFIED"));
    }

    @Test
    @DisplayName("Case 16: Phát hiện chu trình phụ thuộc tiên quyết (Cycle) và trả NO_PLAN_FOUND an toàn")
    void testCircularDependencyHandling() {
        CurriculumFixture cycleCurriculum = new CurriculumFixture();
        cycleCurriculum.setCurriculumId("custom-cycle");
        cycleCurriculum.setTotalCredits(150);

        CurriculumFixture.CourseDefinitionItem courseA = new CurriculumFixture.CourseDefinitionItem();
        courseA.setCourseCode("CYCLE_A");
        courseA.setCourseName("Môn chu trình A");
        courseA.setCredits(3.0);
        courseA.setSuggestedSemester(1);
        courseA.setPrerequisites(List.of("CYCLE_B"));

        CurriculumFixture.CourseDefinitionItem courseB = new CurriculumFixture.CourseDefinitionItem();
        courseB.setCourseCode("CYCLE_B");
        courseB.setCourseName("Môn chu trình B");
        courseB.setCredits(3.0);
        courseB.setSuggestedSemester(1);
        courseB.setPrerequisites(List.of("CYCLE_A"));

        cycleCurriculum.setCourses(List.of(courseA, courseB));

        StudentProfileFixture profile = new StudentProfileFixture();
        profile.setStudentId("std-cycle");
        profile.setCourseAttempts(Collections.emptyList());
        profile.setCurrentSemester(0);
        profile.setAccumulatedCredits(0.0);

        GenerateStudyPlanRequest req = new GenerateStudyPlanRequest(
                "std-cycle", "2025_2", new BigDecimal("3.00"), 20, false, "rev-test"
        );

        StudyPlanScheduler scheduler = new StudyPlanScheduler(policy, cycleCurriculum);
        GenerateStudyPlanResponse res = scheduler.plan(profile, req);

        assertThat(res.getProposalId()).isEqualTo("no-plan-found");
        assertThat(res.getWarnings()).anyMatch(w -> w.contains("NO_PLAN_FOUND") && w.contains("chu trình"));
    }

    @Test
    @DisplayName("Case 17: Xử lý NO_PLAN_FOUND khi không có môn nào thỏa mãn ràng buộc cứng")
    void testNoPlanFoundWhenConstraintsImpossible() {
        CurriculumFixture emptyCurriculum = new CurriculumFixture();
        emptyCurriculum.setCurriculumId("custom-empty");
        emptyCurriculum.setCourses(Collections.emptyList());

        StudentProfileFixture profile = new StudentProfileFixture();
        profile.setStudentId("std-empty");
        profile.setCourseAttempts(Collections.emptyList());
        profile.setCurrentSemester(0);
        profile.setAccumulatedCredits(0.0);

        GenerateStudyPlanRequest req = new GenerateStudyPlanRequest(
                "std-empty", "2025_2", new BigDecimal("3.00"), 20, false, "rev-test"
        );

        StudyPlanScheduler scheduler = new StudyPlanScheduler(policy, emptyCurriculum);
        GenerateStudyPlanResponse res = scheduler.plan(profile, req);

        assertThat(res.getProposalId()).isEqualTo("no-plan-found");
        assertThat(res.getWarnings()).anyMatch(w -> w.contains("NO_PLAN_FOUND"));
    }

    @Test
    @DisplayName("Case 18: Cảnh báo sàn tín chỉ khi kỳ chính không đạt mức tối thiểu 10 TC")
    void testFloorCreditsWarning() {
        CurriculumFixture lowCreditsCurriculum = new CurriculumFixture();
        lowCreditsCurriculum.setCurriculumId("custom-low-credits");
        lowCreditsCurriculum.setTotalCredits(150);

        CurriculumFixture.CourseDefinitionItem courseA = new CurriculumFixture.CourseDefinitionItem();
        courseA.setCourseCode("LOW_01");
        courseA.setCourseName("Môn 3 TC duy nhất");
        courseA.setCredits(3.0);
        courseA.setSuggestedSemester(1);

        lowCreditsCurriculum.setCourses(List.of(courseA));

        StudentProfileFixture profile = new StudentProfileFixture();
        profile.setStudentId("std-low");
        profile.setCourseAttempts(Collections.emptyList());
        profile.setCurrentSemester(0);
        profile.setAccumulatedCredits(0.0);

        GenerateStudyPlanRequest req = new GenerateStudyPlanRequest(
                "std-low", "2025_2", new BigDecimal("3.00"), 20, false, "rev-test"
        );

        StudyPlanScheduler scheduler = new StudyPlanScheduler(policy, lowCreditsCurriculum);
        GenerateStudyPlanResponse res = scheduler.plan(profile, req);

        assertThat(res.getWarnings()).anyMatch(w -> w.contains("nhỏ hơn mức sàn 10 TC"));
    }

    @Test
    @DisplayName("Case 19: readyCapabilities() của AcademicFacade chứa GENERATE_STUDY_PLAN")
    void testFacadeReadyCapabilitiesContainsGenerateStudyPlan() {
        Set<AcademicCapability> ready = academicFacade.readyCapabilities();
        assertThat(ready).contains(AcademicCapability.GENERATE_STUDY_PLAN);
    }
}
