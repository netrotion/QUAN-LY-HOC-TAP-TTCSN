package vn.haui.advisor.ai.grounding;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.model.AdvisorModelInput;
import vn.haui.advisor.ai.model.AdvisorModelOutput;
import vn.haui.advisor.ai.rag.model.RagChunk;
import vn.haui.advisor.ai.rag.service.GroundedContext;
import vn.haui.advisor.contracts.dto.AcademicRiskLevel;
import vn.haui.advisor.contracts.dto.AcademicStatusResponse;
import vn.haui.advisor.contracts.dto.ChatActionItem;
import vn.haui.advisor.contracts.dto.ChatSourceItem;
import vn.haui.advisor.contracts.dto.SimulateGradesResponse;
import vn.haui.advisor.contracts.dto.TrustedStudentContext;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ResponseGroundingValidator Unit Tests")
class ResponseGroundingValidatorTest {

    private ResponseGroundingValidator validator;
    private TrustedStudentContext studentContext;

    @BeforeEach
    void setUp() {
        validator = new ResponseGroundingValidator();
        studentContext = new TrustedStudentContext("SV001", "SV001", "Nguyễn Văn A", "K16-CNTT", "K16", "2024-V1");
    }

    @Test
    @DisplayName("Citations existing in evidence chunks are preserved")
    void testCitationsInEvidenceChunksAreRetained() {
        RagChunk chunk = new RagChunk(
                "REG-HAUI-01#01", "REG-HAUI-01", "Quy chế đào tạo tín chỉ", "Điều 14", "v1", "https://haui.edu.vn",
                "Nội dung quy chế...", 1, 100
        );
        ChatSourceItem validSource = new ChatSourceItem("REG-HAUI-01", "Quy chế đào tạo tín chỉ", "Điều 14", "v1", "https://haui.edu.vn");

        GroundedContext groundedContext = new GroundedContext(
                "Đăng ký tín chỉ", List.of(chunk), List.of(validSource), "Context prompt", true, List.of()
        );

        AdvisorModelOutput rawOutput = new AdvisorModelOutput(
                "Bạn được đăng ký tối đa 24 tín chỉ.",
                List.of(validSource),
                List.of(),
                null,
                List.of()
        );

        AdvisorModelInput input = new AdvisorModelInput("Đăng ký tín chỉ", studentContext, Map.of(), groundedContext);
        AdvisorModelOutput validated = validator.validate(rawOutput, input);

        assertThat(validated.getSources()).hasSize(1);
        assertThat(validated.getSources().get(0).getSourceId()).isEqualTo("REG-HAUI-01");
        assertThat(validated.getWarnings()).isEmpty();
    }

    @Test
    @DisplayName("Fabricated citations not in evidence are stripped and recorded with warning")
    void testFabricatedCitationsAreStrippedWithWarning() {
        RagChunk chunk = new RagChunk(
                "REG-HAUI-01#01", "REG-HAUI-01", "Quy chế đào tạo tín chỉ", "Điều 14", "v1", "https://haui.edu.vn",
                "Nội dung quy chế...", 1, 100
        );
        ChatSourceItem validSource = new ChatSourceItem("REG-HAUI-01", "Quy chế đào tạo tín chỉ", "Điều 14", "v1", "https://haui.edu.vn");
        ChatSourceItem fakeSource = new ChatSourceItem("REG-HAUI-99", "Quy chế bịa đặt", "Điều 99", "v1", "https://haui.edu.vn/fake");

        GroundedContext groundedContext = new GroundedContext(
                "Đăng ký tín chỉ", List.of(chunk), List.of(validSource), "Context prompt", true, List.of()
        );

        AdvisorModelOutput rawOutput = new AdvisorModelOutput(
                "Bạn được đăng ký tối đa 24 tín chỉ.",
                List.of(validSource, fakeSource),
                List.of(),
                null,
                List.of()
        );

        AdvisorModelInput input = new AdvisorModelInput("Đăng ký tín chỉ", studentContext, Map.of(), groundedContext);
        AdvisorModelOutput validated = validator.validate(rawOutput, input);

        assertThat(validated.getSources()).hasSize(1);
        assertThat(validated.getSources().get(0).getSourceId()).isEqualTo("REG-HAUI-01");
        assertThat(validated.getWarnings()).anyMatch(w -> w.contains("UNGROUNDED_CITATION_STRIPPED") && w.contains("REG-HAUI-99"));
    }

