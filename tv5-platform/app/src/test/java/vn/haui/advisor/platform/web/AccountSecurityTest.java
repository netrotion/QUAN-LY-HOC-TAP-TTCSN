package vn.haui.advisor.platform.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.platform.support.TestAccounts;
import vn.haui.advisor.platform.support.TranscriptFiles;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Task 3.2: session cookie + CSRF, chỉ STUDENT, truy vấn theo principal — hai tài khoản không đọc chéo.
 * Đăng nhập thật qua /auth/login (không dùng mock user) để kiểm tra đúng cơ chế session.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Tài khoản: session cookie, CSRF, chỉ STUDENT, không đọc chéo")
class AccountSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TestAccounts accounts;

    @Autowired
    private JdbcClient jdbc;

    @Test
    @DisplayName("Đăng nhập đổi session id (chống fixation), sai mật khẩu → 401, đăng xuất hủy phiên")
    void loginLifecycle() throws Exception {
        accounts.ensure("sv-session");
        mockMvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new LoginRequest("sv-session", "sai-mat-khau"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("INVALID_CREDENTIALS")));

        MockHttpSession anonymous = new MockHttpSession();
        String before = anonymous.getId();
        MvcResult login = mockMvc.perform(post("/api/v1/auth/login").with(csrf()).session(anonymous)
                        .contentType(MediaType.APPLICATION_JSON).content(json(new LoginRequest("sv-session", TestAccounts.PASSWORD))))
                .andExpect(status().isOk()).andReturn();
        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);
        assertThat(session.getId()).isNotEqualTo(before);

        mockMvc.perform(get("/api/v1/auth/session").session(session)).andExpect(jsonPath("$.studentId", is("sv-session")));
        mockMvc.perform(get("/api/v1/students/me").session(session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId", is("sv-session")));

        mockMvc.perform(post("/api/v1/auth/logout").with(csrf()).session(session)).andExpect(status().isNoContent());
        mockMvc.perform(get("/api/v1/students/me").session(session)).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/auth/session").session(session)).andExpect(jsonPath("$.authenticated", is(false)));
    }

    @Test
    @DisplayName("Đăng ký tạo tài khoản STUDENT, đăng nhập luôn; trùng mã → 409; dữ liệu sai → 400")
    void registerAccount() throws Exception {
        RegisterAccountRequest request = new RegisterAccountRequest("sv-register", "mat-khau-moi-123", "Nguyễn Thu Hà",
                "thuha@example.com", "2024DHKTPM01", "K19", TestAccounts.CURRICULUM_ID);
        MvcResult result = mockMvc.perform(post("/api/v1/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authenticated", is(true)))
                .andReturn();
        MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
        mockMvc.perform(get("/api/v1/students/me").session(session))
                .andExpect(jsonPath("$.fullName", is("Nguyễn Thu Hà")))
                .andExpect(jsonPath("$.transcriptStatus", is("NONE")))
                .andExpect(jsonPath("$.dataRevision", is("REV-sv-register-001")));

        mockMvc.perform(post("/api/v1/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json(request)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code", is("ACCOUNT_ALREADY_EXISTS")));
        request.setStudentId("sv-register-2");
        request.setPassword("ngan");
        mockMvc.perform(post("/api/v1/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json(request)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code", is("VALIDATION_ERROR")));
        request.setPassword("mat-khau-moi-123");
        request.setCurriculumId("ctdt-khong-co");
        mockMvc.perform(post("/api/v1/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json(request)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code", is("CURRICULUM_NOT_FOUND")));

        String hash = jdbc.sql("SELECT password_hash FROM users WHERE username = 'sv-register'").query(String.class).single();
        assertThat(hash).startsWith("$2").doesNotContain("mat-khau-moi-123");
    }

    @Test
    @WithMockUser(username = "quan-tri", roles = "ADMIN")
    @DisplayName("Chỉ STUDENT: phiên có vai trò khác bị 403")
    void nonStudentRoleIsForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/students/me")).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code", is("ACCESS_DENIED")));
    }

    @Test
    @DisplayName("Tài khoản vai trò khác STUDENT trong DB không đăng nhập được")
    void nonStudentAccountCannotLogin() throws Exception {
        accounts.ensure("sv-admin-role");
        jdbc.sql("UPDATE users SET role = 'ADMIN' WHERE username = 'sv-admin-role'").update();
        mockMvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new LoginRequest("sv-admin-role", TestAccounts.PASSWORD))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Hai tài khoản không đọc chéo: hồ sơ, bảng điểm, phiên nhập, chứng chỉ, kế hoạch")
    void twoAccountsCannotReadEachOther() throws Exception {
        accounts.ensure("sv-alpha");
        accounts.ensure("sv-beta");
        MockHttpSession alpha = login("sv-alpha");
        MockHttpSession beta = login("sv-beta");

        // A nhập bảng điểm, khai báo chứng chỉ, lưu kế hoạch
        JsonNode upload = upload(alpha, List.of("Ma sinh vien: sv-alpha", "Hoc ky 1 nam hoc 2024-2025",
                "IT6015 Ky thuat lap trinh 3 9.3 A"));
        String importId = upload.get("importSessionId").asText();
        String revision = accounts.revision("sv-alpha");
        mockMvc.perform(post("/api/v1/academic/transcript/imports/" + importId + "/confirm").with(csrf()).session(alpha)
                        .contentType(MediaType.APPLICATION_JSON).content(json(new ConfirmTranscriptImportRequest(1, revision))))
                .andExpect(status().isOk());
        mockMvc.perform(put("/api/v1/academic/certificates/IT_SKILLS").with(csrf()).session(alpha)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new DeclareCertificateRequest(CertificateStatus.ACHIEVED, "MOS Excel", "2026-09-01",
                                accounts.revision("sv-alpha")))))
                .andExpect(status().isOk());
        MvcResult plan = mockMvc.perform(post("/api/v1/planner/plans").with(csrf()).session(alpha)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new SaveStudyPlanRequest(null, "Kế hoạch của A", null, accounts.revision("sv-alpha"),
                                new BigDecimal("3.2"), "2028_1", 20, List.of(), List.of()))))
                .andExpect(status().isOk()).andReturn();
        String planId = objectMapper.readTree(plan.getResponse().getContentAsString()).get("planId").asText();

        // B chỉ thấy dữ liệu của B
        mockMvc.perform(get("/api/v1/students/me").session(beta)).andExpect(jsonPath("$.studentId", is("sv-beta")));
        mockMvc.perform(get("/api/v1/academic/transcript").session(beta))
                .andExpect(jsonPath("$.studentId", is("sv-beta")))
                .andExpect(jsonPath("$.transcriptStatus", is("NONE")))
                .andExpect(jsonPath("$.attempts.length()", is(0)));
        mockMvc.perform(get("/api/v1/academic/transcript/imports").session(beta)).andExpect(jsonPath("$.sessions.length()", is(0)));
        mockMvc.perform(get("/api/v1/academic/transcript/imports/" + importId).session(beta))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code", is("IMPORT_SESSION_NOT_FOUND")));
        mockMvc.perform(post("/api/v1/academic/transcript/imports/" + importId + "/cancel").with(csrf()).session(beta))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/academic/certificates").session(beta))
                .andExpect(jsonPath("$.certificates[?(@.requirementCode == 'IT_SKILLS')].verification", org.hamcrest.Matchers.contains("NOT_DECLARED")));
        mockMvc.perform(get("/api/v1/planner/plans/" + planId).session(beta)).andExpect(status().isNotFound());

        // A vẫn thấy dữ liệu của A
        mockMvc.perform(get("/api/v1/academic/transcript").session(alpha))
                .andExpect(jsonPath("$.studentId", is("sv-alpha")))
                .andExpect(jsonPath("$.attempts.length()", is(1)));
    }

    private MockHttpSession login(String studentId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new LoginRequest(studentId, TestAccounts.PASSWORD))))
                .andExpect(status().isOk()).andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    private JsonNode upload(MockHttpSession session, List<String> lines) throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "bang-diem.pdf", "application/pdf", TranscriptFiles.textPdf(lines));
        MvcResult result = mockMvc.perform(multipart("/api/v1/academic/transcript/imports").file(file).with(csrf()).session(session))
                .andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }
}
