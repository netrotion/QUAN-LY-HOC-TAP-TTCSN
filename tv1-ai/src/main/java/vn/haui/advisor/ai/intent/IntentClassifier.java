package vn.haui.advisor.ai.intent;

import vn.haui.advisor.ai.conversation.ChatMessageHistoryItem;
import vn.haui.advisor.ai.intent.ParsedUserIntent.ScenarioCategory;
import vn.haui.advisor.contracts.dto.SimulatedCourseGrade;

import java.math.BigDecimal;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Phân loại ý định người dùng từ câu hỏi tiếng Việt, có xem xét lịch sử hội thoại
 * để nhận diện sự thay đổi mục tiêu (goal shift), thiếu thông tin cần hỏi lại,
 * hoặc câu hỏi mô phỏng điểm số (what-if).
 */
public class IntentClassifier {

    private static final Pattern EXPLICIT_CPA_PATTERN = Pattern.compile(
            "(?:cpa|gpa|mục tiêu|thành|sang|lên|xuống|đạt)\\s*(?:là|đạt)?\\s*([0-3](?:\\.\\d{1,2})?|4(?:\\.0{1,2})?)",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern DECIMAL_CPA_PATTERN = Pattern.compile(
            "\\b([0-3]\\.\\d{1,2}|4\\.0{0,2})\\b"
    );

    private static final Pattern COURSE_CODE_PATTERN = Pattern.compile(
            "\\b([A-Z]{2,4}\\d{4})\\b"
    );

    private static final Pattern SEMESTER_PATTERN = Pattern.compile(
            "(?:học kỳ|kỳ)\\s*(\\d+|hè|phụ)|\\b(20\\d{2}_[12S]|20\\d{2}[-_]20\\d{2}[-_]HK\\d)\\b",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern WHAT_IF_CREDITS_GRADE = Pattern.compile(
            "(\\d+)\\s*(?:tín chỉ|tín|tc)\\s*([A-Da-d][+]?|[Ff])",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern RETAKE_SUGGESTIONS_PATTERN = Pattern.compile(
            "(?:top|khoảng)?\\s*(\\d+)\\s*(?:môn|học phần)",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern MAX_CREDITS_PATTERN = Pattern.compile(
            "(?:tối đa|tối thiểu|đăng ký)?\\s*(\\d{1,2})\\s*(?:tín chỉ|tc|tín)",
            Pattern.CASE_INSENSITIVE
    );

    public ParsedUserIntent classify(String userMessage) {
        return classify(userMessage, Collections.emptyList());
    }

    public ParsedUserIntent classify(String userMessage, List<ChatMessageHistoryItem> conversationHistory) {
        if (userMessage == null || userMessage.isBlank()) {
            return new ParsedUserIntent(ScenarioCategory.GENERAL);
        }

        String raw = userMessage.trim();
        String lower = raw.toLowerCase(Locale.ROOT);
        ParsedUserIntent.Builder builder = ParsedUserIntent.builder();

        // 1. Trích xuất các tham số phổ quát
        BigDecimal cpa = extractCpa(raw);
        String courseCode = extractCourseCode(raw);
        String semester = extractSemester(raw);
        Integer maxCredits = extractMaxCredits(raw);

        builder.targetCpa(cpa);
        builder.courseCode(courseCode);
        builder.targetSemester(semester);
        builder.maxCredits(maxCredits);

        if (lower.contains("kỳ hè") || lower.contains("học hè")) {
            builder.includeSummer(true);
        } else if (lower.contains("không học hè") || lower.contains("bỏ qua hè")) {
            builder.includeSummer(false);
        }

        // 2. Kiểm tra Goal Change (Thay đổi mục tiêu đa lượt)
        boolean hasGoalChangeKeyword = !lower.contains("bao nhiêu") && !lower.startsWith("nếu") && containsAny(lower,
                "đổi thành", "đổi sang", "đổi mục tiêu", "thay đổi mục tiêu",
                "sửa mục tiêu", "sửa cpa", "đặt lại mục tiêu", "chuyển sang",
                "đổi cpa", "chuyển mục tiêu", "tăng mục tiêu lên", "hạ mục tiêu xuống", "giảm mục tiêu xuống");

        BigDecimal previousCpa = findPreviousTargetCpa(conversationHistory);
        boolean isMultiTurnCpaShift = (previousCpa != null && cpa != null && !previousCpa.equals(cpa));

        if (hasGoalChangeKeyword || (isMultiTurnCpaShift && (cpa != null || lower.contains("mục tiêu")))) {
            builder.category(ScenarioCategory.GOAL_CHANGE);
            if (cpa != null) {
                builder.targetCpa(cpa);
            }
            return builder.build();
        }

        // 3. Personal Debt Queries (Tra cứu môn nợ cá nhân của sinh viên)
        if (containsAny(lower, "tôi nợ môn nào", "tôi nợ những môn nào", "nợ những môn nào", "tôi đang nợ", "nợ môn nào", "hiện tại tôi đang nợ")
                || (lower.contains("nợ") && (lower.contains("môn") || lower.contains("học phần")) && !lower.contains("quá 5%"))) {
            builder.category(ScenarioCategory.DEBT_COURSES);
            return builder.build();
        }

        // 4. Regulation Check (Quy chế học vụ - kiểm tra ưu tiên các thắc mắc về điều kiện, quy định, cảnh báo, hạ hạng)
        boolean isRegulationQuery = containsAny(lower,
                "cảnh báo học vụ", "buộc thôi học", "hạ mức", "nâng lên mức",
                "điều 14", "quy chế", "quy định", "hạ hạng", "hạ bậc",
                "quá 5%", "nợ quá 5%", "dự thi kết thúc", "hoãn thi",
                "rút học phần", "bảo lưu", "chuyên cần", "thang điểm",
                "có được phép", "có được đăng ký học cải thiện", "được học cải thiện không",
                "có được cải thiện không", "điểm a có được", "điểm b có được",
                "quy định học lại", "quy định học cải thiện", "điều kiện để sinh viên được dự thi",
                "điều kiện dự thi", "cần đạt cpa tối thiểu bao nhiêu để không bị cảnh báo",
                "điều kiện để được", "giới hạn số tín chỉ được đăng ký");

        if (isRegulationQuery) {
            builder.category(ScenarioCategory.REGULATION);
            return builder.build();
        }

        // 4. Study Plan (Lập kế hoạch, lộ trình học tập ưu tiên cao khi có chỉ thị lập kế hoạch/lộ trình)
        if (containsAny(lower, "lập lộ trình", "lập kế hoạch", "lên lộ trình", "kế hoạch học tập", "xây dựng lộ trình", "lộ trình học kỳ")) {
            builder.category(ScenarioCategory.STUDY_PLAN);
            return builder.build();
        }

        // 5. What-If (Mô phỏng điểm số)
        boolean isWhatIfQuery = (lower.contains("what-if") || lower.contains("what if") || lower.contains("mô phỏng"))
                || ((lower.startsWith("nếu") || lower.contains("giả sử")) &&
                    (lower.contains("tín chỉ") || lower.contains("đạt") || lower.contains("b+") || lower.contains("gpa") || lower.contains("cpa") || WHAT_IF_CREDITS_GRADE.matcher(raw).find()));

        if (isWhatIfQuery) {
            builder.category(ScenarioCategory.WHAT_IF);
            List<SimulatedCourseGrade> simulated = extractSimulatedGrades(raw);
            builder.simulatedGrades(simulated);
            return builder.build();
        }

        // 6. Accelerated Study (Học vượt, tốt nghiệp sớm)
        if (containsAny(lower, "học vượt", "tốt nghiệp sớm", "ra trường sớm", "rút ngắn thời gian", "hoàn thành sớm")) {
            builder.category(ScenarioCategory.ACCELERATED_STUDY);
            if (semester == null || semester.isBlank()) {
                builder.clarificationNeeded(true);
                builder.clarificationReason("Vui lòng cho biết kỳ học bạn muốn hoàn thành hoặc học vượt (ví dụ: kỳ 7, học kỳ 2 năm 2025-2026).");
            } else {
                builder.targetSemester(semester);
                builder.clarificationNeeded(false);
            }
            return builder.build();
        }

        // 7. Retake Improvement (Học cải thiện, nâng điểm)
        if (containsAny(lower, "học cải thiện", "cải thiện điểm", "học lại môn nào", "cải thiện môn nào",
                "kéo điểm", "nâng điểm", "môn nào cần học lại", "cải thiện gpa", "cải thiện cpa")) {
            builder.category(ScenarioCategory.RETAKE_IMPROVEMENT);
            Matcher m = RETAKE_SUGGESTIONS_PATTERN.matcher(raw);
            if (m.find()) {
                builder.retakeSuggestions(Integer.parseInt(m.group(1)));
            } else {
                builder.retakeSuggestions(3);
            }
            return builder.build();
        }

        // 8. Graduation Audit (Rà soát điều kiện tốt nghiệp)
        if (containsAny(lower, "điều kiện tốt nghiệp", "thiếu điều kiện gì tốt nghiệp", "xét tốt nghiệp",
                "chuẩn đầu ra", "đủ điều kiện tốt nghiệp", "đủ điều kiện ra trường", "audit tốt nghiệp",
                "ra trường cần gì", "tốt nghiệp chưa")) {
            builder.category(ScenarioCategory.GRADUATION_AUDIT);
            return builder.build();
        }

        // 9. Debt Courses & Prerequisites (Nợ môn, tiên quyết)
        if (containsAny(lower, "nợ môn", "tôi nợ môn nào", "nợ học phần", "môn nợ", "chặn môn",
                "có chặn", "tiên quyết", "học phần tiên quyết", "điều kiện tiên quyết")) {
            builder.category(ScenarioCategory.DEBT_COURSES);
            return builder.build();
        }

        // 10. Study Plan Secondary (Lộ trình, đăng ký môn thông thường)
        if (containsAny(lower, "kế hoạch", "lộ trình", "đăng ký môn", "học kỳ tới", "kỳ tới học gì", "đạt cpa", "đạt gpa")) {
            builder.category(ScenarioCategory.STUDY_PLAN);
            return builder.build();
        }

        // 11. Regulation Secondary
        if (containsAny(lower, "học phí", "chứng chỉ", "chuẩn tiếng anh", "chuẩn tin học")) {
            builder.category(ScenarioCategory.REGULATION);
            return builder.build();
        }

        // 12. Fallback General
        builder.category(ScenarioCategory.GENERAL);
        return builder.build();
    }

    private BigDecimal extractCpa(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        Matcher explicitMatcher = EXPLICIT_CPA_PATTERN.matcher(text);
        if (explicitMatcher.find()) {
            String val = explicitMatcher.group(1);
            try {
                BigDecimal bd = new BigDecimal(val);
                if (bd.compareTo(BigDecimal.ZERO) >= 0 && bd.compareTo(new BigDecimal("4.0")) <= 0) {
                    return bd;
                }
            } catch (NumberFormatException ignored) {}
        }

        Matcher decimalMatcher = DECIMAL_CPA_PATTERN.matcher(text);
        if (decimalMatcher.find()) {
            String val = decimalMatcher.group(1);
            try {
                BigDecimal bd = new BigDecimal(val);
                if (bd.compareTo(BigDecimal.ZERO) >= 0 && bd.compareTo(new BigDecimal("4.0")) <= 0) {
                    return bd;
                }
            } catch (NumberFormatException ignored) {}
        }
        return null;
    }

    private String extractCourseCode(String text) {
        Matcher m = COURSE_CODE_PATTERN.matcher(text);
        if (m.find()) {
            return m.group(1);
        }
        return null;
    }

    private String extractSemester(String text) {
        Matcher m = SEMESTER_PATTERN.matcher(text);
        if (m.find()) {
            return m.group(0).trim();
        }
        return null;
    }

    private Integer extractMaxCredits(String text) {
        Matcher m = MAX_CREDITS_PATTERN.matcher(text);
        if (m.find()) {
            try {
                return Integer.parseInt(m.group(1));
            } catch (NumberFormatException ignored) {}
        }
        return null;
    }

    private List<SimulatedCourseGrade> extractSimulatedGrades(String text) {
        List<SimulatedCourseGrade> result = new ArrayList<>();
        Matcher m = WHAT_IF_CREDITS_GRADE.matcher(text);
        if (m.find()) {
            int credits = Integer.parseInt(m.group(1));
            String grade = m.group(2).toUpperCase(Locale.ROOT);
            BigDecimal points = gradeToPoints(grade);
            result.add(new SimulatedCourseGrade("SIMULATED", credits, grade, points));
            return result;
        }

        // Thử tìm mã môn cụ thể kèm điểm: ví dụ "IT6015 được A"
        Matcher codeMatcher = COURSE_CODE_PATTERN.matcher(text);
        while (codeMatcher.find()) {
            String code = codeMatcher.group(1);
            result.add(new SimulatedCourseGrade(code, 3, "A", new BigDecimal("4.0")));
        }

        return result;
    }

    private BigDecimal gradeToPoints(String grade) {
        return switch (grade.toUpperCase(Locale.ROOT)) {
            case "A" -> new BigDecimal("4.0");
            case "B+" -> new BigDecimal("3.5");
            case "B" -> new BigDecimal("3.0");
            case "C+" -> new BigDecimal("2.5");
            case "C" -> new BigDecimal("2.0");
            case "D+" -> new BigDecimal("1.5");
            case "D" -> new BigDecimal("1.0");
            default -> BigDecimal.ZERO;
        };
    }

    private BigDecimal findPreviousTargetCpa(List<ChatMessageHistoryItem> history) {
        if (history == null || history.isEmpty()) {
            return null;
        }
        for (int i = history.size() - 1; i >= 0; i--) {
            ChatMessageHistoryItem item = history.get(i);
            if (item.getContent() != null) {
                BigDecimal found = extractCpa(item.getContent());
                if (found != null) {
                    return found;
                }
            }
        }
        return null;
    }

    private boolean containsAny(String text, String... keywords) {
        for (String kw : keywords) {
            if (text.contains(kw)) {
                return true;
            }
        }
        return false;
    }
}
