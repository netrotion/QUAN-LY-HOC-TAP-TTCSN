package vn.haui.advisor.ai.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.mock.MockAcademicFacade;
import vn.haui.advisor.ai.model.AdvisorModel;
import vn.haui.advisor.ai.model.MockAdvisorModel;
import vn.haui.advisor.ai.tools.DefaultToolAdapter;
import vn.haui.advisor.ai.tools.ToolAdapter;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.AdvisorFacade;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AdvisorFacadeTest {

    private MockAcademicFacade mockAcademicFacade;
    private ToolAdapter toolAdapter;
    private AdvisorModel advisorModel;
    private AdvisorFacade advisorFacade;
    private TrustedStudentContext trustedContext;

    @BeforeEach
    void setUp() {
        mockAcademicFacade = new MockAcademicFacade();
        toolAdapter = new DefaultToolAdapter(mockAcademicFacade);
        advisorModel = new MockAdvisorModel();
        advisorFacade = new DefaultAdvisorFacade(advisorModel, toolAdapter);

        trustedContext = new TrustedStudentContext(
                "STU-2021600123",
                "2021600123",
                "Nguyễn Văn A",
                "IT_K16",
                "K16",
                "REV-2024-V1"
        );
    }

    @Test
    @DisplayName("Case A: General inquiry returns mock answer, sources, actions, and null planProposal")
    void testCaseAGeneralAcademicStatusInquiry() {
        ChatRequest request = new ChatRequest("CONV-001", "Cho tôi xem tình trạng học tập", "2024-09-25T10:00:00Z");

        ChatResponse response = advisorFacade.chat(request, trustedContext);

        assertThat(response).isNotNull();
        // 1. Answer has mock indicator
        assertThat(response.getAnswer())
                .isNotBlank()
                .contains("[MOCK_ADVISOR]")
                .contains("Nguyễn Văn A");

        // 2. Sources contains fixture source
        assertThat(response.getSources()).isNotEmpty();
        ChatSourceItem source = response.getSources().getFirst();
        assertThat(source.getTitle()).contains("Fixture");
        assertThat(source.getSourceId()).isEqualTo("SRC-MOCK-POLICY");

        // 3. Actions contains navigation action
        assertThat(response.getActions()).isNotEmpty();
        ChatActionItem action = response.getActions().getFirst();
        assertThat(action.getTargetRoute()).isEqualTo("/academic/transcript");

        // 4. Plan proposal is null for general inquiry
        assertThat(response.getPlanProposal()).isNull();

        // 5. Warnings is empty for normal status
        assertThat(response.getWarnings()).isEmpty();
    }

    @Test
    @DisplayName("Case B: Study plan inquiry returns ChatPlanProposal and action to planner without persisting")
    void testCaseBStudyPlanInquiry() {
        ChatRequest request = new ChatRequest("CONV-002", "Lập kế hoạch học kỳ tới", "2024-09-25T10:01:00Z");

        ChatResponse response = advisorFacade.chat(request, trustedContext);

        assertThat(response).isNotNull();
        // 1. Answer describes the proposal
        assertThat(response.getAnswer())
                .contains("[MOCK_ADVISOR]")
                .contains("kế hoạch học tập");

        // 2. Plan proposal is populated from toolAdapter -> mockAcademicFacade
        ChatPlanProposal proposal = response.getPlanProposal();
        assertThat(proposal).isNotNull();
        assertThat(proposal.getProposalId()).isEqualTo("PLAN-MOCK-001");
        assertThat(proposal.getProjectedCpa()).isEqualByComparingTo("3.25");
        assertThat(proposal.getSuggestedSemesters()).hasSize(1);

        PlannedSemesterItem semester = proposal.getSuggestedSemesters().getFirst();
        assertThat(semester.getCourses()).hasSize(2);
        assertThat(semester.getTotalCredits()).isEqualTo(6);

        // 3. Action directs to /planner
        assertThat(response.getActions()).isNotEmpty();
        ChatActionItem action = response.getActions().getFirst();
        assertThat(action.getTargetRoute()).isEqualTo("/planner");
        assertThat(action.getActionType()).isEqualTo("OPEN_PLANNER");

        // 4. No warnings
        assertThat(response.getWarnings()).isEmpty();
    }

    @Test
    @DisplayName("Case C: AcademicFacade returns structured warning/failure; AdvisorFacade preserves warning")
    void testCaseCWarningHandling() {
        // Cấu hình fake AcademicFacade trả cảnh báo học vụ
        mockAcademicFacade.setSimulatedWarnings(List.of(
                "CẢNH BÁO HỌC VỤ MỨC 1: Sinh viên có CPA dưới ngưỡng 1.20 trong kỳ trước",
                "Sinh viên chưa hoàn thành môn học phần tiên quyết: Giải tích 1"
        ));

        ChatRequest request = new ChatRequest("CONV-003", "Lập kế hoạch học kỳ tới", "2024-09-25T10:02:00Z");

        ChatResponse response = advisorFacade.chat(request, trustedContext);

        assertThat(response).isNotNull();
        // 1. Cảnh báo không bị swallow, được đưa vào field warnings đúng contract
        assertThat(response.getWarnings()).hasSize(2);
        assertThat(response.getWarnings())
                .anyMatch(w -> w.contains("CẢNH BÁO HỌC VỤ MỨC 1"))
                .anyMatch(w -> w.contains("Giải tích 1"));

        // 2. Answer có nhắc nhở cảnh báo
        assertThat(response.getAnswer())
                .contains("[MOCK_ADVISOR]")
                .contains("Cảnh báo");

        // 3. Action hướng dẫn vào kiểm tra học vụ
        assertThat(response.getActions()).isNotEmpty();
        assertThat(response.getActions().getFirst().getTargetRoute()).isEqualTo("/academic/audit");
    }

    @Test
    @DisplayName("Validation: Empty or blank message returns validation error warning")
    void testEmptyMessageValidation() {
        ChatRequest emptyRequest = new ChatRequest("CONV-004", "   ", "2024-09-25T10:03:00Z");

        ChatResponse response = advisorFacade.chat(emptyRequest, trustedContext);

        assertThat(response).isNotNull();
        assertThat(response.getWarnings()).contains("VALIDATION_ERROR: Empty message");
        assertThat(response.getAnswer()).contains("không được để trống");
    }

    @Test
    @DisplayName("Security: Null or empty studentId in trustedContext is rejected")
    void testUnauthenticatedContextSecurity() {
        ChatRequest request = new ChatRequest("CONV-005", "Cho tôi xem tình trạng", "2024-09-25T10:04:00Z");
        TrustedStudentContext emptyContext = new TrustedStudentContext();

        ChatResponse response = advisorFacade.chat(request, emptyContext);

        assertThat(response).isNotNull();
        assertThat(response.getWarnings()).contains("SECURITY_ERROR: Unauthenticated student context");
        assertThat(response.getAnswer()).contains("Không thể xác định danh tính");
    }

    @Test
    @DisplayName("Offline test: Default execution completes synchronously without internet / network access")
    void testNoNetworkDefaultExecution() {
        long startTime = System.currentTimeMillis();

        ChatRequest request = new ChatRequest("CONV-006", "Hỏi đáp thông thường", "2024-09-25T10:05:00Z");
        ChatResponse response = advisorFacade.chat(request, trustedContext);

        long duration = System.currentTimeMillis() - startTime;

        assertThat(response).isNotNull();
        assertThat(response.getAnswer()).isNotBlank();
        // Deterministic mock model should execute in milliseconds
        assertThat(duration).isLessThan(1000);
    }
}
