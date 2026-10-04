package vn.haui.advisor.contracts.ports;

import vn.haui.advisor.contracts.dto.StudentDataVersion;
import vn.haui.advisor.contracts.dto.TrustedStudentContext;

/**
 * Port cung cấp thông tin sinh viên đã xác thực từ phiên đăng nhập server
 * và theo dõi phiên bản để phát hiện dữ liệu thay đổi (Task 2.2d).
 * Do platform app (TV5) implement.
 *
 * Nguyên tắc bảo mật: Không lấy studentId từ request client.
 */
public interface StudentContextProvider {

    /**
     * Lấy thông tin sinh viên tin cậy từ phiên bảo mật của server.
     */
    TrustedStudentContext getAuthenticatedContext();

    /**
     * Lấy thông tin phiên bản dữ liệu hiện tại của sinh viên.
     *
     * @param studentId định danh sinh viên được tin cậy
     * @return DTO phiên bản dữ liệu
     */
    StudentDataVersion getDataVersion(String studentId);

    /**
     * Kiểm tra phiên bản dữ liệu từ client có bị cũ (stale) so với nguồn dữ liệu hiện tại không.
     *
     * @param studentId định danh sinh viên được tin cậy
     * @param clientRevision chuỗi revision do client cung cấp
     * @return true nếu dữ liệu đã bị thay đổi (stale), false nếu phiên bản khớp
     */
    boolean isDataStale(String studentId, String clientRevision);
}
