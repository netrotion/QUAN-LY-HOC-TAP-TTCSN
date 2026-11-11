package vn.haui.advisor.ai.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.mock.MockAcademicFacade;
import vn.haui.advisor.ai.model.LiveAdvisorModel;
import vn.haui.advisor.ai.model.MockAdvisorModel;
import vn.haui.advisor.ai.telemetry.AiMetricsCollector;
import vn.haui.advisor.ai.telemetry.AiTelemetrySnapshot;
import vn.haui.advisor.ai.tools.DefaultToolAdapter;
import vn.haui.advisor.contracts.dto.ChatRequest;
import vn.haui.advisor.contracts.dto.ChatResponse;
import vn.haui.advisor.contracts.dto.TrustedStudentContext;

import static org.assertj.core.api.Assertions.assertThat;

class AdvisorFacadeTelemetryTest {

    @Test
    @DisplayName("DefaultAdvisorFacade records metrics into AiMetricsCollector on chat turns")
    void shouldRecordMetricsOnChatTurn() {
        AiMetricsCollector collector = new AiMetricsCollector();
        MockAcademicFacade mockAcademicFacade = new MockAcademicFacade();
        DefaultToolAdapter toolAdapter = new DefaultToolAdapter(mockAcademicFacade);
        MockAdvisorModel advisorModel = new MockAdvisorModel();

        DefaultAdvisorFacade facade = new DefaultAdvisorFacade(
                advisorModel,
                toolAdapter,
                null,
                null,
                null,
                null,
                2500L,
                collector
        );

        TrustedStudentContext context = new TrustedStudentContext(
                "STU-001", "2021600123", "Nguyễn Văn A", "IT", "K16", "REV-1"
        );
        ChatRequest request = new ChatRequest("CONV-1", "Cho tôi xem điểm GPA", "2026-11-09T10:00:00Z");

        ChatResponse response = facade.chat(request, context);

        assertThat(response).isNotNull();
        AiTelemetrySnapshot snapshot = collector.snapshot();
        assertThat(snapshot.totalRequests()).isEqualTo(1L);
        assertThat(snapshot.standardRequests()).isEqualTo(1L);
        assertThat(snapshot.streamingRequests()).isEqualTo(0L);
        assertThat(snapshot.promptTokens()).isGreaterThan(0L);
        assertThat(snapshot.generationTokens()).isGreaterThan(0L);
        assertThat(snapshot.avgTotalLatencyMs()).isGreaterThanOrEqualTo(0.0);
        assertThat(snapshot.estimatedCostUsd()).isNotNull();
    }

    @Test
    @DisplayName("DefaultAdvisorFacade with LiveAdvisorModel tracks function calling latency and token counts")
    void shouldTrackLiveAdvisorModelTelemetry() {
        AiMetricsCollector collector = new AiMetricsCollector();
        MockAcademicFacade mockAcademicFacade = new MockAcademicFacade();
        DefaultToolAdapter toolAdapter = new DefaultToolAdapter(mockAcademicFacade);

        // Simulated Gemini API returning tool call on Turn 1 and text on Turn 2
        LiveAdvisorModel liveModel = new LiveAdvisorModel(payload -> {
            if (payload.contains("\"functionResponse\"")) {
                // Turn 2 response
                return """
                        {
                          "candidates": [{
                            "finishReason": "STOP",
                            "content": {
                              "parts": [{"text": "Điểm CPA hiện tại của bạn là 3.25."}]
                            }
                          }],
                          "usageMetadata": {
                            "promptTokenCount": 350,
                            "candidatesTokenCount": 45
                          }
                        }
                        """;
            } else {
                // Turn 1 response with tool call
                return """
                        {
                          "candidates": [{
                            "content": {
                              "parts": [{
                                "functionCall": {
                                  "name": "get_academic_status",
                                  "args": {}
                                }
                              }]
                            }
                          }],
                          "usageMetadata": {
                            "promptTokenCount": 210,
                            "candidatesTokenCount": 30
                          }
                        }
                        """;
            }
        });

        DefaultAdvisorFacade facade = new DefaultAdvisorFacade(
                liveModel,
                toolAdapter,
                null,
                null,
                null,
                null,
                2500L,
                collector
        );

        TrustedStudentContext context = new TrustedStudentContext(
                "STU-001", "2021600123", "Nguyễn Văn A", "IT", "K16", "REV-1"
        );
        ChatRequest request = new ChatRequest("CONV-LIVE", "Xem điểm học tập", "2026-11-09T10:00:00Z");

        ChatResponse response = facade.chat(request, context);

        assertThat(response).isNotNull();
        assertThat(response.getAnswer()).contains("3.25");

        AiTelemetrySnapshot snapshot = collector.snapshot();
        assertThat(snapshot.totalRequests()).isEqualTo(1L);
        assertThat(snapshot.promptTokens()).isEqualTo(560L); // 210 + 350
        assertThat(snapshot.generationTokens()).isEqualTo(75L); // 30 + 45
        assertThat(snapshot.toolExecutionsCount()).isEqualTo(1L);
        assertThat(snapshot.avgToolLatencyMs()).isGreaterThanOrEqualTo(0.0);
    }
}
