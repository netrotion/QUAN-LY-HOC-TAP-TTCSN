package vn.haui.advisor.platform.web;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import vn.haui.advisor.contracts.dto.ChatRequest;
import vn.haui.advisor.contracts.dto.ChatResponse;
import vn.haui.advisor.contracts.dto.TrustedStudentContext;
import vn.haui.advisor.contracts.ports.StudentContextProvider;
import vn.haui.advisor.contracts.stream.ChatStreamEvent;
import vn.haui.advisor.platform.advisor.AdvisorChatService;
import vn.haui.advisor.platform.error.ApiException;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.FutureTask;
import java.util.concurrent.RejectedExecutionException;

/**
 * Hỏi trợ lý học vụ (tag Advisor). Danh tính chỉ lấy từ phiên đăng nhập; lịch sử đọc qua /advisor/conversations.
 * Hỗ trợ đồng thời HTTP POST truyền thống và Server-Sent Events (SSE) Streaming.
 */
@RestController
@RequestMapping("/api/v1/advisor")
public class AdvisorChatController {

    private final StudentContextProvider studentContextProvider;
    private final AdvisorChatService chatService;
    private final ExecutorService executor;

    public AdvisorChatController(
            StudentContextProvider studentContextProvider,
            AdvisorChatService chatService,
            @Qualifier("advisorChatExecutor") ExecutorService executor
    ) {
        this.studentContextProvider = studentContextProvider;
        this.chatService = chatService;
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

        FutureTask<Void> task = new FutureTask<>(() -> {
            try {
                chatService.streamChat(context, request, event -> send(emitter, event));
            } catch (ApiException ex) {
                send(emitter, ChatStreamEvent.error(ex.getCode().name(), ex.getMessage(), ex.getRetryAfterSeconds() != null));
            } catch (UncheckedIOException ex) {
                emitter.completeWithError(ex.getCause());
            } catch (RuntimeException ex) {
                emitter.completeWithError(ex);
            }
            return null;
        });
        emitter.onTimeout(() -> task.cancel(true));
        emitter.onError(error -> task.cancel(true));
        try {
            executor.execute(task);
        } catch (RejectedExecutionException ex) {
            send(emitter, ChatStreamEvent.error("AI_UNAVAILABLE", "Trợ lý AI đang bận. Vui lòng thử lại.", true));
        }

        return emitter;
    }

    private static void send(SseEmitter emitter, ChatStreamEvent event) {
        try {
            emitter.send(SseEmitter.event().name(event.getEventType().name().toLowerCase(Locale.ROOT)).data(event));
            if (event.getEventType() == ChatStreamEvent.EventType.DONE || event.getEventType() == ChatStreamEvent.EventType.ERROR) {
                emitter.complete();
            }
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }
}
