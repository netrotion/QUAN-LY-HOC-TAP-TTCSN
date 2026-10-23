package vn.haui.advisor.platform.academic;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.academic.model.StudentProfileFixture;
import vn.haui.advisor.contracts.dto.AcademicRiskLevel;
import vn.haui.advisor.contracts.dto.AcademicStatusResponse;
import vn.haui.advisor.contracts.dto.StudentAcademicRecord;
import vn.haui.advisor.contracts.dto.TranscriptAttemptItem;
import vn.haui.advisor.contracts.dto.TranscriptStatus;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Hồ sơ đầu vào planner tool dựng từ hồ sơ DB")
class RecordBackedAcademicFacadeTest {

    @Test
    @DisplayName("Giữ nguyên lần học; CPA/tín chỉ/mức cảnh báo lấy từ trạng thái engine; đạt/không để engine tự xác định")
    void profileFromRecord() {
        StudentAcademicRecord record = record(
                attempt("LP6010", "2024_1", "3", "8.5", "A"),
                attempt("DC6006", "2024_1", "1.5", "4.0", "F"),
                attempt("DC6006", "2024_SUMMER", "1.5", "6.0", "C"),
                attempt("BS6001", "2024_2", "3", null, null));
        AcademicStatusResponse status = new AcademicStatusResponse("sv-profile", null, new BigDecimal("2.85"), 5, 135,
                AcademicRiskLevel.NORMAL, List.of(), "REV-sv-profile-002");

        StudentProfileFixture profile = RecordBackedAcademicFacade.planningProfile(record, status);

        assertThat(profile.getStudentId()).isEqualTo("sv-profile");
        assertThat(profile.getDataRevision()).isEqualTo("REV-sv-profile-002");
        assertThat(profile.getCpa()).isEqualByComparingTo("2.85");
        assertThat(profile.getAccumulatedCredits()).isEqualTo(5);
        assertThat(profile.getRiskLevel()).isEqualTo(AcademicRiskLevel.NORMAL);
        assertThat(profile.getCurrentSemester()).as("học kỳ chính 2024_1, 2024_2; kỳ hè không tính").isEqualTo(2);
        assertThat(profile.getMajorCode()).as("không để engine đổi sang CTĐT đóng gói sẵn").isNull();
        assertThat(profile.getCourseAttempts()).hasSize(4);
        StudentProfileFixture.CourseAttempt failed = profile.getCourseAttempts().get(1);
        assertThat(failed.getCourseCode()).isEqualTo("DC6006");
        assertThat(failed.getCreditsRaw()).isEqualTo(1.5);
        assertThat(failed.getLetterGrade()).isEqualTo("F");
        assertThat(failed.getScore10()).isEqualTo(4.0);
        assertThat(failed.getPassed()).isNull();
        assertThat(failed.getGradePoint4()).isNull();
        assertThat(profile.getCourseAttempts().get(3).getLetterGrade()).isNull();
    }

    @Test
    @DisplayName("Chưa có bảng điểm: không lần học, học kỳ hiện tại để trống (engine dùng mặc định của nó)")
    void emptyRecord() {
        StudentAcademicRecord record = record();
        record.setTranscriptStatus(TranscriptStatus.NONE);
        AcademicStatusResponse status = new AcademicStatusResponse("sv-profile", null, null, 0, 135,
                AcademicRiskLevel.NORMAL, List.of(), "REV-sv-profile-002");

        StudentProfileFixture profile = RecordBackedAcademicFacade.planningProfile(record, status);

        assertThat(profile.getCourseAttempts()).isEmpty();
        assertThat(profile.getCpa()).isNull();
        assertThat(profile.getCurrentSemester()).isNull();
    }

    private static StudentAcademicRecord record(TranscriptAttemptItem... attempts) {
        StudentAcademicRecord record = new StudentAcademicRecord();
        record.setStudentId("sv-profile");
        record.setDataRevision("REV-sv-profile-002");
        record.setCurriculumId("curriculum-ktpm-haui-2024");
        record.setTranscriptStatus(TranscriptStatus.CONFIRMED);
        record.setAttempts(List.of(attempts));
        return record;
    }

    private static TranscriptAttemptItem attempt(String code, String semester, String credits, String score10, String letter) {
        TranscriptAttemptItem attempt = new TranscriptAttemptItem();
        attempt.setCourseCode(code);
        attempt.setCourseName("Học phần " + code);
        attempt.setCredits(new BigDecimal(credits));
        attempt.setSemesterCode(semester);
        attempt.setScore10(score10 == null ? null : new BigDecimal(score10));
        attempt.setLetterGrade(letter);
        return attempt;
    }
}
