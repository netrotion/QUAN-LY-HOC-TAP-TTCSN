package vn.haui.advisor.contracts.ports;

import vn.haui.advisor.contracts.dto.ConversationRecord;
import vn.haui.advisor.contracts.dto.ConversationSummaryItem;

import java.util.List;

/**
 * Port lưu trữ và truy xuất lịch sử hội thoại có kiểm soát quyền truy cập theo tài khoản.
 * Do platform app (TV5) implement; module AI (TV1) chỉ dùng qua port này.
 *
 * Mọi thao tác nhận studentId tin cậy từ {@link StudentContextProvider}, không lấy từ client hay LLM.
 */
public interface ConversationStore {

    /** Hội thoại của đúng sinh viên này; null nếu không có hoặc thuộc sinh viên khác. */
    ConversationRecord getConversation(String conversationId, String studentId);

    /**
     * Tạo mới hoặc ghi đè hội thoại của record.studentId.
     *
     * @throws IllegalArgumentException khi conversationId đã thuộc sinh viên khác hoặc record thiếu trường bắt buộc
     */
    void saveConversation(ConversationRecord record);

    /** Lịch sử hội thoại của sinh viên, mới cập nhật trước (không kèm nội dung tin nhắn). */
    List<ConversationSummaryItem> listConversations(String studentId);
}
