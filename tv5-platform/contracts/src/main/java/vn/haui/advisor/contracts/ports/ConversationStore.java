package vn.haui.advisor.contracts.ports;

import vn.haui.advisor.contracts.dto.ConversationRecord;

/**
 * Port lưu trữ và truy xuất lịch sử hội thoại có kiểm soát quyền truy cập theo tài khoản.
 * Do platform app (TV5) implement.
 */
public interface ConversationStore {

    ConversationRecord getConversation(String conversationId, String studentId);

    void saveConversation(ConversationRecord record);
}
