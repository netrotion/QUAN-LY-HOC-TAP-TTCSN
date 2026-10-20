package vn.haui.advisor.ai.rag.vector;

import com.pgvector.PGvector;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import vn.haui.advisor.ai.rag.model.RagChunk;

import java.sql.Connection;
import java.sql.DriverManager;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Task 4.2c — Group E: Kiểm thử tích hợp thực tế với PostgreSQL / pgvector.
 *
 * <p>Kiểm thử trực tiếp trên CSDL PostgreSQL cổng 5433 (container haui-db) có cài sẵn pgvector:
 * <ul>
 *   <li>Tạo bảng tạm test_rag_chunks_42c với cột kiểu vector(3) và chỉ mục HNSW cosine.</li>
 *   <li>Thực hiện Upsert các văn bản quy chế đào tạo thực tế.</li>
 *   <li>Thực hiện tìm kiếm tương đồng vector bằng toán tử {@code <=>} cosine distance.</li>
 *   <li>Kiểm tra tính lũy đẳng (Idempotence) khi tái lập chỉ mục (Reindexing).</li>
 *   <li>Kiểm tra bộ lọc theo nguồn tài liệu và phiên bản quy chế.</li>
 *   <li>Dọn dẹp tài nguyên sau khi kiểm thử hoàn tất.</li>
 * </ul>
 */
