package vn.haui.advisor.platform.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.platform.support.TestAccounts;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Ngữ nghĩa vòng đời kế hoạch theo contracts-v1 (task-2.3 contract delta CD-01..CD-05) và cô lập ngữ cảnh sinh viên.
 * Mỗi test dùng một tài khoản riêng vì store kế hoạch là singleton trong context Spring.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("StudyPlan V1: lifecycle, context isolation & versioning")
public class StudyPlanSecurityAndVersionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TestAccounts accounts;

    @Test
    @DisplayName("Chặn request chưa đăng nhập (401) và request ghi thiếu CSRF (403)")
    void shouldBlockUnauthenticatedRequests() throws Exception {
        mockMvc.perform(get("/api/v1/planner/plans"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("UNAUTHENTICATED")));

        mockMvc.perform(post("/api/v1/planner/plans")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/planner/plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code", is("ACCESS_DENIED")));
    }

    @Test
    @WithMockUser(username = "sv-spoof", roles = "STUDENT")
    @DisplayName("Bỏ qua studentId client gửi, chỉ tin context phiên đăng nhập")
    void shouldIgnoreClientSuppliedStudentId() throws Exception {
        accounts.ensure("sv-spoof");
        String planId = saveDraft("sv-spoof", validSemesters());

        mockMvc.perform(get("/api/v1/planner/plans/" + planId).param("studentId", "attacker-9999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId", is("sv-spoof")));

        ValidateStudyPlanRequest spoofed = new ValidateStudyPlanRequest(null, "attacker-9999", validSemesters(), null,
                revisionOf("sv-spoof"));
        perform(post("/api/v1/planner/validate"), spoofed)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid", is(true)))
                .andExpect(jsonPath("$.status", is("VALIDATED")))
                .andExpect(jsonPath("$.planVersion").value(nullValue()));
    }

    @Test
    @WithMockUser(username = "sv-other", roles = "STUDENT")
    @DisplayName("Không đọc/kích hoạt được kế hoạch của sinh viên khác (404)")
    void shouldNotExposeOtherStudentsPlans() throws Exception {
        accounts.ensure("sv-other");
        mockMvc.perform(get("/api/v1/planner/plans/plan-2024604757-0002"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code", is("PLAN_NOT_FOUND")));
    }

    @Test
    @WithMockUser(username = "sv-stale", roles = "STUDENT")
    @DisplayName("dataRevision cũ → 409 DATA_REVISION_STALE")
    void shouldDetectStaleDataRevision() throws Exception {
        String oldRevision = revisionOf("sv-stale");
        accounts.bumpRevision("sv-stale");

        perform(post("/api/v1/planner/plans"), saveRequest(null, null, oldRevision, validSemesters()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code", is("DATA_REVISION_STALE")));
    }

    @Test
    @WithMockUser(username = "sv-lifecycle", roles = "STUDENT")
    @DisplayName("DRAFT → (activate 422) → VALIDATED → ACTIVE; bản ACTIVE cũ chuyển ARCHIVED")
    void shouldEnforceDraftValidatedActiveStateMachine() throws Exception {
        String revision = revisionOf("sv-lifecycle");
        String first = saveDraft("sv-lifecycle", validSemesters());

        // Lưu nháp không bao giờ trả VALIDATED và không cho kích hoạt thẳng từ DRAFT (CD-01, CD-03)
        perform(post("/api/v1/planner/plans/" + first + "/activate"), new ActivateStudyPlanRequest(1, revision))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code", is("PLAN_NOT_VALIDATED")));

        validateStored(first, 1).andExpect(jsonPath("$.status", is("VALIDATED")));
        perform(post("/api/v1/planner/plans/" + first + "/activate"), new ActivateStudyPlanRequest(1, revision))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("ACTIVE")))
                .andExpect(jsonPath("$.archivedPlanIds", empty()));

        String second = saveDraft("sv-lifecycle", validSemesters());
        validateStored(second, 1).andExpect(jsonPath("$.status", is("VALIDATED")));
        perform(post("/api/v1/planner/plans/" + second + "/activate"), new ActivateStudyPlanRequest(1, revision))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.planId", is(second)))
                .andExpect(jsonPath("$.archivedPlanIds", contains(first)));

        mockMvc.perform(get("/api/v1/planner/plans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.plans[?(@.status == 'ACTIVE')].planId", contains(second)))
                .andExpect(jsonPath("$.plans[?(@.planId == '" + first + "')].status", contains("ARCHIVED")));
    }

    @Test
    @WithMockUser(username = "sv-invalid", roles = "STUDENT")
    @DisplayName("Kế hoạch vi phạm quy chế lưu nháp được nhưng không qua validate")
    void shouldSaveInvalidDraftButNotValidateIt() throws Exception {
        String planId = saveDraft("sv-invalid", List.of(semester("2026_1", 5)));

        validateStored(planId, 1)
                .andExpect(jsonPath("$.valid", is(false)))
                .andExpect(jsonPath("$.status", is("DRAFT")))
                .andExpect(jsonPath("$.violations", not(empty())));

        perform(post("/api/v1/planner/plans/" + planId + "/activate"),
                new ActivateStudyPlanRequest(1, revisionOf("sv-invalid")))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code", is("PLAN_NOT_VALIDATED")));
    }

    @Test
    @WithMockUser(username = "sv-version", roles = "STUDENT")
    @DisplayName("Sửa nội dung tăng planVersion, hủy VALIDATED; planVersion cũ → 409")
    void shouldBumpVersionAndResetValidationOnEdit() throws Exception {
        String revision = revisionOf("sv-version");
        String planId = saveDraft("sv-version", validSemesters());
        validateStored(planId, 1).andExpect(jsonPath("$.status", is("VALIDATED")));

        perform(post("/api/v1/planner/plans"), saveRequest(planId, 1, revision, validSemesters()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.planId", is(planId)))
                .andExpect(jsonPath("$.planVersion", is(2)))
                .andExpect(jsonPath("$.status", is("DRAFT")));

        perform(post("/api/v1/planner/plans/" + planId + "/activate"), new ActivateStudyPlanRequest(1, revision))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code", is("PLAN_VERSION_CONFLICT")));
    }

    @Test
    @WithMockUser(username = "sv-inherit", roles = "STUDENT")
    @DisplayName("Sửa bản ACTIVE tạo DRAFT kế thừa, bản ACTIVE giữ nguyên; ARCHIVED không sửa trực tiếp")
    void shouldInheritDraftFromActiveAndProtectArchived() throws Exception {
        String revision = revisionOf("sv-inherit");
        String active = activatedPlan("sv-inherit");

        String inherited = readField(perform(post("/api/v1/planner/plans"), saveRequest(active, 1, revision, validSemesters()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("DRAFT")))
                .andExpect(jsonPath("$.sourcePlanId", is(active))), "planId");

        mockMvc.perform(get("/api/v1/planner/plans/" + active))
                .andExpect(jsonPath("$.status", is("ACTIVE")))
                .andExpect(jsonPath("$.planVersion", is(1)));

        validateStored(inherited, 1);
        perform(post("/api/v1/planner/plans/" + inherited + "/activate"), new ActivateStudyPlanRequest(1, revision))
                .andExpect(status().isOk());

        perform(post("/api/v1/planner/plans"), saveRequest(active, 1, revision, validSemesters()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code", is("PLAN_NOT_EDITABLE")));
    }

    @Test
    @WithMockUser(username = "sv-restore", roles = "STUDENT")
    @DisplayName("Restore tạo DRAFT mới kế thừa nội dung, bản gốc bất biến")
    void shouldRestoreIntoNewDraft() throws Exception {
        String original = saveDraft("sv-restore", validSemesters());

        mockMvc.perform(post("/api/v1/planner/plans/" + original + "/restore").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.planId", not(original)))
                .andExpect(jsonPath("$.status", is("DRAFT")))
                .andExpect(jsonPath("$.planVersion", is(1)))
                .andExpect(jsonPath("$.sourcePlanId", is(original)))
                .andExpect(jsonPath("$.planName", startsWith("Bản sao từ ")))
                .andExpect(jsonPath("$.totalCredits", is(28)))
                .andExpect(jsonPath("$.semesters", hasSize(2)));

        mockMvc.perform(get("/api/v1/planner/plans/" + original))
                .andExpect(jsonPath("$.planVersion", is(1)))
                .andExpect(jsonPath("$.sourcePlanId").value(nullValue()));
    }

    @Test
    @WithMockUser(username = "sv-totals", roles = "STUDENT")
    @DisplayName("Server tính lại totalCredits từ danh sách môn (không tin số client gửi)")
    void shouldRecomputeCreditTotals() throws Exception {
        PlannedSemesterItem lying = semester("2026_1", 14);
        lying.setTotalCredits(99);
        String planId = saveDraft("sv-totals", List.of(lying));

        mockMvc.perform(get("/api/v1/planner/plans/" + planId))
                .andExpect(jsonPath("$.semesters[0].totalCredits", is(14)))
                .andExpect(jsonPath("$.totalCredits", is(14)));
    }

    // ---------------------------------------------------------------------------------------------

    private String activatedPlan(String student) throws Exception {
        String planId = saveDraft(student, validSemesters());
        validateStored(planId, 1).andExpect(jsonPath("$.status", is("VALIDATED")));
        perform(post("/api/v1/planner/plans/" + planId + "/activate"), new ActivateStudyPlanRequest(1, revisionOf(student)))
                .andExpect(status().isOk());
        return planId;
    }

    private String saveDraft(String student, List<PlannedSemesterItem> semesters) throws Exception {
        return readField(perform(post("/api/v1/planner/plans"), saveRequest(null, null, revisionOf(student), semesters))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("DRAFT")))
                .andExpect(jsonPath("$.planVersion", is(1))), "planId");
    }

    private ResultActions validateStored(String planId, int planVersion) throws Exception {
        return perform(post("/api/v1/planner/validate"), new ValidateStudyPlanRequest(planId, null, null, planVersion, null))
                .andExpect(status().isOk());
    }

    private ResultActions perform(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder builder,
                                  Object body) throws Exception {
        return mockMvc.perform(builder.with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private String readField(ResultActions result, String field) throws Exception {
        JsonNode json = objectMapper.readTree(result.andReturn().getResponse().getContentAsString());
        return json.get(field).asText();
    }

    private String revisionOf(String student) {
        return accounts.ensure(student);
    }

    private static SaveStudyPlanRequest saveRequest(String planId, Integer planVersion, String revision,
                                                    List<PlannedSemesterItem> semesters) {
        return new SaveStudyPlanRequest(planId, "Kế hoạch thử nghiệm", planVersion, revision,
                new BigDecimal("3.20"), "2028_1", 20, semesters, List.of());
    }

    private static List<PlannedSemesterItem> validSemesters() {
        return List.of(semester("2026_1", 14), semester("2026_2", 14));
    }

    /** Học kỳ có tổng tín chỉ mong muốn, gồm các môn 3 TC và một môn 2 TC nếu lẻ. */
    private static PlannedSemesterItem semester(String code, int credits) {
        List<PlannedCourseItem> courses = new ArrayList<>();
        int remaining = credits;
        int index = 1;
        while (remaining > 0) {
            int c = remaining % 3 == 2 ? 2 : Math.min(3, remaining);
            courses.add(new PlannedCourseItem("IT9" + code.replace("_", "") + index++, "Học phần thử nghiệm", c, "B", "test"));
            remaining -= c;
        }
        return new PlannedSemesterItem(code, "Học kỳ " + code, courses, credits, new BigDecimal("3.20"));
    }
}
