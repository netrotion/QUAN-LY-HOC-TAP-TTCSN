package vn.haui.advisor.platform.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.haui.advisor.contracts.ContractVersion;
import vn.haui.advisor.contracts.dto.AcademicToolReadinessItem;
import vn.haui.advisor.contracts.dto.AcademicToolStatus;
import vn.haui.advisor.platform.academic.AcademicToolGate;
import vn.haui.advisor.platform.advisor.AdvisorReadiness;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/system")
public class SystemController {

    private final AcademicToolGate academicTools;
    private final AdvisorReadiness advisorReadiness;

    public SystemController(AcademicToolGate academicTools, AdvisorReadiness advisorReadiness) {
        this.academicTools = academicTools;
        this.advisorReadiness = advisorReadiness;
    }

    @GetMapping("/bootstrap")
    public ResponseEntity<Map<String, Object>> getBootstrapInfo() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("contractVersion", ContractVersion.CURRENT);
        response.put("contractMilestone", ContractVersion.MILESTONE);
        response.put("runtimeMode", "database");

        Map<String, String> modules = new LinkedHashMap<>();
        modules.put("contracts", "READY");
        List<AcademicToolReadinessItem> tools = academicTools.readiness();
        boolean anyReady = tools.stream().anyMatch(t -> t.getStatus() == AcademicToolStatus.READY);
        boolean allReady = tools.stream().allMatch(t -> t.getStatus() == AcademicToolStatus.READY);
        modules.put("academic", allReady ? "READY" : anyReady ? "PARTIAL" : "NOT_IMPLEMENTED");
        // READY | DEGRADED | NOT_CONFIGURED | MOCK — thiếu AI chỉ ảnh hưởng Chat
        modules.put("advisor", advisorReadiness.status().name());
        modules.put("persistence", "READY");
        response.put("modules", modules);

        response.put("message", "HaUI Advisor đang chạy contracts-v1. Tài khoản, hồ sơ, CTĐT, bảng điểm, kế hoạch và hội thoại lưu trong DB; "
                + "công cụ học vụ (trạng thái, điều kiện, cây CTĐT, rà soát, kế hoạch, What-if, đối chiếu) tính bởi AcademicFacade "
                + "trên hồ sơ DB; Chat chạy AdvisorFacade. Công cụ học vụ chưa thật trả 503 TOOL_NOT_READY (xem academicTools); "
                + "trợ lý AI không trả lời được trả 503 AI_UNAVAILABLE (xem modules.advisor).");
        response.put("academicTools", tools);
        response.put("timestamp", Instant.now().toString());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getHealth() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "UP");
        response.put("service", "haui-platform-app");
        // Trợ lý AI báo riêng, không ảnh hưởng status của ứng dụng
        response.put("advisor", advisorReadiness.status().name());
        response.put("timestamp", Instant.now().toString());
        response.put("note", "Trạng thái UP chỉ chứng minh tiến trình Spring Boot đang hoạt động, không chứng minh các chức năng nghiệp vụ học vụ đã đạt.");

        return ResponseEntity.ok(response);
    }
}
