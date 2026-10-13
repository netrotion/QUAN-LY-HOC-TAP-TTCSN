package vn.haui.advisor.platform.conversation;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import vn.haui.advisor.contracts.dto.ConversationRecord;
import vn.haui.advisor.contracts.dto.ConversationSummaryItem;
import vn.haui.advisor.contracts.ports.ConversationStore;

import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Optional;

/**
 * ConversationStore trên bảng conversations. Tin nhắn lưu nguyên JSON do module AI định nghĩa (messagesJson);
 * mọi truy vấn kèm student_id nên sinh viên khác không đọc hay ghi đè được hội thoại.
 */
@Component
public class JdbcConversationStore implements ConversationStore {

    static final String DEFAULT_TITLE = "Hội thoại tư vấn mới";
    private static final int MAX_ID = 100;
    private static final int MAX_TITLE = 255;
    private static final String COLUMNS = "conversation_id, student_id, title, created_at, updated_at, messages_json";

    private final JdbcClient jdbc;
    private final TransactionTemplate transaction;
    private final int maxMessagesBytes;

    public JdbcConversationStore(JdbcClient jdbc, TransactionTemplate transaction,
                                 @Value("${haui.conversation.max-messages-bytes:1048576}") int maxMessagesBytes) {
        this.jdbc = jdbc;
        this.transaction = transaction;
        this.maxMessagesBytes = maxMessagesBytes;
    }

    @Override
    public ConversationRecord getConversation(String conversationId, String studentId) {
        if (conversationId == null || studentId == null) {
            return null;
        }
        return jdbc.sql("SELECT " + COLUMNS + " FROM conversations WHERE conversation_id = :id AND student_id = :studentId")
                .param("id", conversationId).param("studentId", studentId)
                .query(JdbcConversationStore::map)
                .optional().orElse(null);
    }

    @Override
    public void saveConversation(ConversationRecord record) {
        check(record);
        Instant now = Instant.now();
        String title = record.getTitle() == null || record.getTitle().isBlank()
                ? DEFAULT_TITLE : truncate(record.getTitle().trim(), MAX_TITLE);

        transaction.executeWithoutResult(status -> {
            Optional<String> owner = jdbc.sql("SELECT student_id FROM conversations WHERE conversation_id = :id FOR UPDATE")
                    .param("id", record.getConversationId())
                    .query(String.class).optional();
            if (owner.isPresent() && !owner.get().equals(record.getStudentId())) {
                throw new IllegalArgumentException("conversationId đã thuộc sinh viên khác");
            }
            if (owner.isPresent()) {
                jdbc.sql("""
                                UPDATE conversations SET title = :title, messages_json = :messages, updated_at = :now
                                WHERE conversation_id = :id AND student_id = :studentId
                                """)
                        .param("title", title).param("messages", record.getMessagesJson()).param("now", ts(now))
                        .param("id", record.getConversationId()).param("studentId", record.getStudentId())
                        .update();
            } else {
                Instant createdAt = parse(record.getCreatedAt(), now);
                jdbc.sql("""
                                INSERT INTO conversations (conversation_id, student_id, title, messages_json, created_at, updated_at)
                                VALUES (:id, :studentId, :title, :messages, :createdAt, :now)
                                """)
                        .param("id", record.getConversationId()).param("studentId", record.getStudentId())
                        .param("title", title).param("messages", record.getMessagesJson())
                        .param("createdAt", ts(createdAt)).param("now", ts(now))
                        .update();
            }
        });
    }

    @Override
    public List<ConversationSummaryItem> listConversations(String studentId) {
        return jdbc.sql("""
                        SELECT conversation_id, title, created_at, updated_at FROM conversations
                        WHERE student_id = :studentId ORDER BY updated_at DESC, conversation_id
                        """)
                .param("studentId", studentId)
                .query((rs, n) -> new ConversationSummaryItem(rs.getString("conversation_id"), rs.getString("title"),
                        text(rs, "created_at"), text(rs, "updated_at")))
                .list();
    }

    private void check(ConversationRecord record) {
        if (record == null || isBlank(record.getConversationId()) || isBlank(record.getStudentId())) {
            throw new IllegalArgumentException("conversationId và studentId là bắt buộc");
        }
        if (record.getConversationId().length() > MAX_ID) {
            throw new IllegalArgumentException("conversationId tối đa " + MAX_ID + " ký tự");
        }
        String messages = record.getMessagesJson();
        if (messages != null && messages.getBytes(StandardCharsets.UTF_8).length > maxMessagesBytes) {
            throw new IllegalArgumentException("messagesJson vượt " + maxMessagesBytes + " byte");
        }
    }

    private static ConversationRecord map(ResultSet rs, int rowNum) throws SQLException {
        return new ConversationRecord(rs.getString("conversation_id"), rs.getString("student_id"), rs.getString("title"),
                text(rs, "created_at"), text(rs, "updated_at"), rs.getString("messages_json"));
    }

    private static Instant parse(String value, Instant fallback) {
        if (value == null) {
            return fallback;
        }
        try {
            return OffsetDateTime.parse(value).toInstant();
        } catch (DateTimeParseException ex) {
            return fallback;
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String truncate(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max);
    }

    private static OffsetDateTime ts(Instant instant) {
        return OffsetDateTime.ofInstant(instant, ZoneOffset.UTC);
    }

    private static String text(ResultSet rs, String column) throws SQLException {
        OffsetDateTime value = rs.getObject(column, OffsetDateTime.class);
        return value == null ? null : value.toInstant().toString();
    }
}
