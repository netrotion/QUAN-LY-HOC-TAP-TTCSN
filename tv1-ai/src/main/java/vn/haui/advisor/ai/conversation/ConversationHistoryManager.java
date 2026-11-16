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
     * Nạp toàn bộ 100% lịch sử hội thoại cho sinh viên mà không cắt tỉa (không dùng sliding window).
     *
     * @param conversationId định danh hội thoại
     * @param studentId      mã sinh viên đã xác thực từ context
     * @return toàn bộ danh sách tin nhắn theo đúng thứ tự thời gian
     */
    public List<ChatMessageHistoryItem> loadFullHistory(String conversationId, String studentId) {
        return loadHistory(conversationId, studentId, -1);
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
            throw new IllegalStateException("Failed to deserialize conversation history", e);
        }

        if (allMessages == null) {
            throw new IllegalStateException("Failed to deserialize conversation history: expected a message array");
        }
        if (allMessages.isEmpty()) {
            return Collections.emptyList();
        }

        // Bounded context: sliding window trả về tối đa maxTurns tin nhắn mới nhất
        if (maxTurns > 0 && allMessages.size() > maxTurns) {
            int startIndex = allMessages.size() - maxTurns;
            // Đảm bảo sliding window luôn bắt đầu từ lượt hỏi của người dùng (user), không cắt ngang câu trả lời trợ lý
            if (startIndex < allMessages.size() && "assistant".equalsIgnoreCase(allMessages.get(startIndex).getRole())) {
                startIndex++;
            }
            return new ArrayList<>(allMessages.subList(startIndex, allMessages.size()));
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
                if (prev == null) {
                    throw new IllegalStateException("Failed to deserialize conversation history: expected a message array");
                }
                messages.addAll(prev);
            } catch (JsonProcessingException e) {
                log.warn("Corrupted existing messagesJson for conversationId={}: {}", conversationId, e.getMessage());
                throw new IllegalStateException("Failed to deserialize conversation history", e);
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

        // Progressive Compaction: Nếu dung lượng vượt ngưỡng giới hạn lưu trữ và có nhiều tin nhắn,
        // thực hiện nén gộp các lượt cũ thành 1 bản tóm tắt có cấu trúc thay vì làm gãy ngang phiên trò chuyện.
        if (isSizeExceeded(json, limit) && messages.size() > 2) {
            messages = compactHistory(messages, limit);
            json = serialize(messages);
        }

        // Ngăn chặn cắt ngầm: Thay vì âm thầm xoá tin nhắn cũ (silent pruning),
        // ném ngoại lệ rõ ràng nếu sau khi nén dung lượng vẫn vượt quá giới hạn vật lý.
        if (isSizeExceeded(json, limit)) {
            throw new ConversationStorageOverflowException(
                    "Dung lượng hội thoại (" + json.getBytes(StandardCharsets.UTF_8).length
                            + " bytes) vượt quá giới hạn lưu trữ (" + limit
                            + " bytes). Giao dịch được bảo vệ để không cắt ngầm dữ liệu cũ."
            );
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
            throw new IllegalStateException("Failed to serialize conversation history", e);
        }
    }

    private List<ChatMessageHistoryItem> compactHistory(List<ChatMessageHistoryItem> messages, int limit) {
        if (messages == null || messages.size() <= 2) {
            return messages;
        }

        // Thử giữ lại 4 tin nhắn gần nhất
        if (messages.size() > 4) {
            List<ChatMessageHistoryItem> candidate4 = doCompact(messages, 4, limit);
            if (!isSizeExceeded(serialize(candidate4), limit)) {
                return candidate4;
            }
        }

        // Nếu vẫn vượt, giữ lại 2 tin nhắn gần nhất (lượt hội thoại mới nhất)
        return doCompact(messages, 2, limit);
    }

    private List<ChatMessageHistoryItem> doCompact(List<ChatMessageHistoryItem> messages, int keepCount, int limit) {
        int actualKeep = Math.min(keepCount, messages.size());
        int splitIndex = messages.size() - actualKeep;
        if (splitIndex <= 0) {
            return messages;
        }

        List<ChatMessageHistoryItem> older = messages.subList(0, splitIndex);
        List<ChatMessageHistoryItem> recent = new ArrayList<>(messages.subList(splitIndex, messages.size()));

        StringBuilder summaryBuilder = new StringBuilder("[Tóm tắt lịch sử trao đổi trước đó: ");
        int count = 0;
        for (ChatMessageHistoryItem item : older) {
            if (item == null || item.getContent() == null || item.getContent().isBlank()) {
                continue;
            }
            String raw = item.getContent().trim().replaceAll("\\s+", " ");
            if (raw.startsWith("[Tóm tắt lịch sử trao đổi trước đó:")) {
                // Tách nội dung tóm tắt cũ để gộp tiếp
                raw = raw.replace("[Tóm tắt lịch sử trao đổi trước đó:", "").replaceAll("\\]$", "").trim();
                if (!raw.isBlank()) {
                    if (count > 0) summaryBuilder.append("; ");
                    summaryBuilder.append(raw);
                    count++;
                }
                continue;
            }
            if (count > 0) {
                summaryBuilder.append("; ");
            }
            String roleTag = "assistant".equalsIgnoreCase(item.getRole()) ? "Cố vấn" : "Sinh viên";
            if (raw.length() > 40) {
                raw = raw.substring(0, 40) + "...";
            }
            summaryBuilder.append(roleTag).append(": ").append(raw);
            count++;
            if (summaryBuilder.length() > 120) {
                summaryBuilder.append("...");
                break;
            }
        }
        summaryBuilder.append("]");

        String timestamp = older.isEmpty() ? Instant.now().toString() : older.get(0).getTimestamp();
        ChatMessageHistoryItem summaryItem = ChatMessageHistoryItem.ofUser(summaryBuilder.toString(), null);
        summaryItem.setTimestamp(timestamp != null ? timestamp : Instant.now().toString());

        List<ChatMessageHistoryItem> compacted = new ArrayList<>();
        compacted.add(summaryItem);
        compacted.addAll(recent);

        if (isSizeExceeded(serialize(compacted), limit)) {
            summaryItem.setContent("[Tóm tắt trao đổi trước đó]");
        }

        return compacted;
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
