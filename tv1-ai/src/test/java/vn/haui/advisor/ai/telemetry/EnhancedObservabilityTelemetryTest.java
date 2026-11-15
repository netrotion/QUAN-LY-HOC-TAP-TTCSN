package vn.haui.advisor.ai.telemetry;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class EnhancedObservabilityTelemetryTest {

    private AiMetricsCollector collector;

    @BeforeEach
    void setUp() {
        collector = new AiMetricsCollector();
        collector.reset();
    }

    @Test
    @DisplayName("Task 5: AiTelemetrySnapshot and AiMetricsCollector accurately calculate USD, VND and average turn costs")
    void testFinancialTelemetryCalculations() {
        // 1. Static calculation helpers
        BigDecimal turnCostUsd = AiMetricsCollector.calculateCostUsd(10_000, 2_000);
        // prompt: 10,000 * 0.35 / 1,000,000 = 0.00350000
        // gen:     2,000 * 1.05 / 1,000,000 = 0.00210000
        // total: 0.00560000 USD
        assertThat(turnCostUsd).isEqualByComparingTo("0.00560000");

        BigDecimal turnCostVnd = AiMetricsCollector.calculateCostVnd(10_000, 2_000);
        // 0.0056 * 25400 = 142.24 VND
        assertThat(turnCostVnd).isEqualByComparingTo("142.24");

        // 2. Snapshot calculations when requests are recorded
        // Turn 1
        collector.recordTurn(false, "GENERAL", 10_000, 2_000, 100, 200, 300, 400, 1000);
        // Turn 2
        collector.recordTurn(true, "POLICY", 20_000, 4_000, 150, 0, 500, 0, 650);

        AiTelemetrySnapshot snapshot = collector.snapshot();
        assertThat(snapshot.totalRequests()).isEqualTo(2);
        assertThat(snapshot.promptTokens()).isEqualTo(30_000);
        assertThat(snapshot.generationTokens()).isEqualTo(6_000);
        assertThat(snapshot.totalTokens()).isEqualTo(36_000);

        // Total USD: (30000 * 0.35 + 6000 * 1.05) / 1,000,000 = (10500 + 6300) / 1,000,000 = 0.01680000
        assertThat(snapshot.estimatedCostUsd()).isEqualByComparingTo("0.01680000");

        // Total VND: 0.0168 * 25400 = 426.72 VND
        assertThat(snapshot.totalCostVnd()).isEqualByComparingTo("426.72");

        // Average USD per turn: 0.0168 / 2 = 0.00840000 USD
        assertThat(snapshot.averageCostPerTurnUsd()).isEqualByComparingTo("0.00840000");

        // Average VND per turn: 426.72 / 2 = 213.36 VND
        assertThat(snapshot.averageCostPerTurnVnd()).isEqualByComparingTo("213.36");

        // 3. Custom exchange rate test
        BigDecimal customRate = BigDecimal.valueOf(26000);
        // 0.0168 * 26000 = 436.80 VND
        assertThat(snapshot.totalCostVnd(customRate)).isEqualByComparingTo("436.80");
        assertThat(snapshot.averageCostPerTurnVnd(customRate)).isEqualByComparingTo("218.40");
    }
}

