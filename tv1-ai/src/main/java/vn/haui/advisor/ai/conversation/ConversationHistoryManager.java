package vn.haui.advisor.ai.conversation;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import vn.haui.advisor.contracts.dto.ConversationRecord;
import vn.haui.advisor.contracts.fake.InMemoryConversationStore;
import vn.haui.advisor.contracts.ports.ConversationStore;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Quản lý lịch sử hội thoại đa lượt, kiểm soát bounded context (sliding window)
 * và lưu trữ an toàn qua ConversationStore với hạn mức kích thước payload.
 */
public class ConversationHistoryManager {

    private static final Logger log = LoggerFactory.getLogger(ConversationHistoryManager.class);
    private static final int DEFAULT_MAX_CHARS = 900_000;
    private static final int MAX_TITLE_LENGTH = 50;

    private final ConversationStore conversationStore;
    private final ObjectMapper objectMapper;
    private final boolean persistentStore;

    public ConversationHistoryManager() {
        this(new InMemoryConversationStore(), new ObjectMapper(), false);
    }

    public ConversationHistoryManager(ConversationStore conversationStore) {
        this(conversationStore, new ObjectMapper(), false);
    }

    public ConversationHistoryManager(ConversationStore conversationStore, ObjectMapper objectMapper) {
        this(conversationStore, objectMapper, false);
    }

    public ConversationHistoryManager(ConversationStore conversationStore, ObjectMapper objectMapper, boolean requirePersistent) {
        if (requirePersistent) {
            if (conversationStore == null || conversationStore instanceof InMemoryConversationStore) {
                throw new IllegalStateException("Persistent ConversationStore is required, but none was provided.");
            }
            this.conversationStore = conversationStore;
            this.persistentStore = true;
        } else {
            this.conversationStore = conversationStore != null ? conversationStore : new InMemoryConversationStore();
            this.persistentStore = (conversationStore != null && !(conversationStore instanceof InMemoryConversationStore));
        }
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    public boolean isPersistentStore() {
        return persistentStore;
    }

    public ConversationStore getConversationStore() {
        return conversationStore;
    }

    /**
     * Nạp lịch sử hội thoại cho sinh viên, giới hạn bởi sliding window maxTurns mới nhất.
     *
     * @param conversationId định danh hội thoại
     * @param studentId      mã sinh viên đã xác thực từ context
     * @param maxTurns       số lượng tin nhắn tối đa cần lấy (sliding window)
     * @return danh sách tin nhắn gần nhất
     */
    public List<ChatMessageHistoryItem> loadHistory(String conversationId, String studentId, int maxTurns) {
        if (conversationId == null || conversationId.isBlank()) {
            return Collections.emptyList();
        }
        if (studentId == null || studentId.isBlank()) {
            throw new IllegalArgumentException("studentId must not be null or blank");
        }

        ConversationRecord record = conversationStore.getConversation(conversationId, studentId);
        if (record == null) {
            return Collections.emptyList();
        }

        // Kiểm tra an ninh: bảo đảm record thuộc đúng sinh viên này
        if (record.getStudentId() != null && !studentId.equals(record.getStudentId())) {
            log.warn("Cross-account conversation access attempted: request studentId={}, record studentId={}",
                    studentId, record.getStudentId());
            throw new SecurityException("Cross-account access denied: conversation belongs to another student");
        }

        String json = record.getMessagesJson();
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }

        List<ChatMessageHistoryItem> allMessages;
        try {
            allMessages = objectMapper.readValue(json, new TypeReference<List<ChatMessageHistoryItem>>() {});
        } catch (JsonProcessingException e) {
            log.error("Failed to deserialize messagesJson for conversationId={}: {}", conversationId, e.getMessage());
            return Collections.emptyList();
        }

        if (allMessages == null || allMessages.isEmpty()) {
            return Collections.emptyList();
        }

        // Bounded context: sliding window trả về tối đa maxTurns tin nhắn mới nhất
        if (maxTurns > 0 && allMessages.size() > maxTurns) {
            return new ArrayList<>(allMessages.subList(allMessages.size() - maxTurns, allMessages.size()));
        }

        return new ArrayList<>(allMessages);
    }

