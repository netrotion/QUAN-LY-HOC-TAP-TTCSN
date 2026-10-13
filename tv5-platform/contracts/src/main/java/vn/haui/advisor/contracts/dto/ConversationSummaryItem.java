package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

/**
 * Một hội thoại trong lịch sử chat của sinh viên đang đăng nhập.
 */
public class ConversationSummaryItem implements Serializable {
    private String conversationId;
    private String title;
    private String createdAt;
    private String updatedAt;

    public ConversationSummaryItem() {
    }

    public ConversationSummaryItem(String conversationId, String title, String createdAt, String updatedAt) {
        this.conversationId = conversationId;
        this.title = title;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getConversationId() {
        return conversationId;
    }

    public void setConversationId(String conversationId) {
        this.conversationId = conversationId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }
}
