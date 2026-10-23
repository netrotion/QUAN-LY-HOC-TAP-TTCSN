package vn.haui.advisor.platform.advisor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
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
import vn.haui.advisor.contracts.dto.ConversationRecord;
import vn.haui.advisor.contracts.dto.SimulateGradesRequest;
import vn.haui.advisor.contracts.dto.SimulatedCourseGrade;
import vn.haui.advisor.platform.conversation.ConversationTurns;
import vn.haui.advisor.platform.conversation.JdbcConversationStore;
import vn.haui.advisor.platform.support.AcademicToolsTestConfig;
import vn.haui.advisor.platform.support.AdvisorTestConfig;
import vn.haui.advisor.platform.support.AdvisorTestConfig.ScriptedProvider;
import vn.haui.advisor.platform.support.StudentApi;
import vn.haui.advisor.platform.support.StudentRecords;
import vn.haui.advisor.platform.support.TestAccounts;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Task 4.3b: Chat endpoint trên AdvisorFacade của module AI, công cụ học vụ thật và hội thoại trên DB. Mô hình là mô hình
 * giả lập có kiểm soát ({@link AdvisorTestConfig}); lỗi/quá hạn/chưa cấu hình phải thành 503 thử lại được, không có câu
 * trả lời thay thế và không lưu gì.
 */
@SpringBootTest
@Import({AcademicToolsTestConfig.class, AdvisorTestConfig.class})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Chat: công cụ/ngữ cảnh thật, lưu hội thoại, AI không sẵn sàng → 503 thử lại được, không câu trả lời giả")
class AdvisorChatApiTest {

    private static final String STATUS_QUESTION = "Tình trạng học tập và điểm CPA của em thế nào?";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TestAccounts accounts;

    @Autowired
    private ScriptedProvider provider;

    @Autowired
    private AdvisorReadiness readiness;

    @Autowired
    private ConversationTurns turns;

    @Autowired
    private JdbcConversationStore conversations;

    private StudentApi api() {
        return new StudentApi(mockMvc, objectMapper);
    }

    @AfterEach
    void reset() {
        provider.reset();
        readiness.recordSuccess();
    }

    @Test
    @DisplayName("Trả lời bằng công cụ học vụ thật trên hồ sơ của người hỏi; lượt được lưu; hỏi tiếp nối vào cùng hội thoại")
    void answersWithRealToolsAndPersistsTurns() throws Exception {
        String sv = "sv-chat-a";
        StudentRecords records = new StudentRecords(api(), objectMapper);
        records.confirmManualImport(sv, accounts.ensure(sv), records.row("LP6010", "2024_1", 8.5, "A"),
                records.row("IT6015", "2024_1", 9.0, "A"), records.row("BS6002", "2024_1", 6.0, "C"));
        JsonNode status = api().call(get("/api/v1/academic/status"), sv, 200, "AcademicStatusResponse");
        provider.answer(prompt -> "{\"answer\": \"Theo dữ liệu học vụ, CPA hiện tại của bạn là " + status.get("cpa").asText() + ".\"}");

        JsonNode answer = api().call(post("/api/v1/advisor/chat"), sv, 200, "ChatResponse",
                new ChatRequest("conv-chat-a-1", STATUS_QUESTION, null));
        assertThat(answer.get("answer").asText()).contains("CPA hiện tại của bạn là " + status.get("cpa").asText());
        assertThat(provider.lastPrompt()).as("công cụ học vụ thật chạy trên hồ sơ của người hỏi")
                .contains("academicStatus: studentId=" + sv, "CPA=" + status.get("cpa").asText())
                .contains(STATUS_QUESTION);

        JsonNode list = api().call(get("/api/v1/advisor/conversations"), sv, 200, "ConversationListResponse");
        assertThat(list.get("conversations").findValuesAsText("conversationId")).contains("conv-chat-a-1");
        assertThat(messages(sv, "conv-chat-a-1")).hasSize(2);

        api().call(post("/api/v1/advisor/chat"), sv, 200, "ChatResponse",
                new ChatRequest("conv-chat-a-1", "Điều kiện cảnh báo học vụ mức 1 là gì?", null));
        JsonNode stored = messages(sv, "conv-chat-a-1");
        assertThat(stored).hasSize(4);
        assertThat(stored.get(0).get("role").asText()).isEqualTo("user");
        assertThat(stored.get(0).get("content").asText()).isEqualTo(STATUS_QUESTION);
        assertThat(stored.get(1).get("content").asText()).contains("CPA hiện tại");
    }

