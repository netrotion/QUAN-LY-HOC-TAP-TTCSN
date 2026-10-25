package vn.haui.advisor.platform.planner;

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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import vn.haui.advisor.academic.engine.PlanReconciler;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.platform.academic.AcademicEngineSources;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Task 4.3b: đối chiếu kết quả học kỳ (bảng điểm đã xác nhận) với kế hoạch ACTIVE đã lưu của chính sinh viên bằng bộ đối
 * chiếu TV4. Chỉ đọc; chỉ kế hoạch ACTIVE; không chéo tài khoản.
 */
@SpringBootTest
@Import(AcademicToolsTestConfig.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Đối chiếu kế hoạch: kế hoạch ACTIVE trên DB × bảng điểm DB, chỉ đọc, PLAN_NOT_ACTIVE, xung đột version, quyền")
class ReconcileApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TestAccounts accounts;

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
    @DisplayName("Kết quả học kỳ so với đúng kế hoạch ACTIVE trên DB (đạt / trượt / bỏ lỡ), bằng kết quả bộ đối chiếu TV4; không đổi kế hoạch")
    void reconcileActivePlanAgainstDbTranscript() throws Exception {
        String sv = "sv-reconcile";
        StudentRecords records = records();
        String rev1 = records.confirmManualImport(sv, accounts.ensure(sv), records.row("LP6010", "2024_1", 8.0, "B+"),
                records.row("BS6002", "2024_1", 7.5, "B"));
        List<PlannedSemesterItem> plan = List.of(
                semester("2025_1", course("LP6011", 2, "B"), course("BS6001", 3, "A"), course("IT6126", 4, "B"),
                        course("BS6018", 2, "B")),
                semester("2025_2", course("IT6016", 3, "B"), course("DC6006", 2, "B"), course("BS6019", 2, "B"),
                        course("BS6020", 2, "B"), course("BS6021", 2, "B")));
        String planId = activePlan(sv, rev1, plan);
        JsonNode before = api().call(get(plan(planId)), sv, 200, "StudyPlanDetailResponse");

        // Kết quả học kỳ 2025_1: LP6011 đạt đúng mục tiêu, BS6001 trượt, IT6126 không học, BS6018 đạt; nhập lại cả bảng điểm
        String rev2 = records.confirmManualImport(sv, rev1, records.row("LP6010", "2024_1", 8.0, "B+"),
                records.row("BS6002", "2024_1", 7.5, "B"), records.row("LP6011", "2025_1", 7.2, "B"),
                records.row("BS6001", "2025_1", 3.0, "F"), records.row("BS6018", "2025_1", 8.6, "A"));

        JsonNode result = api().call(post("/api/v1/planner/reconcile"), sv, 200, "ReconcileStudyPlanResponse",
                new ReconcileStudyPlanRequest(planId, "2024604757", "2025_1", 1, rev2));
        assertThat(result.get("planId").asText()).isEqualTo(planId);
        assertThat(result.get("studentId").asText()).as("studentId client gửi bị bỏ qua").isEqualTo(sv);
        assertThat(result.get("planVersion").asInt()).isEqualTo(1);
        assertThat(result.get("dataRevision").asText()).isEqualTo(rev2);
        assertThat(result.get("policyVersion").asText()).isEqualTo(AcademicToolsTestConfig.POLICY_V1);
        assertThat(result.get("onTrack").asBoolean()).isFalse();
        assertThat(result.get("completedCourses").toString()).contains("LP6011", "BS6018");
        assertThat(result.get("missedOrFailedCourses").toString()).contains("BS6001", "IT6126");
        assertThat(result.get("adjustmentsRecommended").toString()).contains("BS6001", "IT6126");

        // Bằng kết quả bộ đối chiếu TV4 chạy trực tiếp trên hồ sơ dựng từ API và đúng kế hoạch đã lưu
        PlanReconciler reconciler = new PlanReconciler(engine.policy(), engine.curriculum(), Map.of(sv, records.profileFromApi(sv)));
        reconciler.registerPlan(new PlanReconciler.PlanDefinition(planId, sv, Map.of(
                "2025_1", plan.get(0).getCourses().stream().map(ReconcileApiTest::reconcilerCourse).toList(),
                "2025_2", plan.get(1).getCourses().stream().map(ReconcileApiTest::reconcilerCourse).toList())));
        ObjectNode expected = (ObjectNode) records.json(reconciler.reconcileStudyPlan(
                new ReconcileStudyPlanRequest(planId, sv, "2025_1", 1, rev2)));
        ObjectNode actual = result.deepCopy();
        actual.remove("policyVersion");
        expected.remove("policyVersion");
        assertThat(actual).isEqualTo(expected);

        JsonNode after = api().call(get(plan(planId)), sv, 200, "StudyPlanDetailResponse");
        assertThat(after.get("status").asText()).isEqualTo("ACTIVE");
        assertThat(after.get("planVersion").asInt()).isEqualTo(before.get("planVersion").asInt());
        assertThat(after.get("semesters")).as("đối chiếu chỉ đọc").isEqualTo(before.get("semesters"));
    }

    @Test
    @DisplayName("Chỉ kế hoạch ACTIVE (409 PLAN_NOT_ACTIVE); version cũ 409; revision cũ 409; đầu vào sai 400; tài khoản khác 404; công cụ chưa thật 503")
    void errorsAndPermissions() throws Exception {
        String owner = "sv-reconcile-owner";
        String intruder = "sv-reconcile-intruder";
        String revision = accounts.ensure(owner);
        String intruderRevision = accounts.ensure(intruder);
        // Chưa có bảng điểm: không xếp LP6011 vì thiếu học phần học trước LP6010
        List<PlannedSemesterItem> plan = List.of(semester("2025_1", course("BS6019", 2, "B"), course("BS6001", 3, "A"),
                course("IT6126", 4, "B"), course("BS6018", 2, "B")));

        String draft = api().call(post("/api/v1/planner/plans"), owner, 200, "SaveStudyPlanResponse", save(revision, plan))
                .get("planId").asText();
        JsonNode notActive = api().call(post("/api/v1/planner/reconcile"), owner, 409, "ApiErrorResponse",
                new ReconcileStudyPlanRequest(draft, null, "2025_1", null, null));
        assertThat(notActive.get("code").asText()).isEqualTo("PLAN_NOT_ACTIVE");

        String active = activePlan(owner, revision, plan);
        assertThat(api().call(post("/api/v1/planner/reconcile"), owner, 409, "ApiErrorResponse",
                new ReconcileStudyPlanRequest(active, null, "2025_1", 7, null)).get("code").asText()).isEqualTo("PLAN_VERSION_CONFLICT");
        assertThat(api().call(post("/api/v1/planner/reconcile"), owner, 409, "ApiErrorResponse",
                new ReconcileStudyPlanRequest(active, null, "2025_1", 1, "REV-" + owner + "-000")).get("code").asText())
                .isEqualTo("DATA_REVISION_STALE");
        api().call(post("/api/v1/planner/reconcile"), owner, 400, "ApiErrorResponse",
                new ReconcileStudyPlanRequest(active, null, null, null, null));
        api().call(post("/api/v1/planner/reconcile"), owner, 400, "ApiErrorResponse",
                new ReconcileStudyPlanRequest(active, null, "2025-1", null, null));
        assertThat(api().call(post("/api/v1/planner/reconcile"), intruder, 404, "ApiErrorResponse",
                new ReconcileStudyPlanRequest(active, owner, "2025_1", 1, intruderRevision)).get("code").asText())
                .isEqualTo("PLAN_NOT_FOUND");
        api().call(post("/api/v1/planner/reconcile"), owner, 404, "ApiErrorResponse",
                new ReconcileStudyPlanRequest("plan-2024604757-0002", null, "2026_1", null, null));

        JsonNode noResults = api().call(post("/api/v1/planner/reconcile"), owner, 200, "ReconcileStudyPlanResponse",
                new ReconcileStudyPlanRequest(active, null, "2025_1", 1, revision));
        assertThat(noResults.get("onTrack").asBoolean()).as("chưa có bảng điểm: không khẳng định đúng lộ trình").isFalse();

        academicFacade.setReady(false);
        assertThat(api().call(post("/api/v1/planner/reconcile"), owner, 503, "ApiErrorResponse",
                new ReconcileStudyPlanRequest(active, null, "2025_1", 1, null)).get("code").asText()).isEqualTo("TOOL_NOT_READY");
    }

    // ---------------------------------------------------------------------------------------------

    private String activePlan(String sv, String revision, List<PlannedSemesterItem> semesters) throws Exception {
        String planId = api().call(post("/api/v1/planner/plans"), sv, 200, "SaveStudyPlanResponse", save(revision, semesters))
                .get("planId").asText();
        api().call(post("/api/v1/planner/validate"), sv, 200, "ValidateStudyPlanResponse",
                new ValidateStudyPlanRequest(planId, null, null, 1, null));
        api().call(post(plan(planId) + "/activate"), sv, 200, "ActivateStudyPlanResponse", new ActivateStudyPlanRequest(1, revision));
        return planId;
    }

    private static SaveStudyPlanRequest save(String revision, List<PlannedSemesterItem> semesters) {
        return new SaveStudyPlanRequest(null, "Kế hoạch theo dõi", null, revision, new BigDecimal("3.20"), "2028_1", 20,
                semesters, List.of());
    }

    private static PlannedSemesterItem semester(String code, PlannedCourseItem... courses) {
        return new PlannedSemesterItem(code, "Học kỳ " + code, List.of(courses), null, null);
    }

    private static PlannedCourseItem course(String code, int credits, String targetGrade) {
        return new PlannedCourseItem(code, null, credits, targetGrade, "Theo kế hoạch");
    }

    private static PlanReconciler.PlannedCourseItem reconcilerCourse(PlannedCourseItem course) {
        return new PlanReconciler.PlannedCourseItem(course.getCourseCode(), course.getCourseName(), course.getCredits(),
                course.getTargetGrade(), course.getCourseType(), course.getRationale());
    }

    private static String plan(String planId) {
        return "/api/v1/planner/plans/" + planId;
    }
}
