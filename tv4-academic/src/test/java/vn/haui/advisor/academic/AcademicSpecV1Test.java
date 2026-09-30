package vn.haui.advisor.academic;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.academic.fixture.AcademicFixtures;
import vn.haui.advisor.academic.model.CurriculumFixture;
import vn.haui.advisor.academic.model.PolicyDemo;
import vn.haui.advisor.academic.model.StudentProfileFixture;
import vn.haui.advisor.academic.service.DefaultAcademicFacade;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.AcademicFacade;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * ĐẶC TẢ CÔNG CỤ CHẠY ĐƯỢC BẰNG TEST (Academic Spec V1)
 * 
 * Phạm vi: Toàn bộ 9 capabilities của AcademicFacade theo hợp đồng V1
 * Dữ liệu kiểm thử: Dữ liệu thật HaUI CT1085 (150 TC, 120 môn) & hồ sơ sinh viên thực 2024604757
 * 
 * Các nguyên tắc bắt buộc:
 * 1. TÁCH BIỆT RÀNG BUỘC CỨNG (Hard constraints) và THANG ĐIỂM TỐI ƯU (Scoring 40/25/20/15).
 * 2. Kịch bản: Điều kiện học kỳ tương lai (Chained Prerequisites), học vượt (tối đa 24 TC),
 *    học kỳ hè (tối đa 12 TC), giới hạn cảnh báo học tập (tối đa 14 TC).
 * 3. Xử lý thiếu dữ kiện: Missing data -> NULL / UNKNOWN, TUYỆT ĐỐI KHÔNG gán điểm = 0 hay coi là đạt.
 * 4. Quy chế chưa kiểm chứng: Gắn nhãn DEMO_UNVERIFIED.
 */
@DisplayName("Academic Spec V1 - Đặc tả kiểm thử 9 Capabilities của AcademicFacade")
class AcademicSpecV1Test {

    private AcademicFacade academicFacade;
    private PolicyDemo policy;
    private CurriculumFixture curriculumKTPM;
    private Map<String, StudentProfileFixture> profiles;

    @BeforeEach
    void setUp() {
        policy = AcademicFixtures.getPolicyDemo();
        curriculumKTPM = AcademicFixtures.getCurriculumV1();
        profiles = AcademicFixtures.getStudentProfiles();
        academicFacade = new DefaultAcademicFacade(policy, curriculumKTPM, profiles);
    }

    // =========================================================================
    // CAPABILITY 1: getAcademicStatus
    // =========================================================================
    @Nested
    @DisplayName("Capability 1: getAcademicStatus - Đánh giá trạng thái học vụ")
    class Capability1AcademicStatusSpec {

        @Test
        @DisplayName("1.1 Dữ liệu thực: Sinh viên 2024604757 (61 TC, CPA 3.18, GPA 3.42, 150 TC chuẩn CT1085)")
        void testGetAcademicStatus_RealStudent_2024604757() {
            AcademicStatusRequest req = new AcademicStatusRequest("2024604757", "rev-ktpm-v1");
            AcademicStatusResponse res = academicFacade.getAcademicStatus(req);

            assertThat(res).isNotNull();
            assertThat(res.getStudentId()).isEqualTo("2024604757");
            assertThat(res.getCpa()).isEqualByComparingTo(new BigDecimal("3.18"));
            assertThat(res.getGpa()).isEqualByComparingTo(new BigDecimal("3.42"));
            assertThat(res.getAccumulatedCredits()).isEqualTo(61);
            assertThat(res.getTotalCreditsRequired()).isEqualTo(150);
            assertThat(res.getRiskLevel()).isEqualTo(AcademicRiskLevel.NORMAL);
        }

        @Test
        @DisplayName("1.2 Sinh viên cảnh báo học tập: CPA 1.35 Năm 2 -> Cảnh báo mức 1 (CPA < 1.40)")
        void testGetAcademicStatus_WarningStudent() {
            AcademicStatusRequest req = new AcademicStatusRequest("std-warning-real", "rev-ktpm-v1");
            AcademicStatusResponse res = academicFacade.getAcademicStatus(req);

            assertThat(res).isNotNull();
            assertThat(res.getStudentId()).isEqualTo("std-warning-real");
            assertThat(res.getCpa()).isEqualByComparingTo(new BigDecimal("1.35"));
            assertThat(res.getRiskLevel()).isEqualTo(AcademicRiskLevel.WARNING_LEVEL_1);
            assertThat(res.getWarningMessages()).anyMatch(w -> w.contains("14 tín chỉ") || w.contains("CPA"));
        }

