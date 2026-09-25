package vn.haui.advisor.contracts.ports;

import vn.haui.advisor.contracts.dto.TrustedStudentContext;

/**
 * Port cung cấp thông tin sinh viên đã xác thực từ phiên đăng nhập server.
 * Do platform app (TV5) implement.
 */
public interface StudentContextProvider {

    TrustedStudentContext getAuthenticatedContext();
}
