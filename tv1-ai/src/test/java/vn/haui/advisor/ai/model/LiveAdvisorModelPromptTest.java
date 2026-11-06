package vn.haui.advisor.ai.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.conversation.ChatMessageHistoryItem;
import vn.haui.advisor.ai.rag.model.RagChunk;
import vn.haui.advisor.ai.rag.service.GroundedContext;
import vn.haui.advisor.contracts.dto.AcademicRiskLevel;
import vn.haui.advisor.contracts.dto.AcademicStatusResponse;
import vn.haui.advisor.contracts.dto.ChatSourceItem;
import vn.haui.advisor.contracts.dto.CalculateTargetGradesResponse;
import vn.haui.advisor.contracts.dto.CourseEligibilityResponse;
import vn.haui.advisor.contracts.dto.GenerateStudyPlanResponse;
import vn.haui.advisor.contracts.dto.PlannedCourseItem;
import vn.haui.advisor.contracts.dto.PlannedSemesterItem;
import vn.haui.advisor.contracts.dto.StudyPlanStatus;
import vn.haui.advisor.contracts.dto.TrustedStudentContext;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("LiveAdvisorModel Prompt Framing & Coreference Tests")
class LiveAdvisorModelPromptTest {

    @Test
    void eligibilityPromptDistinguishesVerifiedCourseAndEnrollmentConditions() {
        CourseEligibilityResponse eligibility = new CourseEligibilityResponse("IT6080", false,
                List.of("IT6020 (chưa đăng ký học phần học trước)"), List.of(), "REV-1");
        eligibility.setCourseName("Lập trình Web bằng Java");
        eligibility.setPrerequisiteCourseCodes(List.of());
        eligibility.setPriorCourseCodes(List.of("IT6019", "IT6020"));
        eligibility.setCorequisiteCourseCodes(List.of());

        String prompt = new LiveAdvisorModel().buildPrompt(new AdvisorModelInput(
                "Môn IT6080 - Đồ án chuyên ngành cần tiên quyết gì?", null, Map.of("courseEligibility", eligibility)));
        assertThat(prompt).contains("courseName=Lập trình Web bằng Java", "prerequisiteCourseCodes=[]",
                "priorCourseCodes=[IT6019, IT6020]", "missingEnrollmentRequirements=[IT6020",
                "priorCourseCodesNotMissing=[IT6019]");
        assertThat(prompt).contains("đối chiếu tên học phần");
        assertThat(prompt).contains("giả định đã hoàn thành");
        assertThat(prompt).contains("chỉ các mục trong missingEnrollmentRequirements là còn thiếu");
        assertThat(prompt).contains("không nêu tên trường kỹ thuật");
    }

    @Test
    void plainAdviceDoesNotAttachUnusedRetrievedCitation() {
        ChatSourceItem source = new ChatSourceItem("REG-HAUI-01", "Quy chế", "Điều 1", "v1", "https://haui.edu.vn");
        RagChunk chunk = new RagChunk("REG-HAUI-01#01", "REG-HAUI-01", "Quy chế", "Điều 1", "v1",
                "https://haui.edu.vn", "Giới hạn tín chỉ", 1, 10);
        GroundedContext evidence = new GroundedContext("q", List.of(chunk), List.of(source), "", true, List.of());
        AdvisorModelInput input = new AdvisorModelInput("Mình nên làm gì?", null, Map.of(), evidence);

        AdvisorModelOutput direct = new LiveAdvisorModel(prompt -> "Bạn nên cân nhắc thời gian rảnh trước.").generate(input);
        AdvisorModelOutput cited = new LiveAdvisorModel(prompt -> "Quy định ở [REG-HAUI-01] giới hạn tín chỉ.").generate(input);

        assertThat(direct.getSources()).isEmpty();
        assertThat(cited.getSources()).extracting(ChatSourceItem::getSourceId).containsExactly("REG-HAUI-01");
    }

    @Test
    void structuredModelCannotSupplyPolicySourceWithoutRetrieval() {
        String json = "{\"answer\":\"Theo [REG-HAUI-99], được đăng ký 30 tín.\",\"sources\":[{\"sourceId\":\"REG-HAUI-99\",\"title\":\"Bịa\"}]}";
        AdvisorModelOutput output = new LiveAdvisorModel(prompt -> json).generate(
                new AdvisorModelInput("Bao nhiêu tín?", null, Map.of()));
        assertThat(output.getSources()).isEmpty();
        assertThat(output.getAnswer()).doesNotContain("30 tín", "REG-HAUI-99");
        assertThat(output.getWarnings()).anyMatch(w -> w.contains("UNGROUNDED_CITATION"));
    }

    @Test
    void formattedAcademicStatusOmitsInternalStudentId() {
        AcademicStatusResponse status = new AcademicStatusResponse("INTERNAL-STUDENT-123", BigDecimal.valueOf(3.1),
                BigDecimal.valueOf(2.7), 72, 150, AcademicRiskLevel.NORMAL, List.of(), "REV-1");
        String prompt = new LiveAdvisorModel().buildPrompt(
                new AdvisorModelInput("CPA của mình?", null, Map.of("academicStatus", status)));
        assertThat(prompt).contains("CPA=2.7");
        assertThat(prompt).doesNotContain("INTERNAL-STUDENT-123", "studentId=");
    }