        @Test
        @DisplayName("1.3 Ràng buộc nghiêm ngặt: Dữ liệu thiếu/chưa kết chuyển -> Giữ NULL, KHÔNG gán điểm = 0")
        void testGetAcademicStatus_MissingData_PreservesNull() {
            AcademicStatusRequest req = new AcademicStatusRequest("std-missing-unknown-v1", "rev-ktpm-v1");
            AcademicStatusResponse res = academicFacade.getAcademicStatus(req);

            assertThat(res).isNotNull();
            assertThat(res.getGpa()).as("GPA khi chưa kết chuyển điểm phải là null").isNull();
            assertThat(res.getCpa()).as("CPA khi chưa có điểm kết chuyển phải là null").isNull();
            assertThat(res.getAccumulatedCredits()).as("Tín chỉ tích lũy khi chưa kết chuyển phải là null, không mặc định là 0").isNull();
        }
    }

    // =========================================================================
    // CAPABILITY 2: checkCourseEligibility
    // =========================================================================
    @Nested
    @DisplayName("Capability 2: checkCourseEligibility - Kiểm tra điều kiện tiên quyết & học trước")
    class Capability2CourseEligibilitySpec {

        @Test
        @DisplayName("2.1 Đủ điều kiện: Sinh viên đã đạt các môn học trước LP6010, LP6011 -> Được đăng ký LP6013")
        void testCheckCourseEligibility_EligibleWhenPriorCourseSatisfied() {
            CourseEligibilityRequest req = new CourseEligibilityRequest("2024604757", "LP6013", "2025_1", "rev-ktpm-v1");
            CourseEligibilityResponse res = academicFacade.checkCourseEligibility(req);

            assertThat(res).isNotNull();
            assertThat(res.isEligible()).isTrue();
            assertThat(res.getMissingPrerequisites()).isEmpty();
        }

        @Test
        @DisplayName("2.2 Ràng buộc cứng: Chặn làm Khóa luận tốt nghiệp (IT6130) do chưa đủ >= 85% CTĐT (128/150 TC)")
        void testCheckCourseEligibility_BlocksThesisWhenUnder85PercentCredits() {
            CourseEligibilityRequest req = new CourseEligibilityRequest("2024604757", "IT6130", "2025_1", "rev-ktpm-v1");
            CourseEligibilityResponse res = academicFacade.checkCourseEligibility(req);

            assertThat(res).isNotNull();
            assertThat(res.isEligible()).isFalse();
            assertThat(res.getMissingPrerequisites())
                    .anyMatch(msg -> msg.contains("128 TC") || msg.contains("85%"));
        }

        @Test
        @DisplayName("2.3 Chưa học môn học trước: Chưa học BS6001 -> Chặn đăng ký IT6035 (Toán rời rạc)")
        void testCheckCourseEligibility_IneligibleWhenPriorCourseNotAttempted() {
            CourseEligibilityRequest req = new CourseEligibilityRequest("std-warning-real", "IT6035", "2025_1", "rev-ktpm-v1");
            CourseEligibilityResponse res = academicFacade.checkCourseEligibility(req);

            assertThat(res).isNotNull();
            assertThat(res.isEligible()).isFalse();
            assertThat(res.getMissingPrerequisites()).anyMatch(msg -> msg.contains("BS6001"));
        }

        @Test
        @DisplayName("2.4 Xử lý thiếu dữ liệu: Môn tiên quyết mang trạng thái UNKNOWN -> Không coi là đạt")
        void testCheckCourseEligibility_MissingPrerequisiteResult_ReturnsUnknown() {
            CourseEligibilityRequest req = new CourseEligibilityRequest("std-missing-unknown-v1", "FL6288", "2025_1", "rev-ktpm-v1");
            CourseEligibilityResponse res = academicFacade.checkCourseEligibility(req);

            assertThat(res).isNotNull();
            assertThat(res.isEligible()).isFalse();
            assertThat(res.getMissingPrerequisites()).isNotEmpty();
        }
    }

    // =========================================================================
    // CAPABILITY 3: generateStudyPlan
    // =========================================================================
    @Nested
    @DisplayName("Capability 3: generateStudyPlan - Lập kế hoạch học tập theo Hard Constraints & Scoring 40/25/20/15")
    class Capability3GenerateStudyPlanSpec {

