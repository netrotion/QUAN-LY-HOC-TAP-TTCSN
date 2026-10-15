package vn.haui.advisor.academic;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.academic.engine.GradeSimulator;
import vn.haui.advisor.academic.fixture.AcademicFixtures;
import vn.haui.advisor.academic.model.CurriculumFixture;
import vn.haui.advisor.academic.model.PolicyDemo;
import vn.haui.advisor.academic.model.StudentProfileFixture;
import vn.haui.advisor.academic.service.DefaultAcademicFacade;
import vn.haui.advisor.contracts.dto.CalculateTargetGradesRequest;
import vn.haui.advisor.contracts.dto.CalculateTargetGradesResponse;
import vn.haui.advisor.contracts.dto.RankRetakeCoursesRequest;
import vn.haui.advisor.contracts.dto.RankRetakeCoursesResponse;
import vn.haui.advisor.contracts.dto.RetakeCourseRecommendation;
import vn.haui.advisor.contracts.dto.SimulateGradesRequest;
import vn.haui.advisor.contracts.dto.SimulateGradesResponse;
import vn.haui.advisor.contracts.dto.SimulatedCourseGrade;
import vn.haui.advisor.contracts.dto.TargetCourseGradeRequirement;
import vn.haui.advisor.contracts.ports.AcademicFacade;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Task 3.11 Stages 1, 2 & 3: GradeSimulator Test Suite")
public class GradeSimulatorTest {

    private AcademicFacade academicFacade;
    private PolicyDemo policy;
    private Map<String, StudentProfileFixture> profiles;

    @BeforeEach
    void setUp() {
        policy = AcademicFixtures.getPolicyDemo();
        profiles = AcademicFixtures.getStudentProfiles();
        academicFacade = new DefaultAcademicFacade(policy, AcademicFixtures.getCurriculumV1(), profiles);
    }

    private StudentProfileFixture createSampleStudent(String id, BigDecimal cpa, int credits, List<StudentProfileFixture.CourseAttempt> attempts) {
        StudentProfileFixture p = new StudentProfileFixture();
        p.setStudentId(id);
        p.setCpa(cpa);
        p.setAccumulatedCredits((double) credits);
        p.setCourseAttempts(attempts != null ? new ArrayList<>(attempts) : new ArrayList<>());
        return p;
    }

    private StudentProfileFixture.CourseAttempt createAttempt(String code, String name, int credits, String grade, double pts, boolean passed) {
        StudentProfileFixture.CourseAttempt a = new StudentProfileFixture.CourseAttempt();
        a.setCourseCode(code);
        a.setCourseName(name);
        a.setCredits((double) credits);
        a.setLetterGrade(grade);
        a.setGradePoint4(pts);
        a.setPassed(passed);
        return a;
    }

    private CurriculumFixture.CourseDefinitionItem createCourseDef(String code, String name, int credits, int sem) {
        CurriculumFixture.CourseDefinitionItem c = new CurriculumFixture.CourseDefinitionItem();
        c.setCourseCode(code);
        c.setCourseName(name);
        c.setCredits((double) credits);
        c.setSuggestedSemester(sem);
        return c;
    }

    private CurriculumFixture createCurriculum(String id, int totalCredits, List<CurriculumFixture.CourseDefinitionItem> courses) {
        CurriculumFixture cur = new CurriculumFixture();
        cur.setCurriculumId(id);
        cur.setTotalCredits(totalCredits);
        cur.setCourses(courses != null ? new ArrayList<>(courses) : new ArrayList<>());
        return cur;
    }

    @Test
    @DisplayName("Case 1: Mô phỏng môn học mới -> Tín chỉ mới được cộng vào và CPA tăng theo trọng số")
    void testSimulateGrades_NewCourse_AddsCreditsAndWeightedPoints() {
        // Sinh viên có 60 TC, CPA 2.00. Mô phỏng học môn mới 3 TC đạt A (4.0)
        // CPA mới: (2.00 * 60 + 4.0 * 3) / (60 + 3) = (120.0 + 12.0) / 63 = 132.0 / 63 = 2.10
        StudentProfileFixture student = createSampleStudent("std-new-course", new BigDecimal("2.00"), 60, Collections.emptyList());
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-new-course", student));

        List<SimulatedCourseGrade> courses = List.of(
                new SimulatedCourseGrade("NEW101", 3, "A", new BigDecimal("4.0"))
        );
        SimulateGradesRequest req = new SimulateGradesRequest("std-new-course", courses, "rev-test");
        SimulateGradesResponse res = simulator.simulateGrades(req);

        assertThat(res).isNotNull();
        assertThat(res.getCurrentCpa()).isEqualByComparingTo(new BigDecimal("2.00"));
        assertThat(res.getExpectedGpa()).isEqualByComparingTo(new BigDecimal("4.00"));
        assertThat(res.getProjectedCpa()).isEqualByComparingTo(new BigDecimal("2.10"));
        assertThat(res.getCpaDelta()).isEqualByComparingTo(new BigDecimal("0.10"));
    }

    @Test
    @DisplayName("Case 2: Học cải thiện từ D lên A -> Điểm mới thay thế điểm cũ, tín chỉ KHÔNG cộng trùng")
    void testSimulateGrades_ImprovementRetake_D_to_A() {
        // Sinh viên có 60 TC, CPA 2.00. Trong đó có môn RET_D (3 TC, điểm D = 1.0)
        // Giả lập cải thiện môn RET_D lên điểm A (4.0):
        // Tử số tăng: (4.0 - 1.0) * 3 = 9.0
        // Mẫu số tín chỉ KHÔNG đổi: 60 TC (không cộng trùng)
        // CPA mới: (2.00 * 60 + 9.0) / 60 = 129.0 / 60 = 2.15
        StudentProfileFixture.CourseAttempt attemptD = createAttempt("RET_D", "Môn điểm D", 3, "D", 1.0, true);
        StudentProfileFixture student = createSampleStudent("std-retake-d", new BigDecimal("2.00"), 60, List.of(attemptD));
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-retake-d", student));

        List<SimulatedCourseGrade> courses = List.of(
                new SimulatedCourseGrade("RET_D", 3, "A", new BigDecimal("4.0"))
        );
        SimulateGradesRequest req = new SimulateGradesRequest("std-retake-d", courses, "rev-test");
        SimulateGradesResponse res = simulator.simulateGrades(req);

        assertThat(res).isNotNull();
        assertThat(res.getCurrentCpa()).isEqualByComparingTo(new BigDecimal("2.00"));
        assertThat(res.getProjectedCpa()).isEqualByComparingTo(new BigDecimal("2.15"));
        assertThat(res.getCpaDelta()).isEqualByComparingTo(new BigDecimal("0.15"));
    }

    @Test
    @DisplayName("Case 3: Học cải thiện từ C lên B -> Điểm mới thay thế điểm cũ, tín chỉ KHÔNG cộng trùng")
    void testSimulateGrades_ImprovementRetake_C_to_B() {
        // Sinh viên có 50 TC, CPA 2.50. Trong đó có môn RET_C (2 TC, điểm C = 2.0)
        // Giả lập cải thiện môn RET_C lên điểm B (3.0):
        // Tử số tăng: (3.0 - 2.0) * 2 = 2.0
        // Mẫu số: 50 TC
        // CPA mới: (2.50 * 50 + 2.0) / 50 = (125.0 + 2.0) / 50 = 127.0 / 50 = 2.54
        StudentProfileFixture.CourseAttempt attemptC = createAttempt("RET_C", "Môn điểm C", 2, "C", 2.0, true);
        StudentProfileFixture student = createSampleStudent("std-retake-c", new BigDecimal("2.50"), 50, List.of(attemptC));
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-retake-c", student));

        List<SimulatedCourseGrade> courses = List.of(
                new SimulatedCourseGrade("RET_C", 2, "B", new BigDecimal("3.0"))
        );
        SimulateGradesRequest req = new SimulateGradesRequest("std-retake-c", courses, "rev-test");
        SimulateGradesResponse res = simulator.simulateGrades(req);

        assertThat(res).isNotNull();
        assertThat(res.getProjectedCpa()).isEqualByComparingTo(new BigDecimal("2.54"));
        assertThat(res.getCpaDelta()).isEqualByComparingTo(new BigDecimal("0.04"));
    }

    @Test
    @DisplayName("Case 4: Học lại môn F thành môn đạt (B) -> Điểm mới thay thế 0.0, mẫu số CPA không cộng trùng")
    void testSimulateGrades_FailedRetake_F_to_Passing() {
        // Sinh viên có 60 TC (mẫu số tính CPA), CPA 2.00. Trong đó có môn FAIL_01 (3 TC, điểm F = 0.0, passed = false)
        // Giả lập học lại môn FAIL_01 đạt B (3.0):
        // Tử số tăng: (3.0 - 0.0) * 3 = 9.0
        // Mẫu số CPA giữ nguyên 60 TC (môn đã nằm trong mẫu số kỳ trước)
        // CPA mới: (2.00 * 60 + 9.0) / 60 = 129.0 / 60 = 2.15
        StudentProfileFixture.CourseAttempt attemptF = createAttempt("FAIL_01", "Môn nợ F", 3, "F", 0.0, false);
        StudentProfileFixture student = createSampleStudent("std-retake-f", new BigDecimal("2.00"), 60, List.of(attemptF));
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-retake-f", student));

        List<SimulatedCourseGrade> courses = List.of(
                new SimulatedCourseGrade("FAIL_01", 3, "B", new BigDecimal("3.0"))
        );
        SimulateGradesRequest req = new SimulateGradesRequest("std-retake-f", courses, "rev-test");
        SimulateGradesResponse res = simulator.simulateGrades(req);

        assertThat(res).isNotNull();
        assertThat(res.getProjectedCpa()).isEqualByComparingTo(new BigDecimal("2.15"));
        assertThat(res.getCpaDelta()).isEqualByComparingTo(new BigDecimal("0.15"));
    }

