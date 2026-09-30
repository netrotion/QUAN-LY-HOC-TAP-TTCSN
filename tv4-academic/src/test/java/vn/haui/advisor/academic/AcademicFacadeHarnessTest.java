package vn.haui.advisor.academic;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.academic.fixture.AcademicFixtures;
import vn.haui.advisor.academic.service.DefaultAcademicFacade;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.AcademicFacade;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Task 1.3b: AcademicFacade Test Harness (TV4)")
public class AcademicFacadeHarnessTest {

    private AcademicFacade academicFacade;

    @BeforeEach
    void setUp() {
        academicFacade = new DefaultAcademicFacade();
    }

    @Test
    @DisplayName("1. getAcademicStatus: Sinh viên cảnh báo học vụ mức 1 và bảo toàn GPA = null khi chưa có điểm kỳ")
    void testGetAcademicStatus_WarningStudent() {
        AcademicStatusRequest req = new AcademicStatusRequest("std-2026-001", "rev-1001");
        AcademicStatusResponse res = academicFacade.getAcademicStatus(req);

        assertThat(res).isNotNull();
        assertThat(res.getStudentId()).isEqualTo("std-2026-001");
        assertThat(res.getCpa()).isEqualByComparingTo(new BigDecimal("2.45"));

        // RÀNG BUỘC BẮT BUỘC: GPA chưa kết chuyển phải là null, TUYỆT ĐỐI không gán = 0.0
        assertThat(res.getGpa()).isNull();

        assertThat(res.getAccumulatedCredits()).isEqualTo(68);
        assertThat(res.getRiskLevel()).isEqualTo(AcademicRiskLevel.WARNING_LEVEL_1);
        assertThat(res.getWarningMessages()).isNotEmpty();
    }

    @Test
    @DisplayName("2. getAcademicStatus: Sinh viên bình thường (NORMAL)")
    void testGetAcademicStatus_NormalStudent() {
        AcademicStatusRequest req = new AcademicStatusRequest("std-2026-002", "rev-2001");
        AcademicStatusResponse res = academicFacade.getAcademicStatus(req);

        assertThat(res).isNotNull();
        assertThat(res.getStudentId()).isEqualTo("std-2026-002");
        assertThat(res.getCpa()).isEqualByComparingTo(new BigDecimal("3.25"));
        assertThat(res.getGpa()).isEqualByComparingTo(new BigDecimal("3.50"));
        assertThat(res.getRiskLevel()).isEqualTo(AcademicRiskLevel.NORMAL);
    }

    @Test
    @DisplayName("3. checkCourseEligibility: Môn học đủ điều kiện tiên quyết")
    void testCheckCourseEligibility_Eligible() {
        // IT2001 yêu cầu tiên quyết IT1001 (std-2026-001 đã đạt điểm B)
        CourseEligibilityRequest req = new CourseEligibilityRequest("std-2026-001", "IT2001", "2026_1", "rev-1001");
        CourseEligibilityResponse res = academicFacade.checkCourseEligibility(req);

        assertThat(res.isEligible()).isTrue();
        assertThat(res.getMissingPrerequisites()).isEmpty();
    }

    @Test
    @DisplayName("4. checkCourseEligibility: Chặn môn học do trượt môn tiên quyết (Toán rời rạc bị F)")
    void testCheckCourseEligibility_IneligibleDueToFailedPrerequisite() {
        // IT6001 yêu cầu MATH1002 và IT1001. Std-2026-001 trượt MATH1002 (điểm F)
        CourseEligibilityRequest req = new CourseEligibilityRequest("std-2026-001", "IT6001", "2026_1", "rev-1001");
        CourseEligibilityResponse res = academicFacade.checkCourseEligibility(req);

        assertThat(res.isEligible()).isFalse();
        assertThat(res.getMissingPrerequisites()).anyMatch(msg -> msg.contains("MATH1002"));
    }

    @Test
    @DisplayName("5. generateStudyPlan: Tạo lộ trình ưu tiên gỡ nợ môn tiên quyết (Trọng số 40% PRD §13.1)")
    void testGenerateStudyPlan_PrioritizesPrerequisites() {
        GenerateStudyPlanRequest req = new GenerateStudyPlanRequest(
                "std-2026-001", "2026_1", new BigDecimal("3.00"), 20, false, "rev-1001"
        );
        GenerateStudyPlanResponse res = academicFacade.generateStudyPlan(req);

        assertThat(res).isNotNull();
        assertThat(res.getStatus()).isEqualTo(StudyPlanStatus.DRAFT);
        assertThat(res.getSemesters()).isNotEmpty();

        PlannedSemesterItem sem = res.getSemesters().get(0);
        assertThat(sem.getCourses()).isNotEmpty();
        // Kiểm tra môn nợ tiên quyết MATH1002 được đưa vào lộ trình đầu tiên
        assertThat(sem.getCourses().get(0).getCourseCode()).isEqualTo("MATH1002");
        assertThat(sem.getCourses().get(0).getRationale()).contains("40%");
    }

