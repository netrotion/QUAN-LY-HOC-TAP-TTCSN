package vn.haui.advisor.ai.intent;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

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
