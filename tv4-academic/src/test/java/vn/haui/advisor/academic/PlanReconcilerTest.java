package vn.haui.advisor.academic;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.academic.engine.PlanReconciler;
import vn.haui.advisor.academic.fixture.AcademicFixtures;
import vn.haui.advisor.academic.model.CurriculumFixture;
import vn.haui.advisor.academic.model.PolicyDemo;
import vn.haui.advisor.academic.model.StudentProfileFixture;
import vn.haui.advisor.academic.service.DefaultAcademicFacade;
import vn.haui.advisor.contracts.dto.ReconcileStudyPlanRequest;
import vn.haui.advisor.contracts.dto.ReconcileStudyPlanResponse;
import vn.haui.advisor.contracts.ports.AcademicFacade;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Task 3.11 Stage 4: PlanReconciler Test Suite (20 Scenarios)")
public class PlanReconcilerTest {

    private AcademicFacade academicFacade;
    private PolicyDemo policy;
    private CurriculumFixture curriculumIt;
    private Map<String, StudentProfileFixture> profiles;

    @BeforeEach
    void setUp() {
        policy = AcademicFixtures.getPolicyDemo();
        curriculumIt = AcademicFixtures.getCurriculum();
        profiles = AcademicFixtures.getStudentProfiles();
        academicFacade = new DefaultAcademicFacade(policy, curriculumIt, profiles);
    }

    private StudentProfileFixture createStudent(String id, int semester, List<StudentProfileFixture.CourseAttempt> attempts) {
        StudentProfileFixture p = new StudentProfileFixture();
        p.setStudentId(id);
        p.setFullName("Sinh viên " + id);
        p.setCurrentSemester(semester);
        p.setCpa(new BigDecimal("2.50"));
        p.setAccumulatedCredits(60.0);
        p.setCourseAttempts(attempts != null ? new ArrayList<>(attempts) : new ArrayList<>());
        p.setDataRevision("rev-test");
        return p;
    }

    private StudentProfileFixture.CourseAttempt createAttempt(String code, String name, int credits, String semester,
                                                             String grade, double pts, Boolean passed) {
        StudentProfileFixture.CourseAttempt a = new StudentProfileFixture.CourseAttempt();
        a.setCourseCode(code);
        a.setCourseName(name);
        a.setCredits((double) credits);
        a.setSemesterCode(semester);
        a.setLetterGrade(grade);
        a.setGradePoint4(pts);
        a.setPassed(passed);
        return a;
    }

    private CurriculumFixture createCustomCurriculum(List<CurriculumFixture.CourseDefinitionItem> courses) {
        CurriculumFixture c = new CurriculumFixture();
        c.setCurriculumId("custom-cur");
        c.setTotalCredits(135);
        c.setCourses(courses != null ? new ArrayList<>(courses) : new ArrayList<>());
        return c;
    }

    private CurriculumFixture.CourseDefinitionItem createCourseDef(String code, String name, int credits,
                                                                   int sem, List<String> prereqs) {
        CurriculumFixture.CourseDefinitionItem item = new CurriculumFixture.CourseDefinitionItem();
        item.setCourseCode(code);
        item.setCourseName(name);
        item.setCredits((double) credits);
        item.setSuggestedSemester(sem);
        item.setPrerequisites(prereqs != null ? new ArrayList<>(prereqs) : new ArrayList<>());
        return item;
    }

