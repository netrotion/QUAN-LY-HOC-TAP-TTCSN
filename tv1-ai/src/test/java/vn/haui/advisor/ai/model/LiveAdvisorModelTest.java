package vn.haui.advisor.ai.model;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.grounding.ResponseGroundingValidator;
import vn.haui.advisor.ai.intent.ParsedUserIntent;
import vn.haui.advisor.ai.intent.ParsedUserIntent.ScenarioCategory;
import vn.haui.advisor.ai.rag.model.RagChunk;
import vn.haui.advisor.ai.rag.service.GroundedContext;
import vn.haui.advisor.contracts.dto.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("LiveAdvisorModel Unit Tests")
class LiveAdvisorModelTest {

    private ResponseGroundingValidator validator;
    private TrustedStudentContext studentContext;

    @BeforeEach
    void setUp() {
        validator = new ResponseGroundingValidator();
        studentContext = new TrustedStudentContext("SV2021001", "SV2021001", "Nguyễn Văn A", "K16-CNTT", "K16", "2024-V1");
    }

    @Test
    @DisplayName("Prompt framing wraps RAG evidence and academic tool results in passive XML tags")
    void testPassiveXmlFramingInPrompt() {
        RagChunk chunk = new RagChunk(
                "REG-HAUI-01#01", "REG-HAUI-01", "Quy chế đào tạo", "Điều 14", "v1", "https://haui.edu.vn",
                "Quy định về đăng ký tín chỉ: tối đa 24 tín chỉ.", 1, 100
        );
        ChatSourceItem source = new ChatSourceItem("REG-HAUI-01", "Quy chế đào tạo", "Điều 14", "v1", "https://haui.edu.vn");
        GroundedContext groundedContext = new GroundedContext("Đăng ký tín chỉ", List.of(chunk), List.of(source), "Quy định tín chỉ", true, List.of());

        AcademicStatusResponse status = new AcademicStatusResponse(
                "SV2021001", new BigDecimal("3.20"), new BigDecimal("3.10"), 80, 150,
                AcademicRiskLevel.NORMAL, List.of(), "REV-1"
        );
        Map<String, Object> toolResults = Map.of("academicStatus", status);

        AdvisorModelInput input = new AdvisorModelInput(
                "Kỳ tới tôi được đăng ký bao nhiêu tín chỉ?",
                studentContext,
                toolResults,
                groundedContext
        );

        LiveAdvisorModel model = new LiveAdvisorModel();
        String prompt = model.buildPrompt(input);

        assertThat(prompt).contains("<rag_evidence>");
        assertThat(prompt).contains("</rag_evidence>");
        assertThat(prompt).contains("<academic_tool_results>");
        assertThat(prompt).contains("</academic_tool_results>");
        assertThat(prompt).contains("<user_query>");
        assertThat(prompt).contains("</user_query>");
        assertThat(prompt).contains("REG-HAUI-01");
        assertThat(prompt).contains("CPA=3.10");
        assertThat(prompt).contains("Kỳ tới tôi được đăng ký bao nhiêu tín chỉ?");
    }

    @Test
    @DisplayName("Deterministic fake provider function generates valid grounded response")
    void testDeterministicFakeProviderGeneratesValidOutput() {
        RagChunk chunk = new RagChunk(
                "REG-HAUI-01#01", "REG-HAUI-01", "Quy chế đào tạo", "Điều 14", "v1", "https://haui.edu.vn",
                "Tối đa 24 tín chỉ mỗi kỳ.", 1, 100
        );
        ChatSourceItem source = new ChatSourceItem("REG-HAUI-01", "Quy chế đào tạo", "Điều 14", "v1", "https://haui.edu.vn");
        GroundedContext groundedContext = new GroundedContext("Tín chỉ", List.of(chunk), List.of(source), "Prompt", true, List.of());

        Function<String, String> fakeProvider = prompt -> {
            assertThat(prompt).contains("<rag_evidence>");
            return "Theo quy định tại [REG-HAUI-01], bạn được đăng ký tối đa 24 tín chỉ trong học kỳ chính.";
        };

        LiveAdvisorModel model = new LiveAdvisorModel(fakeProvider, validator);
        AdvisorModelInput input = new AdvisorModelInput("Đăng ký tín chỉ", studentContext, Map.of(), groundedContext);

        AdvisorModelOutput output = model.generate(input);

        assertThat(output).isNotNull();
        assertThat(output.getAnswer()).contains("tối đa 24 tín chỉ");
        assertThat(output.getSources()).hasSize(1);
        assertThat(output.getSources().get(0).getSourceId()).isEqualTo("REG-HAUI-01");
        assertThat(output.getWarnings()).isEmpty();
    }