    /**
     * Lưu một lượt hội thoại mới (tin nhắn người dùng + câu trả lời trợ lý).
     * Cắt tỉa các tin nhắn cũ nếu tổng kích thước vượt maxTotalChars (đảm bảo < 1MB database limit).
     * Tự động sinh tiêu đề từ tin nhắn đầu tiên của người dùng nếu chưa có.
     *
     * @param conversationId định danh hội thoại
     * @param studentId      mã sinh viên đã xác thực
     * @param userMsg        tin nhắn người dùng
     * @param assistantMsg   tin nhắn trợ lý
     * @param maxTotalChars  ngưỡng dung lượng tối đa (bytes/chars)
     * @return ConversationRecord đã được lưu
     */
    public ConversationRecord saveTurn(String conversationId,
                                      String studentId,
                                      ChatMessageHistoryItem userMsg,
                                      ChatMessageHistoryItem assistantMsg,
                                      int maxTotalChars) {
        if (conversationId == null || conversationId.isBlank()) {
            throw new IllegalArgumentException("conversationId must not be null or blank");
        }
        if (studentId == null || studentId.isBlank()) {
            throw new IllegalArgumentException("studentId must not be null or blank");
        }

        ConversationRecord existing = conversationStore.getConversation(conversationId, studentId);
        if (existing != null && existing.getStudentId() != null && !studentId.equals(existing.getStudentId())) {
            throw new SecurityException("Cross-account access denied: conversation belongs to another student");
        }

        List<ChatMessageHistoryItem> messages = new ArrayList<>();
        if (existing != null && existing.getMessagesJson() != null && !existing.getMessagesJson().isBlank()) {
            try {
                List<ChatMessageHistoryItem> prev = objectMapper.readValue(
                        existing.getMessagesJson(),
                        new TypeReference<List<ChatMessageHistoryItem>>() {}
                );
                if (prev != null) {
                    messages.addAll(prev);
                }
            } catch (JsonProcessingException e) {
                log.warn("Corrupted existing messagesJson for conversationId={}: {}", conversationId, e.getMessage());
            }
        }

        String now = Instant.now().toString();
        if (userMsg != null) {
            if (userMsg.getTimestamp() == null) {
                userMsg.setTimestamp(now);
            }
            messages.add(userMsg);
        }
        if (assistantMsg != null) {
            if (assistantMsg.getTimestamp() == null) {
                assistantMsg.setTimestamp(now);
            }
            messages.add(assistantMsg);
        }

        int limit = maxTotalChars > 0 ? maxTotalChars : DEFAULT_MAX_CHARS;
        String json = serialize(messages);

        // Pruning: Cắt tỉa tin nhắn cũ nhất từ đầu danh sách khi kích thước vượt quá ngưỡng
        while (isSizeExceeded(json, limit) && messages.size() > 2) {
            messages.remove(0);
            json = serialize(messages);
        }
        while (isSizeExceeded(json, limit) && messages.size() > 1) {
            messages.remove(0);
            json = serialize(messages);
        }

        // Tự động sinh tiêu đề từ tin nhắn đầu tiên của người dùng nếu tiêu đề còn trống
        String title = existing != null ? existing.getTitle() : null;
        if (title == null || title.isBlank()) {
            title = generateTitle(messages, userMsg);
        }

        String createdAt = (existing != null && existing.getCreatedAt() != null) ? existing.getCreatedAt() : now;
        String updatedAt = now;

        ConversationRecord recordToSave = new ConversationRecord(
                conversationId,
                studentId,
                title,
                createdAt,
                updatedAt,
                json
        );

        conversationStore.saveConversation(recordToSave);
        return recordToSave;
    }

    private boolean isSizeExceeded(String json, int limit) {
        if (json == null) {
            return false;
        }
        int byteLen = json.getBytes(StandardCharsets.UTF_8).length;
        return byteLen > limit || json.length() > limit;
    }

    private String serialize(List<ChatMessageHistoryItem> messages) {
        try {
            return objectMapper.writeValueAsString(messages);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize conversation history: {}", e.getMessage());
            return "[]";
        }
    }

    private String generateTitle(List<ChatMessageHistoryItem> messages, ChatMessageHistoryItem fallbackUserMsg) {
        for (ChatMessageHistoryItem item : messages) {
            if ("user".equalsIgnoreCase(item.getRole()) && item.getContent() != null && !item.getContent().isBlank()) {
                String clean = item.getContent().trim().replaceAll("\\s+", " ");
                return clean.length() > MAX_TITLE_LENGTH ? clean.substring(0, MAX_TITLE_LENGTH) : clean;
            }
        }
        if (fallbackUserMsg != null && fallbackUserMsg.getContent() != null && !fallbackUserMsg.getContent().isBlank()) {
            String clean = fallbackUserMsg.getContent().trim().replaceAll("\\s+", " ");
            return clean.length() > MAX_TITLE_LENGTH ? clean.substring(0, MAX_TITLE_LENGTH) : clean;
        }
        return "Cuộc hội thoại mới";
    }
}