    @Test
    @DisplayName("Case 5: Nhiều lần học cùng mã môn trong quá khứ -> Thay thế lần học có điểm cao nhất")
    void testSimulateGrades_MultipleAttemptsInHistory_ReplacesBestGrade() {
        // Sinh viên học môn MULTI_01 hai lần: lần 1 điểm D (1.0), lần 2 điểm C (2.0). Điểm cao nhất hiện tại là C (2.0).
        // Khi giả lập học lên A (4.0):
        // Chênh lệch điểm là (4.0 - 2.0) = +2.0 (so với điểm C cao nhất, KHÔNG so với điểm D lần 1)
        // Với 3 TC: tử số tăng 2.0 * 3 = 6.0 trên tổng 60 TC
        // CPA mới: (2.00 * 60 + 6.0) / 60 = 126.0 / 60 = 2.10
        StudentProfileFixture.CourseAttempt attempt1 = createAttempt("MULTI_01", "Môn học nhiều lần", 3, "D", 1.0, true);
        StudentProfileFixture.CourseAttempt attempt2 = createAttempt("MULTI_01", "Môn học nhiều lần", 3, "C", 2.0, true);
        StudentProfileFixture student = createSampleStudent("std-multi-attempt", new BigDecimal("2.00"), 60, List.of(attempt1, attempt2));
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-multi-attempt", student));

        List<SimulatedCourseGrade> courses = List.of(
                new SimulatedCourseGrade("MULTI_01", 3, "A", new BigDecimal("4.0"))
        );
        SimulateGradesRequest req = new SimulateGradesRequest("std-multi-attempt", courses, "rev-test");
        SimulateGradesResponse res = simulator.simulateGrades(req);

        assertThat(res).isNotNull();
        assertThat(res.getProjectedCpa()).isEqualByComparingTo(new BigDecimal("2.10"));
        assertThat(res.getCpaDelta()).isEqualByComparingTo(new BigDecimal("0.10"));
    }

    @Test
    @DisplayName("Case 6: Mô phỏng nhiều môn kết hợp (1 môn mới + 1 môn cải thiện D->A + 1 môn nợ F->B)")
    void testSimulateGrades_MultipleCourses_MixedNewAndRetake() {
        // Sinh viên 60 TC, CPA 2.00:
        // - RET_D (3 TC, điểm D = 1.0)
        // - FAIL_F (3 TC, điểm F = 0.0)
        // Mô phỏng:
        // 1. Môn mới NEW_01 (3 TC, điểm A = 4.0) -> +12.0 điểm, mẫu số +3 TC
        // 2. RET_D cải thiện lên A (4.0) -> +(4.0 - 1.0)*3 = +9.0 điểm, mẫu số +0 TC
        // 3. FAIL_F học lại lên B (3.0) -> +(3.0 - 0.0)*3 = +9.0 điểm, mẫu số +0 TC
        // Tổng tử số tăng: 12.0 + 9.0 + 9.0 = 30.0
        // Tổng mẫu số CPA mới: 60 + 3 = 63 TC
        // CPA mới: (2.00 * 60 + 30.0) / 63 = 150.0 / 63 = 2.3809 -> 2.38
        StudentProfileFixture.CourseAttempt aD = createAttempt("RET_D", "Môn D", 3, "D", 1.0, true);
        StudentProfileFixture.CourseAttempt aF = createAttempt("FAIL_F", "Môn F", 3, "F", 0.0, false);
        StudentProfileFixture student = createSampleStudent("std-mixed", new BigDecimal("2.00"), 60, List.of(aD, aF));
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-mixed", student));

        List<SimulatedCourseGrade> courses = List.of(
                new SimulatedCourseGrade("NEW_01", 3, "A", new BigDecimal("4.0")),
                new SimulatedCourseGrade("RET_D", 3, "A", new BigDecimal("4.0")),
                new SimulatedCourseGrade("FAIL_F", 3, "B", new BigDecimal("3.0"))
        );
        SimulateGradesRequest req = new SimulateGradesRequest("std-mixed", courses, "rev-test");
        SimulateGradesResponse res = simulator.simulateGrades(req);

        assertThat(res).isNotNull();
        // GPA học kỳ dự kiến của 3 môn (4.0*3 + 4.0*3 + 3.0*3) / 9 = 33.0 / 9 = 3.67
        assertThat(res.getExpectedGpa()).isEqualByComparingTo(new BigDecimal("3.67"));
        assertThat(res.getProjectedCpa()).isEqualByComparingTo(new BigDecimal("2.38"));
        assertThat(res.getCpaDelta()).isEqualByComparingTo(new BigDecimal("0.38"));
    }

    @Test
    @DisplayName("Case 7: Xác minh không cộng trùng tín chỉ khi học cải thiện")
    void testSimulateGrades_NoDuplicateCredits_WhenRetaking() {
        // Sinh viên 30 TC, CPA 2.00. Môn RET_3TC (3 TC, điểm D = 1.0)
        // Nếu cộng trùng tín chỉ: mẫu số sẽ thành 33 TC -> CPA sai: (60 + 9) / 33 = 2.09
        // Không cộng trùng: mẫu số giữ nguyên 30 TC -> CPA đúng: (60 + 9) / 30 = 2.30
        StudentProfileFixture.CourseAttempt a = createAttempt("RET_3TC", "Môn 3 TC", 3, "D", 1.0, true);
        StudentProfileFixture student = createSampleStudent("std-no-dup", new BigDecimal("2.00"), 30, List.of(a));
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-no-dup", student));

        List<SimulatedCourseGrade> courses = List.of(
                new SimulatedCourseGrade("RET_3TC", 3, "A", new BigDecimal("4.0"))
        );
        SimulateGradesRequest req = new SimulateGradesRequest("std-no-dup", courses, "rev-test");
        SimulateGradesResponse res = simulator.simulateGrades(req);

        assertThat(res.getProjectedCpa()).isEqualByComparingTo(new BigDecimal("2.30"));
        assertThat(res.getProjectedCpa()).isNotEqualByComparingTo(new BigDecimal("2.09"));
    }

    @Test
    @DisplayName("Case 8: Điểm đầu vào không hợp lệ hoặc thiếu -> Bỏ qua an toàn, không tự gán 0")
    void testSimulateGrades_InvalidInputGrade_IgnoredGracefully() {
        StudentProfileFixture student = createSampleStudent("std-invalid-input", new BigDecimal("2.50"), 40, Collections.emptyList());
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-invalid-input", student));

        List<SimulatedCourseGrade> courses = List.of(
                new SimulatedCourseGrade("VALID_01", 3, "A", new BigDecimal("4.0")),
                new SimulatedCourseGrade("INVALID_01", 3, "XYZ", null),
                new SimulatedCourseGrade("NULL_01", 3, null, null)
        );
        SimulateGradesRequest req = new SimulateGradesRequest("std-invalid-input", courses, "rev-test");
        SimulateGradesResponse res = simulator.simulateGrades(req);

        // Chỉ tính môn VALID_01 (3 TC, 4.0), bỏ qua 2 môn không hợp lệ
        // Expected GPA: 4.00
        // CPA mới: (2.50 * 40 + 4.0 * 3) / 43 = (100.0 + 12.0) / 43 = 112.0 / 43 = 2.60
        assertThat(res.getExpectedGpa()).isEqualByComparingTo(new BigDecimal("4.00"));
        assertThat(res.getProjectedCpa()).isEqualByComparingTo(new BigDecimal("2.60"));
    }

    @Test
    @DisplayName("Case 9: Sinh viên không tồn tại trong fixture -> Trả về null cho điểm sinh viên, không bịa 2.45")
    void testSimulateGrades_NonExistentStudent_HandledGracefully() {
        GradeSimulator simulator = new GradeSimulator(policy, Collections.emptyMap());

        List<SimulatedCourseGrade> courses = List.of(
                new SimulatedCourseGrade("IT1001", 3, "A", new BigDecimal("4.0"))
        );
        SimulateGradesRequest req = new SimulateGradesRequest("non-existent-id", courses, "rev-test");
        SimulateGradesResponse res = simulator.simulateGrades(req);

        assertThat(res).isNotNull();
        assertThat(res.getStudentId()).isEqualTo("non-existent-id");
        assertThat(res.getCurrentCpa()).isNull();
        assertThat(res.getProjectedCpa()).isNull();
        assertThat(res.getCpaDelta()).isNull();
        // GPA của các môn giả lập vẫn được tính toán độc lập
        assertThat(res.getExpectedGpa()).isEqualByComparingTo(new BigDecimal("4.00"));
    }

