package vn.haui.advisor.ai.model;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.conversation.ChatMessageHistoryItem;
import vn.haui.advisor.ai.tools.GeminiToolDeclarations;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class LiveAdvisorModelToolCallingTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void requiresRegulationLookupAndReturnsTheOriginalToolCallId() throws Exception {
        var prompt = new AtomicReference<String>();
        var model = new LiveAdvisorModel(payload -> {
            prompt.set(payload);
            return payload.contains("functionResponse")
                    ? """
                      {"candidates":[{"finishReason":"STOP","content":{"parts":[{"text":"Kỳ hè tối đa 12 tín chỉ [REG-HAUI-01]."}]}}]}
                      """
                    : """
                      {"candidates":[{"content":{"parts":[{"functionCall":{"name":"search_regulations","id":"lookup-1","args":{"query":"tín chỉ kỳ hè"}}}]}}]}
                      """;
        });
        String question = "Kỳ hè thì sao?";
        var turn = model.inspectTurn(question, List.of(), GeminiToolDeclarations.getToolDeclarations(), true);
        var config = objectMapper.readTree(prompt.get()).at("/toolConfig/functionCallingConfig");
        assertThat(config.path("mode").asText()).isEqualTo("ANY");
        assertThat(config.at("/allowedFunctionNames/0").asText()).isEqualTo("search_regulations");

        String answer = model.completeTurnWithToolResults(question, List.of(), turn.toolCalls(),
                turn.rawModelParts(), Map.of("search_regulations", "Kỳ hè tối đa 12 tín chỉ"));
        assertThat(answer).contains("12 tín chỉ");
        assertThat(objectMapper.readTree(prompt.get()).at("/contents/2/parts/0/functionResponse/id").asText())
                .isEqualTo("lookup-1");
    }

    @Test
    void shouldExtractFunctionCallsWhenModelReturnsToolInvocation() {
        String mockResponse = """
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          {
                            "functionCall": {
                              "name": "run_graduation_audit",
                              "args": {}
                            }
                          }
                        ],
                        "role": "model"
                      },
                      "finishReason": "STOP"
                    }
                  ]
                }
                """;

        LiveAdvisorModel model = new LiveAdvisorModel(req -> mockResponse);

        LiveAdvisorModel.GeminiTurnResult result = model.inspectTurn(
                "m còn thiếu bao nhiêu tín chỉ để ra trường?",
                List.of(),
                GeminiToolDeclarations.getToolDeclarations()
        );

        assertThat(result.hasToolCalls()).isTrue();
        assertThat(result.toolCalls()).hasSize(1);
        assertThat(result.toolCalls().get(0).name()).isEqualTo("run_graduation_audit");
        assertThat(result.toolCalls().get(0).arguments()).isEmpty();
    }

    @Test
    void shouldExtractDirectTextWhenModelDoesNotCallTools() {
        String mockResponse = """
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          {
                            "text": "Chào bạn, mình là Cố vấn học tập AI HaUI."
                          }
                        ],
                        "role": "model"
                      },
                      "finishReason": "STOP"
                    }
                  ]
                }
                """;

        LiveAdvisorModel model = new LiveAdvisorModel(req -> mockResponse);

        LiveAdvisorModel.GeminiTurnResult result = model.inspectTurn(
                "chào bạn",
                List.of(),
                GeminiToolDeclarations.getToolDeclarations()
        );

        assertThat(result.hasToolCalls()).isFalse();
        assertThat(result.directText()).contains("Cố vấn học tập AI HaUI");
    }

    @Test
    void shouldCompleteTurnWithToolResultsAndReturnFinalAnswer() {
        AtomicReference<String> capturedRequest = new AtomicReference<>();
        String mockTurn2Response = """
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          {
                            "text": "Dựa trên kết quả rà soát, bạn đã tích lũy 59/150 tín chỉ và còn thiếu 91 tín chỉ."
                          }
                        ],
                        "role": "model"
                      },
                      "finishReason": "STOP"
                    }
                  ]
                }
                """;

        LiveAdvisorModel model = new LiveAdvisorModel(req -> {
            capturedRequest.set(req);
            return mockTurn2Response;
        });

        GeminiToolCall call = new GeminiToolCall("run_graduation_audit", Map.of());
        Map<String, Object> toolResults = Map.of(
                "run_graduation_audit", Map.of("accumulatedCredits", 59, "requiredCredits", 150, "missingCredits", 91)
        );

        String answer = model.completeTurnWithToolResults(
                "m còn thiếu bao nhiêu tín chỉ để ra trường?",
                List.of(),
                List.of(call),
                toolResults
        );

        assertThat(answer).contains("59/150 tín chỉ");
        assertThat(capturedRequest.get()).contains("functionResponse");
        assertThat(capturedRequest.get()).contains("run_graduation_audit");
        assertThat(capturedRequest.get()).contains("systemInstruction");
        assertThat(capturedRequest.get()).contains("GRACEFUL PIVOT");
    }

    @Test
    void shouldIncludeSystemInstructionInInspectTurnRequest() {
        AtomicReference<String> capturedRequest = new AtomicReference<>();
        String mockResponse = """
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          {
                            "text": "Nghe đến phở bò Hà Nội nóng hổi là thấy ấm bụng..."
                          }
                        ],
                        "role": "model"
                      },
                      "finishReason": "STOP"
                    }
                  ]
                }
                """;

        LiveAdvisorModel model = new LiveAdvisorModel(req -> {
            capturedRequest.set(req);
            return mockResponse;
        });

        LiveAdvisorModel.GeminiTurnResult result = model.inspectTurn(
                "Chỉ cho tôi công thức nấu phở bò gia truyền Hà Nội ngon chuẩn vị",
                List.of(),
                GeminiToolDeclarations.getToolDeclarations()
        );

        assertThat(result.hasToolCalls()).isFalse();
        assertThat(capturedRequest.get()).contains("systemInstruction");
        assertThat(capturedRequest.get()).contains("GRACEFUL PIVOT");
        assertThat(capturedRequest.get()).contains("bạn có thấy tôi đẹp trai không");
        assertThat(capturedRequest.get()).contains("Chỉ cho tôi công thức nấu phở bò gia truyền Hà Nội");
    }

    @Test
    void systemPromptMustContainGracefulPivotRuleAndFewShotExamples() {
        assertThat(LiveAdvisorModel.SYSTEM_PROMPT).contains("GRACEFUL PIVOT");
        assertThat(LiveAdvisorModel.SYSTEM_PROMPT).contains("bạn có thấy tôi đẹp trai không");
        assertThat(LiveAdvisorModel.SYSTEM_PROMPT).contains("công thức nấu phở bò");
        assertThat(LiveAdvisorModel.SYSTEM_PROMPT).contains("BƯỚC 1 - HƯỞNG ỨNG TỰ NHIÊN");
        assertThat(LiveAdvisorModel.SYSTEM_PROMPT).contains("BƯỚC 2 - GIỮ VỮNG RANH GIỚI");
        assertThat(LiveAdvisorModel.SYSTEM_PROMPT).contains("BƯỚC 3 - KHÉO LÉO LÁI VỀ HỌC VỤ");
    }
}
