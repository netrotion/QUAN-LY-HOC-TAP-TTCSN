package vn.haui.advisor.platform.advisor;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import vn.haui.advisor.contracts.dto.ChatRequest;
import vn.haui.advisor.contracts.dto.ConversationRecord;
import vn.haui.advisor.platform.conversation.JdbcConversationStore;
import vn.haui.advisor.platform.support.AcademicToolsTestConfig;
import vn.haui.advisor.platform.support.AdvisorTestConfig;
import vn.haui.advisor.platform.support.TestAccounts;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.doReturn;
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

    @SpyBean
    private JdbcConversationStore conversations;

    @Autowired
    @Qualifier("advisorChatExecutor")
    private ExecutorService chatExecutor;

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
    void shouldReturnRetryableSseErrorWhenQueueIsFull() throws Exception {
        String sv = "sv-stream-overload";
        accounts.ensure(sv);
        var pool = (ThreadPoolExecutor) chatExecutor;
        var release = new CountDownLatch(1);
        try {
            int slots = pool.getMaximumPoolSize() + pool.getQueue().remainingCapacity();
            for (int i = 0; i < slots; i++) {
                pool.submit(() -> release.await(15, TimeUnit.SECONDS));
            }
            ChatRequest req = new ChatRequest("conv-stream-overload", "Em muốn hỏi quy chế", null);
            MvcResult result = mockMvc.perform(post("/api/v1/advisor/chat/stream")
                            .with(user(sv).roles("STUDENT")).with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(request().asyncStarted()).andReturn();
            mockMvc.perform(asyncDispatch(result)).andExpect(status().isOk());
            assertThat(result.getResponse().getContentAsString()).contains("AI_UNAVAILABLE", "\"retryable\":true")
                    .doesNotContain("event:done");
        } finally {
            release.countDown();
        }
    }

    @Test
    void shouldReportConflictWithoutCompletingAnUncommittedTurn() throws Exception {
        String sv = "sv-stream-conflict";
        accounts.ensure(sv);
        String id = "conv-stream-conflict";
        doReturn(false).when(conversations).saveIfUnchanged(
                argThat(record -> id.equals(record.getConversationId())), nullable(String.class));
        ChatRequest req = new ChatRequest(id, "Em muốn hỏi quy chế học vụ", "2026-11-09T10:00:00Z");

        MvcResult result = mockMvc.perform(post("/api/v1/advisor/chat/stream")
                        .with(user(sv).roles("STUDENT")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(request().asyncStarted()).andReturn();

        mockMvc.perform(asyncDispatch(result)).andExpect(status().isOk());
        assertThat(result.getResponse().getContentAsString()).contains("CONVERSATION_BUSY").doesNotContain("event:done");
        assertThat(conversations.getConversation(id, sv)).isNull();
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

        ConversationRecord record = conversations.getConversation("conv-stream-001", sv);
        assertThat(record).isNotNull();
        assertThat(record.getMessagesJson()).contains("Cho em biết quy chế học phần và điểm CPA");

        // Lượt 2 tiếp nối hội thoại đa lượt (multi-turn streaming)
        ChatRequest reqTurn2 = new ChatRequest("conv-stream-001", "có", "2026-11-09T10:01:00Z");
        MvcResult resultTurn2 = mockMvc.perform(post("/api/v1/advisor/chat/stream")
                        .with(user(sv).roles("STUDENT"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reqTurn2)))
                .andExpect(request().asyncStarted())
                .andReturn();

        mockMvc.perform(asyncDispatch(resultTurn2))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_EVENT_STREAM));

        ConversationRecord recordAfterTurn2 = conversations.getConversation("conv-stream-001", sv);
        assertThat(recordAfterTurn2).isNotNull();
        assertThat(recordAfterTurn2.getMessagesJson()).contains("Cho em biết quy chế học phần và điểm CPA");
        assertThat(recordAfterTurn2.getMessagesJson()).contains("\"content\":\"có\"");

        MvcResult retry = mockMvc.perform(post("/api/v1/advisor/chat/stream")
                        .with(user(sv).roles("STUDENT"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reqTurn2)))
                .andExpect(request().asyncStarted())
                .andReturn();
        mockMvc.perform(asyncDispatch(retry))
                .andExpect(status().isOk());
        assertThat(retry.getResponse().getContentAsString()).contains("TURN_ALREADY_SAVED").doesNotContain("event:done");
        assertThat(conversations.getConversation("conv-stream-001", sv).getMessagesJson())
                .isEqualTo(recordAfterTurn2.getMessagesJson());
    }
}
