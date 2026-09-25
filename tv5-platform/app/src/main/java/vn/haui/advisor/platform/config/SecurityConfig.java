package vn.haui.advisor.platform.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(authorize -> authorize
                // Chỉ mở các endpoint kỹ thuật bootstrap và health check
                .requestMatchers(
                    "/api/v1/system/bootstrap",
                    "/api/v1/system/health",
                    "/actuator/health"
                ).permitAll()
                // Chặn toàn bộ các endpoint nghiệp vụ khác khi chưa có phiên đăng nhập
                .anyRequest().authenticated()
            )
            .csrf(csrf -> csrf
                // Giữ CSRF cho kiến trúc session cookie
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                // Miễn CSRF cho các endpoint GET kỹ thuật công khai
                .ignoringRequestMatchers(
                    "/api/v1/system/bootstrap",
                    "/api/v1/system/health",
                    "/actuator/health"
                )
            );

        return http.build();
    }
}
