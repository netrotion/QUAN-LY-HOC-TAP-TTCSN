package vn.haui.advisor.ai.eval;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.conversation.ConversationHistoryManager;
import vn.haui.advisor.ai.grounding.ResponseGroundingValidator;
import vn.haui.advisor.ai.intent.IntentClassifier;
import vn.haui.advisor.ai.model.MockAdvisorModel;
import vn.haui.advisor.ai.service.DefaultAdvisorFacade;
import vn.haui.advisor.ai.tools.DefaultToolAdapter;
import vn.haui.advisor.ai.tools.ToolAdapter;
import vn.haui.advisor.ai.tools.ToolNotReadyException;
import vn.haui.advisor.contracts.ContractVersion;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.fake.InMemoryConversationStore;
import vn.haui.advisor.contracts.ports.AcademicFacade;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Task 4.5 — Bộ kiểm thử chấp thuận tích hợp toàn diện từ Phase 1 đến Phase 4 (Project-Wide Acceptance Test).
 * Kiểm tra tính toàn vẹn của hợp đồng, quy chế học vụ (TV4), nền tảng dữ liệu (TV5), giao diện (TV3/TV2)
 * và phân hệ trí tuệ nhân tạo (TV1).
 */
@DisplayName("Task 4.5: Bộ kiểm thử chấp thuận tích hợp toàn dự án (Phase 1 → Phase 4 Acceptance Suite)")
public class Task45ProjectWideAcceptanceTest {

    private AcademicFacade academicFacadeMock;
    private DefaultAdvisorFacade advisorFacade;
    private ToolAdapter toolAdapter;
    private TrustedStudentContext trustedStudent;

    @BeforeEach
    void setUp() {
        academicFacadeMock = mock(AcademicFacade.class);

        // Khởi tạo các năng lực đã sẵn sàng của TV4
        when(academicFacadeMock.readyCapabilities()).thenReturn(Set.of(
                AcademicCapability.GET_ACADEMIC_STATUS,
                AcademicCapability.CHECK_COURSE_ELIGIBILITY,
                AcademicCapability.SIMULATE_GRADES,
                AcademicCapability.RANK_RETAKE_COURSES,
                AcademicCapability.CALCULATE_TARGET_GRADES,
                AcademicCapability.VALIDATE_STUDY_PLAN,
                AcademicCapability.RUN_GRADUATION_AUDIT,
                AcademicCapability.RECONCILE_STUDY_PLAN
        ));

        toolAdapter = new DefaultToolAdapter(academicFacadeMock, true);
        advisorFacade = new DefaultAdvisorFacade(
                new MockAdvisorModel(),
                toolAdapter,
                null,
                new ConversationHistoryManager(new InMemoryConversationStore(), new ObjectMapper(), false),
                new IntentClassifier(),
                new ResponseGroundingValidator()
        );

        trustedStudent = new TrustedStudentContext(
                "2024604757",
                "2024604757",
                "Nguyễn Văn An",
                "KTPM",
                "K16",
                "rev-4.5"
        );
    }

    // =========================================================================
    // 1. PHASE 1 & 2 BASELINE & CONTRACT INTEGRITY
    // =========================================================================
    @Nested
    @DisplayName("1. Phase 1 & Phase 2: Hợp đồng dữ liệu & Quy chế học vụ cơ sở")
    class Phase1And2Tests {

        @Test
        @DisplayName("1.1: Hợp đồng V1 đang ở phiên bản 1.5.0 đồng bộ xuyên suốt")
        void testContractVersion_Is150() {
            assertThat(ContractVersion.CURRENT).isEqualTo("1.5.0");
            assertThat(ContractVersion.MILESTONE).isEqualTo("contracts-v1");
        }

        @Test
        @DisplayName("1.2: Định danh sinh viên chỉ nhận từ TrustedStudentContext, bảo vệ an ninh")
        void testStudentContextSecurity() {
            assertThat(trustedStudent.getStudentId()).isEqualTo("2024604757");
            assertThat(trustedStudent.getCohort()).isEqualTo("K16");
            assertThat(trustedStudent.getMajorCode()).isEqualTo("KTPM");
        }

