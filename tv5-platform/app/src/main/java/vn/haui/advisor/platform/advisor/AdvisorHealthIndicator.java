package vn.haui.advisor.platform.advisor;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.boot.actuate.health.Status;
import org.springframework.stereotype.Component;
import vn.haui.advisor.ai.config.AiProperties;
import vn.haui.advisor.platform.config.AdvisorProperties;

/**
 * Readiness của trợ lý AI cho Actuator ({@code /actuator/health/advisor}): READY → UP, còn lại dùng mã riêng
 * (DEGRADED, NOT_CONFIGURED, MOCK). Các mã riêng không nằm trong thứ tự trạng thái mặc định nên không làm
 * {@code /actuator/health} của ứng dụng DOWN: thiếu AI không chặn hồ sơ/kế hoạch/What-if. Nhóm health "advisor" khai báo
 * thứ tự và mã HTTP riêng trong application.properties (NOT_CONFIGURED → 503).
 */
@Component("advisorHealthIndicator")
public class AdvisorHealthIndicator implements HealthIndicator {

    private final AdvisorReadiness readiness;
    private final AdvisorProperties properties;
    private final AiProperties ai;

    public AdvisorHealthIndicator(AdvisorReadiness readiness, AdvisorProperties properties, AiProperties ai) {
        this.readiness = readiness;
        this.properties = properties;
        this.ai = ai;
    }

    @Override
    public Health health() {
        AdvisorReadiness.Status status = readiness.status();
        Health.Builder health = Health.status(status == AdvisorReadiness.Status.READY ? Status.UP : new Status(status.name()))
                .withDetail("mode", readiness.mode().name())
                .withDetail("chatTimeout", properties.getChatTimeout().toString())
                .withDetail("ragEmbedding", ai.getRag().getEmbeddingProvider().name());
        if (readiness.lastFailureReason() != null) {
            health.withDetail("lastFailure", readiness.lastFailureReason());
        }
        return health.build();
    }
}