    @Test
    @DisplayName("Network or model provider exception is converted to safe output with MODEL_PROVIDER_ERROR warning")
    void testProviderExceptionConvertedToSafeOutputWithWarning() {
        Function<String, String> failingProvider = prompt -> {
            throw new RuntimeException("503 Service Unavailable: Gemini API quota exceeded or connection timeout");
        };

        LiveAdvisorModel model = new LiveAdvisorModel(failingProvider, validator);
        AdvisorModelInput input = new AdvisorModelInput("Câu hỏi", studentContext, Map.of());

        AdvisorModelOutput output = model.generate(input);

        assertThat(output).isNotNull();
        assertThat(output.getAnswer()).contains("[LIVE_ADVISOR]");
        assertThat(output.getWarnings()).anyMatch(w -> w.contains("MODEL_PROVIDER_ERROR") && w.contains("503"));
        assertThat(output.getSources()).isEmpty();
        assertThat(output.getActions()).isEmpty();
    }

    @Test
    @DisplayName("Live model output is strictly validated by ResponseGroundingValidator")
    void testLiveModelOutputValidatedByResponseGroundingValidator() {
        RagChunk chunk = new RagChunk(
                "REG-HAUI-01#01", "REG-HAUI-01", "Quy chế đào tạo", "Điều 14", "v1", "https://haui.edu.vn",
                "Tối đa 24 tín chỉ.", 1, 100
        );
        ChatSourceItem validSource = new ChatSourceItem("REG-HAUI-01", "Quy chế đào tạo", "Điều 14", "v1", "https://haui.edu.vn");
        GroundedContext groundedContext = new GroundedContext("Tín chỉ", List.of(chunk), List.of(validSource), "Prompt", true, List.of());

        // LLM hallucinated JSON with fabricated source REG-HAUI-99 and invalid action route
        Function<String, String> hallucinatingProvider = prompt ->
                "{\"answer\":\"Bạn được đăng ký 24 tín chỉ.\"," +
                        "\"sources\":[{\"sourceId\":\"REG-HAUI-01\"},{\"sourceId\":\"REG-HAUI-99\"}]," +
                        "\"actions\":[{\"actionType\":\"NAVIGATE\",\"label\":\"Xem chi tiết\",\"targetRoute\":\"/academic/rules\"}," +
                        "{\"actionType\":\"EXECUTE_CMD\",\"label\":\"Lệnh nguy hiểm\",\"targetRoute\":\"https://evil.com\"}]}";

        LiveAdvisorModel model = new LiveAdvisorModel(hallucinatingProvider, validator);
        AdvisorModelInput input = new AdvisorModelInput("Tín chỉ", studentContext, Map.of(), groundedContext);

        AdvisorModelOutput output = model.generate(input);

        assertThat(output).isNotNull();
        // Fabricated REG-HAUI-99 stripped
        assertThat(output.getSources()).hasSize(1);
        assertThat(output.getSources().get(0).getSourceId()).isEqualTo("REG-HAUI-01");
        assertThat(output.getWarnings()).anyMatch(w -> w.contains("UNGROUNDED_CITATION_STRIPPED") && w.contains("REG-HAUI-99"));

        // Invalid action stripped
        assertThat(output.getActions()).hasSize(1);
        assertThat(output.getActions().get(0).getActionType()).isEqualTo("NAVIGATE");
        assertThat(output.getWarnings()).anyMatch(w -> w.contains("UNGROUNDED_ACTION_STRIPPED"));
    }

    @Test
    @DisplayName("Unconfigured live model produces safe warning without crashing")
    void testUnconfiguredLiveModelProducesWarning() {
        LiveAdvisorModel model = new LiveAdvisorModel(false);
        AdvisorModelInput input = new AdvisorModelInput("Test", studentContext, Map.of());

        AdvisorModelOutput output = model.generate(input);

        assertThat(output).isNotNull();
        assertThat(output.getWarnings()).anyMatch(w -> w.contains("MODEL_PROVIDER_ERROR"));
        assertThat(output.getAnswer()).contains("[LIVE_ADVISOR]");
    }