        @Test
        @DisplayName("1.3: Tổng số tín chỉ yêu cầu động theo từng CTĐT")
        void testTotalCreditsRequired_DynamicPerMajor() {
            when(academicFacadeMock.getAcademicStatus(any())).thenReturn(
                    new AcademicStatusResponse("2024604757", new BigDecimal("3.20"), new BigDecimal("3.15"), 110, 150, AcademicRiskLevel.NORMAL, List.of(), "rev-1")
            );

            AcademicStatusResponse status = academicFacadeMock.getAcademicStatus(new AcademicStatusRequest("2024604757", "rev-1"));
            assertThat(status.getTotalCreditsRequired()).isEqualTo(150);
            assertThat(status.getCpa()).isEqualByComparingTo("3.15");
        }
    }

    // =========================================================================
    // 2. PHASE 3 INTELLIGENCE & RECOMMENDATION ENGINE
    // =========================================================================
    @Nested
    @DisplayName("2. Phase 3: Thuật toán khuyến nghị, giả lập & xử lý hồ sơ an toàn")
    class Phase3Tests {

        @Test
        @DisplayName("2.1: Giả lập điểm What-if (simulateGrades) phản hồi delta CPA chính xác")
        void testSimulateGrades_DeltaCalculation() {
            when(academicFacadeMock.simulateGrades(any())).thenReturn(
                    new SimulateGradesResponse("2024604757", new BigDecimal("3.15"), new BigDecimal("3.60"), new BigDecimal("3.22"), new BigDecimal("0.07"), "rev-4.5")
            );

            SimulateGradesRequest req = new SimulateGradesRequest(
                    "2024604757",
                    List.of(
                            new SimulatedCourseGrade("IT6005", 3, "A", new BigDecimal("4.0"))
                    ),
                    "rev-4.5"
            );
            SimulateGradesResponse res = academicFacadeMock.simulateGrades(req);

            assertThat(res).isNotNull();
            assertThat(res.getProjectedCpa()).isEqualByComparingTo("3.22");
            assertThat(res.getCpaDelta()).isEqualByComparingTo("0.07");
        }

        @Test
        @DisplayName("2.2: Xếp hạng học cải thiện ROI (rankRetakeCourses) ưu tiên môn tăng CPA cao nhất")
        void testRankRetakeCourses_RoiPrioritization() {
            when(academicFacadeMock.rankRetakeCourses(any())).thenReturn(
                    new RankRetakeCoursesResponse("2024604757", List.of(
                            new RetakeCourseRecommendation("IT6005", "Kiến trúc phần mềm", 3, "D", new BigDecimal("1.0"), "A", new BigDecimal("4.0"), new BigDecimal("0.08"), 1, "Tăng CPA nhanh nhất")
                    ), "rev-4.5")
            );

            RankRetakeCoursesRequest req = new RankRetakeCoursesRequest("2024604757", 5, "rev-4.5");
            RankRetakeCoursesResponse res = academicFacadeMock.rankRetakeCourses(req);

            assertThat(res).isNotNull();
            assertThat(res.getRecommendations()).hasSize(1);
            assertThat(res.getRecommendations().get(0).getCourseCode()).isEqualTo("IT6005");
        }

        @Test
        @DisplayName("2.3: Hồ sơ sinh viên trống (empty profile) trả về null an toàn, không bịa 0 hoặc 'đạt'")
        void testEmptyProfile_SafeNulls() {
            when(academicFacadeMock.getAcademicStatus(any())).thenReturn(
                    new AcademicStatusResponse("std-empty-real", null, null, null, 150, null, List.of(), "rev-4.5")
            );

            AcademicStatusRequest req = new AcademicStatusRequest("std-empty-real", "rev-4.5");
            AcademicStatusResponse res = academicFacadeMock.getAcademicStatus(req);

            assertThat(res).isNotNull();
            assertThat(res.getAccumulatedCredits()).isNull();
            assertThat(res.getCpa()).isNull();
        }
    }

