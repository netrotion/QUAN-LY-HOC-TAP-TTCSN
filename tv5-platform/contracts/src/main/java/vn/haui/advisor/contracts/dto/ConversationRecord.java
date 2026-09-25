package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

public class ConversationRecord implements Serializable {
    private String conversationId;
    private String studentId;
    private String title;
    private String createdAt;
    private String updatedAt;
    private String messagesJson;

    public ConversationRecord() {
    }

    public ConversationRecord(String conversationId, String studentId, String title,
                              String createdAt, String updatedAt, String messagesJson) {
        this.conversationId = conversationId;
        this.studentId = studentId;
        this.title = title;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.messagesJson = messagesJson;
    }

    public String getConversationId() {
        return conversationId;
    }

    public void setConversationId(String conversationId) {
        this.conversationId = conversationId;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
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

    public String getMessagesJson() {
        return messagesJson;
    }

    public void setMessagesJson(String messagesJson) {
        this.messagesJson = messagesJson;
    }
}