    @Test
    @DisplayName("Case 10: Dữ liệu GPA/CPA ban đầu bị thiếu -> Xử lý nghiêm ngặt theo Missing Data Policy")
    void testSimulateGrades_MissingGpaCpaData_HandledStrictly() {
        // Sinh viên mới có profile nhưng cpa = null và attempts rỗng
        StudentProfileFixture student = new StudentProfileFixture();
        student.setStudentId("std-newbie");
        student.setCpa(null);
        student.setAccumulatedCredits(0.0);
        student.setCourseAttempts(Collections.emptyList());

        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-newbie", student));

        List<SimulatedCourseGrade> courses = List.of(
                new SimulatedCourseGrade("IT1001", 3, "A", new BigDecimal("4.0"))
        );
        SimulateGradesRequest req = new SimulateGradesRequest("std-newbie", courses, "rev-test");
        SimulateGradesResponse res = simulator.simulateGrades(req);

        assertThat(res.getCurrentCpa()).isNull();
        assertThat(res.getExpectedGpa()).isEqualByComparingTo(new BigDecimal("4.00"));
        // Với sinh viên chưa có tín chỉ và CPA, projectedCpa phản ánh chính GPA của các môn đầu tiên
        assertThat(res.getProjectedCpa()).isEqualByComparingTo(new BigDecimal("4.00"));
    }

    @Test
    @DisplayName("Case 11: Bảng điểm gốc và hồ sơ sinh viên KHÔNG bị thay đổi sau mô phỏng")
    void testSimulateGrades_DoesNotMutateOriginalProfileOrAttempts() {
        StudentProfileFixture.CourseAttempt originalAttempt = createAttempt("ORIG_01", "Môn gốc", 3, "D", 1.0, true);
        List<StudentProfileFixture.CourseAttempt> attempts = new ArrayList<>(List.of(originalAttempt));
        StudentProfileFixture student = createSampleStudent("std-immutability", new BigDecimal("2.00"), 30, attempts);

        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-immutability", student));

        List<SimulatedCourseGrade> courses = List.of(
                new SimulatedCourseGrade("ORIG_01", 3, "A", new BigDecimal("4.0")),
                new SimulatedCourseGrade("NEW_02", 3, "B", new BigDecimal("3.0"))
        );
        SimulateGradesRequest req = new SimulateGradesRequest("std-immutability", courses, "rev-test");
        simulator.simulateGrades(req);

        // Xác minh hồ sơ sinh viên và lần học gốc không bị biến đổi
        assertThat(student.getCpa()).isEqualByComparingTo(new BigDecimal("2.00"));
        assertThat(student.getAccumulatedCredits()).isEqualTo(30);
        assertThat(student.getCourseAttempts()).hasSize(1);
        assertThat(student.getCourseAttempts().get(0).getLetterGrade()).isEqualTo("D");
        assertThat(student.getCourseAttempts().get(0).getGradePoint4()).isEqualTo(1.0);
    }

    @Test
    @DisplayName("Case 12: Kết quả khớp hoàn toàn response contract và tích hợp qua DefaultAcademicFacade")
    void testSimulateGrades_MatchesContractResponseAndFacadeIntegration() {
        // Kiểm tra tích hợp qua academicFacade với sinh viên thực 2024604757
        List<SimulatedCourseGrade> simCourses = List.of(
                new SimulatedCourseGrade("LP6010", 3, "A", new BigDecimal("4.0")) // LP6010 là môn điểm D+ (1.5) của sinh viên này
        );
        SimulateGradesRequest req = new SimulateGradesRequest("2024604757", simCourses, "rev-ktpm-v1");
        SimulateGradesResponse res = academicFacade.simulateGrades(req);

        assertThat(res).isNotNull();
        assertThat(res.getStudentId()).isEqualTo("2024604757");
        assertThat(res.getCurrentCpa()).isEqualByComparingTo(new BigDecimal("3.18"));
        assertThat(res.getDataRevision()).isEqualTo("rev-ktpm-v1");
        assertThat(res.getExpectedGpa()).isEqualByComparingTo(new BigDecimal("4.00"));
        // Cải thiện LP6010 (3 TC) từ 1.5 lên 4.0:
        // Điểm tăng: (4.0 - 1.5) * 3 = 7.5
        // Tín chỉ CPA không tăng (61 TC)
        // CPA mới: (3.18 * 61 + 7.5) / 61 = (193.98 + 7.5) / 61 = 201.48 / 61 = 3.3029 -> 3.30
        assertThat(res.getProjectedCpa()).isEqualByComparingTo(new BigDecimal("3.30"));
        assertThat(res.getCpaDelta()).isEqualByComparingTo(new BigDecimal("0.12"));
    }

    // =========================================================================
    // GIAI ĐOẠN 2: rankRetakeCourses Test Cases (BR-06, FR-14, US-11)
    // =========================================================================

    @Test
    @DisplayName("Case 13: Môn điểm D (1.0) đủ điều kiện đề xuất học cải thiện theo BR-06")
    void testRankRetakeCourses_EligibleGrade_D() {
        StudentProfileFixture.CourseAttempt attemptD = createAttempt("MATH1001", "Giải tích 1", 3, "D", 1.0, true);
        StudentProfileFixture student = createSampleStudent("std-d", new BigDecimal("2.00"), 60, List.of(attemptD));
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-d", student));

        RankRetakeCoursesRequest req = new RankRetakeCoursesRequest("std-d", null, "rev-test");
        RankRetakeCoursesResponse res = simulator.rankRetakeCourses(req);

        assertThat(res).isNotNull();
        assertThat(res.getRecommendations()).hasSize(1);
        RetakeCourseRecommendation rec = res.getRecommendations().get(0);
        assertThat(rec.getCourseCode()).isEqualTo("MATH1001");
        assertThat(rec.getCurrentGrade()).isEqualTo("D");
        assertThat(rec.getCurrentGradePoints()).isEqualByComparingTo(new BigDecimal("1.0"));
        assertThat(rec.getTargetGrade()).isEqualTo("A");
        assertThat(rec.getTargetGradePoints()).isEqualByComparingTo(new BigDecimal("4.0"));
        // delta = (4.0 - 1.0) * 3 / 60 = 9.0 / 60 = 0.15
        assertThat(rec.getCpaDelta()).isEqualByComparingTo(new BigDecimal("0.15"));
        assertThat(rec.getRank()).isEqualTo(1);
        assertThat(rec.getRationale()).contains("D").contains("A");
    }

    @Test
    @DisplayName("Case 14: Môn điểm D+ (1.5) đủ điều kiện đề xuất học cải thiện theo BR-06")
    void testRankRetakeCourses_EligibleGrade_DPlus() {
        StudentProfileFixture.CourseAttempt attemptDPlus = createAttempt("IT2001", "Lập trình OOP", 4, "D+", 1.5, true);
        StudentProfileFixture student = createSampleStudent("std-dplus", new BigDecimal("2.00"), 60, List.of(attemptDPlus));
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-dplus", student));

        RankRetakeCoursesRequest req = new RankRetakeCoursesRequest("std-dplus", 5, "rev-test");
        RankRetakeCoursesResponse res = simulator.rankRetakeCourses(req);

        assertThat(res).isNotNull();
        assertThat(res.getRecommendations()).hasSize(1);
        RetakeCourseRecommendation rec = res.getRecommendations().get(0);
        assertThat(rec.getCourseCode()).isEqualTo("IT2001");
        assertThat(rec.getCurrentGrade()).isEqualTo("D+");
        assertThat(rec.getCurrentGradePoints()).isEqualByComparingTo(new BigDecimal("1.5"));
        // delta = (4.0 - 1.5) * 4 / 60 = 10.0 / 60 = 0.1666... -> 0.17
        assertThat(rec.getCpaDelta()).isEqualByComparingTo(new BigDecimal("0.17"));
        assertThat(rec.getRank()).isEqualTo(1);
    }

    @Test
    @DisplayName("Case 15: Môn điểm C (2.0) đủ điều kiện đề xuất học cải thiện theo BR-06")
    void testRankRetakeCourses_EligibleGrade_C() {
        StudentProfileFixture.CourseAttempt attemptC = createAttempt("PHY1001", "Vật lý đại cương", 3, "C", 2.0, true);
        StudentProfileFixture student = createSampleStudent("std-c", new BigDecimal("2.00"), 60, List.of(attemptC));
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-c", student));

        RankRetakeCoursesRequest req = new RankRetakeCoursesRequest("std-c", 5, "rev-test");
        RankRetakeCoursesResponse res = simulator.rankRetakeCourses(req);

        assertThat(res).isNotNull();
        assertThat(res.getRecommendations()).hasSize(1);
        RetakeCourseRecommendation rec = res.getRecommendations().get(0);
        assertThat(rec.getCourseCode()).isEqualTo("PHY1001");
        assertThat(rec.getCurrentGrade()).isEqualTo("C");
        assertThat(rec.getCurrentGradePoints()).isEqualByComparingTo(new BigDecimal("2.0"));
        // delta = (4.0 - 2.0) * 3 / 60 = 6.0 / 60 = 0.10
        assertThat(rec.getCpaDelta()).isEqualByComparingTo(new BigDecimal("0.10"));
        assertThat(rec.getRank()).isEqualTo(1);
    }