    // =========================================================================
    // 1. Hoàn thành đúng kế hoạch
    // =========================================================================
    @Test
    @DisplayName("Case 01: Hoàn thành đúng kế hoạch -> onTrack = true, đạt mục tiêu điểm")
    void testCase01_CompletedOnTrack_TargetGradesMet() {
        StudentProfileFixture.CourseAttempt a1 = createAttempt("IT1001", "Nhập môn lập trình", 3, "2025_1", "B", 3.0, true);
        StudentProfileFixture.CourseAttempt a2 = createAttempt("IT2001", "Lập trình OOP", 4, "2025_1", "A", 4.0, true);
        StudentProfileFixture student = createStudent("std-test-01", 2, List.of(a1, a2));

        PlanReconciler reconciler = new PlanReconciler(policy, curriculumIt, Map.of("std-test-01", student));
        PlanReconciler.PlanDefinition plan = new PlanReconciler.PlanDefinition(
                "plan-01", "std-test-01",
                Map.of("2025_1", List.of(
                        new PlanReconciler.PlannedCourseItem("IT1001", "Nhập môn lập trình", 3, "B", "STANDARD", "Chuẩn"),
                        new PlanReconciler.PlannedCourseItem("IT2001", "Lập trình OOP", 4, "A", "STANDARD", "Chuẩn")
                ))
        );
        reconciler.registerPlan(plan);

        ReconcileStudyPlanRequest req = new ReconcileStudyPlanRequest("plan-01", "std-test-01", "2025_1", 1, "rev-test");
        ReconcileStudyPlanResponse res = reconciler.reconcileStudyPlan(req);

        assertThat(res).isNotNull();
        assertThat(res.isOnTrack()).isTrue();
        assertThat(res.getMissedOrFailedCourses()).isEmpty();
        assertThat(res.getCompletedCourses()).hasSize(2);
        assertThat(res.getCompletedCourses()).anyMatch(c -> c.contains("IT1001") && c.contains("đạt mục tiêu B"));
        assertThat(res.getCompletedCourses()).anyMatch(c -> c.contains("IT2001") && c.contains("đạt mục tiêu A"));
    }

    // =========================================================================
    // 2. Hoàn thành sớm
    // =========================================================================
    @Test
    @DisplayName("Case 02: Hoàn thành sớm hơn tiến độ chuẩn CTĐT -> Ghi nhận ghi chú tiến độ sớm")
    void testCase02_CompletedEarly_SuggestedSemesterComparison() {
        // IT2001 có suggestedSemester = 3 trong CTĐT, sinh viên học ở kỳ 1 (currentSemester = 1)
        StudentProfileFixture.CourseAttempt a1 = createAttempt("IT2001", "Lập trình OOP", 4, "2025_1", "A", 4.0, true);
        StudentProfileFixture student = createStudent("std-test-02", 1, List.of(a1));

        PlanReconciler reconciler = new PlanReconciler(policy, curriculumIt, Map.of("std-test-02", student));
        ReconcileStudyPlanRequest req = new ReconcileStudyPlanRequest("plan-02", "std-test-02", "2025_1", 1, "rev-test");
        ReconcileStudyPlanResponse res = reconciler.reconcileStudyPlan(req);

        assertThat(res.isOnTrack()).isTrue();
        assertThat(res.getCompletedCourses()).anyMatch(c -> c.contains("IT2001") && c.contains("Hoàn thành sớm hơn tiến độ chuẩn"));
    }

    // =========================================================================
    // 3. Hoàn thành muộn
    // =========================================================================
    @Test
    @DisplayName("Case 03: Hoàn thành muộn hơn tiến độ chuẩn CTĐT -> Ghi nhận ghi chú tiến độ muộn")
    void testCase03_CompletedLate_SuggestedSemesterComparison() {
        // IT1001 có suggestedSemester = 1 trong CTĐT, sinh viên học ở kỳ 4 (currentSemester = 4)
        StudentProfileFixture.CourseAttempt a1 = createAttempt("IT1001", "Nhập môn lập trình", 3, "2025_2", "C", 2.0, true);
        StudentProfileFixture student = createStudent("std-test-03", 4, List.of(a1));

        PlanReconciler reconciler = new PlanReconciler(policy, curriculumIt, Map.of("std-test-03", student));
        ReconcileStudyPlanRequest req = new ReconcileStudyPlanRequest("plan-03", "std-test-03", "2025_2", 1, "rev-test");
        ReconcileStudyPlanResponse res = reconciler.reconcileStudyPlan(req);

        assertThat(res.isOnTrack()).isTrue();
        assertThat(res.getCompletedCourses()).anyMatch(c -> c.contains("IT1001") && c.contains("Hoàn thành muộn hơn tiến độ chuẩn"));
    }