    @Test
    @DisplayName("No evidence context forces sources to be empty list")
    void testNoEvidenceContextForcesEmptySources() {
        GroundedContext noEvidence = GroundedContext.noEvidence("Câu hỏi ngoài phạm vi", "No prompt", List.of("POLICY_SOURCE_UNAVAILABLE"));
        ChatSourceItem straySource = new ChatSourceItem("REG-HAUI-01", "Quy chế", "Điều 1", "v1", "https://haui.edu.vn");

        AdvisorModelOutput rawOutput = new AdvisorModelOutput(
                "Không tìm thấy quy chế phù hợp.",
                List.of(straySource),
                List.of(),
                null,
                List.of("POLICY_SOURCE_UNAVAILABLE")
        );

        AdvisorModelInput input = new AdvisorModelInput("Hỏi vu vơ", studentContext, Map.of(), noEvidence);
        AdvisorModelOutput validated = validator.validate(rawOutput, input);

        assertThat(validated.getSources()).isEmpty();
        assertThat(validated.getWarnings()).anyMatch(w -> w.contains("UNGROUNDED_CITATION_STRIPPED"));
    }

    @Test
    @DisplayName("Allowed action types and routes are retained")
    void testAllowedActionTypesAndRoutesRetained() {
        List<ChatActionItem> actions = List.of(
                new ChatActionItem("OPEN_PLANNER", "Xem kế hoạch", "/planner", "{}"),
                new ChatActionItem("NAVIGATE", "Xem bảng điểm", "/academic/transcript", "{}"),
                new ChatActionItem("OPEN_WHAT_IF", "Giả lập điểm", "/simulator", "{}"),
                new ChatActionItem("OPEN_AUDIT", "Kiểm toán tốt nghiệp", "/academic/audit", "{}"),
                new ChatActionItem("OPEN_TRANSCRIPT_IMPORT", "Nhập bảng điểm", "/academic/import", "{}")
        );

        AdvisorModelOutput rawOutput = new AdvisorModelOutput("Các tác vụ gợi ý:", List.of(), actions, null, List.of());
        AdvisorModelInput input = new AdvisorModelInput("Xem tác vụ", studentContext, Map.of());
        AdvisorModelOutput validated = validator.validate(rawOutput, input);

        assertThat(validated.getActions()).hasSize(5);
    }

    @Test
    @DisplayName("Forbidden action types are stripped with warning")
    void testForbiddenActionTypeStripped() {
        List<ChatActionItem> actions = List.of(
                new ChatActionItem("EXECUTE_COMMAND", "Chạy lệnh nguy hiểm", "/planner", "{}"),
                new ChatActionItem("NAVIGATE", "Hợp lệ", "/academic/rules", "{}")
        );

        AdvisorModelOutput rawOutput = new AdvisorModelOutput("Tác vụ:", List.of(), actions, null, List.of());
        AdvisorModelInput input = new AdvisorModelInput("Tác vụ", studentContext, Map.of());
        AdvisorModelOutput validated = validator.validate(rawOutput, input);

        assertThat(validated.getActions()).hasSize(1);
        assertThat(validated.getActions().get(0).getActionType()).isEqualTo("NAVIGATE");
        assertThat(validated.getWarnings()).anyMatch(w -> w.contains("UNGROUNDED_ACTION_STRIPPED") && w.contains("EXECUTE_COMMAND"));
    }

    @Test
    @DisplayName("Forbidden action routes are stripped with warning")
    void testForbiddenActionRouteStripped() {
        List<ChatActionItem> actions = List.of(
                new ChatActionItem("NAVIGATE", "Liên kết độc hại", "https://attacker.com/steal-token", "{}"),
                new ChatActionItem("OPEN_PLANNER", "Hợp lệ", "/planner?proposalId=123", "{}")
        );

        AdvisorModelOutput rawOutput = new AdvisorModelOutput("Tác vụ:", List.of(), actions, null, List.of());
        AdvisorModelInput input = new AdvisorModelInput("Tác vụ", studentContext, Map.of());
        AdvisorModelOutput validated = validator.validate(rawOutput, input);

        assertThat(validated.getActions()).hasSize(1);
        assertThat(validated.getActions().get(0).getTargetRoute()).contains("/planner");
        assertThat(validated.getWarnings()).anyMatch(w -> w.contains("UNGROUNDED_ACTION_STRIPPED") && w.contains("https://attacker.com/steal-token"));
    }