    @Test
    @DisplayName("6. validateStudyPlan: Phát hiện vi phạm hạn mức tín chỉ tối thiểu (< 10 TC)")
    void testValidateStudyPlan_CreditLimitViolations() {
        // Semester chỉ có 3 TC (< 10 TC theo BR-03)
        PlannedSemesterItem invalidSem = new PlannedSemesterItem(
                "2026_1", "Kỳ 1",
                List.of(new PlannedCourseItem("MATH1002", "Toán rời rạc", 3, "B", "Học lại")),
                3, new BigDecimal("3.00")
        );

        ValidateStudyPlanRequest req = new ValidateStudyPlanRequest("plan-001", "std-2026-001", List.of(invalidSem), 1, "rev-1001");
        ValidateStudyPlanResponse res = academicFacade.validateStudyPlan(req);

        assertThat(res.isValid()).isFalse();
        assertThat(res.getStatus()).isEqualTo(StudyPlanStatus.DRAFT);
        assertThat(res.getViolations()).anyMatch(v -> v.contains("nhỏ hơn hạn mức tối thiểu"));
    }

    @Test
    @DisplayName("7. simulateGrades: Mô phỏng What-if với BigDecimal chính xác")
    void testSimulateGrades_Precision() {
        List<SimulatedCourseGrade> simCourses = List.of(
                new SimulatedCourseGrade("IT6001", 4, "A", new BigDecimal("4.0")),
                new SimulatedCourseGrade("IT6002", 3, "A", new BigDecimal("4.0"))
        );
        SimulateGradesRequest req = new SimulateGradesRequest("std-2026-001", simCourses, "rev-1001");
        SimulateGradesResponse res = academicFacade.simulateGrades(req);

        assertThat(res).isNotNull();
        assertThat(res.getCurrentCpa()).isEqualByComparingTo(new BigDecimal("2.45"));
        assertThat(res.getProjectedNewCpa()).isGreaterThan(res.getCurrentCpa());
        assertThat(res.getCpaDifference()).isEqualByComparingTo(res.getProjectedNewCpa().subtract(res.getCurrentCpa()));
    }

    @Test
    @DisplayName("8. rankRetakeCourses: Xếp hạng học cải thiện theo ROI CPA gain")
    void testRankRetakeCourses_RoiRanking() {
        RankRetakeCoursesRequest req = new RankRetakeCoursesRequest("std-2026-001", 5, "rev-1001");
        RankRetakeCoursesResponse res = academicFacade.rankRetakeCourses(req);

        assertThat(res.getRecommendations()).isNotEmpty();
        // Môn 4 tín chỉ điểm D+ (IT2001) có ROI kéo CPA lớn nhất
        RetakeCourseRecommendation topRank = res.getRecommendations().get(0);
        assertThat(topRank.getRank()).isEqualTo(1);
        assertThat(topRank.getCourseCode()).isEqualTo("IT2001");
        assertThat(topRank.getPotentialCpaGain()).isGreaterThan(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("9. calculateTargetGrades: Tính GPA mục tiêu cần đạt cho các kỳ còn lại")
    void testCalculateTargetGrades() {
        CalculateTargetGradesRequest req = new CalculateTargetGradesRequest(
                "std-2026-001", new BigDecimal("3.20"), "2027_2", "rev-1001"
        );
        CalculateTargetGradesResponse res = academicFacade.calculateTargetGrades(req);

        assertThat(res).isNotNull();
        assertThat(res.getRequiredAverageGpa()).isNotNull();
        assertThat(res.getRemainingCredits()).isEqualTo(67);
        assertThat(res.getCourseRequirements()).isNotEmpty();
    }

    @Test
    @DisplayName("10. runGraduationAudit: Rà soát tốt nghiệp, tách bạch chuẩn phi tín chỉ thành action")
    void testRunGraduationAudit() {
        GraduationAuditRequest req = new GraduationAuditRequest("std-2026-003", "rev-3001");
        GraduationAuditResponse res = academicFacade.runGraduationAudit(req);

        assertThat(res).isNotNull();
        assertThat(res.getCompletedPercentage()).isEqualTo(82);
        assertThat(res.isEligibleForGraduation()).isFalse(); // Chưa đủ tín chỉ và thiếu MOS

        // Chuẩn đầu ra Tin học MOS phải xuất hiện trong pendingActions chứ không phải môn học có tín chỉ
        assertThat(res.getPendingActions()).anyMatch(a -> "MOS".equalsIgnoreCase(a.getCertificateType()));
    }

    @Test
    @DisplayName("11. reconcileStudyPlan: Đối chiếu kết quả thực tế với kế hoạch học tập")
    void testReconcileStudyPlan() {
        ReconcileStudyPlanRequest req = new ReconcileStudyPlanRequest("plan-2026-9001", "std-2026-001", "2026_1", 1, "rev-1002");
        ReconcileStudyPlanResponse res = academicFacade.reconcileStudyPlan(req);

        assertThat(res).isNotNull();
        assertThat(res.isOnTrack()).isTrue();
        assertThat(res.getCompletedCourses()).isNotEmpty();
    }
}
