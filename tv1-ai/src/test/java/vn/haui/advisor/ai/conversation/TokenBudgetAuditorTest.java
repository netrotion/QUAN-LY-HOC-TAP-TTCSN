package vn.haui.advisor.ai.conversation;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.rag.service.GroundedContext;
import vn.haui.advisor.contracts.dto.ChatSourceItem;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Task 1: TokenBudgetAuditor Comprehensive Estimation & Hard Ceiling Test")
class TokenBudgetAuditorTest {

    private final TokenBudgetAuditor auditor = new TokenBudgetAuditor();

    @Test
    @DisplayName("Should calculate token breakdown accurately for normal conversation")
    void testAuditWithinBudget() {
        String systemPrompt = "Bạn là HaUI Advisor...";
        List<ChatMessageHistoryItem> history = List.of(
                ChatMessageHistoryItem.ofUser("Chào bạn, mình muốn hỏi về CPA", "2026-11-13T01:00:00Z"),
                ChatMessageHistoryItem.ofAssistant("Chào bạn, CPA của bạn hiện tại là 3.18", List.of(), List.of(), null, List.of())
        );
        String userMessage = "Làm sao để lên CPA 3.5?";
        GroundedContext ragContext = new GroundedContext(
                "quy chế", List.of(), List.of(new ChatSourceItem("REG-HAUI-02", "Thang điểm", "Điều 2", "2024", "/rules")),
                "Điều 2: Cách tính CPA tích lũy...", true, List.of()
        );
        Map<String, Object> toolResults = Map.of("cpa", 3.18, "gpa", 3.4);

        TokenBudgetAuditor.AuditResult result = auditor.audit(
                systemPrompt, history, userMessage, ragContext, toolResults, 2048, 64000
        );

        assertThat(result.isAllowed()).isTrue();
        assertThat(result.systemTokens()).isGreaterThan(0);
        assertThat(result.historyTokens()).isGreaterThan(0);
        assertThat(result.userTokens()).isGreaterThan(0);
        assertThat(result.ragTokens()).isGreaterThan(0);
        assertThat(result.toolTokens()).isGreaterThan(0);
        assertThat(result.reservedOutputTokens()).isEqualTo(2048);
        assertThat(result.estimatedTotalTokens()).isEqualTo(
                result.systemTokens() + result.historyTokens() + result.userTokens()
                        + result.ragTokens() + result.toolTokens() + result.reservedOutputTokens()
        );
    }

    @Test
    @DisplayName("Should reject and return isAllowed=false when total tokens exceed ceiling limit")
    void testAuditExceedsBudget() {
        String hugeText = "Nội dung học vụ rất dài lặp đi lặp lại để kiểm tra tràn ngân sách token. ".repeat(1500);
        List<ChatMessageHistoryItem> history = List.of(
                ChatMessageHistoryItem.ofUser(hugeText, "2026-11-13T01:00:00Z")
        );

        TokenBudgetAuditor.AuditResult result = auditor.audit(
                "System prompt", history, "Câu hỏi tiếp theo", null, null, 2048, 10000
        );

        assertThat(result.isAllowed()).isFalse();
        assertThat(result.detailMessage()).contains("Context limit exceeded");
        assertThat(result.estimatedTotalTokens()).isGreaterThan(10000);
    }
}
