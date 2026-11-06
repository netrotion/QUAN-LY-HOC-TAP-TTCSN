package vn.haui.advisor.ai.model;

import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.intent.ParsedUserIntent;
import vn.haui.advisor.contracts.dto.CalculateTargetGradesResponse;
import vn.haui.advisor.contracts.dto.TrustedStudentContext;

import java.util.List;
import java.util.Map;
import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class MockAdvisorModelNoFabricationTest {
    private final MockAdvisorModel model = new MockAdvisorModel();
    private final TrustedStudentContext student = new TrustedStudentContext("STU-1", "2024604757", "Bạn A", "IT", "K19", "REV-1");

    private String answer(String question, ParsedUserIntent.ScenarioCategory category) {
        var intent = ParsedUserIntent.builder().category(category).build();
        return model.generate(new AdvisorModelInput(question, student, Map.of(), null, List.of(), intent)).getAnswer();
    }

    @Test
    void noSimulationResultMeansNoProjectedNumbers() {
        assertThat(answer("Nếu kỳ tới điểm cao thì CPA sao?", ParsedUserIntent.ScenarioCategory.WHAT_IF))
                .doesNotContain("3.50", "3.20", "3.00", "+0.20");
    }

    @Test
    void noRankingResultMeansNoInventedCourses() {
        assertThat(answer("Nên cải thiện môn nào?", ParsedUserIntent.ScenarioCategory.RETAKE_IMPROVEMENT))
                .doesNotContain("LP6010", "LP6012");
    }

    @Test
    void noDebtStatusMeansNoInventedFailedCourse() {
        assertThat(answer("Mình đang nợ môn nào?", ParsedUserIntent.ScenarioCategory.DEBT_COURSES))
                .doesNotContain("LP6004", "điểm F");
    }

    @Test
    void successfulTargetCalculationSurvivesASeparatePlanFailure() {
        var target = new CalculateTargetGradesResponse(student.getStudentId(), new BigDecimal("2.8"),
                new BigDecimal("3.2"), 30, new BigDecimal("3.8"), List.of(), List.of(), "REV-1");
        var intent = ParsedUserIntent.builder().category(ParsedUserIntent.ScenarioCategory.GOAL_CHANGE)
                .targetCpa(new BigDecimal("3.2")).build();
        var output = model.generate(new AdvisorModelInput("Đổi mục tiêu CPA thành 3.2 và lập kế hoạch",
                student, Map.of("calculateTargetGrades", target, "toolUnavailable", true), null, List.of(), intent));
        assertThat(output.getAnswer()).contains("3.8").doesNotContain("Yêu cầu chưa thể thực hiện");
    }

    @Test
    void noStatusResultCannotClaimNormalAcademicStanding() {
        assertThat(answer("Tình trạng học tập của mình thế nào?", ParsedUserIntent.ScenarioCategory.GENERAL))
                .doesNotContain("bình thường");
    }
}