    @Test
    void formattedEngineResultsGiveTheModelActualDecisionFacts() {
        CalculateTargetGradesResponse target = new CalculateTargetGradesResponse("PRIVATE-ID", new BigDecimal("2.50"),
                new BigDecimal("3.20"), 36, new BigDecimal("3.80"), List.of(), List.of(), "REV-1");
        PlannedSemesterItem semester = new PlannedSemesterItem("2026_2", "Kỳ 2", List.of(
                new PlannedCourseItem("IT6015", "Cấu trúc dữ liệu", 3, "B+", "môn bắt buộc")), 3, new BigDecimal("3.50"));
        GenerateStudyPlanResponse plan = new GenerateStudyPlanResponse("PROPOSAL-1", "PRIVATE-ID", StudyPlanStatus.DRAFT,
                List.of(semester), new BigDecimal("3.10"), List.of(), "REV-1");
        String formatted = new LiveAdvisorModel().formatToolResults(Map.of("calculateTargetGrades", target, "studyPlan", plan));
        assertThat(formatted).contains("requiredAverageGpa=3.80", "IT6015", "2026_2", "projectedCpa=3.10");
        assertThat(formatted).doesNotContain("PRIVATE-ID");
    }

    @Test
    void promptSeparatesPolicyFactsStudentFactsAndAdvice() {
        String prompt = new LiveAdvisorModel().buildPrompt(new AdvisorModelInput("Mình nên chọn phương án nào?", null, Map.of()));
        assertThat(prompt).contains("quy chế đã xác minh", "dữ kiện học vụ", "nhận định", "một câu hỏi làm rõ");
    }

    @Test
    @DisplayName("buildPrompt must contain conversation_history section with sanitized turns")
    void shouldIncludeFormattedConversationHistoryInPrompt() {
        LiveAdvisorModel model = new LiveAdvisorModel();

        TrustedStudentContext context = new TrustedStudentContext("SV001", "SV001", "Nguyễn Văn A", "K16-CNTT", "K16", "2024-V1");
        List<ChatMessageHistoryItem> history = List.of(
                ChatMessageHistoryItem.ofUser("Môn IT6015 có tiên quyết gì không?"),
                ChatMessageHistoryItem.ofAssistant("Môn IT6015 yêu cầu tiên quyết IT6011.", List.of(), List.of(), null, List.of())
        );

        AdvisorModelInput input = new AdvisorModelInput(
                "Môn đó bao nhiêu tín chỉ?",
                context,
                Map.of(),
                null,
                history,
                null
        );

        String prompt = model.buildPrompt(input);

        assertThat(prompt).contains("<conversation_history>");
        assertThat(prompt).contains("<turn role=\"user\">Môn IT6015 có tiên quyết gì không?</turn>");
        assertThat(prompt).contains("<turn role=\"assistant\">Môn IT6015 yêu cầu tiên quyết IT6011.</turn>");
        assertThat(prompt).contains("</conversation_history>");
        assertThat(prompt).contains("<user_query>\nMôn đó bao nhiêu tín chỉ?\n</user_query>");
    }

    @Test
    @DisplayName("buildPrompt handles null or empty history gracefully")
    void shouldHandleEmptyHistoryGracefully() {
        LiveAdvisorModel model = new LiveAdvisorModel();
        TrustedStudentContext context = new TrustedStudentContext("SV001", "SV001", "Nguyễn Văn A", "K16-CNTT", "K16", "2024-V1");
        AdvisorModelInput input = new AdvisorModelInput("Xin chào", context, Map.of());

        String prompt = model.buildPrompt(input);

        assertThat(prompt).contains("<conversation_history>");
        assertThat(prompt).contains("KHÔNG CÓ LỊCH SỬ HỘI THOẠI TRƯỚC ĐÓ.");
        assertThat(prompt).contains("</conversation_history>");
    }

    @Test
    @DisplayName("PII Protection: buildPrompt must never include studentCode (Mã SV) in prompt")
    void shouldNotExposeStudentCodeInPromptContext() {
        LiveAdvisorModel model = new LiveAdvisorModel();
        TrustedStudentContext context = new TrustedStudentContext("SV2024604757", "2024604757", "Lê Việt Hùng", "CT1085", "K19", "2024-V1");
        AdvisorModelInput input = new AdvisorModelInput(
                "Xem lộ trình học tập của tôi",
                context,
                Map.of(),
                null,
                List.of(),
                new vn.haui.advisor.ai.intent.ParsedUserIntent(vn.haui.advisor.ai.intent.ParsedUserIntent.ScenarioCategory.STUDY_PLAN)
        );

        String prompt = model.buildPrompt(input);

        assertThat(prompt).contains("<student_context>");
        assertThat(prompt).contains("Họ và tên: Lê Việt Hùng");
        assertThat(prompt).doesNotContain("2024604757");
        assertThat(prompt).doesNotContain("Mã SV");
    }

    @Test
    @DisplayName("Clean Context: General regulation query must not inject personal student context or negative tool noise")
    void shouldOmitStudentContextOnGeneralRegulationQuery() {
        LiveAdvisorModel model = new LiveAdvisorModel();
        TrustedStudentContext context = new TrustedStudentContext("SV2024604757", "2024604757", "Lê Việt Hùng", "CT1085", "K19", "2024-V1");
        AdvisorModelInput input = new AdvisorModelInput(
                "Một kỳ được đăng ký tối đa bao nhiêu tín chỉ?",
                context,
                Map.of(),
                null,
                List.of(),
                new vn.haui.advisor.ai.intent.ParsedUserIntent(vn.haui.advisor.ai.intent.ParsedUserIntent.ScenarioCategory.REGULATION)
        );

        String prompt = model.buildPrompt(input);

        assertThat(prompt).contains("Không yêu cầu dữ liệu học vụ cá nhân (Truy vấn quy chế đào tạo chung).");
        assertThat(prompt).contains("Không áp dụng ngữ cảnh cá nhân cho truy vấn này.");
        assertThat(prompt).doesNotContain("Lê Việt Hùng");
    }
}
