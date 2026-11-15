package vn.haui.advisor.ai.memory;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.conversation.ChatMessageHistoryItem;
import vn.haui.advisor.ai.grounding.ResponseGroundingValidator;

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
}

