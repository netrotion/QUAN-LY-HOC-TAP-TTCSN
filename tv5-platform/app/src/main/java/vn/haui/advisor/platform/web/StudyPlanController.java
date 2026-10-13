package vn.haui.advisor.platform.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.StudentContextProvider;
import vn.haui.advisor.platform.planner.StudyPlanService;

/**
 * Endpoint Kế hoạch học tập theo contracts-v1 (openapi-v1.yaml, tag Planner).
 *
 * Nguyên tắc bảo mật bắt buộc:
 * - Không tin bất kỳ studentId nào do client truyền lên qua body, path hay header.
 * - Danh tính sinh viên được lấy độc quyền từ StudentContextProvider (server security context).
 * - Kiểm soát dataRevision và planVersion để chặn cập nhật trên dữ liệu cũ.
 */
@RestController
@RequestMapping("/api/v1/planner")
public class StudyPlanController {

    private final StudentContextProvider studentContextProvider;
    private final StudyPlanService studyPlanService;

    public StudyPlanController(StudentContextProvider studentContextProvider, StudyPlanService studyPlanService) {
        this.studentContextProvider = studentContextProvider;
        this.studyPlanService = studyPlanService;
    }

    @GetMapping("/plans")
    public StudyPlanListResponse listStudyPlans() {
        return studyPlanService.list(studentContextProvider.getAuthenticatedContext());
    }

    @PostMapping("/plans")
    public SaveStudyPlanResponse saveStudyPlan(@RequestBody SaveStudyPlanRequest request) {
        return studyPlanService.save(studentContextProvider.getAuthenticatedContext(), request);
    }

    @GetMapping("/plans/{planId}")
    public StudyPlanDetailResponse getStudyPlan(@PathVariable String planId) {
        return studyPlanService.get(studentContextProvider.getAuthenticatedContext(), planId);
    }

    /** Hủy bản nháp; planVersion là phiên bản client đang giữ. */
    @DeleteMapping("/plans/{planId}")
    public ResponseEntity<Void> deleteStudyPlan(@PathVariable String planId,
                                                @RequestParam(required = false) Integer planVersion) {
        studyPlanService.delete(studentContextProvider.getAuthenticatedContext(), planId, planVersion);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/plans/{planId}/activate")
    public ActivateStudyPlanResponse activateStudyPlan(@PathVariable String planId,
                                                       @RequestBody(required = false) ActivateStudyPlanRequest request) {
        return studyPlanService.activate(studentContextProvider.getAuthenticatedContext(), planId, request);
    }

    @PostMapping("/plans/{planId}/restore")
    public StudyPlanDetailResponse restoreStudyPlan(@PathVariable String planId,
                                                    @RequestBody(required = false) RestoreStudyPlanRequest request) {
        return studyPlanService.restore(studentContextProvider.getAuthenticatedContext(), planId, request);
    }

    /**
     * Thẩm định bằng AcademicFacade. studentId trong body (nếu client gửi) bị bỏ qua.
     */
    @PostMapping("/validate")
    public ValidateStudyPlanResponse validateStudyPlan(@RequestBody ValidateStudyPlanRequest request) {
        return studyPlanService.validate(studentContextProvider.getAuthenticatedContext(), request);
    }
}
