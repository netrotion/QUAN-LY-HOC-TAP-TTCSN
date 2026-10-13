package vn.haui.advisor.platform.transcript.importing;

import vn.haui.advisor.contracts.dto.TranscriptDocumentSummary;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Đọc dòng điểm từ chữ của bảng điểm (PDF có lớp chữ hoặc kết quả OCR).
 *
 * Dòng học phần: [STT] MÃ_HP Tên học phần TC Điểm10 ĐiểmChữ [cột khác...]. Cột sau điểm chữ (điểm hệ 4, ghi chú)
 * bị bỏ qua: điểm hệ 4 và GPA/CPA không bao giờ lấy từ tài liệu. Dòng có mã học phần nhưng không đọc đủ được giữ lại
 * nguyên văn (unreadable) để sinh viên sửa, không đoán. Học kỳ lấy từ tiêu đề "Học kỳ 1 năm học 2024-2025" gần nhất.
 */
public class TranscriptTextParser {

    public static final Set<String> LETTER_GRADES = Set.of("A", "B+", "B", "C+", "C", "D+", "D", "F");

    /**
     * Mã học phần, chấp nhận cả mã đọc sai (chữ O/I/l/S/B lẫn vào phần số): với OCR thì sửa về số,
     * với PDF có lớp chữ thì giữ nguyên để dòng bị đánh dấu mã không có trong CTĐT và sinh viên sửa.
     */
    private static final Pattern CODE = Pattern.compile("(?<![A-Za-z0-9])([A-Z]{2,4})\\s?([0-9OoIlSB]{4})(?![A-Za-z0-9])");
    private static final Pattern INLINE_SEMESTER = Pattern.compile("\\b(20\\d{2})_(1|2|summer)\\b");
    private static final Pattern SEMESTER_HEADER = Pattern.compile(
            "(?:hoc ky|\\bhk)\\s*(1|2|3|iii|ii|i|he|phu)\\b.*?(20\\d{2})\\s*[-/]\\s*20\\d{2}");
    private static final Pattern STUDENT_ID = Pattern.compile("(?:ma sinh vien|ma sv|mssv)\\s*[:.]?\\s*([a-z0-9._-]{4,50})");
    private static final Pattern FULL_NAME = Pattern.compile("(?:ho va ten|ho ten)\\s*[:.]?\\s*(.+?)(?=\\s{2,}|\\s+(?:ma sinh vien|ma sv|mssv|ngay sinh|lop)\\b|$)");
    private static final Pattern CPA = Pattern.compile(
            "(?:\\bcpa\\b|diem (?:trung binh|tb|tbc)(?: chung)? tich luy|tbc tich luy)[^0-9]{0,25}(\\d{1,2}(?:[.,]\\d{1,3})?)");
    private static final Pattern ACCUMULATED_CREDITS = Pattern.compile(
            "(?:so tin chi tich luy|tong so tin chi tich luy|tin chi tich luy|tc tich luy)[^0-9]{0,15}(\\d{1,3}(?:[.,]\\d)?)");
    private static final Pattern NUMBER = Pattern.compile("^\\d{1,3}(?:[.,]\\d{1,2})?$");

    /** Một dòng học phần đọc được (chưa đối chiếu CTĐT). */
    public record ParsedRow(String sourceText, String courseCode, String documentCourseName, BigDecimal documentCredits,
                            String semesterCode, BigDecimal score10, String letterGrade, BigDecimal confidence,
                            boolean unreadable) {
    }

    public record ParsedTranscript(List<ParsedRow> rows, TranscriptDocumentSummary summary) {
    }

    /**
     * @param expectedCredits số tín chỉ theo CTĐT của một mã học phần (null nếu không biết); dùng để chọn cách
     *                        hiểu đúng khi dòng chưa có điểm và tên học phần kết thúc bằng số
     */
    public ParsedTranscript parse(List<TextLine> lines, boolean ocr, Function<String, BigDecimal> expectedCredits) {
        List<ParsedRow> rows = new ArrayList<>();
        TranscriptDocumentSummary summary = new TranscriptDocumentSummary();
        String currentSemester = null;

        for (TextLine line : lines) {
            String text = Normalizer.normalize(line.text() == null ? "" : line.text(), Normalizer.Form.NFC)
                    .replaceAll("[\\t\\u00A0]", " ").trim();
            if (text.isEmpty()) {
                continue;
            }
            String folded = fold(text);
            readSummary(text, folded, summary);

            Matcher inline = INLINE_SEMESTER.matcher(folded);
            String rowSemester = null;
            if (inline.find()) {
                rowSemester = inline.group(1) + "_" + inline.group(2).toUpperCase(Locale.ROOT);
            } else {
                Matcher header = SEMESTER_HEADER.matcher(folded);
                if (header.find()) {
                    currentSemester = header.group(2) + "_" + term(header.group(1));
                }
            }

            if (folded.contains("ma hoc phan") || folded.contains("ma hp")) {
                continue;
            }
            Matcher code = CODE.matcher(text);
            if (!code.find() || code.group(2).chars().noneMatch(Character::isDigit)) {
                continue;
            }
            String courseCode = code.group(1) + (ocr ? ocrDigits(code.group(2)) : code.group(2).toUpperCase(Locale.ROOT));
            String rest = text.substring(code.end()).replaceAll("\\b(20\\d{2})_(1|2|SUMMER|summer)\\b", " ").trim();
            String semester = rowSemester != null ? rowSemester : currentSemester;
            rows.add(parseRow(text, courseCode, rest, semester, line.confidence(), expectedCredits.apply(courseCode)));
        }
        return new ParsedTranscript(rows, summary);
    }

