package vn.haui.advisor.contracts.dto;

/**
 * Capability của AcademicFacade. Implementation khai báo capability nào đã là công cụ thật qua
 * {@link vn.haui.advisor.contracts.ports.AcademicFacade#readyCapabilities()}; chưa khai báo thì platform trả NOT_READY.
 */
public enum AcademicCapability {
    /** getAcademicStatus */
    GET_ACADEMIC_STATUS,
    /** checkCourseEligibility */
    CHECK_COURSE_ELIGIBILITY,
    /** generateStudyPlan */
    GENERATE_STUDY_PLAN,
    /** validateStudyPlan */
    VALIDATE_STUDY_PLAN,
    /** simulateGrades */
    SIMULATE_GRADES,
    /** rankRetakeCourses */
    RANK_RETAKE_COURSES,
    /** calculateTargetGrades */
    CALCULATE_TARGET_GRADES,
    /** runGraduationAudit */
    RUN_GRADUATION_AUDIT,
    /** reconcileStudyPlan */
    RECONCILE_STUDY_PLAN
}
