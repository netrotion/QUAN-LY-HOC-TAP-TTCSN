package vn.haui.advisor.ai.conversation;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.config.AiProperties;
import vn.haui.advisor.ai.grounding.ResponseGroundingValidator;
import vn.haui.advisor.ai.intent.IntentClassifier;
import vn.haui.advisor.ai.model.AdvisorModelInput;
import vn.haui.advisor.ai.model.AdvisorModelOutput;
import vn.haui.advisor.ai.model.MockAdvisorModel;
import vn.haui.advisor.ai.service.DefaultAdvisorFacade;
import vn.haui.advisor.ai.telemetry.AiMetricsCollector;
import vn.haui.advisor.ai.tools.ToolAdapter;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.fake.InMemoryConversationStore;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

@DisplayName("Task 6: Full Conversation History Multi-turn Retention & Goal Shift Integration Test")
public class FullHistoryMultiTurnRetentionTest {

    private InMemoryConversationStore store;
    private ConversationHistoryManager historyManager;
    private TokenBudgetAuditor budgetAuditor;
    private ToolAdapter toolAdapter;
    private DefaultAdvisorFacade advisorFacade;
    private TrustedStudentContext context;
    private AtomicReference<AdvisorModelInput> capturedInput;

    @BeforeEach
    void setUp() {
        store = new InMemoryConversationStore();
        historyManager = new ConversationHistoryManager(store, new ObjectMapper(), false);
        budgetAuditor = new TokenBudgetAuditor();
        toolAdapter = mock(ToolAdapter.class);
        capturedInput = new AtomicReference<>();

        MockAdvisorModel mockModel = new MockAdvisorModel() {
            @Override
            public AdvisorModelOutput generate(AdvisorModelInput input) {
                capturedInput.set(input);
                return new AdvisorModelOutput("Tư vấn mục tiêu CPA mới", List.of(), List.of(), null, List.of());
            }
        };

        advisorFacade = new DefaultAdvisorFacade(
                mockModel,
                toolAdapter,
                null,
                historyManager,
                new IntentClassifier(),
                new ResponseGroundingValidator(),
                2500L,
                new AiMetricsCollector(),
                budgetAuditor,
                new AiProperties()
        );

        context = new TrustedStudentContext("SV2024604757", "SV2024604757", "Nguyen Van An", "KTPM", "K16", "REV-1");
    }

    @Test
    @DisplayName("Should retain context across 15 turns without truncation and resolve Goal Shift")
    void test15TurnsGoalShiftContextRetention() {
        String convId = "conv-retention-15";

        // Pre-populate turns 1 to 14
        for (int i = 1; i <= 14; i++) {
            String userText = i == 2 ? "Mục tiêu ban đầu của em là đạt CPA 3.0 vào kỳ 2026_2"
                    : i == 8 ? "Em muốn đổi mục tiêu thành CPA 3.6"
                    : "Em muốn hỏi thêm về môn học kỳ " + i;
            advisorFacade.chat(new ChatRequest(convId, userText, null), context);
        }

        // At Turn 15, student asks for study plan with full parameters (semester 2026_2 and max 20 credits)
        ChatResponse turn15 = advisorFacade.chat(new ChatRequest(convId, "Hãy lập lộ trình cho em vào kỳ 2026_2 với tối đa 20 tín chỉ theo mục tiêu đó", null), context);

        assertThat(turn15).isNotNull();
        AdvisorModelInput input = capturedInput.get();
        assertThat(input).isNotNull();
        // Full history must contain all 14 previous turns (28 messages: 14 user + 14 assistant)
        assertThat(input.getHistory()).hasSize(28);
        assertThat(input.getHistory().get(2).getContent()).contains("CPA 3.0 vào kỳ 2026_2"); // Turn 2 preserved!
        assertThat(input.getHistory().get(14).getContent()).contains("CPA 3.6"); // Turn 8 preserved!
    }

    @Test
    @DisplayName("Should explicitly reject when simulated conversation exceeds budget ceiling")
    void testExplicitRejectionOnContextCeilingExceeded() {
        String convId = "conv-overflow-rejection";
        AiProperties properties = new AiProperties();
        properties.getConversation().setMaxContextTokens(1000); // Tight limit

        DefaultAdvisorFacade tightFacade = new DefaultAdvisorFacade(
                new MockAdvisorModel(), toolAdapter, null, historyManager,
                new IntentClassifier(), new ResponseGroundingValidator(),
                2500L, new AiMetricsCollector(), budgetAuditor, properties
        );

        // Pre-populate enough text to exceed 1000 tokens
        for (int i = 1; i <= 5; i++) {
            historyManager.saveTurn(convId, context.getStudentId(),
                    ChatMessageHistoryItem.ofUser("Câu hỏi dài chứa nhiều ký tự tiếng Việt ".repeat(30), null),
                    ChatMessageHistoryItem.ofAssistant("Câu trả lời dài tương ứng ".repeat(30), List.of(), List.of(), null, List.of()),
                    900_000);
        }

        ChatResponse response = tightFacade.chat(new ChatRequest(convId, "Hỏi thêm câu nữa", null), context);

        assertThat(response.getWarnings()).anyMatch(w -> w.contains("CONTEXT_LIMIT_EXCEEDED"));
        assertThat(response.getAnswer()).contains("vui lòng mở một cuộc hội thoại mới");
        // Verify database records were NOT truncated
        assertThat(historyManager.loadFullHistory(convId, context.getStudentId())).hasSize(10);
    }

    @Test
    void chatDoesNotAnswerWithMissingHistoryWhenStoredHistoryIsMalformed() {
        String conversationId = "conv-corrupt-chat";
        store.saveConversation(new ConversationRecord(conversationId, context.getStudentId(), "Title", null, null, "{broken"));

        ChatResponse response = advisorFacade.chat(new ChatRequest(conversationId, "What is my CPA?", null), context);

        assertThat(response.getWarnings()).anyMatch(w -> w.startsWith("HISTORY_UNAVAILABLE"));
        assertThat(capturedInput.get()).isNull();
        assertThat(store.getConversation(conversationId, context.getStudentId()).getMessagesJson()).isEqualTo("{broken");
    }
}