    private static ParsedRow parseRow(String sourceText, String courseCode, String rest, String semester,
                                      BigDecimal confidence, BigDecimal expectedCredits) {
        String[] tokens = rest.isEmpty() ? new String[0] : rest.split("\\s+");
        for (int k = tokens.length - 1; k >= 2; k--) {
            if (LETTER_GRADES.contains(tokens[k]) && isScore(tokens[k - 1]) && isCredits(tokens[k - 2])) {
                return new ParsedRow(sourceText, courseCode, name(tokens, k - 2), number(tokens[k - 2]), semester,
                        number(tokens[k - 1]), tokens[k], confidence, false);
            }
        }
        int n = tokens.length;
        // Chưa có điểm (đang học): "... Tên học phần TC"
        boolean endsWithCredits = n >= 2 && isCredits(tokens[n - 1]);
        if (endsWithCredits && (!isNumber(tokens[n - 2]) || matches(tokens[n - 1], expectedCredits))) {
            return new ParsedRow(sourceText, courseCode, name(tokens, n - 1), number(tokens[n - 1]), semester,
                    null, null, confidence, false);
        }
        // Có điểm hệ 10 nhưng thiếu điểm chữ: giữ để sinh viên bổ sung
        if (n >= 3 && isCredits(tokens[n - 2]) && isScore(tokens[n - 1])) {
            return new ParsedRow(sourceText, courseCode, name(tokens, n - 2), number(tokens[n - 2]), semester,
                    number(tokens[n - 1]), null, confidence, false);
        }
        return new ParsedRow(sourceText, courseCode, clean(rest), null, semester, null, null, confidence, true);
    }

    private static void readSummary(String text, String folded, TranscriptDocumentSummary summary) {
        Matcher id = STUDENT_ID.matcher(folded);
        if (summary.getStudentIdOnDocument() == null && id.find()) {
            summary.setStudentIdOnDocument(text.substring(id.start(1), id.end(1)));
        }
        Matcher name = FULL_NAME.matcher(folded);
        if (summary.getFullNameOnDocument() == null && name.find()) {
            String value = clean(text.substring(name.start(1), name.end(1)));
            summary.setFullNameOnDocument(value.isEmpty() ? null : value);
        }
        Matcher cpa = CPA.matcher(folded);
        if (summary.getReportedCpa() == null && cpa.find()) {
            BigDecimal value = number(cpa.group(1));
            if (value.compareTo(BigDecimal.valueOf(4)) <= 0) {
                summary.setReportedCpa(value);
            }
        }
        Matcher credits = ACCUMULATED_CREDITS.matcher(folded);
        if (summary.getReportedAccumulatedCredits() == null && credits.find()) {
            summary.setReportedAccumulatedCredits(number(credits.group(1)));
        }
    }

    /** Bỏ dấu, chữ thường, giữ nguyên độ dài chuỗi (NFC) để vị trí khớp với chuỗi gốc. */
    static String fold(String nfcText) {
        StringBuilder out = new StringBuilder(nfcText.length());
        for (int i = 0; i < nfcText.length(); i++) {
            char c = nfcText.charAt(i);
            if (c == 'đ' || c == 'Đ') {
                out.append('d');
                continue;
            }
            String decomposed = Normalizer.normalize(String.valueOf(c), Normalizer.Form.NFD);
            out.append(Character.toLowerCase(decomposed.charAt(0)));
        }
        return out.toString();
    }

    private static String term(String value) {
        return switch (value) {
            case "1", "i" -> "1";
            case "2", "ii" -> "2";
            default -> "SUMMER";
        };
    }

    private static String ocrDigits(String digits) {
        return digits.replace('O', '0').replace('o', '0').replace('I', '1').replace('l', '1')
                .replace('S', '5').replace('B', '8');
    }

    private static String name(String[] tokens, int endExclusive) {
        return clean(String.join(" ", Arrays.copyOfRange(tokens, 0, Math.max(0, endExclusive))));
    }

    private static String clean(String value) {
        return value.replaceAll("^[\\s|:;,.\\-]+|[\\s|:;,.\\-]+$", "").trim();
    }

    private static boolean isNumber(String token) {
        return NUMBER.matcher(token).matches();
    }

    private static boolean isCredits(String token) {
        if (!isNumber(token)) {
            return false;
        }
        BigDecimal value = number(token);
        return value.compareTo(BigDecimal.valueOf(0.5)) >= 0 && value.compareTo(BigDecimal.valueOf(20)) <= 0;
    }

    private static boolean isScore(String token) {
        return isNumber(token) && number(token).compareTo(BigDecimal.TEN) <= 0;
    }

    private static boolean matches(String token, BigDecimal expected) {
        return expected != null && isNumber(token) && number(token).compareTo(expected) == 0;
    }

    private static BigDecimal number(String token) {
        return new BigDecimal(token.replace(',', '.'));
    }
}
