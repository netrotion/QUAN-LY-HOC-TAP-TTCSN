package vn.haui.advisor.ai.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.conversation.ChatMessageHistoryItem;
import vn.haui.advisor.contracts.dto.TrustedStudentContext;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("LiveAdvisorModel Prompt Framing & Coreference Tests")
class LiveAdvisorModelPromptTest {

    @Test
    @DisplayName("buildPrompt must contain conversation_history section with sanitized turns")
    void shouldIncludeFormattedConversationHistoryInPrompt() {
        LiveAdvisorModel model = new LiveAdvisorModel();

        TrustedStudentContext context = new TrustedStudentContext("SV001", "SV001", "Nguyễn Văn A", "K16-CNTT", "K16", "2024-V1");
        List<ChatMessageHistoryItem> history = List.of(
                ChatMessageHistoryItem.ofUser("Môn IT6015 có tiên quyết gì không?"),
                ChatMessageHistoryItem.ofAssistant("Môn IT6015 yêu cầu tiên quyết IT6011.", List.of(), List.of(), null, List.of())
        );

        AdvisorModelInput input = new AdvisorModelInput(
                "Môn đó bao nhiêu tín chỉ?",
                context,
                Map.of(),
                null,
                history,
                null
        );

        String prompt = model.buildPrompt(input);

        assertThat(prompt).contains("<conversation_history>");
        assertThat(prompt).contains("<turn role=\"user\">Môn IT6015 có tiên quyết gì không?</turn>");
        assertThat(prompt).contains("<turn role=\"assistant\">Môn IT6015 yêu cầu tiên quyết IT6011.</turn>");
        assertThat(prompt).contains("</conversation_history>");
        assertThat(prompt).contains("<user_query>\nMôn đó bao nhiêu tín chỉ?\n</user_query>");
    }

    @Test
    @DisplayName("buildPrompt handles null or empty history gracefully")
    void shouldHandleEmptyHistoryGracefully() {
        LiveAdvisorModel model = new LiveAdvisorModel();
        TrustedStudentContext context = new TrustedStudentContext("SV001", "SV001", "Nguyễn Văn A", "K16-CNTT", "K16", "2024-V1");
        AdvisorModelInput input = new AdvisorModelInput("Xin chào", context, Map.of());

        String prompt = model.buildPrompt(input);

        assertThat(prompt).contains("<conversation_history>");
        assertThat(prompt).contains("KHÔNG CÓ LỊCH SỬ HỘI THOẠI TRƯỚC ĐÓ.");
        assertThat(prompt).contains("</conversation_history>");
    }
}
