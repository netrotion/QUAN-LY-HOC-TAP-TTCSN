package vn.haui.advisor.platform.web;

import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
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
        return ResponseEntity.status(ex.getStatus())
                .body(new ApiErrorResponse(ex.getCode(), ex.getMessage(), newRequestId(), ex.getDetails()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleUnreadableBody(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest()
                .body(new ApiErrorResponse(ApiErrorCode.VALIDATION_ERROR,
                        "Body request không đúng định dạng JSON của contracts-v1.", newRequestId(),
                        List.of(ex.getMostSpecificCause().getMessage())));
    }

    private static String newRequestId() {
        return "req-" + UUID.randomUUID();
    }
}
