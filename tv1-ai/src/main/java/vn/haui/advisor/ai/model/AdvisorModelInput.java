package vn.haui.advisor.ai.model;

import vn.haui.advisor.ai.conversation.ChatMessageHistoryItem;
import vn.haui.advisor.ai.intent.ParsedUserIntent;
import vn.haui.advisor.ai.rag.service.GroundedContext;
import vn.haui.advisor.contracts.dto.TrustedStudentContext;

import java.io.Serializable;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Đầu vào cho abstraction AdvisorModel.
 * Chứa tin nhắn người dùng, danh tính sinh viên tin cậy từ server context, kết quả từ ToolAdapter,
 * ngữ cảnh tri thức RAG đã neo dẫn chứng, lịch sử hội thoại nhiều lượt và ý định người dùng đã bóc tách.
 */
public class AdvisorModelInput implements Serializable {
    private final String userMessage;
    private final TrustedStudentContext studentContext;
    private final Map<String, Object> toolResults;
    private final GroundedContext groundedContext;
    private final List<ChatMessageHistoryItem> history;
    private final ParsedUserIntent userIntent;

    public AdvisorModelInput(String userMessage, TrustedStudentContext studentContext, Map<String, Object> toolResults) {
        this(userMessage, studentContext, toolResults, null, Collections.emptyList(), null);
    }

    public AdvisorModelInput(String userMessage,
                             TrustedStudentContext studentContext,
                             Map<String, Object> toolResults,
                             GroundedContext groundedContext) {
        this(userMessage, studentContext, toolResults, groundedContext, Collections.emptyList(), null);
    }

    public AdvisorModelInput(String userMessage,
                             TrustedStudentContext studentContext,
                             Map<String, Object> toolResults,
                             GroundedContext groundedContext,
                             List<ChatMessageHistoryItem> history,
                             ParsedUserIntent userIntent) {
        this.userMessage = userMessage;
        this.studentContext = studentContext;
        this.toolResults = toolResults != null ? Collections.unmodifiableMap(toolResults) : Collections.emptyMap();
        this.groundedContext = groundedContext;
        this.history = history != null ? Collections.unmodifiableList(history) : Collections.emptyList();
        this.userIntent = userIntent;
    }

    public String getUserMessage() {
        return userMessage;
    }

    public TrustedStudentContext getStudentContext() {
        return studentContext;
    }

    public Map<String, Object> getToolResults() {
        return toolResults;
    }

    public GroundedContext getGroundedContext() {
        return groundedContext;
    }

    public List<ChatMessageHistoryItem> getHistory() {
        return history;
    }

    public ParsedUserIntent getUserIntent() {
        return userIntent;
    }
}