        @Test
        @DisplayName("3.1 Ràng buộc cứng: Sinh viên cảnh báo học tập bị giới hạn cứng tối đa 14 TC/kỳ (REG-HAUI-02)")
        void testGenerateStudyPlan_WarningStudent_CappedAt14Credits() {
            GenerateStudyPlanRequest req = new GenerateStudyPlanRequest(
                    "std-warning-real", "2027_1", new BigDecimal("2.50"), 24, false, "rev-ktpm-v1"
            );
            GenerateStudyPlanResponse res = academicFacade.generateStudyPlan(req);

            assertThat(res).isNotNull();
            assertThat(res.getSemesters()).isNotEmpty();
            for (PlannedSemesterItem sem : res.getSemesters()) {
                assertThat(sem.getTotalCredits())
                        .as("Kỳ học của sinh viên bị cảnh báo không được vượt quá 14 TC")
                        .isLessThanOrEqualTo(14);
            }
            assertThat(res.getWarnings()).anyMatch(w -> w.contains("14 tín chỉ"));
        }

        @Test
        @DisplayName("3.2 Kịch bản học kỳ hè: Tối đa 12 tín chỉ khi includeSummerSemesters = true")
        void testGenerateStudyPlan_IncludesSummerSemester_CappedAt12Credits() {
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
        @DisplayName("3.3 Kịch bản học vượt: Cho phép đăng ký lên tới 24 TC ở kỳ chính cho sinh viên bình thường")
        void testGenerateStudyPlan_AcceleratedPlan_UpTo24Credits() {
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
        @DisplayName("3.4 Chained Prerequisites: Môn học kỳ 2 mở khóa dựa trên giả định môn kỳ 1 đã đạt")
        void testGenerateStudyPlan_ChainedPrerequisitesProgression() {
            GenerateStudyPlanRequest req = new GenerateStudyPlanRequest(
                    "2024604757", "2027_1", new BigDecimal("3.50"), 20, false, "rev-ktpm-v1"
            );
            GenerateStudyPlanResponse res = academicFacade.generateStudyPlan(req);

            assertThat(res).isNotNull();
            assertThat(res.getSemesters().size()).isGreaterThanOrEqualTo(2);
            PlannedSemesterItem sem1 = res.getSemesters().get(0);
            PlannedSemesterItem sem2 = res.getSemesters().get(1);

            // Các môn ở sem2 không trùng lặp các môn ở sem1
            List<String> sem1Codes = sem1.getCourses().stream().map(PlannedCourseItem::getCourseCode).toList();
            List<String> sem2Codes = sem2.getCourses().stream().map(PlannedCourseItem::getCourseCode).toList();
            assertThat(Collections.disjoint(sem1Codes, sem2Codes)).isTrue();
        }

        @Test
        @DisplayName("3.5 Thang điểm tối ưu 40/25/20/15: Ưu tiên gỡ nợ môn F và môn mở khóa tiên quyết")
        void testGenerateStudyPlan_OptimizationScoringPriorities() {
            GenerateStudyPlanRequest req = new GenerateStudyPlanRequest(
                    "2024604757", "2027_1", new BigDecimal("3.50"), 20, false, "rev-ktpm-v1"
            );
            GenerateStudyPlanResponse res = academicFacade.generateStudyPlan(req);

            PlannedSemesterItem sem1 = res.getSemesters().get(0);
            // Môn nợ LP6004 hoặc môn tiên quyết quan trọng phải được lập lịch với rationale nêu rõ trọng số
            assertThat(sem1.getCourses()).anyMatch(c -> c.getRationale().contains("tiên quyết") || c.getRationale().contains("progression"));
        }
    }

    // =========================================================================
    // CAPABILITY 4: validateStudyPlan
    // =========================================================================
    @Nested
    @DisplayName("Capability 4: validateStudyPlan - Thẩm định vi phạm ràng buộc cứng kế hoạch học tập")
    class Capability4ValidateStudyPlanSpec {

        @Test
        @DisplayName("4.1 Vi phạm sàn: Kỳ chính dưới 10 TC -> Không hợp lệ")
        void testValidateStudyPlan_ViolatesMinCreditFloor() {
            PlannedSemesterItem sem = new PlannedSemesterItem("2025_1", "Học kỳ 1", Collections.emptyList(), 8, new BigDecimal("3.00"));
            ValidateStudyPlanRequest req = new ValidateStudyPlanRequest("p-1", "2024604757", List.of(sem), 1, "rev-ktpm-v1");
            ValidateStudyPlanResponse res = academicFacade.validateStudyPlan(req);

            assertThat(res.isValid()).isFalse();
            assertThat(res.getViolations()).anyMatch(v -> v.contains("10 TC"));
        }

        @Test
        @DisplayName("4.2 Vi phạm trần: Kỳ chính vượt quá 24 TC -> Không hợp lệ")
        void testValidateStudyPlan_ViolatesMaxCreditCap() {
            PlannedSemesterItem sem = new PlannedSemesterItem("2025_1", "Học kỳ 1", Collections.emptyList(), 26, new BigDecimal("3.00"));
            ValidateStudyPlanRequest req = new ValidateStudyPlanRequest("p-2", "2024604757", List.of(sem), 1, "rev-ktpm-v1");
            ValidateStudyPlanResponse res = academicFacade.validateStudyPlan(req);

            assertThat(res.isValid()).isFalse();
            assertThat(res.getViolations()).anyMatch(v -> v.contains("24 TC"));
        }

        @Test
        @DisplayName("4.3 Vi phạm trần kỳ hè: Kỳ hè vượt quá 12 TC -> Không hợp lệ")
        void testValidateStudyPlan_ViolatesSummerCreditCap() {
            PlannedSemesterItem sem = new PlannedSemesterItem("2025_SUMMER", "Học kỳ hè", Collections.emptyList(), 15, new BigDecimal("3.00"));
            ValidateStudyPlanRequest req = new ValidateStudyPlanRequest("p-3", "2024604757", List.of(sem), 1, "rev-ktpm-v1");
            ValidateStudyPlanResponse res = academicFacade.validateStudyPlan(req);

            assertThat(res.isValid()).isFalse();
            assertThat(res.getViolations()).anyMatch(v -> v.contains("12 tín chỉ"));
        }

        @Test
        @DisplayName("4.4 Vi phạm cảnh báo: Sinh viên cảnh báo học tập đăng ký 16 TC (> 14 TC) -> Không hợp lệ")
        void testValidateStudyPlan_ViolatesWarningStudentCap() {
            PlannedSemesterItem sem = new PlannedSemesterItem("2025_1", "Học kỳ 1", Collections.emptyList(), 16, new BigDecimal("2.50"));
            ValidateStudyPlanRequest req = new ValidateStudyPlanRequest("p-4", "std-warning-real", List.of(sem), 1, "rev-ktpm-v1");
            ValidateStudyPlanResponse res = academicFacade.validateStudyPlan(req);

            assertThat(res.isValid()).isFalse();
            assertThat(res.getViolations()).anyMatch(v -> v.contains("14 tín chỉ"));
        }

        @Test
        @DisplayName("4.5 Kế hoạch hợp lệ: 18 TC kỳ chính cho sinh viên bình thường -> VALIDATED")
        void testValidateStudyPlan_ValidPlan() {
            PlannedSemesterItem sem = new PlannedSemesterItem("2025_1", "Học kỳ 1", Collections.emptyList(), 18, new BigDecimal("3.50"));
            ValidateStudyPlanRequest req = new ValidateStudyPlanRequest("p-5", "2024604757", List.of(sem), 1, "rev-ktpm-v1");
            ValidateStudyPlanResponse res = academicFacade.validateStudyPlan(req);

            assertThat(res.isValid()).isTrue();
            assertThat(res.getStatus()).isEqualTo(StudyPlanStatus.VALIDATED);
            assertThat(res.getViolations()).isEmpty();
        }
    }

    // =========================================================================
    // CAPABILITY 5: simulateGrades
    // =========================================================================
    @Nested
    @DisplayName("Capability 5: simulateGrades - Giả lập điểm & biến thiên CPA")
    class Capability5SimulateGradesSpec {

        @Test
        @DisplayName("5.1 Giả lập 3 môn đạt A (4.0) cho sinh viên 2024604757 (61 TC, CPA 3.18) -> Tăng CPA lên 3.29")
        void testSimulateGrades_AccurateCpaProjection() {
            List<SimulatedCourseGrade> simCourses = List.of(
                    new SimulatedCourseGrade("IT6015", 3, "A", new BigDecimal("4.0")),
                    new SimulatedCourseGrade("IT6035", 3, "A", new BigDecimal("4.0")),
                    new SimulatedCourseGrade("IT6095", 3, "A", new BigDecimal("4.0"))
            );

            SimulateGradesRequest req = new SimulateGradesRequest("2024604757", simCourses, "rev-ktpm-v1");
            SimulateGradesResponse res = academicFacade.simulateGrades(req);

            assertThat(res).isNotNull();
            assertThat(res.getCurrentCpa()).isEqualByComparingTo(new BigDecimal("3.18"));
            // CPA mới: (3.18 * 61 + 4.0 * 9) / 70 = (193.98 + 36.0) / 70 = 229.98 / 70 = 3.2854 -> 3.29
            assertThat(res.getProjectedNewCpa()).isEqualByComparingTo(new BigDecimal("3.29"));
            assertThat(res.getCpaDifference()).isEqualByComparingTo(new BigDecimal("0.11"));
            assertThat(res.getProjectedSemesterGpa()).isEqualByComparingTo(new BigDecimal("4.00"));
        }
    }

    // =========================================================================
    // CAPABILITY 6: rankRetakeCourses
    // =========================================================================
    @Nested
    @DisplayName("Capability 6: rankRetakeCourses - Xếp hạng môn học cải thiện theo ROI CPA")
    class Capability6RankRetakeCoursesSpec {

        @Test
        @DisplayName("6.1 Sinh viên 2024604757: Phát hiện các môn điểm D+ (LP6010, LP6012) và C (LP6011), xếp hạng theo ROI")
        void testRankRetakeCourses_DetectsLowGradesAndRanksByRoi() {
            RankRetakeCoursesRequest req = new RankRetakeCoursesRequest("2024604757", 5, "rev-ktpm-v1");
            RankRetakeCoursesResponse res = academicFacade.rankRetakeCourses(req);

            assertThat(res).isNotNull();
            assertThat(res.getRecommendations()).isNotEmpty();

            // LP6010 (điểm D+, 3 TC) có biên độ và số tín chỉ lớn hơn LP6012 (D+, 2 TC) -> xếp hạng 1
            RetakeCourseRecommendation top1 = res.getRecommendations().get(0);
            assertThat(top1.getCourseCode()).isEqualTo("LP6010");
            assertThat(top1.getCurrentGrade()).isEqualTo("D+");
            assertThat(top1.getTargetGrade()).isEqualTo("A");
            assertThat(top1.getPotentialCpaGain()).isGreaterThan(BigDecimal.ZERO);
        }
    }

    // =========================================================================
    // CAPABILITY 7: calculateTargetGrades
    // =========================================================================
    @Nested
    @DisplayName("Capability 7: calculateTargetGrades - Tính toán mục tiêu GPA các kỳ còn lại")
    class Capability7CalculateTargetGradesSpec {

        @Test
        @DisplayName("7.1 Mục tiêu CPA 3.60 (Xuất sắc) cho sinh viên 2024604757 còn 89 TC -> Yêu cầu GPA 3.89")
        void testCalculateTargetGrades_FeasibleTarget() {
            CalculateTargetGradesRequest req = new CalculateTargetGradesRequest(
                    "2024604757", new BigDecimal("3.60"), "2027_2", "rev-ktpm-v1"
            );
            CalculateTargetGradesResponse res = academicFacade.calculateTargetGrades(req);

            assertThat(res).isNotNull();
            assertThat(res.getRemainingCredits()).isEqualTo(89); // 150 - 61 = 89 TC
            assertThat(res.getRequiredAverageGpa()).isNotNull();
            // (3.60 * 150 - 3.18 * 61) / 89 = (540 - 193.98) / 89 = 346.02 / 89 = 3.8878 -> 3.89
            assertThat(res.getRequiredAverageGpa()).isEqualByComparingTo(new BigDecimal("3.89"));
            assertThat(res.getFeasibilityWarnings()).anyMatch(w -> w.contains("thử thách") || w.contains("3.89"));
        }

        @Test
        @DisplayName("7.2 Mục tiêu CPA không khả thi (> 4.00) -> Cảnh báo toán học không thể đạt")
        void testCalculateTargetGrades_ImpossibleTarget_EmitsWarning() {
            CalculateTargetGradesRequest req = new CalculateTargetGradesRequest(
                    "2024604757", new BigDecimal("3.95"), "2027_2", "rev-ktpm-v1"
            );
            CalculateTargetGradesResponse res = academicFacade.calculateTargetGrades(req);

            assertThat(res).isNotNull();
            assertThat(res.getRequiredAverageGpa()).isGreaterThan(new BigDecimal("4.00"));
            assertThat(res.getFeasibilityWarnings()).anyMatch(w -> w.contains("không khả thi") || w.contains("> 4.00"));
        }
    }

    // =========================================================================
    // CAPABILITY 8: runGraduationAudit
    // =========================================================================
    @Nested
    @DisplayName("Capability 8: runGraduationAudit - Rà soát điều kiện tốt nghiệp & chuẩn phi tín chỉ")
    class Capability8GraduationAuditSpec {

        @Test
        @DisplayName("8.1 Sinh viên năm 2 (2024604757): Đạt 61/150 TC (40%) -> Chưa đủ điều kiện tốt nghiệp")
        void testRunGraduationAudit_UndergraduateStudent_NotEligible() {
            GraduationAuditRequest req = new GraduationAuditRequest("2024604757", "rev-ktpm-v1");
            GraduationAuditResponse res = academicFacade.runGraduationAudit(req);

            assertThat(res).isNotNull();
            assertThat(res.isEligibleForGraduation()).isFalse();
            assertThat(res.getTotalCreditsRequired()).isEqualTo(150);
            assertThat(res.getTotalCreditsEarned()).isEqualTo(61);
            assertThat(res.getCompletedPercentage()).isEqualTo(40); // 61 * 100 / 150 = 40%
        }

        @Test
        @DisplayName("8.2 Sinh viên cận tốt nghiệp (132/150 TC, thiếu chứng chỉ MOS) -> Tách chuẩn phi tín chỉ thành action")
        void testRunGraduationAudit_NearGraduation_PendingCertificateAction() {
            GraduationAuditRequest req = new GraduationAuditRequest("std-near-grad-ktpm", "rev-ktpm-v1");
            GraduationAuditResponse res = academicFacade.runGraduationAudit(req);

            assertThat(res).isNotNull();
            assertThat(res.isEligibleForGraduation()).isFalse();
            assertThat(res.getCompletedPercentage()).isEqualTo(88); // 132 * 100 / 150 = 88%
            // Chuẩn tin học MOS thiếu phải nằm trong pendingActions
            assertThat(res.getPendingActions()).anyMatch(a -> "MOS".equalsIgnoreCase(a.getCertificateType()));
        }
    }

    // =========================================================================
    // CAPABILITY 9: reconcileStudyPlan
    // =========================================================================
    @Nested
    @DisplayName("Capability 9: reconcileStudyPlan - Đối chiếu kết quả kỳ trước & kích hoạt điều chỉnh")
    class Capability9ReconcileStudyPlanSpec {

        @Test
        @DisplayName("9.1 Phát hiện trượt môn LP6004 ở kỳ 2024_2 -> onTrack = false, đề xuất học lại môn nợ")
        void testReconcileStudyPlan_DetectsFailedCourse_RequiresAdjustment() {
            ReconcileStudyPlanRequest req = new ReconcileStudyPlanRequest(
                    "plan-2024604757-v1", "2024604757", "2024_2", 1, "rev-ktpm-v1"
            );
            ReconcileStudyPlanResponse res = academicFacade.reconcileStudyPlan(req);

            assertThat(res).isNotNull();
            assertThat(res.isOnTrack()).isFalse();
            assertThat(res.getMissedOrFailedCourses()).anyMatch(c -> c.contains("LP6004"));
            assertThat(res.getAdjustmentsRecommended()).anyMatch(a -> a.contains("LP6004") && a.contains("học lại"));
        }

        @Test
        @DisplayName("9.2 Kỳ học tất cả môn đều đạt -> onTrack = true, giữ nguyên tiến độ")
        void testReconcileStudyPlan_AllPassed_OnTrack() {
            ReconcileStudyPlanRequest req = new ReconcileStudyPlanRequest(
                    "plan-2024604757-v1", "2024604757", "2024_1", 1, "rev-ktpm-v1"
            );
            ReconcileStudyPlanResponse res = academicFacade.reconcileStudyPlan(req);

            assertThat(res).isNotNull();
            assertThat(res.isOnTrack()).isTrue();
            assertThat(res.getMissedOrFailedCourses()).isEmpty();
            assertThat(res.getCompletedCourses()).isNotEmpty();
        }
    }
}
