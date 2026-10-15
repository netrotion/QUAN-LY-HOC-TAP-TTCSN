package vn.haui.advisor.academic;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.academic.fixture.AcademicFixtures;
import vn.haui.advisor.academic.model.CurriculumFixture;
import vn.haui.advisor.academic.model.PolicyDemo;
import vn.haui.advisor.academic.model.StudentProfileFixture;
import vn.haui.advisor.academic.service.DefaultAcademicFacade;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.AcademicFacade;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Task 3.11 Stage 5: Comprehensive Integration & Acceptance Test Suite (TV4)")
public class Task311IntegrationAcceptanceTest {

    private AcademicFacade academicFacade;
    private PolicyDemo policy;
    private CurriculumFixture curriculumIt;
    private CurriculumFixture curriculumKtpm;
    private Map<String, StudentProfileFixture> profiles;

    @BeforeEach
    void setUp() {
        policy = AcademicFixtures.getPolicyDemo();
        curriculumIt = AcademicFixtures.getCurriculum();
        curriculumKtpm = AcademicFixtures.getCurriculumV1();
        profiles = new HashMap<>(AcademicFixtures.getStudentProfiles());
        profiles.putAll(AcademicFixtures.getStudentProfilesV1());
        academicFacade = new DefaultAcademicFacade(policy, curriculumIt, profiles);
    }

    private StudentProfileFixture.CourseAttempt createAttempt(String code, String name, int credits, String sem,
                                                             String grade, double pts, Boolean passed) {
        StudentProfileFixture.CourseAttempt a = new StudentProfileFixture.CourseAttempt();
        a.setCourseCode(code);
        a.setCourseName(name);
        a.setCredits((double) credits);
        a.setSemesterCode(sem);
        a.setLetterGrade(grade);
        a.setGradePoint4(pts);
        a.setPassed(passed);
        return a;
    }

    // =========================================================================
    // 1. Luồng 1: Môn F, học lại thành công, CPA được cập nhật chuẩn xác
    // =========================================================================
    @Test
    @DisplayName("Luồng 1: Sinh viên nợ môn F, học lại đạt A -> Mẫu số CPA không cộng trùng, CPA tăng chuẩn xác")
    void testFlow1_RetakeFailedCourse_UpdatesCpaCorrectlyWithoutCreditInflation() {
        // Sinh viên học 10 môn, 30 TC, trong đó có môn IT1001 (3 TC) bị F. Tổng điểm có trọng số = 60.0 -> CPA = 2.00
        StudentProfileFixture.CourseAttempt attemptF = createAttempt("IT1001", "Nhập môn lập trình", 3, "2024_1", "F", 0.0, false);
        StudentProfileFixture student = new StudentProfileFixture();
        student.setStudentId("std-flow-1");
        student.setCpa(new BigDecimal("2.00"));
        student.setAccumulatedCredits(30.0);
        student.setCourseAttempts(List.of(attemptF));
        profiles.put("std-flow-1", student);
        academicFacade = new DefaultAcademicFacade(policy, curriculumIt, profiles);

        // Mô phỏng học lại IT1001 kỳ tới kỳ vọng đạt A (4.0)
        SimulatedCourseGrade sim = new SimulatedCourseGrade("IT1001", 3, "A", new BigDecimal("4.0"));
        SimulateGradesRequest req = new SimulateGradesRequest("std-flow-1", List.of(sim), "rev-flow-1");

        SimulateGradesResponse res = academicFacade.simulateGrades(req);

        // Công thức kỳ vọng:
        // Ban đầu: CPA 2.00 với 27 TC đạt. Điểm trọng số trước = 2.00 * 30 = 60.0.
        // Môn F học lại đạt A: tử số tăng 4.0 * 3 = 12.0 -> Tổng tử số mới = 72.0.
        // Mẫu số: KHÔNG cộng trùng tín chỉ -> vẫn là 30 TC tính CPA.
        // CPA mới = 72.0 / 30 = 2.40. Độ lệch CPA = +0.40.
        assertThat(res).isNotNull();
        assertThat(res.getCurrentCpa()).isEqualByComparingTo(new BigDecimal("2.00"));
        assertThat(res.getProjectedCpa()).isEqualByComparingTo(new BigDecimal("2.40"));
        assertThat(res.getCpaDelta()).isEqualByComparingTo(new BigDecimal("0.40"));
    }

