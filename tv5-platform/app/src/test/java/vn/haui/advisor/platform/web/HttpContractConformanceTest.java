package vn.haui.advisor.platform.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import vn.haui.advisor.platform.support.AcademicToolsTestConfig;
import vn.haui.advisor.contracts.ContractTestSupport;
import vn.haui.advisor.contracts.OpenApiSchemaValidator;
import vn.haui.advisor.contracts.dto.ConversationRecord;
import vn.haui.advisor.contracts.ports.ConversationStore;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Contract test phía server: gửi đúng JSON request trong fixtures contracts-v1 tới endpoint thật,
 * kiểm tra status code đúng OpenAPI và body response (kể cả lỗi) hợp lệ theo schema OpenAPI V1.
 */
@SpringBootTest
@Import(AcademicToolsTestConfig.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(username = "2024604757", roles = "STUDENT")
@DisplayName("contracts-v1: HTTP response của platform khớp OpenAPI")
class HttpContractConformanceTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AcademicToolsTestConfig.ControllableAcademicFacade academicFacade;

    @Autowired
    private ConversationStore conversationStore;

    private OpenApiSchemaValidator validator;

    @BeforeEach
    void setUp() throws Exception {
        validator = new OpenApiSchemaValidator(ContractTestSupport.openApiSchemas());
    }

    @Test
    @DisplayName("Luồng planner dùng request fixtures: list → save → get → validate → activate → restore")
    void plannerFlowWithFixtureRequests() throws Exception {
        expect(get("/api/v1/planner/plans"), null, 200, "StudyPlanListResponse");

        ObjectNode save = validatableSaveRequest();
        JsonNode saved = expect(post("/api/v1/planner/plans"), save, 200, "SaveStudyPlanResponse");
        String planId = saved.get("planId").asText();
        int planVersion = saved.get("planVersion").asInt();

        expect(get("/api/v1/planner/plans/" + planId), null, 200, "StudyPlanDetailResponse");

        ObjectNode activate = (ObjectNode) ContractTestSupport.readExample("study-plan-activate-request.sample.json");
        activate.put("planVersion", planVersion);
        JsonNode notValidated = expect(post("/api/v1/planner/plans/" + planId + "/activate"), activate, 422, "ApiErrorResponse");
        assertThat(notValidated.get("code").asText()).isEqualTo("PLAN_NOT_VALIDATED");

        ObjectNode validateStored = objectMapper.createObjectNode();
        validateStored.put("planId", planId);
        validateStored.put("planVersion", planVersion);
        JsonNode validated = expect(post("/api/v1/planner/validate"), validateStored, 200, "ValidateStudyPlanResponse");
        assertThat(validated.get("status").asText()).isEqualTo("VALIDATED");

        JsonNode activated = expect(post("/api/v1/planner/plans/" + planId + "/activate"), activate, 200, "ActivateStudyPlanResponse");
        assertThat(activated.get("status").asText()).isEqualTo("ACTIVE");

        JsonNode restored = expect(post("/api/v1/planner/plans/" + planId + "/restore"),
                ContractTestSupport.readExample("study-plan-restore-request.sample.json"), 200, "StudyPlanDetailResponse");
        assertThat(restored.get("sourcePlanId").asText()).isEqualTo(planId);

        expect(get("/api/v1/planner/plans"), null, 200, "StudyPlanListResponse");
    }

    @Test
    @DisplayName("Validate request fixture (chưa lưu, vi phạm tín chỉ) trả vi phạm đúng schema")
    void validateFixtureRequest() throws Exception {
        JsonNode result = expect(post("/api/v1/planner/validate"),
                ContractTestSupport.readExample("validate-study-plan-request.sample.json"), 200, "ValidateStudyPlanResponse");
        assertThat(result.get("valid").asBoolean()).isFalse();
        assertThat(result.get("violations")).isNotEmpty();
    }

    @Test
    @DisplayName("Lỗi 400/404/409 có body ApiErrorResponse đúng schema")
    void errorResponsesMatchSchema() throws Exception {
        expect(get("/api/v1/planner/plans/plan-khong-ton-tai"), null, 404, "ApiErrorResponse");
        expect(post("/api/v1/planner/plans/plan-khong-ton-tai/restore"), null, 404, "ApiErrorResponse");

        ObjectNode stale = (ObjectNode) ContractTestSupport.readExample("study-plan-save-request.sample.json");
        stale.putNull("planId");
        stale.put("dataRevision", "REV-2024604757-000");
        JsonNode conflict = expect(post("/api/v1/planner/plans"), stale, 409, "ApiErrorResponse");
        assertThat(conflict.get("code").asText()).isEqualTo("DATA_REVISION_STALE");

        JsonNode badRequest = expect(post("/api/v1/planner/validate"), objectMapper.createObjectNode(), 400, "ApiErrorResponse");
        assertThat(badRequest.get("code").asText()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    @DisplayName("Contracts 1.5: What-if/ROI/mục tiêu ngược/đối chiếu/Chat dùng request fixture, trả đúng schema; không còn 501")
    void whatIfReconcileAndChatMatchSchema() throws Exception {
        String revision = expect(get("/api/v1/academic/status"), null, 200, "AcademicStatusResponse").get("dataRevision").asText();
        for (List<String> operation : List.of(
                List.of("simulate-grades-request.sample.json", "/api/v1/simulation/grades", "SimulateGradesResponse"),
                List.of("rank-retake-request.sample.json", "/api/v1/simulation/retake-ranking", "RankRetakeCoursesResponse"),
                List.of("calculate-target-grades-request.sample.json", "/api/v1/simulation/target-grades", "CalculateTargetGradesResponse"))) {
            ObjectNode body = (ObjectNode) ContractTestSupport.readExample(operation.get(0));
            body.put("dataRevision", revision);
            JsonNode result = expect(post(operation.get(1)), body, 200, operation.get(2));
            assertThat(result.get("studentId").asText()).isEqualTo("2024604757");
            assertThat(result.get("policyVersion").isTextual()).as(operation.get(1)).isTrue();
        }

        // Đối chiếu cần kế hoạch ACTIVE của sinh viên demo: lưu, thẩm định, kích hoạt bằng request fixture
        ObjectNode save = validatableSaveRequest();
        save.put("dataRevision", revision);
        String planId = expect(post("/api/v1/planner/plans"), save, 200, "SaveStudyPlanResponse").get("planId").asText();
        expect(post("/api/v1/planner/validate"), objectMapper.createObjectNode().put("planId", planId).put("planVersion", 1), 200,
                "ValidateStudyPlanResponse");
        expect(post("/api/v1/planner/plans/" + planId + "/activate"),
                objectMapper.createObjectNode().put("planVersion", 1).put("dataRevision", revision), 200, "ActivateStudyPlanResponse");
        ObjectNode reconcile = (ObjectNode) ContractTestSupport.readExample("reconcile-study-plan-request.sample.json");
        reconcile.put("planId", planId).put("planVersion", 1).put("dataRevision", revision);
        assertThat(expect(post("/api/v1/planner/reconcile"), reconcile, 200, "ReconcileStudyPlanResponse").get("planId").asText())
                .isEqualTo(planId);
        reconcile.put("planVersion", 9);
        expect(post("/api/v1/planner/reconcile"), reconcile, 409, "ApiErrorResponse");

        // Test không có khóa AI: Chat trả đúng mẫu chat-ai-unavailable (503, retryable)
        MvcResult chat = mockMvc.perform(post("/api/v1/advisor/chat").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(ContractTestSupport.readExample("chat-request.sample.json")))).andReturn();
        assertThat(chat.getResponse().getStatus()).isEqualTo(503);
        assertThat(chat.getResponse().getHeader("Retry-After")).isNotBlank();
        JsonNode unavailable = objectMapper.readTree(chat.getResponse().getContentAsString());
        assertThat(validator.validate(unavailable, "ApiErrorResponse")).isEmpty();
        assertThat(unavailable.get("code").asText()).isEqualTo("AI_UNAVAILABLE");
        assertThat(unavailable.get("retryable").asBoolean()).isTrue();
    }

    @Test
    @DisplayName("Contracts 1.4: generate dùng request fixture, trả đúng schema; revision cũ 409, đầu vào sai 400, công cụ chưa thật 503")
    void generateMatchesSchema() throws Exception {
        String revision = expect(get("/api/v1/academic/status"), null, 200, "AcademicStatusResponse").get("dataRevision").asText();
        ObjectNode generate = (ObjectNode) ContractTestSupport.readExample("generate-study-plan-request.sample.json");
        generate.put("dataRevision", revision);
        JsonNode proposal = expect(post("/api/v1/planner/generate"), generate, 200, "GenerateStudyPlanResponse");
        assertThat(proposal.get("studentId").asText()).isEqualTo("2024604757");
        assertThat(proposal.get("status").asText()).isEqualTo("DRAFT");
        assertThat(proposal.get("dataRevision").asText()).isEqualTo(revision);
        assertThat(proposal.get("policyVersion").isTextual()).isTrue();

        generate.put("dataRevision", "REV-2024604757-000");
        assertThat(expect(post("/api/v1/planner/generate"), generate, 409, "ApiErrorResponse").get("code").asText())
                .isEqualTo("DATA_REVISION_STALE");
        generate.remove("dataRevision");
        generate.put("targetGraduationSemester", "2028-1");
        expect(post("/api/v1/planner/generate"), generate, 400, "ApiErrorResponse");
        generate.remove("targetGraduationSemester");

        academicFacade.setReady(false);
        try {
            assertThat(expect(post("/api/v1/planner/generate"), generate, 503, "ApiErrorResponse").get("code").asText())
                    .isEqualTo("TOOL_NOT_READY");
        } finally {
            academicFacade.reset();
        }
    }

    @Test
    @DisplayName("Contracts 1.3: API học vụ dùng request fixture, trả đúng schema; công cụ chưa thật → 503")
    void academicEndpointsMatchSchema() throws Exception {
        JsonNode status = expect(get("/api/v1/academic/status"), null, 200, "AcademicStatusResponse");
        assertThat(status.get("studentId").asText()).isEqualTo("2024604757");
        assertThat(status.get("policyVersion").isTextual()).isTrue();

        // Request fixture mang dataRevision của mốc 1.0.0 (REV-…-001); dùng revision hiện hành của hồ sơ
        ObjectNode eligibility = (ObjectNode) ContractTestSupport.readExample("course-eligibility-request.sample.json");
        eligibility.put("dataRevision", status.get("dataRevision").asText());
        JsonNode checked = expect(post("/api/v1/academic/eligibility"), eligibility, 200, "CourseEligibilityResponse");
        assertThat(checked.get("courseCode").asText()).isEqualTo(eligibility.get("courseCode").asText());
        eligibility.put("dataRevision", "REV-2024604757-000");
        assertThat(expect(post("/api/v1/academic/eligibility"), eligibility, 409, "ApiErrorResponse").get("code").asText())
                .isEqualTo("DATA_REVISION_STALE");
        expect(post("/api/v1/academic/eligibility"), objectMapper.createObjectNode(), 400, "ApiErrorResponse");

        expect(get("/api/v1/academic/curriculum/tree"), null, 200, "CurriculumTreeResponse");
        expect(get("/api/v1/audit/graduation"), null, 200, "GraduationAuditResponse");

        academicFacade.setReady(false);
        try {
            for (String path : List.of("/api/v1/academic/status", "/api/v1/academic/curriculum/tree", "/api/v1/audit/graduation")) {
                assertThat(expect(get(path), null, 503, "ApiErrorResponse").get("code").asText()).isEqualTo("TOOL_NOT_READY");
            }
            eligibility.remove("dataRevision");
            expect(post("/api/v1/academic/eligibility"), eligibility, 503, "ApiErrorResponse");
        } finally {
            academicFacade.reset();
        }
    }

    @Test
    @DisplayName("Auth và dữ liệu sinh viên (contracts 1.1) trả body đúng schema")
    void accountAndDataEndpointsMatchSchema() throws Exception {
        expect(get("/api/v1/auth/csrf"), null, 200, "CsrfTokenResponse");
        JsonNode session = expect(get("/api/v1/auth/session"), null, 200, "AuthSessionResponse");
        assertThat(session.get("studentId").asText()).isEqualTo("2024604757");
        expect(post("/api/v1/auth/login"), objectMapper.valueToTree(java.util.Map.of("studentId", "2024604757", "password", "sai")),
                401, "ApiErrorResponse");
        expect(get("/api/v1/students/me"), null, 200, "StudentProfileResponse");
        expect(get("/api/v1/academic/curriculum"), null, 200, "CurriculumResponse");
        expect(get("/api/v1/academic/transcript"), null, 200, "TranscriptResponse");
        expect(get("/api/v1/academic/certificates"), null, 200, "CertificateListResponse");
        expect(get("/api/v1/academic/transcript/imports"), null, 200, "TranscriptImportListResponse");
        expect(get("/api/v1/academic/transcript/imports/imp-khong-ton-tai"), null, 404, "ApiErrorResponse");
    }

    @Test
    @DisplayName("Contracts 1.2: hủy nháp, công cụ chưa thật (503), lịch sử hội thoại và bootstrap đúng schema")
    void planPersistenceAndConversationEndpointsMatchSchema() throws Exception {
        JsonNode bootstrap = expect(get("/api/v1/system/bootstrap"), null, 200, "BootstrapInfoResponse");
        assertThat(bootstrap.get("academicTools").findValuesAsText("status")).contains("READY");

        ObjectNode save = (ObjectNode) ContractTestSupport.readExample("study-plan-save-request.sample.json");
        save.putNull("planId");
        save.putNull("planVersion");
        save.putNull("dataRevision");
        String planId = expect(post("/api/v1/planner/plans"), save, 200, "SaveStudyPlanResponse").get("planId").asText();

        academicFacade.setReady(false);
        try {
            ObjectNode validate = objectMapper.createObjectNode().put("planId", planId).put("planVersion", 1);
            JsonNode notReady = expect(post("/api/v1/planner/validate"), validate, 503, "ApiErrorResponse");
            assertThat(notReady.get("code").asText()).isEqualTo("TOOL_NOT_READY");
            ObjectNode activate = objectMapper.createObjectNode().put("planVersion", 1);
            expect(post("/api/v1/planner/plans/" + planId + "/activate"), activate, 503, "ApiErrorResponse");
        } finally {
            academicFacade.reset();
        }

        expect(delete("/api/v1/planner/plans/" + planId), null, 400, "ApiErrorResponse");
        expect(delete("/api/v1/planner/plans/" + planId).param("planVersion", "9"), null, 409, "ApiErrorResponse");
        MvcResult deleted = mockMvc.perform(delete("/api/v1/planner/plans/" + planId).param("planVersion", "1").with(csrf()))
                .andReturn();
        assertThat(deleted.getResponse().getStatus()).isEqualTo(204);
        expect(get("/api/v1/planner/plans/" + planId), null, 404, "ApiErrorResponse");

        conversationStore.saveConversation(new ConversationRecord("conv-contract-1", "2024604757", "Hỏi lộ trình",
                null, null, "[{\"role\":\"user\",\"content\":\"Kỳ tới học gì?\"}]"));
        JsonNode list = expect(get("/api/v1/advisor/conversations"), null, 200, "ConversationListResponse");
        assertThat(list.get("conversations").findValuesAsText("conversationId")).contains("conv-contract-1");
        expect(get("/api/v1/advisor/conversations/conv-contract-1"), null, 200, "ConversationRecord");
        JsonNode missing = expect(get("/api/v1/advisor/conversations/conv-khong-ton-tai"), null, 404, "ApiErrorResponse");
        assertThat(missing.get("code").asText()).isEqualTo("CONVERSATION_NOT_FOUND");
    }

    /**
     * Request fixture lưu kế hoạch mới của sinh viên demo, qua được thẩm định của TV4: thay IT6039 (học phần học trước
     * IT6018, IT6027 không có trong CTĐT nên không bao giờ đạt) bằng IT6010, môn có học phần học trước BS6001, IT6015
     * sinh viên demo đã học.
     */
    private static ObjectNode validatableSaveRequest() throws Exception {
        ObjectNode save = (ObjectNode) ContractTestSupport.readExample("study-plan-save-request.sample.json");
        save.putNull("planId");
        save.putNull("planVersion");
        for (JsonNode semester : save.get("semesters")) {
            for (JsonNode course : semester.get("courses")) {
                if ("IT6039".equals(course.get("courseCode").asText())) {
                    ((ObjectNode) course).put("courseCode", "IT6010").put("courseName", "Đồ họa máy tính")
                            .put("rationale", "Đã học BS6001 và IT6015 (học phần học trước)");
                }
            }
        }
        return save;
    }

    private JsonNode expect(MockHttpServletRequestBuilder request, JsonNode body, int status, String schema) throws Exception {
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body));
        }
        MvcResult result = mockMvc.perform(request.with(csrf())).andReturn();
        String content = result.getResponse().getContentAsString();
        assertThat(result.getResponse().getStatus()).as("HTTP status của %s, body %s", request, content).isEqualTo(status);

        JsonNode json = objectMapper.readTree(content);
        assertThat(validator.validate(json, schema)).as("Body không khớp schema %s: %s", schema, content).isEmpty();
        return json;
    }
}
