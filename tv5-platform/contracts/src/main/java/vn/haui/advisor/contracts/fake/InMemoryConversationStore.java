package vn.haui.advisor.contracts.fake;

import vn.haui.advisor.contracts.dto.ConversationRecord;
import vn.haui.advisor.contracts.ports.ConversationStore;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * ConversationStore trong bộ nhớ, giữ đúng quy tắc của port: chỉ chủ hội thoại đọc được hội thoại.
 */
public class InMemoryConversationStore implements ConversationStore {

    private final Map<String, ConversationRecord> records = new ConcurrentHashMap<>();

    @Override
    public ConversationRecord getConversation(String conversationId, String studentId) {
        ConversationRecord record = records.get(conversationId);
        if (record == null || studentId == null || !studentId.equals(record.getStudentId())) {
            return null;
        }
        return record;
    }

    @Override
    public void saveConversation(ConversationRecord record) {
        ConversationRecord existing = records.get(record.getConversationId());
        if (existing != null && !existing.getStudentId().equals(record.getStudentId())) {
            throw new IllegalArgumentException("conversationId đã thuộc sinh viên khác");
        }
        records.put(record.getConversationId(), record);
    }
}
