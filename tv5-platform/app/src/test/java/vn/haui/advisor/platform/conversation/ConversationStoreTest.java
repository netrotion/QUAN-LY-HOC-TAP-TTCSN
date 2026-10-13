package vn.haui.advisor.platform.conversation;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import vn.haui.advisor.contracts.dto.ConversationRecord;
import vn.haui.advisor.contracts.ports.ConversationStore;
import vn.haui.advisor.platform.support.TestAccounts;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("ConversationStore trên DB: lưu, mở lại, lịch sử, cô lập tài khoản")
class ConversationStoreTest {

    @Autowired
    private ConversationStore store;

    @Autowired
    private TestAccounts accounts;

    @Test
    @DisplayName("Lưu mới rồi ghi đè giữ createdAt; lịch sử mới cập nhật trước; tiêu đề trống dùng mặc định")
    void saveReopenAndList() throws Exception {
        String sv = "sv-conversation";
        accounts.ensure(sv);
        assertThat(store).isInstanceOf(JdbcConversationStore.class);

        store.saveConversation(new ConversationRecord("conv-a", sv, "Hỏi lộ trình", "2026-10-01T08:00:00Z", null,
                "[{\"role\":\"user\",\"content\":\"Kỳ tới học gì?\"}]"));
        Thread.sleep(5);
        store.saveConversation(new ConversationRecord("conv-b", sv, "  ", null, null, "[]"));
        assertThat(store.listConversations(sv)).extracting("conversationId").containsExactly("conv-b", "conv-a");
        assertThat(store.getConversation("conv-b", sv).getTitle()).isEqualTo(JdbcConversationStore.DEFAULT_TITLE);

        Thread.sleep(5);
        store.saveConversation(new ConversationRecord("conv-a", sv, "Hỏi lộ trình (tiếp)", null, null,
                "[{\"role\":\"user\",\"content\":\"Kỳ tới học gì?\"},{\"role\":\"assistant\",\"content\":\"Học IT6015.\"}]"));
        ConversationRecord reopened = store.getConversation("conv-a", sv);
        assertThat(reopened.getTitle()).isEqualTo("Hỏi lộ trình (tiếp)");
        assertThat(reopened.getCreatedAt()).isEqualTo("2026-10-01T08:00:00Z");
        assertThat(reopened.getMessagesJson()).contains("Học IT6015.");
        assertThat(store.listConversations(sv)).extracting("conversationId").containsExactly("conv-a", "conv-b");
    }

    @Test
    @DisplayName("Sinh viên khác không đọc/ghi đè được; dữ liệu thiếu hoặc quá lớn bị từ chối")
    void isolationAndLimits() {
        String owner = "sv-conversation-owner";
        String other = "sv-conversation-other";
        accounts.ensure(owner);
        accounts.ensure(other);
        store.saveConversation(new ConversationRecord("conv-private", owner, "Riêng tư", null, null, "[]"));

        assertThat(store.getConversation("conv-private", other)).isNull();
        assertThat(store.listConversations(other)).isEmpty();
        assertThatThrownBy(() -> store.saveConversation(new ConversationRecord("conv-private", other, "Chiếm", null, null, "[]")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(store.getConversation("conv-private", owner).getTitle()).isEqualTo("Riêng tư");

        assertThatThrownBy(() -> store.saveConversation(new ConversationRecord(null, owner, "x", null, null, "[]")))
                .isInstanceOf(IllegalArgumentException.class);
        String huge = "[\"" + "x".repeat(1_048_577) + "\"]";
        assertThatThrownBy(() -> store.saveConversation(new ConversationRecord("conv-huge", owner, "x", null, null, huge)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
