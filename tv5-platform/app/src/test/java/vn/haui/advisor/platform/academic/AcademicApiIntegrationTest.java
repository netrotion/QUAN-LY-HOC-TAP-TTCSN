package vn.haui.advisor.platform.academic;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import vn.haui.advisor.academic.service.DefaultAcademicFacade;
import vn.haui.advisor.contracts.dto.AcademicStatusRequest;
import vn.haui.advisor.contracts.dto.ConfirmTranscriptImportRequest;
import vn.haui.advisor.contracts.dto.CourseEligibilityRequest;
import vn.haui.advisor.contracts.dto.GraduationAuditRequest;
import vn.haui.advisor.contracts.dto.GraduationAuditResponse;
import vn.haui.advisor.contracts.ports.AcademicFacade;
import vn.haui.advisor.contracts.ports.StudentAcademicRecordProvider;
import vn.haui.advisor.contracts.ports.StudentContextProvider;
import vn.haui.advisor.platform.security.DbStudentContextProvider;
import vn.haui.advisor.platform.support.StudentApi;
import vn.haui.advisor.platform.support.TestAccounts;
import vn.haui.advisor.platform.transcript.DbStudentAcademicRecordProvider;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

/**
 * Task 4.1 (academic-api-live): trạng thái học vụ, điều kiện học phần, cây CTĐT và rà soát tốt nghiệp chạy AcademicFacade
 * thật của TV4 trên hồ sơ DB. Hai tài khoản có bảng điểm khác nhau (nhập qua API); mọi kết quả API được so với gọi facade
 * trực tiếp cho đúng sinh viên đó; tài khoản trùng mã hồ sơ mẫu của TV4 không nhận số liệu mẫu.
 * Context dùng bean runtime (không import cấu hình test thay facade).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("API học vụ nối công cụ thật: hai tài khoản, so kết quả facade, không fallback mock")
class AcademicApiIntegrationTest {

    /** Quy chế demo của TV4 (policy-demo.json) mà engine đang dùng. */
    private static final String POLICY = "policy-haui-demo-2026@0.0.1-v0";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TestAccounts accounts;

    @Autowired
    private AcademicFacade academicFacade;

    @Autowired
    private ApplicationContext context;

    @Test
    @DisplayName("Runtime nối công cụ thật: DefaultAcademicFacade của TV4 + StudentContextProvider/RecordProvider trên DB, không bean giả")
    void liveBindingsOnly() {
        assertThat(academicFacade).isExactlyInstanceOf(DefaultAcademicFacade.class);
        assertThat(context.getBean(StudentContextProvider.class)).isInstanceOf(DbStudentContextProvider.class);
        assertThat(context.getBean(StudentAcademicRecordProvider.class)).isInstanceOf(DbStudentAcademicRecordProvider.class);
        assertThat(context.getBean(PolicyVersionSource.class).currentPolicyVersion()).isEqualTo(POLICY);
        for (String name : context.getBeanDefinitionNames()) {
            Class<?> type = context.getType(name);
            String typeName = type == null ? "" : type.getName();
            assertThat(typeName).as("bean %s", name)
                    .doesNotStartWith("vn.haui.advisor.contracts.fake")
                    .doesNotStartWith("vn.haui.advisor.ai.mock");
        }
    }

    @Test
    @DisplayName("Hai tài khoản: mỗi người chỉ nhận kết quả tính trên bảng điểm của mình; API = facade; studentId client gửi bị bỏ qua")
    void twoAccountsMatchFacade() throws Exception {
        String a = "sv-academic-a";
        String b = "sv-academic-b";
        String revisionA = confirmManualImport(a, accounts.ensure(a),
                row(a, "IT6015", "2024_1", "9.0", "A"), row(a, "LP6010", "2024_1", "5.2", "D+"),
                row(a, "LP6011", "2024_2", "6.0", "C"), row(a, "LP6004", "2024_2", "3.0", "F"),
                row(a, "IT6126", "2025_2", null, null));
        String revisionB = confirmManualImport(b, accounts.ensure(b),
                row(b, "BS6001", "2024_1", "7.5", "B"), row(b, "IT6015", "2024_1", "3.5", "F"));

        Map<String, JsonNode> statusBySv = new HashMap<>();
        for (String sv : new String[]{a, b}) {
            String revision = sv.equals(a) ? revisionA : revisionB;

            JsonNode status = api().call(get("/api/v1/academic/status"), sv, 200, "AcademicStatusResponse");
            assertServerStamp(status, sv, revision);
            assertSameAsFacade(status, academicFacade.getAcademicStatus(new AcademicStatusRequest(sv, revision)));
            statusBySv.put(sv, status);

            JsonNode audit = api().call(get("/api/v1/audit/graduation"), sv, 200, "GraduationAuditResponse");
            assertServerStamp(audit, sv, revision);
            assertSameAsFacade(audit, academicFacade.runGraduationAudit(new GraduationAuditRequest(sv, revision)));

            // Gửi studentId của tài khoản kia: server bỏ qua, tính cho sinh viên đang đăng nhập
            String other = sv.equals(a) ? b : a;
            JsonNode eligibility = api().call(post("/api/v1/academic/eligibility"), sv, 200, "CourseEligibilityResponse",
                    new CourseEligibilityRequest(other, "LP6011", "2026_1", revision));
            assertThat(eligibility.get("dataRevision").asText()).isEqualTo(revision);
            assertThat(eligibility.get("policyVersion").asText()).isEqualTo(POLICY);
            assertSameAsFacade(eligibility, academicFacade.checkCourseEligibility(
                    new CourseEligibilityRequest(sv, "LP6011", "2026_1", revision)));

            JsonNode curriculum = api().call(get("/api/v1/academic/curriculum"), sv, 200, "CurriculumResponse");
            assertThat(curriculum.get("dataRevision").asText()).isEqualTo(revision);
            assertThat(curriculum.get("policyVersion").asText()).isEqualTo(POLICY);
        }

        // Kết quả khác nhau theo bảng điểm của từng người
        assertThat(statusBySv.get(a).get("cpa")).isNotEqualTo(statusBySv.get(b).get("cpa"));
        // A: IT6015 (3) + LP6010 (3) + LP6011 (2); LP6004 điểm F, IT6126 chưa có điểm. B: BS6001 (3)
        assertThat(statusBySv.get(a).get("accumulatedCredits").asInt()).isEqualTo(8);
        assertThat(statusBySv.get(b).get("accumulatedCredits").asInt()).isEqualTo(3);
        assertThat(api().call(post("/api/v1/academic/eligibility"), a, 200, "CourseEligibilityResponse",
                eligibilityRequest("LP6011")).get("eligible").asBoolean()).isTrue();
        assertThat(api().call(post("/api/v1/academic/eligibility"), b, 200, "CourseEligibilityResponse",
                eligibilityRequest("LP6011")).get("eligible").asBoolean()).isFalse();
    }

    @Test
    @DisplayName("Cây CTĐT: trạng thái theo bảng điểm đã xác nhận, điều kiện là kết quả nguyên văn của facade, kèm revision/quy chế")
    void curriculumTree() throws Exception {
        String a = "sv-academic-tree-a";
        String b = "sv-academic-tree-b";
        String revisionA = confirmManualImport(a, accounts.ensure(a),
                row(a, "IT6015", "2024_1", "9.0", "A"), row(a, "LP6010", "2024_1", "5.2", "D+"),
                row(a, "LP6004", "2024_2", "3.0", "F"), row(a, "IT6126", "2025_2", null, null));
        String revisionB = confirmManualImport(b, accounts.ensure(b), row(b, "IT6015", "2024_1", "3.5", "F"));

        JsonNode treeA = api().call(get("/api/v1/academic/curriculum/tree"), a, 200, "CurriculumTreeResponse");
        assertServerStamp(treeA, a, revisionA);
        assertThat(treeA.get("transcriptStatus").asText()).isEqualTo("CONFIRMED");
        assertThat(treeA.get("totalCreditsRequired").asInt()).isEqualTo(150);
        assertThat(treeA.get("courses")).hasSize(120);
        for (JsonNode node : treeA.get("courses")) {
            ObjectNode actual = objectMapper.createObjectNode();
            for (String field : new String[]{"courseCode", "eligible", "missingPrerequisites", "warnings"}) {
                actual.set(field, node.get(field));
            }
            ObjectNode expected = (ObjectNode) objectMapper.valueToTree(academicFacade.checkCourseEligibility(
                    new CourseEligibilityRequest(a, node.get("courseCode").asText(), null, revisionA)));
            expected.remove("dataRevision");
            expected.remove("policyVersion");
            assertThat(actual).as("nút %s", node.get("courseCode")).isEqualTo(expected);
        }
        assertNode(treeA, "IT6015", "PASSED", "A");
        assertNode(treeA, "LP6010", "PASSED", "D+");
        assertNode(treeA, "LP6004", "FAILED", "F");
        assertNode(treeA, "IT6126", "IN_PROGRESS", null);
        assertNode(treeA, "LP6011", "ELIGIBLE", null);
        assertThat(node(treeA, "IT6083").get("status").asText()).isEqualTo("BLOCKED");

        JsonNode treeB = api().call(get("/api/v1/academic/curriculum/tree"), b, 200, "CurriculumTreeResponse");
        assertServerStamp(treeB, b, revisionB);
        assertNode(treeB, "IT6015", "FAILED", "F");
        assertNode(treeB, "LP6010", "ELIGIBLE", null);
        assertNode(treeB, "IT6126", "ELIGIBLE", null);
        assertNode(treeB, "LP6011", "BLOCKED", null);
        assertNode(treeB, "LP6004", "BLOCKED", null);

        // Chưa có bảng điểm xác nhận: không khẳng định đạt/khóa
        String none = "sv-academic-tree-none";
        accounts.ensure(none);
        JsonNode empty = api().call(get("/api/v1/academic/curriculum/tree"), none, 200, "CurriculumTreeResponse");
        assertThat(empty.get("transcriptStatus").asText()).isEqualTo("NONE");
        assertThat(empty.get("courses").findValuesAsText("status")).containsOnly("UNKNOWN");
    }

    @Test
    @DisplayName("dataRevision theo hồ sơ server: nhập lại bảng điểm → kết quả tính lại; revision cũ của client → 409")
    void resultsFollowServerRevision() throws Exception {
        String sv = "sv-academic-revision";
        String first = confirmManualImport(sv, accounts.ensure(sv), row(sv, "IT6015", "2024_1", "9.0", "A"));
        JsonNode before = api().call(get("/api/v1/academic/status"), sv, 200, "AcademicStatusResponse");
        assertThat(before.get("dataRevision").asText()).isEqualTo(first);
        assertThat(before.get("accumulatedCredits").asInt()).isEqualTo(3);

        String second = confirmManualImport(sv, first,
                row(sv, "IT6015", "2024_1", "9.0", "A"), row(sv, "BS6001", "2024_1", "7.5", "B"));
        JsonNode after = api().call(get("/api/v1/academic/status"), sv, 200, "AcademicStatusResponse");
        assertThat(after.get("dataRevision").asText()).isEqualTo(second).isNotEqualTo(first);
        assertThat(after.get("accumulatedCredits").asInt()).isEqualTo(6);
        assertSameAsFacade(after, academicFacade.getAcademicStatus(new AcademicStatusRequest(sv, second)));

        JsonNode stale = api().call(post("/api/v1/academic/eligibility"), sv, 409, "ApiErrorResponse",
                new CourseEligibilityRequest(null, "IT6002", null, first));
        assertThat(stale.get("code").asText()).isEqualTo("DATA_REVISION_STALE");
        api().call(post("/api/v1/academic/eligibility"), sv, 200, "CourseEligibilityResponse",
                new CourseEligibilityRequest(null, "IT6002", null, second));
        api().call(post("/api/v1/academic/eligibility"), sv, 400, "ApiErrorResponse",
                new CourseEligibilityRequest(null, "IT6002", "2026-1", second));
    }

    @Test
    @DisplayName("Không fallback hồ sơ mẫu: tài khoản trùng mã sinh viên mẫu của TV4 (CPA 3.12, 112 TC) nhận đúng dữ liệu DB")
    void noFixtureProfileFallback() throws Exception {
        // std-2026-003 là hồ sơ mẫu của TV4 (student-profiles-v0.json) không được seed vào DB
        String sv = "std-2026-003";
        String revision = accounts.ensure(sv);

        JsonNode status = api().call(get("/api/v1/academic/status"), sv, 200, "AcademicStatusResponse");
        assertThat(status.get("cpa").isNull()).as("chưa có bảng điểm: CPA chưa xác định").isTrue();
        assertThat(status.get("gpa").isNull()).isTrue();
        assertThat(status.get("accumulatedCredits").asInt()).isNotEqualTo(112);
        assertSameAsFacade(status, academicFacade.getAcademicStatus(new AcademicStatusRequest(sv, revision)));
        // Facade dựng với hồ sơ mẫu (cách wiring cũ) sẽ trả số liệu mẫu cho cùng mã sinh viên
        assertThat(new DefaultAcademicFacade().getAcademicStatus(new AcademicStatusRequest(sv, revision)).getCpa())
                .isEqualByComparingTo("3.12");

        JsonNode audit = api().call(get("/api/v1/audit/graduation"), sv, 200, "GraduationAuditResponse");
        assertThat(audit.get("accumulatedCredits").asInt()).isNotEqualTo(112);
        assertSameAsFacade(audit, academicFacade.runGraduationAudit(new GraduationAuditRequest(sv, revision)));

        JsonNode eligibility = api().call(post("/api/v1/academic/eligibility"), sv, 200, "CourseEligibilityResponse",
                eligibilityRequest("LP6011"));
        assertThat(eligibility.get("eligible").asBoolean()).isFalse();

        // Sinh viên demo seed từ fixture TV4: kết quả vẫn tính từ bảng điểm DB, khớp facade
        String demo = "2024604757";
        JsonNode demoStatus = api().call(get("/api/v1/academic/status"), demo, 200, "AcademicStatusResponse");
        assertSameAsFacade(demoStatus, academicFacade.getAcademicStatus(
                new AcademicStatusRequest(demo, accounts.revision(demo))));
    }

    @Test
    @DisplayName("Chưa đăng nhập → 401 cho mọi API học vụ")
    void requiresLogin() throws Exception {
        for (String path : new String[]{"/api/v1/academic/status", "/api/v1/academic/curriculum/tree", "/api/v1/audit/graduation"}) {
            int status = mockMvc.perform(get(path)).andReturn().getResponse().getStatus();
            assertThat(status).as(path).isEqualTo(401);
        }
    }

    // ---------------------------------------------------------------------------------------------

    private StudentApi api() {
        return new StudentApi(mockMvc, objectMapper);
    }

    /**
     * Kết quả API = kết quả facade cho cùng sinh viên/revision (qua cùng ObjectMapper ra JSON); platform chỉ thêm
     * policyVersion và bỏ deadline không phải ngày (AcademicApiService#dropNonDateDeadline).
     */
    private void assertSameAsFacade(JsonNode api, Object facadeResult) throws Exception {
        if (facadeResult instanceof GraduationAuditResponse audit && audit.getPendingActions() != null) {
            audit.getPendingActions().forEach(AcademicApiService::dropNonDateDeadline);
        }
        ObjectNode actual = api.deepCopy();
        ObjectNode expected = (ObjectNode) objectMapper.readTree(objectMapper.writeValueAsString(facadeResult));
        assertThat(actual.remove("policyVersion").asText()).isEqualTo(POLICY);
        expected.remove("policyVersion");
        assertThat(actual).isEqualTo(expected);
    }

    private static void assertServerStamp(JsonNode response, String sv, String revision) {
        assertThat(response.get("studentId").asText()).isEqualTo(sv);
        assertThat(response.get("dataRevision").asText()).isEqualTo(revision);
        assertThat(response.get("policyVersion").asText()).isEqualTo(POLICY);
    }

    private static void assertNode(JsonNode tree, String courseCode, String status, String letterGrade) {
        JsonNode node = node(tree, courseCode);
        assertThat(node.get("status").asText()).as(courseCode).isEqualTo(status);
        if (letterGrade == null) {
            assertThat(node.get("letterGrade").isNull()).as(courseCode).isTrue();
        } else {
            assertThat(node.get("letterGrade").asText()).as(courseCode).isEqualTo(letterGrade);
        }
    }

    private static JsonNode node(JsonNode tree, String courseCode) {
        for (JsonNode course : tree.get("courses")) {
            if (course.get("courseCode").asText().equals(courseCode)) {
                return course;
            }
        }
        throw new AssertionError("Cây thiếu học phần " + courseCode);
    }

    private ObjectNode eligibilityRequest(String courseCode) {
        return objectMapper.createObjectNode().put("courseCode", courseCode);
    }

    private ObjectNode row(String sv, String courseCode, String semesterCode, String score10, String letterGrade) {
        ObjectNode row = objectMapper.createObjectNode().put("courseCode", courseCode).put("semesterCode", semesterCode);
        if (score10 != null) {
            row.put("score10", new java.math.BigDecimal(score10));
        }
        if (letterGrade != null) {
            row.put("letterGrade", letterGrade);
        }
        return row;
    }

    /** Nhập tay → xem lại → xác nhận qua API; trả dataRevision mới. */
    private String confirmManualImport(String sv, String revision, ObjectNode... rows) throws Exception {
        JsonNode session = api().call(post("/api/v1/academic/transcript/imports/manual"), sv, 200, "TranscriptImportResponse");
        String base = "/api/v1/academic/transcript/imports/" + session.get("importSessionId").asText();
        ObjectNode update = objectMapper.createObjectNode().put("sessionVersion", session.get("sessionVersion").asInt());
        ArrayNode list = update.putArray("rows");
        for (ObjectNode row : rows) {
            list.add(row);
        }
        JsonNode reviewed = api().call(put(base + "/rows"), sv, 200, "TranscriptImportResponse", update);
        assertThat(reviewed.get("blockingIssueCount").asInt()).as(reviewed.toString()).isZero();
        return api().call(post(base + "/confirm"), sv, 200, "TranscriptResponse",
                new ConfirmTranscriptImportRequest(reviewed.get("sessionVersion").asInt(), revision)).get("dataRevision").asText();
    }
}
