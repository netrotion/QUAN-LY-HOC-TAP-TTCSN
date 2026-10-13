package vn.haui.advisor.platform.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import vn.haui.advisor.contracts.dto.ApiErrorCode;
import vn.haui.advisor.contracts.dto.ApiErrorResponse;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

/**
 * Lỗi bảo mật trả ApiErrorResponse như mọi lỗi khác: 401 UNAUTHENTICATED khi chưa đăng nhập,
 * 403 ACCESS_DENIED khi thiếu/sai CSRF token hoặc không phải STUDENT.
 */
@Component
public class JsonSecurityErrorHandler implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    public JsonSecurityErrorHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException ex) throws IOException {
        write(response, HttpStatus.UNAUTHORIZED, ApiErrorCode.UNAUTHENTICATED,
                "Bạn chưa đăng nhập hoặc phiên đã hết hạn. Vui lòng đăng nhập lại.");
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException ex) throws IOException {
        write(response, HttpStatus.FORBIDDEN, ApiErrorCode.ACCESS_DENIED,
                "Yêu cầu bị từ chối: thiếu CSRF token hoặc tài khoản không có quyền sinh viên.");
    }

    private void write(HttpServletResponse response, HttpStatus status, ApiErrorCode code, String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        objectMapper.writeValue(response.getOutputStream(),
                new ApiErrorResponse(code, message, "req-" + UUID.randomUUID(), List.of()));
    }
}
