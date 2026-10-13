package vn.haui.advisor.ai.rag.vector;

import com.pgvector.PGvector;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import vn.haui.advisor.ai.rag.model.RagChunk;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PgVectorStoreAdapterTest {

    private JdbcTemplate jdbcTemplate;
    private PgVectorStoreAdapter adapter;

    @BeforeEach
    void setUp() {
        jdbcTemplate = mock(JdbcTemplate.class);
        adapter = new PgVectorStoreAdapter(jdbcTemplate);
    }

    private RagChunk createChunk(String chunkId, String sourceId, String version, String content) {
        return new RagChunk(
                chunkId,
                sourceId,
                "Quy chế đào tạo HaUI",
                "Điều 10: Học phần",
                version,
                "https://qldt.haui.edu.vn",
                content,
                0,
                50
        );
    }

    @Test
    @DisplayName("generateDDL returns valid Flyway DDL with pgvector extension, table and indices")
    void testGenerateDDL() {
        String ddl = adapter.generateDDL();
        assertThat(ddl).contains("CREATE EXTENSION IF NOT EXISTS vector");
        assertThat(ddl).contains("CREATE TABLE IF NOT EXISTS rag_chunks");
        assertThat(ddl).contains("chunk_id VARCHAR");
        assertThat(ddl).contains("source_id VARCHAR");
        assertThat(ddl).contains("content TEXT");
        assertThat(ddl).contains("embedding vector(384)");
        assertThat(ddl).contains("vector_cosine_ops");

        String customDdl = PgVectorStoreAdapter.generateDDL(1536);
        assertThat(customDdl).contains("embedding vector(1536)");
    }

    @Test
    @DisplayName("upsert uses parameterized batchUpdate without string concatenation and maps PGvector")
    void testUpsertParameterized() throws SQLException {
        RagChunk chunk = createChunk("chunk-1", "src-1", "v1", "Nội dung tín chỉ");
        float[] vector = new float[]{0.1f, 0.2f, 0.3f};

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<BatchPreparedStatementSetter> pssCaptor = ArgumentCaptor.forClass(BatchPreparedStatementSetter.class);

        adapter.upsert(List.of(chunk), List.of(vector));

        verify(jdbcTemplate).batchUpdate(sqlCaptor.capture(), pssCaptor.capture());
        String executedSql = sqlCaptor.getValue();

        // SQL phải hoàn toàn là parameterized với dấu ?
        assertThat(executedSql).contains("INSERT INTO rag_chunks");
        assertThat(executedSql).contains("VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        assertThat(executedSql).contains("ON CONFLICT (chunk_id) DO UPDATE SET");
        assertThat(executedSql).doesNotContain("chunk-1"); // Không được nối chuỗi dữ liệu vào câu SQL

        // Kiểm tra PreparedStatementSetter
        PreparedStatement ps = mock(PreparedStatement.class);
        BatchPreparedStatementSetter setter = pssCaptor.getValue();
        assertThat(setter.getBatchSize()).isEqualTo(1);
        setter.setValues(ps, 0);

        verify(ps).setString(1, "chunk-1");
        verify(ps).setString(2, "src-1");
        verify(ps).setString(3, "Quy chế đào tạo HaUI");
        verify(ps).setString(4, "Điều 10: Học phần");
        verify(ps).setString(5, "v1");
        verify(ps).setString(6, "https://qldt.haui.edu.vn");
        verify(ps).setString(7, "Nội dung tín chỉ");
        verify(ps).setInt(8, 0);
        verify(ps).setInt(9, 50);
        verify(ps).setObject(eq(10), any(PGvector.class));
    }

    @Test
    @DisplayName("search uses parameterized SQL with <=> cosine distance operator and safeguards against SQL injection")
    @SuppressWarnings("unchecked")
    void testSearchParameterizedAndSqlInjectionSafe() {
        float[] queryVec = new float[]{0.1f, 0.2f, 0.3f};
        String maliciousSourceId = "src-1' OR '1'='1; DROP TABLE rag_chunks; --";
        String maliciousVersion = "v1' UNION SELECT * FROM users; --";

        VectorSearchQuery query = VectorSearchQuery.builder()
                .queryVector(queryVec)
                .topK(5)
                .minScore(0.6)
                .sourceIdFilter(maliciousSourceId)
                .versionFilter(maliciousVersion)
                .build();

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object[]> paramsCaptor = ArgumentCaptor.forClass(Object[].class);

        adapter.search(query);

        verify(jdbcTemplate).query(sqlCaptor.capture(), any(RowMapper.class), paramsCaptor.capture());

        String sql = sqlCaptor.getValue();
        Object[] params = paramsCaptor.getValue();

        // Câu SQL phải dùng toán tử cosine distance pgvector: 1.0 - (embedding <=> ?::vector)
        assertThat(sql).contains("(1.0 - (embedding <=> ?::vector))");
        assertThat(sql).contains("source_id = ?");
        assertThat(sql).contains("version = ?");
        assertThat(sql).contains("LIMIT ?");

        // Tuyệt đối không chứa chuỗi SQL injection thô trong SQL
        assertThat(sql).doesNotContain(maliciousSourceId);
        assertThat(sql).doesNotContain(maliciousVersion);
        assertThat(sql).doesNotContain("DROP TABLE");

        // Tham số truyền vào mảng params phải đúng giá trị
        assertThat(params).contains(maliciousSourceId);
        assertThat(params).contains(maliciousVersion);
        assertThat(params).contains(0.6);
        assertThat(params).contains(5);
        assertThat(params[0]).isInstanceOf(PGvector.class);
    }

    @Test
    @DisplayName("deleteBySourceId and count use parameterized queries")
    void testDeleteAndCount() {
        adapter.deleteBySourceId("source-to-delete");
        verify(jdbcTemplate).update(eq("DELETE FROM rag_chunks WHERE source_id = ?"), eq("source-to-delete"));

        when(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM rag_chunks", Long.class)).thenReturn(42L);
        assertThat(adapter.count()).isEqualTo(42L);
    }

    @Test
    @DisplayName("findById queries with parameterized chunk_id")
    @SuppressWarnings("unchecked")
    void testFindById() {
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq("c-123")))
                .thenReturn(List.of(createChunk("c-123", "s-1", "v1", "Test")));

        Optional<RagChunk> res = adapter.findById("c-123");
        assertThat(res).isPresent();
        assertThat(res.get().getChunkId()).isEqualTo("c-123");

        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq("not-found")))
                .thenReturn(List.of());
        assertThat(adapter.findById("not-found")).isEmpty();
    }

    @Test
    @DisplayName("Database errors are wrapped into VectorStoreException")
    void testDatabaseErrorHandling() {
        doThrow(new DataIntegrityViolationException("Database constraint violated"))
                .when(jdbcTemplate).batchUpdate(anyString(), any(BatchPreparedStatementSetter.class));

        RagChunk chunk = createChunk("c-1", "s-1", "v1", "content");
        assertThatThrownBy(() -> adapter.upsert(List.of(chunk), List.of(new float[]{0.1f})))
                .isInstanceOf(VectorStoreException.class)
                .hasMessageContaining("PgVectorStoreAdapter");
    }
}
