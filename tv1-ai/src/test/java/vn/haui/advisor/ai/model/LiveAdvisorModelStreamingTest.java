package vn.haui.advisor.ai.model;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.conversation.ChatMessageHistoryItem;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class LiveAdvisorModelStreamingTest {

    @Test
    @DisplayName("streamTurn emits chunks to consumer using simulated SSE provider")
    void shouldStreamChunksUsingStreamingProvider() {
        LiveAdvisorModel model = new LiveAdvisorModel((payload, chunkConsumer) -> {
            chunkConsumer.accept("Chào bạn! ");
            chunkConsumer.accept("Môn Kỹ thuật phần mềm ");
            chunkConsumer.accept("có 3 tín chỉ.");
        });

        List<String> receivedChunks = new ArrayList<>();
        LiveAdvisorModel.ModelExecutionResult result = model.streamTurn(
                "Môn KTPM mấy tín chỉ?",
                Collections.emptyList(),
                Collections.emptyList(),
                null,
                Collections.emptyMap(),
                receivedChunks::add
        );

        assertThat(receivedChunks).containsExactly(
                "Chào bạn! ",
                "Môn Kỹ thuật phần mềm ",
                "có 3 tín chỉ."
        );
        assertThat(result.answer()).isEqualTo("Chào bạn! Môn Kỹ thuật phần mềm có 3 tín chỉ.");
        assertThat(result.promptTokens()).isGreaterThan(0);
        assertThat(result.candidatesTokens()).isGreaterThan(0);
        assertThat(result.latencyMs()).isGreaterThanOrEqualTo(0);
    }

    @Test
    @DisplayName("streamTurn processes SSE line-delimited format and extracts usageMetadata")
    void shouldProcessSseLineDelimitedFormat() {
        String ssePayload = """
                data: {"candidates":[{"content":{"parts":[{"text":"Điểm CPA của bạn "}]}}]}
                data: {"candidates":[{"content":{"parts":[{"text":"là 3.45."}]}}],"usageMetadata":{"promptTokenCount":250,"candidatesTokenCount":15}}
                """;

        LiveAdvisorModel model = new LiveAdvisorModel();
        List<String> receivedChunks = new ArrayList<>();

        LiveAdvisorModel.ModelExecutionResult result = model.processSseLines(
                ssePayload.lines(),
                receivedChunks::add,
                "Xem CPA",
                100L
        );

        assertThat(receivedChunks).containsExactly("Điểm CPA của bạn ", "là 3.45.");
        assertThat(result.answer()).isEqualTo("Điểm CPA của bạn là 3.45.");
        assertThat(result.promptTokens()).isEqualTo(250L);
        assertThat(result.candidatesTokens()).isEqualTo(15L);
        assertThat(result.latencyMs()).isEqualTo(100L);
    }

    @Test
    @DisplayName("streamTurn falls back to chunking standard response when streaming provider is absent")
    void shouldFallbackToChunkingStandardResponse() {
        LiveAdvisorModel model = new LiveAdvisorModel(payload -> """
                {
                  "candidates": [{
                    "finishReason": "STOP",
                    "content": {
                      "parts": [{"text": "Quy chế HaUI Điều 14 quy định cảnh báo học tập."}]
                    }
                  }],
                  "usageMetadata": {
                    "promptTokenCount": 180,
                    "candidatesTokenCount": 20
                  }
                }
                """);

        List<String> receivedChunks = new ArrayList<>();
        LiveAdvisorModel.ModelExecutionResult result = model.streamTurn(
                "Điều 14",
                List.of(),
                List.of(),
                null,
                Map.of(),
                receivedChunks::add
        );

        assertThat(result.answer()).isEqualTo("Quy chế HaUI Điều 14 quy định cảnh báo học tập.");
        assertThat(receivedChunks).isNotEmpty();
        String assembled = String.join("", receivedChunks);
        assertThat(assembled).isEqualTo("Quy chế HaUI Điều 14 quy định cảnh báo học tập.");
    }
}