    // =========================================================================
    // 2. Luồng 2: Sinh viên cải thiện D lên A, rankRetakeCourses và simulateGrades thống nhất
    // =========================================================================
    @Test
    @DisplayName("Luồng 2: Cải thiện D lên A -> potentialCpaGain của rankRetakeCourses khớp hoàn toàn cpaDelta của simulateGrades")
    void testFlow2_ImproveDToA_ConsistencyBetweenRankRetakeAndSimulateGrades() {
        // Sinh viên có môn IT2001 (4 TC) đạt điểm D+ (1.5), tổng 60 TC tích lũy, CPA 2.50
        StudentProfileFixture.CourseAttempt attemptD = createAttempt("IT2001", "Lập trình OOP", 4, "2024_2", "D+", 1.5, true);
        StudentProfileFixture student = new StudentProfileFixture();
        student.setStudentId("std-flow-2");
        student.setCpa(new BigDecimal("2.50"));
        student.setAccumulatedCredits(60.0);
        student.setCourseAttempts(List.of(attemptD));
        profiles.put("std-flow-2", student);
        academicFacade = new DefaultAcademicFacade(policy, curriculumIt, profiles);

        // 1. Gọi rankRetakeCourses
        RankRetakeCoursesRequest rankReq = new RankRetakeCoursesRequest("std-flow-2", 5, "rev-flow-2");
        RankRetakeCoursesResponse rankRes = academicFacade.rankRetakeCourses(rankReq);

        assertThat(rankRes.getRecommendations()).isNotEmpty();
        RetakeCourseRecommendation rec = rankRes.getRecommendations().get(0);
        assertThat(rec.getCourseCode()).isEqualTo("IT2001");
        BigDecimal expectedGain = rec.getPotentialCpaGain();

        // 2. Gọi simulateGrades với môn IT2001 cải thiện lên A (4.0)
        SimulatedCourseGrade sim = new SimulatedCourseGrade("IT2001", 4, "A", new BigDecimal("4.0"));
        SimulateGradesRequest simReq = new SimulateGradesRequest("std-flow-2", List.of(sim), "rev-flow-2");
        SimulateGradesResponse simRes = academicFacade.simulateGrades(simReq);

        // Xác minh mức tăng CPA của cả 2 chức năng phải hoàn toàn thống nhất:
        // Gain = (4.0 - 1.5) * 4 / 60 = 2.5 * 4 / 60 = 10.0 / 60 = 0.1666... -> 0.17
        assertThat(expectedGain).isEqualByComparingTo(new BigDecimal("0.17"));
        assertThat(simRes.getCpaDelta()).isEqualByComparingTo(expectedGain);
        assertThat(simRes.getProjectedCpa()).isEqualByComparingTo(new BigDecimal("2.67"));
    }

    // =========================================================================
    // 3. Luồng 3: calculateTargetGrades sinh phương án phân bổ đạt CPA mục tiêu khi mô phỏng lại
    // =========================================================================
    @Test
    @DisplayName("Luồng 3: Phân bổ điểm rời rạc đạt CPA mục tiêu khi mô phỏng lại qua simulateGrades")
    void testFlow3_TargetGradesAllocation_ReachesTargetWhenSimulated() {
        StudentProfileFixture student = profiles.get("2024604757");
        assertThat(student).isNotNull();

        BigDecimal targetCpa = new BigDecimal("3.40");
        CalculateTargetGradesRequest targetReq = new CalculateTargetGradesRequest("2024604757", targetCpa, "2027_2", "rev-flow-3");
        CalculateTargetGradesResponse targetRes = academicFacade.calculateTargetGrades(targetReq);

        assertThat(targetRes).isNotNull();
        assertThat(targetRes.getRequiredAverageGpa()).isNotNull();
        assertThat(targetRes.getCourseRequirements()).isNotEmpty();

        // Chuyển đổi courseRequirements thành các môn mô phỏng
        List<SimulatedCourseGrade> simList = new ArrayList<>();
        for (TargetCourseGradeRequirement req : targetRes.getCourseRequirements()) {
            simList.add(new SimulatedCourseGrade(req.getCourseCode(), req.getCredits(), req.getRequiredGrade(), req.getRequiredGradePoints()));
        }

        SimulateGradesRequest simReq = new SimulateGradesRequest("2024604757", simList, "rev-flow-3");
        SimulateGradesResponse simRes = academicFacade.simulateGrades(simReq);

        // Xác minh CPA mới sau khi đạt đủ các điểm phân bổ phải >= targetCpa
        assertThat(simRes.getProjectedCpa()).isGreaterThanOrEqualTo(targetCpa);
    }