    @Test
    @DisplayName("Case 16: Môn điểm A, B+, B, C+ không được đề xuất theo BR-06")
    void testRankRetakeCourses_IneligibleGrades_Excluded() {
        List<StudentProfileFixture.CourseAttempt> attempts = List.of(
                createAttempt("SUB_A", "Môn A", 3, "A", 4.0, true),
                createAttempt("SUB_BP", "Môn B+", 3, "B+", 3.5, true),
                createAttempt("SUB_B", "Môn B", 3, "B", 3.0, true),
                createAttempt("SUB_CP", "Môn C+", 3, "C+", 2.5, true)
        );
        StudentProfileFixture student = createSampleStudent("std-ineligible", new BigDecimal("3.20"), 60, attempts);
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-ineligible", student));

        RankRetakeCoursesRequest req = new RankRetakeCoursesRequest("std-ineligible", 5, "rev-test");
        RankRetakeCoursesResponse res = simulator.rankRetakeCourses(req);

        assertThat(res).isNotNull();
        assertThat(res.getRecommendations()).isEmpty();
    }

    @Test
    @DisplayName("Case 17: Môn F là nợ môn (học lại bắt buộc), KHÔNG được đề xuất trong học cải thiện tự chọn")
    void testRankRetakeCourses_FailedGradeF_ExcludedFromImprovement() {
        StudentProfileFixture.CourseAttempt attemptF = createAttempt("MATH1002", "Toán rời rạc", 3, "F", 0.0, false);
        StudentProfileFixture student = createSampleStudent("std-failed-f", new BigDecimal("1.80"), 50, List.of(attemptF));
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-failed-f", student));

        RankRetakeCoursesRequest req = new RankRetakeCoursesRequest("std-failed-f", 5, "rev-test");
        RankRetakeCoursesResponse res = simulator.rankRetakeCourses(req);

        assertThat(res).isNotNull();
        // Môn F là học lại bắt buộc theo quy chế, không thuộc diện học cải thiện điểm tự chọn BR-06
        assertThat(res.getRecommendations()).isEmpty();
    }

    @Test
    @DisplayName("Case 18: Lịch sử nhiều lần học: Môn từng bị D ở lần 1 nhưng đã học lại đạt B ở lần 2 -> KHÔNG đề xuất")
    void testRankRetakeCourses_MultiAttempt_D_Then_B_Excluded() {
        StudentProfileFixture.CourseAttempt attempt1 = createAttempt("IT1001", "Nhập môn lập trình", 3, "D", 1.0, true);
        attempt1.setSemesterCode("2024_1");
        StudentProfileFixture.CourseAttempt attempt2 = createAttempt("IT1001", "Nhập môn lập trình", 3, "B", 3.0, true);
        attempt2.setSemesterCode("2024_2");

        StudentProfileFixture student = createSampleStudent("std-multi-d-b", new BigDecimal("2.50"), 60, List.of(attempt1, attempt2));
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-multi-d-b", student));

        RankRetakeCoursesRequest req = new RankRetakeCoursesRequest("std-multi-d-b", 5, "rev-test");
        RankRetakeCoursesResponse res = simulator.rankRetakeCourses(req);

        assertThat(res).isNotNull();
        // Lần học tốt nhất là B (3.0) -> Không còn là môn thuộc diện cải thiện BR-06
        assertThat(res.getRecommendations()).noneMatch(r -> "IT1001".equalsIgnoreCase(r.getCourseCode()));
    }

    @Test
    @DisplayName("Case 19: Lịch sử nhiều lần học: Môn từng bị D ở lần 1, học lại đạt D+ ở lần 2 -> Đề xuất theo điểm D+ mới")
    void testRankRetakeCourses_MultiAttempt_D_Then_DPlus_UsesBestGrade() {
        StudentProfileFixture.CourseAttempt attempt1 = createAttempt("IT1001", "Nhập môn lập trình", 3, "D", 1.0, true);
        attempt1.setSemesterCode("2024_1");
        StudentProfileFixture.CourseAttempt attempt2 = createAttempt("IT1001", "Nhập môn lập trình", 3, "D+", 1.5, true);
        attempt2.setSemesterCode("2024_2");

        StudentProfileFixture student = createSampleStudent("std-multi-d-dp", new BigDecimal("2.20"), 60, List.of(attempt1, attempt2));
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-multi-d-dp", student));

        RankRetakeCoursesRequest req = new RankRetakeCoursesRequest("std-multi-d-dp", 5, "rev-test");
        RankRetakeCoursesResponse res = simulator.rankRetakeCourses(req);

        assertThat(res).isNotNull();
        assertThat(res.getRecommendations()).hasSize(1);
        RetakeCourseRecommendation rec = res.getRecommendations().get(0);
        assertThat(rec.getCourseCode()).isEqualTo("IT1001");
        // Điểm tốt nhất hiện tại là D+ (1.5), không phải D (1.0)
        assertThat(rec.getCurrentGrade()).isEqualTo("D+");
        assertThat(rec.getCurrentGradePoints()).isEqualByComparingTo(new BigDecimal("1.5"));
        // delta = (4.0 - 1.5) * 3 / 60 = 7.5 / 60 = 0.125 -> 0.13
        assertThat(rec.getCpaDelta()).isEqualByComparingTo(new BigDecimal("0.13"));
    }

    @Test
    @DisplayName("Case 20: Môn chứng chỉ phi tín chỉ (GDTC/GDQP/QPAN) bị loại trừ")
    void testRankRetakeCourses_CertificateCourses_Excluded() {
        List<StudentProfileFixture.CourseAttempt> attempts = List.of(
                createAttempt("GDTC101", "Giáo dục thể chất 1", 2, "D", 1.0, true),
                createAttempt("QPAN101", "Giáo dục quốc phòng an ninh", 3, "C", 2.0, true),
                createAttempt("GDQP102", "Quân sự chung", 2, "D+", 1.5, true),
                createAttempt("REG_01", "Môn học chính quy", 3, "D", 1.0, true)
        );
        StudentProfileFixture student = createSampleStudent("std-cert", new BigDecimal("2.00"), 60, attempts);
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-cert", student));

        RankRetakeCoursesRequest req = new RankRetakeCoursesRequest("std-cert", 5, "rev-test");
        RankRetakeCoursesResponse res = simulator.rankRetakeCourses(req);

        assertThat(res).isNotNull();
        // Chỉ môn chính quy REG_01 được giữ lại, các môn GDTC/GDQP/QPAN bị loại trừ
        assertThat(res.getRecommendations()).hasSize(1);
        assertThat(res.getRecommendations().get(0).getCourseCode()).isEqualTo("REG_01");
    }

    @Test
    @DisplayName("Case 21: Mức tăng CPA tính đúng công thức delta = ((4.0 - currentPts) * credits) / totalCredits")
    void testRankRetakeCourses_CalculatesExactCpaDelta() {
        // Sinh viên có 50 tín chỉ
        // Môn A1: 3 TC, điểm D (1.0) -> gain = (4.0 - 1.0) * 3 = 9.0 -> delta = 9.0 / 50 = 0.18
        // Môn B1: 2 TC, điểm C (2.0) -> gain = (4.0 - 2.0) * 2 = 4.0 -> delta = 4.0 / 50 = 0.08
        List<StudentProfileFixture.CourseAttempt> attempts = List.of(
                createAttempt("A1", "Môn A1", 3, "D", 1.0, true),
                createAttempt("B1", "Môn B1", 2, "C", 2.0, true)
        );
        StudentProfileFixture student = createSampleStudent("std-roi", new BigDecimal("2.10"), 50, attempts);
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-roi", student));

        RankRetakeCoursesRequest req = new RankRetakeCoursesRequest("std-roi", 5, "rev-test");
        RankRetakeCoursesResponse res = simulator.rankRetakeCourses(req);

        assertThat(res).isNotNull();
        assertThat(res.getRecommendations()).hasSize(2);
        assertThat(res.getRecommendations().get(0).getCourseCode()).isEqualTo("A1");
        assertThat(res.getRecommendations().get(0).getCpaDelta()).isEqualByComparingTo(new BigDecimal("0.18"));
        assertThat(res.getRecommendations().get(1).getCourseCode()).isEqualTo("B1");
        assertThat(res.getRecommendations().get(1).getCpaDelta()).isEqualByComparingTo(new BigDecimal("0.08"));
    }