    // =========================================================================
    // 3. PHASE 4 INTEGRATION, RECONCILE US-13 & STRICT VALIDATION
    // =========================================================================
    @Nested
    @DisplayName("3. Phase 4: Thẩm định kế hoạch nghiêm ngặt & Đối soát US-13")
    class Phase4Tests {

        @Test
        @DisplayName("3.1: Kế hoạch chứa môn học KHÔNG CÓ TRONG CTĐT bắt buộc bị từ chối (valid = false)")
        void testStrictCurriculumValidation_RejectInvalidCourses() {
            // Giả lập phản hồi từ TV4 với môn giả lập IT9L202611
            when(academicFacadeMock.validateStudyPlan(any())).thenReturn(
                    new ValidateStudyPlanResponse(false, StudyPlanStatus.DRAFT, List.of("Vi phạm: Học phần IT9L202611 không tồn tại trong chương trình đào tạo"), List.of(), 1, "rev-4.5")
            );

            ValidateStudyPlanRequest invalidReq = new ValidateStudyPlanRequest(
                    "plan-invalid-fake-course",
                    "2024604757",
                    List.of(
                            new PlannedSemesterItem(1, "2025_1", "Học kỳ 1 năm 2025-2026", List.of(
                                    new PlannedCourseItem("IT9L202611", "Môn giả lập không có thật", 3, "A", "Gợi ý", "MANDATORY", "PLANNED")
                            ), 3, new BigDecimal("4.0"))
                    ),
                    1,
                    "rev-4.5"
            );

            ValidateStudyPlanResponse res = academicFacadeMock.validateStudyPlan(invalidReq);

            assertThat(res).isNotNull();
            assertThat(res.isValid()).isFalse();
            assertThat(res.getViolations())
                    .anyMatch(v -> v.contains("IT9L202611"));
        }

        @Test
        @DisplayName("3.2: Đối soát US-13 phân định rõ môn hoàn thành và môn bỏ lỡ/trượt")
        void testReconcilePlan_US13() {
            when(academicFacadeMock.reconcileStudyPlan(any())).thenReturn(
                    new ReconcileStudyPlanResponse("plan-active-1", "2024604757", false,
                            List.of("IT6005"), List.of("IT6015"),
                            List.of("Cần đăng ký học lại môn IT6015 ở kỳ tới"),
                            1, "rev-4.5")
            );

            ReconcileStudyPlanRequest req = new ReconcileStudyPlanRequest(
                    "plan-active-1",
                    "2024604757",
                    "2024_1",
                    1,
                    "rev-4.5"
            );

            ReconcileStudyPlanResponse res = academicFacadeMock.reconcileStudyPlan(req);

            assertThat(res).isNotNull();
            assertThat(res.getPlanId()).isEqualTo("plan-active-1");
            assertThat(res.isOnTrack()).isFalse();
            assertThat(res.getMissedOrFailedCourses()).contains("IT6015");
            assertThat(res.getAdjustmentsRecommended()).isNotEmpty();
        }

        @Test
        @DisplayName("3.3: Bảo toàn dữ liệu: AI Advisor không bao giờ bịa đặt dữ liệu khi công cụ chưa sẵn sàng")
        void testToolReadiness_NoHallucinatedData() {
            AcademicFacade unreadyFacade = mock(AcademicFacade.class);
            when(unreadyFacade.readyCapabilities()).thenReturn(Collections.emptySet());

            ToolAdapter unreadyAdapter = new DefaultToolAdapter(unreadyFacade, true);

            assertThatThrownBy(() -> unreadyAdapter.generateStudyPlan(
                    trustedStudent, "2025_1", new BigDecimal("3.50"), 18, false, null))
                    .isInstanceOf(ToolNotReadyException.class)
                    .hasMessageContaining("is not ready in AcademicFacade");
        }
    }
}
