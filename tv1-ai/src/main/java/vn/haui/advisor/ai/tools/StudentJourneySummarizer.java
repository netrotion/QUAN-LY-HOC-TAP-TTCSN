package vn.haui.advisor.ai.tools;

import vn.haui.advisor.contracts.dto.*;

import java.math.BigDecimal;
import java.util.*;

/**
 * Bộ tóm tắt dữ liệu thông minh cho hành trình học tập (Student Journey):
 * - Bảng điểm (Transcript): phân loại theo nhóm điểm A, B, C, F, tính tổng tín chỉ và học phần.
 * - Cây CTĐT (Curriculum Tree): phân loại học phần đủ điều kiện đăng ký, học phần bị chặn và nút thắt tiên quyết.
 */
public final class StudentJourneySummarizer {

    private StudentJourneySummarizer() {
    }

    public static String summarizeTranscript(TranscriptResponse transcript, String filter) {
        if (transcript == null || transcript.getAttempts() == null || transcript.getAttempts().isEmpty()) {
            return "Hệ thống chưa ghi nhận dữ liệu bảng điểm đã xác nhận của sinh viên.";
        }

        List<TranscriptAttemptItem> attempts = transcript.getAttempts();
        int totalCourses = attempts.size();
        BigDecimal totalCredits = BigDecimal.ZERO;
        for (TranscriptAttemptItem a : attempts) {
            if (a.getCredits() != null) {
                totalCredits = totalCredits.add(a.getCredits());
            }
        }

        List<TranscriptAttemptItem> gradeA = new ArrayList<>();
        List<TranscriptAttemptItem> gradeB = new ArrayList<>();
        List<TranscriptAttemptItem> gradeCD = new ArrayList<>();
        List<TranscriptAttemptItem> gradeF = new ArrayList<>();

        for (TranscriptAttemptItem a : attempts) {
            String letter = a.getLetterGrade() != null ? a.getLetterGrade().trim().toUpperCase(Locale.ROOT) : "";
            if (letter.startsWith("A")) {
                gradeA.add(a);
            } else if (letter.startsWith("B")) {
                gradeB.add(a);
            } else if (letter.startsWith("C") || letter.startsWith("D")) {
                gradeCD.add(a);
            } else if (letter.startsWith("F")) {
                gradeF.add(a);
            }
        }

        StringBuilder sb = new StringBuilder();
        sb.append("<transcript_summary>\n");
        sb.append(String.format("- Tổng số học phần đã học: %d (%s tín chỉ)\n", totalCourses, totalCredits.toPlainString()));

        if (!gradeA.isEmpty()) {
            sb.append("- Học phần đạt điểm A/A+ (Xuất sắc): ").append(gradeA.size()).append(" môn\n");
            for (TranscriptAttemptItem a : gradeA) {
                sb.append(String.format("  + %s: %s (%s tín chỉ, Điểm %s, Học kỳ %s)\n",
                        a.getCourseCode(),
                        a.getCourseName() != null ? a.getCourseName() : "Học phần " + a.getCourseCode(),
                        a.getCredits() != null ? a.getCredits().toPlainString() : "3",
                        a.getLetterGrade(),
                        a.getSemesterCode() != null ? a.getSemesterCode() : "N/A"));
            }
        } else {
            sb.append("- Học phần đạt điểm A/A+: 0 môn\n");
        }

        if (!gradeB.isEmpty()) {
            sb.append("- Học phần đạt điểm B/B+ (Khá/Giỏi): ").append(gradeB.size()).append(" môn\n");
            for (TranscriptAttemptItem a : gradeB) {
                sb.append(String.format("  + %s: %s (%s tín chỉ, Điểm %s)\n",
                        a.getCourseCode(),
                        a.getCourseName() != null ? a.getCourseName() : "Học phần " + a.getCourseCode(),
                        a.getCredits() != null ? a.getCredits().toPlainString() : "3",
                        a.getLetterGrade()));
            }
        }

        if (!gradeCD.isEmpty()) {
            sb.append("- Học phần đạt điểm C/C+/D/D+ (Trung bình): ").append(gradeCD.size()).append(" môn\n");
            for (TranscriptAttemptItem a : gradeCD) {
                sb.append(String.format("  + %s (%s, Điểm %s)\n", a.getCourseCode(),
                        a.getCourseName() != null ? a.getCourseName() : "", a.getLetterGrade()));
            }
        }

        if (!gradeF.isEmpty()) {
            sb.append("- Học phần chưa đạt (Điểm F - Cần học lại): ").append(gradeF.size()).append(" môn\n");
            for (TranscriptAttemptItem a : gradeF) {
                sb.append(String.format("  + %s (%s)\n", a.getCourseCode(),
                        a.getCourseName() != null ? a.getCourseName() : ""));
            }
        }

        sb.append("</transcript_summary>");
        return sb.toString();
    }

