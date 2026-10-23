package vn.haui.advisor.platform.advisor;

import vn.haui.advisor.ai.config.AiMode;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.function.BooleanSupplier;

/**
 * Trạng thái sẵn sàng của trợ lý AI. Chỉ quyết định Chat có nhận câu hỏi hay không; hồ sơ, kế hoạch và What-if không phụ
 * thuộc trạng thái này.
 *
 * - READY: mô hình thật đã có khóa API, lượt gần đây không lỗi.
 * - DEGRADED: có khóa nhưng vừa có lượt lỗi/quá hạn trong cửa sổ theo dõi; vẫn nhận câu hỏi.
 * - NOT_CONFIGURED: chế độ live mà chưa có khóa API; Chat trả 503 AI_UNAVAILABLE ngay, không gọi mô hình.
 * - MOCK: mô hình thử của module AI, chỉ bật được ở profile dev/test.
 */
public class AdvisorReadiness {

    public enum Status { READY, DEGRADED, NOT_CONFIGURED, MOCK }

    private final AiMode mode;
    private final BooleanSupplier credentialsPresent;
    private final Duration degradedWindow;
    private final Clock clock;
    private volatile Instant lastFailureAt;
    private volatile String lastFailureReason;

    public AdvisorReadiness(AiMode mode, BooleanSupplier credentialsPresent, Duration degradedWindow, Clock clock) {
        this.mode = mode;
        this.credentialsPresent = credentialsPresent;
        this.degradedWindow = degradedWindow;
        this.clock = clock;
    }

    public Status status() {
        if (mode == AiMode.MOCK) {
            return Status.MOCK;
        }
        if (!credentialsPresent.getAsBoolean()) {
            return Status.NOT_CONFIGURED;
        }
        Instant failure = lastFailureAt;
        return failure != null && failure.isAfter(clock.instant().minus(degradedWindow)) ? Status.DEGRADED : Status.READY;
    }

    public boolean canAnswer() {
        return status() != Status.NOT_CONFIGURED;
    }

    public AiMode mode() {
        return mode;
    }

    public void recordFailure(String reason) {
        lastFailureReason = reason;
        lastFailureAt = clock.instant();
    }

    public void recordSuccess() {
        lastFailureAt = null;
    }

    public String lastFailureReason() {
        return lastFailureAt == null ? null : lastFailureReason;
    }
}