    // =========================================================================
    // 4. Trượt môn F
    // =========================================================================
    @Test
    @DisplayName("Case 04: Trượt môn F -> onTrack = false, đưa vào missedOrFailedCourses")
    void testCase04_FailedCourseF_OnTrackFalse() {
        StudentProfileFixture.CourseAttempt a1 = createAttempt("IT1001", "Nhập môn lập trình", 3, "2025_1", "F", 0.0, false);
        StudentProfileFixture student = createStudent("std-test-04", 1, List.of(a1));

        PlanReconciler reconciler = new PlanReconciler(policy, curriculumIt, Map.of("std-test-04", student));
        ReconcileStudyPlanRequest req = new ReconcileStudyPlanRequest("plan-04", "std-test-04", "2025_1", 1, "rev-test");
        ReconcileStudyPlanResponse res = reconciler.reconcileStudyPlan(req);

        assertThat(res.isOnTrack()).isFalse();
        assertThat(res.getMissedOrFailedCourses()).anyMatch(c -> c.contains("IT1001") && c.contains("F"));
        assertThat(res.getAdjustmentsRecommended()).anyMatch(a -> a.contains("IT1001") && a.contains("học lại"));
    }

    // =========================================================================
    // 5. Môn F không có môn phụ thuộc
    // =========================================================================
    @Test
    @DisplayName("Case 05: Môn F không có môn phụ thuộc tiên quyết -> Chỉ đề xuất học lại, không hoãn môn khác")
    void testCase05_FailedCourseF_NoPrerequisiteDependents() {
        // Giả lập môn ELEC99 không phải tiên quyết của môn nào
        CurriculumFixture.CourseDefinitionItem standalone = createCourseDef("ELEC99", "Môn tự do", 2, 2, Collections.emptyList());
        CurriculumFixture customCur = createCustomCurriculum(List.of(standalone));

        StudentProfileFixture.CourseAttempt a1 = createAttempt("ELEC99", "Môn tự do", 2, "2025_1", "F", 0.0, false);
        StudentProfileFixture student = createStudent("std-test-05", 2, List.of(a1));

        PlanReconciler reconciler = new PlanReconciler(policy, customCur, Map.of("std-test-05", student));
        ReconcileStudyPlanRequest req = new ReconcileStudyPlanRequest("plan-05", "std-test-05", "2025_1", 1, "rev-test");
        ReconcileStudyPlanResponse res = reconciler.reconcileStudyPlan(req);

        assertThat(res.isOnTrack()).isFalse();
        assertThat(res.getAdjustmentsRecommended()).anyMatch(a -> a.contains("ELEC99") && a.contains("học lại"));
        assertThat(res.getAdjustmentsRecommended()).noneMatch(a -> a.contains("Hoãn học phần"));
    }

    // =========================================================================
    // 6. Môn F chặn môn tiên quyết trực tiếp
    // =========================================================================
    @Test
    @DisplayName("Case 06: Môn F chặn môn tiên quyết trực tiếp -> Đề xuất hoãn môn bị chặn")
    void testCase06_FailedCourseF_DirectPrerequisiteBlocked() {
        // Trong curriculumIt: IT6001 có prerequisites là MATH1002 và IT1001
        StudentProfileFixture.CourseAttempt a1 = createAttempt("MATH1002", "Toán rời rạc", 3, "2025_1", "F", 0.0, false);
        StudentProfileFixture student = createStudent("std-test-06", 1, List.of(a1));

        PlanReconciler reconciler = new PlanReconciler(policy, curriculumIt, Map.of("std-test-06", student));
        ReconcileStudyPlanRequest req = new ReconcileStudyPlanRequest("plan-06", "std-test-06", "2025_1", 1, "rev-test");
        ReconcileStudyPlanResponse res = reconciler.reconcileStudyPlan(req);

        assertThat(res.isOnTrack()).isFalse();
        assertThat(res.getAdjustmentsRecommended()).anyMatch(a -> a.contains("Hoãn học phần IT6001") && a.contains("MATH1002"));
    }

