package vn.haui.advisor.platform.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.haui.advisor.contracts.dto.ConversationListResponse;
import vn.haui.advisor.contracts.dto.ConversationRecord;
import vn.haui.advisor.contracts.ports.ConversationStore;
import vn.haui.advisor.contracts.ports.StudentContextProvider;
import vn.haui.advisor.platform.error.ApiException;

import java.util.ArrayList;

/**
 * Lịch sử hội thoại của sinh viên đang đăng nhập (tag Advisor). Ghi hội thoại do module AI làm qua ConversationStore.
 */
@RestController
@RequestMapping("/api/v1/advisor/conversations")
public class ConversationController {

    private final StudentContextProvider studentContextProvider;
    private final ConversationStore conversationStore;

    public ConversationController(StudentContextProvider studentContextProvider, ConversationStore conversationStore) {
        this.studentContextProvider = studentContextProvider;
        this.conversationStore = conversationStore;
    }

    @GetMapping
    public ConversationListResponse listConversations() {
        String studentId = studentContextProvider.getAuthenticatedContext().getStudentId();
        return new ConversationListResponse(new ArrayList<>(conversationStore.listConversations(studentId)));
    }

    @GetMapping("/{conversationId}")
    public ConversationRecord getConversation(@PathVariable String conversationId) {
        String studentId = studentContextProvider.getAuthenticatedContext().getStudentId();
        ConversationRecord record = conversationStore.getConversation(conversationId, studentId);
        if (record == null) {
            throw ApiException.conversationNotFound(conversationId);
        }
        return record;
    }
}
