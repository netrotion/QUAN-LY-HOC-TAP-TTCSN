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
                .andExpect(jsonPath("$.contractVersion", is("0.0.1-v0")))
                .andExpect(jsonPath("$.runtimeMode", is("bootstrap-v0")))
                .andExpect(jsonPath("$.modules.contracts", is("READY")))
                .andExpect(jsonPath("$.modules.academic", is("NOT_IMPLEMENTED")))
                .andExpect(jsonPath("$.modules.advisor", is("NOT_IMPLEMENTED")))
                .andExpect(jsonPath("$.modules.persistence", is("NOT_IMPLEMENTED")))
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
                .andExpect(jsonPath("$.service", is("haui-platform-app")));
    }

    @Test
    void testUnauthenticatedAccessToProtectedEndpointsIsBlocked() throws Exception {
        mockMvc.perform(get("/api/v1/academic/status"))
                .andExpect(status().isForbidden());
    }
}
