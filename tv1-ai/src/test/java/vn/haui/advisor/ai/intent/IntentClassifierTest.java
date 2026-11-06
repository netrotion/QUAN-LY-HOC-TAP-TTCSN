package vn.haui.advisor.ai.intent;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("IntentClassifier Hardening & Dynamic Parameter Extraction Tests")
class IntentClassifierTest {

    @Test
    void simulationNeverInventsCourseCreditsOrGrade() {
        ParsedUserIntent incomplete = new IntentClassifier().classify("Nếu IT6015 được A thì CPA của mình sao?");
        assertThat(incomplete.getSimulatedGrades()).isEmpty();
    }

    @Test
    void aggregateSimulationDoesNotInventCourseCode() {
        ParsedUserIntent explicit = new IntentClassifier().classify("Nếu học 18 tín chỉ B+ thì CPA sao?");
        assertThat(explicit.getSimulatedGrades()).hasSize(1);
        assertThat(explicit.getSimulatedGrades().getFirst().getCourseCode()).isNull();
        assertThat(explicit.getSimulatedGrades().getFirst().getCredits()).isEqualTo(18);
    }

    @Test
    void simulationKeepsEveryNamedCourseAndGrade() {
        var grades = classifier.classify("Nếu IT6019 3 tín chỉ B và IT6020 4 tín chỉ A thì CPA sao?")
                .getSimulatedGrades();
        assertThat(grades).hasSize(2);
        assertThat(grades.get(0).getCourseCode()).isEqualTo("IT6019");
        assertThat(grades.get(0).getCredits()).isEqualTo(3);
        assertThat(grades.get(0).getExpectedGrade()).isEqualTo("B");
        assertThat(grades.get(0).getExpectedGradePoints()).isEqualByComparingTo(new BigDecimal("3.0"));
        assertThat(grades.get(1).getCourseCode()).isEqualTo("IT6020");
        assertThat(grades.get(1).getCredits()).isEqualTo(4);
        assertThat(grades.get(1).getExpectedGrade()).isEqualTo("A");
        assertThat(grades.get(1).getExpectedGradePoints()).isEqualByComparingTo(new BigDecimal("4.0"));
    }

    @Test
    void simulationAssociatesCourseCodeAfterGrade() {
        var grades = classifier.classify("Nếu 3 tín chỉ B+ môn IT6019 và 4 tín chỉ A môn IT6020 thì CPA sao?")
                .getSimulatedGrades();
        assertThat(grades).hasSize(2);
        assertThat(grades.get(0).getCourseCode()).isEqualTo("IT6019");
        assertThat(grades.get(0).getExpectedGrade()).isEqualTo("B+");
        assertThat(grades.get(1).getCourseCode()).isEqualTo("IT6020");
    }

    @Test
    void simulationDoesNotSilentlyDropIncompleteSecondCourse() {
        var grades = classifier.classify("Nếu IT6019 3 tín chỉ B và IT6020 được A thì CPA sao?")
                .getSimulatedGrades();
        assertThat(grades).isEmpty();
    }

    @Test
    void simulationDoesNotAssignOneGradeToTwoCourses() {
        var grades = classifier.classify("Nếu IT6019 và IT6020 cùng 3 tín chỉ B thì CPA sao?")
                .getSimulatedGrades();
        assertThat(grades).isEmpty();
    }

    @Test
    void simulationCanUseTwoAggregateGradeGroupsWithoutInventingCodes() {
        var grades = classifier.classify("Nếu 3 tín chỉ B và 4 tín chỉ A thì CPA sao?")
                .getSimulatedGrades();
        assertThat(grades).hasSize(2);
        assertThat(grades.get(0).getCourseCode()).isNull();
        assertThat(grades.get(1).getCourseCode()).isNull();
    }

    @Test
    void simulationNormalizesLowercaseCourseCode() {
        var grades = classifier.classify("Nếu it6019 3 tín chỉ B thì CPA sao?").getSimulatedGrades();
        assertThat(grades).hasSize(1);
        assertThat(grades.getFirst().getCourseCode()).isEqualTo("IT6019");
    }

    @Test
    void unsupportedGradeIsNotConvertedToZero() {
        var grades = classifier.classify("Nếu IT6019 3 tín chỉ A+ thì CPA sao?").getSimulatedGrades();
        assertThat(grades).isEmpty();
    }

    private final IntentClassifier classifier = new IntentClassifier();

    @Test
    @DisplayName("Extracts dynamic semester patterns like 2025_1, 2024_2 and maps natural text to standard code")
    void shouldExtractDynamicSemesterPattern() {
        ParsedUserIntent intent1 = classifier.classify("Lập kế hoạch cho kỳ 1 năm học 2025-2026 với 18 tín chỉ");
        assertThat(intent1.getTargetSemester()).isEqualTo("2025_1");
        assertThat(intent1.getMaxCredits()).isEqualTo(18);
        assertThat(intent1.getCategory()).isEqualTo(ParsedUserIntent.ScenarioCategory.STUDY_PLAN);

        ParsedUserIntent intent2 = classifier.classify("Tư vấn lộ trình học kỳ 2 năm 2024-2025 tối đa 20 tín");
        assertThat(intent2.getTargetSemester()).isEqualTo("2024_2");
        assertThat(intent2.getMaxCredits()).isEqualTo(20);
        assertThat(intent2.getCategory()).isEqualTo(ParsedUserIntent.ScenarioCategory.STUDY_PLAN);
    }

    @Test
    @DisplayName("Extracts direct code like 2025_1 or 2025_2")
    void shouldExtractDirectSemesterCode() {
        ParsedUserIntent intent = classifier.classify("Lập kế hoạch kỳ 2025_1");
        assertThat(intent.getTargetSemester()).isEqualTo("2025_1");
    }

    @Test
    @DisplayName("Recognizes multi-intent or debt courses accurately")
    void shouldClassifyDebtCoursesIntent() {
        ParsedUserIntent intent = classifier.classify("Hiện tại tôi đang nợ những môn nào?");
        assertThat(intent.getCategory()).isEqualTo(ParsedUserIntent.ScenarioCategory.DEBT_COURSES);
    }

    @Test
    @DisplayName("Recognizes regulation queries accurately")
    void shouldClassifyRegulationIntent() {
        ParsedUserIntent intent = classifier.classify("Theo Điều 14 quy chế đào tạo, khi nào bị cảnh báo học vụ?");
        assertThat(intent.getCategory()).isEqualTo(ParsedUserIntent.ScenarioCategory.REGULATION);
    }

    @Test
    @DisplayName("Personal inquiry about missing certificates must be GRADUATION_AUDIT even if containing 'theo quy chế'")
    void shouldClassifyPersonalGraduationAuditEvenWithRegulationKeyword() {
        ParsedUserIntent intent = classifier.classify("Tôi còn thiếu chứng chỉ chuẩn đầu ra nào theo quy chế?");
        assertThat(intent.getCategory()).isEqualTo(ParsedUserIntent.ScenarioCategory.GRADUATION_AUDIT);
    }

    @Test
    @DisplayName("Generic regulation query about certificates without personal scope remains REGULATION")
    void shouldClassifyGenericGraduationRegulationAsRegulation() {
        ParsedUserIntent intent = classifier.classify("Quy định về chuẩn đầu ra ngoại ngữ và tin học của trường như thế nào?");
        assertThat(intent.getCategory()).isEqualTo(ParsedUserIntent.ScenarioCategory.REGULATION);
    }
}
