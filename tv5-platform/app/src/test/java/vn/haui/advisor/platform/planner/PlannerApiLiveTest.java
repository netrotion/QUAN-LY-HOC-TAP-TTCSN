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
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import vn.haui.advisor.academic.engine.StudyPlanScheduler;
import vn.haui.advisor.academic.model.StudentProfileFixture;
import vn.haui.advisor.academic.service.DefaultAcademicFacade;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.platform.academic.AcademicEngineSources;
import vn.haui.advisor.platform.support.AcademicToolsTestConfig;
import vn.haui.advisor.platform.support.AcademicToolsTestConfig.ControllableAcademicFacade;
import vn.haui.advisor.platform.support.AcademicToolsTestConfig.MutablePolicyVersion;
import vn.haui.advisor.platform.support.StudentApi;
import vn.haui.advisor.platform.support.TestAccounts;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/**
 * Task 4.2b (planner-api-live): sinh/thẩm định kế hoạch chạy planner tool thật của TV4 trên hồ sơ DB; lưu nháp không mang
 * kết quả thẩm định; kích hoạt đổi ACTIVE trong giao dịch; kế hoạch đang theo dõi được thẩm định lại khi bảng điểm hoặc
 * quy chế đổi. Kết quả thẩm định là kết quả thật của engine TV4 (facade test chỉ khai báo thêm VALIDATE_STUDY_PLAN).
 */
