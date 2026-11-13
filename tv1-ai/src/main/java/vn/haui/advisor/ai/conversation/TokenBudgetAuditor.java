package vn.haui.advisor.ai.conversation;

import org.springframework.stereotype.Component;
import vn.haui.advisor.ai.rag.service.GroundedContext;

import java.util.List;
import java.util.Map;

/**
 * Giám sát ngân sách token toàn diện trước khi chuyển dữ liệu sang LLM:
 * Tính toán T_total = T_sys + T_hist + T_rag + T_tool + T_user + T_reserve.
 * Từ chối có kiểm soát khi vượt ngưỡng trần, không cắt ngầm tin nhắn.
 */
@Component
public class TokenBudgetAuditor {

    public static final int DEFAULT_MAX_CONTEXT_TOKENS = 64_000;
    public static final int DEFAULT_RESERVED_OUTPUT_TOKENS = 2_048;

    public record AuditResult(
            boolean isAllowed,
            long estimatedTotalTokens,
            long systemTokens,
            long historyTokens,
            long userTokens,
            long ragTokens,
            long toolTokens,
            long reservedOutputTokens,
            long maxLimit,
            String detailMessage
    ) {}

    public AuditResult audit(
            String systemPrompt,
            List<ChatMessageHistoryItem> history,
            String userMessage,
            GroundedContext ragContext,
            Map<String, Object> toolResults,
            Integer configuredMaxOutputTokens,
            Integer configuredMaxContextTokens
    ) {
        long sysTokens = estimate(systemPrompt);
        long histTokens = estimateHistory(history);
        long userTokens = estimate(userMessage);
        long ragTokens = (ragContext != null && ragContext.getFormattedPromptContext() != null)
                ? estimate(ragContext.getFormattedPromptContext()) : 0;
        long toolTokens = estimateToolResults(toolResults);
        long reserveTokens = (configuredMaxOutputTokens != null && configuredMaxOutputTokens > 0)
                ? configuredMaxOutputTokens : DEFAULT_RESERVED_OUTPUT_TOKENS;
        long maxLimit = (configuredMaxContextTokens != null && configuredMaxContextTokens > 0)
                ? configuredMaxContextTokens : DEFAULT_MAX_CONTEXT_TOKENS;

        long totalTokens = sysTokens + histTokens + userTokens + ragTokens + toolTokens + reserveTokens;
        boolean allowed = totalTokens <= maxLimit;

        String message = allowed
                ? String.format("Tokens OK (%d / %d)", totalTokens, maxLimit)
                : String.format("Context limit exceeded: Total required %d tokens exceeds ceiling limit of %d tokens (History: %d, Tools: %d, RAG: %d)",
                totalTokens, maxLimit, histTokens, toolTokens, ragTokens);

        return new AuditResult(
                allowed, totalTokens, sysTokens, histTokens, userTokens,
                ragTokens, toolTokens, reserveTokens, maxLimit, message
        );
    }

    public static long estimate(String text) {
        if (text == null || text.isBlank()) return 0;
        return Math.max(1, (long) Math.ceil(text.length() * 0.38));
    }

    public static long estimateHistory(List<ChatMessageHistoryItem> history) {
        if (history == null || history.isEmpty()) return 0;
        long sum = 0;
        for (ChatMessageHistoryItem item : history) {
            if (item != null && item.getContent() != null) {
                sum += estimate(item.getContent()) + 4;
            }
        }
        return sum;
    }

    public static long estimateToolResults(Map<String, Object> toolResults) {
        if (toolResults == null || toolResults.isEmpty()) return 0;
        return estimate(toolResults.toString());
    }
}
