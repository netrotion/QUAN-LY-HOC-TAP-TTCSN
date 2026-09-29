package vn.haui.advisor.academic;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.academic.fixture.AcademicFixtures;
import vn.haui.advisor.academic.model.PolicyDemo;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Task 1.3b: Xác minh policy-demo.json và nhãn DEMO_UNVERIFIED")
public class PolicyDemoVerificationTest {

    @Test
    @DisplayName("Bắt buộc: Tất cả các quy tắc, ngưỡng học vụ trong policy-demo.json đều gắn nhãn DEMO_UNVERIFIED")
    void testAllPolicySectionsCarryDemoUnverifiedStatus() {
        PolicyDemo policy = AcademicFixtures.getPolicyDemo();

        assertThat(policy).isNotNull();
        assertThat(policy.getStatus()).isEqualTo("DEMO_UNVERIFIED");

        // 1. Grading scale
        assertThat(policy.getGradingScale().getStatus()).isEqualTo("DEMO_UNVERIFIED");
        for (PolicyDemo.GradeEntry grade : policy.getGradingScale().getGrades()) {
            assertThat(grade.getStatus()).isEqualTo("DEMO_UNVERIFIED");
        }

        // 2. Credit limits
        assertThat(policy.getCreditLimits().getStatus()).isEqualTo("DEMO_UNVERIFIED");
        assertThat(policy.getCreditLimits().getMinCreditsMainSemester()).isEqualTo(10);
        assertThat(policy.getCreditLimits().getMaxCreditsMainSemester()).isEqualTo(24);
        assertThat(policy.getCreditLimits().getMaxCreditsSummerSemester()).isEqualTo(12);

        // 3. Academic risk thresholds
        assertThat(policy.getAcademicRiskThresholds().getStatus()).isEqualTo("DEMO_UNVERIFIED");
        assertThat(policy.getAcademicRiskThresholds().getYear1MinCpa()).isEqualByComparingTo(new BigDecimal("1.20"));
        assertThat(policy.getAcademicRiskThresholds().getYear2MinCpa()).isEqualByComparingTo(new BigDecimal("1.40"));
        assertThat(policy.getAcademicRiskThresholds().getYear3MinCpa()).isEqualByComparingTo(new BigDecimal("1.60"));

        // 4. Retake rules (BR-06)
        assertThat(policy.getRetakeOptimizationRules().getStatus()).isEqualTo("DEMO_UNVERIFIED");
        assertThat(policy.getRetakeOptimizationRules().getEligibleCurrentGrades()).containsExactlyInAnyOrder("D", "D+", "C");

        // 5. Course scheduling weights (PRD §13.1)
        PolicyDemo.CourseSchedulingWeightsConfig weights = policy.getCourseSchedulingWeights();
        assertThat(weights.getStatus()).isEqualTo("DEMO_UNVERIFIED");
        for (PolicyDemo.WeightItem item : weights.allWeights()) {
            assertThat(item.getStatus()).isEqualTo("DEMO_UNVERIFIED");
        }

        // 6. Graduation requirements
        assertThat(policy.getGraduationRequirements().getStatus()).isEqualTo("DEMO_UNVERIFIED");
        assertThat(policy.getGraduationRequirements().getTotalCredits()).isEqualTo(135);
        assertThat(policy.getGraduationRequirements().getThesisEligibilityMinCreditPercent()).isEqualTo(85);

        // 7. Missing data policy
        assertThat(policy.getMissingDataHandlingPolicy().getStatus()).isEqualTo("DEMO_UNVERIFIED");
        assertThat(policy.getMissingDataHandlingPolicy().isAllowDefaultZeroScore()).isFalse();
        assertThat(policy.getMissingDataHandlingPolicy().isAllowDefaultPass()).isFalse();
    }

    @Test
    @DisplayName("Xác minh trọng số thuật toán xếp lịch môn học tối ưu (PRD §13.1) có tổng bằng 1.00 (100%)")
    void testCourseSchedulingWeightsSumToOne() {
        PolicyDemo policy = AcademicFixtures.getPolicyDemo();
        PolicyDemo.CourseSchedulingWeightsConfig weights = policy.getCourseSchedulingWeights();

        double sum = 0.0;
        for (PolicyDemo.WeightItem item : weights.allWeights()) {
            sum += item.getWeight();
        }

        assertThat(sum).isEqualTo(1.00);
        assertThat(weights.getUnblockPrerequisites().getWeight()).isEqualTo(0.40);
        assertThat(weights.getStandardCurriculumProgression().getWeight()).isEqualTo(0.25);
        assertThat(weights.getRetakeRoi().getWeight()).isEqualTo(0.20);
        assertThat(weights.getWorkloadBalance().getWeight()).isEqualTo(0.15);
    }
}