    // =========================================================================
    // 4. Luồng 4: Sinh viên trượt môn tiên quyết, kế hoạch được cảnh báo điều chỉnh
    // =========================================================================
    @Test
    @DisplayName("Luồng 4: Trượt môn tiên quyết MATH1002 -> onTrack = false, đề xuất học lại và hoãn môn sau")
    void testFlow4_FailedPrerequisiteCourse_TriggersPlanAdjustment() {
        ReconcileStudyPlanRequest req = new ReconcileStudyPlanRequest(
                "plan-2024604757-v1", "2024604757", "2024_2", 1, "rev-flow-4"
        );
        ReconcileStudyPlanResponse res = academicFacade.reconcileStudyPlan(req);

        assertThat(res).isNotNull();
        assertThat(res.isOnTrack()).isFalse();
        assertThat(res.getMissedOrFailedCourses()).anyMatch(c -> c.contains("LP6004"));
        assertThat(res.getAdjustmentsRecommended()).anyMatch(a -> a.contains("LP6004") && a.contains("học lại"));
    }

    // =========================================================================
    // 5. Luồng 5: Sinh viên hoàn thành môn nợ ở kỳ sau, chuỗi tiên quyết được giải tỏa
    // =========================================================================
    @Test
    @DisplayName("Luồng 5: Học lại đạt ở kỳ sau -> reconcileStudyPlan onTrack và checkCourseEligibility mở khóa môn sau")
    void testFlow5_RetakePasses_UnblocksSubsequentPrerequisites() {
        // Sinh viên nợ MATH1002 ở 2024_1, học lại đạt B ở 2024_2
        StudentProfileFixture.CourseAttempt att1 = createAttempt("MATH1002", "Toán rời rạc", 3, "2024_1", "F", 0.0, false);
        StudentProfileFixture.CourseAttempt att2 = createAttempt("MATH1002", "Toán rời rạc", 3, "2024_2", "B", 3.0, true);
        StudentProfileFixture.CourseAttempt att3 = createAttempt("IT1001", "Nhập môn lập trình", 3, "2024_1", "A", 4.0, true);

        StudentProfileFixture student = new StudentProfileFixture();
        student.setStudentId("std-flow-5");
        student.setCurrentSemester(3);
        student.setCpa(new BigDecimal("2.80"));
        student.setAccumulatedCredits(50.0);
        student.setCourseAttempts(List.of(att1, att2, att3));
        profiles.put("std-flow-5", student);
        academicFacade = new DefaultAcademicFacade(policy, curriculumIt, profiles);

        // 1. Đối chiếu kỳ 2024_2 -> onTrack = true
        ReconcileStudyPlanRequest recReq = new ReconcileStudyPlanRequest("plan-5", "std-flow-5", "2024_2", 1, "rev-flow-5");
        ReconcileStudyPlanResponse recRes = academicFacade.reconcileStudyPlan(recReq);

        assertThat(recRes.isOnTrack()).isTrue();
        assertThat(recRes.getCompletedCourses()).anyMatch(c -> c.contains("MATH1002"));

        // 2. Kiểm tra điều kiện môn IT6001 (yêu cầu tiên quyết MATH1002 và IT1001) ở kỳ tới 2025_1
        CourseEligibilityRequest eligReq = new CourseEligibilityRequest("std-flow-5", "IT6001", "2025_1", "rev-flow-5");
        CourseEligibilityResponse eligRes = academicFacade.checkCourseEligibility(eligReq);

        assertThat(eligRes.isEligible()).isTrue();
        assertThat(eligRes.getMissingPrerequisites()).isEmpty();
    }

