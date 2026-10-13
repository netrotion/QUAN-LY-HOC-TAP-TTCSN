package vn.haui.advisor.contracts.fake;

import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.AcademicFacade;

/**
 * AcademicFacade giả lập trả đúng response fixture của contracts-v1 cho cả 9 capability.
 * Dành cho TV1 (AI/tool adapter) và test phía platform khi chưa cần engine học vụ thật của TV4.
 * Không đọc request ngoài việc yêu cầu khác null; dữ liệu luôn là của sinh viên demo.
 */
public class FixtureAcademicFacade implements AcademicFacade {

    @Override
    public AcademicStatusResponse getAcademicStatus(AcademicStatusRequest request) {
        return ContractFixtures.load("academic-status-response.sample.json", AcademicStatusResponse.class);
    }

    @Override
    public CourseEligibilityResponse checkCourseEligibility(CourseEligibilityRequest request) {
        return ContractFixtures.load("course-eligibility-response.sample.json", CourseEligibilityResponse.class);
    }

    @Override
    public GenerateStudyPlanResponse generateStudyPlan(GenerateStudyPlanRequest request) {
        return ContractFixtures.load("generate-study-plan-response.sample.json", GenerateStudyPlanResponse.class);
    }

    @Override
    public ValidateStudyPlanResponse validateStudyPlan(ValidateStudyPlanRequest request) {
        return ContractFixtures.load("validate-study-plan-response.sample.json", ValidateStudyPlanResponse.class);
    }

    @Override
    public SimulateGradesResponse simulateGrades(SimulateGradesRequest request) {
        return ContractFixtures.load("simulate-grades-response.sample.json", SimulateGradesResponse.class);
    }

    @Override
    public RankRetakeCoursesResponse rankRetakeCourses(RankRetakeCoursesRequest request) {
        return ContractFixtures.load("rank-retake-response.sample.json", RankRetakeCoursesResponse.class);
    }

    @Override
    public CalculateTargetGradesResponse calculateTargetGrades(CalculateTargetGradesRequest request) {
        return ContractFixtures.load("calculate-target-grades-response.sample.json", CalculateTargetGradesResponse.class);
    }

    @Override
    public GraduationAuditResponse runGraduationAudit(GraduationAuditRequest request) {
        return ContractFixtures.load("graduation-audit-response.sample.json", GraduationAuditResponse.class);
    }

    @Override
    public ReconcileStudyPlanResponse reconcileStudyPlan(ReconcileStudyPlanRequest request) {
        return ContractFixtures.load("reconcile-study-plan-response.sample.json", ReconcileStudyPlanResponse.class);
    }
}
