package vn.haui.advisor.platform.planner;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.AcademicFacade;
import vn.haui.advisor.platform.support.StudentApi;
import vn.haui.advisor.platform.support.TestAccounts;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Runtime mặc định: engine TV4 chưa khai báo công cụ thẩm định thật, mock tắt. Kế hoạch sinh và lưu được nhưng
 * không thẩm định hay kích hoạt được (503 TOOL_NOT_READY) — không có ACTIVE khi validation chưa thật.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Công cụ học vụ chưa thật: giữ stub NOT_READY, không ACTIVE")
class ToolNotReadyTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TestAccounts accounts;

    @Autowired
    private JdbcClient jdbc;

    @Autowired
    private AcademicFacade academicFacade;

    @Test
    @DisplayName("Lưu nháp được; validate/activate trả 503 TOOL_NOT_READY; không kế hoạch nào thành VALIDATED/ACTIVE")
    void planCannotBecomeActiveWithoutRealValidation() throws Exception {
        assertThat(academicFacade.readyCapabilities()).as("TV4 chưa khai báo công cụ thẩm định thật")
                .doesNotContain(AcademicCapability.VALIDATE_STUDY_PLAN);

        StudentApi api = new StudentApi(mockMvc, objectMapper);
        String sv = "sv-tool-not-ready";
        String revision = accounts.ensure(sv);

        // Sinh phương án là công cụ TV4 đã khai báo thật: chạy được dù thẩm định chưa thật; kết quả là bản xem trước DRAFT
        JsonNode proposal = api.call(post("/api/v1/planner/generate"), sv, 200, "GenerateStudyPlanResponse",
                new GenerateStudyPlanRequest(null, null, null, null, null, revision));
        assertThat(proposal.get("status").asText()).isEqualTo("DRAFT");
        assertThat(proposal.get("semesters")).isNotEmpty();
        assertThat(proposal.get("warnings").toString()).contains("Chưa có bảng điểm đã xác nhận");

        List<PlannedSemesterItem> semesters = List.of(new PlannedSemesterItem("2026_1", "Học kỳ 2026_1",
                List.of(new PlannedCourseItem("IT6015", "Học phần IT6015", 3, "B", null),
                        new PlannedCourseItem("IT9MOCK1", "Học phần thử 1", 3, "B", null),
                        new PlannedCourseItem("IT9MOCK2", "Học phần thử 2", 3, "B", null),
                        new PlannedCourseItem("IT9MOCK3", "Học phần thử 3", 3, "B", null),
                        new PlannedCourseItem("IT9MOCK4", "Học phần thử 4", 2, "B", null)), null, null));
        String planId = api.call(post("/api/v1/planner/plans"), sv, 200, "SaveStudyPlanResponse",
                new SaveStudyPlanRequest(null, "Kế hoạch chờ công cụ", null, revision, new BigDecimal("3.0"), "2028_1", 20,
                        semesters, List.of())).get("planId").asText();

        JsonNode stored = api.call(post("/api/v1/planner/validate"), sv, 503, "ApiErrorResponse",
                new ValidateStudyPlanRequest(planId, null, null, 1, revision));
        assertThat(stored.get("code").asText()).isEqualTo("TOOL_NOT_READY");
        assertThat(stored.get("details").toString()).contains("VALIDATE_STUDY_PLAN");
        api.call(post("/api/v1/planner/validate"), sv, 503, "ApiErrorResponse",
                new ValidateStudyPlanRequest(null, null, semesters, null, revision));
        JsonNode activate = api.call(post("/api/v1/planner/plans/" + planId + "/activate"), sv, 503, "ApiErrorResponse",
                new ActivateStudyPlanRequest(1, revision));
        assertThat(activate.get("code").asText()).isEqualTo("TOOL_NOT_READY");

        JsonNode detail = api.call(get("/api/v1/planner/plans/" + planId), sv, 200, "StudyPlanDetailResponse");
        assertThat(detail.get("status").asText()).isEqualTo("DRAFT");
        assertThat(detail.get("planVersion").asInt()).isEqualTo(1);
        assertThat(detail.get("validatedAt").isNull()).isTrue();
        api.call(post("/api/v1/planner/plans/" + planId + "/restore"), sv, 200, "StudyPlanDetailResponse");
        assertThat(jdbc.sql("SELECT count(*) FROM study_plans WHERE student_id = :sv AND status IN ('VALIDATED', 'ACTIVE')")
                .param("sv", sv).query(Integer.class).single()).isZero();

        JsonNode bootstrap = api.call(get("/api/v1/system/bootstrap"), sv, 200, "BootstrapInfoResponse");
        assertThat(toolStatus(bootstrap, AcademicCapability.VALIDATE_STUDY_PLAN)).isEqualTo("NOT_READY");
        assertThat(toolStatus(bootstrap, AcademicCapability.GENERATE_STUDY_PLAN)).isEqualTo("READY");
        assertThat(bootstrap.at("/modules/academic").asText()).isEqualTo("PARTIAL");
    }

    private static String toolStatus(JsonNode bootstrap, AcademicCapability capability) {
        for (JsonNode tool : bootstrap.get("academicTools")) {
            if (tool.get("capability").asText().equals(capability.name())) {
                return tool.get("status").asText();
            }
        }
        throw new AssertionError("Bootstrap thiếu " + capability);
    }
}
