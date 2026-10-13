package vn.haui.advisor.platform.transcript;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import vn.haui.advisor.contracts.dto.TranscriptAttemptItem;
import vn.haui.advisor.contracts.dto.TranscriptSourceType;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Bảng điểm đã xác nhận (enrollment_attempts). Chỉ lưu dữ liệu gốc: điểm hệ 10 và điểm chữ.
 * Không ghi score_4 / đạt-không đạt: các giá trị đó do AcademicFacade suy ra theo policy.
 */
@Repository
public class TranscriptRepository {

    private final JdbcClient jdbc;

    public TranscriptRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Một dòng sẽ ghi vào bảng điểm chính thức. */
    public record AttemptToStore(String courseCode, String semesterCode, BigDecimal score10, String letterGrade) {
    }

    public List<TranscriptAttemptItem> listAttempts(String studentId) {
        return jdbc.sql("""
                        SELECT a.course_id, c.course_name, c.credits, a.semester_code, a.attempt_number, a.score_10, a.letter_grade
                        FROM enrollment_attempts a JOIN courses c ON c.course_id = a.course_id
                        WHERE a.student_id = :studentId
                        ORDER BY a.semester_code, a.course_id, a.attempt_number
                        """)
                .param("studentId", studentId)
                .query((rs, i) -> {
                    TranscriptAttemptItem item = new TranscriptAttemptItem();
                    item.setCourseCode(rs.getString("course_id"));
                    item.setCourseName(rs.getString("course_name"));
                    item.setCredits(rs.getBigDecimal("credits").stripTrailingZeros());
                    item.setSemesterCode(rs.getString("semester_code"));
                    item.setAttemptNumber(rs.getInt("attempt_number"));
                    BigDecimal score = rs.getBigDecimal("score_10");
                    item.setScore10(score == null ? null : score.stripTrailingZeros());
                    item.setLetterGrade(rs.getString("letter_grade"));
                    return item;
                })
                .list();
    }

    /**
     * Thay toàn bộ bảng điểm của sinh viên (bảng điểm tải lên là bản đầy đủ). Gọi trong giao dịch của xác nhận.
     * Lần học được đánh số theo học kỳ: cùng học phần học lại thì attempt_number tăng.
     */
    public void replaceAll(String studentId, List<AttemptToStore> attempts, TranscriptSourceType source,
                           String importSessionId, Instant now) {
        jdbc.sql("DELETE FROM enrollment_attempts WHERE student_id = :studentId").param("studentId", studentId).update();

        Map<String, Integer> attemptsByCourse = new HashMap<>();
        List<AttemptToStore> ordered = attempts.stream()
                .sorted(Comparator.comparing(AttemptToStore::semesterCode).thenComparing(AttemptToStore::courseCode))
                .toList();
        for (AttemptToStore attempt : ordered) {
            int number = attemptsByCourse.merge(attempt.courseCode(), 1, Integer::sum);
            boolean graded = attempt.letterGrade() != null;
            jdbc.sql("""
                            INSERT INTO enrollment_attempts (attempt_id, student_id, course_id, semester_code, attempt_number, score_10,
                                                             letter_grade, score_4, status, is_retake, source, import_session_id,
                                                             created_at, updated_at)
                            VALUES (:id, :studentId, :courseId, :semester, :number, :score10, :letter, NULL, :status, :retake,
                                    :source, :sessionId, :now, :now)
                            """)
                    .param("id", "att-" + UUID.randomUUID())
                    .param("studentId", studentId)
                    .param("courseId", attempt.courseCode())
                    .param("semester", attempt.semesterCode())
                    .param("number", number)
                    .param("score10", attempt.score10())
                    .param("letter", attempt.letterGrade())
                    .param("status", graded ? "RECORDED" : "IN_PROGRESS")
                    .param("retake", number > 1)
                    .param("source", source.name())
                    .param("sessionId", importSessionId)
                    .param("now", OffsetDateTime.ofInstant(now, ZoneOffset.UTC))
                    .update();
        }
    }
}
