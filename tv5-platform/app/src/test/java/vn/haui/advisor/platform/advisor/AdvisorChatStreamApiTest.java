package vn.haui.advisor.platform.advisor;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import vn.haui.advisor.contracts.dto.ChatRequest;
import vn.haui.advisor.platform.support.AcademicToolsTestConfig;
import vn.haui.advisor.platform.support.AdvisorTestConfig;
import vn.haui.advisor.platform.support.TestAccounts;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@Import({AcademicToolsTestConfig.class, AdvisorTestConfig.class})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdvisorChatStreamApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TestAccounts accounts;

    @Test
    @DisplayName("POST /api/v1/advisor/chat/stream requires authentication")
    void shouldRequireAuthentication() throws Exception {
        ChatRequest req = new ChatRequest("conv-1", "Em muốn hỏi quy chế học vụ", "2026-11-09T10:00:00Z");

        mockMvc.perform(post("/api/v1/advisor/chat/stream")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/v1/advisor/chat/stream returns text/event-stream and emits SSE events")
    void shouldStreamChatEvents() throws Exception {
        String sv = "sv-stream-test";
        accounts.ensure(sv);
        ChatRequest req = new ChatRequest("conv-stream-001", "Cho em biết quy chế học phần và điểm CPA", "2026-11-09T10:00:00Z");

        MvcResult result = mockMvc.perform(post("/api/v1/advisor/chat/stream")
                        .with(user(sv).roles("STUDENT"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(request().asyncStarted())
                .andReturn();

        mockMvc.perform(asyncDispatch(result))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_EVENT_STREAM));

        String content = result.getResponse().getContentAsString();
        assertThat(content).contains("event:status");
        assertThat(content).contains("event:done");
    }
}
