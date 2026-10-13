package vn.haui.advisor.ai.conversation;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.intent.IntentClassifier;
import vn.haui.advisor.ai.intent.ParsedUserIntent;
import vn.haui.advisor.ai.intent.ParsedUserIntent.ScenarioCategory;
import vn.haui.advisor.contracts.dto.ChatActionItem;
import vn.haui.advisor.contracts.dto.ChatSourceItem;
import vn.haui.advisor.contracts.dto.ConversationRecord;
import vn.haui.advisor.contracts.fake.InMemoryConversationStore;
import vn.haui.advisor.contracts.ports.ConversationStore;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ConversationHistoryManagerTest {

    private ConversationStore conversationStore;
    private ObjectMapper objectMapper;
    private ConversationHistoryManager historyManager;
    private IntentClassifier intentClassifier;

    @BeforeEach
    void setUp() {
        conversationStore = new InMemoryConversationStore();
        objectMapper = new ObjectMapper();
        historyManager = new ConversationHistoryManager(conversationStore, objectMapper);
        intentClassifier = new IntentClassifier();
    }

    @Test
    @DisplayName("Load history bounded by sliding window (e.g. max 10 latest messages)")
    void testLoadHistoryWithSlidingWindowBounding() {
        String convId = "conv-sliding-window";
        String studentId = "SV2021001";

        for (int i = 1; i <= 8; i++) {
            ChatMessageHistoryItem userMsg = new ChatMessageHistoryItem(
                    "user",
                    "User message " + i,
                    Instant.now().toString(),
                    List.of(),
                    List.of(),
                    null,
                    List.of()
            );
            ChatMessageHistoryItem assistantMsg = new ChatMessageHistoryItem(
                    "assistant",
                    "Assistant reply " + i,
                    Instant.now().toString(),
                    List.of(),
                    List.of(),
                    null,
                    List.of()
            );
            historyManager.saveTurn(convId, studentId, userMsg, assistantMsg, 900_000);
        }

        // 8 turns * 2 = 16 messages in total
        List<ChatMessageHistoryItem> fullHistory = historyManager.loadHistory(convId, studentId, 100);
        assertThat(fullHistory).hasSize(16);

        // Bounded by sliding window: max 10 latest messages
        List<ChatMessageHistoryItem> boundedHistory = historyManager.loadHistory(convId, studentId, 10);
        assertThat(boundedHistory).hasSize(10);

        // Verify it contains the 10 most recent messages (from Turn 4 assistant or Turn 4 user to Turn 8)
        assertThat(boundedHistory.get(boundedHistory.size() - 1).getContent()).isEqualTo("Assistant reply 8");
        assertThat(boundedHistory.get(boundedHistory.size() - 2).getContent()).isEqualTo("User message 8");
        assertThat(boundedHistory.get(0).getContent()).isEqualTo("User message 4");
    }

    @Test
    @DisplayName("Save turn prunes oldest messages when total serialized size exceeds maxTotalChars")
    void testSaveHistoryWithPruningWhenLarge() {
        String convId = "conv-pruning";
        String studentId = "SV2021002";

        // Add 5 long turns
        for (int i = 1; i <= 5; i++) {
            ChatMessageHistoryItem userMsg = new ChatMessageHistoryItem(
                    "user",
                    "Câu hỏi dài lượt " + i + ": " + "A".repeat(200),
                    Instant.now().toString(),
                    List.of(new ChatSourceItem("REG-01", "Quy chế 2024", "Điều 14", "1.0", "https://haui.edu.vn")),
                    List.of(new ChatActionItem("NAVIGATE", "Xem CTDT", "/academic", "{}")),
                    "PROP-123",
                    List.of("WARNING_TEST")
            );
            ChatMessageHistoryItem assistantMsg = new ChatMessageHistoryItem(
                    "assistant",
                    "Câu trả lời chi tiết lượt " + i + ": " + "B".repeat(300),
                    Instant.now().toString(),
                    List.of(),
                    List.of(),
                    null,
                    List.of()
            );
            // Constrain maxTotalChars to 1500 chars
            historyManager.saveTurn(convId, studentId, userMsg, assistantMsg, 1500);
        }

        ConversationRecord record = conversationStore.getConversation(convId, studentId);
        assertThat(record).isNotNull();
        assertThat(record.getMessagesJson().getBytes(StandardCharsets.UTF_8).length).isLessThanOrEqualTo(1500);

        List<ChatMessageHistoryItem> loaded = historyManager.loadHistory(convId, studentId, 50);
        // The newest messages must be preserved
        assertThat(loaded).isNotEmpty();
        assertThat(loaded.get(loaded.size() - 1).getRole()).isEqualTo("assistant");
        assertThat(loaded.get(loaded.size() - 1).getContent()).contains("Câu trả lời chi tiết lượt 5");
    }

    @Test
    @DisplayName("Cross-account isolation: Cannot load or overwrite another student's conversation")
    void testCrossAccountIsolation() {
        String convId = "conv-isolation-test";
        String studentA = "SV_A_LEGIT";
        String studentB = "SV_B_ATTACKER";

        ChatMessageHistoryItem userMsg = new ChatMessageHistoryItem(
                "user",
                "Kế hoạch bí mật của sinh viên A",
                Instant.now().toString(),
                List.of(),
                List.of(),
                null,
                List.of()
        );
        ChatMessageHistoryItem assistantMsg = new ChatMessageHistoryItem(
                "assistant",
                "Trả lời bí mật cho sinh viên A",
                Instant.now().toString(),
                List.of(),
                List.of(),
                null,
                List.of()
        );
        historyManager.saveTurn(convId, studentA, userMsg, assistantMsg, 900_000);

        // Student B tries to load Student A's conversation -> gets empty list (not found / isolated)
        List<ChatMessageHistoryItem> historyForB = historyManager.loadHistory(convId, studentB, 10);
        assertThat(historyForB).isEmpty();

        // Attempting to overwrite Student A's conversation as Student B fails
        assertThatThrownBy(() -> historyManager.saveTurn(convId, studentB, userMsg, assistantMsg, 900_000))
                .isInstanceOf(IllegalArgumentException.class);

        // If a malicious or buggy store returns a record with mismatched studentId, loadHistory rejects with SecurityException
        ConversationStore compromisedStore = new ConversationStore() {
            @Override
            public ConversationRecord getConversation(String conversationId, String studentId) {
                return new ConversationRecord(conversationId, studentA, "Title", null, null, "[]");
            }

            @Override
            public void saveConversation(ConversationRecord record) {}

            @Override
            public List<vn.haui.advisor.contracts.dto.ConversationSummaryItem> listConversations(String studentId) {
                return List.of();
            }
        };

        ConversationHistoryManager strictManager = new ConversationHistoryManager(compromisedStore, objectMapper);
        assertThatThrownBy(() -> strictManager.loadHistory(convId, studentB, 10))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("Cross-account");
    }

    @Test
    @DisplayName("Auto-generate title from first user message up to 50 chars")
    void testAutoGenerateTitleFromFirstUserMessage() {
        String convId = "conv-title-gen";
        String studentId = "SV2021003";

        String longPrompt = "Tư vấn cho tôi lộ trình chi tiết để tốt nghiệp loại giỏi ngành Công nghệ thông tin";
        ChatMessageHistoryItem userMsg = new ChatMessageHistoryItem(
                "user",
                longPrompt,
                Instant.now().toString(),
                List.of(),
                List.of(),
                null,
                List.of()
        );
        ChatMessageHistoryItem assistantMsg = new ChatMessageHistoryItem(
                "assistant",
                "Chào bạn, sau đây là lộ trình...",
                Instant.now().toString(),
                List.of(),
                List.of(),
                null,
                List.of()
        );

        historyManager.saveTurn(convId, studentId, userMsg, assistantMsg, 900_000);

        ConversationRecord record = conversationStore.getConversation(convId, studentId);
        assertThat(record).isNotNull();
        assertThat(record.getTitle()).isNotNull();
        assertThat(record.getTitle().length()).isLessThanOrEqualTo(50);
        assertThat(record.getTitle()).isEqualTo(longPrompt.substring(0, 50));
    }

    @Test
    @DisplayName("Multi-turn intent tracking: Turn 1 CPA 3.3 -> Turn 2 goal change to 3.5")
    void testMultiTurnIntentTracking() {
        String convId = "conv-multi-turn-intent";
        String studentId = "SV2021004";

        // Turn 1: User asks for a study plan with target CPA 3.3
        String turn1User = "Lập kế hoạch học tập để đạt CPA 3.3 kỳ tới";
        ParsedUserIntent intent1 = intentClassifier.classify(turn1User, List.of());

        assertThat(intent1.getCategory()).isEqualTo(ScenarioCategory.STUDY_PLAN);
        assertThat(intent1.getTargetCpa()).isEqualByComparingTo(new BigDecimal("3.3"));

        ChatMessageHistoryItem turn1UserItem = new ChatMessageHistoryItem(
                "user",
                turn1User,
                Instant.now().toString(),
                List.of(),
                List.of(),
                null,
                List.of()
        );
        ChatMessageHistoryItem turn1AssistantItem = new ChatMessageHistoryItem(
                "assistant",
                "Tôi đã xây dựng lộ trình học kỳ tới với mục tiêu CPA 3.3 cho bạn.",
                Instant.now().toString(),
                List.of(),
                List.of(),
                "PROP-CPA-33",
                List.of()
        );
        historyManager.saveTurn(convId, studentId, turn1UserItem, turn1AssistantItem, 900_000);

        // Turn 2: User shifts goal: "đổi thành 3.5"
        List<ChatMessageHistoryItem> history = historyManager.loadHistory(convId, studentId, 10);
        assertThat(history).hasSize(2);

        String turn2User = "đổi thành 3.5";
        ParsedUserIntent intent2 = intentClassifier.classify(turn2User, history);

        assertThat(intent2.getCategory()).isEqualTo(ScenarioCategory.GOAL_CHANGE);
        assertThat(intent2.getTargetCpa()).isEqualByComparingTo(new BigDecimal("3.5"));
    }

    @Test
    @DisplayName("Intent classification: Accelerated study without semester requires clarification")
    void testAcceleratedStudyWithoutSemesterRequiresClarification() {
        String query = "Tôi muốn học vượt để tốt nghiệp sớm";
        ParsedUserIntent intent = intentClassifier.classify(query, List.of());

        assertThat(intent.getCategory()).isEqualTo(ScenarioCategory.ACCELERATED_STUDY);
        assertThat(intent.isClarificationNeeded()).isTrue();
        assertThat(intent.getClarificationReason()).isNotEmpty();
    }

    @Test
    @DisplayName("Intent classification: Accelerated study with target semester")
    void testAcceleratedStudyWithSemester() {
        String query = "Tôi muốn học vượt để ra trường ở kỳ 7";
        ParsedUserIntent intent = intentClassifier.classify(query, List.of());

        assertThat(intent.getCategory()).isEqualTo(ScenarioCategory.ACCELERATED_STUDY);
        assertThat(intent.isClarificationNeeded()).isFalse();
        assertThat(intent.getTargetSemester()).contains("7");
    }

    @Test
    @DisplayName("Intent classification: What-if simulation with grades and credits")
    void testWhatIfIntent() {
        String query = "Nếu kỳ tới đạt 18 tín chỉ B+ thì sao";
        ParsedUserIntent intent = intentClassifier.classify(query, List.of());

        assertThat(intent.getCategory()).isEqualTo(ScenarioCategory.WHAT_IF);
        assertThat(intent.getSimulatedGrades()).isNotEmpty();
        assertThat(intent.getSimulatedGrades().get(0).getCredits()).isEqualTo(18);
        assertThat(intent.getSimulatedGrades().get(0).getExpectedGrade()).isEqualTo("B+");
    }

    @Test
    @DisplayName("Intent classification: Retake improvement ranking")
    void testRetakeRankingIntent() {
        String query = "Tôi nên học cải thiện môn nào để kéo điểm CPA?";
        ParsedUserIntent intent = intentClassifier.classify(query, List.of());

        assertThat(intent.getCategory()).isEqualTo(ScenarioCategory.RETAKE_IMPROVEMENT);
    }

    @Test
    @DisplayName("Intent classification: Graduation audit check")
    void testGraduationAuditIntent() {
        String query = "Tôi còn thiếu điều kiện gì tốt nghiệp?";
        ParsedUserIntent intent = intentClassifier.classify(query, List.of());

        assertThat(intent.getCategory()).isEqualTo(ScenarioCategory.GRADUATION_AUDIT);
    }

    @Test
    @DisplayName("Intent classification: Debt and prerequisite query with course code extraction")
    void testDebtAndPrerequisiteIntent() {
        String query = "LP6004 có chặn LP6003 không, tôi nợ môn nào?";
        ParsedUserIntent intent = intentClassifier.classify(query, List.of());

        assertThat(intent.getCategory()).isEqualTo(ScenarioCategory.DEBT_COURSES);
        assertThat(intent.getCourseCode()).isIn("LP6004", "LP6003");
    }

    @Test
    @DisplayName("Intent classification: Regulation query")
    void testRegulationIntent() {
        String query = "Quy chế đào tạo điều 14 về cảnh báo học vụ quy định như thế nào?";
        ParsedUserIntent intent = intentClassifier.classify(query, List.of());

        assertThat(intent.getCategory()).isEqualTo(ScenarioCategory.REGULATION);
    }

    @Test
    @DisplayName("Intent classification: Study plan with parameters (CPA, maxCredits, summer)")
    void testStudyPlanIntentWithParameters() {
        String query = "Lập kế hoạch học kỳ tới đăng ký tối đa 22 tín chỉ có học hè để đạt CPA 3.5";
        ParsedUserIntent intent = intentClassifier.classify(query, List.of());

        assertThat(intent.getCategory()).isEqualTo(ScenarioCategory.STUDY_PLAN);
        assertThat(intent.getTargetCpa()).isEqualByComparingTo(new BigDecimal("3.5"));
        assertThat(intent.getMaxCredits()).isEqualTo(22);
        assertThat(intent.getIncludeSummer()).isTrue();
    }

    @Test
    @DisplayName("Jackson serialization and deserialization roundtrip for ChatMessageHistoryItem")
    void testJacksonSerializationRoundTrip() throws Exception {
        ChatMessageHistoryItem item = new ChatMessageHistoryItem(
                "assistant",
                "Chào bạn!",
                "2026-10-13T10:00:00Z",
                List.of(new ChatSourceItem("REG-01", "Quy chế", "Điều 5", "1.0", "https://haui.edu.vn")),
                List.of(new ChatActionItem("NAVIGATE", "Trang chủ", "/home", "{}")),
                "PROP-999",
                List.of("WARN_1", "WARN_2")
        );

        String json = objectMapper.writeValueAsString(item);
        ChatMessageHistoryItem deserialized = objectMapper.readValue(json, ChatMessageHistoryItem.class);

        assertThat(deserialized.getRole()).isEqualTo(item.getRole());
        assertThat(deserialized.getContent()).isEqualTo(item.getContent());
        assertThat(deserialized.getTimestamp()).isEqualTo(item.getTimestamp());
        assertThat(deserialized.getSources()).hasSize(1);
        assertThat(deserialized.getSources().get(0).getSourceId()).isEqualTo("REG-01");
        assertThat(deserialized.getActions()).hasSize(1);
        assertThat(deserialized.getActions().get(0).getActionType()).isEqualTo("NAVIGATE");
        assertThat(deserialized.getProposalId()).isEqualTo("PROP-999");
        assertThat(deserialized.getWarnings()).containsExactly("WARN_1", "WARN_2");
    }

    @Test
    @DisplayName("Load history returns empty list on null/blank conversationId or non-existent conversation")
    void testLoadHistoryEdgeCases() {
        assertThat(historyManager.loadHistory(null, "SV001", 10)).isEmpty();
        assertThat(historyManager.loadHistory("   ", "SV001", 10)).isEmpty();
        assertThat(historyManager.loadHistory("non-existent-conv", "SV001", 10)).isEmpty();

        assertThatThrownBy(() -> historyManager.loadHistory("conv-1", null, 10))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
