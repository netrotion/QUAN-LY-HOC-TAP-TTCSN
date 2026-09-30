package vn.haui.advisor.academic.fixture;

import vn.haui.advisor.academic.model.CurriculumFixture;
import vn.haui.advisor.academic.model.PolicyDemo;
import vn.haui.advisor.academic.model.StudentProfileFixture;

import java.util.Map;

public final class AcademicFixtures {

    private static final PolicyDemo POLICY_DEMO = AcademicFixtureLoader.loadPolicyDemo();
    private static final CurriculumFixture CURRICULUM = AcademicFixtureLoader.loadCurriculum();
    private static final CurriculumFixture CURRICULUM_V1 = AcademicFixtureLoader.loadCurriculumV1();
    private static final Map<String, StudentProfileFixture> STUDENT_PROFILES = AcademicFixtureLoader.loadStudentProfiles();
    private static final Map<String, StudentProfileFixture> STUDENT_PROFILES_V1 = AcademicFixtureLoader.loadStudentProfilesV1();

    private AcademicFixtures() {}

    public static PolicyDemo getPolicyDemo() {
        return POLICY_DEMO;
    }

    public static CurriculumFixture getCurriculum() {
        return CURRICULUM;
    }

    public static CurriculumFixture getCurriculumV1() {
        return CURRICULUM_V1;
    }

    public static Map<String, StudentProfileFixture> getStudentProfiles() {
        return STUDENT_PROFILES;
    }

    public static Map<String, StudentProfileFixture> getStudentProfilesV1() {
        return STUDENT_PROFILES_V1;
    }

    public static StudentProfileFixture getStudentProfile(String studentId) {
        return STUDENT_PROFILES.get(studentId);
    }
}
