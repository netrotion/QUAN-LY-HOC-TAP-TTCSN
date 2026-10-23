package vn.haui.advisor.platform.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class SystemControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void testBootstrapEndpointReturnsCorrectInfoWithoutSecrets() throws Exception {
        mockMvc.perform(get("/api/v1/system/bootstrap"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contractVersion", is("1.5.0")))
                .andExpect(jsonPath("$.contractMilestone", is("contracts-v1")))
                .andExpect(jsonPath("$.runtimeMode", is("database")))
                .andExpect(jsonPath("$.modules.contracts", is("READY")))
                .andExpect(jsonPath("$.modules.academic", is("PARTIAL")))
                // Test không có khóa AI: trợ lý chưa cấu hình, ứng dụng vẫn UP
                .andExpect(jsonPath("$.modules.advisor", is("NOT_CONFIGURED")))
                .andExpect(jsonPath("$.modules.persistence", is("READY")))
                // Task 4.3b: mọi capability đã nối; TV4 khai báo thật 8 capability, thẩm định kế hoạch chưa thật
                .andExpect(jsonPath("$.academicTools[?(@.capability == 'GET_ACADEMIC_STATUS')].status", contains("READY")))
                .andExpect(jsonPath("$.academicTools[?(@.capability == 'CHECK_COURSE_ELIGIBILITY')].status", contains("READY")))
                .andExpect(jsonPath("$.academicTools[?(@.capability == 'RUN_GRADUATION_AUDIT')].status", contains("READY")))
                .andExpect(jsonPath("$.academicTools[?(@.capability == 'GENERATE_STUDY_PLAN')].status", contains("READY")))
                .andExpect(jsonPath("$.academicTools[?(@.capability == 'SIMULATE_GRADES')].status", contains("READY")))
                .andExpect(jsonPath("$.academicTools[?(@.capability == 'RANK_RETAKE_COURSES')].status", contains("READY")))
                .andExpect(jsonPath("$.academicTools[?(@.capability == 'CALCULATE_TARGET_GRADES')].status", contains("READY")))
                .andExpect(jsonPath("$.academicTools[?(@.capability == 'RECONCILE_STUDY_PLAN')].status", contains("READY")))
                .andExpect(jsonPath("$.academicTools[?(@.capability == 'VALIDATE_STUDY_PLAN')].status", contains("NOT_READY")))
                // Tuyệt đối không để lộ secrets, passwords, env
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.secret").doesNotExist())
                .andExpect(jsonPath("$.apiKey").doesNotExist())
                .andExpect(jsonPath("$.env").doesNotExist());
    }

    @Test
    void testHealthEndpointReturnsUp() throws Exception {
        mockMvc.perform(get("/api/v1/system/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("UP")))
                .andExpect(jsonPath("$.service", is("haui-platform-app")))
                .andExpect(jsonPath("$.advisor", is("NOT_CONFIGURED")));
    }

    @Test
    void testUnauthenticatedAccessToProtectedEndpointsIsBlocked() throws Exception {
        mockMvc.perform(get("/api/v1/academic/status"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("UNAUTHENTICATED")));
    }
}
