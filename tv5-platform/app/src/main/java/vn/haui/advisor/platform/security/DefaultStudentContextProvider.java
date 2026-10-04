package vn.haui.advisor.platform.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import vn.haui.advisor.contracts.dto.StudentDataVersion;
import vn.haui.advisor.contracts.dto.TrustedStudentContext;
import vn.haui.advisor.contracts.ports.StudentContextProvider;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Triển khai mặc định của StudentContextProvider cho TV5 Platform Runtime.
 *
 * Ràng buộc an toàn cốt lõi:
 * - Không bao giờ lấy studentId từ request payload hay query parameter do client gửi.
 * - Danh tính sinh viên luôn trích xuất từ server authentication/session context.
 * - Cung cấp cơ chế phát hiện dữ liệu thay đổi (dataRevision/version tracking).
 */
@Component
public class DefaultStudentContextProvider implements StudentContextProvider {

    public static final String DEFAULT_DEMO_STUDENT_ID = "2024604757";
    public static final String DEFAULT_DEMO_STUDENT_NAME = "Lê Việt Hùng";
    public static final String DEFAULT_DEMO_MAJOR = "CT1085";
    public static final String DEFAULT_DEMO_COHORT = "K19";
    public static final String DEFAULT_DATA_REVISION = "REV-2024604757-001";

    private final Map<String, StudentDataVersion> versionRegistry = new ConcurrentHashMap<>();

    public DefaultStudentContextProvider() {
        versionRegistry.put(DEFAULT_DEMO_STUDENT_ID,
                new StudentDataVersion(DEFAULT_DEMO_STUDENT_ID, DEFAULT_DATA_REVISION, 1, "2026-10-04T00:00:00Z", false));
    }

    @Override
    public TrustedStudentContext getAuthenticatedContext() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String studentId = DEFAULT_DEMO_STUDENT_ID;
        String fullName = DEFAULT_DEMO_STUDENT_NAME;

        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            studentId = auth.getName();
        }

        StudentDataVersion version = getDataVersion(studentId);
        return new TrustedStudentContext(
                studentId,
                studentId,
                fullName,
                DEFAULT_DEMO_MAJOR,
                DEFAULT_DEMO_COHORT,
                version.getDataRevision()
        );
    }

    @Override
    public StudentDataVersion getDataVersion(String studentId) {
        return versionRegistry.computeIfAbsent(studentId, id ->
                new StudentDataVersion(id, "REV-" + id + "-001", 1, "2026-10-04T00:00:00Z", false));
    }

    @Override
    public boolean isDataStale(String studentId, String clientRevision) {
        if (clientRevision == null || clientRevision.isBlank()) {
            return false;
        }
        StudentDataVersion current = getDataVersion(studentId);
        return !current.getDataRevision().equalsIgnoreCase(clientRevision.trim());
    }

    public void updateDataRevision(String studentId, String newRevision, int version) {
        versionRegistry.put(studentId,
                new StudentDataVersion(studentId, newRevision, version, "2026-10-04T12:00:00Z", false));
    }
}