    @Test
    @DisplayName("Case 22: Thứ tự xếp hạng đúng theo ROI giảm dần")
    void testRankRetakeCourses_SortsByRoiDescending() {
        // Sinh viên 60 TC
        // C1: 4 TC, D+ (1.5) -> gain = 2.5 * 4 = 10.0 -> delta = 0.17
        // C2: 3 TC, D (1.0)  -> gain = 3.0 * 3 = 9.0  -> delta = 0.15
        // C3: 2 TC, C (2.0)  -> gain = 2.0 * 2 = 4.0  -> delta = 0.07
        List<StudentProfileFixture.CourseAttempt> attempts = List.of(
                createAttempt("C3", "Môn C3", 2, "C", 2.0, true),
                createAttempt("C1", "Môn C1", 4, "D+", 1.5, true),
                createAttempt("C2", "Môn C2", 3, "D", 1.0, true)
        );
        StudentProfileFixture student = createSampleStudent("std-sort-roi", new BigDecimal("2.00"), 60, attempts);
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-sort-roi", student));

        RankRetakeCoursesRequest req = new RankRetakeCoursesRequest("std-sort-roi", 10, "rev-test");
        RankRetakeCoursesResponse res = simulator.rankRetakeCourses(req);

        assertThat(res.getRecommendations()).hasSize(3);
        assertThat(res.getRecommendations().get(0).getCourseCode()).isEqualTo("C1");
        assertThat(res.getRecommendations().get(0).getRank()).isEqualTo(1);
        assertThat(res.getRecommendations().get(1).getCourseCode()).isEqualTo("C2");
        assertThat(res.getRecommendations().get(1).getRank()).isEqualTo(2);
        assertThat(res.getRecommendations().get(2).getCourseCode()).isEqualTo("C3");
        assertThat(res.getRecommendations().get(2).getRank()).isEqualTo(3);
    }

    @Test
    @DisplayName("Case 23: Tie-breaking cấp 2: Cùng ROI -> Môn ít tín chỉ hơn xếp trước (tốn ít công sức hơn)")
    void testRankRetakeCourses_TieBreaking_CreditsAscending() {
        // Sinh viên 60 TC
        // Môn T1: 2 TC, D (1.0) -> gain = (4.0 - 1.0) * 2 = 6.0 -> delta = 6.0 / 60 = 0.10
        // Môn T2: 3 TC, C (2.0) -> gain = (4.0 - 2.0) * 3 = 6.0 -> delta = 6.0 / 60 = 0.10
        // Cả 2 môn đều có delta = 0.10. T1 ít tín chỉ hơn (2 TC < 3 TC) nên tốn ít công sức hơn -> xếp trước
        List<StudentProfileFixture.CourseAttempt> attempts = List.of(
                createAttempt("T2", "Môn 3 tín chỉ", 3, "C", 2.0, true),
                createAttempt("T1", "Môn 2 tín chỉ", 2, "D", 1.0, true)
        );
        StudentProfileFixture student = createSampleStudent("std-tie-cr", new BigDecimal("2.00"), 60, attempts);
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-tie-cr", student));

        RankRetakeCoursesRequest req = new RankRetakeCoursesRequest("std-tie-cr", 5, "rev-test");
        RankRetakeCoursesResponse res = simulator.rankRetakeCourses(req);

        assertThat(res.getRecommendations()).hasSize(2);
        assertThat(res.getRecommendations().get(0).getCourseCode()).isEqualTo("T1");
        assertThat(res.getRecommendations().get(0).getRank()).isEqualTo(1);
        assertThat(res.getRecommendations().get(0).getCredits()).isEqualTo(2);

        assertThat(res.getRecommendations().get(1).getCourseCode()).isEqualTo("T2");
        assertThat(res.getRecommendations().get(1).getRank()).isEqualTo(2);
        assertThat(res.getRecommendations().get(1).getCredits()).isEqualTo(3);
    }

    @Test
    @DisplayName("Case 24: Tie-breaking cấp 3: Cùng ROI và cùng tín chỉ -> Mã môn xếp theo thứ tự A-Z")
    void testRankRetakeCourses_TieBreaking_CourseCodeAlphabetical() {
        // Sinh viên 60 TC
        // Cả 2 môn đều 3 TC, điểm D (1.0) -> delta = 9.0 / 60 = 0.15
        // Mã môn ALPHA_B và ALPHA_A: ALPHA_A đứng trước theo bảng chữ cái
        List<StudentProfileFixture.CourseAttempt> attempts = List.of(
                createAttempt("ALPHA_B", "Môn B", 3, "D", 1.0, true),
                createAttempt("ALPHA_A", "Môn A", 3, "D", 1.0, true)
        );
        StudentProfileFixture student = createSampleStudent("std-tie-code", new BigDecimal("2.00"), 60, attempts);
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-tie-code", student));

        RankRetakeCoursesRequest req = new RankRetakeCoursesRequest("std-tie-code", 5, "rev-test");
        RankRetakeCoursesResponse res = simulator.rankRetakeCourses(req);

        assertThat(res.getRecommendations()).hasSize(2);
        assertThat(res.getRecommendations().get(0).getCourseCode()).isEqualTo("ALPHA_A");
        assertThat(res.getRecommendations().get(0).getRank()).isEqualTo(1);
        assertThat(res.getRecommendations().get(1).getCourseCode()).isEqualTo("ALPHA_B");
        assertThat(res.getRecommendations().get(1).getRank()).isEqualTo(2);
    }

    @Test
    @DisplayName("Case 25: Kiểm tra tham số maxSuggestions: null (trả về tất cả), 0/âm (danh sách rỗng), dương (cắt đúng số lượng)")
    void testRankRetakeCourses_MaxSuggestions() {
        List<StudentProfileFixture.CourseAttempt> attempts = List.of(
                createAttempt("S1", "Môn 1", 3, "D", 1.0, true),
                createAttempt("S2", "Môn 2", 3, "D+", 1.5, true),
                createAttempt("S3", "Môn 3", 3, "C", 2.0, true)
        );
        StudentProfileFixture student = createSampleStudent("std-max-sug", new BigDecimal("2.00"), 60, attempts);
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-max-sug", student));

        // 1. maxSuggestions = null -> Trả về tất cả 3 môn
        RankRetakeCoursesResponse resAll = simulator.rankRetakeCourses(new RankRetakeCoursesRequest("std-max-sug", null, "rev-test"));
        assertThat(resAll.getRecommendations()).hasSize(3);

        // 2. maxSuggestions = 0 -> Trả về danh sách rỗng
        RankRetakeCoursesResponse resZero = simulator.rankRetakeCourses(new RankRetakeCoursesRequest("std-max-sug", 0, "rev-test"));
        assertThat(resZero.getRecommendations()).isEmpty();

        // 3. maxSuggestions = -5 -> Trả về danh sách rỗng
        RankRetakeCoursesResponse resNegative = simulator.rankRetakeCourses(new RankRetakeCoursesRequest("std-max-sug", -5, "rev-test"));
        assertThat(resNegative.getRecommendations()).isEmpty();

        // 4. maxSuggestions = 2 -> Cắt đúng 2 môn top đầu
        RankRetakeCoursesResponse resTwo = simulator.rankRetakeCourses(new RankRetakeCoursesRequest("std-max-sug", 2, "rev-test"));
        assertThat(resTwo.getRecommendations()).hasSize(2);
        assertThat(resTwo.getRecommendations().get(0).getRank()).isEqualTo(1);
        assertThat(resTwo.getRecommendations().get(1).getRank()).isEqualTo(2);
    }

    @Test
    @DisplayName("Case 26: Missing Data Strictness: Profile không tồn tại hoặc studentId null -> trả về danh sách rỗng, không crash")
    void testRankRetakeCourses_MissingData_NonExistentProfile() {
        GradeSimulator simulator = new GradeSimulator(policy, Collections.emptyMap());

        // Sinh viên không tồn tại
        RankRetakeCoursesResponse res1 = simulator.rankRetakeCourses(new RankRetakeCoursesRequest("non-existent-student", 5, "rev-test"));
        assertThat(res1).isNotNull();
        assertThat(res1.getRecommendations()).isEmpty();

        // studentId null
        RankRetakeCoursesResponse res2 = simulator.rankRetakeCourses(new RankRetakeCoursesRequest(null, 5, "rev-test"));
        assertThat(res2).isNotNull();
        assertThat(res2.getRecommendations()).isEmpty();

        // Request null
        RankRetakeCoursesResponse res3 = simulator.rankRetakeCourses(null);
        assertThat(res3).isNotNull();
        assertThat(res3.getRecommendations()).isEmpty();
    }

    @Test
    @DisplayName("Case 27: Missing Data Strictness: Sinh viên có 0 tín chỉ hoặc không xác định được tín chỉ -> xử lý an toàn không chia cho 0")
    void testRankRetakeCourses_MissingData_ZeroCredits_HandledSafely() {
        StudentProfileFixture student = createSampleStudent("std-zero-cr", new BigDecimal("2.00"), 0, Collections.emptyList());
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-zero-cr", student));

        RankRetakeCoursesResponse res = simulator.rankRetakeCourses(new RankRetakeCoursesRequest("std-zero-cr", 5, "rev-test"));
        assertThat(res).isNotNull();
        assertThat(res.getRecommendations()).isEmpty();
    }

    @Test
    @DisplayName("Case 28: Đảm bảo tính bất biến (Immutability): Không làm biến đổi lịch sử courseAttempts của profile gốc")
    void testRankRetakeCourses_Immutability_DoesNotMutateOriginalProfile() {
        StudentProfileFixture.CourseAttempt att = createAttempt("IMMUT_01", "Môn bất biến", 3, "D", 1.0, true);
        StudentProfileFixture student = createSampleStudent("std-immut-retake", new BigDecimal("2.00"), 30, List.of(att));
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-immut-retake", student));

        RankRetakeCoursesRequest req = new RankRetakeCoursesRequest("std-immut-retake", 5, "rev-test");
        simulator.rankRetakeCourses(req);

        // Xác minh danh sách lần học gốc và hồ sơ sinh viên không bị thay đổi
        assertThat(student.getCourseAttempts()).hasSize(1);
        assertThat(student.getCourseAttempts().get(0).getCourseCode()).isEqualTo("IMMUT_01");
        assertThat(student.getCourseAttempts().get(0).getLetterGrade()).isEqualTo("D");
        assertThat(student.getCourseAttempts().get(0).getGradePoint4()).isEqualTo(1.0);
    }

