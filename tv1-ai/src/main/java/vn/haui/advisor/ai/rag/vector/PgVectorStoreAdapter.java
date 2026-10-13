package vn.haui.advisor.ai.rag.vector;

import com.pgvector.PGvector;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.haui.advisor.ai.rag.model.RagChunk;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Adapter kết nối PostgreSQL pgvector thông qua {@link JdbcTemplate} và {@link PGvector}.
 *
 * <p><strong>Đặc tính bảo mật và kỹ thuật:</strong>
 * <ul>
 *   <li>100% Parameterized SQL Statements: Ngăn ngừa tuyệt đối lỗ hổng SQL Injection.</li>
 *   <li>Sử dụng toán tử khoảng cách cosine pgvector: {@code (1.0 - (embedding <=> ?::vector))}.</li>
 *   <li>Tương thích schema bảng {@code rag_chunks}.</li>
 *   <li>Xử lý ngoại lệ CSDL và đóng gói vào {@link VectorStoreException}.</li>
 *   <li>Cung cấp migration DDL chuẩn hóa cho Flyway module tv5-platform.</li>
 * </ul>
 */
public class PgVectorStoreAdapter implements VectorStore {

    public static final String DEFAULT_TABLE_NAME = "rag_chunks";
    public static final int DEFAULT_DIMENSION = 384;

    private final JdbcTemplate jdbcTemplate;
    private final String tableName;

    public PgVectorStoreAdapter(JdbcTemplate jdbcTemplate) {
        this(jdbcTemplate, DEFAULT_TABLE_NAME);
    }

    public PgVectorStoreAdapter(JdbcTemplate jdbcTemplate, String tableName) {
        this.jdbcTemplate = Objects.requireNonNull(jdbcTemplate, "jdbcTemplate must not be null");
        this.tableName = (tableName != null && !tableName.isBlank()) ? tableName.trim() : DEFAULT_TABLE_NAME;
    }

    @Override
    public void upsert(List<RagChunk> chunks, List<float[]> vectors) {
        if (chunks == null || vectors == null) {
            throw new IllegalArgumentException("Chunks and vectors must not be null");
        }
        if (chunks.size() != vectors.size()) {
            throw new IllegalArgumentException(
                    "Size mismatch: chunks has " + chunks.size() + " items, but vectors has " + vectors.size()
            );
        }
        if (chunks.isEmpty()) {
            return;
        }

        String sql = "INSERT INTO " + tableName + " (" +
                "chunk_id, source_id, title, section, version, reference_url, content, chunk_index, token_estimate, embedding" +
                ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
                "ON CONFLICT (chunk_id) DO UPDATE SET " +
                "source_id = EXCLUDED.source_id, " +
                "title = EXCLUDED.title, " +
                "section = EXCLUDED.section, " +
                "version = EXCLUDED.version, " +
                "reference_url = EXCLUDED.reference_url, " +
                "content = EXCLUDED.content, " +
                "chunk_index = EXCLUDED.chunk_index, " +
                "token_estimate = EXCLUDED.token_estimate, " +
                "embedding = EXCLUDED.embedding";

        try {
            jdbcTemplate.batchUpdate(sql, new BatchPreparedStatementSetter() {
                @Override
                public void setValues(PreparedStatement ps, int i) throws SQLException {
                    RagChunk chunk = chunks.get(i);
                    float[] vector = vectors.get(i);

                    ps.setString(1, chunk.getChunkId());
                    ps.setString(2, chunk.getSourceId());
                    ps.setString(3, chunk.getTitle());
                    ps.setString(4, chunk.getSection());
                    ps.setString(5, chunk.getVersion());
                    ps.setString(6, chunk.getReferenceUrl());
                    ps.setString(7, chunk.getContent());
                    ps.setInt(8, chunk.getChunkIndex());
                    ps.setInt(9, chunk.getTokenEstimate());
                    ps.setObject(10, new PGvector(vector));
                }

                @Override
                public int getBatchSize() {
                    return chunks.size();
                }
            });
        } catch (DataAccessException e) {
            throw new VectorStoreException("Failed to upsert chunks into PgVectorStoreAdapter: " + e.getMessage(), e);
        }
    }

