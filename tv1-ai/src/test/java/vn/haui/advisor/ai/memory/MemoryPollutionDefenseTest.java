package vn.haui.advisor.ai.memory;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.conversation.ChatMessageHistoryItem;
import vn.haui.advisor.ai.conversation.ConversationHistoryManager;
import vn.haui.advisor.ai.grounding.ResponseGroundingValidator;
import vn.haui.advisor.ai.mock.MockAcademicFacade;
import vn.haui.advisor.ai.model.AdvisorModel;
import vn.haui.advisor.ai.model.AdvisorModelOutput;
import vn.haui.advisor.ai.model.LiveAdvisorModel;
import vn.haui.advisor.ai.service.AdvisorStreamingService;
import vn.haui.advisor.ai.service.DefaultAdvisorFacade;
import vn.haui.advisor.ai.tools.DefaultToolAdapter;
import vn.haui.advisor.contracts.dto.ChatRequest;
import vn.haui.advisor.contracts.dto.ChatResponse;
import vn.haui.advisor.contracts.dto.TrustedStudentContext;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MemoryPollutionDefenseTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("Task 1: ChatMessageHistoryItem supports quarantine state and handles legacy JSON")
    void testQuarantineFieldAndViolationDetection() throws Exception {
        // 1. ChatMessageHistoryItem quarantine flag default & setter
        ChatMessageHistoryItem item = ChatMessageHistoryItem.ofAssistant("Phản hồi ảo giác", List.of(), List.of(), null, List.of("UNGROUNDED_COURSE_CODE: Fake1234"));
        assertThat(item.isQuarantined()).isFalse();

        item.setQuarantined(true);
        assertThat(item.isQuarantined()).isTrue();
        assertThat(ChatMessageHistoryItem.QUARANTINED_TOMBSTONE).isNotBlank();

        // 2. Serialization & Deserialization
        String json = objectMapper.writeValueAsString(item);
        assertThat(json).contains("\"quarantined\":true");

        ChatMessageHistoryItem deserialized = objectMapper.readValue(json, ChatMessageHistoryItem.class);
        assertThat(deserialized.isQuarantined()).isTrue();

        // 3. Backward compatibility with legacy JSON (no quarantined field)
        String legacyJson = "{\"role\":\"assistant\",\"content\":\"Chào bạn\",\"timestamp\":\"2026-11-15T12:00:00Z\"}";
        ChatMessageHistoryItem legacyItem = objectMapper.readValue(legacyJson, ChatMessageHistoryItem.class);
        assertThat(legacyItem.isQuarantined()).isFalse();

        // 4. ResponseGroundingValidator.isSevereGroundingViolation
        assertThat(ResponseGroundingValidator.isSevereGroundingViolation(null)).isFalse();
        assertThat(ResponseGroundingValidator.isSevereGroundingViolation(List.of())).isFalse();
        assertThat(ResponseGroundingValidator.isSevereGroundingViolation(List.of("TRANSCRIPT_REQUIRED", "NUMERICAL_OVERWRITE_PREVENTED"))).isFalse();

        assertThat(ResponseGroundingValidator.isSevereGroundingViolation(List.of("SECURITY_VIOLATION: Access denied"))).isTrue();
        assertThat(ResponseGroundingValidator.isSevereGroundingViolation(List.of("DATA_POISONING_SUSPECT: Malicious chunk"))).isTrue();
        assertThat(ResponseGroundingValidator.isSevereGroundingViolation(List.of("MODEL_PROVIDER_ERROR: Rate limit"))).isTrue();
        assertThat(ResponseGroundingValidator.isSevereGroundingViolation(List.of("UNGROUNDED_COURSE_CODE: Unknown course IT9999"))).isTrue();
        assertThat(ResponseGroundingValidator.isSevereGroundingViolation(List.of("COURSE_RELATION_CONTRADICTION: IT3010"))).isTrue();
        assertThat(ResponseGroundingValidator.isSevereGroundingViolation(List.of("UNRELIABLE_GROUNDING: Fabricated rule REG-HAUI-99"))).isTrue();
    }

    @Test
    @DisplayName("Task 2: Facade and Streaming Service flag quarantined=true when severe violations occur")
    void testFacadeAndStreamingMarkQuarantinedOnSevereViolation() {
        ConversationHistoryManager historyManager = new ConversationHistoryManager();
        MockAcademicFacade mockAcademicFacade = new MockAcademicFacade();
        DefaultToolAdapter toolAdapter = new DefaultToolAdapter(mockAcademicFacade);

        // AdvisorModel returns an output with severe grounding violation (e.g. UNGROUNDED_COURSE_CODE)
        AdvisorModel failingModel = input -> new AdvisorModelOutput(
                "Bạn nên học môn IT9999.",
                List.of(),
                List.of(),
                null,
                List.of("UNGROUNDED_COURSE_CODE: IT9999")
        );

        DefaultAdvisorFacade facade = new DefaultAdvisorFacade(
                failingModel,
                toolAdapter,
                null,
                historyManager,
                null,
                new ResponseGroundingValidator(),
                2000
        );

        TrustedStudentContext context = new TrustedStudentContext(
                "STU-QUARANTINE",
                "2021600123",
                "Nguyễn Văn A",
                "IT_K16",
                "K16",
                "REV-2024-V1"
        );

        // 1. Test DefaultAdvisorFacade
        ChatRequest req1 = new ChatRequest("CONV-POLLUTION-1", "Em nên học môn gì?", "2026-11-15T12:00:00Z");
        ChatResponse resp1 = facade.chat(req1, context);
        assertThat(resp1).isNotNull();

        List<ChatMessageHistoryItem> history1 = historyManager.loadFullHistory("CONV-POLLUTION-1", "STU-QUARANTINE");
        assertThat(history1).hasSize(2);
        ChatMessageHistoryItem userTurn1 = history1.get(0);
        ChatMessageHistoryItem assistantTurn1 = history1.get(1);

        assertThat(userTurn1.getRole()).isEqualTo("user");
        assertThat(userTurn1.isQuarantined()).isFalse();

        assertThat(assistantTurn1.getRole()).isEqualTo("assistant");
        assertThat(assistantTurn1.isQuarantined()).isTrue();

        // 2. Test AdvisorStreamingService
        AdvisorStreamingService streamingService = new AdvisorStreamingService(
                failingModel,
                toolAdapter,
                null,
                historyManager,
                new ResponseGroundingValidator(),
                null
        );

        ChatRequest req2 = new ChatRequest("CONV-POLLUTION-2", "Em muốn học môn mới", "2026-11-15T12:05:00Z");
        streamingService.streamChat(req2, context, event -> {});

        List<ChatMessageHistoryItem> history2 = historyManager.loadFullHistory("CONV-POLLUTION-2", "STU-QUARANTINE");
        assertThat(history2).hasSize(2);
        ChatMessageHistoryItem assistantTurn2 = history2.get(1);
        assertThat(assistantTurn2.isQuarantined()).isTrue();
    }

    @Test
    @DisplayName("Task 3: LiveAdvisorModel sanitizes quarantined history items in both formatGeminiContents and buildPrompt")
    void testLiveAdvisorModelSanitizesQuarantinedHistoryItems() {
        ChatMessageHistoryItem userTurn = ChatMessageHistoryItem.ofUser("Môn IT9999 học kỳ nào?");
        ChatMessageHistoryItem normalTurn = ChatMessageHistoryItem.ofAssistant("Môn học này là...", List.of(), List.of(), null, List.of());

        ChatMessageHistoryItem poisonedTurn = ChatMessageHistoryItem.ofAssistant("Môn IT9999 là môn ảo giác có 10 tín chỉ.", List.of(), List.of(), null, List.of("UNGROUNDED_COURSE_CODE: IT9999"));
        poisonedTurn.setQuarantined(true);

        List<ChatMessageHistoryItem> history = List.of(userTurn, poisonedTurn);

        // 1. Check formatGeminiContents
        List<java.util.Map<String, Object>> contents = vn.haui.advisor.ai.model.LiveAdvisorModel.formatGeminiContents(history, "Bạn vừa nói môn đó có mấy tín chỉ?");
        assertThat(contents).isNotEmpty();

        // The second content is the assistant/model turn
        java.util.Map<String, Object> modelPart = contents.get(1);
        assertThat(modelPart.get("role")).isEqualTo("model");
        @SuppressWarnings("unchecked")
        List<java.util.Map<String, Object>> parts = (List<java.util.Map<String, Object>>) modelPart.get("parts");
        String text = (String) parts.get(0).get("text");

        assertThat(text)
                .doesNotContain("Môn IT9999 là môn ảo giác")
                .doesNotContain("10 tín chỉ")
                .contains(ChatMessageHistoryItem.QUARANTINED_TOMBSTONE);

        // 2. Check buildPrompt
        LiveAdvisorModel liveModel = new LiveAdvisorModel();
        vn.haui.advisor.ai.model.AdvisorModelInput input = new vn.haui.advisor.ai.model.AdvisorModelInput(
                "Bạn vừa nói môn đó có mấy tín chỉ?",
                new TrustedStudentContext("STU-1", "2021600123", "SV A", "IT", "K16", "REV-1"),
                java.util.Collections.emptyMap(),
                null,
                history,
                null
        );

        String prompt = liveModel.buildPrompt(input);
        assertThat(prompt)
                .doesNotContain("Môn IT9999 là môn ảo giác")
                .contains(ChatMessageHistoryItem.QUARANTINED_TOMBSTONE);
    }
}

