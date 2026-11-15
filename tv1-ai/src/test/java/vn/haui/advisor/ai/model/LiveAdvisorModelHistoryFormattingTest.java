package vn.haui.advisor.ai.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.conversation.ChatMessageHistoryItem;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Task 3: LiveAdvisorModel History Formatting & De-duplication Test")
class LiveAdvisorModelHistoryFormattingTest {

    @Test
    @DisplayName("Should preserve 20 turns chronological order and merge consecutive same-role turns")
    void testFormatGeminiContentsPreservesOrderAndMergesRoles() {
        List<ChatMessageHistoryItem> history = List.of(
                ChatMessageHistoryItem.ofUser("Câu 1", null),
                ChatMessageHistoryItem.ofUser("Câu 1 bổ sung", null), // consecutive user
                ChatMessageHistoryItem.ofAssistant("Trả lời 1", List.of(), List.of(), null, List.of()),
                ChatMessageHistoryItem.ofAssistant("Trả lời 1 bổ sung", List.of(), List.of(), null, List.of()) // consecutive model
        );

        List<Map<String, Object>> contents = LiveAdvisorModel.formatGeminiContents(history, "Câu hỏi mới");

        // Expected alternating: [user (merged), model (merged), user ("Câu hỏi mới")]
        assertThat(contents).hasSize(3);
        assertThat(contents.get(0).get("role")).isEqualTo("user");
        assertThat(contents.get(0).get("parts").toString()).contains("Câu 1\n\nCâu 1 bổ sung");
        assertThat(contents.get(1).get("role")).isEqualTo("model");
        assertThat(contents.get(1).get("parts").toString()).contains("Trả lời 1\n\nTrả lời 1 bổ sung");
        assertThat(contents.get(2).get("role")).isEqualTo("user");
        assertThat(contents.get(2).get("parts").toString()).contains("Câu hỏi mới");
    }

    @Test
    @DisplayName("Should not duplicate userMessage if it was already appended to history")
    void testNoDuplicateUserMessage() {
        List<ChatMessageHistoryItem> history = List.of(
                ChatMessageHistoryItem.ofUser("Câu 1", null),
                ChatMessageHistoryItem.ofAssistant("Trả lời 1", List.of(), List.of(), null, List.of()),
                ChatMessageHistoryItem.ofUser("Câu hỏi hiện tại", null) // already in history
        );

        List<Map<String, Object>> contents = LiveAdvisorModel.formatGeminiContents(history, "Câu hỏi hiện tại");

        assertThat(contents).hasSize(3); // user, model, user (not 4!)
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> parts = (List<Map<String, Object>>) contents.get(2).get("parts");
        String lastPartText = parts.get(0).get("text").toString();
        assertThat(lastPartText).isEqualTo("Câu hỏi hiện tại");
    }
}

