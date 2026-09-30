package vn.haui.advisor.ai.eval;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Automated Test Suite xác thực tính toàn vẹn của RAG Source Catalog và Chat Evaluation Dataset (Task 2.2e).
 * Bao gồm đầy đủ 14 quy tắc nghiệm thu bắt buộc theo đặc tả bổ sung.
 */
public class ChatEvalAndCatalogValidationTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static JsonNode catalogNode;
    private static JsonNode evalNode;
    private static final Map<String, JsonNode> CATALOG_SOURCES = new HashMap<>();

    private static final Set<String> VALID_CONVERSATION_STATES = Set.of(
            "ANSWERED",
            "CLARIFICATION_REQUIRED",
            "ERROR",
            "NO_EVIDENCE",
            "TOOL_UNAVAILABLE"
    );

    private static final Set<String> VALID_SOURCE_REQUIREMENTS = Set.of(
            "REQUIRED",
            "OPTIONAL",
            "NOT_REQUIRED",
            "MUST_BE_EMPTY"
    );

    @BeforeAll
    static void loadArtifacts() throws Exception {
        // 1. Tải và phân tích source-catalog.json từ resources
        InputStream catalogStream = ChatEvalAndCatalogValidationTest.class.getResourceAsStream("/rag/source-catalog.json");
        assertThat(catalogStream)
                .withFailMessage("Resource /rag/source-catalog.json không tồn tại trên classpath")
                .isNotNull();
        catalogNode = MAPPER.readTree(catalogStream);

        JsonNode sourcesArray = catalogNode.get("sources");
        assertThat(sourcesArray).isNotNull().isNotEmpty();
        for (JsonNode src : sourcesArray) {
            String sourceId = src.path("source_id").asText();
            CATALOG_SOURCES.put(sourceId, src);
        }

        // 2. Tải và phân tích chat-eval-v1.json từ test resources
        InputStream evalStream = ChatEvalAndCatalogValidationTest.class.getResourceAsStream("/eval/chat-eval-v1.json");
        assertThat(evalStream)
                .withFailMessage("Resource /eval/chat-eval-v1.json không tồn tại trên classpath")
                .isNotNull();
        evalNode = MAPPER.readTree(evalStream);
    }

    @Test
    @DisplayName("Catalog 01: source-catalog.json có cấu trúc hợp lệ và chứa danh mục sources")
    void testSourceCatalogStructure() {
        assertThat(catalogNode.has("catalog_version")).isTrue();
        assertThat(catalogNode.get("catalog_version").asText()).isNotBlank();
        assertThat(catalogNode.has("sources")).isTrue();
        assertThat(catalogNode.get("sources").isArray()).isTrue();
        assertThat(catalogNode.get("sources").size()).isGreaterThanOrEqualTo(5);
    }

    @Test
    @DisplayName("Catalog 02: source_id phải là duy nhất, không rỗng và bắt đầu bằng REG-HAUI-")
    void testSourceCatalogUniqueIds() {
        Set<String> seenIds = new HashSet<>();
        for (JsonNode src : catalogNode.get("sources")) {
            String id = src.path("source_id").asText();
            assertThat(id).isNotBlank();
            assertThat(id).startsWith("REG-HAUI-");
            assertThat(seenIds.add(id))
                    .withFailMessage("Phát hiện source_id bị trùng lặp: %s", id)
                    .isTrue();
        }
    }

    @Test
    @DisplayName("Catalog 03: Version phải tuân thủ định dạng gitblob:<12_hex_sha> và không rỗng")
    void testSourceCatalogVersions() {
        Pattern gitBlobPattern = Pattern.compile("^gitblob:[0-9a-f]{12}$");
        for (JsonNode src : catalogNode.get("sources")) {
            String version = src.path("version").asText();
            String sourceId = src.path("source_id").asText();
            assertThat(version)
                    .withFailMessage("Source %s có version không hợp lệ: %s", sourceId, version)
                    .isNotBlank()
                    .matches(gitBlobPattern);
        }
    }

    @Test
    @DisplayName("Catalog 04: Đường dẫn tài liệu (path) phải trỏ đến các file Markdown thực tế tồn tại trong data-source/documents")
    void testSourceCatalogFilesExist() {
        Path currentDir = Paths.get("").toAbsolutePath();
        Path repoRoot = currentDir.endsWith("tv1-ai") ? currentDir.getParent() : currentDir;
        Path documentsDir = repoRoot.resolve("data-source").resolve("documents");

        assertThat(Files.isDirectory(documentsDir))
                .withFailMessage("Thư mục data-source/documents không tồn tại tại: %s", documentsDir)
                .isTrue();

        for (JsonNode src : catalogNode.get("sources")) {
            String relPath = src.path("path").asText();
            String sourceId = src.path("source_id").asText();
            assertThat(relPath).isNotBlank();

            String fileName = Paths.get(relPath).getFileName().toString();
            Path targetFile = documentsDir.resolve(fileName);

            assertThat(Files.exists(targetFile))
                    .withFailMessage("Source %s trỏ đến file không tồn tại: %s", sourceId, targetFile)
                    .isTrue();
            assertThat(Files.isRegularFile(targetFile)).isTrue();
        }
    }

    @Test
    @DisplayName("Catalog 05: Đảm bảo toàn bộ 5 tài liệu chuẩn trong data-source/documents đều được đăng ký đầy đủ")
    void testAllGroundTruthDocsRegistered() {
        List<String> requiredIds = List.of(
                "REG-HAUI-01",
                "REG-HAUI-02",
                "REG-HAUI-03",
                "REG-HAUI-04",
                "REG-HAUI-05"
        );
        for (String reqId : requiredIds) {
            assertThat(CATALOG_SOURCES)
                    .withFailMessage("Thiếu tài liệu bắt buộc trong catalog: %s", reqId)
                    .containsKey(reqId);
        }
    }

    @Test
    @DisplayName("Catalog 06: Trạng thái nguồn phải là PROJECT_GROUND_TRUTH và có ít nhất 1 section")
    void testSourceStatusAndSections() {
        for (JsonNode src : catalogNode.get("sources")) {
            String sourceId = src.path("source_id").asText();
            String status = src.path("source_status").asText();
            boolean enabled = src.path("rag_enabled").asBoolean();

            assertThat(status)
                    .withFailMessage("Source %s có status không hợp lệ: %s", sourceId, status)
                    .isEqualTo("PROJECT_GROUND_TRUTH");
            assertThat(enabled).isTrue();

            JsonNode sections = src.path("sections");
            assertThat(sections.isArray()).isTrue();
            assertThat(sections.size())
                    .withFailMessage("Source %s phải có ít nhất một section", sourceId)
                    .isGreaterThan(0);
        }
    }

    @Test
    @DisplayName("Eval Rule 01: Mỗi eval case phải khai báo conversation_state hợp lệ")
    void testChatEvalConversationStateDeclared() {
        for (JsonNode c : evalNode.get("cases")) {
            String caseId = c.path("id").asText();
            JsonNode stateNode = c.path("expected").path("conversation_state");
            assertThat(stateNode.isMissingNode() || stateNode.asText().isBlank())
                    .withFailMessage("Eval case %s thiếu trường expected.conversation_state", caseId)
                    .isFalse();
            String state = stateNode.asText();
            assertThat(VALID_CONVERSATION_STATES)
                    .withFailMessage("Eval case %s có conversation_state không hợp lệ: %s", caseId, state)
                    .contains(state);
        }
    }

    @Test
    @DisplayName("Eval Rule 02: Mỗi eval case phải khai báo source_requirement hợp lệ")
    void testChatEvalSourceRequirementDeclared() {
        for (JsonNode c : evalNode.get("cases")) {
            String caseId = c.path("id").asText();
            JsonNode reqNode = c.path("expected").path("source_requirement");
            assertThat(reqNode.isMissingNode() || reqNode.asText().isBlank())
                    .withFailMessage("Eval case %s thiếu trường expected.source_requirement", caseId)
                    .isFalse();
            String req = reqNode.asText();
            assertThat(VALID_SOURCE_REQUIREMENTS)
                    .withFailMessage("Eval case %s có source_requirement không hợp lệ: %s", caseId, req)
                    .contains(req);
        }
    }

    @Test
    @DisplayName("Eval Rule 03: CLARIFICATION_REQUIRED bắt buộc phải có should_ask_clarification = true")
    void testChatEvalClarificationRequirement() {
        for (JsonNode c : evalNode.get("cases")) {
            String caseId = c.path("id").asText();
            String state = c.path("expected").path("conversation_state").asText();
            boolean shouldClarify = c.path("expected").path("should_ask_clarification").asBoolean();

            if ("CLARIFICATION_REQUIRED".equals(state)) {
                assertThat(shouldClarify)
                        .withFailMessage("Eval case %s có trạng thái CLARIFICATION_REQUIRED nhưng should_ask_clarification != true", caseId)
                        .isTrue();
            }
        }
    }

    @Test
    @DisplayName("Eval Rule 04: ERROR state bắt buộc phải có error.expected = true")
    void testChatEvalErrorStateRequirement() {
        for (JsonNode c : evalNode.get("cases")) {
            String caseId = c.path("id").asText();
            String state = c.path("expected").path("conversation_state").asText();
            JsonNode errorNode = c.path("expected").path("error");

            if ("ERROR".equals(state)) {
                assertThat(errorNode.path("expected").asBoolean())
                        .withFailMessage("Eval case %s có trạng thái ERROR nhưng error.expected != true", caseId)
                        .isTrue();
                assertThat(errorNode.path("code").asText())
                        .withFailMessage("Eval case %s có trạng thái ERROR nhưng error.code bị trống", caseId)
                        .isNotBlank();
            }
        }
    }

    @Test
    @DisplayName("Eval Rule 05 & 07: NO_EVIDENCE hoặc MUST_BE_EMPTY bắt buộc sources phải rỗng []")
    void testChatEvalNoEvidenceAndMustBeEmpty() {
        for (JsonNode c : evalNode.get("cases")) {
            String caseId = c.path("id").asText();
            String state = c.path("expected").path("conversation_state").asText();
            String req = c.path("expected").path("source_requirement").asText();
            JsonNode sources = c.path("expected").path("sources");

            if ("NO_EVIDENCE".equals(state) || "MUST_BE_EMPTY".equals(req)) {
                assertThat(sources.size())
                        .withFailMessage("Eval case %s (state=%s, requirement=%s) bắt buộc sources phải rỗng nhưng có %d sources",
                                caseId, state, req, sources.size())
                        .isEqualTo(0);
            }
        }
    }

    @Test
    @DisplayName("Eval Rule 06: source_requirement = REQUIRED bắt buộc sources không được rỗng")
    void testChatEvalRequiredSourcesNotEmpty() {
        for (JsonNode c : evalNode.get("cases")) {
            String caseId = c.path("id").asText();
            String req = c.path("expected").path("source_requirement").asText();
            JsonNode sources = c.path("expected").path("sources");

            if ("REQUIRED".equals(req)) {
                assertThat(sources.size())
                        .withFailMessage("Eval case %s có source_requirement = REQUIRED nhưng sources bị rỗng", caseId)
                        .isGreaterThan(0);
            }
        }
    }

    @Test
    @DisplayName("Eval Rule 08 & 09: Mọi expected source_id phải tồn tại trong catalog và có version khớp 100%")
    void testChatEvalSourcesExistInCatalogWithMatchingVersion() {
        for (JsonNode c : evalNode.get("cases")) {
            String caseId = c.path("id").asText();
            JsonNode sources = c.path("expected").path("sources");
            if (sources.isArray()) {
                for (JsonNode src : sources) {
                    String srcId = src.path("source_id").asText();
                    String expectedVer = src.path("version").asText();

                    assertThat(CATALOG_SOURCES)
                            .withFailMessage("Eval case %s tham chiếu source_id không tồn tại trong catalog: %s", caseId, srcId)
                            .containsKey(srcId);

                    JsonNode catalogSrc = CATALOG_SOURCES.get(srcId);
                    String catalogVer = catalogSrc.path("version").asText();
                    assertThat(expectedVer)
                            .withFailMessage("Eval case %s có version %s không khớp với version trong catalog %s cho source %s",
                                    caseId, expectedVer, catalogVer, srcId)
                            .isEqualTo(catalogVer);
                }
            }
        }
    }

    @Test
    @DisplayName("Eval Rule 10: Tuyệt đối không dùng source ID giả lập cũ (MOCK / FAKE / DEMO / FIXTURE)")
    void testChatEvalNoMockOrFakeSources() {
        List<String> forbiddenTerms = List.of("MOCK", "FAKE", "DEMO", "FIXTURE");

        for (JsonNode c : evalNode.get("cases")) {
            String caseId = c.path("id").asText();
            JsonNode sources = c.path("expected").path("sources");
            if (sources.isArray()) {
                for (JsonNode src : sources) {
                    String srcId = src.path("source_id").asText().toUpperCase();
                    for (String term : forbiddenTerms) {
                        assertThat(srcId)
                                .withFailMessage("Eval case %s sử dụng source_id giả lập cũ bị cấm: %s (chứa %s)", caseId, srcId, term)
                                .doesNotContain(term);
                    }
                }
            }
        }
    }

    @Test
    @DisplayName("Eval Rule 11: Khi mong đợi kết quả cá nhân hóa (PLAN/WHAT_IF/AUDIT/ROI/DEBT), phải có Academic tool tương ứng")
    void testChatEvalPersonalizedResultsRequireTools() {
        Set<String> personalizedCategories = Set.of(
                "DEBT_COURSES",
                "STUDY_PLAN",
                "WHAT_IF",
                "RETAKE_IMPROVEMENT",
                "GRADUATION_AUDIT"
        );

        for (JsonNode c : evalNode.get("cases")) {
            String caseId = c.path("id").asText();
            String cat = c.path("category").asText();
            String state = c.path("expected").path("conversation_state").asText();

            if (personalizedCategories.contains(cat) && "ANSWERED".equals(state)) {
                JsonNode tools = c.path("expected").path("tools");
                assertThat(tools.size())
                        .withFailMessage("Eval case %s thuộc category cá nhân hóa %s nhưng expected.tools lại rỗng", caseId, cat)
                        .isGreaterThan(0);
            }
        }
    }

    @Test
    @DisplayName("Eval Rule 12: Tool error không được sinh kết quả cá nhân hóa thành công")
    void testChatEvalToolErrorDoesNotHallucinateSuccess() {
        for (JsonNode c : evalNode.get("cases")) {
            String caseId = c.path("id").asText();
            String state = c.path("expected").path("conversation_state").asText();

            if ("ERROR".equals(state)) {
                JsonNode mustContain = c.path("expected").path("answer_must_contain_any");
                assertThat(mustContain.toString())
                        .withFailMessage("Eval case %s có trạng thái ERROR nhưng lại expect thành công", caseId)
                        .containsAnyOf("chưa thể thực hiện", "tạm thời gián đoạn", "thử lại sau", "đang được nâng cấp");
            }
        }
    }

    @Test
    @DisplayName("Eval Rule 13: Câu hỏi quy chế (REGULATION) khi ANSWERED bắt buộc phải có source_requirement = REQUIRED và có source")
    void testChatEvalRegulationCasesMustHaveRequiredSources() {
        for (JsonNode c : evalNode.get("cases")) {
            String caseId = c.path("id").asText();
            String cat = c.path("category").asText();
            String state = c.path("expected").path("conversation_state").asText();

            if ("REGULATION".equals(cat) && "ANSWERED".equals(state)) {
                String req = c.path("expected").path("source_requirement").asText();
                assertThat(req)
                        .withFailMessage("Case quy chế %s bắt buộc phải có source_requirement = REQUIRED", caseId)
                        .isEqualTo("REQUIRED");

                JsonNode sources = c.path("expected").path("sources");
                assertThat(sources.size())
                        .withFailMessage("Case quy chế %s có trạng thái ANSWERED nhưng thiếu source", caseId)
                        .isGreaterThan(0);
            }
        }
    }

    @Test
    @DisplayName("Eval Rule 14: Thiếu bảng điểm (MISSING_TRANSCRIPT) không được expect CPA, nợ môn hay study plan cá nhân hóa")
    void testChatEvalMissingTranscriptStrictness() {
        for (JsonNode c : evalNode.get("cases")) {
            String caseId = c.path("id").asText();
            String cat = c.path("category").asText();

            if ("MISSING_TRANSCRIPT".equals(cat)) {
                String transcriptStatus = c.path("context").path("transcript").asText();
                boolean shouldClarify = c.path("expected").path("should_ask_clarification").asBoolean();
                String state = c.path("expected").path("conversation_state").asText();

                assertThat(transcriptStatus).isEqualTo("MISSING");
                assertThat(state).isEqualTo("CLARIFICATION_REQUIRED");
                assertThat(shouldClarify).isTrue();

                JsonNode tools = c.path("expected").path("tools");
                assertThat(tools.size())
                        .withFailMessage("Case thiếu bảng điểm %s không được tự gọi tool sinh kế hoạch cá nhân", caseId)
                        .isEqualTo(0);

                JsonNode notContain = c.path("expected").path("answer_must_not_contain");
                assertThat(notContain.toString())
                        .withFailMessage("Case thiếu bảng điểm %s phải có luật cấm bịa điểm/môn nợ trong answer_must_not_contain", caseId)
                        .contains("CPA")
                        .contains("LP6004");
            }
        }
    }
}
