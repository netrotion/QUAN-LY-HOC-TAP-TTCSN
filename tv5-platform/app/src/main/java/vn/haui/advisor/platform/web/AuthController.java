package vn.haui.advisor.platform.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.platform.account.AccountService;
import vn.haui.advisor.platform.error.ApiException;
import vn.haui.advisor.platform.student.StudentRepository;

import java.time.Instant;
import java.util.List;

/**
 * Tài khoản HaUI Advisor: CSRF token, trạng thái phiên, đăng nhập, đăng ký (đăng xuất do LogoutFilter xử lý).
 * Không đăng nhập hay crawl cổng thông tin của trường.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final SessionAuthenticationStrategy sessionAuthenticationStrategy;
    private final SecurityContextRepository securityContextRepository;
    private final AccountService accountService;
    private final StudentRepository studentRepository;

    public AuthController(AuthenticationManager authenticationManager, SessionAuthenticationStrategy sessionAuthenticationStrategy,
                          SecurityContextRepository securityContextRepository, AccountService accountService,
                          StudentRepository studentRepository) {
        this.authenticationManager = authenticationManager;
        this.sessionAuthenticationStrategy = sessionAuthenticationStrategy;
        this.securityContextRepository = securityContextRepository;
        this.accountService = accountService;
        this.studentRepository = studentRepository;
    }

    @GetMapping("/csrf")
    public CsrfTokenResponse csrf(HttpServletRequest request) {
        CsrfToken token = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        return new CsrfTokenResponse(token.getHeaderName(), token.getParameterName(), token.getToken());
    }

    @GetMapping("/session")
    public AuthSessionResponse session() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            return new AuthSessionResponse(false, null, null, null);
        }
        return sessionOf(auth.getName());
    }

    @PostMapping("/login")
    public AuthSessionResponse login(@RequestBody LoginRequest body, HttpServletRequest request, HttpServletResponse response) {
        if (body.getStudentId() == null || body.getPassword() == null) {
            throw ApiException.badRequest("Cần nhập mã sinh viên và mật khẩu.");
        }
        return authenticate(body.getStudentId().trim(), body.getPassword(), request, response);
    }

    @PostMapping("/register")
    public AuthSessionResponse register(@RequestBody RegisterAccountRequest body, HttpServletRequest request,
                                        HttpServletResponse response) {
        accountService.register(body);
        return authenticate(body.getStudentId().trim(), body.getPassword(), request, response);
    }

    private AuthSessionResponse authenticate(String studentId, String password, HttpServletRequest request,
                                             HttpServletResponse response) {
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(studentId, password));
        } catch (AuthenticationException ex) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, ApiErrorCode.INVALID_CREDENTIALS,
                    "Mã sinh viên hoặc mật khẩu không đúng.", List.of());
        }

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        request.getSession(true);
        sessionAuthenticationStrategy.onAuthentication(authentication, request, response);
        securityContextRepository.saveContext(context, request, response);
        // Sinh CSRF token mới sau khi đăng nhập để cookie XSRF-TOKEN được cập nhật ngay trong response này
        CsrfToken token = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        if (token != null) {
            token.getToken();
        }
        studentRepository.touchLogin(authentication.getName(), Instant.now());
        return sessionOf(authentication.getName());
    }

    private AuthSessionResponse sessionOf(String username) {
        return studentRepository.findByUsername(username)
                .map(student -> new AuthSessionResponse(true, student.studentId(), student.fullName(), AccountRole.STUDENT))
                .orElse(new AuthSessionResponse(false, null, null, null));
    }
}
