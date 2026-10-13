package vn.haui.advisor.platform.transcript.importing;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Parser bảng điểm: dòng học phần, học kỳ, thông tin in trên tài liệu")
class TranscriptTextParserTest {

    private final TranscriptTextParser parser = new TranscriptTextParser();
    private static final Map<String, BigDecimal> CREDITS = Map.of(
            "IT6015", new BigDecimal("3"), "FL6085", new BigDecimal("5"), "DC6006", new BigDecimal("1.5"));

    private TranscriptTextParser.ParsedTranscript parse(boolean ocr, String... lines) {
        return parser.parse(java.util.Arrays.stream(lines).map(TextLine::of).toList(), ocr, CREDITS::get);
    }

    @Test
    @DisplayName("Đọc mã, tên, tín chỉ, điểm hệ 10, điểm chữ; bỏ qua cột điểm hệ 4 phía sau")
    void readsCourseRowsAndIgnoresGradePoint4() {
        var result = parse(false,
                "Học kỳ 1 năm học 2024-2025",
                "STT Mã HP Tên học phần TC Điểm 10 Điểm chữ Điểm 4",
                "1 IT6015 Kỹ thuật lập trình 3 9,3 A 4.0",
                "2 DC6006 Quân sự chung 1,5 8.7 A 4.0");

        assertThat(result.rows()).hasSize(2);
        TranscriptTextParser.ParsedRow first = result.rows().get(0);
        assertThat(first.courseCode()).isEqualTo("IT6015");
        assertThat(first.documentCourseName()).isEqualTo("Kỹ thuật lập trình");
        assertThat(first.documentCredits()).isEqualByComparingTo("3");
        assertThat(first.score10()).isEqualByComparingTo("9.3");
        assertThat(first.letterGrade()).isEqualTo("A");
        assertThat(first.semesterCode()).isEqualTo("2024_1");
        assertThat(result.rows().get(1).documentCredits()).isEqualByComparingTo("1.5");
    }

    @Test
    @DisplayName("Học kỳ hè và mã học kỳ ghi trực tiếp trên dòng")
    void readsSummerAndInlineSemesters() {
        var result = parse(false,
                "HK hè năm học 2024 - 2025",
                "IT6015 Kỹ thuật lập trình 3 7.0 B",
                "2025_2 FL6085 Tiếng Anh Công nghệ thông tin cơ bản 1 5 8.0 B+");

        assertThat(result.rows().get(0).semesterCode()).isEqualTo("2024_SUMMER");
        assertThat(result.rows().get(1).semesterCode()).isEqualTo("2025_2");
        assertThat(result.rows().get(1).documentCourseName()).isEqualTo("Tiếng Anh Công nghệ thông tin cơ bản 1");
    }

    @Test
    @DisplayName("Dòng chưa có điểm (đang học), kể cả khi tên kết thúc bằng số, dùng tín chỉ CTĐT để phân định")
    void readsInProgressRows() {
        var result = parse(false,
                "Học kỳ 1 năm học 2026-2027",
                "IT6015 Kỹ thuật lập trình 3",
                "FL6085 Tiếng Anh Công nghệ thông tin cơ bản 1 5");

        assertThat(result.rows()).allSatisfy(row -> {
            assertThat(row.score10()).isNull();
            assertThat(row.letterGrade()).isNull();
            assertThat(row.unreadable()).isFalse();
        });
        assertThat(result.rows().get(1).documentCredits()).isEqualByComparingTo("5");
        assertThat(result.rows().get(1).documentCourseName()).endsWith("cơ bản 1");
    }

    @Test
    @DisplayName("Dòng có mã nhưng không đọc đủ được giữ nguyên văn để sửa; mã đọc sai được giữ để đánh dấu")
    void keepsUnreadableAndMisreadRows() {
        var result = parse(false,
                "Học kỳ 2 năm học 2024-2025",
                "IT6015 Kỹ thuật lập trình (ghi chú: miễn)",
                "IT6O35 Toán rời rạc 3 6.6 C+");

        assertThat(result.rows().get(0).unreadable()).isTrue();
        assertThat(result.rows().get(0).documentCourseName()).contains("Kỹ thuật lập trình");
        assertThat(result.rows().get(1).courseCode()).isEqualTo("IT6O35");
        assertThat(result.rows().get(1).unreadable()).isFalse();
    }

    @Test
    @DisplayName("OCR: sửa chữ lẫn vào phần số của mã học phần, giữ độ tin cậy dòng")
    void normalisesOcrDigits() {
        var result = parser.parse(List.of(
                new TextLine("Học kỳ 1 năm học 2024-2025", new BigDecimal("0.95")),
                new TextLine("IT6O1S Kỹ thuật lập trình 3 9.3 A", new BigDecimal("0.71"))), true, CREDITS::get);

        assertThat(result.rows().get(0).courseCode()).isEqualTo("IT6015");
        assertThat(result.rows().get(0).confidence()).isEqualByComparingTo("0.71");
    }

    @Test
    @DisplayName("Thông tin in trên tài liệu: MSSV, họ tên, CPA, tín chỉ tích lũy (chỉ để đối chiếu)")
    void readsDocumentSummary() {
        var result = parse(false,
                "Họ và tên: Lê Việt Hùng   Mã sinh viên: 2024604757",
                "Điểm trung bình chung tích lũy (CPA): 3,18",
                "Số tín chỉ tích lũy: 61");

        assertThat(result.summary().getStudentIdOnDocument()).isEqualTo("2024604757");
        assertThat(result.summary().getFullNameOnDocument()).isEqualTo("Lê Việt Hùng");
        assertThat(result.summary().getReportedCpa()).isEqualByComparingTo("3.18");
        assertThat(result.summary().getReportedAccumulatedCredits()).isEqualByComparingTo("61");
        assertThat(result.rows()).isEmpty();
    }
}
