package vn.haui.advisor.platform.web;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import vn.haui.advisor.contracts.dto.ApiErrorCode;
import vn.haui.advisor.contracts.dto.ApiErrorResponse;
import vn.haui.advisor.platform.error.ApiException;

import java.util.List;
import java.util.UUID;

/**
 * Chuyển lỗi nghiệp vụ thành body ApiErrorResponse thống nhất của contracts-v1.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiErrorResponse> handleApiException(ApiException ex) {
        ApiErrorResponse body = new ApiErrorResponse(ex.getCode(), ex.getMessage(), newRequestId(), ex.getDetails());
        ResponseEntity.BodyBuilder response = ResponseEntity.status(ex.getStatus());
        if (ex.getRetryAfterSeconds() != null) {
            // Lỗi tạm thời: client gửi lại cùng yêu cầu được, sau Retry-After giây
            body.setRetryable(true);
            response.header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()));
        }
        return response.body(body);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleUnreadableBody(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest()
                .body(new ApiErrorResponse(ApiErrorCode.VALIDATION_ERROR,
                        "Body request không đúng định dạng JSON của contracts-v1.", newRequestId(),
                        List.of(ex.getMostSpecificCause().getMessage())));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiErrorResponse> handleUploadTooLarge(MaxUploadSizeExceededException ex) {
        return handleApiException(ApiException.uploadTooLarge("Vượt giới hạn dung lượng tải lên của máy chủ"));
    }

    @ExceptionHandler({MissingServletRequestPartException.class, MultipartException.class})
    public ResponseEntity<ApiErrorResponse> handleMissingFile(Exception ex) {
        return handleApiException(ApiException.badRequest("Cần gửi file bảng điểm trong trường multipart 'file'."));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return handleApiException(ApiException.badRequest("Tham số " + ex.getName() + " sai kiểu dữ liệu."));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiErrorResponse> handleMediaType(HttpMediaTypeNotSupportedException ex) {
        return handleApiException(ApiException.badRequest("Content-Type không đúng với operation: " + ex.getContentType()));
    }

    /** Không lấy được context sinh viên (chưa đăng nhập / phiên hết hạn) khi controller đọc StudentContextProvider. */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiErrorResponse> handleAuthentication(AuthenticationException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ApiErrorResponse(ApiErrorCode.UNAUTHENTICATED,
                        "Bạn chưa đăng nhập hoặc phiên đã hết hạn. Vui lòng đăng nhập lại.", newRequestId(), List.of()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ApiErrorResponse(ApiErrorCode.ACCESS_DENIED,
                        "Yêu cầu bị từ chối: thiếu CSRF token hoặc tài khoản không có quyền sinh viên.", newRequestId(), List.of()));
    }

    private static String newRequestId() {
        return "req-" + UUID.randomUUID();
    }
}