    // =========================================================================
    // 7. Môn F ảnh hưởng chuỗi phụ thuộc nhiều cấp
    // =========================================================================
    @Test
    @DisplayName("Case 07: Môn F ảnh hưởng chuỗi phụ thuộc nhiều cấp (A -> B -> C) -> Cảnh báo tác động dây chuyền")
    void testCase07_FailedCourseF_MultiLevelDependencyChains() {
        // Xây dựng DAG: COURSE_A -> COURSE_B -> COURSE_C
        CurriculumFixture.CourseDefinitionItem cA = createCourseDef("COURSE_A", "Học phần A", 3, 1, Collections.emptyList());
        CurriculumFixture.CourseDefinitionItem cB = createCourseDef("COURSE_B", "Học phần B", 3, 2, List.of("COURSE_A"));
        CurriculumFixture.CourseDefinitionItem cC = createCourseDef("COURSE_C", "Học phần C", 3, 3, List.of("COURSE_B"));
        CurriculumFixture customCur = createCustomCurriculum(List.of(cA, cB, cC));

        StudentProfileFixture.CourseAttempt a1 = createAttempt("COURSE_A", "Học phần A", 3, "2025_1", "F", 0.0, false);
        StudentProfileFixture student = createStudent("std-test-07", 1, List.of(a1));

        PlanReconciler reconciler = new PlanReconciler(policy, customCur, Map.of("std-test-07", student));
        ReconcileStudyPlanRequest req = new ReconcileStudyPlanRequest("plan-07", "std-test-07", "2025_1", 1, "rev-test");
        ReconcileStudyPlanResponse res = reconciler.reconcileStudyPlan(req);

        assertThat(res.isOnTrack()).isFalse();
        assertThat(res.getAdjustmentsRecommended()).anyMatch(a -> a.contains("COURSE_A -> COURSE_B -> COURSE_C"));
    }

    // =========================================================================
    // 8. Nhiều môn F trong cùng học kỳ
    // =========================================================================
    @Test
    @DisplayName("Case 08: Nhiều môn F trong cùng học kỳ -> Ghi nhận đầy đủ trong missedOrFailedCourses và adjustments")
    void testCase08_MultipleFailedCoursesInSameSemester() {
        StudentProfileFixture.CourseAttempt a1 = createAttempt("MATH1001", "Giải tích 1", 3, "2025_1", "F", 0.0, false);
        StudentProfileFixture.CourseAttempt a2 = createAttempt("IT1001", "Nhập môn lập trình", 3, "2025_1", "F", 0.0, false);
        StudentProfileFixture student = createStudent("std-test-08", 1, List.of(a1, a2));

        PlanReconciler reconciler = new PlanReconciler(policy, curriculumIt, Map.of("std-test-08", student));
        ReconcileStudyPlanRequest req = new ReconcileStudyPlanRequest("plan-08", "std-test-08", "2025_1", 1, "rev-test");
        ReconcileStudyPlanResponse res = reconciler.reconcileStudyPlan(req);

        assertThat(res.isOnTrack()).isFalse();
        assertThat(res.getMissedOrFailedCourses()).hasSize(2);
        assertThat(res.getMissedOrFailedCourses()).anyMatch(c -> c.contains("MATH1001"));
        assertThat(res.getMissedOrFailedCourses()).anyMatch(c -> c.contains("IT1001"));
        assertThat(res.getAdjustmentsRecommended()).anyMatch(a -> a.contains("MATH1001") && a.contains("học lại"));
        assertThat(res.getAdjustmentsRecommended()).anyMatch(a -> a.contains("IT1001") && a.contains("học lại"));
    }

    // =========================================================================
    // 9. Học lại F thành công ở kỳ sau
    // =========================================================================
    @Test
    @DisplayName("Case 09: Học lại F thành công ở kỳ sau -> Kỳ sau onTrack = true, môn chuyển sang completedCourses")
    void testCase09_RetakeFailedCourseSuccessInSubsequentSemester() {
        StudentProfileFixture.CourseAttempt a1 = createAttempt("MATH1002", "Toán rời rạc", 3, "2025_1", "F", 0.0, false);
        StudentProfileFixture.CourseAttempt a2 = createAttempt("MATH1002", "Toán rời rạc", 3, "2025_2", "B", 3.0, true);
        StudentProfileFixture student = createStudent("std-test-09", 2, List.of(a1, a2));

        PlanReconciler reconciler = new PlanReconciler(policy, curriculumIt, Map.of("std-test-09", student));
        ReconcileStudyPlanRequest req = new ReconcileStudyPlanRequest("plan-09", "std-test-09", "2025_2", 1, "rev-test");
        ReconcileStudyPlanResponse res = reconciler.reconcileStudyPlan(req);

        assertThat(res.isOnTrack()).isTrue();
        assertThat(res.getMissedOrFailedCourses()).isEmpty();
        assertThat(res.getCompletedCourses()).anyMatch(c -> c.contains("MATH1002") && c.contains("B"));
    }

