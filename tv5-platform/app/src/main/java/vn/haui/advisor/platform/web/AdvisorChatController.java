package vn.haui.advisor.platform.web;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.haui.advisor.contracts.dto.ChatRequest;
import vn.haui.advisor.contracts.dto.ChatResponse;
import vn.haui.advisor.contracts.ports.StudentContextProvider;
import vn.haui.advisor.platform.advisor.AdvisorChatService;

/**
 * Hỏi trợ lý học vụ (tag Advisor). Danh tính chỉ lấy từ phiên đăng nhập; lịch sử đọc qua /advisor/conversations.
 */
@RestController
@RequestMapping("/api/v1/advisor")
public class AdvisorChatController {

    private final StudentContextProvider studentContextProvider;
    private final AdvisorChatService chatService;

    public AdvisorChatController(StudentContextProvider studentContextProvider, AdvisorChatService chatService) {
        this.studentContextProvider = studentContextProvider;
        this.chatService = chatService;
    }

    @PostMapping("/chat")
    public ChatResponse chatAdvisor(@RequestBody ChatRequest request) {
        return chatService.chat(studentContextProvider.getAuthenticatedContext(), request);
    }
}
