package vn.haui.advisor.ai.telemetry;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.LongAdder;

/**
 * Bộ thu thập dữ liệu đo lường hiệu năng và chi phí LLM (LLM Observability & Cost APM Collector).
 * Hoàn toàn thread-safe, sử dụng LongAdder phân tán để giảm thiểu tranh chấp bộ nhớ.
 */
@Component
public class AiMetricsCollector {

    private static final BigDecimal PROMPT_TOKEN_PRICE_PER_MILLION = BigDecimal.valueOf(0.35);
    private static final BigDecimal GEN_TOKEN_PRICE_PER_MILLION = BigDecimal.valueOf(1.05);
    private static final BigDecimal ONE_MILLION = BigDecimal.valueOf(1_000_000);

    private final LongAdder totalRequests = new LongAdder();
    private final LongAdder streamingRequests = new LongAdder();
    private final LongAdder standardRequests = new LongAdder();

    private final LongAdder promptTokens = new LongAdder();
    private final LongAdder generationTokens = new LongAdder();

    private final LongAdder totalRagTimeMs = new LongAdder();
    private final LongAdder ragCount = new LongAdder();

    private final LongAdder totalToolTimeMs = new LongAdder();
    private final LongAdder toolCount = new LongAdder();

    private final LongAdder totalTurn1TimeMs = new LongAdder();
    private final LongAdder turn1Count = new LongAdder();

    private final LongAdder totalTurn2TimeMs = new LongAdder();
    private final LongAdder turn2Count = new LongAdder();

    private final LongAdder totalLatencyMs = new LongAdder();
    private final LongAdder totalLatencyCount = new LongAdder();

    private final LongAdder toolExecutionsCount = new LongAdder();
    private final LongAdder guardrailViolationsCount = new LongAdder();

    private final ConcurrentHashMap<String, LongAdder> categoryCounts = new ConcurrentHashMap<>();

    /**
     * Ghi nhận một lượt hội thoại của cố vấn học vụ.
     */
    public void recordTurn(
            boolean isStreaming,
            String category,
            long pTokens,
            long gTokens,
            long ragMs,
            long toolMs,
            long turn1Ms,
            long turn2Ms,
            long totalMs
    ) {
        totalRequests.increment();
        if (isStreaming) {
            streamingRequests.increment();
        } else {
            standardRequests.increment();
        }

        if (pTokens > 0) promptTokens.add(pTokens);
        if (gTokens > 0) generationTokens.add(gTokens);

        if (ragMs > 0) {
            totalRagTimeMs.add(ragMs);
            ragCount.increment();
        }
        if (toolMs > 0) {
            totalToolTimeMs.add(toolMs);
            toolCount.increment();
        }
        if (turn1Ms > 0) {
            totalTurn1TimeMs.add(turn1Ms);
            turn1Count.increment();
        }
        if (turn2Ms > 0) {
            totalTurn2TimeMs.add(turn2Ms);
            turn2Count.increment();
        }
        if (totalMs > 0) {
            totalLatencyMs.add(totalMs);
            totalLatencyCount.increment();
        }

        if (category != null && !category.isBlank()) {
            categoryCounts.computeIfAbsent(category, k -> new LongAdder()).increment();
        }
    }

    /**
     * Ghi nhận một lượt thực thi Tool học vụ.
     */
    public void recordToolExecution() {
        recordToolExecution("unknown", 0);
    }

    public void recordToolExecution(String toolName, long elapsedMs) {
        toolExecutionsCount.increment();
        if (elapsedMs > 0) {
            totalToolTimeMs.add(elapsedMs);
            toolCount.increment();
        }
    }

    /**
     * Ghi nhận một lần vi phạm quy chuẩn an toàn / can thiệp Guardrail.
     */
    public void recordGuardrailViolation() {
        recordGuardrailViolation("unspecified");
    }

    public void recordGuardrailViolation(String reason) {
        guardrailViolationsCount.increment();
    }

    /**
     * Xuất snapshot số liệu thống kê thời gian thực.
     */
    public AiTelemetrySnapshot snapshot() {
        long pTokens = promptTokens.sum();
        long gTokens = generationTokens.sum();
        long totTokens = pTokens + gTokens;

        BigDecimal promptCost = BigDecimal.valueOf(pTokens)
                .multiply(PROMPT_TOKEN_PRICE_PER_MILLION)
                .divide(ONE_MILLION, 8, RoundingMode.HALF_UP);

        BigDecimal genCost = BigDecimal.valueOf(gTokens)
                .multiply(GEN_TOKEN_PRICE_PER_MILLION)
                .divide(ONE_MILLION, 8, RoundingMode.HALF_UP);

        BigDecimal totalCost = promptCost.add(genCost);

        long rCount = ragCount.sum();
        double avgRag = rCount > 0 ? (double) totalRagTimeMs.sum() / rCount : 0.0;

        long tCount = toolCount.sum();
        double avgTool = tCount > 0 ? (double) totalToolTimeMs.sum() / tCount : 0.0;

        long t1Count = turn1Count.sum();
        double avgTurn1 = t1Count > 0 ? (double) totalTurn1TimeMs.sum() / t1Count : 0.0;

        long t2Count = turn2Count.sum();
        double avgTurn2 = t2Count > 0 ? (double) totalTurn2TimeMs.sum() / t2Count : 0.0;

        long totLatCount = totalLatencyCount.sum();
        double avgTotal = totLatCount > 0 ? (double) totalLatencyMs.sum() / totLatCount : 0.0;

        Map<String, Long> cats = new HashMap<>();
        categoryCounts.forEach((k, v) -> cats.put(k, v.sum()));

        return new AiTelemetrySnapshot(
                totalRequests.sum(),
                streamingRequests.sum(),
                standardRequests.sum(),
                pTokens,
                gTokens,
                totTokens,
                totalCost,
                round(avgRag),
                round(avgTool),
                round(avgTurn1),
                round(avgTurn2),
                round(avgTotal),
                toolExecutionsCount.sum(),
                guardrailViolationsCount.sum(),
                Collections.unmodifiableMap(cats)
        );
    }

    /**
     * Đặt lại toàn bộ số đo về 0 (phục vụ test).
     */
    public void reset() {
        totalRequests.reset();
        streamingRequests.reset();
        standardRequests.reset();
        promptTokens.reset();
        generationTokens.reset();
        totalRagTimeMs.reset();
        ragCount.reset();
        totalToolTimeMs.reset();
        toolCount.reset();
        totalTurn1TimeMs.reset();
        turn1Count.reset();
        totalTurn2TimeMs.reset();
        turn2Count.reset();
        totalLatencyMs.reset();
        totalLatencyCount.reset();
        toolExecutionsCount.reset();
        guardrailViolationsCount.reset();
        categoryCounts.clear();
    }

    private double round(double val) {
        return BigDecimal.valueOf(val).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }
}
