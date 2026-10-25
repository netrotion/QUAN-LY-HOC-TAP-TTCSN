package vn.haui.advisor.platform.planner;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.platform.support.PlanCourses;
import vn.haui.advisor.platform.support.StudentApi;
import vn.haui.advisor.platform.support.TestAccounts;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Dev/test bật thẩm định thử: kết quả gắn nhãn MOCK, trạng thái kế hoạch không đổi, kích hoạt vẫn bị chặn.
 */
@SpringBootTest(properties = "haui.academic.mock-tools.enabled=true")
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Thẩm định thử (MOCK) chỉ ở dev/test, không dẫn tới VALIDATED/ACTIVE")
class MockValidationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TestAccounts accounts;

    @Test
    @DisplayName("validate trả validationMode MOCK, kế hoạch vẫn DRAFT; activate 503")
    void mockValidationNeverActivates() throws Exception {
        StudentApi api = new StudentApi(mockMvc, objectMapper);
        String sv = "sv-mock-validation";
        String revision = accounts.ensure(sv);
        List<PlannedSemesterItem> semesters = List.of(new PlannedSemesterItem("2026_1", "Học kỳ 2026_1",
                PlanCourses.forSemester("2026_1", 14, null), null, null));
        String planId = api.call(post("/api/v1/planner/plans"), sv, 200, "SaveStudyPlanResponse",
                new SaveStudyPlanRequest(null, "Kế hoạch thử", null, revision, new BigDecimal("3.0"), "2028_1", 20,
                        semesters, List.of())).get("planId").asText();

        JsonNode mock = api.call(post("/api/v1/planner/validate"), sv, 200, "ValidateStudyPlanResponse",
                new ValidateStudyPlanRequest(planId, null, null, 1, revision));
        assertThat(mock.get("validationMode").asText()).isEqualTo("MOCK");
        assertThat(mock.get("valid").asBoolean()).isTrue();
        assertThat(mock.get("status").asText()).isEqualTo("DRAFT");
        assertThat(mock.get("warnings").get(0).asText()).contains("MOCK");

        JsonNode unsaved = api.call(post("/api/v1/planner/validate"), sv, 200, "ValidateStudyPlanResponse",
                new ValidateStudyPlanRequest(null, null, semesters, null, revision));
        assertThat(unsaved.get("status").asText()).isEqualTo("DRAFT");

        JsonNode activate = api.call(post("/api/v1/planner/plans/" + planId + "/activate"), sv, 503, "ApiErrorResponse",
                new ActivateStudyPlanRequest(1, revision));
        assertThat(activate.get("code").asText()).isEqualTo("TOOL_NOT_READY");
        assertThat(api.call(get("/api/v1/planner/plans/" + planId), sv, 200, "StudyPlanDetailResponse")
                .get("status").asText()).isEqualTo("DRAFT");

        JsonNode bootstrap = api.call(get("/api/v1/system/bootstrap"), sv, 200, "BootstrapInfoResponse");
        JsonNode validateTool = null;
        for (JsonNode tool : bootstrap.get("academicTools")) {
            if (tool.get("capability").asText().equals("VALIDATE_STUDY_PLAN")) {
                validateTool = tool;
            }
        }
        assertThat(validateTool).isNotNull();
        assertThat(validateTool.get("status").asText()).isEqualTo("MOCK");
    }
}
