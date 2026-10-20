package vn.haui.advisor.platform.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.haui.advisor.contracts.dto.AcademicStatusResponse;
import vn.haui.advisor.contracts.dto.CourseEligibilityRequest;
import vn.haui.advisor.contracts.dto.CourseEligibilityResponse;
import vn.haui.advisor.contracts.dto.CurriculumTreeResponse;
import vn.haui.advisor.contracts.dto.GraduationAuditResponse;
import vn.haui.advisor.contracts.ports.StudentContextProvider;
import vn.haui.advisor.platform.academic.AcademicApiService;

/**
 * Kết quả học vụ của sinh viên đang đăng nhập, tính bởi AcademicFacade thật trên hồ sơ server nạp từ DB.
 */
@RestController
@RequestMapping("/api/v1")
public class AcademicController {

    private final StudentContextProvider studentContextProvider;
    private final AcademicApiService academicApiService;

    public AcademicController(StudentContextProvider studentContextProvider, AcademicApiService academicApiService) {
        this.studentContextProvider = studentContextProvider;
        this.academicApiService = academicApiService;
    }

    @GetMapping("/academic/status")
    public AcademicStatusResponse getAcademicStatus() {
        return academicApiService.status(studentContextProvider.getAuthenticatedContext());
    }

    @PostMapping("/academic/eligibility")
    public CourseEligibilityResponse checkCourseEligibility(@RequestBody(required = false) CourseEligibilityRequest request) {
        return academicApiService.eligibility(studentContextProvider.getAuthenticatedContext(), request);
    }

    @GetMapping("/academic/curriculum/tree")
    public CurriculumTreeResponse getCurriculumTree() {
        return academicApiService.tree(studentContextProvider.getAuthenticatedContext());
    }

    @GetMapping("/audit/graduation")
    public GraduationAuditResponse runGraduationAudit() {
        return academicApiService.audit(studentContextProvider.getAuthenticatedContext());
    }
}