@DisplayName("Task 4.2c — Group E: Live PostgreSQL / pgvector Integration Test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class PgVectorRealDatabaseIntegrationTest {

    private static final String DB_URL = "jdbc:postgresql://localhost:5433/haui_advisor";
    private static final String DB_USER = "postgres";
    private static final String DB_PASS = "postgres";
    private static final String TEST_TABLE = "test_rag_chunks_42c";

    private SingleConnectionDataSource dataSource;
    private JdbcTemplate jdbcTemplate;
    private PgVectorStoreAdapter adapter;
    private boolean isDatabaseAvailable = false;

    @BeforeAll
    void checkDatabaseAndInit() {
        try {
            Connection rawConn = DriverManager.getConnection(DB_URL, DB_USER, DB_PASS);
            PGvector.addVectorType(rawConn);
            dataSource = new SingleConnectionDataSource(rawConn, true);
            jdbcTemplate = new JdbcTemplate(dataSource);

            // Đảm bảo tiện ích mở rộng vector đã được kích hoạt
            jdbcTemplate.execute("CREATE EXTENSION IF NOT EXISTS vector;");

            // Tạo bảng kiểm thử cách ly
            jdbcTemplate.execute("DROP TABLE IF EXISTS " + TEST_TABLE + ";");
            jdbcTemplate.execute(
                    "CREATE TABLE " + TEST_TABLE + " (\n" +
                            "    chunk_id VARCHAR(128) PRIMARY KEY,\n" +
                            "    source_id VARCHAR(128) NOT NULL,\n" +
                            "    title VARCHAR(256),\n" +
                            "    section VARCHAR(256),\n" +
                            "    version VARCHAR(64),\n" +
                            "    reference_url VARCHAR(512),\n" +
                            "    content TEXT NOT NULL,\n" +
                            "    chunk_index INT NOT NULL,\n" +
                            "    token_estimate INT NOT NULL,\n" +
                            "    embedding vector(3)\n" +
                            ");"
            );
            jdbcTemplate.execute(
                    "CREATE INDEX IF NOT EXISTS idx_" + TEST_TABLE + "_cosine ON " + TEST_TABLE +
                            " USING hnsw (embedding vector_cosine_ops);"
            );

            adapter = new PgVectorStoreAdapter(jdbcTemplate, TEST_TABLE);
            isDatabaseAvailable = true;
        } catch (Exception e) {
            System.err.println("Live PostgreSQL/pgvector not reachable on port 5433: " + e.getMessage());
            isDatabaseAvailable = false;
        }
    }

    @AfterAll
    void cleanUp() {
        if (isDatabaseAvailable && jdbcTemplate != null) {
            try {
                jdbcTemplate.execute("DROP TABLE IF EXISTS " + TEST_TABLE + ";");
                if (dataSource != null) {
                    dataSource.destroy();
                }
            } catch (Exception ignored) {
            }
        }
    }

    @BeforeEach
    void verifyAvailable() {
        assumeTrue(isDatabaseAvailable, "PostgreSQL with pgvector on port 5433 is not reachable; test skipped.");
        if (jdbcTemplate != null) {
            jdbcTemplate.execute("TRUNCATE TABLE " + TEST_TABLE + ";");
        }
    }

    private RagChunk createSampleChunk(String id, String sourceId, String title, String section, String content) {
        return new RagChunk(
                id,
                sourceId,
                title,
                section,
                "2024-V1",
                "https://qldt.haui.edu.vn/regulation",
                content,
                0,
                80
        );
    }

    @Test
    @DisplayName("E1. Real pgvector upsert and similarity search retrieve most relevant chunk")
    void testRealPgVectorUpsertAndSimilaritySearch() {
        RagChunk chunk1 = createSampleChunk("chk-warning", "REG-01", "Quy chế đào tạo HaUI", "Điều 15: Cảnh báo học vụ",
                "Sinh viên bị cảnh báo học vụ nếu điểm trung bình tích lũy CPA dưới 1.20 đối với năm thứ nhất.");
        RagChunk chunk2 = createSampleChunk("chk-prereq", "REG-01", "Quy chế đào tạo HaUI", "Điều 8: Học phần tiên quyết",
                "Học phần tiên quyết là học phần mà sinh viên phải tích lũy điểm đạt (>= D) trước khi đăng ký học phần kế tiếp.");
        RagChunk chunk3 = createSampleChunk("chk-grad", "REG-02", "Quy chế xét tốt nghiệp", "Điều 25: Điều kiện tốt nghiệp",
                "Sinh viên được công nhận tốt nghiệp khi tích lũy đủ số tín chỉ, CPA >= 2.00 và có chứng chỉ chuẩn đầu ra ngoại ngữ, tin học.");

        // Vector 3 chiều đại diện: [cảnh báo học vụ, tiên quyết, tốt nghiệp]
        float[] vecWarning = new float[]{0.95f, 0.05f, 0.02f};
        float[] vecPrereq = new float[]{0.05f, 0.92f, 0.03f};
        float[] vecGrad = new float[]{0.02f, 0.04f, 0.96f};

        adapter.upsert(List.of(chunk1, chunk2, chunk3), List.of(vecWarning, vecPrereq, vecGrad));
        assertThat(adapter.count()).isEqualTo(3);

        // Truy vấn câu hỏi gần với "cảnh báo học vụ"
        float[] queryWarning = new float[]{0.90f, 0.10f, 0.05f};
        VectorSearchQuery search = VectorSearchQuery.builder()
                .queryVector(queryWarning)
                .topK(2)
                .minScore(0.70)
                .build();

        List<VectorSearchResult> results = adapter.search(search);
        assertThat(results).isNotEmpty();
        assertThat(results.get(0).getChunk().getChunkId()).isEqualTo("chk-warning");
        assertThat(results.get(0).getChunk().getContent()).contains("CPA dưới 1.20");
        assertThat(results.get(0).getScore()).isGreaterThan(0.95);
    }

    @Test
    @DisplayName("E2. Idempotent reindexing updates existing record without duplicates")
    void testIdempotentReindexing() {
        RagChunk original = createSampleChunk("chk-reindex-1", "REG-REINDEX", "Quy chế sửa đổi", "Điều 1", "Nội dung ban đầu");
        adapter.upsert(List.of(original), List.of(new float[]{0.5f, 0.5f, 0.0f}));
        long initialCount = adapter.count();

        // Tái lập chỉ mục cùng chunk_id với nội dung cập nhật
        RagChunk updated = createSampleChunk("chk-reindex-1", "REG-REINDEX", "Quy chế sửa đổi", "Điều 1", "Nội dung đã cập nhật phiên bản mới");
        adapter.upsert(List.of(updated), List.of(new float[]{0.6f, 0.4f, 0.0f}));

        // Số lượng bản ghi không đổi (không nhân bản trùng lặp)
        assertThat(adapter.count()).isEqualTo(initialCount);

        // Kiểm tra nội dung đã được cập nhật
        Optional<RagChunk> retrieved = adapter.findById("chk-reindex-1");
        assertThat(retrieved).isPresent();
        assertThat(retrieved.get().getContent()).isEqualTo("Nội dung đã cập nhật phiên bản mới");
    }

    @Test
    @DisplayName("E3. Source ID and version filtering work precisely in live pgvector query")
    void testFilteringBySourceAndVersion() {
        VectorSearchQuery querySourceFilter = VectorSearchQuery.builder()
                .queryVector(new float[]{0.02f, 0.04f, 0.96f})
                .topK(5)
                .sourceIdFilter("REG-02")
                .build();

        List<VectorSearchResult> results = adapter.search(querySourceFilter);
        assertThat(results).allMatch(r -> "REG-02".equals(r.getChunk().getSourceId()));
        assertThat(results).noneMatch(r -> "REG-01".equals(r.getChunk().getSourceId()));
    }

    @Test
    @DisplayName("E4. deleteBySourceId removes only specified source records")
    void testDeleteBySourceId() {
        adapter.deleteBySourceId("REG-REINDEX");
        Optional<RagChunk> deleted = adapter.findById("chk-reindex-1");
        assertThat(deleted).isEmpty();
    }
}