    // =========================================================================
    // 10. Môn chưa có kết quả UNKNOWN
    // =========================================================================
    @Test
    @DisplayName("Case 10: Môn chưa có kết quả UNKNOWN -> onTrack = false, đưa vào missedOrFailedCourses kèm cảnh báo theo dõi")
    void testCase10_UnknownGradeStatus() {
        StudentProfileFixture.CourseAttempt a1 = createAttempt("IT1001", "Nhập môn lập trình", 3, "2025_1", "UNKNOWN", 0.0, null);
        StudentProfileFixture student = createStudent("std-test-10", 1, List.of(a1));

        PlanReconciler reconciler = new PlanReconciler(policy, curriculumIt, Map.of("std-test-10", student));
        ReconcileStudyPlanRequest req = new ReconcileStudyPlanRequest("plan-10", "std-test-10", "2025_1", 1, "rev-test");
        ReconcileStudyPlanResponse res = reconciler.reconcileStudyPlan(req);

        assertThat(res.isOnTrack()).isFalse();
        assertThat(res.getMissedOrFailedCourses()).anyMatch(c -> c.contains("IT1001") && c.contains("UNKNOWN"));
        assertThat(res.getAdjustmentsRecommended()).anyMatch(a -> a.contains("IT1001") && a.contains("kết chuyển"));
    }

    // =========================================================================
    // 11. Môn IN_PROGRESS
    // =========================================================================
    @Test
    @DisplayName("Case 11: Môn IN_PROGRESS -> onTrack = false, không tự suy diễn điểm")
    void testCase11_InProgressGradeStatus() {
        StudentProfileFixture.CourseAttempt a1 = createAttempt("IT2001", "Lập trình OOP", 4, "2025_1", "IN_PROGRESS", 0.0, null);
        StudentProfileFixture student = createStudent("std-test-11", 1, List.of(a1));

        PlanReconciler reconciler = new PlanReconciler(policy, curriculumIt, Map.of("std-test-11", student));
        ReconcileStudyPlanRequest req = new ReconcileStudyPlanRequest("plan-11", "std-test-11", "2025_1", 1, "rev-test");
        ReconcileStudyPlanResponse res = reconciler.reconcileStudyPlan(req);

        assertThat(res.isOnTrack()).isFalse();
        assertThat(res.getMissedOrFailedCourses()).anyMatch(c -> c.contains("IT2001"));
    }

    // =========================================================================
    // 12. Sinh viên không tồn tại
    // =========================================================================
    @Test
    @DisplayName("Case 12: Sinh viên không tồn tại -> onTrack = false, cảnh báo hồ sơ không tìm thấy")
    void testCase12_StudentNotFound() {
        PlanReconciler reconciler = new PlanReconciler(policy, curriculumIt, Collections.emptyMap());
        ReconcileStudyPlanRequest req = new ReconcileStudyPlanRequest("plan-12", "std-ghost", "2025_1", 1, "rev-test");
        ReconcileStudyPlanResponse res = reconciler.reconcileStudyPlan(req);

        assertThat(res).isNotNull();
        assertThat(res.isOnTrack()).isFalse();
        assertThat(res.getAdjustmentsRecommended()).anyMatch(a -> a.contains("Không tìm thấy hồ sơ sinh viên"));
        assertThat(res.getCompletedCourses()).isEmpty();
        assertThat(res.getMissedOrFailedCourses()).isEmpty();
    }

    // =========================================================================
    // 13. Học kỳ không tồn tại
    // =========================================================================
    @Test
    @DisplayName("Case 13: Học kỳ không tồn tại trong lịch sử -> onTrack = false, cảnh báo rõ ràng")
    void testCase13_CompletedSemesterNotFound() {
        StudentProfileFixture.CourseAttempt a1 = createAttempt("IT1001", "Nhập môn lập trình", 3, "2024_1", "B", 3.0, true);
        StudentProfileFixture student = createStudent("std-test-13", 2, List.of(a1));

        PlanReconciler reconciler = new PlanReconciler(policy, curriculumIt, Map.of("std-test-13", student));
        ReconcileStudyPlanRequest req = new ReconcileStudyPlanRequest("plan-13", "std-test-13", "2099_1", 1, "rev-test");
        ReconcileStudyPlanResponse res = reconciler.reconcileStudyPlan(req);

        assertThat(res.isOnTrack()).isFalse();
        assertThat(res.getAdjustmentsRecommended()).anyMatch(a -> a.contains("Không tìm thấy kết quả học tập") && a.contains("2099_1"));
    }

