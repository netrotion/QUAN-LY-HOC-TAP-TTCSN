package vn.haui.advisor.platform.academic;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import vn.haui.advisor.academic.service.DefaultAcademicFacade;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.AcademicFacade;
import vn.haui.advisor.platform.support.AcademicToolsTestConfig;
import vn.haui.advisor.platform.support.AcademicToolsTestConfig.ControllableAcademicFacade;
import vn.haui.advisor.platform.support.AcademicToolsTestConfig.MutablePolicyVersion;
import vn.haui.advisor.platform.support.StudentApi;
import vn.haui.advisor.platform.support.StudentRecords;
import vn.haui.advisor.platform.support.TestAccounts;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Task 4.3b: What-if, xếp hạng học cải thiện (ROI) và mục tiêu ngược chạy công cụ TV4 trên hồ sơ DB của sinh viên đang
 * đăng nhập. Kết quả API bằng đúng kết quả engine trên hồ sơ dựng độc lập từ API; chỉ xem thử, không ghi gì.
 */
@SpringBootTest
@Import(AcademicToolsTestConfig.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("What-if/ROI/mục tiêu ngược: công cụ TV4 trên hồ sơ DB, chỉ đọc, không dùng hồ sơ mẫu")
class SimulationApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TestAccounts accounts;

    @Autowired
    private JdbcClient jdbc;

    @Autowired
    private ControllableAcademicFacade academicFacade;

    @Autowired
    private MutablePolicyVersion policy;

    @Autowired
    private AcademicEngineSources engine;

    private StudentApi api() {
        return new StudentApi(mockMvc, objectMapper);
    }

    private StudentRecords records() {
        return new StudentRecords(api(), objectMapper);
    }

    @AfterEach
    void resetTools() {
        AcademicToolsTestConfig.reset(academicFacade, policy);
    }

    @Test
    @DisplayName("Giả lập điểm, ROI học cải thiện, mục tiêu ngược = kết quả engine trên bảng điểm DB; không ghi bảng điểm/kế hoạch")
    void whatIfToolsMatchEngineAndWriteNothing() throws Exception {
        String sv = "sv-whatif-a";
        String revision = transcript(sv);
        AcademicFacade reference = engineFor(sv);

        List<SimulatedCourseGrade> courses = List.of(new SimulatedCourseGrade("LP6010", 3, "A", null),
                new SimulatedCourseGrade("LP6004", 2, "B", null), new SimulatedCourseGrade("IT6126", 4, "B+", null));
        JsonNode simulated = api().call(post("/api/v1/simulation/grades"), sv, 200, "SimulateGradesResponse",
                new SimulateGradesRequest("2024604757", courses, revision));
        assertThat(simulated.get("studentId").asText()).as("studentId client gửi bị bỏ qua").isEqualTo(sv);
        assertThat(simulated.get("dataRevision").asText()).isEqualTo(revision);
        assertThat(simulated.get("policyVersion").asText()).isEqualTo(AcademicToolsTestConfig.POLICY_V1);
        assertThat(simulated.get("currentCpa").isNumber()).isTrue();
        assertSameAsEngine(simulated, reference.simulateGrades(new SimulateGradesRequest(sv, courses, revision)));

        JsonNode ranked = api().call(post("/api/v1/simulation/retake-ranking"), sv, 200, "RankRetakeCoursesResponse",
                new RankRetakeCoursesRequest(null, 5, revision));
        assertThat(ranked.get("recommendations").findValuesAsText("courseCode"))
                .as("chỉ môn đạt điểm thấp (D+, C) mới đáng học cải thiện").containsExactlyInAnyOrder("LP6010", "BS6002");
        assertSameAsEngine(ranked, reference.rankRetakeCourses(new RankRetakeCoursesRequest(sv, 5, revision)));

        JsonNode target = api().call(post("/api/v1/simulation/target-grades"), sv, 200, "CalculateTargetGradesResponse",
                new CalculateTargetGradesRequest(null, new BigDecimal("3.20"), "2028_1", revision));
        assertThat(target.get("requiredAverageGpa").isNumber()).isTrue();
        assertSameAsEngine(target, reference.calculateTargetGrades(
                new CalculateTargetGradesRequest(sv, new BigDecimal("3.20"), "2028_1", revision)));

        assertThat(accounts.revision(sv)).as("xem thử không đổi dữ liệu học vụ").isEqualTo(revision);
        assertThat(api().call(get("/api/v1/academic/transcript"), sv, 200, "TranscriptResponse").get("attempts")).hasSize(5);
        assertThat(jdbc.sql("SELECT count(*) FROM study_plans WHERE student_id = :id").param("id", sv)
                .query(Integer.class).single()).isZero();
    }

    @Test
    @DisplayName("Tài khoản trùng mã hồ sơ mẫu TV4 nhận CPA từ DB; sinh viên chưa có bảng điểm nhận null, không bị gán 0")
    void noSampleProfileFallbackAndMissingDataStaysNull() throws Exception {
        String demo = "std-near-grad-ktpm";
        JsonNode status = api().call(get("/api/v1/academic/status"), demo, 200, "AcademicStatusResponse");
        JsonNode simulated = api().call(post("/api/v1/simulation/grades"), demo, 200, "SimulateGradesResponse",
                new SimulateGradesRequest(null, List.of(new SimulatedCourseGrade("IT6126", 4, "A", null)), null));
        assertThat(simulated.get("currentCpa").decimalValue()).as("CPA DB, không phải 3.35 của hồ sơ mẫu")
                .isEqualByComparingTo(status.get("cpa").decimalValue())
                .isNotEqualByComparingTo("3.35");

        String fresh = "sv-whatif-fresh";
        accounts.ensure(fresh);
        JsonNode empty = api().call(post("/api/v1/simulation/grades"), fresh, 200, "SimulateGradesResponse",
                new SimulateGradesRequest(demo, List.of(new SimulatedCourseGrade("IT6126", 4, "A", null)), null));
        assertThat(empty.get("studentId").asText()).isEqualTo(fresh);
        assertThat(empty.get("currentCpa").isNull()).isTrue();
        assertThat(empty.get("cpaDelta").isNull()).isTrue();
        assertThat(api().call(post("/api/v1/simulation/retake-ranking"), fresh, 200, "RankRetakeCoursesResponse",
                new RankRetakeCoursesRequest(null, null, null)).get("recommendations")).isEmpty();
    }

    @Test
    @DisplayName("Đầu vào sai 400, revision cũ 409, công cụ chưa thật 503, chưa đăng nhập 401, thiếu CSRF 403")
    void errors() throws Exception {
        String sv = "sv-whatif-errors";
        String revision = accounts.ensure(sv);
        List<SimulatedCourseGrade> one = List.of(new SimulatedCourseGrade("LP6010", 3, "A", null));

        api().call(post("/api/v1/simulation/grades"), sv, 400, "ApiErrorResponse", new SimulateGradesRequest(null, List.of(), null));
        api().call(post("/api/v1/simulation/grades"), sv, 400, "ApiErrorResponse",
                new SimulateGradesRequest(null, List.of(new SimulatedCourseGrade("LP6010", 3, null, null)), null));
        api().call(post("/api/v1/simulation/grades"), sv, 400, "ApiErrorResponse",
                new SimulateGradesRequest(null, List.of(new SimulatedCourseGrade("LP6010", 0, "A", null)), null));
        api().call(post("/api/v1/simulation/retake-ranking"), sv, 400, "ApiErrorResponse", new RankRetakeCoursesRequest(null, 0, null));
        api().call(post("/api/v1/simulation/target-grades"), sv, 400, "ApiErrorResponse",
                new CalculateTargetGradesRequest(null, new BigDecimal("4.5"), null, null));
        api().call(post("/api/v1/simulation/target-grades"), sv, 400, "ApiErrorResponse",
                new CalculateTargetGradesRequest(null, new BigDecimal("3.0"), "2028-1", null));

        accounts.bumpRevision(sv);
        assertThat(api().call(post("/api/v1/simulation/grades"), sv, 409, "ApiErrorResponse",
                new SimulateGradesRequest(null, one, revision)).get("code").asText()).isEqualTo("DATA_REVISION_STALE");

        academicFacade.setReady(false);
        for (var call : List.of(
                api().perform(post("/api/v1/simulation/grades"), sv, new SimulateGradesRequest(null, one, null)),
                api().perform(post("/api/v1/simulation/retake-ranking"), sv, new RankRetakeCoursesRequest(null, 3, null)),
                api().perform(post("/api/v1/simulation/target-grades"), sv,
                        new CalculateTargetGradesRequest(null, new BigDecimal("3.0"), null, null)))) {
            assertThat(call.getResponse().getStatus()).isEqualTo(503);
            assertThat(api().read(call).get("code").asText()).isEqualTo("TOOL_NOT_READY");
        }
        academicFacade.reset();

        String body = objectMapper.writeValueAsString(new SimulateGradesRequest(null, one, null));
        assertThat(mockMvc.perform(post("/api/v1/simulation/grades").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body)).andReturn().getResponse().getStatus()).isEqualTo(401);
        assertThat(mockMvc.perform(post("/api/v1/simulation/grades").contentType(MediaType.APPLICATION_JSON).content(body)
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(sv)
                        .roles("STUDENT"))).andReturn().getResponse().getStatus()).isEqualTo(403);
    }

    // ---------------------------------------------------------------------------------------------

    private String transcript(String sv) throws Exception {
        StudentRecords records = records();
        return records.confirmManualImport(sv, accounts.ensure(sv),
                records.row("LP6010", "2024_1", 5.2, "D+"), records.row("IT6015", "2024_1", 9.0, "A"),
                records.row("BS6002", "2024_1", 6.0, "C"), records.row("LP6004", "2024_2", 3.0, "F"),
                records.row("BS6018", "2024_2", 7.5, "B"));
    }

    /** Engine TV4 với hồ sơ dựng độc lập từ API (cùng quy chế/CTĐT với runtime). */
    private AcademicFacade engineFor(String sv) throws Exception {
        return new DefaultAcademicFacade(null, engine.policy(), engine.curriculum(), Map.of(sv, records().profileFromApi(sv)));
    }

    /** Kết quả API = kết quả engine; platform chỉ thêm policyVersion. */
    private void assertSameAsEngine(JsonNode api, Object engineResult) throws Exception {
        ObjectNode actual = api.deepCopy();
        actual.remove("policyVersion");
        ObjectNode expected = (ObjectNode) records().json(engineResult);
        expected.remove("policyVersion");
        assertThat(actual).isEqualTo(expected);
    }
}
