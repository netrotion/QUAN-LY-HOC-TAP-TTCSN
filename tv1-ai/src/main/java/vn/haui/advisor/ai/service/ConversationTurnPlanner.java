package vn.haui.advisor.ai.service;

import vn.haui.advisor.ai.conversation.ChatMessageHistoryItem;
import vn.haui.advisor.ai.intent.IntentClassifier;
import vn.haui.advisor.ai.intent.ParsedUserIntent;
import vn.haui.advisor.contracts.dto.AcademicCapability;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Chooses evidence and academic capabilities from user-confirmed conversation facts. */
public class ConversationTurnPlanner {
    private static final Pattern YEAR = Pattern.compile("20\\d{2}");
    private static final Pattern PLAN_ID = Pattern.compile("\\b(PLAN-[A-Z0-9_-]+)\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern VERSION = Pattern.compile("(?:phiên bản|version|v)\\s*(\\d+)", Pattern.CASE_INSENSITIVE);
    private static final Pattern TARGET_CPA = Pattern.compile(
            "(?i)(?:mục tiêu(?:\\s+cpa)?|đạt\\s+cpa|đổi(?:\\s+mục tiêu)?(?:\\s+cpa)?(?:\\s+thành)?|cpa\\s+mục tiêu|cpa\\s+lên)\\D{0,30}?([0-3](?:\\.\\d{1,2})?|4(?:\\.0{1,2})?)\\b");
    private static final Pattern COURSE_CODE = Pattern.compile("\\b[A-Z]{2,4}\\d{4}\\b", Pattern.CASE_INSENSITIVE);
    private final IntentClassifier classifier;

    public enum Mode { DIRECT, CLARIFY, POLICY, PERSONAL_ANALYSIS, PLAN }
    public enum FactSource { CURRENT_USER, PRIOR_USER, UNKNOWN }

    public ConversationTurnPlanner() { this(new IntentClassifier()); }

    public ConversationTurnPlanner(IntentClassifier classifier) { this.classifier = classifier; }

    public record TurnDecision(Mode mode, ParsedUserIntent intent, List<AcademicCapability> capabilities,
                               boolean policyEvidenceNeeded, String retrievalQuery, String clarificationQuestion,
                               String planId, Integer planVersion, Map<String, FactSource> argumentProvenance) {}

    public TurnDecision decide(String message, List<ChatMessageHistoryItem> history) {
        String current = message == null ? "" : message.trim();
        String lower = current.toLowerCase(Locale.ROOT);
        List<ChatMessageHistoryItem> userHistory = history == null ? List.of() : history.stream()
                .filter(item -> item != null && "user".equalsIgnoreCase(item.getRole())).toList();
        ParsedUserIntent parsed = classifier.classify(current, userHistory);
        boolean wantsPlan = isPlanRequest(lower);

        BigDecimal targetCpa = explicitTargetCpa(current);
        FactSource cpaSource = targetCpa == null ? FactSource.UNKNOWN : FactSource.CURRENT_USER;
        if (targetCpa == null && containsAny(lower, "mục tiêu đó", "mục tiêu này", "cpa đó")) {
            for (int i = userHistory.size() - 1; i >= 0; i--) {
                String previous = userHistory.get(i).getContent();
                if (previous != null && containsAny(previous.toLowerCase(Locale.ROOT), "mục tiêu", "muốn đạt", "đổi cpa")) {
                    targetCpa = explicitTargetCpa(previous);
                    if (targetCpa != null) {
                        cpaSource = FactSource.PRIOR_USER;
                        break;
                    }
                }
            }
        }

        String semester = confirmedSemester(current, parsed.getTargetSemester());
        FactSource semesterSource = semester == null ? FactSource.UNKNOWN : FactSource.CURRENT_USER;
        Integer maxCredits = parsed.getMaxCredits();
        FactSource creditsSource = maxCredits == null ? FactSource.UNKNOWN : FactSource.CURRENT_USER;
        String courseCode = parsed.getCourseCode();
        FactSource courseSource = courseCode == null ? FactSource.UNKNOWN : FactSource.CURRENT_USER;
        if (lower.contains("đăng ký")) {
            Matcher codes = COURSE_CODE.matcher(current);
            while (codes.find()) courseCode = codes.group().toUpperCase(Locale.ROOT);
        }
        Boolean includeSummer = parsed.getIncludeSummer();
        if (semester == null && containsAny(lower, "kỳ đó", "học kỳ đó")) {
            for (int i = userHistory.size() - 1; i >= 0; i--) {
                String previous = userHistory.get(i).getContent();
                if (previous == null) continue;
                String candidate = classifier.classify(previous).getTargetSemester();
                semester = confirmedSemester(previous, candidate);
                if (semester != null) {
                    semesterSource = FactSource.PRIOR_USER;
                    break;
                }
            }
        }

        if (courseCode == null && containsAny(lower, "môn đó", "học phần đó")) {
            for (int i = userHistory.size() - 1; i >= 0; i--) {
                courseCode = classifier.classify(userHistory.get(i).getContent()).getCourseCode();
                if (courseCode != null) {
                    courseSource = FactSource.PRIOR_USER;
                    break;
                }
            }
        }
        boolean hypotheticalCourseFollowUp = courseCode != null && lower.startsWith("nếu")
                && lower.contains("hoàn thành") && lower.contains("còn thiếu");
        if (hypotheticalCourseFollowUp) {
            String completedCode = courseCode;
            for (int i = userHistory.size() - 1; i >= 0; i--) {
                String previous = userHistory.get(i).getContent();
                if (previous == null) continue;
                String previousCode = classifier.classify(previous).getCourseCode();
                if (previousCode != null && !previousCode.equalsIgnoreCase(completedCode)) {
                    courseCode = previousCode;
                    courseSource = FactSource.PRIOR_USER;
                    break;
                }
            }
            hypotheticalCourseFollowUp = courseSource == FactSource.PRIOR_USER;
        }

        boolean planFollowUp = !wantsPlan && (semester != null || maxCredits != null)
                && history != null && !history.isEmpty()
                && "assistant".equalsIgnoreCase(history.getLast().getRole())
                && history.getLast().getContent() != null
                && history.getLast().getContent().contains("?")
                && containsAny(history.getLast().getContent().toLowerCase(Locale.ROOT), "lập kế hoạch", "mỗi học kỳ", "tối đa bao nhiêu tín")
                && userHistory.stream().anyMatch(item -> item.getContent() != null
                        && isPlanRequest(item.getContent().toLowerCase(Locale.ROOT)));
        if (planFollowUp) {
            for (int i = userHistory.size() - 1; i >= 0; i--) {
                String previous = userHistory.get(i).getContent();
                if (previous == null) continue;
                ParsedUserIntent earlier = classifier.classify(previous);
                if (semester == null) {
                    semester = confirmedSemester(previous, earlier.getTargetSemester());
                    if (semester != null) semesterSource = FactSource.PRIOR_USER;
                }
                if (maxCredits == null && earlier.getMaxCredits() != null) {
                    maxCredits = earlier.getMaxCredits();
                    creditsSource = FactSource.PRIOR_USER;
                }
                if (includeSummer == null) includeSummer = earlier.getIncludeSummer();
                if (targetCpa == null && containsAny(previous.toLowerCase(Locale.ROOT), "mục tiêu", "đạt cpa")) {
                    targetCpa = explicitTargetCpa(previous);
                    if (targetCpa != null) cpaSource = FactSource.PRIOR_USER;
                }
                if (isPlanRequest(previous.toLowerCase(Locale.ROOT))) break;
            }
        }

        boolean generalGraduationRule = lower.contains("điều kiện tốt nghiệp")
                && !containsAny(lower, "của mình", "mình còn", "mình thiếu", "tôi còn", "tôi thiếu", "của tôi", "của em", "em còn", "em thiếu");
        boolean policy = parsed.getCategory() == ParsedUserIntent.ScenarioCategory.REGULATION
                || containsAny(lower, "quy chế", "quy định", "được phép", "điều kiện", "tối đa bao nhiêu tín", "giới hạn tín chỉ")
                || (lower.contains("đăng ký") && lower.contains("bao nhiêu tín"))
                || (lower.contains("gpa") && lower.contains("cpa") && containsAny(lower, "khác nhau", "cách tính"));
        if (parsed.getCategory() == ParsedUserIntent.ScenarioCategory.GRADUATION_AUDIT
                && !containsAny(lower, "quy chế", "quy định", "điều kiện chung") && !generalGraduationRule) policy = false;

        String retrievalQuery = current;
        if (policy && containsAny(lower, "điều đó", "quy định đó", "còn trường hợp này")) {
            for (int i = userHistory.size() - 1; i >= 0; i--) {
                String previous = userHistory.get(i).getContent();
                if (previous != null && !previous.isBlank()) {
                    retrievalQuery = previous + " " + current;
                    break;
                }
            }
        }

        List<AcademicCapability> capabilities = new ArrayList<>();
        String clarification = null;
        String planId = null;
        Integer planVersion = null;
        FactSource planIdSource = FactSource.UNKNOWN;
        FactSource planVersionSource = FactSource.UNKNOWN;
        boolean unresolvedGoal = targetCpa == null && containsAny(lower, "mục tiêu đó", "mục tiêu này", "cpa đó");
        boolean comparesRetakeWithNewCourse = containsAny(lower, "học cải thiện", "học lại", "cải thiện điểm")
                && containsAny(lower, "môn mới", "học phần mới")
                && containsAny(lower, "phân vân", "hay", "so với", "nên");

        boolean reconcileFollowUp = history != null && !history.isEmpty()
                && "assistant".equalsIgnoreCase(history.getLast().getRole())
                && history.getLast().getContent() != null
                && containsAny(history.getLast().getContent().toLowerCase(Locale.ROOT), "đối soát", "mã kế hoạch")
                && userHistory.stream().anyMatch(item -> item.getContent() != null
                        && containsAny(item.getContent().toLowerCase(Locale.ROOT), "đồng bộ", "reconcile", "đối soát kế hoạch"));
        if (containsAny(lower, "đồng bộ", "reconcile", "đối soát kế hoạch") || reconcileFollowUp) {
            Matcher id = PLAN_ID.matcher(current);
            Matcher version = VERSION.matcher(current);
            if (id.find()) {
                planId = id.group(1);
                planIdSource = FactSource.CURRENT_USER;
            }
            if (version.find()) {
                planVersion = Integer.parseInt(version.group(1));
                planVersionSource = FactSource.CURRENT_USER;
            }
            if (reconcileFollowUp && (planId == null || planVersion == null || semester == null)) {
                for (int i = userHistory.size() - 1; i >= 0; i--) {
                    String previous = userHistory.get(i).getContent();
                    if (previous == null) continue;
                    if (planId == null) {
                        Matcher priorId = PLAN_ID.matcher(previous);
                        if (priorId.find()) {
                            planId = priorId.group(1);
                            planIdSource = FactSource.PRIOR_USER;
                        }
                    }
                    if (planVersion == null) {
                        Matcher priorVersion = VERSION.matcher(previous);
                        if (priorVersion.find()) {
                            planVersion = Integer.parseInt(priorVersion.group(1));
                            planVersionSource = FactSource.PRIOR_USER;
                        }
                    }
                    if (semester == null) {
                        semester = confirmedSemester(previous, classifier.classify(previous).getTargetSemester());
                        if (semester != null) semesterSource = FactSource.PRIOR_USER;
                    }
                    if (containsAny(previous.toLowerCase(Locale.ROOT), "đồng bộ", "reconcile", "đối soát kế hoạch")) break;
                }
            }
            if (planId == null || semester == null || planVersion == null) {
                clarification = "Bạn cho mình mã kế hoạch đã lưu, học kỳ vừa hoàn thành và phiên bản kế hoạch để đối soát nhé?";
            } else capabilities.add(AcademicCapability.RECONCILE_STUDY_PLAN);
        } else if (parsed.getCategory() == ParsedUserIntent.ScenarioCategory.WHAT_IF) {
            if (parsed.getSimulatedGrades() == null || parsed.getSimulatedGrades().isEmpty()) {
                clarification = "Bạn muốn mô phỏng những môn hoặc số tín chỉ nào, với điểm dự kiến bao nhiêu?";
            } else capabilities.add(AcademicCapability.SIMULATE_GRADES);
        } else if (parsed.getCategory() == ParsedUserIntent.ScenarioCategory.GOAL_CHANGE) {
            if (targetCpa == null) clarification = "Bạn muốn đặt CPA mục tiêu là bao nhiêu?";
            else {
                capabilities.add(AcademicCapability.CALCULATE_TARGET_GRADES);
                if (wantsPlan) clarification = planClarification(semester, maxCredits);
                if (wantsPlan && clarification == null) capabilities.add(AcademicCapability.GENERATE_STUDY_PLAN);
            }
        } else if (wantsPlan || planFollowUp || parsed.getCategory() == ParsedUserIntent.ScenarioCategory.ACCELERATED_STUDY) {
            clarification = unresolvedGoal ? "Bạn nhắc lại CPA mục tiêu để mình lập kế hoạch đúng nhé?"
                    : planClarification(semester, maxCredits);
            if (clarification == null) capabilities.add(AcademicCapability.GENERATE_STUDY_PLAN);
        } else if (comparesRetakeWithNewCourse) {
            capabilities.add(AcademicCapability.GET_ACADEMIC_STATUS);
            capabilities.add(AcademicCapability.RANK_RETAKE_COURSES);
        } else if ((containsAny(lower, "đăng ký được", "được đăng ký", "có thể đăng ký", "đủ điều kiện đăng ký", "học được")
                || (lower.contains("đăng ký") && lower.contains("được không")))
                && (courseCode != null || containsAny(lower, "môn đó", "học phần đó"))) {
            if (courseCode == null) clarification = "Bạn cho mình mã học phần cần kiểm tra đăng ký nhé?";
            else capabilities.add(AcademicCapability.CHECK_COURSE_ELIGIBILITY);
        } else if (courseCode != null && containsAny(lower, "tên gì", "là môn gì", "là học phần gì")) {
            capabilities.add(AcademicCapability.CHECK_COURSE_ELIGIBILITY);
        } else if (containsAny(lower, "tiên quyết", "học trước", "song hành")
                && (courseCode != null || containsAny(lower, "môn đó", "học phần đó"))) {
            if (courseCode == null) clarification = "Bạn cho mình mã học phần cần kiểm tra nhé?";
            else capabilities.add(AcademicCapability.CHECK_COURSE_ELIGIBILITY);
        } else if (hypotheticalCourseFollowUp) {
            capabilities.add(AcademicCapability.CHECK_COURSE_ELIGIBILITY);
        } else if (containsAny(lower, "môn đó là", "học phần đó là") && lower.contains("đúng không")) {
            if (courseCode == null) clarification = "Bạn cho mình mã học phần cần đối chiếu tên nhé?";
            else capabilities.add(AcademicCapability.CHECK_COURSE_ELIGIBILITY);
        } else if ((parsed.getCategory() == ParsedUserIntent.ScenarioCategory.GRADUATION_AUDIT && !generalGraduationRule)
                || (containsAny(lower, "tốt nghiệp", "ra trường")
                && containsAny(lower, "mình còn thiếu", "mình thiếu", "mình sợ", "đúng hạn", "tiến độ của mình", "tiến độ tốt nghiệp của mình"))) {
            capabilities.add(AcademicCapability.RUN_GRADUATION_AUDIT);
        } else if (parsed.getCategory() == ParsedUserIntent.ScenarioCategory.DEBT_COURSES) {
            if (courseCode != null) capabilities.add(AcademicCapability.CHECK_COURSE_ELIGIBILITY);
            else capabilities.add(AcademicCapability.GET_ACADEMIC_STATUS);
        } else if (parsed.getCategory() == ParsedUserIntent.ScenarioCategory.RETAKE_IMPROVEMENT) {
            if (containsAny(lower, "môn nào", "xếp hạng", "gợi ý môn", "top ")) {
                capabilities.add(AcademicCapability.RANK_RETAKE_COURSES);
            }
        } else if (parsed.getCategory() != ParsedUserIntent.ScenarioCategory.REGULATION
                && containsAny(lower, "cpa của mình", "gpa của mình", "tình trạng học tập", "điểm của mình",
                "cpa hiện tại", "xem điểm", "điểm học tập", "tiến độ học tập", "cpa thấp", "gpa thấp")) {
            capabilities.add(AcademicCapability.GET_ACADEMIC_STATUS);
        }

        if (parsed.getCategory() == ParsedUserIntent.ScenarioCategory.STUDY_PLAN && !wantsPlan
                && containsAny(lower, "bao nhiêu tín", "mấy tín")) {
            if (!capabilities.contains(AcademicCapability.GET_ACADEMIC_STATUS)) capabilities.add(AcademicCapability.GET_ACADEMIC_STATUS);
        }
        Mode mode = clarification != null ? Mode.CLARIFY : !capabilities.isEmpty()
                ? (capabilities.contains(AcademicCapability.GENERATE_STUDY_PLAN) ? Mode.PLAN : Mode.PERSONAL_ANALYSIS)
                : policy ? Mode.POLICY : Mode.DIRECT;
        Map<String, FactSource> provenance = new LinkedHashMap<>();
        provenance.put("targetCpa", cpaSource);
        provenance.put("targetSemester", semesterSource);
        provenance.put("maxCredits", creditsSource);
        provenance.put("courseCode", courseSource);
        provenance.put("simulatedGrades", parsed.getSimulatedGrades() == null || parsed.getSimulatedGrades().isEmpty()
                ? FactSource.UNKNOWN : FactSource.CURRENT_USER);
        provenance.put("planId", planIdSource);
        provenance.put("planVersion", planVersionSource);
        ParsedUserIntent intent = ParsedUserIntent.builder()
                .category(parsed.getCategory()).targetCpa(targetCpa).targetSemester(semester)
                .courseCode(courseCode).maxCredits(maxCredits)
                .includeSummer(includeSummer).retakeSuggestions(parsed.getRetakeSuggestions())
                .simulatedGrades(parsed.getSimulatedGrades()).build();
        return new TurnDecision(mode, intent, List.copyOf(capabilities), policy, retrievalQuery,
                clarification, planId, planVersion, Map.copyOf(provenance));
    }

    private static String planClarification(String semester, Integer maxCredits) {
        if (semester == null) return "Bạn muốn lập kế hoạch đến học kỳ nào? Hãy cho mình năm và kỳ cụ thể.";
        if (maxCredits == null) return "Mỗi học kỳ bạn có thể dành tối đa bao nhiêu tín chỉ để mình lập kế hoạch phù hợp?";
        return null;
    }

    private static String confirmedSemester(String text, String parsed) {
        return text != null && YEAR.matcher(text).find() && parsed != null && parsed.matches("20\\d{2}_[12S]") ? parsed : null;
    }

    private static BigDecimal explicitTargetCpa(String text) {
        if (text == null) return null;
        Matcher matcher = TARGET_CPA.matcher(text);
        return matcher.find() ? new BigDecimal(matcher.group(1)) : null;
    }

    private static boolean containsAny(String text, String... phrases) {
        for (String phrase : phrases) if (text.contains(phrase)) return true;
        return false;
    }

    private static boolean isPlanRequest(String text) {
        return containsAny(text, "lập kế hoạch", "lập lại kế hoạch", "lên kế hoạch", "lập lộ trình",
                "lên lộ trình", "xây dựng lộ trình", "điều chỉnh kế hoạch");
    }
}
