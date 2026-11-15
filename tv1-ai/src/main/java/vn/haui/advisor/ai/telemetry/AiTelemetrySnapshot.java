package vn.haui.advisor.ai.telemetry;

import java.io.Serializable;
import java.math.BigDecimal;
import java.math.RoundingMode;
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

    public static final BigDecimal DEFAULT_USD_TO_VND_RATE = BigDecimal.valueOf(25400);

    public AiTelemetrySnapshot {
        Objects.requireNonNull(estimatedCostUsd, "estimatedCostUsd must not be null");
        categoryCounts = categoryCounts != null ? Map.copyOf(categoryCounts) : Map.of();
    }

    public BigDecimal totalCostVnd() {
        return totalCostVnd(DEFAULT_USD_TO_VND_RATE);
    }

    public BigDecimal totalCostVnd(BigDecimal exchangeRate) {
        if (estimatedCostUsd == null) return BigDecimal.ZERO;
        BigDecimal rate = exchangeRate != null ? exchangeRate : DEFAULT_USD_TO_VND_RATE;
        return estimatedCostUsd.multiply(rate).setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal averageCostPerTurnUsd() {
        if (totalRequests <= 0 || estimatedCostUsd == null) return BigDecimal.ZERO;
        return estimatedCostUsd.divide(BigDecimal.valueOf(totalRequests), 8, RoundingMode.HALF_UP);
    }

    public BigDecimal averageCostPerTurnVnd() {
        return averageCostPerTurnVnd(DEFAULT_USD_TO_VND_RATE);
    }

    public BigDecimal averageCostPerTurnVnd(BigDecimal exchangeRate) {
        if (totalRequests <= 0) return BigDecimal.ZERO;
        return totalCostVnd(exchangeRate).divide(BigDecimal.valueOf(totalRequests), 2, RoundingMode.HALF_UP);
    }
}