    // =========================================================================
    // 6. Luồng 6: Hồ sơ thiếu dữ liệu, cả 4 chức năng an toàn không tạo kết quả giả
    // =========================================================================
    @Test
    @DisplayName("Luồng 6: Sinh viên thiếu dữ liệu -> Cả 4 chức năng xử lý an toàn, cảnh báo minh bạch, không bịa dữ liệu")
    void testFlow6_MissingDataStrictness_AcrossAllFourFunctions() {
        String missingId = "std-2026-missing";

        // 1. simulateGrades với danh sách rỗng
        SimulateGradesResponse simRes = academicFacade.simulateGrades(new SimulateGradesRequest(missingId, Collections.emptyList(), "rev-6"));
        assertThat(simRes).isNotNull();

        // 2. rankRetakeCourses khi chưa có môn D/C hoàn thành
        RankRetakeCoursesResponse rankRes = academicFacade.rankRetakeCourses(new RankRetakeCoursesRequest(missingId, 5, "rev-6"));
        assertThat(rankRes.getRecommendations()).isEmpty();

        // 3. calculateTargetGrades với hồ sơ sinh viên mới chưa có CPA và tín chỉ
        CalculateTargetGradesResponse targetRes = academicFacade.calculateTargetGrades(new CalculateTargetGradesRequest(missingId, new BigDecimal("3.20"), "2027_1", "rev-6"));
        assertThat(targetRes.getWarnings()).anyMatch(w -> w.contains("Lưu ý: Tổng số tín chỉ các môn học chưa tích lũy trong CTĐT"));

        // Hồ sơ thiếu CPA khi đã có tín chỉ tích lũy -> Cảnh báo thiếu CPA rõ ràng
        StudentProfileFixture studentMissingCpa = new StudentProfileFixture();
        studentMissingCpa.setStudentId("std-missing-cpa");
        studentMissingCpa.setCpa(null);
        studentMissingCpa.setAccumulatedCredits(30.0);
        profiles.put("std-missing-cpa", studentMissingCpa);
        academicFacade = new DefaultAcademicFacade(policy, curriculumIt, profiles);

        CalculateTargetGradesResponse missingCpaRes = academicFacade.calculateTargetGrades(new CalculateTargetGradesRequest("std-missing-cpa", new BigDecimal("3.20"), "2027_1", "rev-6"));
        assertThat(missingCpaRes.getWarnings()).anyMatch(w -> w.contains("Thiếu dữ liệu CPA"));
        assertThat(missingCpaRes.getCourseRequirements()).isEmpty();

        // 4. reconcileStudyPlan với học kỳ không có điểm kết chuyển
        ReconcileStudyPlanResponse recRes = academicFacade.reconcileStudyPlan(new ReconcileStudyPlanRequest("plan-6", missingId, "2099_1", 1, "rev-6"));
        assertThat(recRes.isOnTrack()).isFalse();
        assertThat(recRes.getAdjustmentsRecommended()).anyMatch(a -> a.contains("Không tìm thấy kết quả học tập"));
    }