    @Override
    public List<VectorSearchResult> search(VectorSearchQuery query) {
        if (query == null) {
            throw new IllegalArgumentException("Query must not be null");
        }

        StringBuilder sql = new StringBuilder();
        sql.append("SELECT chunk_id, source_id, title, section, version, reference_url, content, chunk_index, token_estimate, ");
        sql.append("(1.0 - (embedding <=> ?::vector)) AS score ");
        sql.append("FROM ").append(tableName).append(" ");
        sql.append("WHERE (1.0 - (embedding <=> ?::vector)) >= ? ");

        List<Object> params = new ArrayList<>();
        params.add(new PGvector(query.getQueryVector()));
        params.add(new PGvector(query.getQueryVector()));
        params.add(query.getMinScore());

        if (query.getSourceIdFilter() != null && !query.getSourceIdFilter().isBlank()) {
            sql.append("AND source_id = ? ");
            params.add(query.getSourceIdFilter());
        }

        if (query.getVersionFilter() != null && !query.getVersionFilter().isBlank()) {
            sql.append("AND version = ? ");
            params.add(query.getVersionFilter());
        }

        sql.append("ORDER BY score DESC LIMIT ?");
        params.add(query.getTopK());

        try {
            return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> {
                RagChunk chunk = new RagChunk(
                        rs.getString("chunk_id"),
                        rs.getString("source_id"),
                        rs.getString("title"),
                        rs.getString("section"),
                        rs.getString("version"),
                        rs.getString("reference_url"),
                        rs.getString("content"),
                        rs.getInt("chunk_index"),
                        rs.getInt("token_estimate")
                );
                double score = rs.getDouble("score");
                return new VectorSearchResult(chunk, score);
            }, params.toArray());
        } catch (DataAccessException e) {
            throw new VectorStoreException("Failed to execute search query in PgVectorStoreAdapter: " + e.getMessage(), e);
        }
    }

    @Override
    public void deleteBySourceId(String sourceId) {
        if (sourceId == null || sourceId.isBlank()) {
            return;
        }
        String sql = "DELETE FROM " + tableName + " WHERE source_id = ?";
        try {
            jdbcTemplate.update(sql, sourceId);
        } catch (DataAccessException e) {
            throw new VectorStoreException("Failed to delete chunks by sourceId in PgVectorStoreAdapter: " + e.getMessage(), e);
        }
    }

    @Override
    public long count() {
        String sql = "SELECT COUNT(*) FROM " + tableName;
        try {
            Long count = jdbcTemplate.queryForObject(sql, Long.class);
            return count != null ? count : 0L;
        } catch (DataAccessException e) {
            throw new VectorStoreException("Failed to count chunks in PgVectorStoreAdapter: " + e.getMessage(), e);
        }
    }

    @Override
    public Optional<RagChunk> findById(String chunkId) {
        if (chunkId == null || chunkId.isBlank()) {
            return Optional.empty();
        }
        String sql = "SELECT chunk_id, source_id, title, section, version, reference_url, content, chunk_index, token_estimate " +
                "FROM " + tableName + " WHERE chunk_id = ?";
        try {
            List<RagChunk> list = jdbcTemplate.query(sql, (rs, rowNum) -> new RagChunk(
                    rs.getString("chunk_id"),
                    rs.getString("source_id"),
                    rs.getString("title"),
                    rs.getString("section"),
                    rs.getString("version"),
                    rs.getString("reference_url"),
                    rs.getString("content"),
                    rs.getInt("chunk_index"),
                    rs.getInt("token_estimate")
            ), chunkId);

            return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
        } catch (DataAccessException e) {
            throw new VectorStoreException("Failed to find chunk by id in PgVectorStoreAdapter: " + e.getMessage(), e);
        }
    }

    /**
     * Tạo mã SQL DDL di trú Flyway tiêu chuẩn cho PostgreSQL hỗ trợ tiện ích mở rộng pgvector.
     */
    public String generateDDL() {
        return generateDDL(DEFAULT_DIMENSION);
    }

    /**
     * Tạo mã SQL DDL di trú Flyway theo số chiều vector chỉ định.
     */
    public static String generateDDL(int dimension) {
        return "-- V0__create_rag_chunks_vector_table.sql\n" +
                "CREATE EXTENSION IF NOT EXISTS vector;\n\n" +
                "CREATE TABLE IF NOT EXISTS rag_chunks (\n" +
                "    chunk_id VARCHAR(128) PRIMARY KEY,\n" +
                "    source_id VARCHAR(128) NOT NULL,\n" +
                "    title VARCHAR(256),\n" +
                "    section VARCHAR(256),\n" +
                "    version VARCHAR(64),\n" +
                "    reference_url VARCHAR(512),\n" +
                "    content TEXT NOT NULL,\n" +
                "    chunk_index INT NOT NULL,\n" +
                "    token_estimate INT NOT NULL,\n" +
                "    embedding vector(" + dimension + ")\n" +
                ");\n\n" +
                "CREATE INDEX IF NOT EXISTS idx_rag_chunks_source_id ON rag_chunks(source_id);\n" +
                "CREATE INDEX IF NOT EXISTS idx_rag_chunks_version ON rag_chunks(version);\n" +
                "CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding_cosine ON rag_chunks USING hnsw (embedding vector_cosine_ops);\n";
    }
}