    @Test
    @DisplayName("Case 29: Tích hợp DefaultAcademicFacade với fixture thực tế std-2026-001")
    void testRankRetakeCourses_FacadeIntegration_Std2026001() {
        RankRetakeCoursesRequest req = new RankRetakeCoursesRequest("std-2026-001", 5, "rev-1001");
        RankRetakeCoursesResponse res = academicFacade.rankRetakeCourses(req);

        assertThat(res).isNotNull();
        assertThat(res.getStudentId()).isEqualTo("std-2026-001");
        assertThat(res.getDataRevision()).isEqualTo("rev-1001");
        assertThat(res.getRecommendations()).isNotEmpty();

        // Top 1: IT2001 (4 TC, điểm D+) có ROI kéo CPA lớn nhất (0.15)
        RetakeCourseRecommendation top1 = res.getRecommendations().get(0);
        assertThat(top1.getRank()).isEqualTo(1);
        assertThat(top1.getCourseCode()).isEqualTo("IT2001");
        assertThat(top1.getCurrentGrade()).isEqualTo("D+");
        assertThat(top1.getTargetGrade()).isEqualTo("A");
        assertThat(top1.getCpaDelta()).isEqualByComparingTo(new BigDecimal("0.15"));

        // Môn nợ F MATH1002 và môn B IT1001 tuyệt đối không xuất hiện
        assertThat(res.getRecommendations()).noneMatch(r -> "MATH1002".equalsIgnoreCase(r.getCourseCode()));
        assertThat(res.getRecommendations()).noneMatch(r -> "IT1001".equalsIgnoreCase(r.getCourseCode()));
    }

    // =========================================================================
    // GIAI ĐOẠN 3: calculateTargetGrades Test Cases (BR-08, BR-09, BR-10)
    // =========================================================================

    @Test
    @DisplayName("Case 30: Mục tiêu CPA khả thi -> Tính đúng requiredAverageGpa và phân bổ điểm theo môn")
    void testCalculateTargetGrades_FeasibleTarget() {
        // Sinh viên 60 TC, CPA 2.00, tổng CTĐT 90 TC (còn lại 30 TC). Mục tiêu CPA = 2.50
        // (2.50 * 90 - 2.00 * 60) / 30 = (225 - 120) / 30 = 105 / 30 = 3.50
        List<CurriculumFixture.CourseDefinitionItem> courses = List.of(
                createCourseDef("SUB_01", "Môn 1", 10, 1),
                createCourseDef("SUB_02", "Môn 2", 10, 2),
                createCourseDef("SUB_03", "Môn 3", 10, 3)
        );
        CurriculumFixture cur = createCurriculum("cur-test", 90, courses);
        StudentProfileFixture student = createSampleStudent("std-target-feas", new BigDecimal("2.00"), 60, Collections.emptyList());
        student.setTotalCreditsRequired(90);

        GradeSimulator simulator = new GradeSimulator(policy, cur, Map.of("std-target-feas", student));

        CalculateTargetGradesRequest req = new CalculateTargetGradesRequest("std-target-feas", new BigDecimal("2.50"), "2027_2", "rev-test");
        CalculateTargetGradesResponse res = simulator.calculateTargetGrades(req);

        assertThat(res).isNotNull();
        assertThat(res.getCurrentCpa()).isEqualByComparingTo(new BigDecimal("2.00"));
        assertThat(res.getTargetCpa()).isEqualByComparingTo(new BigDecimal("2.50"));
        assertThat(res.getRemainingCredits()).isEqualTo(30);
        assertThat(res.getRequiredAverageGpa()).isEqualByComparingTo(new BigDecimal("3.50"));
        assertThat(res.getCourseRequirements()).hasSize(3);
        // Mỗi môn 10 TC, GPA cần 3.50 -> Cả 3 môn đều được gán B+ (3.5)
        assertThat(res.getCourseRequirements()).allMatch(c -> "B+".equals(c.getRequiredGrade()));
    }

    @Test
    @DisplayName("Case 31: Mục tiêu CPA bất khả thi (yêu cầu GPA > 4.00) -> Trả về cảnh báo rõ ràng và không đề xuất điểm > 4.0")
    void testCalculateTargetGrades_ImpossibleTarget_EmitsWarningAndEmptyRequirements() {
        // Sinh viên 60 TC, CPA 2.00, tổng 90 TC (còn 30 TC). Mục tiêu CPA = 3.50
        // (3.50 * 90 - 2.00 * 60) / 30 = (315 - 120) / 30 = 195 / 30 = 6.50 > 4.00
        StudentProfileFixture student = createSampleStudent("std-target-impos", new BigDecimal("2.00"), 60, Collections.emptyList());
        student.setTotalCreditsRequired(90);
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-target-impos", student));

        CalculateTargetGradesRequest req = new CalculateTargetGradesRequest("std-target-impos", new BigDecimal("3.50"), "2027_2", "rev-test");
        CalculateTargetGradesResponse res = simulator.calculateTargetGrades(req);

        assertThat(res).isNotNull();
        assertThat(res.getRequiredAverageGpa()).isGreaterThan(new BigDecimal("4.00"));
        assertThat(res.getWarnings()).anyMatch(w -> w.contains("không khả thi") || w.contains("> 4.00"));
        // Không đề xuất điểm vượt 4.0
        assertThat(res.getCourseRequirements()).isEmpty();
    }

    @Test
    @DisplayName("Case 32: Công thức bình quân gia quyền chính xác (BR-08, BR-09, BR-10)")
    void testCalculateTargetGrades_WeightedAverageFormulaPrecision() {
        // Sinh viên 61 TC, CPA 3.18, tổng 150 TC (còn 89 TC). Mục tiêu CPA = 3.60
        // (3.60 * 150 - 3.18 * 61) / 89 = (540 - 193.98) / 89 = 346.02 / 89 = 3.8878 -> 3.89
        StudentProfileFixture student = createSampleStudent("std-formula", new BigDecimal("3.18"), 61, Collections.emptyList());
        student.setTotalCreditsRequired(150);
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-formula", student));

        CalculateTargetGradesRequest req = new CalculateTargetGradesRequest("std-formula", new BigDecimal("3.60"), "2027_2", "rev-test");
        CalculateTargetGradesResponse res = simulator.calculateTargetGrades(req);

        assertThat(res).isNotNull();
        assertThat(res.getRemainingCredits()).isEqualTo(89);
        assertThat(res.getRequiredAverageGpa()).isEqualByComparingTo(new BigDecimal("3.89"));
    }

    @Test
    @DisplayName("Case 33: Không còn tín chỉ học mới và CPA chưa đạt mục tiêu -> Cảnh báo học cải thiện theo BR-06")
    void testCalculateTargetGrades_ZeroRemainingCredits_BelowTarget_EmitsRetakeWarning() {
        // Sinh viên đã học đủ 135/135 TC, CPA hiện tại 2.80, nhưng mục tiêu là 3.20
        StudentProfileFixture student = createSampleStudent("std-no-cr-below", new BigDecimal("2.80"), 135, Collections.emptyList());
        student.setTotalCreditsRequired(135);
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-no-cr-below", student));

        CalculateTargetGradesRequest req = new CalculateTargetGradesRequest("std-no-cr-below", new BigDecimal("3.20"), "2027_2", "rev-test");
        CalculateTargetGradesResponse res = simulator.calculateTargetGrades(req);

        assertThat(res).isNotNull();
        assertThat(res.getRemainingCredits()).isEqualTo(0);
        assertThat(res.getRequiredAverageGpa()).isNull();
        assertThat(res.getCourseRequirements()).isEmpty();
        assertThat(res.getWarnings()).anyMatch(w -> w.contains("không còn tín chỉ học mới") && w.contains("học cải thiện"));
    }

    @Test
    @DisplayName("Case 34: Không còn tín chỉ học mới và CPA đã đạt mục tiêu -> Thông báo đã hoàn thành")
    void testCalculateTargetGrades_ZeroRemainingCredits_AchievedTarget() {
        // Sinh viên đã học đủ 135/135 TC, CPA hiện tại 3.50, mục tiêu là 3.20
        StudentProfileFixture student = createSampleStudent("std-no-cr-achieved", new BigDecimal("3.50"), 135, Collections.emptyList());
        student.setTotalCreditsRequired(135);
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-no-cr-achieved", student));

        CalculateTargetGradesRequest req = new CalculateTargetGradesRequest("std-no-cr-achieved", new BigDecimal("3.20"), "2027_2", "rev-test");
        CalculateTargetGradesResponse res = simulator.calculateTargetGrades(req);

        assertThat(res).isNotNull();
        assertThat(res.getRemainingCredits()).isEqualTo(0);
        assertThat(res.getRequiredAverageGpa()).isNull();
        assertThat(res.getCourseRequirements()).isEmpty();
        assertThat(res.getWarnings()).anyMatch(w -> w.contains("đã hoàn thành"));
    }

