package vn.haui.advisor.platform.conversation;

import org.springframework.stereotype.Component;
import vn.haui.advisor.contracts.dto.ConversationRecord;
import vn.haui.advisor.contracts.dto.ConversationSummaryItem;
import vn.haui.advisor.contracts.ports.ConversationStore;

import java.util.List;
import java.util.function.Supplier;

/**
 * Lượt chat do platform điều phối. Module AI đọc và ghi hội thoại qua {@link #advisorStore()}: đọc đi thẳng xuống DB, còn
 * lần ghi được giữ trong lượt đang chạy trên luồng hiện tại tới khi platform xác nhận lượt có câu trả lời thật
 * ({@link #commit}). Lượt bị bỏ (AI lỗi, quá hạn) không ghi gì, kể cả khi module AI ghi muộn sau hạn.
 */
@Component
public class ConversationTurns {

    private final JdbcConversationStore store;
    private final ThreadLocal<Turn> current = new ThreadLocal<>();
    private final ConversationStore advisorStore = new AdvisorStore();

    public ConversationTurns(JdbcConversationStore store) {
        this.store = store;
    }

    /** Một lượt chat của sinh viên trên một hội thoại. */
    public static final class Turn {

        private final String conversationId;
        private final String studentId;
        private volatile boolean abandoned;
        private volatile String lastSeenUpdatedAt;
        private volatile ConversationRecord pending;
        private volatile String expectedUpdatedAt;

        public Turn(String conversationId, String studentId) {
            this.conversationId = conversationId;
            this.studentId = studentId;
        }

        /** Không ghi gì cho lượt này nữa (kể cả lần ghi đến muộn). */
        public void abandon() {
            abandoned = true;
        }

        public boolean hasPendingWrite() {
            return pending != null;
        }

        private boolean owns(String conversationId, String studentId) {
            return this.conversationId.equals(conversationId) && this.studentId.equals(studentId);
        }
    }

    /** ConversationStore cấp cho module AI. */
    public ConversationStore advisorStore() {
        return advisorStore;
    }

    /** Chạy {@code call} với lượt {@code turn} gắn cho luồng hiện tại; gỡ ra (trả lại lượt trước nếu có) khi xong. */
    public <T> T run(Turn turn, Supplier<T> call) {
        Turn previous = current.get();
        current.set(turn);
        try {
            return call.get();
        } finally {
            if (previous == null) {
                current.remove();
            } else {
                current.set(previous);
            }
        }
    }

    /**
     * Ghi lần ghi đã giữ của lượt nếu hội thoại chưa bị lượt khác cập nhật kể từ lần module AI đọc để nối thêm.
     *
     * @return false khi không có gì để ghi, lượt đã bị bỏ, hoặc hội thoại đã đổi (không ghi gì)
     */
    public boolean commit(Turn turn) {
        ConversationRecord record = turn.pending;
        if (record == null || turn.abandoned) {
            return false;
        }
        return store.saveIfUnchanged(record, turn.expectedUpdatedAt);
    }

    private final class AdvisorStore implements ConversationStore {

        @Override
        public ConversationRecord getConversation(String conversationId, String studentId) {
            ConversationRecord record = store.getConversation(conversationId, studentId);
            Turn turn = current.get();
            if (turn != null && turn.owns(conversationId, studentId)) {
                turn.lastSeenUpdatedAt = record == null ? null : record.getUpdatedAt();
            }
            return record;
        }

        @Override
        public void saveConversation(ConversationRecord record) {
            Turn turn = current.get();
            if (turn == null) {
                throw new IllegalStateException("Module AI chỉ ghi hội thoại trong lượt chat do platform điều phối");
            }
            if (record == null || !turn.owns(record.getConversationId(), record.getStudentId())) {
                throw new IllegalArgumentException("Lượt chat chỉ được ghi hội thoại của chính nó");
            }
            if (turn.abandoned) {
                return;
            }
            // Bản ghi là bản đọc gần nhất nối thêm lượt này: chỉ ghi khi hội thoại vẫn như lần đọc đó
            turn.expectedUpdatedAt = turn.lastSeenUpdatedAt;
            turn.pending = record;
        }

        @Override
        public List<ConversationSummaryItem> listConversations(String studentId) {
            return store.listConversations(studentId);
        }
    }
}
