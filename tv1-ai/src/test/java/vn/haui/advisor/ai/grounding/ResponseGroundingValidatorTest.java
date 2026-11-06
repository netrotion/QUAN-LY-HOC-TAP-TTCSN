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
import vn.haui.advisor.contracts.dto.CourseEligibilityResponse;
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

    @Test
    void diagnosticTwoPassMatrixRecordsWhatTheCurrentGuardrailActuallyChanges() {
        String advice = "Mình hiểu bạn đang lo.\n\n- Học cải thiện\n- Học môn mới";
        AdvisorModelInput plain = new AdvisorModelInput("Mình nên làm gì?", studentContext, Map.of());
        AdvisorModelOutput plainFirst = validator.validate(new AdvisorModelOutput(advice, List.of(), List.of(), null, List.of()), plain);
        assertThat(validator.validate(plainFirst, plain).getAnswer()).isEqualTo(advice);

        String withPii = advice + "\nMã sinh viên: 2024604757";
        AdvisorModelOutput piiFirst = validator.validate(new AdvisorModelOutput(withPii, List.of(), List.of(), null, List.of()), plain);
        AdvisorModelOutput piiSecond = validator.validate(piiFirst, plain);
        assertThat(piiSecond.getAnswer()).doesNotContain("2024604757").contains("- Học cải thiện");
        assertThat(piiSecond.getAnswer()).isEqualTo(piiFirst.getAnswer());

        ChatSourceItem source = new ChatSourceItem("REG-HAUI-01", "Quy chế", "Điều 1", "v1", "https://haui.edu.vn");
        RagChunk chunk = new RagChunk("REG-HAUI-01#01", "REG-HAUI-01", "Quy chế", "Điều 1", "v1",
                "https://haui.edu.vn", "Nội dung", 1, 10);
        GroundedContext evidence = new GroundedContext("q", List.of(chunk), List.of(source), "", true, List.of());
        AdvisorModelInput grounded = new AdvisorModelInput("Quy định gì?", studentContext, Map.of(), evidence);
        AdvisorModelOutput cited = validator.validate(new AdvisorModelOutput("Theo [REG-HAUI-01], cần kiểm tra.",
                List.of(source), List.of(), null, List.of()), grounded);
        assertThat(validator.validate(cited, grounded).getSources()).hasSize(1);

        AdvisorModelOutput unsupported = validator.validate(new AdvisorModelOutput(
                "Mình hiểu bạn lo. Theo [REG-HAUI-99], tối đa 30 tín. Hãy kiểm tra thời gian rảnh.",
                List.of(), List.of(), null, List.of()), plain);
        assertThat(unsupported.getAnswer()).doesNotContain("30 tín", "kiểm tra thời gian rảnh");
        assertThat(validator.validate(unsupported, plain).getAnswer()).isEqualTo(unsupported.getAnswer());

        CourseEligibilityResponse course = new CourseEligibilityResponse("IT6080", false, List.of("IT6020"), List.of(), "REV-1");
        course.setCourseName("Lập trình Web bằng Java");
        AdvisorModelInput courseInput = new AdvisorModelInput("IT6080 là môn gì?", studentContext, Map.of("courseEligibility", course));
        AdvisorModelOutput wrongName = validator.validate(new AdvisorModelOutput("IT6080 là Đồ án chuyên ngành.",
                List.of(), List.of(), null, List.of()), courseInput);
        assertThat(wrongName.getAnswer()).contains("IT6080 là Đồ án chuyên ngành");
        assertThat(validator.validate(wrongName, courseInput).getAnswer()).isEqualTo(wrongName.getAnswer());

        AcademicStatusResponse status = new AcademicStatusResponse("SV001", new BigDecimal("2.30"),
                new BigDecimal("2.45"), 95, 150, AcademicRiskLevel.NORMAL, List.of(), "REV-1");
        AdvisorModelInput numbers = new AdvisorModelInput("CPA của mình?", studentContext, Map.of("academicStatus", status));
        AdvisorModelOutput numericFirst = validator.validate(new AdvisorModelOutput(
                "- CPA hiện tại 3.80\n- CPA hiện tại 3.90\n- Đã tích lũy 95 tín chỉ",
                List.of(), List.of(), null, List.of()), numbers);
        assertThat(numericFirst.getAnswer()).contains("CPA hiện tại 2.45", "CPA hiện tại 3.90", "- Đã tích lũy 95 tín chỉ");
        assertThat(validator.validate(numericFirst, numbers).getAnswer()).isEqualTo(numericFirst.getAnswer());
    }

    @Test
    void internalToolTagIsNotDisplayedAsAUserFacingCitation() {
        String raw = "Theo hồ sơ học vụ [academic_tool_results], bạn còn thiếu IT6019.\n\n- Kiểm tra lại trước khi đăng ký.";
        AdvisorModelInput input = new AdvisorModelInput("Mình còn thiếu gì?", studentContext, Map.of());
        AdvisorModelOutput first = validator.validate(new AdvisorModelOutput(raw, List.of(), List.of(), null, List.of()), input);
        assertThat(first.getAnswer()).doesNotContain("[academic_tool_results]")
                .contains("bạn còn thiếu IT6019", "\n\n- Kiểm tra lại");
        assertThat(validator.validate(first, input).getAnswer()).isEqualTo(first.getAnswer());
    }

    @Test
    void internalEligibilityFieldLabelsDoNotLeakIntoAdvice() {
        String raw = "IT6020 đã đáp ứng (`priorCourseCodesNotMissing`); IT6019 còn thiếu (`missingEnrollmentRequirements`). "
                + "Bạn chưa đăng ký được (`eligible=false`).\n\n- Kiểm tra IT6019.";
        AdvisorModelInput input = new AdvisorModelInput("Mình còn thiếu gì?", studentContext, Map.of());
        AdvisorModelOutput first = validator.validate(new AdvisorModelOutput(raw, List.of(), List.of(), null, List.of()), input);
        assertThat(first.getAnswer()).doesNotContain("priorCourseCodesNotMissing", "missingEnrollmentRequirements", "eligible=false")
                .contains("IT6020 đã đáp ứng", "IT6019 còn thiếu", "\n\n- Kiểm tra IT6019.");
        assertThat(validator.validate(first, input).getAnswer()).isEqualTo(first.getAnswer());
    }

    @Test
    void contradictoryPriorCourseClaimFallsBackToVerifiedEngineFacts() {
        CourseEligibilityResponse eligibility = new CourseEligibilityResponse("IT6080", false,
                List.of("IT6019 (chưa đăng ký học phần học trước)"), List.of(), "REV-1");
        eligibility.setCourseName("Lập trình Web bằng Java");
        eligibility.setPrerequisiteCourseCodes(List.of());
        eligibility.setPriorCourseCodes(List.of("IT6019", "IT6020"));
        eligibility.setCorequisiteCourseCodes(List.of());
        AdvisorModelInput input = new AdvisorModelInput("Mình chưa học IT6020 thì sao?", studentContext,
                Map.of("courseEligibility", eligibility));
        AdvisorModelOutput wrong = new AdvisorModelOutput(
                "IT6020 không nằm trong yêu cầu học trước của IT6080, nên bạn không cần học môn đó.",
                List.of(), List.of(), null, List.of());
        AdvisorModelOutput corrected = validator.validate(wrong, input);
        assertThat(corrected.getAnswer()).contains("IT6080", "Lập trình Web bằng Java", "IT6019", "IT6020")
                .doesNotContain("IT6020 không nằm trong yêu cầu học trước");
        assertThat(corrected.getWarnings()).anyMatch(w -> w.startsWith("COURSE_RELATION_CONTRADICTION"));
        assertThat(validator.validate(corrected, input).getAnswer()).isEqualTo(corrected.getAnswer());

        AdvisorModelOutput correct = new AdvisorModelOutput(
                "IT6080 không có môn tiên quyết; IT6020 là môn học trước.", List.of(), List.of(), null, List.of());
        assertThat(validator.validate(correct, input).getAnswer()).isEqualTo(correct.getAnswer());
    }

    private ResponseGroundingValidator validator;
    private TrustedStudentContext studentContext;

    @BeforeEach
    void setUp() {
        validator = new ResponseGroundingValidator();
        studentContext = new TrustedStudentContext("SV001", "SV001", "Nguyễn Văn A", "K16-CNTT", "K16", "2024-V1");
    }

    @Test
    void noPiiLeavesMarkdownBytesUnchanged() {
        String answer = "Mình hiểu bạn đang lo.\n\n- Phương án 1: học cải thiện\n- Phương án 2: học môn mới\n\nBạn còn bao nhiêu giờ mỗi tuần?";
        assertThat(validator.redactUnsolicitedPii(answer, "Mình nên làm gì?")).isEqualTo(answer);
    }

    @Test
    void piiRedactionPreservesSurroundingParagraphsAndList() {
        String answer = "Mình đã xem hồ sơ (Mã sinh viên: 2024604757).\n\n- Học cải thiện\n- Học môn mới";
        String redacted = validator.redactUnsolicitedPii(answer, "Mình nên chọn gì?");
        assertThat(redacted).doesNotContain("2024604757", "Mã sinh viên");
        assertThat(redacted).contains("\n\n- Học cải thiện\n- Học môn mới");
    }

    @Test
    void unusedPolicySourceIsNotShownAsCitation() {
        RagChunk chunk = new RagChunk("REG-HAUI-01#01", "REG-HAUI-01", "Quy chế", "Điều 1", "v1",
                "https://haui.edu.vn", "Giới hạn tín chỉ", 1, 10);
        ChatSourceItem source = new ChatSourceItem("REG-HAUI-01", "Quy chế", "Điều 1", "v1", "https://haui.edu.vn");
        GroundedContext evidence = new GroundedContext("q", List.of(chunk), List.of(source), "", true, List.of());
        AdvisorModelOutput raw = new AdvisorModelOutput("Mình cần biết bạn có bao nhiêu thời gian rảnh.",
                List.of(source), List.of(), null, List.of());
        assertThat(validator.validate(raw, evidence, Map.of()).getSources()).isEmpty();
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
                "Theo [REG-HAUI-01], bạn được đăng ký tối đa 24 tín chỉ.",
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
                "Theo [REG-HAUI-01], bạn được đăng ký tối đa 24 tín chỉ.",
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

    @Test
    @DisplayName("Validator must flag hallucinated course codes not present in tool results or evidence")
    void shouldFlagHallucinatedCourseCodes() {
        ResponseGroundingValidator validator = new ResponseGroundingValidator();
        AdvisorModelOutput rawOutput = new AdvisorModelOutput(
                "Bạn nên học môn IT9999 để cải thiện điểm số.",
                List.of(),
                List.of(),
                null,
                List.of()
        );

        AcademicStatusResponse status = new AcademicStatusResponse(
                "SV2021001", new BigDecimal("3.20"), new BigDecimal("3.10"), 80, 150,
                AcademicRiskLevel.NORMAL, List.of("IT6015"), "REV-1"
        );
        Map<String, Object> toolResults = Map.of("academicStatus", status);

        AdvisorModelOutput validated = validator.validate(rawOutput, null, toolResults);

        assertThat(validated.getWarnings()).anyMatch(w -> w.contains("UNGROUNDED_COURSE_CODE") && w.contains("IT9999"));
    }

    @Test
    @DisplayName("PII Guardrail: Automatically redact unsolicited student code from response")
    void shouldRedactUnsolicitedStudentCode() {
        AdvisorModelOutput raw = new AdvisorModelOutput(
                "Chào bạn Lê Việt Hùng (Mã sinh viên: 2024604757), theo quy định bạn được đăng ký 24 tín chỉ.",
                List.of(),
                List.of(),
                null,
                List.of()
        );

        AdvisorModelInput input = new AdvisorModelInput(
                "Một kỳ được đăng ký tối đa bao nhiêu tín chỉ?",
                studentContext,
                Map.of()
        );

        AdvisorModelOutput validated = validator.validate(raw, input);
        assertThat(validated.getAnswer()).doesNotContain("2024604757");
        assertThat(validated.getAnswer()).doesNotContain("Mã sinh viên");
        assertThat(validated.getAnswer()).contains("Chào bạn Lê Việt Hùng");
    }

    @Test
    @DisplayName("PII Guardrail: Preserve student code when user explicitly requests it")
    void shouldPreserveStudentCodeWhenRequested() {
        AdvisorModelOutput raw = new AdvisorModelOutput(
                "Mã sinh viên của bạn là 2024604757.",
                List.of(),
                List.of(),
                null,
                List.of()
        );

        AdvisorModelInput input = new AdvisorModelInput(
                "Cho tôi biết mã sinh viên của tôi",
                new TrustedStudentContext("STU-1", "2024604757", "Bạn A", "IT", "K19", "REV-1"),
                Map.of()
        );

        AdvisorModelOutput validated = validator.validate(raw, input);
        assertThat(validated.getAnswer()).contains("2024604757");
    }

    @Test
    void bareStudentCodeIsRedactedWhenNotRequested() {
        AdvisorModelOutput raw = new AdvisorModelOutput("Chào bạn (2024604757).", List.of(), List.of(), null, List.of());
        AdvisorModelInput input = new AdvisorModelInput("Mình nên làm gì?",
                new TrustedStudentContext("STU-1", "2024604757", "Bạn A", "IT", "K19", "REV-1"), Map.of());
        assertThat(validator.validate(raw, input).getAnswer()).doesNotContain("2024604757");
    }

    @Test
    void requestForOwnCodeDoesNotRevealAnotherStudentCode() {
        AdvisorModelOutput raw = new AdvisorModelOutput(
                "Mã sinh viên của bạn là 2024604757. Mã sinh viên khác: 2024604758.",
                List.of(), List.of(), null, List.of());
        AdvisorModelInput input = new AdvisorModelInput("Cho mình mã sinh viên của mình",
                new TrustedStudentContext("STU-1", "2024604757", "Bạn A", "IT", "K19", "REV-1"), Map.of());
        String answer = validator.validate(raw, input).getAnswer();
        assertThat(answer).contains("2024604757").doesNotContain("2024604758");
    }

    @Test
    void noEvidenceCannotPassThroughRawSourceMetadata() {
        AdvisorModelOutput raw = new AdvisorModelOutput("Lời khuyên chung", List.of(
                new ChatSourceItem("REG-HAUI-99", "Fake", "Fake", "v1", "https://example.com")),
                List.of(), null, List.of());
        assertThat(validator.validate(raw, null, Map.of()).getSources()).isEmpty();
    }
}