    @Test
    @DisplayName("Case 35: CPA hiện tại bằng CPA mục tiêu -> Thông báo duy trì kết quả")
    void testCalculateTargetGrades_CurrentCpaEqualsTarget() {
        // Sinh viên 60 TC, CPA 3.20, tổng 90 TC. Mục tiêu 3.20
        // (3.20 * 90 - 3.20 * 60) / 30 = 3.20
        StudentProfileFixture student = createSampleStudent("std-cpa-eq", new BigDecimal("3.20"), 60, Collections.emptyList());
        student.setTotalCreditsRequired(90);
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-cpa-eq", student));

        CalculateTargetGradesRequest req = new CalculateTargetGradesRequest("std-cpa-eq", new BigDecimal("3.20"), "2027_2", "rev-test");
        CalculateTargetGradesResponse res = simulator.calculateTargetGrades(req);

        assertThat(res).isNotNull();
        assertThat(res.getRequiredAverageGpa()).isEqualByComparingTo(new BigDecimal("3.20"));
        assertThat(res.getWarnings()).anyMatch(w -> w.contains("đã đạt hoặc vượt"));
    }

    @Test
    @DisplayName("Case 36: CPA hiện tại cao hơn CPA mục tiêu -> Cảnh báo chỉ cần duy trì kết quả đạt")
    void testCalculateTargetGrades_CurrentCpaHigherThanTarget() {
        // Sinh viên 60 TC, CPA 3.50, tổng 90 TC. Mục tiêu 3.20
        // (3.20 * 90 - 3.50 * 60) / 30 = (288 - 210) / 30 = 78 / 30 = 2.60
        StudentProfileFixture student = createSampleStudent("std-cpa-high", new BigDecimal("3.50"), 60, Collections.emptyList());
        student.setTotalCreditsRequired(90);
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-cpa-high", student));

        CalculateTargetGradesRequest req = new CalculateTargetGradesRequest("std-cpa-high", new BigDecimal("3.20"), "2027_2", "rev-test");
        CalculateTargetGradesResponse res = simulator.calculateTargetGrades(req);

        assertThat(res).isNotNull();
        assertThat(res.getRequiredAverageGpa()).isEqualByComparingTo(new BigDecimal("2.60"));
        assertThat(res.getWarnings()).anyMatch(w -> w.contains("đã đạt hoặc vượt"));
    }

    @Test
    @DisplayName("Case 37: CPA mục tiêu lớn hơn 4.00 -> Cảnh báo không hợp lệ")
    void testCalculateTargetGrades_TargetCpaGreaterThan4() {
        StudentProfileFixture student = createSampleStudent("std-cpa-gt4", new BigDecimal("3.00"), 60, Collections.emptyList());
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-cpa-gt4", student));

        CalculateTargetGradesRequest req = new CalculateTargetGradesRequest("std-cpa-gt4", new BigDecimal("4.20"), "2027_2", "rev-test");
        CalculateTargetGradesResponse res = simulator.calculateTargetGrades(req);

        assertThat(res).isNotNull();
        assertThat(res.getRequiredAverageGpa()).isNull();
        assertThat(res.getCourseRequirements()).isEmpty();
        assertThat(res.getWarnings()).anyMatch(w -> w.contains("vượt quá thang điểm tối đa 4.00"));
    }

    @Test
    @DisplayName("Case 38: CPA mục tiêu nhỏ hơn 0.00 -> Cảnh báo không hợp lệ")
    void testCalculateTargetGrades_TargetCpaNegative() {
        StudentProfileFixture student = createSampleStudent("std-cpa-neg", new BigDecimal("3.00"), 60, Collections.emptyList());
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-cpa-neg", student));

        CalculateTargetGradesRequest req = new CalculateTargetGradesRequest("std-cpa-neg", new BigDecimal("-0.50"), "2027_2", "rev-test");
        CalculateTargetGradesResponse res = simulator.calculateTargetGrades(req);

        assertThat(res).isNotNull();
        assertThat(res.getRequiredAverageGpa()).isNull();
        assertThat(res.getCourseRequirements()).isEmpty();
        assertThat(res.getWarnings()).anyMatch(w -> w.contains("nhỏ hơn 0.00"));
    }

    @Test
    @DisplayName("Case 39: Missing Data Strictness: Thiếu CPA và tín chỉ -> Cảnh báo thiếu dữ liệu, không tự gán 2.45")
    void testCalculateTargetGrades_MissingCpa_StrictHandling() {
        StudentProfileFixture student = new StudentProfileFixture();
        student.setStudentId("std-missing-cpa");
        student.setCpa(null);
        student.setAccumulatedCredits(60.0);
        student.setCourseAttempts(Collections.emptyList());
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-missing-cpa", student));

        CalculateTargetGradesRequest req = new CalculateTargetGradesRequest("std-missing-cpa", new BigDecimal("3.20"), "2027_2", "rev-test");
        CalculateTargetGradesResponse res = simulator.calculateTargetGrades(req);

        assertThat(res).isNotNull();
        assertThat(res.getCurrentCpa()).isNull();
        assertThat(res.getRequiredAverageGpa()).isNull();
        assertThat(res.getWarnings()).anyMatch(w -> w.contains("Thiếu dữ liệu CPA"));
    }

    @Test
    @DisplayName("Case 40: Sinh viên không tồn tại -> Trả về cảnh báo an toàn, không ném ngoại lệ")
    void testCalculateTargetGrades_StudentNotFound() {
        GradeSimulator simulator = new GradeSimulator(policy, Collections.emptyMap());

        CalculateTargetGradesRequest req = new CalculateTargetGradesRequest("unknown-std", new BigDecimal("3.20"), "2027_2", "rev-test");
        CalculateTargetGradesResponse res = simulator.calculateTargetGrades(req);

        assertThat(res).isNotNull();
        assertThat(res.getWarnings()).anyMatch(w -> w.contains("Không tìm thấy hồ sơ sinh viên"));
        assertThat(res.getCourseRequirements()).isEmpty();
    }

    @Test
    @DisplayName("Case 41: CTĐT không tồn tại hoặc rỗng -> Trả về cảnh báo rõ ràng")
    void testCalculateTargetGrades_CurriculumEmpty() {
        CurriculumFixture emptyCur = createCurriculum("empty-cur", 135, Collections.emptyList());
        StudentProfileFixture student = createSampleStudent("std-empty-cur", new BigDecimal("2.50"), 60, Collections.emptyList());
        GradeSimulator simulator = new GradeSimulator(policy, emptyCur, Map.of("std-empty-cur", student));

        CalculateTargetGradesRequest req = new CalculateTargetGradesRequest("std-empty-cur", new BigDecimal("3.20"), "2027_2", "rev-test");
        CalculateTargetGradesResponse res = simulator.calculateTargetGrades(req);

        assertThat(res).isNotNull();
        assertThat(res.getWarnings()).anyMatch(w -> w.contains("Không tìm thấy chương trình đào tạo"));
    }

    @Test
    @DisplayName("Case 42: Sinh viên có môn nợ điểm F chưa hoàn thành -> Ưu tiên đưa vào courseRequirements")
    void testCalculateTargetGrades_FailedCourseF_PrioritizedInRequirements() {
        // Sinh viên nợ môn F (IT1002, 3 TC)
        StudentProfileFixture.CourseAttempt attemptF = createAttempt("IT1002", "Cấu trúc dữ liệu", 3, "F", 0.0, false);
        StudentProfileFixture student = createSampleStudent("std-debt-f", new BigDecimal("2.20"), 50, List.of(attemptF));
        student.setTotalCreditsRequired(60);

        List<CurriculumFixture.CourseDefinitionItem> courses = List.of(
                createCourseDef("IT1002", "Cấu trúc dữ liệu", 3, 2),
                createCourseDef("IT2001", "Lập trình OOP", 4, 3),
                createCourseDef("IT2002", "Hệ điều hành", 3, 3)
        );
        CurriculumFixture cur = createCurriculum("cur-debt", 60, courses);
        GradeSimulator simulator = new GradeSimulator(policy, cur, Map.of("std-debt-f", student));

        CalculateTargetGradesRequest req = new CalculateTargetGradesRequest("std-debt-f", new BigDecimal("2.50"), "2027_2", "rev-test");
        CalculateTargetGradesResponse res = simulator.calculateTargetGrades(req);

        assertThat(res).isNotNull();
        // Môn nợ F IT1002 phải xuất hiện đầu tiên
        assertThat(res.getCourseRequirements()).isNotEmpty();
        TargetCourseGradeRequirement firstReq = res.getCourseRequirements().get(0);
        assertThat(firstReq.getCourseCode()).isEqualTo("IT1002");
        assertThat(firstReq.getRationale()).contains("Môn nợ F");
        assertThat(res.getWarnings()).anyMatch(w -> w.contains("môn nợ điểm F") && w.contains("IT1002"));
    }

