package vn.haui.advisor.ai.telemetry;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AiMetricsCollector Unit Tests")
class AiMetricsCollectorTest {

    private AiMetricsCollector collector;

    @BeforeEach
    void setUp() {
        collector = new AiMetricsCollector();
        collector.reset();
    }

    @Test
    @DisplayName("Records standard chat turn and calculates cumulative tokens and latencies")
    void testRecordStandardTurn() {
        collector.recordTurn(
                false,
                "REGULATION",
                1200,
                350,
                45,
                0,
                800,
                0,
                850
        );

        AiTelemetrySnapshot snapshot = collector.snapshot();

        assertThat(snapshot.totalRequests()).isEqualTo(1);
        assertThat(snapshot.standardRequests()).isEqualTo(1);
        assertThat(snapshot.streamingRequests()).isEqualTo(0);
        assertThat(snapshot.promptTokens()).isEqualTo(1200);
        assertThat(snapshot.generationTokens()).isEqualTo(350);
        assertThat(snapshot.totalTokens()).isEqualTo(1550);
        assertThat(snapshot.avgRagLatencyMs()).isEqualTo(45.0);
        assertThat(snapshot.avgTotalLatencyMs()).isEqualTo(850.0);
        assertThat(snapshot.categoryCounts()).containsEntry("REGULATION", 1L);

        // Cost verification: (1200 * 0.35 + 350 * 1.05) / 1,000,000 = (420 + 367.5) / 1,000,000 = 0.0007875 USD
        assertThat(snapshot.estimatedCostUsd()).isGreaterThan(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("Records streaming turn and tool executions correctly")
    void testRecordStreamingAndTools() {
        collector.recordToolExecution("run_graduation_audit", 120);
        collector.recordTurn(
                true,
                "STUDY_PLAN",
                2000,
                800,
                30,
                120,
                600,
                700,
                1450
        );

        AiTelemetrySnapshot snapshot = collector.snapshot();

        assertThat(snapshot.totalRequests()).isEqualTo(1);
        assertThat(snapshot.streamingRequests()).isEqualTo(1);
        assertThat(snapshot.toolExecutionsCount()).isEqualTo(1);
        assertThat(snapshot.avgToolLatencyMs()).isEqualTo(120.0);
    }

    @Test
    @DisplayName("Tracks guardrail violations count")
    void testRecordGuardrailViolation() {
        collector.recordGuardrailViolation("PII_REDACTED");
        collector.recordGuardrailViolation("SUSPECTED_PROMPT_INJECTION");

        AiTelemetrySnapshot snapshot = collector.snapshot();
        assertThat(snapshot.guardrailViolationsCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("Exposes Prometheus metrics via Micrometer MeterRegistry")
    void testMicrometerMetricsIntegration() {
        io.micrometer.core.instrument.simple.SimpleMeterRegistry registry = new io.micrometer.core.instrument.simple.SimpleMeterRegistry();
        AiMetricsCollector micrometerCollector = new AiMetricsCollector(registry);

        micrometerCollector.recordTurn(
                true,
                "STUDY_PLAN",
                1500,
                400,
                25,
                110,
                500,
                600,
                1235
        );
        micrometerCollector.recordToolExecution("run_graduation_audit", 110);
        micrometerCollector.recordGuardrailViolation("PII_DETECTED");

        // Assert Micrometer counters & timers
        assertThat(registry.find("ai.advisor.requests").counter()).isNotNull();
        assertThat(registry.find("ai.advisor.requests").counter().count()).isEqualTo(1.0);

        assertThat(registry.find("ai.advisor.tokens").tags("type", "prompt").counter()).isNotNull();
        assertThat(registry.find("ai.advisor.tokens").tags("type", "prompt").counter().count()).isEqualTo(1500.0);

        assertThat(registry.find("ai.advisor.tokens").tags("type", "generation").counter()).isNotNull();
        assertThat(registry.find("ai.advisor.tokens").tags("type", "generation").counter().count()).isEqualTo(400.0);

        assertThat(registry.find("ai.advisor.latency").timer()).isNotNull();
        assertThat(registry.find("ai.advisor.latency").timer().count()).isEqualTo(1);

        assertThat(registry.find("ai.advisor.tool.duration").tags("tool", "run_graduation_audit").timer()).isNotNull();
        assertThat(registry.find("ai.advisor.tool.duration").tags("tool", "run_graduation_audit").timer().count()).isEqualTo(1);

        assertThat(registry.find("ai.advisor.guardrail.violations").tags("reason", "PII_DETECTED").counter()).isNotNull();
        assertThat(registry.find("ai.advisor.guardrail.violations").tags("reason", "PII_DETECTED").counter().count()).isEqualTo(1.0);
    }
}

