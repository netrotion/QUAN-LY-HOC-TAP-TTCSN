package vn.haui.advisor.contracts.fake;

import vn.haui.advisor.contracts.dto.ConversationRecord;
import vn.haui.advisor.contracts.dto.ConversationSummaryItem;
import vn.haui.advisor.contracts.ports.ConversationStore;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * ConversationStore trong bộ nhớ, giữ đúng quy tắc của port: chỉ chủ hội thoại đọc được hội thoại.
 */
public class InMemoryConversationStore implements ConversationStore {

    private final Map<String, ConversationRecord> records = new ConcurrentHashMap<>();

    @Override
    public ConversationRecord getConversation(String conversationId, String studentId) {
        ConversationRecord record = conversationId == null ? null : records.get(conversationId);
        if (record == null || studentId == null || !studentId.equals(record.getStudentId())) {
            return null;
        }
        return record;
    }

    @Override
    public void saveConversation(ConversationRecord record) {
        if (record == null || record.getConversationId() == null || record.getStudentId() == null) {
            throw new IllegalArgumentException("conversationId và studentId là bắt buộc");
        }
        records.compute(record.getConversationId(), (id, existing) -> {
            if (existing != null && !existing.getStudentId().equals(record.getStudentId())) {
                throw new IllegalArgumentException("conversationId đã thuộc sinh viên khác");
            }
            return record;
        });
    }

    @Override
    public List<ConversationSummaryItem> listConversations(String studentId) {
        return records.values().stream()
                .filter(r -> r.getStudentId().equals(studentId))
                .sorted(Comparator.comparing((ConversationRecord r) -> r.getUpdatedAt() == null ? "" : r.getUpdatedAt())
                        .reversed())
                .map(r -> new ConversationSummaryItem(r.getConversationId(), r.getTitle(), r.getCreatedAt(), r.getUpdatedAt()))
                .toList();
    }
}
