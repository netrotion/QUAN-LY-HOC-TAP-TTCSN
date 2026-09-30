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
 */
public class ChatEvalAndCatalogValidationTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static JsonNode catalogNode;
    private static JsonNode evalNode;
    private static final Map<String, JsonNode> CATALOG_SOURCES = new HashMap<>();

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
        // Tìm đường dẫn gốc của repository bằng cách kiểm tra các cấp thư mục
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

            // Lấy tên file từ relPath
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
    @DisplayName("Eval 01: chat-eval-v1.json phải chứa mảng cases hợp lệ")
    void testChatEvalStructure() {
        assertThat(evalNode.has("cases")).isTrue();
        assertThat(evalNode.get("cases").isArray()).isTrue();
        assertThat(evalNode.get("cases").size()).isGreaterThanOrEqualTo(16);
    }

    @Test
    @DisplayName("Eval 02: Mỗi eval case phải có ID duy nhất và không rỗng")
    void testChatEvalUniqueCaseIds() {
        Set<String> seenCaseIds = new HashSet<>();
        for (JsonNode c : evalNode.get("cases")) {
            String caseId = c.path("id").asText();
            assertThat(caseId).isNotBlank();
            assertThat(seenCaseIds.add(caseId))
                    .withFailMessage("Trùng lặp case ID trong eval dataset: %s", caseId)
                    .isTrue();
        }
    }

    @Test
    @DisplayName("Eval 03: Bộ eval phải bao phủ đầy đủ 8 nhóm kịch bản bắt buộc")
    void testChatEvalCategoryCoverage() {
        Set<String> requiredCategories = Set.of(
                "REGULATION",
                "DEBT_COURSES",
                "STUDY_PLAN",
                "ACCELERATED_STUDY",
                "WHAT_IF",
                "GRADUATION_AUDIT",
                "GOAL_CHANGE",
                "MISSING_TRANSCRIPT"
        );

        Set<String> presentCategories = new HashSet<>();
        for (JsonNode c : evalNode.get("cases")) {
            String cat = c.path("category").asText();
            presentCategories.add(cat);
        }

        for (String reqCat : requiredCategories) {
            assertThat(presentCategories)
                    .withFailMessage("Thiếu category bắt buộc trong eval dataset: %s", reqCat)
                    .contains(reqCat);
        }
    }

    @Test
    @DisplayName("Eval 04: Mọi expected source_id trong eval cases đều phải tồn tại trong source-catalog.json")
    void testChatEvalSourceIntegrity() {
        for (JsonNode c : evalNode.get("cases")) {
            String caseId = c.path("id").asText();
            JsonNode sources = c.path("expected").path("sources");
            if (sources.isArray()) {
                for (JsonNode src : sources) {
                    String srcId = src.path("source_id").asText();
                    assertThat(srcId).isNotBlank();
                    assertThat(CATALOG_SOURCES)
                            .withFailMessage("Case %s tham chiếu source_id không tồn tại trong catalog: %s", caseId, srcId)
                            .containsKey(srcId);
                }
            }
        }
    }

    @Test
    @DisplayName("Eval 05: Không có case nào được dùng source ID giả lập cũ (SRC-MOCK-*, DEMO_UNVERIFIED, 2024-FIXTURE)")
    void testChatEvalNoLegacyMockSources() {
        List<String> forbiddenPrefixes = List.of("SRC-MOCK", "SRC_CTDT_DEMO", "DEMO_UNVERIFIED", "2024-FIXTURE");

        for (JsonNode c : evalNode.get("cases")) {
            String caseId = c.path("id").asText();
            JsonNode sources = c.path("expected").path("sources");
            if (sources.isArray()) {
                for (JsonNode src : sources) {
                    String srcId = src.path("source_id").asText();
                    for (String prefix : forbiddenPrefixes) {
                        assertThat(srcId)
                                .withFailMessage("Case %s sử dụng source_id giả lập cũ bị cấm: %s", caseId, srcId)
                                .doesNotContain(prefix);
                    }
                }
            }
        }
    }

    @Test
    @DisplayName("Eval 06: Kịch bản MISSING_TRANSCRIPT phải yêu cầu làm rõ và không sinh kết quả cá nhân hóa")
    void testChatEvalMissingTranscriptBehavior() {
        boolean foundMissingTranscriptCase = false;
        for (JsonNode c : evalNode.get("cases")) {
            String cat = c.path("category").asText();
            if ("MISSING_TRANSCRIPT".equals(cat)) {
                foundMissingTranscriptCase = true;
                String caseId = c.path("id").asText();
                String transcriptStatus = c.path("context").path("transcript").asText();
                boolean shouldClarify = c.path("expected").path("should_ask_clarification").asBoolean();

                assertThat(transcriptStatus).isEqualTo("MISSING");
                assertThat(shouldClarify)
                        .withFailMessage("Case %s (MISSING_TRANSCRIPT) phải có should_ask_clarification = true", caseId)
                        .isTrue();

                // Kiểm tra có mã cảnh báo TRANSCRIPT_REQUIRED
                JsonNode warnings = c.path("expected").path("warnings");
                assertThat(warnings.toString()).contains("TRANSCRIPT_REQUIRED");
            }
        }
        assertThat(foundMissingTranscriptCase).isTrue();
    }

    @Test
    @DisplayName("Eval 07: Kịch bản NO_EVIDENCE không được trích dẫn nguồn giả và sources phải rỗng")
    void testChatEvalNoEvidenceBehavior() {
        boolean foundNoEvidenceCase = false;
        for (JsonNode c : evalNode.get("cases")) {
            String cat = c.path("category").asText();
            if ("NO_EVIDENCE".equals(cat)) {
                foundNoEvidenceCase = true;
                String caseId = c.path("id").asText();
                JsonNode sources = c.path("expected").path("sources");

                assertThat(sources.size())
                        .withFailMessage("Case %s (NO_EVIDENCE) phải có sources = []", caseId)
                        .isEqualTo(0);

                JsonNode warnings = c.path("expected").path("warnings");
                assertThat(warnings.toString()).contains("POLICY_SOURCE_UNAVAILABLE");
            }
        }
        assertThat(foundNoEvidenceCase).isTrue();
    }

    @Test
    @DisplayName("Eval 08: Các câu hỏi quy chế thuần (REGULATION) phải có ít nhất 1 nguồn RAG hợp lệ")
    void testChatEvalRegulationCasesHaveSources() {
        for (JsonNode c : evalNode.get("cases")) {
            String cat = c.path("category").asText();
            if ("REGULATION".equals(cat)) {
                String caseId = c.path("id").asText();
                JsonNode sources = c.path("expected").path("sources");

                assertThat(sources.size())
                        .withFailMessage("Case quy chế %s bắt buộc phải có ít nhất một nguồn trích dẫn", caseId)
                        .isGreaterThan(0);
            }
        }
    }
}
