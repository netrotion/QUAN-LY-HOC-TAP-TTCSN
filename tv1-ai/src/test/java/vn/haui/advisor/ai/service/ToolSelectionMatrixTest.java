package vn.haui.advisor.ai.service;

import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.conversation.ChatMessageHistoryItem;
import vn.haui.advisor.contracts.dto.AcademicCapability;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;

class ToolSelectionMatrixTest {
    private record Case(String name, String message, List<ChatMessageHistoryItem> history,
                        List<AcademicCapability> tools, boolean rag, boolean clarify) {
        Case(String name, String message, List<AcademicCapability> tools, boolean rag) {
            this(name, message, List.of(), tools, rag, false);
        }
    }

    @Test
    void labeledSelectionMatrix() {
        List<ChatMessageHistoryItem> comparisonHistory = List.of(
                ChatMessageHistoryItem.ofUser("Mình phân vân giữa học cải thiện và học môn mới"),
                ChatMessageHistoryItem.ofAssistant("Hai phương án có đánh đổi khác nhau.", List.of(), List.of(), null, List.of()));
        List<ChatMessageHistoryItem> courseHistory = List.of(
                ChatMessageHistoryItem.ofUser("Môn IT6080 có đăng ký được không?"),
                ChatMessageHistoryItem.ofAssistant("IT6080 là Lập trình Web bằng Java.", List.of(), List.of(), null, List.of()));
        List<Case> cases = List.of(
                new Case("personal-low-cpa", "CPA của mình đang thấp quá, giờ nên làm sao?",
                        List.of(AcademicCapability.GET_ACADEMIC_STATUS), false),
                new Case("colloquial-low-cpa", "CPA thấp quá, giờ nên làm sao?",
                        List.of(AcademicCapability.GET_ACADEMIC_STATUS), false),
                new Case("graduation-anxiety", "Mình sợ không tốt nghiệp đúng hạn.",
                        List.of(AcademicCapability.RUN_GRADUATION_AUDIT), false),
                new Case("graduation-progress", "Mình còn thiếu gì để tốt nghiệp?",
                        List.of(AcademicCapability.RUN_GRADUATION_AUDIT), false),
                new Case("registration-known", "IT6080 có đăng ký được không?",
                        List.of(AcademicCapability.CHECK_COURSE_ELIGIBILITY), false),
                new Case("registration-paraphrase", "Mình có được đăng ký IT6080 kỳ tới không?",
                        List.of(AcademicCapability.CHECK_COURSE_ELIGIBILITY), false),
                new Case("registration-two-codes", "Mình nợ IT6019, có đăng ký IT6080 được không?",
                        List.of(AcademicCapability.CHECK_COURSE_ELIGIBILITY), false),
                new Case("course-name", "Môn IT6080 tên gì?",
                        List.of(AcademicCapability.CHECK_COURSE_ELIGIBILITY), false),
                new Case("course-identity", "IT6080 là môn gì?",
                        List.of(AcademicCapability.CHECK_COURSE_ELIGIBILITY), false),
                new Case("course-relation", "Môn IT6080 cần học trước môn nào?",
                        List.of(AcademicCapability.CHECK_COURSE_ELIGIBILITY), false),
                new Case("course-name-follow-up", "Môn đó tên gì?", courseHistory,
                        List.of(AcademicCapability.CHECK_COURSE_ELIGIBILITY), false, false),
                new Case("compare-retake-new", "Mình phân vân giữa học cải thiện và học môn mới",
                        List.of(AcademicCapability.GET_ACADEMIC_STATUS, AcademicCapability.RANK_RETAKE_COURSES), false),
                new Case("compare-retake-new-paraphrase", "Mình nên học lại để cải thiện hay đăng ký môn mới?",
                        List.of(AcademicCapability.GET_ACADEMIC_STATUS, AcademicCapability.RANK_RETAKE_COURSES), false),
                new Case("rank-specific", "Mình muốn tăng CPA, nên học cải thiện môn nào?",
                        List.of(AcademicCapability.RANK_RETAKE_COURSES), false),
                new Case("credit-advice", "Theo bạn học kỳ tới mình nên đăng ký bao nhiêu tín?",
                        List.of(AcademicCapability.GET_ACADEMIC_STATUS), true),
                new Case("policy-only", "Quy định số tín chỉ tối đa mỗi kỳ là gì?", List.of(), true),
                new Case("explicit-plan", "Lập kế hoạch đến kỳ 2026_2, tối đa 18 tín chỉ",
                        List.of(AcademicCapability.GENERATE_STUDY_PLAN), false),
                new Case("vague-plan", "Lập kế hoạch học kỳ tới", List.of(), List.of(), false, true),
                new Case("target-change", "Đổi mục tiêu CPA thành 3.2",
                        List.of(AcademicCapability.CALCULATE_TARGET_GRADES), false),
                new Case("simulation", "Nếu IT6019 3 tín chỉ B và IT6020 3 tín chỉ A thì CPA sao?",
                        List.of(AcademicCapability.SIMULATE_GRADES), false),
                new Case("simulation-missing-grades", "Nếu kỳ tới mình được điểm cao thì CPA sao?",
                        List.of(), List.of(), false, true),
                new Case("time-follow-up", "Nhưng nếu mình không đủ thời gian thì sao?", comparisonHistory,
                        List.of(), false, false),
                new Case("choice-follow-up", "Bạn nghĩ phương án nào hợp lý hơn với mình?", comparisonHistory,
                        List.of(), false, false),
                new Case("vague-course", "Bạn kiểm tra giúp mình môn IT6080 được không?", List.of(), false),
                new Case("general-advice", "Mình nên giảm khối lượng học không?", List.of(), false),
                new Case("greeting", "Chào bạn", List.of(), false));

        ConversationTurnPlanner planner = new ConversationTurnPlanner();
        List<String> errors = new ArrayList<>();
        int truePositive = 0;
        int falsePositive = 0;
        int falseNegative = 0;
        for (Case c : cases) {
            var decision = planner.decide(c.message(), c.history());
            EnumSet<AcademicCapability> expected = EnumSet.noneOf(AcademicCapability.class);
            expected.addAll(c.tools());
            EnumSet<AcademicCapability> actual = EnumSet.noneOf(AcademicCapability.class);
            actual.addAll(decision.capabilities());
            for (AcademicCapability capability : AcademicCapability.values()) {
                if (expected.contains(capability) && actual.contains(capability)) truePositive++;
                else if (!expected.contains(capability) && actual.contains(capability)) falsePositive++;
                else if (expected.contains(capability)) falseNegative++;
            }
            if (!decision.capabilities().equals(c.tools()) || decision.policyEvidenceNeeded() != c.rag()
                    || (decision.clarificationQuestion() != null) != c.clarify()) {
                errors.add(c.name() + ": expected=" + c.tools() + "/rag=" + c.rag() + "/clarify=" + c.clarify()
                        + ", actual=" + decision.capabilities() + "/rag=" + decision.policyEvidenceNeeded()
                        + "/clarify=" + (decision.clarificationQuestion() != null));
            }
        }
        double precision = (double) truePositive / (truePositive + falsePositive);
        double recall = (double) truePositive / (truePositive + falseNegative);
        System.out.printf(Locale.ROOT, "Tool selection matrix: %d cases, TP=%d FP=%d FN=%d precision=%.3f recall=%.3f%n",
                cases.size(), truePositive, falsePositive, falseNegative, precision, recall);
        assertThat(errors).isEmpty();
    }
}
