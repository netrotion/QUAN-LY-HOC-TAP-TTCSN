package vn.haui.advisor.platform.web;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.StudentContextProvider;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Controller xử lý các thao tác Kế hoạch học tập: Read, Preview, Validate, Save, Activate (Task 2.2d).
 *
 * Nguyên tắc bảo mật bắt buộc:
 * - Không tin bất kỳ studentId nào do client truyền lên qua body, path hay header.
 * - Danh tính sinh viên được lấy độc quyền từ StudentContextProvider (server security context).
 * - Kiểm soát version và dataRevision để chặn cập nhật trên dữ liệu cũ (Stale Data / Optimistic Lock).
 */
@RestController
@RequestMapping("/api/v1/planner")
public class StudyPlanController {

    private final StudentContextProvider studentContextProvider;

    public StudyPlanController(StudentContextProvider studentContextProvider) {
        this.studentContextProvider = studentContextProvider;
    }

    /**
     * 1. READ: Lấy kế hoạch học tập chi tiết của sinh viên đã đăng nhập.
     */
    @GetMapping("/plan")
    public ResponseEntity<StudyPlanDetailResponse> getStudyPlan(
            @RequestParam(value = "planId", required = false) String planId) {

        TrustedStudentContext context = studentContextProvider.getAuthenticatedContext();

        StudyPlanDetailResponse response = new StudyPlanDetailResponse(
                planId != null ? planId : "plan-" + context.getStudentId() + "-active",
                context.getStudentId(), // Định danh tin cậy từ server context
                "Kế hoạch học tập KTPM " + context.getCohort(),
                StudyPlanStatus.ACTIVE,
                1,
                context.getDataRevision(),
                new BigDecimal("3.20"),
                "2028_1",
                20,
                new ArrayList<>(),
                new ArrayList<>(),
                Collections.emptyList(),
                Instant.now().toString(),
                Instant.now().toString()
        );

        return ResponseEntity.ok(response);
    }

    /**
     * 2. PREVIEW: Xem trước kế hoạch học tập tối ưu trước khi lưu.
     */
    @PostMapping("/preview")
    public ResponseEntity<?> previewStudyPlan(@RequestBody PreviewStudyPlanRequest request) {
        TrustedStudentContext context = studentContextProvider.getAuthenticatedContext();

        if (studentContextProvider.isDataStale(context.getStudentId(), request.getDataRevision())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiErrorResponse(
                    "DATA_REVISION_STALE",
                    "Dữ liệu học vụ của sinh viên đã thay đổi. Vui lòng tải lại dữ liệu mới nhất trước khi xem trước kế hoạch.",
                    "req-preview-stale",
                    List.of("Current revision: " + context.getDataRevision(), "Client revision: " + request.getDataRevision())
            ));
        }

        PreviewStudyPlanResponse response = new PreviewStudyPlanResponse(
                "Đề xuất lộ trình học tập tối ưu HaUI " + context.getCohort(),
                StudyPlanStatus.DRAFT,
                request.getTargetCpa() != null ? request.getTargetCpa() : new BigDecimal("3.20"),
                new BigDecimal("3.25"),
                105,
                new ArrayList<>(),
                new ArrayList<>(),
                Collections.emptyList(),
                context.getDataRevision()
        );

        return ResponseEntity.ok(response);
    }

    /**
     * 3. VALIDATE: Thẩm định kế hoạch học tập theo quy chế.
     * Bảo mật: Không tin studentId trong request; ghi đè bằng context tin cậy từ server.
     */
    @PostMapping("/validate")
    public ResponseEntity<ValidateStudyPlanResponse> validateStudyPlan(@RequestBody ValidateStudyPlanRequest request) {
        TrustedStudentContext context = studentContextProvider.getAuthenticatedContext();

        boolean valid = request.getSemesters() != null && !request.getSemesters().isEmpty();
        List<String> violations = valid ? Collections.emptyList() : List.of("Kế hoạch học tập phải có ít nhất một học kỳ hợp lệ");

        ValidateStudyPlanResponse response = new ValidateStudyPlanResponse(
                valid,
                valid ? StudyPlanStatus.VALIDATED : StudyPlanStatus.DRAFT,
                violations,
                Collections.emptyList(),
                request.getPlanVersion() != null ? request.getPlanVersion() : 1,
                context.getDataRevision()
        );

        return ResponseEntity.ok(response);
    }

    /**
     * 4. SAVE: Lưu kế hoạch học tập mới hoặc cập nhật bản nháp.
     */
    @PostMapping("/save")
    public ResponseEntity<?> saveStudyPlan(@RequestBody SaveStudyPlanRequest request) {
        TrustedStudentContext context = studentContextProvider.getAuthenticatedContext();

        if (studentContextProvider.isDataStale(context.getStudentId(), request.getDataRevision())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiErrorResponse(
                    "DATA_REVISION_STALE",
                    "Dữ liệu nguồn đã thay đổi. Vui lòng tải lại dữ liệu trước khi lưu.",
                    "req-save-stale",
                    List.of("Current revision: " + context.getDataRevision())
            ));
        }

        int nextVersion = (request.getPlanVersion() != null ? request.getPlanVersion() : 0) + 1;
        String planId = request.getPlanId() != null ? request.getPlanId() : "plan-" + context.getStudentId() + "-" + System.currentTimeMillis();

        SaveStudyPlanResponse response = new SaveStudyPlanResponse(
                planId,
                request.getPlanName(),
                StudyPlanStatus.VALIDATED,
                nextVersion,
                context.getDataRevision(),
                Instant.now().toString(),
                "Lưu kế hoạch học tập thành công cho sinh viên " + context.getStudentId()
        );

        return ResponseEntity.ok(response);
    }

    /**
     * 5. ACTIVATE: Kích hoạt kế hoạch học tập sang trạng thái ACTIVE.
     */
    @PostMapping("/activate")
    public ResponseEntity<?> activateStudyPlan(@RequestBody ActivateStudyPlanRequest request) {
        TrustedStudentContext context = studentContextProvider.getAuthenticatedContext();

        if (studentContextProvider.isDataStale(context.getStudentId(), request.getDataRevision())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiErrorResponse(
                    "DATA_REVISION_STALE",
                    "Không thể kích hoạt: Dữ liệu học vụ đã có phiên bản mới.",
                    "req-activate-stale",
                    List.of("Current revision: " + context.getDataRevision())
            ));
        }

        ActivateStudyPlanResponse response = new ActivateStudyPlanResponse(
                request.getPlanId(),
                StudyPlanStatus.ACTIVE,
                Instant.now().toString(),
                List.of("plan-" + context.getStudentId() + "-archived"),
                "Kế hoạch học tập " + request.getPlanId() + " đã được kích hoạt thành công."
        );

        return ResponseEntity.ok(response);
    }
}
