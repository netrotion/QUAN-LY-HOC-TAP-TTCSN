package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

/**
 * Yêu cầu hội thoại từ Client.
 * Tuyệt đối không chứa studentId trong request payload để tránh giả mạo danh tính.
 * Định danh sinh viên được server trích xuất an toàn từ phiên đăng nhập.
 */
public class ChatRequest implements Serializable {
    private String conversationId;
    private String message;
    private String clientTimestamp;

    public ChatRequest() {
    }

    public ChatRequest(String conversationId, String message, String clientTimestamp) {
        this.conversationId = conversationId;
        this.message = message;
        this.clientTimestamp = clientTimestamp;
    }

    public String getConversationId() {
        return conversationId;
    }

    public void setConversationId(String conversationId) {
        this.conversationId = conversationId;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getClientTimestamp() {
        return clientTimestamp;
    }

    public void setClientTimestamp(String clientTimestamp) {
        this.clientTimestamp = clientTimestamp;
    }
}