    @Test
    @DisplayName("MockAdvisorModel: Handles TOOL_ERROR scenario with TOOL_UNAVAILABLE warning")
    void testMockAdvisorModelToolErrorScenario() {
        MockAdvisorModel model = new MockAdvisorModel();
        AdvisorModelInput input = new AdvisorModelInput("Kiểm tra học vụ", studentContext, Map.of("toolError", true));
        AdvisorModelOutput output = model.generate(input);

        assertThat(output.getWarnings()).contains("TOOL_UNAVAILABLE");
        assertThat(output.getAnswer()).contains("[MOCK_ADVISOR]");
    }

    @Test
    @DisplayName("MockAdvisorModel: Handles MISSING_TRANSCRIPT with TRANSCRIPT_REQUIRED and OPEN_TRANSCRIPT_IMPORT")
    void testMockAdvisorModelMissingTranscriptScenario() {
        MockAdvisorModel model = new MockAdvisorModel();
        ParsedUserIntent intent = ParsedUserIntent.builder().isTranscriptMissing(true).build();
        AdvisorModelInput input = new AdvisorModelInput("Tư vấn học tập", studentContext, Map.of(), null, List.of(), intent);
        AdvisorModelOutput output = model.generate(input);

        assertThat(output.getWarnings()).contains("TRANSCRIPT_REQUIRED");
        assertThat(output.getActions()).hasSize(1);
        assertThat(output.getActions().getFirst().getActionType()).isEqualTo("OPEN_TRANSCRIPT_IMPORT");
        assertThat(output.getActions().getFirst().getTargetRoute()).isEqualTo("/academic/import");
    }

    @Test
    @DisplayName("MockAdvisorModel: Accelerated study clarification required generates INCOMPLETE_TARGET warning")
    void testMockAdvisorModelAcceleratedClarificationScenario() {
        MockAdvisorModel model = new MockAdvisorModel();
        ParsedUserIntent intent = ParsedUserIntent.builder()
                .category(ScenarioCategory.ACCELERATED_STUDY)
                .clarificationNeeded(true)
                .build();
        AdvisorModelInput input = new AdvisorModelInput("Tôi muốn học vượt", studentContext, Map.of(), null, List.of(), intent);
        AdvisorModelOutput output = model.generate(input);

        assertThat(output.getWarnings()).contains("INCOMPLETE_TARGET");
        assertThat(output.getAnswer()).contains("học vượt");
    }

    @Test
    @DisplayName("MockAdvisorModel: Handles GOAL_CHANGE scenario acknowledging new CPA target")
    void testMockAdvisorModelGoalChangeScenario() {
        MockAdvisorModel model = new MockAdvisorModel();
        ParsedUserIntent intent = ParsedUserIntent.builder()
                .category(ScenarioCategory.GOAL_CHANGE)
                .targetCpa(new BigDecimal("3.5"))
                .build();
        AdvisorModelInput input = new AdvisorModelInput("Đổi mục tiêu sang 3.5", studentContext, Map.of(), null, List.of(), intent);
        AdvisorModelOutput output = model.generate(input);

        assertThat(output.getAnswer()).contains("3.5");
        assertThat(output.getActions()).hasSize(1);
        assertThat(output.getActions().getFirst().getActionType()).isEqualTo("OPEN_PLANNER");
    }

    @Test
    @DisplayName("MockAdvisorModel: Handles WHAT_IF scenario with simulated GPA/CPA and OPEN_WHAT_IF")
    void testMockAdvisorModelWhatIfScenario() {
        MockAdvisorModel model = new MockAdvisorModel();
        SimulateGradesResponse sim = new SimulateGradesResponse(
                "SV2021001", new BigDecimal("2.80"), new BigDecimal("3.50"),
                new BigDecimal("3.10"), new BigDecimal("0.30"), "REV-1"
        );
        ParsedUserIntent intent = ParsedUserIntent.builder().category(ScenarioCategory.WHAT_IF).build();
        AdvisorModelInput input = new AdvisorModelInput("Nếu kỳ tới đạt 3.5 thì sao", studentContext, Map.of("simulateGrades", sim), null, List.of(), intent);
        AdvisorModelOutput output = model.generate(input);

        assertThat(output.getAnswer()).contains("3.50").contains("3.10");
        assertThat(output.getActions()).hasSize(1);
        assertThat(output.getActions().getFirst().getActionType()).isEqualTo("OPEN_WHAT_IF");
        assertThat(output.getActions().getFirst().getTargetRoute()).isEqualTo("/simulator");
    }

