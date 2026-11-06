package vn.haui.advisor.ai.service;

import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.conversation.ChatMessageHistoryItem;
import vn.haui.advisor.ai.conversation.ConversationHistoryManager;
import vn.haui.advisor.ai.model.AdvisorModel;
import vn.haui.advisor.ai.model.AdvisorModelOutput;
import vn.haui.advisor.ai.model.MockAdvisorModel;
import vn.haui.advisor.ai.rag.service.GroundedContext;
import vn.haui.advisor.ai.rag.service.RagAdvisorService;
import vn.haui.advisor.ai.tools.ToolAdapter;
import vn.haui.advisor.contracts.dto.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ConversationalAdvisorFacadeTest {
    private final ToolAdapter tools = mock(ToolAdapter.class);
    private final RagAdvisorService rag = mock(RagAdvisorService.class);
    private final ConversationHistoryManager history = new ConversationHistoryManager();
    private final AtomicReference<vn.haui.advisor.ai.model.AdvisorModelInput> modelInput = new AtomicReference<>();
    private final AdvisorModel model = input -> {
        modelInput.set(input);
        return new AdvisorModelOutput("Mình hiểu bạn. Cần cân nhắc thời gian và mục tiêu.", List.of(), List.of(), null, List.of());
    };
    private final TrustedStudentContext student = new TrustedStudentContext("STU-1", "2024604757", "Bạn A", "IT", "K19", "REV-1");

    private DefaultAdvisorFacade facade() {
        when(tools.isCapabilityReady(any())).thenReturn(true);
        when(rag.retrieveAndGround(anyString(), anyInt(), anyDouble()))
                .thenReturn(GroundedContext.noEvidence("q", "", List.of()));
        return new DefaultAdvisorFacade(model, tools, rag, history, null, null);
    }

    @Test
    void vaguePlanClarifiesBeforeAnyToolOrRetrieval() {
        ChatResponse response = facade().chat(new ChatRequest("conv-plan", "Lập kế hoạch học kỳ tới", null), student);
        assertThat(response.getAnswer()).contains("học kỳ");
        verify(tools, never()).generateStudyPlan(any(), any(), any(), any(), any(), any());
        verifyNoInteractions(rag);
    }

    @Test
    void timeConstraintFollowUpUsesHistoryWithoutSearchOrAcademicCall() {
        history.saveTurn("conv-follow", student.getStudentId(),
                ChatMessageHistoryItem.ofUser("Mình phân vân học cải thiện hay học môn mới"),
                ChatMessageHistoryItem.ofAssistant("Hai lựa chọn phụ thuộc thời gian.", List.of(), List.of(), null, List.of()), 900_000);
        facade().chat(new ChatRequest("conv-follow", "Nhưng nếu mình không đủ thời gian thì sao?", null), student);
        verifyNoInteractions(rag);
        verify(tools, never()).getAcademicStatus(any());
        assertThat(modelInput.get().getHistory()).hasSize(2);
    }

    @Test
    void confirmedGoalFromUserHistoryReachesPlanWithoutDefaults() {
        history.saveTurn("conv-goal", student.getStudentId(),
                ChatMessageHistoryItem.ofUser("Mục tiêu CPA của mình là 3.2"),
                ChatMessageHistoryItem.ofAssistant("Đã ghi nhận.", List.of(), List.of(), null, List.of()), 900_000);
        facade().chat(new ChatRequest("conv-goal", "Lập kế hoạch cho mục tiêu đó đến kỳ 2026_2, tối đa 18 tín chỉ", null), student);
        verify(tools).generateStudyPlan(eq(student), eq("2026_2"), eq(new BigDecimal("3.2")), eq(18), isNull(), isNull());
        verifyNoInteractions(rag);
    }

    @Test
    void clarificationRepliesCompleteOnePlanWithConfirmedArguments() {
        DefaultAdvisorFacade facade = facade();
        facade.chat(new ChatRequest("conv-plan-steps", "Lập kế hoạch học kỳ tới", null), student);
        facade.chat(new ChatRequest("conv-plan-steps", "Kỳ 2026_2", null), student);
        facade.chat(new ChatRequest("conv-plan-steps", "Tối đa 18 tín chỉ, không học hè", null), student);
        verify(tools).generateStudyPlan(eq(student), eq("2026_2"), isNull(), eq(18), eq(false), isNull());
        verifyNoInteractions(rag);
    }

    @Test
    void policyQuestionRetrievesEvidenceWithoutAcademicTool() {
        when(rag.retrieveAndGround(anyString(), anyInt(), anyDouble()))
                .thenReturn(GroundedContext.noEvidence("q", "", List.of()));
        facade().chat(new ChatRequest("conv-policy", "Quy định số tín chỉ tối đa mỗi kỳ là gì?", null), student);
        verify(rag).retrieveAndGround(contains("tín chỉ"), anyInt(), anyDouble());
        verify(tools, never()).getAcademicStatus(any());
    }

    @Test
    void mixedGoalPlanAndPolicyUsesOnlyTheRequiredSources() {
        facade().chat(new ChatRequest("conv-mixed",
                "Đổi mục tiêu CPA thành 3.2 và lập kế hoạch đến kỳ 2026_2, tối đa 18 tín chỉ; theo quy chế có được không?",
                null), student);
        verify(tools).calculateTargetGrades(eq(student), eq(new BigDecimal("3.2")), eq("2026_2"));
        verify(tools).generateStudyPlan(eq(student), eq("2026_2"), eq(new BigDecimal("3.2")), eq(18), isNull(), isNull());
        verify(rag).retrieveAndGround(anyString(), anyInt(), anyDouble());
    }

    @Test
    void missingSimulationInputDoesNotExecuteEngineWithFabricatedGrades() {
        ChatResponse response = facade().chat(new ChatRequest("conv-sim", "Nếu kỳ tới mình được điểm cao thì CPA sao?", null), student);
        assertThat(response.getAnswer()).contains("điểm");
        verify(tools, never()).simulateGrades(any(), any());
    }

    @Test
    void mockModelDoesNotSecretlyRetrieveForDirectAdvice() {
        DefaultAdvisorFacade facade = new DefaultAdvisorFacade(new MockAdvisorModel(rag), tools, rag, history, null, null);
        facade.chat(new ChatRequest("conv-direct", "Nhưng nếu mình không đủ thời gian thì sao?", null), student);
        verifyNoInteractions(rag);
    }

    @Test
    void mockModelDoesNotSecretlyRetrieveForVerifiedPlan() {
        when(rag.retrieveAndGround(anyString())).thenReturn(GroundedContext.noEvidence("q", "", List.of()));
        when(tools.isCapabilityReady(AcademicCapability.GENERATE_STUDY_PLAN)).thenReturn(true);
        PlannedSemesterItem semester = new PlannedSemesterItem("2026_2", "Kỳ 2", List.of(), 18, null);
        when(tools.generateStudyPlan(any(), any(), any(), any(), any(), any()))
                .thenReturn(new GenerateStudyPlanResponse("PROPOSAL-1", student.getStudentId(), StudyPlanStatus.DRAFT,
                        List.of(semester), null, List.of(), "REV-1"));
        DefaultAdvisorFacade facade = new DefaultAdvisorFacade(new MockAdvisorModel(rag), tools, rag, history, null, null);
        facade.chat(new ChatRequest("conv-plan-verified", "Lập kế hoạch đến kỳ 2026_2, tối đa 18 tín chỉ", null), student);
        verifyNoInteractions(rag);
    }
}
