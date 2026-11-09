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
import vn.haui.advisor.contracts.dto.ChatStreamEvent;
import vn.haui.advisor.contracts.dto.TrustedStudentContext;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AdvisorStreamingServiceTest {

    @Test
    @DisplayName("streamChat coordinates STATUS -> TOOL_CALL -> TOOL_RESULT -> CHUNK -> DONE events")
    void shouldCoordinateStreamingLifecycle() {
        AiMetricsCollector collector = new AiMetricsCollector();
        MockAcademicFacade mockAcademicFacade = new MockAcademicFacade();
        DefaultToolAdapter toolAdapter = new DefaultToolAdapter(mockAcademicFacade);

        // Simulated Gemini API with tool call and streaming chunks
        LiveAdvisorModel liveModel = new LiveAdvisorModel(
                payload -> {
                    // Turn 1 inspectTurn returning tool call
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
                                "promptTokenCount": 200,
                                "candidatesTokenCount": 25
                              }
                            }
                            """;
                },
                (payload, chunkConsumer) -> {
                    // Turn 2 streamTurn emitting real-time chunks
                    chunkConsumer.accept("Điểm CPA hiện tại ");
                    chunkConsumer.accept("của bạn là 3.25, ");
                    chunkConsumer.accept("xếp loại Khá.");
                },
                null,
                true
        );

        AdvisorStreamingService service = new AdvisorStreamingService(
                liveModel,
                toolAdapter,
                null,
                null,
                null,
                collector
        );

        TrustedStudentContext context = new TrustedStudentContext(
                "STU-001", "2021600123", "Nguyễn Văn A", "IT", "K16", "REV-1"
        );
        ChatRequest request = new ChatRequest("CONV-STREAM-1", "Xem điểm học tập", "2026-11-09T10:00:00Z");

        List<ChatStreamEvent> emittedEvents = new ArrayList<>();
        service.streamChat(request, context, emittedEvents::add);

        // Verify emitted event sequence
        assertThat(emittedEvents).isNotEmpty();

        List<ChatStreamEvent.EventType> eventTypes = emittedEvents.stream()
                .map(ChatStreamEvent::getEventType)
                .toList();

        // Must include STATUS, TOOL_CALL, TOOL_RESULT, CHUNKS, DONE
        assertThat(eventTypes).contains(
                ChatStreamEvent.EventType.STATUS,
                ChatStreamEvent.EventType.TOOL_CALL,
                ChatStreamEvent.EventType.TOOL_RESULT,
                ChatStreamEvent.EventType.CHUNK,
                ChatStreamEvent.EventType.DONE
        );

        // Verify chunks concatenated
        String fullChunkText = emittedEvents.stream()
                .filter(e -> e.getEventType() == ChatStreamEvent.EventType.CHUNK)
                .map(ChatStreamEvent::getText)
                .reduce("", String::concat);
        assertThat(fullChunkText).isEqualTo("Điểm CPA hiện tại của bạn là 3.25, xếp loại Khá.");

        // Verify DONE event
        ChatStreamEvent doneEvent = emittedEvents.stream()
                .filter(e -> e.getEventType() == ChatStreamEvent.EventType.DONE)
                .findFirst()
                .orElseThrow();
        assertThat(doneEvent.getText()).contains("3.25");
        assertThat(doneEvent.getMetrics()).isNotNull();
        assertThat(doneEvent.getMetrics()).containsKey("promptTokens");

        // Verify telemetry recorded as streaming
        AiTelemetrySnapshot snapshot = collector.snapshot();
        assertThat(snapshot.totalRequests()).isEqualTo(1L);
        assertThat(snapshot.streamingRequests()).isEqualTo(1L);
        assertThat(snapshot.standardRequests()).isEqualTo(0L);
    }

    @Test
    @DisplayName("streamChat validates empty request and emits ERROR event")
    void shouldEmitErrorOnInvalidRequest() {
        AdvisorStreamingService service = new AdvisorStreamingService(
                new MockAdvisorModel(),
                new DefaultToolAdapter(new MockAcademicFacade()),
                null,
                null,
                null,
                new AiMetricsCollector()
        );

        List<ChatStreamEvent> emittedEvents = new ArrayList<>();
        service.streamChat(new ChatRequest("C1", "   ", "now"), null, emittedEvents::add);

        assertThat(emittedEvents).hasSize(1);
        ChatStreamEvent errorEvent = emittedEvents.getFirst();
        assertThat(errorEvent.getEventType()).isEqualTo(ChatStreamEvent.EventType.ERROR);
        assertThat(errorEvent.getCode()).isEqualTo("VALIDATION_ERROR");
    }
}