    // =========================================================================
    // 14. Kế hoạch học tập không tồn tại
    // =========================================================================
    @Test
    @DisplayName("Case 14: Kế hoạch không tồn tại trong registry -> Đối chiếu trực tiếp trên lịch sử thực tế")
    void testCase14_PlanNotFound_FallbackToActualAttempts() {
        StudentProfileFixture.CourseAttempt a1 = createAttempt("IT1001", "Nhập môn lập trình", 3, "2025_1", "B", 3.0, true);
        StudentProfileFixture student = createStudent("std-test-14", 1, List.of(a1));

        PlanReconciler reconciler = new PlanReconciler(policy, curriculumIt, Map.of("std-test-14", student));
        ReconcileStudyPlanRequest req = new ReconcileStudyPlanRequest("plan-non-existent", "std-test-14", "2025_1", 1, "rev-test");
        ReconcileStudyPlanResponse res = reconciler.reconcileStudyPlan(req);

        assertThat(res.isOnTrack()).isTrue();
        assertThat(res.getCompletedCourses()).anyMatch(c -> c.contains("IT1001") && c.contains("B"));
    }

    // =========================================================================
    // 15. CourseAttempts rỗng
    // =========================================================================
    @Test
    @DisplayName("Case 15: CourseAttempts rỗng -> onTrack = false, thông báo sinh viên chưa có lịch sử học tập")
    void testCase15_EmptyCourseAttempts() {
        StudentProfileFixture student = createStudent("std-test-15", 1, Collections.emptyList());

        PlanReconciler reconciler = new PlanReconciler(policy, curriculumIt, Map.of("std-test-15", student));
        ReconcileStudyPlanRequest req = new ReconcileStudyPlanRequest("plan-15", "std-test-15", "2025_1", 1, "rev-test");
        ReconcileStudyPlanResponse res = reconciler.reconcileStudyPlan(req);

        assertThat(res.isOnTrack()).isFalse();
        assertThat(res.getAdjustmentsRecommended()).anyMatch(a -> a.contains("chưa có bất kỳ lịch sử học tập"));
    }

    // =========================================================================
    // 16. Dữ liệu CTĐT thiếu
    // =========================================================================
    @Test
    @DisplayName("Case 16: Dữ liệu CTĐT thiếu -> Không crash NPE, vẫn đối chiếu theo lịch sử học tập")
    void testCase16_MissingCurriculumData() {
        StudentProfileFixture.CourseAttempt a1 = createAttempt("CODE_X", "Tên môn X", 3, "2025_1", "A", 4.0, true);
        StudentProfileFixture student = createStudent("std-test-16", 1, List.of(a1));

        PlanReconciler reconciler = new PlanReconciler(policy, null, Map.of("std-test-16", student));
        ReconcileStudyPlanRequest req = new ReconcileStudyPlanRequest("plan-16", "std-test-16", "2025_1", 1, "rev-test");
        ReconcileStudyPlanResponse res = reconciler.reconcileStudyPlan(req);

        assertThat(res).isNotNull();
        assertThat(res.isOnTrack()).isTrue();
        assertThat(res.getCompletedCourses()).anyMatch(c -> c.contains("CODE_X") && c.contains("A"));
    }

    // =========================================================================
    // 17. Không làm thay đổi dữ liệu hồ sơ gốc (Immutability)
    // =========================================================================
    @Test
    @DisplayName("Case 17: Không làm biến đổi dữ liệu hồ sơ gốc (Immutability)")
    void testCase17_Immutability_OriginalProfileUnchanged() {
        StudentProfileFixture.CourseAttempt a1 = createAttempt("IT1001", "Nhập môn lập trình", 3, "2025_1", "B", 3.0, true);
        StudentProfileFixture student = createStudent("std-test-17", 1, new ArrayList<>(List.of(a1)));

        PlanReconciler reconciler = new PlanReconciler(policy, curriculumIt, Map.of("std-test-17", student));
        ReconcileStudyPlanRequest req = new ReconcileStudyPlanRequest("plan-17", "std-test-17", "2025_1", 1, "rev-test");

        reconciler.reconcileStudyPlan(req);

        assertThat(student.getCourseAttempts()).hasSize(1);
        assertThat(student.getCourseAttempts().get(0).getCourseCode()).isEqualTo("IT1001");
        assertThat(student.getCourseAttempts().get(0).getLetterGrade()).isEqualTo("B");
    }

