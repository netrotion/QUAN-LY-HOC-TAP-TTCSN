package vn.haui.advisor.platform.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.haui.advisor.contracts.ContractVersion;
import vn.haui.advisor.contracts.dto.AcademicToolReadinessItem;
import vn.haui.advisor.contracts.dto.AcademicToolStatus;
import vn.haui.advisor.platform.academic.AcademicToolGate;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/system")
public class SystemController {

    private final AcademicToolGate academicTools;

    public SystemController(AcademicToolGate academicTools) {
        this.academicTools = academicTools;
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
        modules.put("academic", anyReady ? "PARTIAL" : "NOT_IMPLEMENTED");
        modules.put("advisor", "NOT_IMPLEMENTED");
        modules.put("persistence", "READY");
        response.put("modules", modules);

        response.put("message", "HaUI Advisor đang chạy contracts-v1. Tài khoản, hồ sơ, CTĐT, bảng điểm, kế hoạch và hội thoại lưu trong DB; "
                + "công cụ học vụ chưa thật trả 503 TOOL_NOT_READY (kế hoạch chưa kích hoạt được), endpoint chưa nối trả 501.");
        response.put("academicTools", tools);
        response.put("timestamp", Instant.now().toString());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getHealth() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "UP");
        response.put("service", "haui-platform-app");
        response.put("timestamp", Instant.now().toString());
        response.put("note", "Trạng thái UP chỉ chứng minh tiến trình Spring Boot đang hoạt động, không chứng minh các chức năng nghiệp vụ học vụ đã đạt.");

        return ResponseEntity.ok(response);
    }
}
