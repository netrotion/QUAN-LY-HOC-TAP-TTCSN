package vn.haui.advisor.platform.advisor;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import vn.haui.advisor.ai.config.AiProperties;
import vn.haui.advisor.platform.config.AdvisorConfig;
import vn.haui.advisor.platform.config.AdvisorProperties;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Sẵn sàng của trợ lý AI: live cần khóa, mock chỉ ở dev/test, lỗi gần đây → DEGRADED")
class AdvisorReadinessTest {

    @Test
    @DisplayName("ai.mode=mock ngoài profile dev/test làm ứng dụng không khởi động; ở dev là MOCK")
    void mockOnlyInDevOrTest() {
        AiProperties mock = new AiProperties();
        mock.setMode("mock");
        AdvisorConfig config = new AdvisorConfig();
        assertThatThrownBy(() -> config.advisorReadiness(mock, new AdvisorProperties(), new MockEnvironment()))
                .isInstanceOf(IllegalStateException.class);
        MockEnvironment prod = new MockEnvironment();
        prod.setActiveProfiles("prod");
        assertThatThrownBy(() -> config.advisorReadiness(mock, new AdvisorProperties(), prod))
                .isInstanceOf(IllegalStateException.class);
        MockEnvironment dev = new MockEnvironment();
        dev.setActiveProfiles("dev");
        assertThat(config.advisorReadiness(mock, new AdvisorProperties(), dev).status()).isEqualTo(AdvisorReadiness.Status.MOCK);
    }

    @Test
    @DisplayName("Live: thiếu khóa → NOT_CONFIGURED (không nhận câu hỏi); có khóa → READY; lượt lỗi gần đây → DEGRADED")
    void liveStatus() {
        AiProperties live = new AiProperties();
        live.setMode("live");
        AdvisorConfig config = new AdvisorConfig();
        AdvisorReadiness missing = config.advisorReadiness(live, new AdvisorProperties(), new MockEnvironment());
        assertThat(missing.status()).isEqualTo(AdvisorReadiness.Status.NOT_CONFIGURED);
        assertThat(missing.canAnswer()).isFalse();

        live.getModel().setApiKey("khoa-test");
        AdvisorReadiness ready = config.advisorReadiness(live, new AdvisorProperties(), new MockEnvironment());
        assertThat(ready.status()).isEqualTo(AdvisorReadiness.Status.READY);

        MutableClock clock = new MutableClock(Instant.parse("2026-10-23T09:00:00Z"));
        AdvisorReadiness tracked = new AdvisorReadiness(live.getMode(), () -> true, Duration.ofMinutes(2), clock);
        tracked.recordFailure("TIMEOUT");
        assertThat(tracked.status()).isEqualTo(AdvisorReadiness.Status.DEGRADED);
        assertThat(tracked.canAnswer()).isTrue();
        assertThat(tracked.lastFailureReason()).isEqualTo("TIMEOUT");
        clock.now = clock.now.plus(Duration.ofMinutes(3));
        assertThat(tracked.status()).as("hết cửa sổ theo dõi").isEqualTo(AdvisorReadiness.Status.READY);
        tracked.recordFailure("PROVIDER_ERROR");
        tracked.recordSuccess();
        assertThat(tracked.status()).isEqualTo(AdvisorReadiness.Status.READY);
        assertThat(tracked.lastFailureReason()).isNull();
    }

    private static final class MutableClock extends Clock {

        private Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
