package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.util.List;

/**
 * Lịch sử hội thoại của sinh viên đang đăng nhập, mới cập nhật trước.
 */
public class ConversationListResponse implements Serializable {
    private List<ConversationSummaryItem> conversations;

    public ConversationListResponse() {
    }

    public ConversationListResponse(List<ConversationSummaryItem> conversations) {
        this.conversations = conversations;
    }

    public List<ConversationSummaryItem> getConversations() {
        return conversations;
    }

    public void setConversations(List<ConversationSummaryItem> conversations) {
        this.conversations = conversations;
    }
}