    @Test
    @DisplayName("Nhà cung cấp mô hình lỗi → 503 AI_UNAVAILABLE retryable + Retry-After, không câu trả lời, không lưu; gửi lại được")
    void providerErrorIsRetryableAndNothingIsSaved() throws Exception {
        String sv = "sv-chat-provider-error";
        accounts.ensure(sv);
        provider.answer(prompt -> {
            throw new IllegalStateException("Gemini API error (503): model overloaded");
        });

        MvcResult failed = api().perform(post("/api/v1/advisor/chat"), sv, new ChatRequest("conv-chat-retry", STATUS_QUESTION, null));
        JsonNode error = unavailable(failed, "PROVIDER_ERROR");
        assertThat(error.has("answer")).as("không có câu trả lời thay thế").isFalse();
        api().call(get("/api/v1/advisor/conversations/conv-chat-retry"), sv, 404, "ApiErrorResponse");
        assertThat(api().call(get("/api/v1/system/bootstrap"), sv, 200, "BootstrapInfoResponse").at("/modules/advisor").asText())
                .isEqualTo("DEGRADED");
        assertThat(mockMvc.perform(get("/actuator/health/advisor")).andReturn().getResponse().getStatus())
                .as("DEGRADED vẫn nhận câu hỏi").isEqualTo(200);

        provider.reset();
        api().call(post("/api/v1/advisor/chat"), sv, 200, "ChatResponse", new ChatRequest("conv-chat-retry", STATUS_QUESTION, null));
        assertThat(messages(sv, "conv-chat-retry")).as("gửi lại thành công, lưu đúng một lượt").hasSize(2);
        assertThat(api().call(get("/api/v1/system/bootstrap"), sv, 200, "BootstrapInfoResponse").at("/modules/advisor").asText())
                .isEqualTo("READY");
    }

    @Test
    @DisplayName("Chưa có khóa API → 503 NOT_CONFIGURED, không gọi mô hình; health ứng dụng UP, readiness AI 503; hồ sơ/kế hoạch/What-if vẫn chạy")
    void missingKeyDoesNotBlockOtherFeatures() throws Exception {
        String sv = "sv-chat-no-key";
        accounts.ensure(sv);
        provider.setConfigured(false);
        int calls = provider.calls();

        unavailable(api().perform(post("/api/v1/advisor/chat"), sv, new ChatRequest("conv-chat-no-key", STATUS_QUESTION, null)),
                "NOT_CONFIGURED");
        assertThat(provider.calls()).as("không gọi mô hình").isEqualTo(calls);

        assertThat(mockMvc.perform(get("/actuator/health")).andReturn().getResponse().getStatus()).isEqualTo(200);
        MvcResult advisorHealth = mockMvc.perform(get("/actuator/health/advisor")).andReturn();
        assertThat(advisorHealth.getResponse().getStatus()).isEqualTo(503);
        assertThat(advisorHealth.getResponse().getContentAsString()).contains("NOT_CONFIGURED");
        assertThat(api().call(get("/api/v1/system/bootstrap"), sv, 200, "BootstrapInfoResponse").at("/modules/advisor").asText())
                .isEqualTo("NOT_CONFIGURED");

        api().call(get("/api/v1/students/me"), sv, 200, "StudentProfileResponse");
        api().call(get("/api/v1/academic/status"), sv, 200, "AcademicStatusResponse");
        api().call(get("/api/v1/planner/plans"), sv, 200, "StudyPlanListResponse");
        api().call(post("/api/v1/simulation/grades"), sv, 200, "SimulateGradesResponse",
                new SimulateGradesRequest(null, List.of(new SimulatedCourseGrade("IT6126", 4, "A", null)), null));
    }

