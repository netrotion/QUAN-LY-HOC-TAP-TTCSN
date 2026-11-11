package vn.haui.advisor.platform.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.haui.advisor.ai.telemetry.AiMetricsCollector;
import vn.haui.advisor.ai.telemetry.AiTelemetrySnapshot;

import java.util.Objects;

/**
 * Controller & Endpoint cung cấp số liệu đo lường hiệu năng và chi phí LLM (LLM Observability APM).
 * Hỗ trợ cả /actuator/ai-telemetry và /api/v1/system/telemetry.
 */
@RestController
public class AiTelemetryEndpoint {

    private final AiMetricsCollector metricsCollector;

    public AiTelemetryEndpoint(AiMetricsCollector metricsCollector) {
        this.metricsCollector = Objects.requireNonNull(metricsCollector, "metricsCollector must not be null");
    }

    @GetMapping({"/actuator/ai-telemetry", "/actuator/aiTelemetry", "/api/v1/system/telemetry"})
    public ResponseEntity<AiTelemetrySnapshot> getTelemetry() {
        return ResponseEntity.ok(metricsCollector.snapshot());
    }
}
