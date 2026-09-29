package vn.haui.advisor.academic;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.academic.fixture.AcademicFixtures;
import vn.haui.advisor.academic.model.CurriculumFixture;
import vn.haui.advisor.academic.model.PolicyDemo;
import vn.haui.advisor.academic.model.StudentProfileFixture;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Task 1.3b: Kiểm tra tính hợp lệ và cấu trúc schema của các Fixtures (TV4)")
public class AcademicFixturesSchemaTest {

    @Test
    @DisplayName("Nạp thành công policy-demo, curriculum và student-profiles")
    void testFixturesLoadSuccessfully() {
        PolicyDemo policy = AcademicFixtures.getPolicyDemo();
        assertThat(policy).isNotNull();
        assertThat(policy.getPolicyId()).isEqualTo("policy-haui-demo-2026");

        CurriculumFixture curriculum = AcademicFixtures.getCurriculum();
        assertThat(curriculum).isNotNull();
        assertThat(curriculum.getCurriculumId()).isEqualTo("curriculum-cntt-2024");
        assertThat(curriculum.getTotalCredits()).isEqualTo(135);
        assertThat(curriculum.getCourses()).isNotEmpty();

        Map<String, StudentProfileFixture> profiles = AcademicFixtures.getStudentProfiles();
        assertThat(profiles).isNotNull();
        assertThat(profiles).hasSizeGreaterThanOrEqualTo(4);
        assertThat(profiles).containsKeys("std-2026-001", "std-2026-002", "std-2026-003", "std-2026-missing");
    }

    @Test
    @DisplayName("CTĐT CNTT: Kiểm tra đầy đủ các môn học cốt lõi và quan hệ tiên quyết")
    void testCurriculumCoursesAndPrerequisites() {
        CurriculumFixture curriculum = AcademicFixtures.getCurriculum();

        // Môn Toán rời rạc (MATH1002)
        CurriculumFixture.CourseDefinitionItem math1002 = curriculum.getCourses().stream()
                .filter(c -> "MATH1002".equals(c.getCourseCode()))
                .findFirst().orElse(null);
        assertThat(math1002).isNotNull();
        assertThat(math1002.getCredits()).isEqualTo(3);

        // Môn Cấu trúc dữ liệu & GT (IT6001) yêu cầu tiên quyết MATH1002 và IT1001
        CurriculumFixture.CourseDefinitionItem it6001 = curriculum.getCourses().stream()
                .filter(c -> "IT6001".equals(c.getCourseCode()))
                .findFirst().orElse(null);
        assertThat(it6001).isNotNull();
        assertThat(it6001.getPrerequisites()).contains("MATH1002", "IT1001");

        // Đồ án tốt nghiệp (IT9001) yêu cầu >= 115 TC
        CurriculumFixture.CourseDefinitionItem it9001 = curriculum.getCourses().stream()
                .filter(c -> "IT9001".equals(c.getCourseCode()))
                .findFirst().orElse(null);
        assertThat(it9001).isNotNull();
        assertThat(it9001.getMinCreditsRequiredToEnroll()).isEqualTo(115);
    }
}
