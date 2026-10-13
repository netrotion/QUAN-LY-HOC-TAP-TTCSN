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
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import vn.haui.advisor.contracts.ContractTestSupport;
import vn.haui.advisor.contracts.OpenApiSchemaValidator;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Contract test phía server: gửi đúng JSON request trong fixtures contracts-v1 tới endpoint thật,
 * kiểm tra status code đúng OpenAPI và body response (kể cả lỗi) hợp lệ theo schema OpenAPI V1.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(username = "2024604757", roles = "STUDENT")
@DisplayName("contracts-v1: HTTP response của platform khớp OpenAPI")
class HttpContractConformanceTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private OpenApiSchemaValidator validator;

    @BeforeEach
    void setUp() throws Exception {
        validator = new OpenApiSchemaValidator(ContractTestSupport.openApiSchemas());
    }

    @Test
    @DisplayName("Luồng planner dùng request fixtures: list → save → get → validate → activate → restore")
    void plannerFlowWithFixtureRequests() throws Exception {
        expect(get("/api/v1/planner/plans"), null, 200, "StudyPlanListResponse");

        ObjectNode save = (ObjectNode) ContractTestSupport.readExample("study-plan-save-request.sample.json");
        save.putNull("planId");
        save.putNull("planVersion");
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
    @DisplayName("Operation chưa nối trả 501 NOT_IMPLEMENTED đúng schema thay vì 404")
    void notImplementedOperationsMatchSchema() throws Exception {
        for (String path : List.of("/api/v1/academic/status", "/api/v1/audit/graduation")) {
            expect(get(path), null, 501, "ApiErrorResponse");
        }
        for (String path : List.of("/api/v1/academic/eligibility", "/api/v1/planner/generate", "/api/v1/planner/reconcile",
                "/api/v1/simulation/grades", "/api/v1/simulation/retake-ranking", "/api/v1/simulation/target-grades",
                "/api/v1/advisor/chat")) {
            JsonNode error = expect(post(path), objectMapper.createObjectNode(), 501, "ApiErrorResponse");
            assertThat(error.get("code").asText()).isEqualTo("NOT_IMPLEMENTED");
        }
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
