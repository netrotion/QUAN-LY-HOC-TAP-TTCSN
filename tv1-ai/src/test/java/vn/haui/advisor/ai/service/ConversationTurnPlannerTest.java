package vn.haui.advisor.ai.service;

import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.conversation.ChatMessageHistoryItem;
import vn.haui.advisor.contracts.dto.AcademicCapability;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ConversationTurnPlannerTest {
    private final ConversationTurnPlanner planner = new ConversationTurnPlanner();

    @Test
    void emotionalFollowUpUsesHistoryWithoutRepeatingToolsOrRag() {
        var history = List.of(
                ChatMessageHistoryItem.ofUser("Mình phân vân giữa học cải thiện và học môn mới"),
                ChatMessageHistoryItem.ofAssistant("Hai phương án có đánh đổi khác nhau.", List.of(), List.of(), null, List.of())
        );
        var decision = planner.decide("Nhưng nếu mình không đủ thời gian thì sao?", history);
        assertThat(decision.capabilities()).isEmpty();
        assertThat(decision.policyEvidenceNeeded()).isFalse();
        assertThat(decision.clarificationQuestion()).isNull();
    }

    @Test
    void vaguePlanAsksForTermWithoutInventingTargets() {
        var decision = planner.decide("Lập kế hoạch học kỳ tới", List.of());
        assertThat(decision.capabilities()).isEmpty();
        assertThat(decision.clarificationQuestion()).contains("học kỳ");
        assertThat(decision.intent().getTargetCpa()).isNull();
        assertThat(decision.intent().getTargetSemester()).isNull();
    }

    @Test
    void explicitPlanCarriesOnlyUserConfirmedGoalAcrossTurns() {
        var history = List.of(
                ChatMessageHistoryItem.ofUser("Mục tiêu CPA của mình là 3.2"),
                ChatMessageHistoryItem.ofAssistant("Mình ghi nhận mục tiêu đó.", List.of(), List.of(), null, List.of())
        );
        var decision = planner.decide("Lập kế hoạch cho mục tiêu đó đến kỳ 2026_2, tối đa 18 tín chỉ", history);
        assertThat(decision.intent().getTargetCpa()).isEqualByComparingTo(new BigDecimal("3.2"));
        assertThat(decision.argumentProvenance()).containsEntry("targetCpa", ConversationTurnPlanner.FactSource.PRIOR_USER)
                .containsEntry("targetSemester", ConversationTurnPlanner.FactSource.CURRENT_USER)
                .containsEntry("maxCredits", ConversationTurnPlanner.FactSource.CURRENT_USER);
        assertThat(decision.capabilities()).containsExactly(AcademicCapability.GENERATE_STUDY_PLAN);
        assertThat(decision.clarificationQuestion()).isNull();
    }

    @Test
    void assistantClaimIsNeverPromotedToUserConfirmedGoal() {
        var history = List.of(ChatMessageHistoryItem.ofAssistant("Mục tiêu CPA 3.8", List.of(), List.of(), null, List.of()));
        var decision = planner.decide("Lập kế hoạch cho mục tiêu đó đến kỳ 2026_2, tối đa 18 tín chỉ", history);
        assertThat(decision.intent().getTargetCpa()).isNull();
        assertThat(decision.capabilities()).isEmpty();
        assertThat(decision.clarificationQuestion()).contains("CPA mục tiêu");
    }

    @Test
    void minimumCreditsIsNotMisreadAsMaximumPlanCapacity() {
        var decision = planner.decide("Lập kế hoạch đến kỳ 2026_2, tối thiểu 18 tín chỉ", List.of());
        assertThat(decision.intent().getMaxCredits()).isNull();
        assertThat(decision.capabilities()).isEmpty();
        assertThat(decision.clarificationQuestion()).contains("tối đa");
    }

    @Test
    void noSummerConstraintIsPreservedInPlanArguments() {
        var decision = planner.decide("Lập kế hoạch đến kỳ 2026_2, tối đa 18 tín chỉ, không học hè", List.of());
        assertThat(decision.intent().getIncludeSummer()).isFalse();
        assertThat(decision.capabilities()).containsExactly(AcademicCapability.GENERATE_STUDY_PLAN);
    }

    @Test
    void planClarificationCanBeCompletedAcrossThreeUserTurns() {
        var first = List.of(
                ChatMessageHistoryItem.ofUser("Lập kế hoạch học kỳ tới"),
                ChatMessageHistoryItem.ofAssistant("Bạn muốn lập kế hoạch đến học kỳ nào?", List.of(), List.of(), null, List.of())
        );
        var second = planner.decide("Kỳ 2026_2", first);
        assertThat(second.capabilities()).isEmpty();
        assertThat(second.clarificationQuestion()).contains("tối đa");

        var continued = List.of(first.get(0), first.get(1),
                ChatMessageHistoryItem.ofUser("Kỳ 2026_2"),
                ChatMessageHistoryItem.ofAssistant(second.clarificationQuestion(), List.of(), List.of(), null, List.of()));
        var third = planner.decide("Tối đa 18 tín chỉ", continued);
        assertThat(third.capabilities()).containsExactly(AcademicCapability.GENERATE_STUDY_PLAN);
        assertThat(third.intent().getTargetSemester()).isEqualTo("2026_2");
        assertThat(third.intent().getMaxCredits()).isEqualTo(18);
        assertThat(third.argumentProvenance()).containsEntry("targetSemester", ConversationTurnPlanner.FactSource.PRIOR_USER);
    }

    @Test
    void namedCourseReferentUsesPriorUserCourseCode() {
        var history = List.of(
                ChatMessageHistoryItem.ofUser("IT6015 là môn gì?"),
                ChatMessageHistoryItem.ofAssistant("Bạn muốn kiểm tra đăng ký môn này ở kỳ nào?", List.of(), List.of(), null, List.of()));
        var decision = planner.decide("Môn đó kỳ 2026_2 có đăng ký được không?", history);
        assertThat(decision.capabilities()).containsExactly(AcademicCapability.CHECK_COURSE_ELIGIBILITY);
        assertThat(decision.intent().getCourseCode()).isEqualTo("IT6015");
        assertThat(decision.argumentProvenance()).containsEntry("courseCode", ConversationTurnPlanner.FactSource.PRIOR_USER);
    }

    @Test
    void courseRelationFollowUpReusesOnlyPriorUserCodeAndCallsEligibility() {
        var history = List.of(
                ChatMessageHistoryItem.ofUser("IT6080 cần những môn tiên quyết nào?"),
                ChatMessageHistoryItem.ofAssistant("IT6080 là Lập trình Web bằng Java.", List.of(), List.of(), null, List.of()));
        var decision = planner.decide("Vậy môn đó cần học trước môn nào?", history);
        assertThat(decision.intent().getCourseCode()).isEqualTo("IT6080");
        assertThat(decision.argumentProvenance()).containsEntry("courseCode", ConversationTurnPlanner.FactSource.PRIOR_USER);
        assertThat(decision.capabilities()).containsExactly(AcademicCapability.CHECK_COURSE_ELIGIBILITY);
    }

    @Test
    void hypotheticalCompletionKeepsThePreviouslyDiscussedTargetCourse() {
        var history = List.of(
                ChatMessageHistoryItem.ofUser("Môn IT6080 có đăng ký được không?"),
                ChatMessageHistoryItem.ofAssistant("IT6080 còn thiếu môn học trước IT6019.", List.of(), List.of(), null, List.of()),
                ChatMessageHistoryItem.ofUser("Môn đó là Đồ án chuyên ngành đúng không?"),
                ChatMessageHistoryItem.ofAssistant("Không, IT6080 là Lập trình Web bằng Java.", List.of(), List.of(), null, List.of()));
        var decision = planner.decide("Nếu mình hoàn thành IT6019 thì còn thiếu gì?", history);
        assertThat(decision.intent().getCourseCode()).isEqualTo("IT6080");
        assertThat(decision.argumentProvenance()).containsEntry("courseCode", ConversationTurnPlanner.FactSource.PRIOR_USER);
        assertThat(decision.capabilities()).containsExactly(AcademicCapability.CHECK_COURSE_ELIGIBILITY);
    }

    @Test
    void courseIdentityFollowUpChecksTheVerifiedNameAgain() {
        var history = List.of(
                ChatMessageHistoryItem.ofUser("Môn IT6080 có đăng ký được không?"),
                ChatMessageHistoryItem.ofAssistant("IT6080 là Lập trình Web bằng Java.", List.of(), List.of(), null, List.of()));
        var decision = planner.decide("Môn đó là Đồ án chuyên ngành đúng không?", history);
        assertThat(decision.intent().getCourseCode()).isEqualTo("IT6080");
        assertThat(decision.capabilities()).containsExactly(AcademicCapability.CHECK_COURSE_ELIGIBILITY);
    }

    @Test
    void currentCpaIsNotReusedAsPlanTarget() {
        var decision = planner.decide("CPA của mình hiện tại 2.0, lập kế hoạch đến kỳ 2026_2 tối đa 18 tín chỉ", List.of());
        assertThat(decision.intent().getTargetCpa()).isNull();
        assertThat(decision.capabilities()).containsExactly(AcademicCapability.GENERATE_STUDY_PLAN);
    }

    @Test
    void currentGpaIsNotReusedAsCpaTarget() {
        var decision = planner.decide("GPA hiện tại 2.5, lập kế hoạch đến kỳ 2026_2 tối đa 18 tín chỉ", List.of());
        assertThat(decision.intent().getTargetCpa()).isNull();
    }

    @Test
    void explicitGoalWinsOverCurrentCpaInSameMessage() {
        var decision = planner.decide("CPA hiện tại 2.0, mục tiêu CPA 3.2; lập kế hoạch đến kỳ 2026_2 tối đa 18 tín chỉ", List.of());
        assertThat(decision.intent().getTargetCpa()).isEqualByComparingTo("3.2");
    }

    @Test
    void eligibilityUsesTheRequestedCourseWhenTwoCodesAppear() {
        var decision = planner.decide("Tôi đang nợ LP6004, có đăng ký LP6003 được không?", List.of());
        assertThat(decision.capabilities()).containsExactly(AcademicCapability.CHECK_COURSE_ELIGIBILITY);
        assertThat(decision.intent().getCourseCode()).isEqualTo("LP6003");
    }

    @Test
    void eligibilityUsesRequestedCourseWhenTwoCodesAreLowercase() {
        var decision = planner.decide("Mình nợ it6019, có đăng ký it6080 được không?", List.of());
        assertThat(decision.capabilities()).containsExactly(AcademicCapability.CHECK_COURSE_ELIGIBILITY);
        assertThat(decision.intent().getCourseCode()).isEqualTo("IT6080");
    }

    @Test
    void reconciliationClarificationCanBeCompletedInNextTurn() {
        var history = List.of(ChatMessageHistoryItem.ofUser("Đồng bộ kế hoạch sau kỳ này"),
                ChatMessageHistoryItem.ofAssistant("Bạn cho mình mã kế hoạch, học kỳ và phiên bản để đối soát nhé?",
                        List.of(), List.of(), null, List.of()));
        var decision = planner.decide("PLAN-ABC, phiên bản 2, kỳ 2026_1", history);
        assertThat(decision.capabilities()).containsExactly(AcademicCapability.RECONCILE_STUDY_PLAN);
        assertThat(decision.planId()).isEqualTo("PLAN-ABC");
        assertThat(decision.planVersion()).isEqualTo(2);
        assertThat(decision.intent().getTargetSemester()).isEqualTo("2026_1");
    }

    @Test
    void curricularTermSevenIsNotPassedAsCalendarSemester() {
        var decision = planner.decide("Lập kế hoạch đến kỳ 7 năm 2026, tối đa 18 tín chỉ", List.of());
        assertThat(decision.capabilities()).isEmpty();
        assertThat(decision.clarificationQuestion()).contains("học kỳ");
    }

    @Test
    void goalChangeDoesNotGeneratePlanUnlessRequested() {
        var decision = planner.decide("Đổi mục tiêu CPA thành 3.2", List.of());
        assertThat(decision.capabilities()).containsExactly(AcademicCapability.CALCULATE_TARGET_GRADES);
    }

    @Test
    void ambiguousSimulationAsksForInputs() {
        var decision = planner.decide("Nếu kỳ tới mình được điểm cao thì CPA sao?", List.of());
        assertThat(decision.capabilities()).isEmpty();
        assertThat(decision.clarificationQuestion()).contains("điểm");
    }

    @Test
    void personalProgressUsesAuditWithoutPolicyRetrieval() {
        var decision = planner.decide("Mình còn thiếu gì để tốt nghiệp?", List.of());
        assertThat(decision.capabilities()).containsExactly(AcademicCapability.RUN_GRADUATION_AUDIT);
        assertThat(decision.policyEvidenceNeeded()).isFalse();
    }

    @Test
    void policyQuestionUsesRagWithoutStudentTool() {
        var decision = planner.decide("Quy định số tín chỉ tối đa mỗi kỳ là gì?", List.of());
        assertThat(decision.capabilities()).isEmpty();
        assertThat(decision.policyEvidenceNeeded()).isTrue();
    }

    @Test
    void reconciliationNeverUsesHardcodedPlanIdentity() {
        var decision = planner.decide("Đồng bộ kế hoạch sau kỳ này", List.of());
        assertThat(decision.capabilities()).isEmpty();
        assertThat(decision.clarificationQuestion()).contains("kế hoạch");
    }

    @Test
    void namedCourseRegistrationUsesEligibilityEngine() {
        var decision = planner.decide("IT6015 có đăng ký được vào kỳ 2026_2 không?", List.of());
        assertThat(decision.capabilities()).containsExactly(AcademicCapability.CHECK_COURSE_ELIGIBILITY);
        assertThat(decision.intent().getCourseCode()).isEqualTo("IT6015");
        assertThat(decision.intent().getTargetSemester()).isEqualTo("2026_2");
    }

    @Test
    void personalGraduationProgressUsesAudit() {
        var decision = planner.decide("Tiến độ tốt nghiệp của mình đang thế nào?", List.of());
        assertThat(decision.capabilities()).containsExactly(AcademicCapability.RUN_GRADUATION_AUDIT);
    }

    @Test
    void creditAdviceNeedsStatusAndPolicyButNotAFullPlan() {
        var decision = planner.decide("Theo bạn học kỳ tới mình nên đăng ký bao nhiêu tín?", List.of());
        assertThat(decision.capabilities()).containsExactly(AcademicCapability.GET_ACADEMIC_STATUS);
        assertThat(decision.policyEvidenceNeeded()).isTrue();
    }
}
