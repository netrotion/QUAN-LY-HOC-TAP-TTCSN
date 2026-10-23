package vn.haui.advisor.platform.advisor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import vn.haui.advisor.contracts.dto.ChatActionItem;
import vn.haui.advisor.contracts.dto.ChatRequest;
import vn.haui.advisor.contracts.dto.ChatResponse;
import vn.haui.advisor.contracts.dto.TrustedStudentContext;
import vn.haui.advisor.contracts.ports.AdvisorFacade;
import vn.haui.advisor.platform.config.AdvisorProperties;
import vn.haui.advisor.platform.conversation.ConversationTurns;
import vn.haui.advisor.platform.conversation.JdbcConversationStore;
import vn.haui.advisor.platform.error.ApiException;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.regex.Pattern;

/**
 * Chat endpoint trên AdvisorFacade của module AI (Task 4.3b).
 *
 * - Danh tính chỉ lấy từ phiên đăng nhập; mã hội thoại của sinh viên khác → 404, không gọi mô hình.
 * - Mỗi lượt chạy trong hạn haui.advisor.chat-timeout. AI chưa cấu hình, quá hạn, quá tải hoặc nhà cung cấp mô hình lỗi
 *   → 503 AI_UNAVAILABLE kèm Retry-After; không trả câu trả lời thay thế và không lưu gì.
 * - Lượt chỉ được lưu (qua ConversationStore) khi có câu trả lời thật; hội thoại bị lượt khác ghi xen → 409 CONVERSATION_BUSY.
 */
@Service
public class AdvisorChatService {

    private static final Logger log = LoggerFactory.getLogger(AdvisorChatService.class);
    private static final Pattern CONVERSATION_ID = Pattern.compile("^[A-Za-z0-9._:-]{1,100}$");

    /** Cảnh báo module AI gắn khi mô hình lỗi hoặc chưa cấu hình; câu trả lời kèm theo chỉ là thông báo lỗi. */
    static final String PROVIDER_ERROR = "MODEL_PROVIDER_ERROR";
    static final String SECURITY_ERROR = "SECURITY_ERROR";
    static final String VALIDATION_ERROR = "VALIDATION_ERROR";

    private final AdvisorFacade advisorFacade;
    private final AdvisorReadiness readiness;
    private final ConversationTurns turns;
    private final JdbcConversationStore conversations;
    private final ExecutorService executor;
    private final AdvisorProperties properties;

    public AdvisorChatService(AdvisorFacade advisorFacade, AdvisorReadiness readiness, ConversationTurns turns,
                              JdbcConversationStore conversations, @Qualifier("advisorChatExecutor") ExecutorService executor,
                              AdvisorProperties properties) {
        this.advisorFacade = advisorFacade;
        this.readiness = readiness;
        this.turns = turns;
        this.conversations = conversations;
        this.executor = executor;
        this.properties = properties;
    }

    public ChatResponse chat(TrustedStudentContext context, ChatRequest request) {
        String conversationId = request == null || request.getConversationId() == null ? null : request.getConversationId().trim();
        String message = request == null || request.getMessage() == null ? null : request.getMessage().trim();
        if (conversationId == null || !CONVERSATION_ID.matcher(conversationId).matches()) {
            throw ApiException.badRequest("conversationId là bắt buộc (1–100 ký tự chữ, số, '.', '_', ':', '-'); hội thoại mới dùng UUID.");
        }
        if (message == null || message.isEmpty() || message.length() > properties.getMaxMessageLength()) {
            throw ApiException.badRequest("message là bắt buộc, tối đa " + properties.getMaxMessageLength() + " ký tự.");
        }
        String studentId = context.getStudentId();
        if (conversations.ownerOf(conversationId).filter(owner -> !owner.equals(studentId)).isPresent()) {
            throw ApiException.conversationNotFound(conversationId);
        }
        if (!readiness.canAnswer()) {
            throw unavailable("NOT_CONFIGURED", "Trợ lý AI chưa được cấu hình trên máy chủ nên chưa trả lời được. "
                    + "Hồ sơ, kế hoạch và What-if vẫn dùng bình thường.");
        }

        ConversationTurns.Turn turn = new ConversationTurns.Turn(conversationId, studentId);
        ChatRequest input = new ChatRequest(conversationId, message, request.getClientTimestamp());
        ChatResponse response = answer(turn, input, context);
        List<String> warnings = response.getWarnings() == null ? List.of() : response.getWarnings();
        if (hasWarning(warnings, PROVIDER_ERROR)) {
            turn.abandon();
            readiness.recordFailure("PROVIDER_ERROR");
            throw unavailable("PROVIDER_ERROR", "Dịch vụ mô hình AI đang gián đoạn nên chưa có câu trả lời. Vui lòng gửi lại sau ít phút.");
        }
        if (hasWarning(warnings, SECURITY_ERROR)) {
            turn.abandon();
            throw ApiException.conversationNotFound(conversationId);
        }
        if (hasWarning(warnings, VALIDATION_ERROR)) {
            turn.abandon();
            throw ApiException.badRequest("Câu hỏi không hợp lệ.");
        }
        if (!turn.hasPendingWrite()) {
            // Module AI không lưu được lượt này: không trả câu trả lời mà lịch sử không có
            log.warn("Module AI không ghi lượt chat của hội thoại {}; cảnh báo: {}", conversationId, warnings);
            readiness.recordFailure("PERSISTENCE");
            throw unavailable("PERSISTENCE", "Chưa lưu được hội thoại nên câu trả lời không được gửi. Vui lòng gửi lại.");
        }
        if (!turns.commit(turn)) {
            throw ApiException.conversationBusy(conversationId, retryAfterSeconds());
        }
        readiness.recordSuccess();
        return normalize(response);
    }

