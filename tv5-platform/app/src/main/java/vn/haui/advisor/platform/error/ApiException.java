package vn.haui.advisor.platform.error;

import org.springframework.http.HttpStatus;
import vn.haui.advisor.contracts.dto.ApiErrorCode;

import java.util.List;

/**
 * Lỗi nghiệp vụ mang sẵn HTTP status và mã lỗi contracts-v1; ApiExceptionHandler chuyển thành ApiErrorResponse.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final ApiErrorCode code;
    private final List<String> details;

    public ApiException(HttpStatus status, ApiErrorCode code, String message, List<String> details) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }

    public static ApiException notFound(String planId) {
        return new ApiException(HttpStatus.NOT_FOUND, ApiErrorCode.PLAN_NOT_FOUND,
                "Không tìm thấy kế hoạch học tập.", List.of("planId: " + planId));
    }

    public static ApiException badRequest(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, ApiErrorCode.VALIDATION_ERROR, message, List.of());
    }

    public static ApiException staleRevision(String currentRevision, String clientRevision) {
        return new ApiException(HttpStatus.CONFLICT, ApiErrorCode.DATA_REVISION_STALE,
                "Dữ liệu học vụ đã thay đổi. Vui lòng tải lại dữ liệu mới nhất rồi thực hiện lại.",
                List.of("Revision hiện hành: " + currentRevision, "Revision client gửi: " + clientRevision));
    }

    public static ApiException versionConflict(int currentVersion, Integer clientVersion) {
        return new ApiException(HttpStatus.CONFLICT, ApiErrorCode.PLAN_VERSION_CONFLICT,
                "Kế hoạch đã được lưu ở nơi khác. Vui lòng tải lại kế hoạch trước khi tiếp tục.",
                List.of("planVersion hiện hành: " + currentVersion, "planVersion client gửi: " + clientVersion));
    }

    public static ApiException notImplemented(String operationId) {
        return new ApiException(HttpStatus.NOT_IMPLEMENTED, ApiErrorCode.NOT_IMPLEMENTED,
                "Chức năng chưa được nối ở runtime hiện tại.", List.of("operationId: " + operationId));
    }

    public HttpStatus getStatus() {
        return status;
    }

    public ApiErrorCode getCode() {
        return code;
    }

    public List<String> getDetails() {
        return details;
    }
}
