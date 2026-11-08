package vn.haui.advisor.ai.tools;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.contracts.dto.*;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class StudentJourneySummarizerTest {

    @Test
    @DisplayName("summarizeTranscript correctly categorizes A grades and calculates total courses")
    void shouldSummarizeTranscriptWithGradeA() {
        TranscriptResponse transcript = new TranscriptResponse();
        transcript.setStudentId("SV001");

        TranscriptAttemptItem a1 = new TranscriptAttemptItem();
        a1.setCourseCode("IT6011");
        a1.setCourseName("Nhập môn lập trình");
        a1.setCredits(new BigDecimal("3.0"));
        a1.setScore10(new BigDecimal("9.0"));
        a1.setLetterGrade("A");
        a1.setSemesterCode("2024_1");

        TranscriptAttemptItem b1 = new TranscriptAttemptItem();
        b1.setCourseCode("IT6015");
        b1.setCourseName("Cấu trúc dữ liệu");
        b1.setCredits(new BigDecimal("3.0"));
        b1.setScore10(new BigDecimal("7.5"));
        b1.setLetterGrade("B");
        b1.setSemesterCode("2024_2");

        transcript.setAttempts(List.of(a1, b1));

        String summary = StudentJourneySummarizer.summarizeTranscript(transcript, "ALL");

        assertThat(summary).contains("Tổng số học phần đã học: 2");
        assertThat(summary).contains("Học phần đạt điểm A/A+ (Xuất sắc):");
        assertThat(summary).contains("IT6011");
        assertThat(summary).contains("Nhập môn lập trình");
        assertThat(summary).contains("Học phần đạt điểm B/B+ (Khá/Giỏi):");
        assertThat(summary).contains("IT6015");
    }

    @Test
    @DisplayName("summarizeTranscript handles empty or null gracefully")
    void shouldHandleEmptyTranscriptGracefully() {
        String summary = StudentJourneySummarizer.summarizeTranscript(null, null);
        assertThat(summary).contains("Hệ thống chưa ghi nhận dữ liệu bảng điểm đã xác nhận");

        TranscriptResponse empty = new TranscriptResponse();
        empty.setAttempts(List.of());
        assertThat(StudentJourneySummarizer.summarizeTranscript(empty, "ALL"))
                .contains("Hệ thống chưa ghi nhận dữ liệu bảng điểm đã xác nhận");
    }

    @Test
    @DisplayName("summarizeCurriculumTree separates eligible courses from blocked ones")
    void shouldSummarizeCurriculumTreeDistinguishingEligibleFromBlocked() {
        CurriculumTreeResponse tree = new CurriculumTreeResponse();
        tree.setStudentId("SV001");
        tree.setCurriculumName("Kỹ thuật phần mềm 2024");
        tree.setMajorCode("KTPM");
        tree.setTotalCreditsRequired(150);

        CurriculumTreeCourseItem passed = new CurriculumTreeCourseItem();
        passed.setCourseCode("IT6011");
        passed.setCourseName("Nhập môn lập trình");
        passed.setCredits(new BigDecimal("3.0"));
        passed.setStatus(CourseProgressStatus.PASSED);
        passed.setLetterGrade("A");

        CurriculumTreeCourseItem eligible = new CurriculumTreeCourseItem();
        eligible.setCourseCode("IT6080");
        eligible.setCourseName("Kiến trúc phần mềm");
        eligible.setCredits(new BigDecimal("3.0"));
        eligible.setStatus(CourseProgressStatus.ELIGIBLE);
        eligible.setEligible(true);
        eligible.setSuggestedSemester(5);

        CurriculumTreeCourseItem blocked = new CurriculumTreeCourseItem();
        blocked.setCourseCode("IT6090");
        blocked.setCourseName("Đồ án chuyên ngành");
        blocked.setCredits(new BigDecimal("3.0"));
        blocked.setStatus(CourseProgressStatus.BLOCKED);
        blocked.setEligible(false);
        blocked.setMissingPrerequisites(List.of("IT6080"));
        blocked.setSuggestedSemester(6);

        tree.setCourses(List.of(passed, eligible, blocked));

        String summary = StudentJourneySummarizer.summarizeCurriculumTree(tree, "ELIGIBLE_NEXT_SEMESTER");

        assertThat(summary).contains("HỌC PHẦN ĐỦ ĐIỀU KIỆN ĐĂNG KÝ HỌC KỲ TỚI (Eligible):");
        assertThat(summary).contains("IT6080");
        assertThat(summary).contains("Kiến trúc phần mềm");
        assertThat(summary).contains("HỌC PHẦN CHƯA ĐỦ ĐIỀU KIỆN (Thiếu môn tiên quyết):");
        assertThat(summary).contains("IT6090");
        assertThat(summary).contains("Thiếu tiên quyết: IT6080");
    }
}
