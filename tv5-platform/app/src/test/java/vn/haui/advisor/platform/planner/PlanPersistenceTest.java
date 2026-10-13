package vn.haui.advisor.platform.planner;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.ConversationStore;
import vn.haui.advisor.platform.support.AcademicToolsTestConfig;
import vn.haui.advisor.platform.support.AcademicToolsTestConfig.ControllableAcademicFacade;
import vn.haui.advisor.platform.support.AcademicToolsTestConfig.MutablePolicyVersion;
import vn.haui.advisor.platform.support.StudentApi;
import vn.haui.advisor.platform.support.TestAccounts;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/**
 * Task 3.7: kế hoạch lưu trên DB — lưu/mở lại/hủy, sửa đồng thời, nhập bảng điểm lặp, kích hoạt kiểm tra revision
 * hồ sơ/quy chế/kế hoạch, một ACTIVE mỗi sinh viên, không chéo tài khoản.
 */
@SpringBootTest
@Import(AcademicToolsTestConfig.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Kế hoạch trên DB: lưu, mở lại, hủy, đồng thời, import lặp, một ACTIVE, cô lập tài khoản")
class PlanPersistenceTest {

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
    private ConversationStore conversationStore;

    private StudentApi api() {
        return new StudentApi(mockMvc, objectMapper);
    }

    @AfterEach
    void resetTools() {
        AcademicToolsTestConfig.reset(academicFacade, policy);
    }

    @Test
    @DisplayName("Lưu → mở lại đủ học kỳ/học phần/action từ DB; sửa thay toàn bộ nội dung, không để dòng mồ côi")
    void saveReopenAndEdit() throws Exception {
        String sv = "sv-plan-persist";
        String revision = accounts.ensure(sv);
        List<ChatActionItem> actions = List.of(
                new ChatActionItem("OPEN_CERTIFICATE", "Khai báo TOEIC", "/certificates", "{\"requirementCode\":\"FOREIGN_LANGUAGE\"}",
                        "Chuẩn đầu ra ngoại ngữ", 1),
                new ChatActionItem("RETAKE", "Học lại LP6004", "/planner", null, null, 2));
        List<PlannedSemesterItem> semesters = List.of(
                semester("2026_1", course("IT6015", 3), course("IT9TEST01", 3)),
                semester("2026_2", course("IT9TEST02", 2)));

        JsonNode saved = api().call(post("/api/v1/planner/plans"), sv, 200, "SaveStudyPlanResponse",
                request(null, null, revision, semesters, actions));
        String planId = saved.get("planId").asText();
        assertThat(planId).matches("plan-sv-plan-persist-\\d{4}");
        assertThat(saved.get("status").asText()).isEqualTo("DRAFT");

        JsonNode reopened = api().call(get("/api/v1/planner/plans/" + planId), sv, 200, "StudyPlanDetailResponse");
        assertThat(reopened.get("planName").asText()).isEqualTo("Kế hoạch lưu DB");
        assertThat(reopened.get("targetCpa").decimalValue()).isEqualByComparingTo("3.2");
        assertThat(reopened.get("totalCredits").asInt()).isEqualTo(8);
        assertThat(reopened.get("semesters").findValuesAsText("semesterCode")).containsExactly("2026_1", "2026_2");
        assertThat(reopened.get("semesters").get(0).get("courses").findValuesAsText("courseCode"))
                .containsExactly("IT6015", "IT9TEST01");
        assertThat(reopened.get("semesters").get(0).get("courses").get(0).get("rationale").asText()).isEqualTo("Theo CTĐT");
        assertThat(reopened.get("actions").findValuesAsText("actionType")).containsExactly("OPEN_CERTIFICATE", "RETAKE");
        assertThat(reopened.get("actions").get(0).get("payloadJson").asText()).contains("FOREIGN_LANGUAGE");
        assertThat(api().call(get("/api/v1/planner/plans"), sv, 200, "StudyPlanListResponse")
                .get("plans").findValuesAsText("planId")).containsExactly(planId);

        assertThat(rows("SELECT count(*) FROM plan_semesters WHERE plan_id = :id", planId)).isEqualTo(2);
        assertThat(rows("SELECT count(*) FROM plan_actions WHERE plan_id = :id", planId)).isEqualTo(2);
        assertThat(jdbc.sql("""
                        SELECT pc.course_id FROM planned_courses pc JOIN plan_semesters s ON s.plan_semester_id = pc.plan_semester_id
                        WHERE s.plan_id = :id ORDER BY s.semester_order, pc.sort_order
                        """).param("id", planId).query((rs, n) -> String.valueOf(rs.getString(1))).list())
                .as("môn có trong danh mục được liên kết, môn ngoài danh mục giữ mã").containsExactly("IT6015", "null", "null");

        JsonNode edited = api().call(post("/api/v1/planner/plans"), sv, 200, "SaveStudyPlanResponse",
                request(planId, 1, revision, List.of(semester("2026_1", course("IT6015", 3))), List.of()));
        assertThat(edited.get("planVersion").asInt()).isEqualTo(2);
        assertThat(rows("SELECT count(*) FROM plan_semesters WHERE plan_id = :id", planId)).isEqualTo(1);
        assertThat(rows("SELECT count(*) FROM plan_actions WHERE plan_id = :id", planId)).isZero();
        assertThat(rows("""
                SELECT count(*) FROM planned_courses pc JOIN plan_semesters s ON s.plan_semester_id = pc.plan_semester_id
                WHERE s.plan_id = :id
                """, planId)).isEqualTo(1);
        assertThat(api().call(get("/api/v1/planner/plans/" + planId), sv, 200, "StudyPlanDetailResponse")
                .get("totalCredits").asInt()).isEqualTo(3);
    }

    @Test
    @DisplayName("Hủy chỉ áp dụng cho bản nháp; mã kế hoạch không tái sử dụng; ACTIVE không hủy được")
    void deleteDraftsOnly() throws Exception {
        String sv = "sv-plan-delete";
        String revision = accounts.ensure(sv);
        String draft = save(sv, revision);
        validate(sv, draft, 1, "VALIDATED");

        api().call(delete(plan(draft)), sv, 400, "ApiErrorResponse");
        assertThat(api().call(delete(plan(draft)).param("planVersion", "2"), sv, 409, "ApiErrorResponse")
                .get("code").asText()).isEqualTo("PLAN_VERSION_CONFLICT");
        api().call(delete(plan(draft)).param("planVersion", "1"), sv, 204, null);
        api().call(get(plan(draft)), sv, 404, "ApiErrorResponse");
        assertThat(rows("SELECT count(*) FROM plan_semesters WHERE plan_id = :id", draft)).isZero();

        String next = save(sv, revision);
        assertThat(next).as("mã kế hoạch đã hủy không cấp lại").isNotEqualTo(draft);

        validate(sv, next, 1, "VALIDATED");
        activate(sv, next, 1, revision, 200);
        JsonNode refused = api().call(delete(plan(next)).param("planVersion", "1"), sv, 409, "ApiErrorResponse");
        assertThat(refused.get("code").asText()).isEqualTo("PLAN_NOT_EDITABLE");
        assertThat(status(sv, next)).isEqualTo("ACTIVE");
    }

    @Test
    @DisplayName("Sửa đồng thời cùng planVersion: đúng một yêu cầu thắng, còn lại 409 PLAN_VERSION_CONFLICT")
    void concurrentEditsOnlyOneWins() throws Exception {
        String sv = "sv-plan-concurrent";
        String revision = accounts.ensure(sv);
        String planId = save(sv, revision);

        List<MvcResult> results = concurrently(6, i -> api().perform(post("/api/v1/planner/plans"), sv,
                request(planId, 1, revision, List.of(semester("2026_1", course("IT9EDIT" + i, 3))), List.of())));

        List<Integer> statuses = results.stream().map(r -> r.getResponse().getStatus()).toList();
        assertThat(statuses).filteredOn(s -> s == 200).hasSize(1);
        assertThat(statuses).filteredOn(s -> s == 409).hasSize(5);
        for (MvcResult result : results) {
            if (result.getResponse().getStatus() == 409) {
                assertThat(api().read(result).get("code").asText()).isEqualTo("PLAN_VERSION_CONFLICT");
            }
        }
        JsonNode detail = api().call(get(plan(planId)), sv, 200, "StudyPlanDetailResponse");
        assertThat(detail.get("planVersion").asInt()).isEqualTo(2);
        assertThat(detail.get("semesters").get(0).get("courses")).hasSize(1);
    }

    @Test
    @DisplayName("Kích hoạt đồng thời hai kế hoạch: cuối cùng chỉ một ACTIVE; DB chặn ACTIVE thứ hai")
    void concurrentActivationsKeepOneActive() throws Exception {
        String sv = "sv-plan-one-active";
        String revision = accounts.ensure(sv);
        String first = save(sv, revision);
        String second = save(sv, revision);
        validate(sv, first, 1, "VALIDATED");
        validate(sv, second, 1, "VALIDATED");

        List<String> ids = List.of(first, second);
        List<MvcResult> results = concurrently(2, i -> api().perform(post(plan(ids.get(i)) + "/activate"), sv,
                new ActivateStudyPlanRequest(1, revision)));
        assertThat(results).allSatisfy(r -> assertThat(r.getResponse().getStatus()).isEqualTo(200));

        assertThat(rows("SELECT count(*) FROM study_plans WHERE student_id = :id AND status = 'ACTIVE'", sv)).isEqualTo(1);
        assertThat(rows("SELECT count(*) FROM study_plans WHERE student_id = :id AND status = 'ARCHIVED'", sv)).isEqualTo(1);
        String archived = jdbc.sql("SELECT plan_id FROM study_plans WHERE student_id = :id AND status = 'ARCHIVED'")
                .param("id", sv).query(String.class).single();

        assertThatThrownBy(() -> jdbc.sql("UPDATE study_plans SET status = 'ACTIVE', active_student_id = student_id WHERE plan_id = :id")
                .param("id", archived).update())
                .as("ràng buộc DB: một ACTIVE mỗi sinh viên").isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.sql("UPDATE study_plans SET status = 'ACTIVE' WHERE plan_id = :id")
                .param("id", archived).update())
                .as("ACTIVE luôn phải mang dấu active_student_id").isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("Nhập bảng điểm lặp: revision đổi → kích hoạt bằng revision cũ bị chặn, thẩm định lại trên dữ liệu mới, không nhân đôi bảng điểm")
    void repeatedImportForcesRecheck() throws Exception {
        String sv = "sv-plan-reimport";
        String rev1 = accounts.ensure(sv);
        String planId = save(sv, rev1);
        validate(sv, planId, 1, "VALIDATED");

        String rev2 = confirmManualImport(sv, rev1, row("IT6015", "2024_1", 8.5, "A"), row("DC6006", "2024_1", 8.7, "A"));
        assertThat(rev2).isNotEqualTo(rev1);

        JsonNode stale = activate(sv, planId, 1, rev1, 409);
        assertThat(stale.get("code").asText()).isEqualTo("DATA_REVISION_STALE");
        JsonNode validated = api().call(get(plan(planId)), sv, 200, "StudyPlanDetailResponse");
        assertThat(validated.get("status").asText()).isEqualTo("VALIDATED");
        assertThat(validated.get("warnings").toString()).contains("Dữ liệu học vụ đã thay đổi sau khi kiểm tra điều kiện");

        String rev3 = confirmManualImport(sv, rev2, row("IT6015", "2024_1", 9.0, "A"));
        JsonNode transcript = api().call(get("/api/v1/academic/transcript"), sv, 200, "TranscriptResponse");
        assertThat(transcript.get("attempts")).as("import sau thay thế, không cộng dồn").hasSize(1);
        assertThat(transcript.get("dataRevision").asText()).isEqualTo(rev3);

        JsonNode activated = activate(sv, planId, 1, rev3, 200);
        assertThat(activated.get("message").asText()).contains("Dữ liệu học vụ đã thay đổi", "kiểm tra lại");
        JsonNode active = api().call(get(plan(planId)), sv, 200, "StudyPlanDetailResponse");
        assertThat(active.get("status").asText()).isEqualTo("ACTIVE");
        assertThat(active.get("dataRevision").asText()).isEqualTo(rev3);
        assertThat(active.get("warnings").toString()).doesNotContain("đã thay đổi");

        confirmManualImport(sv, rev3, row("IT6015", "2024_1", 7.0, "B"));
        assertThat(api().call(get(plan(planId)), sv, 200, "StudyPlanDetailResponse").get("warnings").toString())
                .as("theo dõi: kế hoạch ACTIVE dựa trên dữ liệu cũ").contains("Dữ liệu học vụ đã thay đổi sau khi kích hoạt");
    }

    @Test
    @DisplayName("Đổi quy chế sau khi thẩm định: kích hoạt thẩm định lại theo quy chế mới, vi phạm thì về DRAFT")
    void policyChangeRequiresRecheck() throws Exception {
        String sv = "sv-plan-policy";
        String revision = accounts.ensure(sv);
        String planId = save(sv, revision);
        JsonNode result = validate(sv, planId, 1, "VALIDATED");
        assertThat(result.get("validationMode").asText()).isEqualTo("REAL");
        assertThat(result.get("policyVersion").asText()).isEqualTo(AcademicToolsTestConfig.POLICY_V1);

        policy.set("policy-test@2");
        assertThat(api().call(get(plan(planId)), sv, 200, "StudyPlanDetailResponse").get("warnings").toString())
                .contains("Quy chế đã cập nhật");

        academicFacade.forceViolations("Quy chế mới: học kỳ 2026_1 vượt số tín chỉ tối đa");
        JsonNode failed = activate(sv, planId, 1, revision, 422);
        assertThat(failed.get("code").asText()).isEqualTo("PLAN_VALIDATION_FAILED");
        assertThat(failed.get("details").toString()).contains("vượt số tín chỉ tối đa");
        JsonNode draft = api().call(get(plan(planId)), sv, 200, "StudyPlanDetailResponse");
        assertThat(draft.get("status").asText()).isEqualTo("DRAFT");
        assertThat(draft.get("validatedAt").isNull()).isTrue();
        assertThat(rows("SELECT count(*) FROM study_plans WHERE student_id = :id AND status = 'ACTIVE'", sv)).isZero();

        academicFacade.reset();
        assertThat(validate(sv, planId, 1, "VALIDATED").get("policyVersion").asText()).isEqualTo("policy-test@2");
        activate(sv, planId, 1, revision, 200);
        assertThat(jdbc.sql("SELECT validated_policy_version FROM study_plans WHERE plan_id = :id").param("id", planId)
                .query(String.class).single()).isEqualTo("policy-test@2");
    }

    @Test
    @DisplayName("Sửa ACTIVE tạo DRAFT kế thừa; khôi phục tạo bản nháp mới; ACTIVE cũ giữ nguyên tới khi bản mới kích hoạt")
    void inheritedDraftAndRestore() throws Exception {
        String sv = "sv-plan-inherit-db";
        String revision = accounts.ensure(sv);
        String active = save(sv, revision);
        validate(sv, active, 1, "VALIDATED");
        activate(sv, active, 1, revision, 200);

        JsonNode inherited = api().call(post("/api/v1/planner/plans"), sv, 200, "SaveStudyPlanResponse",
                request(active, 1, revision, List.of(semester("2026_1", course("IT9NEW01", 3))), List.of()));
        assertThat(inherited.get("planId").asText()).isNotEqualTo(active);
        assertThat(inherited.get("sourcePlanId").asText()).isEqualTo(active);
        assertThat(status(sv, active)).isEqualTo("ACTIVE");

        JsonNode restored = api().call(post(plan(active) + "/restore"), sv, 200, "StudyPlanDetailResponse",
                new RestoreStudyPlanRequest("Bản khôi phục"));
        assertThat(restored.get("status").asText()).isEqualTo("DRAFT");
        assertThat(restored.get("sourcePlanId").asText()).isEqualTo(active);
        assertThat(restored.get("semesters").toString()).contains("IT6015");
    }

    @Test
    @DisplayName("Không chéo tài khoản: sinh viên khác không đọc/sửa/hủy/kích hoạt kế hoạch và không đọc hội thoại")
    void otherAccountsCannotTouchPlansOrConversations() throws Exception {
        String owner = "sv-plan-owner";
        String intruder = "sv-plan-intruder";
        String ownerRevision = accounts.ensure(owner);
        String intruderRevision = accounts.ensure(intruder);
        String planId = save(owner, ownerRevision);

        api().call(get(plan(planId)), intruder, 404, "ApiErrorResponse");
        api().call(delete(plan(planId)).param("planVersion", "1"), intruder, 404, "ApiErrorResponse");
        api().call(post("/api/v1/planner/validate"), intruder, 404, "ApiErrorResponse",
                new ValidateStudyPlanRequest(planId, owner, null, 1, null));
        api().call(post(plan(planId) + "/activate"), intruder, 404, "ApiErrorResponse",
                new ActivateStudyPlanRequest(1, intruderRevision));
        api().call(post(plan(planId) + "/restore"), intruder, 404, "ApiErrorResponse");
        api().call(post("/api/v1/planner/plans"), intruder, 404, "ApiErrorResponse",
                request(planId, 1, intruderRevision, List.of(semester("2026_1", course("IT9HACK1", 3))), List.of()));
        assertThat(api().call(get("/api/v1/planner/plans"), intruder, 200, "StudyPlanListResponse").get("plans")).isEmpty();

        JsonNode untouched = api().call(get(plan(planId)), owner, 200, "StudyPlanDetailResponse");
        assertThat(untouched.get("planVersion").asInt()).isEqualTo(1);
        assertThat(untouched.get("studentId").asText()).isEqualTo(owner);

        conversationStore.saveConversation(new ConversationRecord("conv-owner-1", owner, "Hỏi kế hoạch", null, null, "[]"));
        api().call(get("/api/v1/advisor/conversations/conv-owner-1"), intruder, 404, "ApiErrorResponse");
        assertThat(api().call(get("/api/v1/advisor/conversations"), intruder, 200, "ConversationListResponse")
                .get("conversations")).isEmpty();
        assertThatThrownBy(() -> conversationStore.saveConversation(
                new ConversationRecord("conv-owner-1", intruder, "Chiếm hội thoại", null, null, "[]")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(api().call(get("/api/v1/advisor/conversations/conv-owner-1"), owner, 200, "ConversationRecord")
                .get("title").asText()).isEqualTo("Hỏi kế hoạch");
    }

    // ---------------------------------------------------------------------------------------------

    @FunctionalInterface
    private interface Call {
        MvcResult run(int index) throws Exception;
    }

    /** Chạy n yêu cầu cùng lúc (chờ nhau ở vạch xuất phát) và trả kết quả theo thứ tự. */
    private static List<MvcResult> concurrently(int n, Call call) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<MvcResult>> futures = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                int index = i;
                Callable<MvcResult> task = () -> {
                    start.await();
                    return call.run(index);
                };
                futures.add(pool.submit(task));
            }
            start.countDown();
            List<MvcResult> results = new ArrayList<>();
            for (Future<MvcResult> future : futures) {
                results.add(future.get(30, TimeUnit.SECONDS));
            }
            return results;
        } finally {
            pool.shutdownNow();
        }
    }

    private String confirmManualImport(String sv, String revision, ObjectNode... rows) throws Exception {
        JsonNode session = api().call(post("/api/v1/academic/transcript/imports/manual"), sv, 200, "TranscriptImportResponse");
        String id = session.get("importSessionId").asText();
        ObjectNode update = objectMapper.createObjectNode().put("sessionVersion", session.get("sessionVersion").asInt());
        ArrayNode list = update.putArray("rows");
        for (ObjectNode row : rows) {
            list.add(row);
        }
        JsonNode reviewed = api().call(put(imports(id) + "/rows"), sv, 200, "TranscriptImportResponse", update);
        JsonNode transcript = api().call(post(imports(id) + "/confirm"), sv, 200, "TranscriptResponse",
                new ConfirmTranscriptImportRequest(reviewed.get("sessionVersion").asInt(), revision));
        assertThat(api().call(post(imports(id) + "/confirm"), sv, 409, "ApiErrorResponse",
                new ConfirmTranscriptImportRequest(reviewed.get("sessionVersion").asInt(), transcript.get("dataRevision").asText()))
                .get("code").asText()).as("xác nhận lặp cùng phiên").isEqualTo("IMPORT_SESSION_CLOSED");
        return transcript.get("dataRevision").asText();
    }

    private ObjectNode row(String courseCode, String semesterCode, double score10, String letterGrade) {
        return objectMapper.createObjectNode().put("courseCode", courseCode).put("semesterCode", semesterCode)
                .put("score10", score10).put("letterGrade", letterGrade);
    }

    private String save(String sv, String revision) throws Exception {
        return api().call(post("/api/v1/planner/plans"), sv, 200, "SaveStudyPlanResponse",
                        request(null, null, revision, List.of(validSemester()), List.of()))
                .get("planId").asText();
    }

    private JsonNode validate(String sv, String planId, int planVersion, String expectedStatus) throws Exception {
        JsonNode result = api().call(post("/api/v1/planner/validate"), sv, 200, "ValidateStudyPlanResponse",
                new ValidateStudyPlanRequest(planId, null, null, planVersion, null));
        assertThat(result.get("status").asText()).isEqualTo(expectedStatus);
        return result;
    }

    private JsonNode activate(String sv, String planId, int planVersion, String revision, int expectedStatus) throws Exception {
        return api().call(post(plan(planId) + "/activate"), sv, expectedStatus,
                expectedStatus == 200 ? "ActivateStudyPlanResponse" : "ApiErrorResponse",
                new ActivateStudyPlanRequest(planVersion, revision));
    }

    private String status(String sv, String planId) throws Exception {
        return api().call(get(plan(planId)), sv, 200, "StudyPlanDetailResponse").get("status").asText();
    }

    private int rows(String sql, String id) {
        return jdbc.sql(sql).param("id", id).query(Integer.class).single();
    }

    private static String plan(String planId) {
        return "/api/v1/planner/plans/" + planId;
    }

    private static String imports(String importSessionId) {
        return "/api/v1/academic/transcript/imports/" + importSessionId;
    }

    private static SaveStudyPlanRequest request(String planId, Integer planVersion, String revision,
                                                List<PlannedSemesterItem> semesters, List<ChatActionItem> actions) {
        return new SaveStudyPlanRequest(planId, "Kế hoạch lưu DB", planVersion, revision, new BigDecimal("3.20"), "2028_1", 20,
                semesters, actions);
    }

    /** Học kỳ 14 tín chỉ, trong khoảng tín chỉ quy chế cho phép. */
    private static PlannedSemesterItem validSemester() {
        return semester("2026_1", course("IT6015", 3), course("IT9BASE1", 3), course("IT9BASE2", 3), course("IT9BASE3", 3),
                course("IT9BASE4", 2));
    }

    private static PlannedSemesterItem semester(String code, PlannedCourseItem... courses) {
        return new PlannedSemesterItem(code, "Học kỳ " + code, List.of(courses), null, null);
    }

    private static PlannedCourseItem course(String code, int credits) {
        return new PlannedCourseItem(code, "Học phần " + code, credits, "B", "Theo CTĐT");
    }
}
