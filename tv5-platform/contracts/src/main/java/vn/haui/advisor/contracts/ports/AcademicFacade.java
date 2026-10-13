package vn.haui.advisor.contracts.ports;

import vn.haui.advisor.contracts.dto.*;

import java.util.Set;

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

    /**
     * Capability đã là công cụ thật (không phải dữ liệu demo/placeholder). Platform chỉ chấp nhận kết quả của
     * capability được khai báo ở đây cho thao tác có hậu quả (vd. chỉ kích hoạt kế hoạch khi VALIDATE_STUDY_PLAN thật);
     * capability chưa khai báo trả NOT_READY. Mặc định chưa khai báo capability nào.
     */
    default Set<AcademicCapability> readyCapabilities() {
        return Set.of();
    }
}
