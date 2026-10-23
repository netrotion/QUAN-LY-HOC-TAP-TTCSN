package vn.haui.advisor.platform.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.authentication.session.CompositeSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfAuthenticationStrategy;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import vn.haui.advisor.contracts.dto.AccountRole;
import vn.haui.advisor.platform.security.CsrfCookieFilter;
import vn.haui.advisor.platform.security.JsonSecurityErrorHandler;
import vn.haui.advisor.platform.security.StudentUserDetailsService;

import java.util.List;

/**
 * Bảo mật contracts 1.1: session cookie (JSESSIONID, HttpOnly) + CSRF cookie XSRF-TOKEN/header X-XSRF-TOKEN
 * cho mọi request ghi (kể cả login), chỉ vai trò STUDENT truy cập API nghiệp vụ.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CookieCsrfTokenRepository csrfTokenRepository() {
        CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        repository.setCookieCustomizer(cookie -> cookie.path("/").sameSite("Lax"));
        return repository;
    }

    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    public AuthenticationManager authenticationManager(StudentUserDetailsService userDetailsService, PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return new ProviderManager(provider);
    }

    /** Đăng nhập: đổi session id (chống session fixation) và cấp CSRF token mới. */
    @Bean
    public SessionAuthenticationStrategy sessionAuthenticationStrategy(CookieCsrfTokenRepository csrfTokenRepository) {
        CsrfAuthenticationStrategy csrfStrategy = new CsrfAuthenticationStrategy(csrfTokenRepository);
        csrfStrategy.setRequestHandler(new CsrfTokenRequestAttributeHandler());
        return new CompositeSessionAuthenticationStrategy(List.of(new ChangeSessionIdAuthenticationStrategy(), csrfStrategy));
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JsonSecurityErrorHandler errorHandler,
                                                   CookieCsrfTokenRepository csrfTokenRepository,
                                                   SecurityContextRepository securityContextRepository) throws Exception {
        http
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/error").permitAll()
                .requestMatchers(HttpMethod.GET,
                    "/api/v1/system/bootstrap",
                    "/api/v1/system/health",
                    "/actuator/health",
                    "/actuator/health/advisor",
                    "/api/v1/auth/csrf",
                    "/api/v1/auth/session"
                ).permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/auth/login", "/api/v1/auth/register").permitAll()
                .requestMatchers("/api/v1/**").hasRole(AccountRole.STUDENT.name())
                .anyRequest().denyAll()
            )
            .csrf(csrf -> csrf
                // SPA đọc cookie XSRF-TOKEN và gửi nguyên giá trị qua header X-XSRF-TOKEN
                .csrfTokenRepository(csrfTokenRepository)
                .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
            )
            .addFilterAfter(new CsrfCookieFilter(), BasicAuthenticationFilter.class)
            .securityContext(context -> context.securityContextRepository(securityContextRepository))
            .sessionManagement(session -> session.sessionFixation(fixation -> fixation.changeSessionId()))
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(errorHandler)
                .accessDeniedHandler(errorHandler)
            )
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .logout(logout -> logout
                .logoutUrl("/api/v1/auth/logout")
                .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT))
                .deleteCookies("JSESSIONID")
            );

        return http.build();
    }
}
