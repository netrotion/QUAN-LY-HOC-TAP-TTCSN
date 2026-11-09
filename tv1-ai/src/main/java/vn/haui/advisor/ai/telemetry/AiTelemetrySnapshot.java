package vn.haui.advisor.ai.telemetry;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Map;
import java.util.Objects;

/**
 * Snapshot thống kê đo lường hiệu năng và chi phí LLM APM (Application Performance Monitoring).
 */
public record AiTelemetrySnapshot(
        long totalRequests,
        long streamingRequests,
        long standardRequests,
        long promptTokens,
        long generationTokens,
        long totalTokens,
        BigDecimal estimatedCostUsd,
        double avgRagLatencyMs,
        double avgToolLatencyMs,
        double avgTurn1LatencyMs,
        double avgTurn2LatencyMs,
        double avgTotalLatencyMs,
        long toolExecutionsCount,
        long guardrailViolationsCount,
        Map<String, Long> categoryCounts
) implements Serializable {

    public AiTelemetrySnapshot {
        Objects.requireNonNull(estimatedCostUsd, "estimatedCostUsd must not be null");
        categoryCounts = categoryCounts != null ? Map.copyOf(categoryCounts) : Map.of();
    }
}

