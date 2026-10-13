package vn.haui.advisor.platform.transcript.importing;

import vn.haui.advisor.contracts.dto.ImportIssueCode;
import vn.haui.advisor.contracts.dto.ImportRowIssueItem;
import vn.haui.advisor.contracts.dto.TranscriptImportRowItem;
import vn.haui.advisor.platform.curriculum.CurriculumRepository.CourseInfo;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Đối chiếu dòng nhập với CTĐT và quy tắc định dạng; tên/tín chỉ chính thức lấy từ CTĐT.
 * Vấn đề chặn (blocking) phải được sửa hoặc bỏ chọn dòng trước khi xác nhận.
 */
public final class ImportRowValidator {

    private static final Pattern SEMESTER = Pattern.compile("^[0-9]{4}_(1|2|SUMMER)$");
    private static final BigDecimal LOW_CONFIDENCE = new BigDecimal("0.80");

    private ImportRowValidator() {
    }

    public static List<TranscriptImportRowItem> validate(List<ImportRowDraft> drafts, Map<String, CourseInfo> catalog) {
        List<TranscriptImportRowItem> rows = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (ImportRowDraft draft : drafts) {
            List<ImportRowIssueItem> issues = new ArrayList<>();
            CourseInfo course = draft.courseCode() == null ? null : catalog.get(draft.courseCode());

            if (draft.unreadable()) {
                issues.add(blocking(ImportIssueCode.UNREADABLE_ROW,
                        "Không đọc đủ thông tin dòng này. Nhập lại mã học phần, học kỳ, điểm hoặc bỏ chọn dòng."));
            }
            if (course == null) {
                issues.add(blocking(ImportIssueCode.UNKNOWN_COURSE_CODE, draft.courseCode() == null
                        ? "Thiếu mã học phần. Nhập mã học phần hoặc bỏ chọn dòng."
                        : "Mã " + draft.courseCode() + " không có trong CTĐT. Sửa mã học phần hoặc bỏ chọn dòng."));
            }
            if (draft.semesterCode() == null || !SEMESTER.matcher(draft.semesterCode()).matches()) {
                issues.add(blocking(ImportIssueCode.INVALID_SEMESTER,
                        "Thiếu hoặc sai học kỳ; dùng dạng <năm>_<1|2|SUMMER>, ví dụ 2024_1."));
            }
            gradeIssue(draft).ifPresent(issues::add);

            if (course != null && draft.included() && draft.semesterCode() != null
                    && !seen.add(draft.courseCode() + "|" + draft.semesterCode())) {
                issues.add(blocking(ImportIssueCode.DUPLICATE_ROW,
                        "Học phần " + draft.courseCode() + " đã có trong học kỳ " + draft.semesterCode() + "."));
            }
            if (course != null && draft.documentCourseName() != null
                    && !normalizeName(draft.documentCourseName()).equals(normalizeName(course.courseName()))) {
                issues.add(warning(ImportIssueCode.COURSE_NAME_DIFFERS, "Tên trên tài liệu \"" + draft.documentCourseName()
                        + "\" khác tên trong CTĐT \"" + course.courseName() + "\"; khi xác nhận sẽ dùng tên CTĐT."));
            }
            if (course != null && draft.documentCredits() != null && draft.documentCredits().compareTo(course.credits()) != 0) {
                issues.add(warning(ImportIssueCode.CREDITS_DIFFER, "Tài liệu ghi " + draft.documentCredits().stripTrailingZeros().toPlainString()
                        + " TC, CTĐT ghi " + course.credits().toPlainString() + " TC; khi xác nhận sẽ dùng số tín chỉ CTĐT."));
            }
            if (draft.ocr() && (draft.confidence() == null || draft.confidence().compareTo(LOW_CONFIDENCE) < 0)) {
                issues.add(warning(ImportIssueCode.LOW_CONFIDENCE, "OCR không chắc chắn ở dòng này; đối chiếu với bảng điểm gốc."));
            }

            TranscriptImportRowItem row = new TranscriptImportRowItem();
            row.setRowId(draft.rowId());
            row.setSourceText(draft.sourceText());
            row.setCourseCode(draft.courseCode());
            row.setCourseName(course == null ? null : course.courseName());
            row.setDocumentCourseName(draft.documentCourseName());
            row.setCredits(course == null ? null : course.credits());
            row.setSemesterCode(draft.semesterCode());
            row.setScore10(draft.score10());
            row.setLetterGrade(draft.letterGrade());
            row.setIncluded(draft.included());
            row.setConfidence(draft.confidence());
            row.setIssues(issues);
            rows.add(row);
        }
        return rows;
    }

    public static int blockingCount(List<TranscriptImportRowItem> rows) {
        return (int) rows.stream()
                .filter(r -> Boolean.TRUE.equals(r.getIncluded()))
                .flatMap(r -> r.getIssues().stream())
                .filter(ImportRowIssueItem::isBlocking)
                .count();
    }

    private static Optional<ImportRowIssueItem> gradeIssue(ImportRowDraft draft) {
        BigDecimal score = draft.score10();
        String letter = draft.letterGrade();
        if (score == null && letter == null) {
            return Optional.of(warning(ImportIssueCode.MISSING_GRADE, "Chưa có điểm; học phần được ghi nhận là đang học."));
        }
        if (letter == null || !TranscriptTextParser.LETTER_GRADES.contains(letter)) {
            return Optional.of(blocking(ImportIssueCode.INVALID_SCORE, "Điểm chữ phải là A, B+, B, C+, C, D+, D hoặc F."));
        }
        if (score != null && (score.signum() < 0 || score.compareTo(BigDecimal.TEN) > 0 || score.scale() > 2)) {
            return Optional.of(blocking(ImportIssueCode.INVALID_SCORE, "Điểm hệ 10 phải từ 0 đến 10, tối đa 2 chữ số thập phân."));
        }
        return Optional.empty();
    }

    /** So tên không phân biệt dấu, hoa thường, khoảng trắng và dấu câu. */
    static String normalizeName(String name) {
        return TranscriptTextParser.fold(Normalizer.normalize(name, Normalizer.Form.NFC))
                .replaceAll("[^a-z0-9]", "");
    }

    private static ImportRowIssueItem blocking(ImportIssueCode code, String message) {
        return new ImportRowIssueItem(code, true, message);
    }

    private static ImportRowIssueItem warning(ImportIssueCode code, String message) {
        return new ImportRowIssueItem(code, false, message);
    }
}
