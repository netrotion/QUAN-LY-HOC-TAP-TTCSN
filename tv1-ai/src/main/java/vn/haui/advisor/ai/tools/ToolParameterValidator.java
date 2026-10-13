package vn.haui.advisor.ai.tools;

import java.math.BigDecimal;
import java.util.regex.Pattern;

/**
 * Tiện ích thẩm định tham số đầu vào cho ToolAdapter trước khi gửi tới AcademicFacade.
 */
public final class ToolParameterValidator {

    private static final BigDecimal MIN_CPA = new BigDecimal("0.00");
    private static final BigDecimal MAX_CPA = new BigDecimal("4.00");

    private static final int MIN_CREDITS_PER_SEMESTER = 10;
    private static final int MAX_CREDITS_PER_SEMESTER = 30;

    private static final int MIN_SUGGESTIONS = 1;
    private static final int MAX_SUGGESTIONS = 20;

    private static final Pattern COURSE_CODE_PATTERN = Pattern.compile("^[A-Z0-9]{4,10}$");

    private static final Pattern SEMESTER_SHORT_PATTERN = Pattern.compile("^20\\d{2}_[12S]$");
    private static final Pattern SEMESTER_LONG_PATTERN = Pattern.compile("^20\\d{2}_\\d{4}_HK[12S]$");
    private static final Pattern SEMESTER_DESCRIPTIVE_PATTERN = Pattern.compile(
            "^(?i)(h[oọ]c\\s*k[yỳ]|k[yỳ]|hk|semester|next_semester|current_semester)(\\s*[\\p{L}\\p{N}_\\-\\(\\)]*)$"
    );

    private ToolParameterValidator() {
        // utility class
    }

    /**
     * Thẩm định targetCpa nằm trong khoảng [0.00, 4.00].
     *
     * @param targetCpa điểm CPA mục tiêu cần kiểm tra
     * @throws IllegalArgumentException nếu null hoặc ngoài khoảng [0.00, 4.00]
     */
    public static void validateTargetCpa(BigDecimal targetCpa) {
        if (targetCpa == null) {
            throw new IllegalArgumentException("targetCpa must not be null");
        }
        if (targetCpa.compareTo(MIN_CPA) < 0 || targetCpa.compareTo(MAX_CPA) > 0) {
            throw new IllegalArgumentException(
                    "targetCpa must be between 0.00 and 4.00, got: " + targetCpa);
        }
    }

    /**
     * Thẩm định targetCpa nếu có giá trị (cho phép null).
     */
    public static void validateOptionalTargetCpa(BigDecimal targetCpa) {
        if (targetCpa != null) {
            validateTargetCpa(targetCpa);
        }
    }

    /**
     * Thẩm định số tín chỉ tối đa mỗi kỳ trong khoảng [10, 30].
     *
     * @param maxCredits số tín chỉ tối đa
     * @throws IllegalArgumentException nếu null hoặc ngoài khoảng [10, 30]
     */
    public static void validateMaxCreditsPerSemester(Integer maxCredits) {
        if (maxCredits == null) {
            throw new IllegalArgumentException("maxCreditsPerSemester must not be null");
        }
        if (maxCredits < MIN_CREDITS_PER_SEMESTER || maxCredits > MAX_CREDITS_PER_SEMESTER) {
            throw new IllegalArgumentException(
                    "maxCreditsPerSemester must be between " + MIN_CREDITS_PER_SEMESTER
                            + " and " + MAX_CREDITS_PER_SEMESTER + ", got: " + maxCredits);
        }
    }

    /**
     * Thẩm định số tín chỉ tối đa mỗi kỳ nếu có giá trị (cho phép null).
     */
    public static void validateOptionalMaxCreditsPerSemester(Integer maxCredits) {
        if (maxCredits != null) {
            validateMaxCreditsPerSemester(maxCredits);
        }
    }

    /**
     * Thẩm định số lượng gợi ý môn học lại trong khoảng [1, 20].
     *
     * @param maxSuggestions số lượng gợi ý
     * @throws IllegalArgumentException nếu null hoặc ngoài khoảng [1, 20]
     */
    public static void validateMaxSuggestions(Integer maxSuggestions) {
        if (maxSuggestions == null) {
            throw new IllegalArgumentException("maxSuggestions must not be null");
        }
        if (maxSuggestions < MIN_SUGGESTIONS || maxSuggestions > MAX_SUGGESTIONS) {
            throw new IllegalArgumentException(
                    "maxSuggestions must be between " + MIN_SUGGESTIONS
                            + " and " + MAX_SUGGESTIONS + ", got: " + maxSuggestions);
        }
    }

    /**
     * Thẩm định số lượng gợi ý môn học lại nếu có giá trị (cho phép null).
     */
    public static void validateOptionalMaxSuggestions(Integer maxSuggestions) {
        if (maxSuggestions != null) {
            validateMaxSuggestions(maxSuggestions);
        }
    }

    /**
     * Thẩm định mã học phần theo pattern ^[A-Z0-9]{4,10}$.
     *
     * @param courseCode mã học phần
     * @throws IllegalArgumentException nếu null hoặc không khớp pattern
     */
    public static void validateCourseCode(String courseCode) {
        if (courseCode == null || !COURSE_CODE_PATTERN.matcher(courseCode.trim()).matches()) {
            throw new IllegalArgumentException(
                    "courseCode must match pattern ^[A-Z0-9]{4,10}$, got: " + courseCode);
        }
    }

    /**
     * Kiểm tra học kỳ có khớp một trong các pattern hoặc thuật ngữ mô tả không.
     *
     * @param semester chuỗi học kỳ
     * @return true nếu hợp lệ
     */
    public static boolean isValidSemester(String semester) {
        if (semester == null || semester.isBlank()) {
            return false;
        }
        String trimmed = semester.trim();
        return SEMESTER_SHORT_PATTERN.matcher(trimmed).matches()
                || SEMESTER_LONG_PATTERN.matcher(trimmed).matches()
                || SEMESTER_DESCRIPTIVE_PATTERN.matcher(trimmed).matches();
    }

    /**
     * Thẩm định học kỳ theo pattern ^20\d{2}_[12S]$ hoặc ^20\d{2}_\d{4}_HK[12S]$ hoặc các thuật ngữ mô tả.
     *
     * @param semester chuỗi học kỳ
     * @throws IllegalArgumentException nếu không hợp lệ
     */
    public static void validateSemester(String semester) {
        if (!isValidSemester(semester)) {
            throw new IllegalArgumentException(
                    "semester must match pattern ^20\\d{2}_[12S]$, ^20\\d{2}_\\d{4}_HK[12S]$, or descriptive terms, got: " + semester);
        }
    }

    /**
     * Thẩm định học kỳ nếu có giá trị (cho phép null hoặc rỗng).
     */
    public static void validateOptionalSemester(String semester) {
        if (semester != null && !semester.isBlank()) {
            validateSemester(semester);
        }
    }
}
