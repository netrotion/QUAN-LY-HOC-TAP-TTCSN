package vn.haui.advisor.platform.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.haui.advisor.platform.error.ApiException;

/**
 * Các operation đã có trong contracts-v1 nhưng chưa nối với AcademicFacade/AdvisorFacade ở runtime
 * (x-implementation-status: NOT_IMPLEMENTED). Trả 501 với ApiErrorResponse đúng contract thay vì 404.
 */
@RestController
@RequestMapping("/api/v1")
public class NotImplementedController {

    @GetMapping("/academic/status")
    public void getAcademicStatus() {
        throw ApiException.notImplemented("getAcademicStatus");
    }

    @PostMapping("/academic/eligibility")
    public void checkCourseEligibility() {
        throw ApiException.notImplemented("checkCourseEligibility");
    }

    @PostMapping("/planner/generate")
    public void generateStudyPlan() {
        throw ApiException.notImplemented("generateStudyPlan");
    }

    @PostMapping("/planner/reconcile")
    public void reconcileStudyPlan() {
        throw ApiException.notImplemented("reconcileStudyPlan");
    }

    @PostMapping("/simulation/grades")
    public void simulateGrades() {
        throw ApiException.notImplemented("simulateGrades");
    }

    @PostMapping("/simulation/retake-ranking")
    public void rankRetakeCourses() {
        throw ApiException.notImplemented("rankRetakeCourses");
    }

    @PostMapping("/simulation/target-grades")
    public void calculateTargetGrades() {
        throw ApiException.notImplemented("calculateTargetGrades");
    }

    @GetMapping("/audit/graduation")
    public void runGraduationAudit() {
        throw ApiException.notImplemented("runGraduationAudit");
    }

    @PostMapping("/advisor/chat")
    public void chatAdvisor() {
        throw ApiException.notImplemented("chatAdvisor");
    }
}