    @Test
    @DisplayName("MockAdvisorModel: Handles RETAKE_IMPROVEMENT with top ROI recommendations")
    void testMockAdvisorModelRetakeImprovementScenario() {
        MockAdvisorModel model = new MockAdvisorModel();
        RetakeCourseRecommendation rec = new RetakeCourseRecommendation(
                "IT1001", "Nhập môn CNTT", 3, "D+", new BigDecimal("1.5"),
                "A", new BigDecimal("4.0"), new BigDecimal("0.15"), 1, "High ROI"
        );
        RankRetakeCoursesResponse rank = new RankRetakeCoursesResponse("SV2021001", List.of(rec), "REV-1");
        ParsedUserIntent intent = ParsedUserIntent.builder().category(ScenarioCategory.RETAKE_IMPROVEMENT).build();
        AdvisorModelInput input = new AdvisorModelInput("Cải thiện môn nào", studentContext, Map.of("rankRetakeCourses", rank), null, List.of(), intent);
        AdvisorModelOutput output = model.generate(input);

        assertThat(output.getAnswer()).contains("IT1001");
        assertThat(output.getActions()).hasSize(1);
        assertThat(output.getActions().getFirst().getActionType()).isIn("OPEN_PLANNER", "NAVIGATE");
    }

    @Test
    @DisplayName("MockAdvisorModel: Handles GRADUATION_AUDIT with audit checklist and OPEN_AUDIT")
    void testMockAdvisorModelGraduationAuditScenario() {
        MockAdvisorModel model = new MockAdvisorModel();
        GraduationAuditResponse audit = new GraduationAuditResponse(
                "SV2021001", false, 80, 120, 150, List.of(), List.of(), "REV-1"
        );
        ParsedUserIntent intent = ParsedUserIntent.builder().category(ScenarioCategory.GRADUATION_AUDIT).build();
        AdvisorModelInput input = new AdvisorModelInput("Điều kiện tốt nghiệp", studentContext, Map.of("graduationAudit", audit), null, List.of(), intent);
        AdvisorModelOutput output = model.generate(input);

        assertThat(output.getAnswer()).contains("120/150");
        assertThat(output.getActions()).hasSize(1);
        assertThat(output.getActions().getFirst().getActionType()).isEqualTo("OPEN_AUDIT");
        assertThat(output.getActions().getFirst().getTargetRoute()).isEqualTo("/academic/audit");
    }

    @Test
    @DisplayName("MockAdvisorModel: Handles DEBT scenario with academic status and NAVIGATE to transcript")
    void testMockAdvisorModelDebtScenario() {
        MockAdvisorModel model = new MockAdvisorModel();
        AcademicStatusResponse status = new AcademicStatusResponse(
                "SV2021001", new BigDecimal("2.50"), new BigDecimal("2.10"), 65, 150,
                AcademicRiskLevel.NORMAL, List.of(), "REV-1"
        );
        ParsedUserIntent intent = ParsedUserIntent.builder().category(ScenarioCategory.DEBT_COURSES).build();
        AdvisorModelInput input = new AdvisorModelInput("Tôi nợ môn nào", studentContext, Map.of("academicStatus", status), null, List.of(), intent);
        AdvisorModelOutput output = model.generate(input);

        assertThat(output.getAnswer()).contains("2.10");
        assertThat(output.getActions()).hasSize(1);
        assertThat(output.getActions().getFirst().getActionType()).isEqualTo("NAVIGATE");
        assertThat(output.getActions().getFirst().getTargetRoute()).isEqualTo("/academic/transcript");
    }

    @Test
    @DisplayName("MockAdvisorModel: Handles NO_EVIDENCE scenario with POLICY_SOURCE_UNAVAILABLE warning")
    void testMockAdvisorModelNoEvidenceScenario() {
        MockAdvisorModel model = new MockAdvisorModel();
        GroundedContext noEvidence = GroundedContext.noEvidence("Câu hỏi ngoài lề", "", List.of());
        AdvisorModelInput input = new AdvisorModelInput("Quy định ngoài lề", studentContext, Map.of(), noEvidence);
        AdvisorModelOutput output = model.generate(input);

        assertThat(output.getWarnings()).contains("POLICY_SOURCE_UNAVAILABLE");
        assertThat(output.getSources()).isEmpty();
    }
}