    @Test
    @DisplayName("Numerical integrity: Preserves authoritative CPA and corrects hallucinated CPA")
    void testNumericalIntegrityPreservesAuthoritativeCpa() {
        AcademicStatusResponse status = new AcademicStatusResponse(
                "SV001", new BigDecimal("3.00"), new BigDecimal("2.45"), 95, 150,
                AcademicRiskLevel.NORMAL, List.of(), "REV-1"
        );
        Map<String, Object> tools = Map.of("academicStatus", status);

        // LLM hallucinated CPA 3.80 instead of authoritative 2.45
        AdvisorModelOutput rawOutput = new AdvisorModelOutput(
                "Điểm CPA hiện tại của bạn là 3.80, hãy cố gắng duy trì.",
                List.of(), List.of(), null, List.of()
        );

        AdvisorModelInput input = new AdvisorModelInput("Điểm của tôi thế nào?", studentContext, tools);
        AdvisorModelOutput validated = validator.validate(rawOutput, input);

        assertThat(validated.getAnswer()).contains("2.45");
        assertThat(validated.getAnswer()).doesNotContain("3.80");
        assertThat(validated.getWarnings()).anyMatch(w -> w.contains("NUMERICAL_OVERWRITE_PREVENTED") && w.contains("2.45"));
    }

    @Test
    @DisplayName("Numerical integrity: Preserves authoritative accumulated credits")
    void testNumericalIntegrityPreservesAuthoritativeCredits() {
        AcademicStatusResponse status = new AcademicStatusResponse(
                "SV001", new BigDecimal("3.00"), new BigDecimal("2.45"), 95, 150,
                AcademicRiskLevel.NORMAL, List.of(), "REV-1"
        );
        Map<String, Object> tools = Map.of("academicStatus", status);

        // LLM hallucinated 120 credits instead of authoritative 95
        AdvisorModelOutput rawOutput = new AdvisorModelOutput(
                "Bạn đã tích lũy 120 tín chỉ cho tới nay.",
                List.of(), List.of(), null, List.of()
        );

        AdvisorModelInput input = new AdvisorModelInput("Tín chỉ của tôi?", studentContext, tools);
        AdvisorModelOutput validated = validator.validate(rawOutput, input);

        assertThat(validated.getAnswer()).contains("95 tín chỉ");
        assertThat(validated.getAnswer()).doesNotContain("120 tín chỉ");
        assertThat(validated.getWarnings()).anyMatch(w -> w.contains("NUMERICAL_OVERWRITE_PREVENTED") && w.contains("95"));
    }

    @Test
    @DisplayName("Numerical integrity: Preserves projected CPA from SimulateGradesResponse")
    void testNumericalIntegrityWithSimulateGrades() {
        SimulateGradesResponse sim = new SimulateGradesResponse(
                "SV001", new BigDecimal("2.50"), new BigDecimal("3.50"),
                new BigDecimal("3.15"), new BigDecimal("0.65"), "REV-1"
        );
        Map<String, Object> tools = Map.of("simulateGrades", sim);

        // LLM hallucinated projected CPA 3.90 instead of authoritative 3.15
        AdvisorModelOutput rawOutput = new AdvisorModelOutput(
                "Nếu đạt mục tiêu, CPA dự kiến là 3.90 trong học kỳ tới.",
                List.of(), List.of(), null, List.of()
        );

        AdvisorModelInput input = new AdvisorModelInput("Mô phỏng điểm", studentContext, tools);
        AdvisorModelOutput validated = validator.validate(rawOutput, input);

        assertThat(validated.getAnswer()).contains("3.15");
        assertThat(validated.getAnswer()).doesNotContain("3.90");
        assertThat(validated.getWarnings()).anyMatch(w -> w.contains("NUMERICAL_OVERWRITE_PREVENTED") && w.contains("3.15"));
    }
}
