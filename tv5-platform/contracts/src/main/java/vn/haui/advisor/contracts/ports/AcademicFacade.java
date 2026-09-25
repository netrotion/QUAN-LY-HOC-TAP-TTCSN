package vn.haui.advisor.contracts.ports;

import vn.haui.advisor.contracts.dto.*;

/**
 * Port giao tiếp học vụ do module TV4 implement.
 * Nhận context + policy + mục tiêu; không phụ thuộc HTTP, Database, LLM.
 */
public interface AcademicFacade {

    AcademicStatusResponse getAcademicStatus(AcademicStatusRequest request);

    CourseEligibilityResponse checkCourseEligibility(CourseEligibilityRequest request);

    GenerateStudyPlanResponse generateStudyPlan(GenerateStudyPlanRequest request);

    ValidateStudyPlanResponse validateStudyPlan(ValidateStudyPlanRequest request);

    SimulateGradesResponse simulateGrades(SimulateGradesRequest request);

    RankRetakeCoursesResponse rankRetakeCourses(RankRetakeCoursesRequest request);

    CalculateTargetGradesResponse calculateTargetGrades(CalculateTargetGradesRequest request);

    GraduationAuditResponse runGraduationAudit(GraduationAuditRequest request);

    ReconcileStudyPlanResponse reconcileStudyPlan(ReconcileStudyPlanRequest request);
}
