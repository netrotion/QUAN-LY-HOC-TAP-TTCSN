package vn.haui.advisor.contracts.fake;

import vn.haui.advisor.contracts.dto.StudentDataVersion;
import vn.haui.advisor.contracts.dto.TrustedStudentContext;
import vn.haui.advisor.contracts.ports.StudentContextProvider;

import java.time.Instant;

/**
 * StudentContextProvider giả lập: luôn trả sinh viên demo của fixtures.
 * Đổi dataRevision bằng {@link #changeDataRevision(String)} để mô phỏng dữ liệu học vụ vừa thay đổi.
 */
public class FixedStudentContextProvider implements StudentContextProvider {

    private volatile String dataRevision = ContractFixtures.DEMO_DATA_REVISION;
    private volatile String updatedAt = "2026-10-01T08:00:00Z";

    @Override
    public TrustedStudentContext getAuthenticatedContext() {
        return new TrustedStudentContext(
                ContractFixtures.DEMO_STUDENT_ID,
                ContractFixtures.DEMO_STUDENT_ID,
                "Lê Việt Hùng",
                "CT1085",
                "K19",
                dataRevision
        );
    }

    @Override
    public StudentDataVersion getDataVersion(String studentId) {
        return new StudentDataVersion(studentId, dataRevision, updatedAt, false);
    }

    @Override
    public boolean isDataStale(String studentId, String clientRevision) {
        return clientRevision != null && !clientRevision.isBlank() && !dataRevision.equals(clientRevision.trim());
    }

    public void changeDataRevision(String newRevision) {
        this.dataRevision = newRevision;
        this.updatedAt = Instant.now().toString();
    }
}