    // =========================================================================
    // 7. Luồng 7: Các capability đã công bố đều thực thi được theo contract
    // =========================================================================
    @Test
    @DisplayName("Luồng 7: Tất cả 8 capability công bố trong readyCapabilities() đều thực thi thành công theo contract")
    void testFlow7_AllReadyCapabilitiesExecutable() {
        Set<AcademicCapability> ready = academicFacade.readyCapabilities();

        assertThat(ready).containsExactlyInAnyOrder(
                AcademicCapability.GET_ACADEMIC_STATUS,
                AcademicCapability.CHECK_COURSE_ELIGIBILITY,
                AcademicCapability.RUN_GRADUATION_AUDIT,
                AcademicCapability.GENERATE_STUDY_PLAN,
                AcademicCapability.SIMULATE_GRADES,
                AcademicCapability.RANK_RETAKE_COURSES,
                AcademicCapability.CALCULATE_TARGET_GRADES,
                AcademicCapability.RECONCILE_STUDY_PLAN
        );

        // Kiểm tra thực thi cả 8 phương thức
        assertThat(academicFacade.getAcademicStatus(new AcademicStatusRequest("std-2026-001", "rev-7"))).isNotNull();
        assertThat(academicFacade.checkCourseEligibility(new CourseEligibilityRequest("std-2026-001", "IT2001", "2026_1", "rev-7"))).isNotNull();
        assertThat(academicFacade.runGraduationAudit(new GraduationAuditRequest("std-2026-001", "rev-7"))).isNotNull();
        assertThat(academicFacade.generateStudyPlan(new GenerateStudyPlanRequest("std-2026-001", "2026_1", new BigDecimal("3.20"), 20, false, "rev-7"))).isNotNull();
        assertThat(academicFacade.simulateGrades(new SimulateGradesRequest("std-2026-001", Collections.emptyList(), "rev-7"))).isNotNull();
        assertThat(academicFacade.rankRetakeCourses(new RankRetakeCoursesRequest("std-2026-001", 3, "rev-7"))).isNotNull();
        assertThat(academicFacade.calculateTargetGrades(new CalculateTargetGradesRequest("std-2026-001", new BigDecimal("3.20"), "2027_2", "rev-7"))).isNotNull();
        assertThat(academicFacade.reconcileStudyPlan(new ReconcileStudyPlanRequest("plan-2026-9001", "std-2026-001", "2026_1", 1, "rev-7"))).isNotNull();
    }

    // =========================================================================
    // 8. Luồng 8: Các chức năng không làm thay đổi dữ liệu gốc (Immutability)
    // =========================================================================
    @Test
    @DisplayName("Luồng 8: Bảo toàn tính bất biến (Immutability) của hồ sơ sinh viên sau khi gọi cả 4 chức năng")
    void testFlow8_Immutability_ProfilesRemainUnchanged() {
        StudentProfileFixture student = profiles.get("std-2026-001");
        int originalAttemptsCount = student.getCourseAttempts().size();
        BigDecimal originalCpa = student.getCpa();
        Integer originalCredits = student.getAccumulatedCredits();

        // Gọi liên tiếp cả 4 chức năng
        academicFacade.simulateGrades(new SimulateGradesRequest("std-2026-001", List.of(new SimulatedCourseGrade("IT6002", 3, "A", new BigDecimal("4.0"))), "rev-8"));
        academicFacade.rankRetakeCourses(new RankRetakeCoursesRequest("std-2026-001", 5, "rev-8"));
        academicFacade.calculateTargetGrades(new CalculateTargetGradesRequest("std-2026-001", new BigDecimal("3.20"), "2027_2", "rev-8"));
        academicFacade.reconcileStudyPlan(new ReconcileStudyPlanRequest("plan-2026-9001", "std-2026-001", "2026_1", 1, "rev-8"));

        // Xác minh hồ sơ sinh viên không bị thay đổi
        assertThat(student.getCourseAttempts().size()).isEqualTo(originalAttemptsCount);
        assertThat(student.getCpa()).isEqualByComparingTo(originalCpa);
        assertThat(student.getAccumulatedCredits()).isEqualTo(originalCredits);
    }