    // =========================================================================
    // 18. Không tạo trùng môn trong danh sách điều chỉnh (Deduplication)
    // =========================================================================
    @Test
    @DisplayName("Case 18: Không tạo trùng thông điệp trong adjustmentsRecommended (Deduplication)")
    void testCase18_DeduplicationOfAdjustments() {
        // Sinh viên nợ MATH1002 và có nhiều lần F
        StudentProfileFixture.CourseAttempt a1 = createAttempt("MATH1002", "Toán rời rạc", 3, "2025_1", "F", 0.0, false);
        StudentProfileFixture.CourseAttempt a2 = createAttempt("MATH1002", "Toán rời rạc", 3, "2025_1", "F", 0.0, false);
        StudentProfileFixture student = createStudent("std-test-18", 1, List.of(a1, a2));

        PlanReconciler reconciler = new PlanReconciler(policy, curriculumIt, Map.of("std-test-18", student));
        ReconcileStudyPlanRequest req = new ReconcileStudyPlanRequest("plan-18", "std-test-18", "2025_1", 1, "rev-test");
        ReconcileStudyPlanResponse res = reconciler.reconcileStudyPlan(req);

        long countMathRetake = res.getAdjustmentsRecommended().stream()
                .filter(a -> a.contains("Bổ sung học lại môn nợ MATH1002"))
                .count();
        assertThat(countMathRetake).isEqualTo(1);
    }

    // =========================================================================
    // 19. Kết quả có thứ tự tất định (Deterministic ordering)
    // =========================================================================
    @Test
    @DisplayName("Case 19: Kết quả completedCourses và missedOrFailedCourses có thứ tự tất định (A-Z)")
    void testCase19_DeterministicOrdering() {
        StudentProfileFixture.CourseAttempt a1 = createAttempt("IT2001", "Lập trình OOP", 4, "2025_1", "A", 4.0, true);
        StudentProfileFixture.CourseAttempt a2 = createAttempt("BS6002", "Giải tích", 3, "2025_1", "B", 3.0, true);
        StudentProfileFixture.CourseAttempt a3 = createAttempt("AA1001", "Đại số", 3, "2025_1", "A", 4.0, true);
        StudentProfileFixture student = createStudent("std-test-19", 1, List.of(a1, a2, a3));

        PlanReconciler reconciler = new PlanReconciler(policy, curriculumIt, Map.of("std-test-19", student));
        ReconcileStudyPlanRequest req = new ReconcileStudyPlanRequest("plan-19", "std-test-19", "2025_1", 1, "rev-test");
        ReconcileStudyPlanResponse res = reconciler.reconcileStudyPlan(req);

        assertThat(res.getCompletedCourses()).hasSize(3);
        assertThat(res.getCompletedCourses().get(0)).startsWith("AA1001");
        assertThat(res.getCompletedCourses().get(1)).startsWith("BS6002");
        assertThat(res.getCompletedCourses().get(2)).startsWith("IT2001");
    }

    // =========================================================================
    // 20. Response khớp contract và tích hợp Facade
    // =========================================================================
    @Test
    @DisplayName("Case 20: Response khớp contract DTO và tích hợp hoàn chỉnh qua DefaultAcademicFacade")
    void testCase20_ResponseContractConformanceAndFacadeIntegration() {
        ReconcileStudyPlanRequest req = new ReconcileStudyPlanRequest(
                "plan-2024604757-v1", "2024604757", "2024_2", 1, "rev-ktpm-v1"
        );
        ReconcileStudyPlanResponse res = academicFacade.reconcileStudyPlan(req);

        assertThat(res).isNotNull();
        assertThat(res.getPlanId()).isEqualTo("plan-2024604757-v1");
        assertThat(res.getStudentId()).isEqualTo("2024604757");
        assertThat(res.isOnTrack()).isFalse();
        assertThat(res.getMissedOrFailedCourses()).anyMatch(c -> c.contains("LP6004"));
        assertThat(res.getAdjustmentsRecommended()).anyMatch(a -> a.contains("LP6004") && a.contains("học lại"));
        assertThat(res.getPlanVersion()).isEqualTo(1);
        assertThat(res.getDataRevision()).isNotNull();
    }
}
