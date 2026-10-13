package vn.haui.advisor.ai.eval;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.conversation.ConversationHistoryManager;
import vn.haui.advisor.ai.grounding.ResponseGroundingValidator;
import vn.haui.advisor.ai.intent.IntentClassifier;
import vn.haui.advisor.ai.mock.MockAcademicFacade;
import vn.haui.advisor.ai.model.MockAdvisorModel;
import vn.haui.advisor.ai.rag.embedding.DeterministicFakeEmbeddingProvider;
import vn.haui.advisor.ai.rag.grounding.CitationGrounder;
import vn.haui.advisor.ai.rag.grounding.EvidenceValidator;
import vn.haui.advisor.ai.rag.ingestion.RagCatalogReader;
import vn.haui.advisor.ai.rag.ingestion.RagIngestionService;
import vn.haui.advisor.ai.rag.retrieval.RagRetriever;
import vn.haui.advisor.ai.rag.retrieval.VietnameseQueryNormalizer;
import vn.haui.advisor.ai.rag.service.RagAdvisorService;
import vn.haui.advisor.ai.rag.vector.InMemoryVectorStore;
import vn.haui.advisor.ai.service.DefaultAdvisorFacade;
import vn.haui.advisor.ai.tools.DefaultToolAdapter;
import vn.haui.advisor.contracts.dto.*;

import java.io.InputStream;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Runner thực thi bộ kiểm thử đánh giá benchmark 20 ca kiểm thử (Chat Eval v1.1.0)
 * đối với DefaultAdvisorFacade, bao gồm toàn bộ 8 nhóm kịch bản nghiệp vụ.
 */
public class ChatEvalBenchmarkRunnerTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static JsonNode evalRoot;
    private static DefaultAdvisorFacade advisorFacade;

    @BeforeAll
    static void setUp() throws Exception {
        InputStream stream = ChatEvalBenchmarkRunnerTest.class.getResourceAsStream("/eval/chat-eval-v1.json");
        assertThat(stream).withFailMessage("Resource /eval/chat-eval-v1.json not found").isNotNull();
        evalRoot = MAPPER.readTree(stream);

        // Khởi tạo RAG service đầy đủ với dữ liệu catalog thực tế
        DeterministicFakeEmbeddingProvider embeddingProvider = new DeterministicFakeEmbeddingProvider();
        InMemoryVectorStore vectorStore = new InMemoryVectorStore();
        RagIngestionService ingestionService = new RagIngestionService();
        VietnameseQueryNormalizer normalizer = new VietnameseQueryNormalizer();
        RagRetriever retriever = new RagRetriever(embeddingProvider, vectorStore, normalizer, 0.45, 3);
        RagCatalogReader catalogReader = new RagCatalogReader();
        EvidenceValidator evidenceValidator = new EvidenceValidator(catalogReader);
        CitationGrounder grounder = new CitationGrounder(catalogReader);

        RagAdvisorService ragAdvisorService = new RagAdvisorService(
                retriever,
                evidenceValidator,
                grounder,
                ingestionService,
                vectorStore,
                embeddingProvider
        );

        // Nạp chỉ mục tài liệu vào vector store
        ragAdvisorService.retrieveAndGround("Khởi tạo chỉ mục");

        MockAcademicFacade mockAcademicFacade = new MockAcademicFacade();
        DefaultToolAdapter toolAdapter = new DefaultToolAdapter(mockAcademicFacade);
        ResponseGroundingValidator validator = new ResponseGroundingValidator();
        MockAdvisorModel advisorModel = new MockAdvisorModel(ragAdvisorService, validator);
        ConversationHistoryManager conversationHistoryManager = new ConversationHistoryManager(null, MAPPER);
        IntentClassifier intentClassifier = new IntentClassifier();

        advisorFacade = new DefaultAdvisorFacade(
                advisorModel,
                toolAdapter,
                ragAdvisorService,
                conversationHistoryManager,
                intentClassifier,
                validator,
                5000L
        );
    }

    @Test
    @DisplayName("Chat Eval Benchmark: Verify dataset loaded and contains exactly 20 cases")
    void testBenchmarkDatasetLoaded() {
        JsonNode cases = evalRoot.get("cases");
        assertThat(cases).isNotNull();
        assertThat(cases.size()).isEqualTo(20);
    }

    @Test
    @DisplayName("Chat Eval Benchmark: Execute all 20 canonical cases end-to-end")
    void testExecuteAll20Cases() {
        JsonNode cases = evalRoot.get("cases");
        int passed = 0;
        int failed = 0;
        List<String> failureDetails = new ArrayList<>();

        for (JsonNode testCase : cases) {
            String caseId = testCase.path("id").asText();
            String category = testCase.path("category").asText();
            String description = testCase.path("description").asText();

            try {
                executeSingleCase(testCase);
                passed++;
            } catch (AssertionError | Exception e) {
                failed++;
                failureDetails.add(String.format("[%s - %s] %s: %s", caseId, category, description, e.getMessage()));
            }
        }

        if (failed > 0) {
            System.err.println("=== CHAT EVAL BENCHMARK FAILURES (" + failed + ") ===");
            failureDetails.forEach(System.err::println);
        }

        assertThat(failed)
                .withFailMessage("Chat Eval Benchmark có %d ca thất bại:\n%s", failed, String.join("\n", failureDetails))
                .isEqualTo(0);
        assertThat(passed).isEqualTo(20);
    }

    private void executeSingleCase(JsonNode testCase) {
        String caseId = testCase.path("id").asText();
        JsonNode turns = testCase.path("turns");
        JsonNode contextNode = testCase.path("context");
        JsonNode expected = testCase.path("expected");

        String studentId = contextNode.path("student_id").asText("STU-2024604757");
        String transcriptStatus = contextNode.path("transcript").asText("AVAILABLE");

        TrustedStudentContext context;
        if ("MISSING".equalsIgnoreCase(transcriptStatus)) {
            context = new TrustedStudentContext("STU_ANONYMOUS", "STU_ANONYMOUS", "Sinh viên mới", "CNTT", "K16", "REV-0");
        } else {
            context = new TrustedStudentContext("STU-" + studentId, studentId, "Nguyễn Văn Demo", "CNTT", "K16", "REV-2024-V1");
        }

        String conversationId = "CONV-EVAL-" + caseId;
        ChatResponse lastResponse = null;

        // Thực thi các lượt hội thoại (turns)
        for (int i = 0; i < turns.size(); i++) {
            JsonNode turn = turns.get(i);
            String role = turn.path("role").asText();
            String content = turn.path("content").asText();

            if ("user".equalsIgnoreCase(role)) {
                ChatRequest request = new ChatRequest(conversationId, content, "2026-10-13T10:00:00Z");
                lastResponse = advisorFacade.chat(request, context);
            }
        }

        assertThat(lastResponse).withFailMessage("Response is null for case %s", caseId).isNotNull();

        // 1. Thẩm định conversation_state
        String expectedState = expected.path("conversation_state").asText();
        switch (expectedState) {
            case "ANSWERED" -> {
                assertThat(lastResponse.getAnswer()).isNotBlank();
            }
            case "CLARIFICATION_REQUIRED" -> {
                boolean hasClarificationWarning = lastResponse.getWarnings().stream()
                        .anyMatch(w -> w.contains("INCOMPLETE_TARGET") || w.contains("TRANSCRIPT_REQUIRED") || w.contains("CLARIFICATION"));
                boolean answerAsksQuestion = lastResponse.getAnswer().contains("?") || lastResponse.getAnswer().toLowerCase().contains("vui lòng");
                assertThat(hasClarificationWarning || answerAsksQuestion)
                        .withFailMessage("Case %s expected CLARIFICATION_REQUIRED but response did not ask clarification", caseId)
                        .isTrue();
            }
            case "ERROR" -> {
                boolean hasErrorWarning = lastResponse.getWarnings().stream()
                        .anyMatch(w -> w.contains("TOOL_UNAVAILABLE") || w.contains("TOOL_ERROR") || w.contains("ERROR"));
                assertThat(hasErrorWarning)
                        .withFailMessage("Case %s expected ERROR state but no error warning found", caseId)
                        .isTrue();
            }
            case "NO_EVIDENCE" -> {
                assertThat(lastResponse.getSources()).isEmpty();
                boolean hasNoEvidenceWarning = lastResponse.getWarnings().stream()
                        .anyMatch(w -> w.contains("POLICY_SOURCE_UNAVAILABLE") || w.contains("NO_EVIDENCE"));
                assertThat(hasNoEvidenceWarning)
                        .withFailMessage("Case %s expected NO_EVIDENCE warning but found %s", caseId, lastResponse.getWarnings())
                        .isTrue();
            }
        }

        // 2. Thẩm định source_requirement
        String sourceRequirement = expected.path("source_requirement").asText();
        if ("REQUIRED".equalsIgnoreCase(sourceRequirement)) {
            assertThat(lastResponse.getSources())
                    .withFailMessage("Case %s requires sources but was empty", caseId)
                    .isNotEmpty();
        } else if ("MUST_BE_EMPTY".equalsIgnoreCase(sourceRequirement)) {
            assertThat(lastResponse.getSources())
                    .withFailMessage("Case %s requires sources to be empty but had %d", caseId, lastResponse.getSources().size())
                    .isEmpty();
        }

        // 3. Thẩm định sources cụ thể nếu có
        JsonNode expectedSources = expected.path("sources");
        if (expectedSources.isArray() && !expectedSources.isEmpty()) {
            for (JsonNode expSrc : expectedSources) {
                String expSrcId = expSrc.path("source_id").asText();
                boolean found = lastResponse.getSources().stream().anyMatch(s -> expSrcId.equalsIgnoreCase(s.getSourceId()));
                assertThat(found)
                        .withFailMessage("Case %s expected citation %s but was not found in response sources %s",
                                caseId, expSrcId, lastResponse.getSources())
                        .isTrue();
            }
        }

        // 4. Thẩm định answer_must_contain_any
        JsonNode containAny = expected.path("answer_must_contain_any");
        if (containAny.isArray() && !containAny.isEmpty()) {
            boolean matched = false;
            String answerLower = lastResponse.getAnswer().toLowerCase();
            for (JsonNode phrase : containAny) {
                if (answerLower.contains(phrase.asText().toLowerCase())) {
                    matched = true;
                    break;
                }
            }
            assertThat(matched)
                    .withFailMessage("Case %s answer '%s' does not contain any of %s", caseId, lastResponse.getAnswer(), containAny)
                    .isTrue();
        }

        // 5. Thẩm định answer_must_not_contain
        JsonNode notContain = expected.path("answer_must_not_contain");
        if (notContain.isArray() && !notContain.isEmpty()) {
            String answerLower = lastResponse.getAnswer().toLowerCase();
            for (JsonNode phrase : notContain) {
                String forbidden = phrase.asText().toLowerCase();
                assertThat(answerLower)
                        .withFailMessage("Case %s answer '%s' contains forbidden phrase '%s'", caseId, lastResponse.getAnswer(), forbidden)
                        .doesNotContain(forbidden);
            }
        }

        // 6. Thẩm định actions
        JsonNode expectedActions = expected.path("actions");
        if (expectedActions.isArray() && !expectedActions.isEmpty()) {
            assertThat(lastResponse.getActions())
                    .withFailMessage("Case %s expected actions but was empty", caseId)
                    .isNotEmpty();
            for (JsonNode expAct : expectedActions) {
                String actType = expAct.path("action_type").asText();
                String targetRoute = expAct.path("target_route").asText();
                boolean match = lastResponse.getActions().stream()
                        .anyMatch(a -> a.getActionType().equalsIgnoreCase(actType) && a.getTargetRoute().equalsIgnoreCase(targetRoute));
                assertThat(match)
                        .withFailMessage("Case %s expected action %s -> %s in %s", caseId, actType, targetRoute, lastResponse.getActions())
                        .isTrue();
            }
        }
    }
}
