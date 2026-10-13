package vn.haui.advisor.platform.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import vn.haui.advisor.contracts.dto.LoginRequest;
import vn.haui.advisor.contracts.dto.UpdateStudentProfileRequest;
import vn.haui.advisor.platform.support.TestAccounts;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * CSRF đúng như SPA dùng: đọc cookie XSRF-TOKEN, gửi lại qua header X-XSRF-TOKEN; token đổi sau đăng nhập.
 *
 * Chạy trong context riêng (thuộc tính khác) và KHÔNG dùng post-processor csrf() của spring-security-test,
 * vì post-processor đó thay repository của CsrfFilter dùng chung bằng repository session dành cho test.
 */
@SpringBootTest(properties = "haui.test.context=csrf-cookie")
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("CSRF cookie XSRF-TOKEN + header X-XSRF-TOKEN như SPA")
class CsrfCookieFlowTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TestAccounts accounts;

    @Test
    @DisplayName("Thiếu token → 403; cookie + header → đăng nhập; token cũ trước đăng nhập bị vô hiệu")
    void spaCsrfFlow() throws Exception {
        accounts.ensure("sv-csrf-cookie");
        String login = objectMapper.writeValueAsString(new LoginRequest("sv-csrf-cookie", TestAccounts.PASSWORD));

        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(login))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code", is("ACCESS_DENIED")));

        MvcResult csrf = mockMvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn();
        Cookie anonymousToken = xsrfCookie(csrf);
        assertThat(anonymousToken).isNotNull();
        assertThat(anonymousToken.isHttpOnly()).as("SPA phải đọc được cookie").isFalse();
        JsonNode body = objectMapper.readTree(csrf.getResponse().getContentAsString());
        assertThat(body.get("headerName").asText()).isEqualTo("X-XSRF-TOKEN");
        assertThat(body.get("token").asText()).isEqualTo(anonymousToken.getValue());

        MvcResult loggedIn = mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(login)
                        .cookie(anonymousToken).header("X-XSRF-TOKEN", anonymousToken.getValue()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId", is("sv-csrf-cookie")))
                .andReturn();
        MockHttpSession session = (MockHttpSession) loggedIn.getRequest().getSession(false);
        Cookie sessionToken = xsrfCookie(loggedIn);
        assertThat(sessionToken).as("token mới sau đăng nhập").isNotNull();
        assertThat(sessionToken.getValue()).isNotEqualTo(anonymousToken.getValue());

        String revision = accounts.revision("sv-csrf-cookie");
        String update = objectMapper.writeValueAsString(new UpdateStudentProfileRequest(null, null, "LOP-CSRF", null, null, revision));
        mockMvc.perform(put("/api/v1/students/me").session(session).contentType(MediaType.APPLICATION_JSON).content(update)
                        .cookie(sessionToken).header("X-XSRF-TOKEN", anonymousToken.getValue()))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/v1/students/me").session(session).contentType(MediaType.APPLICATION_JSON).content(update)
                        .cookie(sessionToken).header("X-XSRF-TOKEN", sessionToken.getValue()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.className", is("LOP-CSRF")));
    }

    /** Cookie XSRF-TOKEN có giá trị cuối cùng trong response (đăng nhập xóa token cũ rồi đặt token mới). */
    private static Cookie xsrfCookie(MvcResult result) {
        Cookie found = null;
        for (Cookie cookie : result.getResponse().getCookies()) {
            if ("XSRF-TOKEN".equals(cookie.getName()) && !cookie.getValue().isEmpty()) {
                found = cookie;
            }
        }
        return found;
    }
}