@SpringBootTest
@Import(AcademicToolsTestConfig.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Planner API nối planner tool thật: tạo → sửa → validate → save → activate → read, xung đột version, quyền, thẩm định lại")
class PlannerApiLiveTest {

    /** Vi phạm REG-HAUI-02 do engine TV4 trả khi sinh viên bị cảnh báo học tập đăng ký quá 14 tín chỉ. */
    private static final String WARNING_CAP = "chỉ được phép đăng ký tối đa 14 tín chỉ";

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

    @AfterEach
    void resetTools() {
        AcademicToolsTestConfig.reset(academicFacade, policy);
    }

    @Test
    @DisplayName("Tạo → sửa → validate → save → activate → read: phương án từ bảng điểm DB, lưu nháp chưa qua nghiệp vụ, chỉ ACTIVE sau thẩm định")
    void generateEditValidateSaveActivateRead() throws Exception {
        String sv = "sv-live-flow";
        String revision = confirmManualImport(sv, accounts.ensure(sv), row("LP6010", "2024_1", 8.5, "A"),
                row("BS6002", "2024_1", 7.5, "B"), row("FL6287", "2024_1", 7.0, "B"), row("BS6018", "2024_2", 8.0, "B+"));

        // Tạo: planner tool TV4 trên đúng bảng điểm đã xác nhận trong DB
        GenerateStudyPlanRequest generate = new GenerateStudyPlanRequest(null, "2028_1", new BigDecimal("3.20"), 18, false, revision);
        JsonNode proposal = api().call(post("/api/v1/planner/generate"), sv, 200, "GenerateStudyPlanResponse", generate);
        assertThat(proposal.get("studentId").asText()).isEqualTo(sv);
        assertThat(proposal.get("status").asText()).isEqualTo("DRAFT");
        assertThat(proposal.get("dataRevision").asText()).isEqualTo(revision);
        assertThat(proposal.get("policyVersion").asText()).isEqualTo(AcademicToolsTestConfig.POLICY_V1);
        assertThat(proposal.get("warnings").toString()).doesNotContain("Chưa có bảng điểm");
        assertThat(proposal.get("semesters").findValuesAsText("courseCode"))
                .as("môn đã đạt trong bảng điểm DB không được xếp lại").isNotEmpty()
                .doesNotContain("LP6010", "BS6002", "FL6287", "BS6018");
        GenerateStudyPlanResponse reference = new StudyPlanScheduler(engine.policy(), engine.curriculum())
                .plan(profileFromApi(sv), new GenerateStudyPlanRequest(sv, "2028_1", new BigDecimal("3.20"), 18, false, revision));
        assertThat(proposal.get("semesters")).as("kết quả nguyên văn của planner tool TV4 trên hồ sơ DB")
                .isEqualTo(json(reference.getSemesters()));
        assertThat(proposal.get("projectedCpa").decimalValue()).isEqualByComparingTo(reference.getProjectedCpa());
        assertThat(proposal.get("warnings")).isEqualTo(json(reference.getWarnings()));
        int total = 0;
        for (JsonNode semester : proposal.get("semesters")) {
            total += semester.get("totalCredits").asInt();
        }
        assertThat(proposal.get("totalCredits").asInt()).isEqualTo(total);
        assertThat(rows("SELECT count(*) FROM study_plans WHERE student_id = :id", sv)).as("sinh phương án không ghi gì").isZero();

        // Sửa phương án phía client rồi kiểm tra nhanh: kết quả thật nhưng không kế hoạch nào thành VALIDATED
        List<PlannedSemesterItem> edited = edit(proposal.get("semesters"));
        JsonNode quick = api().call(post("/api/v1/planner/validate"), sv, 200, "ValidateStudyPlanResponse",
                new ValidateStudyPlanRequest(null, null, edited, null, revision));
        assertThat(quick.get("valid").asBoolean()).as("%s", quick).isTrue();
        assertThat(quick.get("validationMode").asText()).isEqualTo("REAL");
        assertThat(quick.get("status").asText()).isEqualTo("DRAFT");

        // Lưu nháp: luôn DRAFT, không mang kết quả kiểm tra vừa rồi
        JsonNode saved = api().call(post("/api/v1/planner/plans"), sv, 200, "SaveStudyPlanResponse",
                new SaveStudyPlanRequest(null, "Phương án từ planner tool", null, revision, new BigDecimal("3.20"), "2028_1", 18,
                        edited, List.of()));
        String planId = saved.get("planId").asText();
        assertThat(saved.get("status").asText()).isEqualTo("DRAFT");
        assertThat(saved.get("message").asText()).contains("chưa được kiểm tra điều kiện");
        JsonNode draft = api().call(get(plan(planId)), sv, 200, "StudyPlanDetailResponse");
        assertThat(draft.get("status").asText()).isEqualTo("DRAFT");
        assertThat(draft.get("validatedAt").isNull()).isTrue();
        assertThat(draft.get("policyVersion").isNull()).isTrue();
        assertThat(api().call(post(plan(planId) + "/activate"), sv, 422, "ApiErrorResponse",
                new ActivateStudyPlanRequest(1, revision)).get("code").asText())
                .as("bản nháp vừa lưu chưa qua nghiệp vụ").isEqualTo("PLAN_NOT_VALIDATED");

        // Validate bản đã lưu → VALIDATED; sửa tiếp → version 2, kết quả cũ hết hiệu lực
        JsonNode validated = validate(sv, planId, 1, 200);
        assertThat(validated.get("status").asText()).isEqualTo("VALIDATED");
        assertThat(validated.get("planVersion").asInt()).isEqualTo(1);
        assertThat(validated.get("dataRevision").asText()).isEqualTo(revision);
        assertThat(validated.get("policyVersion").asText()).isEqualTo(AcademicToolsTestConfig.POLICY_V1);

        List<PlannedSemesterItem> reordered = new ArrayList<>(edited);
        reordered.add(new PlannedSemesterItem("2026_1", "Học kỳ 1 năm 2026-2027",
                List.of(new PlannedCourseItem("IT6126", "Kiến trúc máy tính", 4, "B", "Thêm theo nguyện vọng"),
                        new PlannedCourseItem("BS6001", "Đại số tuyến tính", 3, "B", null),
                        new PlannedCourseItem("LP6011", "Kinh tế chính trị Mác-Lênin", 2, "B", null),
                        new PlannedCourseItem("IT9LIVE01", "Học phần tự chọn", 3, "B", null)), null, null));
        JsonNode resaved = api().call(post("/api/v1/planner/plans"), sv, 200, "SaveStudyPlanResponse",
                new SaveStudyPlanRequest(planId, "Phương án từ planner tool", 1, revision, new BigDecimal("3.20"), "2028_1", 18,
                        reordered, List.of()));
        assertThat(resaved.get("planVersion").asInt()).isEqualTo(2);
        assertThat(resaved.get("status").asText()).isEqualTo("DRAFT");

        // Xung đột version: thao tác bằng version cũ bị chặn
        assertThat(validate(sv, planId, 1, 409).get("code").asText()).isEqualTo("PLAN_VERSION_CONFLICT");
        assertThat(api().call(post(plan(planId) + "/activate"), sv, 409, "ApiErrorResponse",
                new ActivateStudyPlanRequest(1, revision)).get("code").asText()).isEqualTo("PLAN_VERSION_CONFLICT");
        assertThat(api().call(post("/api/v1/planner/plans"), sv, 409, "ApiErrorResponse",
                new SaveStudyPlanRequest(planId, "Ghi đè bằng bản cũ", 1, revision, null, null, null, edited, List.of()))
                .get("code").asText()).isEqualTo("PLAN_VERSION_CONFLICT");
        assertThat(validate(sv, planId, 2, 200).get("status").asText()).isEqualTo("VALIDATED");

        // Kích hoạt: thẩm định lại và đổi ACTIVE trong cùng giao dịch
        JsonNode activated = api().call(post(plan(planId) + "/activate"), sv, 200, "ActivateStudyPlanResponse",
                new ActivateStudyPlanRequest(2, revision));
        assertThat(activated.get("status").asText()).isEqualTo("ACTIVE");
        assertThat(activated.get("archivedPlanIds")).isEmpty();

        // Đọc lại
        JsonNode active = api().call(get(plan(planId)), sv, 200, "StudyPlanDetailResponse");
        assertThat(active.get("status").asText()).isEqualTo("ACTIVE");
        assertThat(active.get("planVersion").asInt()).isEqualTo(2);
        assertThat(active.get("dataRevision").asText()).isEqualTo(revision);
        assertThat(active.get("policyVersion").asText()).isEqualTo(AcademicToolsTestConfig.POLICY_V1);
        assertThat(active.get("validatedAt").isTextual()).isTrue();
        assertThat(active.get("semesters").findValuesAsText("semesterCode"))
                .containsExactlyElementsOf(reordered.stream().map(PlannedSemesterItem::getSemesterCode).toList());
        assertThat(api().call(get("/api/v1/planner/plans"), sv, 200, "StudyPlanListResponse").get("plans").get(0)
                .get("status").asText()).isEqualTo("ACTIVE");
        assertThat(rows("SELECT count(*) FROM study_plans WHERE student_id = :id AND status = 'ACTIVE'", sv)).isEqualTo(1);
    }

    @Test
    @DisplayName("Tài khoản trùng mã hồ sơ mẫu TV4: phương án tính từ bảng điểm DB, không từ hồ sơ mẫu")
    void generateNeverUsesSampleProfiles() throws Exception {
        String sv = "std-near-grad-ktpm";
        String revision = accounts.revision(sv);
        GenerateStudyPlanRequest request = new GenerateStudyPlanRequest(sv, null, null, 20, false, revision);
        JsonNode proposal = api().call(post("/api/v1/planner/generate"), sv, 200, "GenerateStudyPlanResponse", request);

        GenerateStudyPlanResponse fromDb = new StudyPlanScheduler(engine.policy(), engine.curriculum()).plan(profileFromApi(sv), request);
        assertThat(proposal.get("semesters")).isEqualTo(json(fromDb.getSemesters()));
        assertThat(proposal.get("warnings")).isEqualTo(json(fromDb.getWarnings()));
        assertThat(proposal.get("projectedCpa").decimalValue()).isEqualByComparingTo(fromDb.getProjectedCpa());

        // Facade dựng kiểu cũ (không hồ sơ DB) rơi về hồ sơ mẫu của TV4 (CPA 3.35, 132 TC) và cho kết quả khác
        GenerateStudyPlanResponse fromSample = new DefaultAcademicFacade(null, engine.policy(), engine.curriculum(), Map.of())
                .generateStudyPlan(request);
        assertThat(fromSample.getProjectedCpa()).isEqualByComparingTo("3.60");
        assertThat(proposal.get("projectedCpa").decimalValue()).as("CPA dự kiến tính từ CPA trên bảng điểm DB")
                .isNotEqualByComparingTo(fromSample.getProjectedCpa());
    }

    @Test
    @DisplayName("Quyền: chưa đăng nhập 401, thiếu CSRF 403, studentId client gửi bị bỏ qua, tài khoản khác không chạm được kế hoạch")
    void permissionsAndIsolation() throws Exception {
        String owner = "sv-live-owner";
        String intruder = "sv-live-intruder";
        String ownerRevision = confirmManualImport(owner, accounts.ensure(owner), row("LP6010", "2024_1", 9.0, "A"));
        String intruderRevision = accounts.ensure(intruder);

        String body = objectMapper.writeValueAsString(new GenerateStudyPlanRequest(owner, null, null, null, null, null));
        assertThat(mockMvc.perform(post("/api/v1/planner/generate").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body)).andReturn().getResponse().getStatus()).isEqualTo(401);
        assertThat(mockMvc.perform(post("/api/v1/planner/generate").with(user(owner).roles("STUDENT"))
                .contentType(MediaType.APPLICATION_JSON).content(body)).andReturn().getResponse().getStatus()).isEqualTo(403);

        // studentId của chủ kế hoạch trong body bị bỏ qua: phương án tính trên hồ sơ của người gọi
        JsonNode spoofed = api().call(post("/api/v1/planner/generate"), intruder, 200, "GenerateStudyPlanResponse",
                new GenerateStudyPlanRequest(owner, null, null, null, null, null));
        assertThat(spoofed.get("studentId").asText()).isEqualTo(intruder);
        assertThat(spoofed.get("dataRevision").asText()).isEqualTo(intruderRevision);
        assertThat(spoofed.get("warnings").get(0).asText()).as("người gọi chưa có bảng điểm")
                .isEqualTo(StudyPlanService.NO_TRANSCRIPT_WARNING);
        assertThat(api().call(post("/api/v1/planner/generate"), intruder, 409, "ApiErrorResponse",
                new GenerateStudyPlanRequest(null, null, null, null, null, ownerRevision)).get("code").asText())
                .as("revision của tài khoản khác là revision sai").isEqualTo("DATA_REVISION_STALE");

        String planId = api().call(post("/api/v1/planner/plans"), owner, 200, "SaveStudyPlanResponse",
                saveRequest(null, null, ownerRevision, List.of(semester("2026_1", 15)))).get("planId").asText();
        validate(owner, planId, 1, 200);

        api().call(get(plan(planId)), intruder, 404, "ApiErrorResponse");
        api().call(post("/api/v1/planner/validate"), intruder, 404, "ApiErrorResponse",
                new ValidateStudyPlanRequest(planId, owner, null, 1, null));
        api().call(post(plan(planId) + "/activate"), intruder, 404, "ApiErrorResponse", new ActivateStudyPlanRequest(1, intruderRevision));
        api().call(post("/api/v1/planner/plans"), intruder, 404, "ApiErrorResponse",
                saveRequest(planId, 1, intruderRevision, List.of(semester("2026_1", 12))));
        api().call(delete(plan(planId)).param("planVersion", "1"), intruder, 404, "ApiErrorResponse");
        assertThat(api().call(get("/api/v1/planner/plans"), intruder, 200, "StudyPlanListResponse").get("plans")).isEmpty();

        JsonNode untouched = api().call(get(plan(planId)), owner, 200, "StudyPlanDetailResponse");
        assertThat(untouched.get("status").asText()).isEqualTo("VALIDATED");
        assertThat(untouched.get("planVersion").asInt()).isEqualTo(1);
    }

    @Test
    @DisplayName("Bảng điểm đổi: thẩm định lại trên dữ liệu mới — VALIDATED vi phạm về DRAFT, ACTIVE vi phạm giữ ACTIVE kèm cảnh báo")
    void transcriptChangeRevalidates() throws Exception {
        String sv = "sv-live-transcript";
        String rev1 = confirmManualImport(sv, accounts.ensure(sv), row("LP6010", "2024_1", 8.5, "A"), row("BS6002", "2024_1", 8.0, "B+"));
        List<PlannedSemesterItem> heavy = List.of(semester("2026_1", 18), semester("2026_2", 18));
        String validatedPlan = savePlan(sv, rev1, heavy);
        String activePlan = savePlan(sv, rev1, heavy);
        validate(sv, validatedPlan, 1, 200);
        validate(sv, activePlan, 1, 200);
        api().call(post(plan(activePlan) + "/activate"), sv, 200, "ActivateStudyPlanResponse", new ActivateStudyPlanRequest(1, rev1));

        // Bảng điểm mới toàn F: engine TV4 tính CPA 0 → cảnh báo học tập → trần 14 TC (REG-HAUI-02) áp lên kế hoạch 18 TC
        String rev2 = confirmManualImport(sv, rev1, row("LP6010", "2024_1", 2.0, "F"), row("BS6002", "2024_1", 3.0, "F"),
                row("BS6001", "2024_2", 1.5, "F"));
        assertThat(api().call(get("/api/v1/academic/status"), sv, 200, "AcademicStatusResponse").get("riskLevel").asText())
                .isEqualTo("WARNING_LEVEL_1");
        assertThat(column("checked_data_revision", activePlan)).as("thẩm định lại ngay sau khi xác nhận bảng điểm").isEqualTo(rev2);

        JsonNode downgraded = api().call(get(plan(validatedPlan)), sv, 200, "StudyPlanDetailResponse");
        assertThat(downgraded.get("status").asText()).isEqualTo("DRAFT");
        assertThat(downgraded.get("validatedAt").isNull()).isTrue();
        assertThat(downgraded.get("warnings").toString())
                .contains("Đã tự kiểm tra lại vì dữ liệu học vụ đã thay đổi (" + rev1 + " → " + rev2 + "): kế hoạch không còn đạt điều kiện.")
                .contains("Vi phạm: ", WARNING_CAP);
        assertThat(api().call(post(plan(validatedPlan) + "/activate"), sv, 422, "ApiErrorResponse",
                new ActivateStudyPlanRequest(1, rev2)).get("code").asText()).isEqualTo("PLAN_NOT_VALIDATED");

        JsonNode violating = api().call(get(plan(activePlan)), sv, 200, "StudyPlanDetailResponse");
        assertThat(violating.get("status").asText()).as("không tự bỏ kế hoạch đang theo dõi").isEqualTo("ACTIVE");
        assertThat(violating.get("validatedAt").isNull()).isTrue();
        assertThat(violating.get("policyVersion").isNull()).isTrue();
        assertThat(violating.get("warnings").toString())
                .contains("Kế hoạch đang theo dõi không còn đạt điều kiện", WARNING_CAP)
                .doesNotContain("chưa được kiểm tra lại");
        JsonNode explicit = validate(sv, activePlan, 1, 200);
        assertThat(explicit.get("valid").asBoolean()).isFalse();
        assertThat(explicit.get("status").asText()).isEqualTo("ACTIVE");

        // Kế hoạch mới vừa sức (14 TC) vẫn kích hoạt được, thay bản ACTIVE vi phạm trong cùng giao dịch
        String lighter = savePlan(sv, rev2, List.of(semester("2026_1", 14)));
        assertThat(validate(sv, lighter, 1, 200).get("status").asText()).isEqualTo("VALIDATED");
        assertThat(api().call(post(plan(lighter) + "/activate"), sv, 200, "ActivateStudyPlanResponse",
                new ActivateStudyPlanRequest(1, rev2)).get("archivedPlanIds")).hasSize(1);
        assertThat(rows("SELECT count(*) FROM study_plans WHERE student_id = :id AND status = 'ACTIVE'", sv)).isEqualTo(1);

        // Bảng điểm tốt trở lại: bản ACTIVE được kiểm tra lại và vẫn đạt; bản đã về DRAFT không tự lên VALIDATED
        String rev3 = confirmManualImport(sv, rev2, row("LP6010", "2024_1", 8.5, "A"), row("BS6002", "2024_1", 8.0, "B+"));
        JsonNode rechecked = api().call(get(plan(lighter)), sv, 200, "StudyPlanDetailResponse");
        assertThat(rechecked.get("status").asText()).isEqualTo("ACTIVE");
        assertThat(rechecked.get("dataRevision").asText()).isEqualTo(rev3);
        assertThat(rechecked.get("validatedAt").isTextual()).isTrue();
        assertThat(rechecked.get("warnings").toString()).contains("kế hoạch vẫn đạt điều kiện.");
        assertThat(api().call(get(plan(validatedPlan)), sv, 200, "StudyPlanDetailResponse").get("status").asText()).isEqualTo("DRAFT");
    }

    @Test
    @DisplayName("Quy chế đổi: kế hoạch được thẩm định lại khi đọc; vi phạm quy chế mới thì VALIDATED về DRAFT")
    void policyChangeRevalidatesOnRead() throws Exception {
        String sv = "sv-live-policy";
        String revision = accounts.ensure(sv);
        String planId = savePlan(sv, revision, List.of(semester("2026_1", 15)));
        validate(sv, planId, 1, 200);

        policy.set("policy-test@3");
        academicFacade.forceViolations("Quy chế mới: học kỳ 2026_1 phải có học phần bắt buộc");
        JsonNode list = api().call(get("/api/v1/planner/plans"), sv, 200, "StudyPlanListResponse");
        assertThat(list.get("plans").get(0).get("status").asText()).isEqualTo("DRAFT");
        JsonNode detail = api().call(get(plan(planId)), sv, 200, "StudyPlanDetailResponse");
        assertThat(detail.get("warnings").toString())
                .contains("quy chế đã cập nhật (" + AcademicToolsTestConfig.POLICY_V1 + " → policy-test@3)")
                .contains("Vi phạm: Quy chế mới: học kỳ 2026_1 phải có học phần bắt buộc");
        assertThat(column("validated_policy_version", planId)).isNull();
    }

    @Test
    @DisplayName("Dữ liệu đổi khi chưa có công cụ thẩm định thật: VALIDATED hết hiệu lực về DRAFT, ACTIVE giữ nguyên tới khi kiểm tra lại được")
    void revalidationWithoutRealTool() throws Exception {
        String sv = "sv-live-no-tool";
        String rev1 = accounts.ensure(sv);
        String validatedPlan = savePlan(sv, rev1, List.of(semester("2026_1", 15)));
        String activePlan = savePlan(sv, rev1, List.of(semester("2026_1", 15)));
        validate(sv, validatedPlan, 1, 200);
        validate(sv, activePlan, 1, 200);
        api().call(post(plan(activePlan) + "/activate"), sv, 200, "ActivateStudyPlanResponse", new ActivateStudyPlanRequest(1, rev1));

        academicFacade.setReady(false);
        String rev2 = confirmManualImport(sv, rev1, row("LP6010", "2024_1", 8.5, "A"));
        JsonNode expired = api().call(get(plan(validatedPlan)), sv, 200, "StudyPlanDetailResponse");
        assertThat(expired.get("status").asText()).isEqualTo("DRAFT");
        assertThat(expired.get("warnings").toString()).contains("Kết quả kiểm tra điều kiện hết hiệu lực", "chưa kiểm tra lại được");
        JsonNode tracked = api().call(get(plan(activePlan)), sv, 200, "StudyPlanDetailResponse");
        assertThat(tracked.get("status").asText()).isEqualTo("ACTIVE");
        assertThat(tracked.get("warnings").toString())
                .contains("Dữ liệu học vụ đã thay đổi sau lần kiểm tra điều kiện gần nhất (" + rev1 + " → " + rev2 + ")");

        academicFacade.reset();
        JsonNode rechecked = api().call(get(plan(activePlan)), sv, 200, "StudyPlanDetailResponse");
        assertThat(rechecked.get("dataRevision").asText()).isEqualTo(rev2);
        assertThat(rechecked.get("warnings").toString()).contains("kế hoạch vẫn đạt điều kiện.").doesNotContain("chưa được kiểm tra lại");
    }

    // ---------------------------------------------------------------------------------------------

    /** Hồ sơ đầu vào planner tool dựng độc lập từ API: bảng điểm đã xác nhận + trạng thái học vụ facade tính. */
    private StudentProfileFixture profileFromApi(String sv) throws Exception {
        JsonNode transcript = api().call(get("/api/v1/academic/transcript"), sv, 200, "TranscriptResponse");
        JsonNode status = api().call(get("/api/v1/academic/status"), sv, 200, "AcademicStatusResponse");
        StudentProfileFixture profile = new StudentProfileFixture();
        profile.setStudentId(sv);
        profile.setDataRevision(status.get("dataRevision").asText());
        profile.setCpa(status.get("cpa").isNull() ? null : status.get("cpa").decimalValue());
        profile.setAccumulatedCredits(status.get("accumulatedCredits").isNull() ? null : status.get("accumulatedCredits").asDouble());
        profile.setRiskLevel(AcademicRiskLevel.valueOf(status.get("riskLevel").asText()));
        List<StudentProfileFixture.CourseAttempt> attempts = new ArrayList<>();
        Set<String> mainSemesters = new HashSet<>();
        for (JsonNode item : transcript.get("attempts")) {
            StudentProfileFixture.CourseAttempt attempt = new StudentProfileFixture.CourseAttempt();
            attempt.setCourseCode(item.get("courseCode").asText());
            attempt.setCourseName(text(item, "courseName"));
            attempt.setCredits(item.get("credits").asDouble());
            attempt.setSemesterCode(item.get("semesterCode").asText());
            attempt.setLetterGrade(text(item, "letterGrade"));
            attempt.setScore10(item.path("score10").isNumber() ? item.get("score10").asDouble() : null);
            attempts.add(attempt);
            if (attempt.getSemesterCode().matches("^[0-9]{4}_(1|2)$")) {
                mainSemesters.add(attempt.getSemesterCode());
            }
        }
        profile.setCourseAttempts(attempts);
        profile.setCurrentSemester(mainSemesters.isEmpty() ? null : mainSemesters.size());
        return profile;
    }

    /** Sinh viên sửa phương án: bỏ học phần cuối của học kỳ đầu (vẫn trên sàn 10 TC), giữ phần còn lại. */
    private List<PlannedSemesterItem> edit(JsonNode semesters) {
        List<PlannedSemesterItem> result = new ArrayList<>();
        for (JsonNode node : semesters) {
            PlannedSemesterItem semester = objectMapper.convertValue(node, PlannedSemesterItem.class);
            List<PlannedCourseItem> courses = new ArrayList<>(semester.getCourses());
            if (result.isEmpty() && courses.size() > 1) {
                PlannedCourseItem dropped = courses.remove(courses.size() - 1);
                if (semester.getTotalCredits() - dropped.getCredits() < 10) {
                    courses.add(dropped);
                }
            }
            result.add(new PlannedSemesterItem(semester.getSemesterCode(), semester.getSemesterName(), courses, null,
                    semester.getExpectedGpa()));
        }
        return result;
    }

    private String confirmManualImport(String sv, String revision, ObjectNode... rows) throws Exception {
        JsonNode session = api().call(post("/api/v1/academic/transcript/imports/manual"), sv, 200, "TranscriptImportResponse");
        String id = session.get("importSessionId").asText();
        ObjectNode update = objectMapper.createObjectNode().put("sessionVersion", session.get("sessionVersion").asInt());
        ArrayNode list = update.putArray("rows");
        for (ObjectNode row : rows) {
            list.add(row);
        }
        String imports = "/api/v1/academic/transcript/imports/" + id;
        JsonNode reviewed = api().call(put(imports + "/rows"), sv, 200, "TranscriptImportResponse", update);
        return api().call(post(imports + "/confirm"), sv, 200, "TranscriptResponse",
                new ConfirmTranscriptImportRequest(reviewed.get("sessionVersion").asInt(), revision)).get("dataRevision").asText();
    }

    private ObjectNode row(String courseCode, String semesterCode, double score10, String letterGrade) {
        return objectMapper.createObjectNode().put("courseCode", courseCode).put("semesterCode", semesterCode)
                .put("score10", score10).put("letterGrade", letterGrade);
    }

    private String savePlan(String sv, String revision, List<PlannedSemesterItem> semesters) throws Exception {
        return api().call(post("/api/v1/planner/plans"), sv, 200, "SaveStudyPlanResponse",
                saveRequest(null, null, revision, semesters)).get("planId").asText();
    }

    private JsonNode validate(String sv, String planId, int planVersion, int expectedStatus) throws Exception {
        return api().call(post("/api/v1/planner/validate"), sv, expectedStatus,
                expectedStatus == 200 ? "ValidateStudyPlanResponse" : "ApiErrorResponse",
                new ValidateStudyPlanRequest(planId, null, null, planVersion, null));
    }

    private JsonNode json(Object value) throws Exception {
        return objectMapper.readTree(objectMapper.writeValueAsString(value));
    }

    private int rows(String sql, String id) {
        return jdbc.sql(sql).param("id", id).query(Integer.class).single();
    }

    private String column(String column, String planId) {
        return jdbc.sql("SELECT " + column + " FROM study_plans WHERE plan_id = :id").param("id", planId)
                .query((rs, n) -> rs.getString(1)).single();
    }

    private static String text(JsonNode node, String field) {
        return node.path(field).isTextual() ? node.get(field).asText() : null;
    }

    private static String plan(String planId) {
        return "/api/v1/planner/plans/" + planId;
    }

    private static SaveStudyPlanRequest saveRequest(String planId, Integer planVersion, String revision,
                                                    List<PlannedSemesterItem> semesters) {
        return new SaveStudyPlanRequest(planId, "Kế hoạch thử planner tool", planVersion, revision, new BigDecimal("3.00"),
                "2028_1", 20, semesters, List.of());
    }

    /** Học kỳ có tổng tín chỉ mong muốn, gồm các môn 3 TC và một môn 2 TC nếu lẻ (mã ngoài CTĐT). */
    private static PlannedSemesterItem semester(String code, int credits) {
        List<PlannedCourseItem> courses = new ArrayList<>();
        int remaining = credits;
        int index = 1;
        while (remaining > 0) {
            int c = remaining % 3 == 2 ? 2 : Math.min(3, remaining);
            courses.add(new PlannedCourseItem("IT9L" + code.replace("_", "") + index++, "Học phần thử nghiệm", c, "B", null));
            remaining -= c;
        }
        return new PlannedSemesterItem(code, "Học kỳ " + code, courses, null, null);
    }
}