    // =========================================================================
    // 9. Luồng 9: Kết quả ổn định khi gọi lặp lại cùng đầu vào (Determinism)
    // =========================================================================
    @Test
    @DisplayName("Luồng 9: Tính đơn định tuyệt đối qua 50 lần gọi liên tiếp với cùng tham số")
    void testFlow9_Determinism_Across50Invocations() {
        SimulateGradesRequest simReq = new SimulateGradesRequest("2024604757", List.of(new SimulatedCourseGrade("LP6004", 2, "B", new BigDecimal("3.0"))), "rev-9");
        RankRetakeCoursesRequest rankReq = new RankRetakeCoursesRequest("2024604757", 5, "rev-9");
        CalculateTargetGradesRequest targetReq = new CalculateTargetGradesRequest("2024604757", new BigDecimal("3.40"), "2027_2", "rev-9");
        ReconcileStudyPlanRequest recReq = new ReconcileStudyPlanRequest("plan-2024604757-v1", "2024604757", "2024_2", 1, "rev-9");

        SimulateGradesResponse baseSim = academicFacade.simulateGrades(simReq);
        RankRetakeCoursesResponse baseRank = academicFacade.rankRetakeCourses(rankReq);
        CalculateTargetGradesResponse baseTarget = academicFacade.calculateTargetGrades(targetReq);
        ReconcileStudyPlanResponse baseRec = academicFacade.reconcileStudyPlan(recReq);

        for (int i = 0; i < 50; i++) {
            SimulateGradesResponse sim = academicFacade.simulateGrades(simReq);
            RankRetakeCoursesResponse rank = academicFacade.rankRetakeCourses(rankReq);
            CalculateTargetGradesResponse target = academicFacade.calculateTargetGrades(targetReq);
            ReconcileStudyPlanResponse rec = academicFacade.reconcileStudyPlan(recReq);

            assertThat(sim.getProjectedCpa()).isEqualByComparingTo(baseSim.getProjectedCpa());
            assertThat(sim.getCpaDelta()).isEqualByComparingTo(baseSim.getCpaDelta());

            assertThat(rank.getRecommendations().size()).isEqualTo(baseRank.getRecommendations().size());
            for (int j = 0; j < rank.getRecommendations().size(); j++) {
                assertThat(rank.getRecommendations().get(j).getCourseCode())
                        .isEqualTo(baseRank.getRecommendations().get(j).getCourseCode());
                assertThat(rank.getRecommendations().get(j).getPotentialCpaGain())
                        .isEqualByComparingTo(baseRank.getRecommendations().get(j).getPotentialCpaGain());
            }

            assertThat(target.getRequiredAverageGpa()).isEqualByComparingTo(baseTarget.getRequiredAverageGpa());
            assertThat(target.getCourseRequirements().size()).isEqualTo(baseTarget.getCourseRequirements().size());

            assertThat(rec.isOnTrack()).isEqualTo(baseRec.isOnTrack());
            assertThat(rec.getMissedOrFailedCourses()).containsExactlyElementsOf(baseRec.getMissedOrFailedCourses());
            assertThat(rec.getCompletedCourses()).containsExactlyElementsOf(baseRec.getCompletedCourses());
        }
    }

    // =========================================================================
    // 10. Luồng 10: Trường hợp biên học lại F nhiều lần (Multi-attempt F)
    // =========================================================================
    @Test
    @DisplayName("Luồng 10: Môn F học lại nhiều lần (F -> F -> B) -> Mẫu số CPA chỉ tính 1 lần duy nhất, không nhân ba")
    void testFlow10_MultiAttemptFailedCourse_CreditsCountedOnlyOnceInCpa() {
        // Sinh viên học IT1001 (3 TC): Kỳ 1 bị F (0.0), Kỳ 2 vẫn bị F (0.0). Tổng điểm trọng số = 60.0, mẫu số CPA = 30 TC -> CPA = 2.00
        StudentProfileFixture.CourseAttempt a1 = createAttempt("IT1001", "Nhập môn lập trình", 3, "2024_1", "F", 0.0, false);
        StudentProfileFixture.CourseAttempt a2 = createAttempt("IT1001", "Nhập môn lập trình", 3, "2024_2", "F", 0.0, false);

        StudentProfileFixture student = new StudentProfileFixture();
        student.setStudentId("std-multi-f");
        student.setCpa(new BigDecimal("2.00"));
        student.setAccumulatedCredits(30.0);
        student.setCourseAttempts(List.of(a1, a2));
        profiles.put("std-multi-f", student);
        academicFacade = new DefaultAcademicFacade(policy, curriculumIt, profiles);

        // Mô phỏng lần học thứ 3 đạt B (3.0)
        SimulatedCourseGrade sim = new SimulatedCourseGrade("IT1001", 3, "B", new BigDecimal("3.0"));
        SimulateGradesResponse res = academicFacade.simulateGrades(new SimulateGradesRequest("std-multi-f", List.of(sim), "rev-10"));

        // Tử số tăng 3.0 * 3 = 9.0 -> 60.0 + 9.0 = 69.0
        // Mẫu số: vẫn là 30 TC (không bị cộng thành 33 hay 36 TC)
        // CPA mới = 69.0 / 30 = 2.30. Delta = +0.30
        assertThat(res.getProjectedCpa()).isEqualByComparingTo(new BigDecimal("2.30"));
        assertThat(res.getCpaDelta()).isEqualByComparingTo(new BigDecimal("0.30"));
    }
}