    @Test
    @DisplayName("Quá hạn trả lời → 503 TIMEOUT thử lại được; câu trả lời đến muộn không được lưu")
    void timeoutIsRetryableAndLateAnswerIsDropped() throws Exception {
        String sv = "sv-chat-timeout";
        accounts.ensure(sv);
        provider.answer(prompt -> {
            try {
                Thread.sleep(7_000);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
            }
            return "{\"answer\": \"Câu trả lời đến muộn\"}";
        });

        unavailable(api().perform(post("/api/v1/advisor/chat"), sv, new ChatRequest("conv-chat-timeout", STATUS_QUESTION, null)),
                "TIMEOUT");
        Thread.sleep(500);
        assertThat(conversations.getConversation("conv-chat-timeout", sv)).as("lượt quá hạn không lưu gì").isNull();
    }

    @Test
    @DisplayName("Hai tài khoản: không dùng được mã hội thoại của người khác (404, không gọi mô hình); lịch sử không lẫn")
    void conversationsAreIsolated() throws Exception {
        String a = "sv-chat-owner";
        String b = "sv-chat-other";
        accounts.ensure(a);
        accounts.ensure(b);
        api().call(post("/api/v1/advisor/chat"), a, 200, "ChatResponse", new ChatRequest("conv-chat-owner", STATUS_QUESTION, null));
        assertThat(provider.lastPrompt()).contains("studentId=" + a).doesNotContain(b);
        int calls = provider.calls();

        JsonNode denied = api().call(post("/api/v1/advisor/chat"), b, 404, "ApiErrorResponse",
                new ChatRequest("conv-chat-owner", "Cho tôi xem hội thoại này", null));
        assertThat(denied.get("code").asText()).isEqualTo("CONVERSATION_NOT_FOUND");
        assertThat(provider.calls()).isEqualTo(calls);
        api().call(get("/api/v1/advisor/conversations/conv-chat-owner"), b, 404, "ApiErrorResponse");
        assertThat(api().call(get("/api/v1/advisor/conversations"), b, 200, "ConversationListResponse").get("conversations")).isEmpty();
        assertThat(messages(a, "conv-chat-owner")).hasSize(2);

        api().call(post("/api/v1/advisor/chat"), b, 200, "ChatResponse", new ChatRequest("conv-chat-other", STATUS_QUESTION, null));
        assertThat(provider.lastPrompt()).contains("studentId=" + b).doesNotContain("studentId=" + a);
    }

