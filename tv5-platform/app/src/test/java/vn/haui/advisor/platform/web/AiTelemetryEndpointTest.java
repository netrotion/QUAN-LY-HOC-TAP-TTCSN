package vn.haui.advisor.platform.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import vn.haui.advisor.ai.telemetry.AiMetricsCollector;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AiTelemetryEndpointTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AiMetricsCollector metricsCollector;

    @Test
    @DisplayName("GET /actuator/ai-telemetry returns AiTelemetrySnapshot with token and latency APM metrics")
    void shouldReturnAiTelemetrySnapshot() throws Exception {
        // Record simulated chat metrics
        metricsCollector.recordTurn(
                false,
                "STUDY_PLAN",
                500,
                150,
                25,
                40,
                300,
                400,
                765
        );
        metricsCollector.recordToolExecution("academic_status", 35);
        metricsCollector.recordGuardrailViolation("PII_REDACTION");

        mockMvc.perform(get("/actuator/ai-telemetry"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRequests", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.promptTokens", greaterThanOrEqualTo(500)))
                .andExpect(jsonPath("$.generationTokens", greaterThanOrEqualTo(150)))
                .andExpect(jsonPath("$.totalTokens", greaterThanOrEqualTo(650)))
                .andExpect(jsonPath("$.estimatedCostUsd", notNullValue()))
                .andExpect(jsonPath("$.avgTotalLatencyMs", greaterThan(0.0)))
                .andExpect(jsonPath("$.toolExecutionsCount", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.guardrailViolationsCount", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.categoryCounts.STUDY_PLAN", greaterThanOrEqualTo(1)));
    }
}
