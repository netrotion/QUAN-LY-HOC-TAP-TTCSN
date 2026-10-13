package vn.haui.advisor.platform.transcript.importing;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import vn.haui.advisor.contracts.dto.ImportSessionStatus;
import vn.haui.advisor.contracts.dto.TranscriptDocumentSummary;
import vn.haui.advisor.contracts.dto.TranscriptSourceType;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Phiên nhập bảng điểm (import_sessions). Chỉ lưu metadata và SHA-256 của file, không lưu nội dung file.
 * Truy vấn luôn kèm student_id để sinh viên khác không đọc được phiên.
 */
@Repository
public class ImportSessionRepository {

    private static final TypeReference<List<ImportRowDraft>> ROWS = new TypeReference<>() {
    };
    private static final TypeReference<List<String>> STRINGS = new TypeReference<>() {
    };
    private static final String COLUMNS = """
            session_id, student_id, status, source_type, file_name, content_type, file_size_bytes, file_sha256, page_count,
            session_version, rows_json, document_summary_json, warnings_json, uploaded_at, updated_at, expires_at, confirmed_at
            """;

    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;

    public ImportSessionRepository(JdbcClient jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    /** Trạng thái lưu trữ của một phiên nhập. */
    public static class ImportSession {
        public String importSessionId;
        public String studentId;
        public ImportSessionStatus status;
        public TranscriptSourceType sourceType;
        public String fileName;
        public String contentType;
        public Long fileSizeBytes;
        public String fileSha256;
        public Integer pageCount;
        public int sessionVersion = 1;
        public List<ImportRowDraft> rows = new ArrayList<>();
        public TranscriptDocumentSummary documentSummary;
        public List<String> warnings = new ArrayList<>();
        public Instant createdAt;
        public Instant updatedAt;
        public Instant expiresAt;
        public Instant confirmedAt;

        public boolean isOpen() {
            return status == ImportSessionStatus.REVIEW_REQUIRED || status == ImportSessionStatus.MANUAL_ENTRY_REQUIRED;
        }
    }

    public void insert(ImportSession session) {
        jdbc.sql("""
                        INSERT INTO import_sessions (session_id, student_id, file_name, file_type, status, source_type, content_type,
                                                     file_size_bytes, file_sha256, page_count, session_version, rows_json,
                                                     document_summary_json, warnings_json, uploaded_at, updated_at, expires_at)
                        VALUES (:id, :studentId, :fileName, :fileType, :status, :sourceType, :contentType, :size, :sha, :pages,
                                :version, :rows, :summary, :warnings, :createdAt, :updatedAt, :expiresAt)
                        """)
                .params(params(session))
                .update();
    }

    /** Ghi phiên nếu version chưa đổi; trả false khi có giao dịch khác đã sửa phiên (optimistic lock). */
    public boolean update(ImportSession session, int expectedVersion) {
        Map<String, Object> params = params(session);
        params.put("expectedVersion", expectedVersion);
        return jdbc.sql("""
                        UPDATE import_sessions SET status = :status, session_version = :version, rows_json = :rows,
                               warnings_json = :warnings, updated_at = :updatedAt, confirmed_at = :confirmedAt
                        WHERE session_id = :id AND student_id = :studentId AND session_version = :expectedVersion
                        """)
                .params(params)
                .update() == 1;
    }

    public Optional<ImportSession> find(String importSessionId, String studentId) {
        return jdbc.sql("SELECT " + COLUMNS + " FROM import_sessions WHERE session_id = :id AND student_id = :studentId")
                .param("id", importSessionId).param("studentId", studentId)
                .query(this::map)
                .optional();
    }

    public List<ImportSession> listRecent(String studentId, int limit) {
        return jdbc.sql("SELECT " + COLUMNS + " FROM import_sessions WHERE student_id = :studentId ORDER BY uploaded_at DESC")
                .param("studentId", studentId)
                .query(this::map)
                .list()
                .stream().limit(limit).toList();
    }

    public int countOpen(String studentId, Instant now) {
        return jdbc.sql("""
                        SELECT count(*) FROM import_sessions
                        WHERE student_id = :studentId AND status IN ('REVIEW_REQUIRED', 'MANUAL_ENTRY_REQUIRED') AND expires_at > :now
                        """)
                .param("studentId", studentId).param("now", ts(now))
                .query(Integer.class).single();
    }

    private Map<String, Object> params(ImportSession session) {
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("id", session.importSessionId);
        params.put("studentId", session.studentId);
        params.put("fileName", session.fileName);
        params.put("fileType", session.sourceType == TranscriptSourceType.MANUAL ? "MANUAL"
                : session.sourceType == TranscriptSourceType.IMAGE ? "IMAGE" : "PDF");
        params.put("status", session.status.name());
        params.put("sourceType", session.sourceType.name());
        params.put("contentType", session.contentType);
        params.put("size", session.fileSizeBytes);
        params.put("sha", session.fileSha256);
        params.put("pages", session.pageCount);
        params.put("version", session.sessionVersion);
        params.put("rows", write(session.rows));
        params.put("summary", session.documentSummary == null ? null : write(session.documentSummary));
        params.put("warnings", write(session.warnings));
        params.put("createdAt", ts(session.createdAt));
        params.put("updatedAt", ts(session.updatedAt));
        params.put("expiresAt", ts(session.expiresAt));
        params.put("confirmedAt", ts(session.confirmedAt));
        return params;
    }

    private ImportSession map(ResultSet rs, int rowNum) throws SQLException {
        ImportSession session = new ImportSession();
        session.importSessionId = rs.getString("session_id");
        session.studentId = rs.getString("student_id");
        session.status = ImportSessionStatus.valueOf(rs.getString("status"));
        session.sourceType = TranscriptSourceType.valueOf(rs.getString("source_type"));
        session.fileName = rs.getString("file_name");
        session.contentType = rs.getString("content_type");
        long size = rs.getLong("file_size_bytes");
        session.fileSizeBytes = rs.wasNull() ? null : size;
        session.fileSha256 = rs.getString("file_sha256");
        int pages = rs.getInt("page_count");
        session.pageCount = rs.wasNull() ? null : pages;
        session.sessionVersion = rs.getInt("session_version");
        session.rows = read(rs.getString("rows_json"), ROWS, new ArrayList<>());
        String summary = rs.getString("document_summary_json");
        session.documentSummary = summary == null ? null : read(summary, TranscriptDocumentSummary.class);
        session.warnings = read(rs.getString("warnings_json"), STRINGS, new ArrayList<>());
        session.createdAt = instant(rs, "uploaded_at");
        session.updatedAt = instant(rs, "updated_at");
        session.expiresAt = instant(rs, "expires_at");
        session.confirmedAt = instant(rs, "confirmed_at");
        return session;
    }

    private String write(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Không ghi được JSON phiên nhập", ex);
        }
    }

    private <T> T read(String json, TypeReference<T> type, T fallback) {
        if (json == null) {
            return fallback;
        }
        try {
            return objectMapper.readValue(json, type);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Không đọc được JSON phiên nhập", ex);
        }
    }

    private <T> T read(String json, Class<T> type) {
        try {
            return objectMapper.readValue(json, type);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Không đọc được JSON phiên nhập", ex);
        }
    }

    private static OffsetDateTime ts(Instant instant) {
        return instant == null ? null : OffsetDateTime.ofInstant(instant, ZoneOffset.UTC);
    }

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        OffsetDateTime value = rs.getObject(column, OffsetDateTime.class);
        return value == null ? null : value.toInstant();
    }
}