    @Test
    @DisplayName("Case 43: Mục tiêu đòi hỏi GPA >= 3.40 -> Cảnh báo mức thử thách và gợi ý học cải thiện")
    void testCalculateTargetGrades_ChallengingTarget_SuggestsImprovement() {
        // Sinh viên 60 TC, CPA 2.80, tổng 100 TC (còn 40 TC). Mục tiêu 3.20
        // (3.20 * 100 - 2.80 * 60) / 40 = (320 - 168) / 40 = 152 / 40 = 3.80
        StudentProfileFixture student = createSampleStudent("std-challenging", new BigDecimal("2.80"), 60, Collections.emptyList());
        student.setTotalCreditsRequired(100);
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-challenging", student));

        CalculateTargetGradesRequest req = new CalculateTargetGradesRequest("std-challenging", new BigDecimal("3.20"), "2027_2", "rev-test");
        CalculateTargetGradesResponse res = simulator.calculateTargetGrades(req);

        assertThat(res).isNotNull();
        assertThat(res.getRequiredAverageGpa()).isEqualByComparingTo(new BigDecimal("3.80"));
        assertThat(res.getWarnings()).anyMatch(w -> w.contains("thử thách"));
        assertThat(res.getWarnings()).anyMatch(w -> w.contains("học cải thiện"));
    }

    @Test
    @DisplayName("Case 44: Phân bổ điểm rời rạc A, B+, B, C+ theo số tín chỉ thực tế")
    void testCalculateTargetGrades_DiscreteGradeAllocationWithCredits() {
        List<CurriculumFixture.CourseDefinitionItem> courses = List.of(
                createCourseDef("C4_01", "Môn 4 tín chỉ", 4, 1),
                createCourseDef("C3_02", "Môn 3 tín chỉ", 3, 1),
                createCourseDef("C2_03", "Môn 2 tín chỉ", 2, 2)
        );
        CurriculumFixture cur = createCurriculum("cur-discrete", 69, courses);
        // Sinh viên 60 TC, CPA 2.00, tổng 69 TC (còn 9 TC = 4 + 3 + 2). Target CPA = 2.20
        // (2.20 * 69 - 2.00 * 60) / 9 = (151.8 - 120.0) / 9 = 31.8 / 9 = 3.5333 -> 3.53
        StudentProfileFixture student = createSampleStudent("std-discrete", new BigDecimal("2.00"), 60, Collections.emptyList());
        student.setTotalCreditsRequired(69);
        GradeSimulator simulator = new GradeSimulator(policy, cur, Map.of("std-discrete", student));

        CalculateTargetGradesRequest req = new CalculateTargetGradesRequest("std-discrete", new BigDecimal("2.20"), "2027_2", "rev-test");
        CalculateTargetGradesResponse res = simulator.calculateTargetGrades(req);

        assertThat(res).isNotNull();
        assertThat(res.getCourseRequirements()).hasSize(3);
        // Điểm được gán phải thuộc tập điểm rời rạc chuẩn {A, B+, B, C+, C, D+, D}
        for (TargetCourseGradeRequirement c : res.getCourseRequirements()) {
            assertThat(c.getRequiredGrade()).isIn("A", "B+", "B", "C+", "C", "D+", "D");
            assertThat(c.getRequiredGradePoints()).isNotNull();
        }
    }

    @Test
    @DisplayName("Case 45: Kết quả phân bổ điểm bảo đảm tính toán CPA chung cuộc đạt hoặc vượt mục tiêu")
    void testCalculateTargetGrades_AllocationAchievesTargetCpa() {
        List<CurriculumFixture.CourseDefinitionItem> courses = List.of(
                createCourseDef("M1", "Môn 1", 3, 1),
                createCourseDef("M2", "Môn 2", 3, 1),
                createCourseDef("M3", "Môn 3", 4, 2)
        );
        CurriculumFixture cur = createCurriculum("cur-achieve", 70, courses);
        // Sinh viên 60 TC, CPA 2.50, tổng 70 TC (còn 10 TC). Target CPA = 2.65
        StudentProfileFixture student = createSampleStudent("std-achieve", new BigDecimal("2.50"), 60, Collections.emptyList());
        student.setTotalCreditsRequired(70);
        GradeSimulator simulator = new GradeSimulator(policy, cur, Map.of("std-achieve", student));

        CalculateTargetGradesRequest req = new CalculateTargetGradesRequest("std-achieve", new BigDecimal("2.65"), "2027_2", "rev-test");
        CalculateTargetGradesResponse res = simulator.calculateTargetGrades(req);

        assertThat(res).isNotNull();
        assertThat(res.getCourseRequirements()).hasSize(3);

        // Tính lại CPA tổng hợp từ phân bổ:
        BigDecimal currentWeighted = new BigDecimal("2.50").multiply(BigDecimal.valueOf(60));
        BigDecimal addedWeighted = BigDecimal.ZERO;
        for (TargetCourseGradeRequirement r : res.getCourseRequirements()) {
            addedWeighted = addedWeighted.add(r.getRequiredGradePoints().multiply(BigDecimal.valueOf(r.getCredits())));
        }
        BigDecimal finalCpa = currentWeighted.add(addedWeighted).divide(BigDecimal.valueOf(70), 2, java.math.RoundingMode.HALF_UP);
        assertThat(finalCpa).isGreaterThanOrEqualTo(new BigDecimal("2.65"));
    }

    @Test
    @DisplayName("Case 46: Không có mã môn IT4001 hardcode khi sinh viên học CTĐT khác")
    void testCalculateTargetGrades_NoHardcodedIT4001() {
        List<CurriculumFixture.CourseDefinitionItem> courses = List.of(
                createCourseDef("REAL_01", "Môn thực tế 1", 3, 1),
                createCourseDef("REAL_02", "Môn thực tế 2", 3, 2)
        );
        CurriculumFixture cur = createCurriculum("cur-real", 66, courses);
        StudentProfileFixture student = createSampleStudent("std-no-hardcode", new BigDecimal("2.50"), 60, Collections.emptyList());
        student.setTotalCreditsRequired(66);
        GradeSimulator simulator = new GradeSimulator(policy, cur, Map.of("std-no-hardcode", student));

        CalculateTargetGradesRequest req = new CalculateTargetGradesRequest("std-no-hardcode", new BigDecimal("2.60"), "2027_2", "rev-test");
        CalculateTargetGradesResponse res = simulator.calculateTargetGrades(req);

        assertThat(res).isNotNull();
        // Không chứa môn IT4001 hardcode cũ
        assertThat(res.getCourseRequirements()).noneMatch(c -> "IT4001".equalsIgnoreCase(c.getCourseCode()));
        assertThat(res.getCourseRequirements()).anyMatch(c -> "REAL_01".equalsIgnoreCase(c.getCourseCode()));
    }

    @Test
    @DisplayName("Case 47: Đảm bảo tính bất biến (Immutability): Không biến đổi hồ sơ sinh viên gốc")
    void testCalculateTargetGrades_Immutability_DoesNotMutateStudentProfile() {
        StudentProfileFixture.CourseAttempt att = createAttempt("HIST_01", "Lịch sử", 3, "B", 3.0, true);
        StudentProfileFixture student = createSampleStudent("std-immut-target", new BigDecimal("3.00"), 30, List.of(att));
        student.setTotalCreditsRequired(60);
        GradeSimulator simulator = new GradeSimulator(policy, Map.of("std-immut-target", student));

        CalculateTargetGradesRequest req = new CalculateTargetGradesRequest("std-immut-target", new BigDecimal("3.20"), "2027_2", "rev-test");
        simulator.calculateTargetGrades(req);

        // Hồ sơ gốc không bị thay đổi
        assertThat(student.getCpa()).isEqualByComparingTo(new BigDecimal("3.00"));
        assertThat(student.getAccumulatedCredits()).isEqualTo(30);
        assertThat(student.getCourseAttempts()).hasSize(1);
    }

    @Test
    @DisplayName("Case 48: Tích hợp DefaultAcademicFacade với fixture thực tế 2024604757 và std-2026-001")
    void testCalculateTargetGrades_FacadeIntegration_RealFixtures() {
        // Sinh viên 2024604757 (KTPM K19): 61/150 TC, CPA 3.18, mục tiêu 3.60
        CalculateTargetGradesRequest reqKTPM = new CalculateTargetGradesRequest("2024604757", new BigDecimal("3.60"), "2027_2", "rev-ktpm-v1");
        CalculateTargetGradesResponse resKTPM = academicFacade.calculateTargetGrades(reqKTPM);

        assertThat(resKTPM).isNotNull();
        assertThat(resKTPM.getRemainingCredits()).isEqualTo(89);
        assertThat(resKTPM.getRequiredAverageGpa()).isEqualByComparingTo(new BigDecimal("3.89"));
        assertThat(resKTPM.getCourseRequirements()).isNotEmpty();

        // Sinh viên std-2026-001 (CNTT K18): 68/135 TC, CPA 2.45, mục tiêu 3.20
        CalculateTargetGradesRequest reqIT = new CalculateTargetGradesRequest("std-2026-001", new BigDecimal("3.20"), "2027_2", "rev-1001");
        CalculateTargetGradesResponse resIT = academicFacade.calculateTargetGrades(reqIT);

        assertThat(resIT).isNotNull();
        assertThat(resIT.getRemainingCredits()).isEqualTo(67);
        assertThat(resIT.getRequiredAverageGpa()).isEqualByComparingTo(new BigDecimal("3.96"));
        assertThat(resIT.getCourseRequirements()).isNotEmpty();
    }
}
