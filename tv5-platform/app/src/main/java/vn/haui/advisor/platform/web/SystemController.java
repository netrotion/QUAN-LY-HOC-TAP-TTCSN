package vn.haui.advisor.platform.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.haui.advisor.contracts.ContractVersion;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/system")
public class SystemController {

    @GetMapping("/bootstrap")
    public ResponseEntity<Map<String, Object>> getBootstrapInfo() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("contractVersion", ContractVersion.CURRENT);
        response.put("contractMilestone", ContractVersion.MILESTONE);
        response.put("runtimeMode", "in-memory");

        Map<String, String> modules = new LinkedHashMap<>();
        modules.put("contracts", "READY");
        modules.put("academic", "NOT_IMPLEMENTED");
        modules.put("advisor", "NOT_IMPLEMENTED");
        modules.put("persistence", "IN_MEMORY");
        response.put("modules", modules);

        response.put("message", "HaUI Advisor đang chạy contracts-v1. Planner lưu trong bộ nhớ; các endpoint học vụ và AI trả 501 cho tới khi được nối.");
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