    @Test
    @DisplayName("Lượt khác ghi xen trong lúc mô hình trả lời: không mất tin nhắn; ghi xen sau lần đọc cuối → lượt không ghi (409)")
    void concurrentWritesNeverLoseMessages() throws Exception {
        String sv = "sv-chat-race";
        accounts.ensure(sv);
        provider.answer(prompt -> {
            // Một lượt khác của cùng hội thoại vừa được lưu trong lúc mô hình đang trả lời lượt này
            ConversationTurns.Turn other = new ConversationTurns.Turn("conv-chat-race", sv);
            turns.run(other, () -> {
                turns.advisorStore().getConversation("conv-chat-race", sv);
                turns.advisorStore().saveConversation(new ConversationRecord("conv-chat-race", sv, "Lượt khác", null, null,
                        "[{\"role\":\"user\",\"content\":\"Lượt ghi xen\"},{\"role\":\"assistant\",\"content\":\"Trả lời xen\"}]"));
                return null;
            });
            assertThat(turns.commit(other)).isTrue();
            return "{\"answer\": \"Câu trả lời lượt chính\"}";
        });
        api().call(post("/api/v1/advisor/chat"), sv, 200, "ChatResponse", new ChatRequest("conv-chat-race", STATUS_QUESTION, null));
        assertThat(messages(sv, "conv-chat-race").findValuesAsText("content"))
                .as("lượt chính nối sau lượt ghi xen").contains("Lượt ghi xen", "Trả lời xen", STATUS_QUESTION, "Câu trả lời lượt chính");

        // Ghi xen sau lần đọc cuối của module AI: lượt này không được ghi đè
        ConversationTurns.Turn late = new ConversationTurns.Turn("conv-chat-race", sv);
        turns.run(late, () -> {
            ConversationRecord seen = turns.advisorStore().getConversation("conv-chat-race", sv);
            turns.advisorStore().saveConversation(new ConversationRecord("conv-chat-race", sv, seen.getTitle(), seen.getCreatedAt(),
                    null, "[]"));
            return null;
        });
        conversations.saveConversation(new ConversationRecord("conv-chat-race", sv, "Ghi xen", null, null,
                "[{\"role\":\"user\",\"content\":\"Ghi sau lần đọc\"}]"));
        assertThat(turns.commit(late)).isFalse();
        assertThat(messages(sv, "conv-chat-race").findValuesAsText("content")).containsExactly("Ghi sau lần đọc");

        assertThatThrownBy(() -> turns.advisorStore().saveConversation(new ConversationRecord("conv-chat-race", sv, "x", null, null, "[]")))
                .as("module AI chỉ ghi trong lượt do platform điều phối").isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("Đầu vào sai 400; chưa đăng nhập 401; thiếu CSRF 403")
    void validationAndAuthentication() throws Exception {
        String sv = "sv-chat-validation";
        accounts.ensure(sv);
        api().call(post("/api/v1/advisor/chat"), sv, 400, "ApiErrorResponse", new ChatRequest(null, STATUS_QUESTION, null));
        api().call(post("/api/v1/advisor/chat"), sv, 400, "ApiErrorResponse", new ChatRequest("conv/../x", STATUS_QUESTION, null));
        api().call(post("/api/v1/advisor/chat"), sv, 400, "ApiErrorResponse", new ChatRequest("conv-chat-v", "   ", null));
        api().call(post("/api/v1/advisor/chat"), sv, 400, "ApiErrorResponse", new ChatRequest("conv-chat-v", "a".repeat(4001), null));

        String body = objectMapper.writeValueAsString(new ChatRequest("conv-chat-v", STATUS_QUESTION, null));
        assertThat(mockMvc.perform(post("/api/v1/advisor/chat").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
                .andReturn().getResponse().getStatus()).isEqualTo(401);
        assertThat(mockMvc.perform(post("/api/v1/advisor/chat").with(user(sv).roles("STUDENT"))
                .contentType(MediaType.APPLICATION_JSON).content(body)).andReturn().getResponse().getStatus()).isEqualTo(403);
    }

    // ---------------------------------------------------------------------------------------------

    /** 503 AI_UNAVAILABLE thử lại được: retryable=true, header Retry-After, lý do trong details. */
    private JsonNode unavailable(MvcResult result, String reason) throws Exception {
        assertThat(result.getResponse().getStatus()).as(result.getResponse().getContentAsString()).isEqualTo(503);
        assertThat(result.getResponse().getHeader("Retry-After")).isNotBlank();
        JsonNode error = api().read(result);
        assertThat(error.get("code").asText()).isEqualTo("AI_UNAVAILABLE");
        assertThat(error.get("retryable").asBoolean()).isTrue();
        assertThat(error.get("details").toString()).contains("reason: " + reason);
        return error;
    }

    private JsonNode messages(String sv, String conversationId) throws Exception {
        JsonNode record = api().call(get("/api/v1/advisor/conversations/" + conversationId), sv, 200, "ConversationRecord");
        return objectMapper.readTree(record.get("messagesJson").asText());
    }
}