    /** Gọi module AI trong hạn; ghi hội thoại của lượt được giữ lại tới khi xác nhận. */
    private ChatResponse answer(ConversationTurns.Turn turn, ChatRequest input, TrustedStudentContext context) {
        Future<ChatResponse> future;
        try {
            future = executor.submit(() -> turns.run(turn, () -> advisorFacade.chat(input, context)));
        } catch (RejectedExecutionException ex) {
            readiness.recordFailure("BUSY");
            throw unavailable("BUSY", "Trợ lý AI đang xử lý nhiều câu hỏi. Vui lòng gửi lại sau giây lát.");
        }
        try {
            ChatResponse response = future.get(properties.getChatTimeout().toMillis(), TimeUnit.MILLISECONDS);
            if (response == null) {
                throw new IllegalStateException("AdvisorFacade trả null");
            }
            return response;
        } catch (TimeoutException ex) {
            turn.abandon();
            future.cancel(true);
            readiness.recordFailure("TIMEOUT");
            throw unavailable("TIMEOUT", "Trợ lý AI trả lời quá thời gian cho phép. Vui lòng gửi lại câu hỏi.");
        } catch (InterruptedException ex) {
            turn.abandon();
            future.cancel(true);
            Thread.currentThread().interrupt();
            throw unavailable("INTERRUPTED", "Lượt chat bị gián đoạn. Vui lòng gửi lại câu hỏi.");
        } catch (ExecutionException | RuntimeException ex) {
            turn.abandon();
            Throwable cause = ex instanceof ExecutionException && ex.getCause() != null ? ex.getCause() : ex;
            log.warn("Lượt chat lỗi ở module AI", cause);
            readiness.recordFailure("ERROR");
            throw unavailable("ERROR", "Trợ lý AI gặp lỗi khi xử lý câu hỏi nên chưa có câu trả lời. Vui lòng gửi lại.");
        }
    }

    /** Hợp đồng: các danh sách luôn có mặt; action phải có actionType. */
    private static ChatResponse normalize(ChatResponse response) {
        List<ChatActionItem> actions = new ArrayList<>();
        if (response.getActions() != null) {
            response.getActions().stream()
                    .filter(a -> a != null && a.getActionType() != null && !a.getActionType().isBlank())
                    .forEach(actions::add);
        }
        response.setActions(actions);
        response.setSources(response.getSources() == null ? new ArrayList<>() : new ArrayList<>(response.getSources()));
        response.setWarnings(response.getWarnings() == null ? new ArrayList<>() : new ArrayList<>(response.getWarnings()));
        return response;
    }

    private static boolean hasWarning(List<String> warnings, String code) {
        return warnings.stream().anyMatch(w -> w != null && w.startsWith(code));
    }

    private ApiException unavailable(String reason, String message) {
        return ApiException.aiUnavailable(reason, message, retryAfterSeconds());
    }

    private int retryAfterSeconds() {
        return (int) Math.max(1, properties.getRetryAfter().toSeconds());
    }
}
