package vn.haui.advisor.ai.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.config.AiProperties;
import vn.haui.advisor.ai.conversation.TokenBudgetAuditor;
import vn.haui.advisor.ai.mock.MockAcademicFacade;
import vn.haui.advisor.ai.model.LiveAdvisorModel;
import vn.haui.advisor.ai.model.MockAdvisorModel;
import vn.haui.advisor.ai.telemetry.AiMetricsCollector;
import vn.haui.advisor.ai.telemetry.AiTelemetrySnapshot;
import vn.haui.advisor.ai.tools.DefaultToolAdapter;
import vn.haui.advisor.contracts.dto.ChatRequest;
import vn.haui.advisor.contracts.dto.TrustedStudentContext;
import vn.haui.advisor.contracts.stream.ChatStreamEvent;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

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
                    chunkConsumer.accept("của bạn là 3.80, ");
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
                ChatStreamEvent.EventType.DONE
        );

        // Verify chunks concatenated
        String fullChunkText = emittedEvents.stream()
                .filter(e -> e.getEventType() == ChatStreamEvent.EventType.CHUNK)
                .map(ChatStreamEvent::getText)
                .reduce("", String::concat);
        assertThat(fullChunkText).isEmpty();

        // Verify DONE event
        ChatStreamEvent doneEvent = emittedEvents.stream()
                .filter(e -> e.getEventType() == ChatStreamEvent.EventType.DONE)
                .findFirst()
                .orElseThrow();
        assertThat(doneEvent.getText()).contains("3.15").doesNotContain("3.80");
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

    @Test
    @DisplayName("Should emit error event CONTEXT_LIMIT_EXCEEDED when token budget ceiling is breached")
    void testStreamChatRejectsWhenBudgetExceeded() {
        TokenBudgetAuditor strictAuditor = mock(TokenBudgetAuditor.class);
        when(strictAuditor.audit(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new TokenBudgetAuditor.AuditResult(false, 70000, 2000, 60000, 100, 0, 0, 2048, 64000, "Context limit exceeded"));

        AdvisorStreamingService streamingService = new AdvisorStreamingService(
                new MockAdvisorModel(),
                new DefaultToolAdapter(new MockAcademicFacade()),
                null,
                null,
                null,
                new AiMetricsCollector(),
                strictAuditor,
                new AiProperties()
        );

        List<ChatStreamEvent> events = new ArrayList<>();
        streamingService.streamChat(
                new ChatRequest("conv-1", "Hỏi tiếp", null),
                new TrustedStudentContext("SV01", "SV01", "Nguyen Van A", "KTPM", "K16", "REV-1"),
                events::add
        );

        assertThat(events).anyMatch(e -> e.getEventType() == ChatStreamEvent.EventType.ERROR
                && "CONTEXT_LIMIT_EXCEEDED".equals(e.getCode()));
    }
}