    public static String summarizeCurriculumTree(CurriculumTreeResponse tree, String scope) {
        if (tree == null || tree.getCourses() == null || tree.getCourses().isEmpty()) {
            return "Hệ thống chưa có dữ liệu cây chương trình đào tạo của sinh viên.";
        }

        List<CurriculumTreeCourseItem> courses = tree.getCourses();
        List<CurriculumTreeCourseItem> passedCourses = new ArrayList<>();
        List<CurriculumTreeCourseItem> eligibleCourses = new ArrayList<>();
        List<CurriculumTreeCourseItem> blockedCourses = new ArrayList<>();

        for (CurriculumTreeCourseItem c : courses) {
            if (c.getStatus() == CourseProgressStatus.PASSED) {
                passedCourses.add(c);
            } else if (c.isEligible() || c.getStatus() == CourseProgressStatus.ELIGIBLE) {
                eligibleCourses.add(c);
            } else {
                blockedCourses.add(c);
            }
        }

        StringBuilder sb = new StringBuilder();
        sb.append("<curriculum_tree_summary>\n");
        sb.append(String.format("- Chương trình đào tạo: %s (Mã ngành: %s, Tổng số tín chỉ yêu cầu: %d)\n",
                tree.getCurriculumName() != null ? tree.getCurriculumName() : "CTĐT HaUI",
                tree.getMajorCode() != null ? tree.getMajorCode() : "N/A",
                tree.getTotalCreditsRequired() != null ? tree.getTotalCreditsRequired() : 150));
        sb.append(String.format("- Tiến độ: Đã đạt %d môn. Còn lại chưa học/chưa đạt: %d môn.\n\n",
                passedCourses.size(), eligibleCourses.size() + blockedCourses.size()));

        sb.append("HỌC PHẦN ĐỦ ĐIỀU KIỆN ĐĂNG KÝ HỌC KỲ TỚI (Eligible):\n");
        if (eligibleCourses.isEmpty()) {
            sb.append("  (Hiện chưa có môn nào đủ điều kiện đăng ký ngay)\n");
        } else {
            for (CurriculumTreeCourseItem c : eligibleCourses) {
                sb.append(String.format("  + %s: %s (%s tín chỉ%s)\n",
                        c.getCourseCode(),
                        c.getCourseName() != null ? c.getCourseName() : "",
                        c.getCredits() != null ? c.getCredits().toPlainString() : "3",
                        c.getSuggestedSemester() != null ? ", Học kỳ gợi ý: " + c.getSuggestedSemester() : ""));
            }
        }

        sb.append("\nHỌC PHẦN CHƯA ĐỦ ĐIỀU KIỆN (Thiếu môn tiên quyết):\n");
        if (blockedCourses.isEmpty()) {
            sb.append("  (Không có môn nào bị chặn tiên quyết)\n");
        } else {
            for (CurriculumTreeCourseItem c : blockedCourses) {
                String missing = (c.getMissingPrerequisites() != null && !c.getMissingPrerequisites().isEmpty())
                        ? String.join(", ", c.getMissingPrerequisites())
                        : "Chưa đạt điều kiện môn tiên quyết/học trước";
                sb.append(String.format("  + %s: %s (Thiếu tiên quyết: %s)\n",
                        c.getCourseCode(),
                        c.getCourseName() != null ? c.getCourseName() : "",
                        missing));
            }
        }

        sb.append("</curriculum_tree_summary>");
        return sb.toString();
    }
}
