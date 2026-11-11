package vn.haui.advisor.platform.web;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import vn.haui.advisor.ai.service.AdvisorStreamingService;
import vn.haui.advisor.contracts.dto.ChatRequest;
import vn.haui.advisor.contracts.dto.ChatResponse;
import vn.haui.advisor.contracts.dto.TrustedStudentContext;
import vn.haui.advisor.contracts.ports.StudentContextProvider;
import vn.haui.advisor.contracts.stream.ChatStreamEvent;
import vn.haui.advisor.platform.advisor.AdvisorChatService;

import java.util.Locale;
import java.util.concurrent.ExecutorService;

/**
 * Hỏi trợ lý học vụ (tag Advisor). Danh tính chỉ lấy từ phiên đăng nhập; lịch sử đọc qua /advisor/conversations.
 * Hỗ trợ đồng thời HTTP POST truyền thống và Server-Sent Events (SSE) Streaming.
 */
@RestController
@RequestMapping("/api/v1/advisor")
public class AdvisorChatController {

    private final StudentContextProvider studentContextProvider;
    private final AdvisorChatService chatService;
    private final AdvisorStreamingService streamingService;
    private final ExecutorService executor;

    public AdvisorChatController(
            StudentContextProvider studentContextProvider,
            AdvisorChatService chatService,
            AdvisorStreamingService streamingService,
            @Qualifier("advisorChatExecutor") ExecutorService executor
    ) {
        this.studentContextProvider = studentContextProvider;
        this.chatService = chatService;
        this.streamingService = streamingService;
        this.executor = executor;
    }

    @PostMapping("/chat")
    public ChatResponse chatAdvisor(@RequestBody ChatRequest request) {
        return chatService.chat(studentContextProvider.getAuthenticatedContext(), request);
    }

    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamChat(@RequestBody ChatRequest request) {
        TrustedStudentContext context = studentContextProvider.getAuthenticatedContext();
        SseEmitter emitter = new SseEmitter(60_000L);

        executor.execute(() -> {
            try {
                streamingService.streamChat(request, context, event -> {
                    try {
                        emitter.send(SseEmitter.event()
                                .name(event.getEventType().name().toLowerCase(Locale.ROOT))
                                .data(event));
                        if (event.getEventType() == ChatStreamEvent.EventType.DONE ||
                                event.getEventType() == ChatStreamEvent.EventType.ERROR) {
                            emitter.complete();
                        }
                    } catch (Exception ex) {
                        emitter.completeWithError(ex);
                    }
                });
            } catch (Exception ex) {
                emitter.completeWithError(ex);
            }
        });

        return emitter;
    }
}
