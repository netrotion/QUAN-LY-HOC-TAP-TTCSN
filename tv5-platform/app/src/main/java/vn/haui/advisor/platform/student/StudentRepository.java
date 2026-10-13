package vn.haui.advisor.platform.student;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import vn.haui.advisor.contracts.dto.TranscriptSourceType;
import vn.haui.advisor.contracts.dto.TranscriptStatus;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

/**
 * Tài khoản (users) và hồ sơ sinh viên (student_records). Tên đăng nhập = mã sinh viên.
 * dataRevision = REV-{studentId}-{version}; mọi thay đổi dữ liệu học vụ tăng version bằng optimistic lock.
 */
@Repository
public class StudentRepository {

    private static final String SELECT_STUDENT = """
            SELECT s.student_id, s.user_id, s.full_name, s.email, s.class_name, s.cohort, s.curriculum_id, s.major,
                   s.version, s.data_revision, s.transcript_status, s.transcript_source_type, s.transcript_import_session_id,
                   s.transcript_confirmed_at, s.created_at, s.updated_at
            FROM student_records s
            """;

    private final JdbcClient jdbc;

    public StudentRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public record StudentRow(String studentId, String userId, String fullName, String email, String className, String cohort,
                             String curriculumId, String majorCode, int version, String dataRevision,
                             TranscriptStatus transcriptStatus, TranscriptSourceType transcriptSourceType,
                             String transcriptImportSessionId, Instant transcriptConfirmedAt, Instant createdAt, Instant updatedAt) {
    }

    public record UserRow(String userId, String username, String passwordHash, String role, String status) {
    }

    public static String revision(String studentId, int version) {
        return String.format("REV-%s-%03d", studentId, version);
    }

    public Optional<UserRow> findUser(String username) {
        return jdbc.sql("SELECT user_id, username, password_hash, role, status FROM users WHERE username = :username")
                .param("username", username)
                .query((rs, i) -> new UserRow(rs.getString("user_id"), rs.getString("username"), rs.getString("password_hash"),
                        rs.getString("role"), rs.getString("status")))
                .optional();
    }

    public boolean existsUser(String username) {
        return jdbc.sql("SELECT count(*) FROM users WHERE username = :username").param("username", username)
                .query(Integer.class).single() > 0;
    }

    public Optional<StudentRow> findByStudentId(String studentId) {
        return jdbc.sql(SELECT_STUDENT + " WHERE s.student_id = :studentId")
                .param("studentId", studentId)
                .query(StudentRepository::mapStudent)
                .optional();
    }

    /** Hồ sơ của tài khoản đăng nhập (users.username = principal). */
    public Optional<StudentRow> findByUsername(String username) {
        return jdbc.sql(SELECT_STUDENT + " JOIN users u ON u.user_id = s.user_id WHERE u.username = :username")
                .param("username", username)
                .query(StudentRepository::mapStudent)
                .optional();
    }

    public void insertAccount(String studentId, String passwordHash, String fullName, String email, String className,
                              String cohort, String curriculumId, String majorCode, Instant now) {
        String userId = "U-" + studentId;
        jdbc.sql("""
                        INSERT INTO users (user_id, username, password_hash, role, status, created_at, updated_at)
                        VALUES (:userId, :username, :hash, 'STUDENT', 'ACTIVE', :now, :now)
                        """)
                .param("userId", userId).param("username", studentId).param("hash", passwordHash).param("now", ts(now))
                .update();
        jdbc.sql("""
                        INSERT INTO student_records (student_id, user_id, full_name, email, class_name, cohort, curriculum_id, major,
                                                     version, data_revision, transcript_status, created_at, updated_at)
                        VALUES (:studentId, :userId, :fullName, :email, :className, :cohort, :curriculumId, :major,
                                1, :revision, 'NONE', :now, :now)
                        """)
                .param("studentId", studentId).param("userId", userId).param("fullName", fullName).param("email", email)
                .param("className", className).param("cohort", cohort).param("curriculumId", curriculumId)
                .param("major", majorCode).param("revision", revision(studentId, 1)).param("now", ts(now))
                .update();
    }

    public void updateProfileFields(String studentId, String fullName, String email, String className, String cohort, Instant now) {
        jdbc.sql("""
                        UPDATE student_records SET full_name = :fullName, email = :email, class_name = :className,
                               cohort = :cohort, updated_at = :now
                        WHERE student_id = :studentId
                        """)
                .param("fullName", fullName).param("email", email).param("className", className).param("cohort", cohort)
                .param("now", ts(now)).param("studentId", studentId)
                .update();
    }

    public void updateCurriculum(String studentId, String curriculumId, String majorCode) {
        jdbc.sql("UPDATE student_records SET curriculum_id = :curriculumId, major = :major WHERE student_id = :studentId")
                .param("curriculumId", curriculumId).param("major", majorCode).param("studentId", studentId)
                .update();
    }

    /**
     * Tăng phiên bản dữ liệu học vụ nếu chưa ai đổi kể từ khi đọc (optimistic lock).
     *
     * @return dataRevision mới, hoặc empty nếu version đã bị đổi bởi giao dịch khác
     */
    public Optional<String> bumpRevision(String studentId, int expectedVersion, Instant now) {
        String next = revision(studentId, expectedVersion + 1);
        int updated = jdbc.sql("""
                        UPDATE student_records SET version = :nextVersion, data_revision = :revision, updated_at = :now
                        WHERE student_id = :studentId AND version = :expectedVersion
                        """)
                .param("nextVersion", expectedVersion + 1).param("revision", next).param("now", ts(now))
                .param("studentId", studentId).param("expectedVersion", expectedVersion)
                .update();
        return updated == 1 ? Optional.of(next) : Optional.empty();
    }

    public void markTranscriptConfirmed(String studentId, TranscriptSourceType sourceType, String importSessionId, Instant confirmedAt) {
        jdbc.sql("""
                        UPDATE student_records SET transcript_status = 'CONFIRMED', transcript_source_type = :sourceType,
                               transcript_import_session_id = :sessionId, transcript_confirmed_at = :confirmedAt
                        WHERE student_id = :studentId
                        """)
                .param("sourceType", sourceType.name()).param("sessionId", importSessionId)
                .param("confirmedAt", ts(confirmedAt)).param("studentId", studentId)
                .update();
    }

    public void touchLogin(String username, Instant now) {
        jdbc.sql("UPDATE users SET last_login_at = :now WHERE username = :username")
                .param("now", ts(now)).param("username", username)
                .update();
    }

    static OffsetDateTime ts(Instant instant) {
        return instant == null ? null : OffsetDateTime.ofInstant(instant, ZoneOffset.UTC);
    }

    static Instant instant(ResultSet rs, String column) throws SQLException {
        OffsetDateTime value = rs.getObject(column, OffsetDateTime.class);
        return value == null ? null : value.toInstant();
    }

    private static StudentRow mapStudent(ResultSet rs, int rowNum) throws SQLException {
        String sourceType = rs.getString("transcript_source_type");
        return new StudentRow(
                rs.getString("student_id"), rs.getString("user_id"), rs.getString("full_name"), rs.getString("email"),
                rs.getString("class_name"), rs.getString("cohort"), rs.getString("curriculum_id"), rs.getString("major"),
                rs.getInt("version"), rs.getString("data_revision"), TranscriptStatus.valueOf(rs.getString("transcript_status")),
                sourceType == null ? null : TranscriptSourceType.valueOf(sourceType), rs.getString("transcript_import_session_id"),
                instant(rs, "transcript_confirmed_at"), instant(rs, "created_at"), instant(rs, "updated_at"));
    }
}
