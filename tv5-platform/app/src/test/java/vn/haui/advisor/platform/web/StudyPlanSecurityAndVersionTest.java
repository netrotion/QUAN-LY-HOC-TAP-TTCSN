package vn.haui.advisor.platform.web;

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
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.platform.security.DefaultStudentContextProvider;

import java.math.BigDecimal;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("StudyPlan Security, Context Isolation & Versioning Tests (Task 2.2d)")
public class StudyPlanSecurityAndVersionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private DefaultStudentContextProvider studentContextProvider;

    @Test
    @DisplayName("Should block unauthenticated requests to study plan endpoints")
    void shouldBlockUnauthenticatedRequests() throws Exception {
        mockMvc.perform(get("/api/v1/planner/plan"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/planner/preview")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "2024604757", roles = "STUDENT")
    @DisplayName("Should ignore spoofed student_id from client and trust server session context only")
    void shouldIgnoreClientSuppliedStudentIdAndUseServerContext() throws Exception {
        // Client cố tình truyền studentId giả mạo "attacker-9999" qua query param
        mockMvc.perform(get("/api/v1/planner/plan")
                        .param("studentId", "attacker-9999"))
                .andExpect(status().isOk())
                // Server phải luôn trả về studentId từ TrustedStudentContext (2024604757)
                .andExpect(jsonPath("$.studentId", is("2024604757")))
                .andExpect(jsonPath("$.studentId", not("attacker-9999")));

        // Client cố tình truyền studentId giả mạo trong body của validate
        ValidateStudyPlanRequest spoofedRequest = new ValidateStudyPlanRequest(
                "plan-001",
                "attacker-9999", // client gửi id giả
                List.of(new PlannedSemesterItem(1, "2024_1", "Học kỳ 1", List.of(), 18, new BigDecimal("3.20"))),
                1,
                DefaultStudentContextProvider.DEFAULT_DATA_REVISION
        );

        mockMvc.perform(post("/api/v1/planner/validate")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(spoofedRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid", is(true)))
                .andExpect(jsonPath("$.status", is("VALIDATED")));
    }

    @Test
    @WithMockUser(username = "2024604757", roles = "STUDENT")
    @DisplayName("Should detect stale data when client provides outdated dataRevision")
    void shouldDetectStaleDataRevision() throws Exception {
        // Cập nhật phiên bản mới trên server
        studentContextProvider.updateDataRevision("2024604757", "REV-2024604757-002", 2);

        // Client gửi request với revision cũ REV-2024604757-001
        PreviewStudyPlanRequest staleRequest = new PreviewStudyPlanRequest(
                "2028_1",
                new BigDecimal("3.20"),
                20,
                true,
                List.of(),
                "REV-2024604757-001" // revision cũ
        );

        mockMvc.perform(post("/api/v1/planner/preview")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(staleRequest)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code", is("DATA_REVISION_STALE")));

        // Reset lại revision mặc định
        studentContextProvider.updateDataRevision("2024604757", DefaultStudentContextProvider.DEFAULT_DATA_REVISION, 1);
    }

    @Test
    @WithMockUser(username = "2024604757", roles = "STUDENT")
    @DisplayName("Should save and activate study plan when dataRevision is fresh")
    void shouldSaveAndActivateStudyPlan() throws Exception {
        SaveStudyPlanRequest saveRequest = new SaveStudyPlanRequest(
                "plan-2024-test",
                "Kế hoạch thử nghiệm",
                1,
                DefaultStudentContextProvider.DEFAULT_DATA_REVISION,
                new BigDecimal("3.25"),
                "2028_1",
                20,
                List.of(),
                List.of()
        );

        mockMvc.perform(post("/api/v1/planner/save")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(saveRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.planId", is("plan-2024-test")))
                .andExpect(jsonPath("$.planVersion", is(2)))
                .andExpect(jsonPath("$.status", is("VALIDATED")));

        ActivateStudyPlanRequest activateRequest = new ActivateStudyPlanRequest(
                "plan-2024-test",
                2,
                DefaultStudentContextProvider.DEFAULT_DATA_REVISION
        );

        mockMvc.perform(post("/api/v1/planner/activate")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(activateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("ACTIVE")))
                .andExpect(jsonPath("$.planId", is("plan-2024-test")));
    }
}
