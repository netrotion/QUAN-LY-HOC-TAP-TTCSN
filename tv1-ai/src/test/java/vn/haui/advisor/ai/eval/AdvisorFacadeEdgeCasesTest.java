package vn.haui.advisor.ai.eval;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.conversation.ChatMessageHistoryItem;
import vn.haui.advisor.ai.conversation.ConversationHistoryManager;
import vn.haui.advisor.ai.grounding.ResponseGroundingValidator;
import vn.haui.advisor.ai.intent.IntentClassifier;
import vn.haui.advisor.ai.intent.ParsedUserIntent;
import vn.haui.advisor.ai.mock.MockAcademicFacade;
import vn.haui.advisor.ai.model.*;
import vn.haui.advisor.ai.rag.model.RagChunk;
import vn.haui.advisor.ai.rag.service.GroundedContext;
import vn.haui.advisor.ai.rag.service.RagAdvisorService;
import vn.haui.advisor.ai.service.DefaultAdvisorFacade;
import vn.haui.advisor.ai.tools.DefaultToolAdapter;
import vn.haui.advisor.ai.tools.ToolAdapter;
import vn.haui.advisor.ai.tools.ToolParameterValidator;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.fake.InMemoryConversationStore;
import vn.haui.advisor.contracts.ports.ConversationStore;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Task 3.8 — AdvisorFacade Edge Cases & Reliability Matrix")
class AdvisorFacadeEdgeCasesTest {

    private ConversationStore conversationStore;
    private ConversationHistoryManager historyManager;
    private IntentClassifier intentClassifier;
    private ResponseGroundingValidator groundingValidator;
    private MockAcademicFacade academicFacade;
    private ToolAdapter toolAdapter;
    private TrustedStudentContext defaultContext;

    @BeforeEach
    void setUp() {
        conversationStore = new InMemoryConversationStore();
        historyManager = new ConversationHistoryManager(conversationStore, new ObjectMapper());
        intentClassifier = new IntentClassifier();
        groundingValidator = new ResponseGroundingValidator();
        academicFacade = new MockAcademicFacade();
        toolAdapter = new DefaultToolAdapter(academicFacade);
        defaultContext = new TrustedStudentContext(
                "STU-2024604757",
                "2024604757",
                "Nguyễn Văn An",
                "Công nghệ thông tin",
                "K16",
                "REV-2024-V1"
        );
    }

    @Test
    @DisplayName("Edge Case 1: Multi-turn goal shift (Target CPA changes from 3.3 to 3.5 across turns)")
    void testMultiTurnGoalShiftTargetCpaChange() {
        AdvisorModel model = new MockAdvisorModel();
        DefaultAdvisorFacade facade = new DefaultAdvisorFacade(
                model, toolAdapter, null, historyManager, intentClassifier, groundingValidator
        );

        String convId = "CONV-GOAL-SHIFT-01";

        // Turn 1: Yêu cầu kế hoạch với CPA 3.3
        ChatRequest req1 = new ChatRequest(convId, "Lập kế hoạch học tập giúp mình đạt CPA 3.3", Instant.now().toString());
        ChatResponse resp1 = facade.chat(req1, defaultContext);

        assertThat(resp1).isNotNull();
        assertThat(resp1.getPlanProposal()).isNotNull();
        assertThat(resp1.getPlanProposal().getSummary()).contains("3.3");

        // Turn 2: Đổi mục tiêu thành 3.5
        ChatRequest req2 = new ChatRequest(convId, "Đổi mục tiêu thành 3.5 giúp mình", Instant.now().toString());
        ChatResponse resp2 = facade.chat(req2, defaultContext);

        assertThat(resp2).isNotNull();
        assertThat(resp2.getAnswer()).contains("3.5");
        assertThat(resp2.getPlanProposal()).isNotNull();
        assertThat(resp2.getPlanProposal().getSummary()).contains("3.5");
    }

    @Test
    @DisplayName("Edge Case 2: Missing parameters (Accelerated study inquiry without target semester triggers clarification)")
    void testMissingParametersAcceleratedStudyClarification() {
        AdvisorModel model = new MockAdvisorModel();
        DefaultAdvisorFacade facade = new DefaultAdvisorFacade(
                model, toolAdapter, null, historyManager, intentClassifier, groundingValidator
        );

        ChatRequest req = new ChatRequest("CONV-CLARIFY-01", "Tôi muốn học vượt để tốt nghiệp sớm", Instant.now().toString());
        ChatResponse resp = facade.chat(req, defaultContext);

        assertThat(resp).isNotNull();
        assertThat(resp.getWarnings()).anyMatch(w -> w.contains("INCOMPLETE_TARGET"));
        assertThat(resp.getAnswer()).contains("học kỳ");
    }

    @Test
    @DisplayName("Edge Case 3: Tool timeout (Slow tool execution exceeding timeout is safely bounded)")
    void testToolTimeoutBounding() {
        ToolAdapter slowAdapter = new ToolAdapter() {
            @Override
            public AcademicStatusResponse getAcademicStatus(TrustedStudentContext context) {
                try {
                    Thread.sleep(300);
                } catch (InterruptedException ignored) {}
                return new AcademicStatusResponse(context.getStudentId(), BigDecimal.ONE, BigDecimal.ONE, 10, 150, AcademicRiskLevel.NORMAL, List.of(), "REV-1");
            }
            @Override public CourseEligibilityResponse checkCourseEligibility(TrustedStudentContext c, String code, String sem) { return null; }
            @Override public GenerateStudyPlanResponse generateStudyPlan(TrustedStudentContext c, String s, BigDecimal t, Integer m, Boolean sum, List<String> ret) { return null; }
            @Override public ValidateStudyPlanResponse validateStudyPlan(TrustedStudentContext c, ValidateStudyPlanRequest r) { return null; }
            @Override public SimulateGradesResponse simulateGrades(TrustedStudentContext c, List<SimulatedCourseGrade> g) { return null; }
            @Override public RankRetakeCoursesResponse rankRetakeCourses(TrustedStudentContext c, Integer max) { return null; }
            @Override public CalculateTargetGradesResponse calculateTargetGrades(TrustedStudentContext c, BigDecimal t, String s) { return null; }
            @Override public GraduationAuditResponse runGraduationAudit(TrustedStudentContext c) { return null; }
            @Override public ReconcileStudyPlanResponse reconcileStudyPlan(TrustedStudentContext c, String p, String sem, Integer v) { return null; }
            @Override public boolean isCapabilityReady(AcademicCapability cap) { return true; }
            @Override public Set<AcademicCapability> getReadyCapabilities() { return Set.of(AcademicCapability.GET_ACADEMIC_STATUS); }
        };

        DefaultAdvisorFacade facade = new DefaultAdvisorFacade(
                new MockAdvisorModel(), slowAdapter, null, historyManager, intentClassifier, groundingValidator, 50
        );

        ChatRequest req = new ChatRequest("CONV-TIMEOUT-01", "Tôi nợ những môn nào?", Instant.now().toString());
        ChatResponse resp = facade.chat(req, defaultContext);

        assertThat(resp).isNotNull();
        assertThat(resp.getWarnings()).anyMatch(w -> w.contains("TOOL_TIMEOUT"));
    }

    @Test
    @DisplayName("Edge Case 4: Infinite-loop & budget prevention (Stops after budget without cyclical calls)")
    void testToolExecutionBudgetPrevention() {
        AtomicInteger callCount = new AtomicInteger(0);
        ToolAdapter countingAdapter = new ToolAdapter() {
            @Override
            public AcademicStatusResponse getAcademicStatus(TrustedStudentContext context) {
                callCount.incrementAndGet();
                return new AcademicStatusResponse(context.getStudentId(), BigDecimal.valueOf(3.0), BigDecimal.valueOf(3.0), 80, 150, AcademicRiskLevel.NORMAL, List.of(), "REV-1");
            }
            @Override
            public GenerateStudyPlanResponse generateStudyPlan(TrustedStudentContext c, String s, BigDecimal t, Integer m, Boolean sum, List<String> ret) {
                callCount.incrementAndGet();
                return new GenerateStudyPlanResponse("P-1", c.getStudentId(), StudyPlanStatus.VALIDATED, List.of(), BigDecimal.valueOf(3.0), List.of(), 15, "REV-1");
            }
            @Override public CourseEligibilityResponse checkCourseEligibility(TrustedStudentContext c, String code, String sem) { callCount.incrementAndGet(); return null; }
            @Override public ValidateStudyPlanResponse validateStudyPlan(TrustedStudentContext c, ValidateStudyPlanRequest r) { callCount.incrementAndGet(); return null; }
            @Override public SimulateGradesResponse simulateGrades(TrustedStudentContext c, List<SimulatedCourseGrade> g) { callCount.incrementAndGet(); return null; }
            @Override public RankRetakeCoursesResponse rankRetakeCourses(TrustedStudentContext c, Integer max) { callCount.incrementAndGet(); return null; }
            @Override public CalculateTargetGradesResponse calculateTargetGrades(TrustedStudentContext c, BigDecimal t, String s) { callCount.incrementAndGet(); return null; }
            @Override public GraduationAuditResponse runGraduationAudit(TrustedStudentContext c) { callCount.incrementAndGet(); return null; }
            @Override public ReconcileStudyPlanResponse reconcileStudyPlan(TrustedStudentContext c, String p, String sem, Integer v) { callCount.incrementAndGet(); return null; }
            @Override public boolean isCapabilityReady(AcademicCapability cap) { return true; }
            @Override public Set<AcademicCapability> getReadyCapabilities() { return EnumSet.allOf(AcademicCapability.class); }
        };

        DefaultAdvisorFacade facade = new DefaultAdvisorFacade(
                new MockAdvisorModel(), countingAdapter, null, historyManager, intentClassifier, groundingValidator
        );

        ChatRequest req = new ChatRequest("CONV-BUDGET-01", "Lập kế hoạch học kỳ tới CPA 3.2", Instant.now().toString());
        facade.chat(req, defaultContext);

        // Phải được giới hạn nghiêm ngặt theo TOOL_EXECUTION_BUDGET (<= 3 calls)
        assertThat(callCount.get()).isLessThanOrEqualTo(3);
    }

    @Test
    @DisplayName("Edge Case 5: Invalid schema rejection (ToolParameterValidator strictly validates bounds)")
    void testInvalidSchemaParameterRejection() {
        // 1. Target CPA > 4.00 hoặc âm
        assertThatThrownBy(() -> ToolParameterValidator.validateTargetCpa(new BigDecimal("4.50")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("between 0.00 and 4.00");

        assertThatThrownBy(() -> ToolParameterValidator.validateTargetCpa(new BigDecimal("-0.50")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("between 0.00 and 4.00");

        // 2. Max credits ngoài khoảng [10, 30]
        assertThatThrownBy(() -> ToolParameterValidator.validateMaxCreditsPerSemester(5))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("between 10 and 30");

        assertThatThrownBy(() -> ToolParameterValidator.validateMaxCreditsPerSemester(35))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("between 10 and 30");

        // 3. Course code không đúng định dạng
        assertThatThrownBy(() -> ToolParameterValidator.validateCourseCode("invalid_code!"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Edge Case 6: Fabricated citation stripping (Ungrounded citation REG-HAUI-999 is stripped)")
    void testFabricatedCitationStrippedWithWarning() {
        AdvisorModel hallucinatingModel = input -> {
            ChatSourceItem fakeSource = new ChatSourceItem("REG-HAUI-999", "Quy chế giả định", "Điều 99", "v1", "https://haui.fake");
            return new AdvisorModelOutput(
                    "Theo điều 99 bạn được nhận bằng danh dự.",
                    List.of(fakeSource),
                    List.of(),
                    null,
                    List.of()
            );
        };

        RagAdvisorService mockRag = new RagAdvisorService() {
            @Override
            public GroundedContext retrieveAndGround(String query, int topK, double minScore) {
                return new GroundedContext(query, List.of(
                        new RagChunk("REG-HAUI-01#01", "REG-HAUI-01", "Quy chế đào tạo", "Điều 1", "v1", "https://haui.edu.vn", "Nội dung", 1, 100)
                ), List.of(
                        new ChatSourceItem("REG-HAUI-01", "Quy chế đào tạo", "Điều 1", "v1", "https://haui.edu.vn")
                ), "Prompt", true, List.of());
            }
        };

        DefaultAdvisorFacade facade = new DefaultAdvisorFacade(
                hallucinatingModel, toolAdapter, mockRag, historyManager, intentClassifier, groundingValidator
        );

        ChatRequest req = new ChatRequest("CONV-FABRICATED-01", "Quy định bằng danh dự", Instant.now().toString());
        ChatResponse resp = facade.chat(req, defaultContext);

        // Nguồn trích dẫn bịa đặt phải bị gỡ bỏ
        assertThat(resp.getSources()).isEmpty();
        assertThat(resp.getWarnings()).anyMatch(w -> w.contains("UNGROUNDED_CITATION_STRIPPED") && w.contains("REG-HAUI-999"));
    }

    @Test
    @DisplayName("Edge Case 7: Cross-account student isolation (User B is denied access to User A's conversation)")
    void testCrossAccountStudentIsolation() {
        DefaultAdvisorFacade facade = new DefaultAdvisorFacade(
                new MockAdvisorModel(), toolAdapter, null, historyManager, intentClassifier, groundingValidator
        );

        String sharedConvId = "CONV-PRIVATE-A";
        TrustedStudentContext studentA = new TrustedStudentContext("SV_USER_A", "SV_USER_A", "Sinh viên A", "CNTT", "K16", "REV-1");
        TrustedStudentContext studentB = new TrustedStudentContext("SV_USER_B", "SV_USER_B", "Sinh viên B", "CNTT", "K16", "REV-1");

        // Sinh viên A tạo cuộc trò chuyện
        ChatRequest reqA = new ChatRequest(sharedConvId, "Tôi nợ môn nào", Instant.now().toString());
        ChatResponse respA = facade.chat(reqA, studentA);
        assertThat(respA).isNotNull();

        // Mặc dù trong InMemoryConversationStore, User B không thể đọc được nội dung của User A
        List<ChatMessageHistoryItem> historyB = historyManager.loadHistory(sharedConvId, studentB.getStudentId(), 10);
        assertThat(historyB).isEmpty();

        // Nếu một store bất thường trả về bản ghi sai chủ sở hữu, loadHistory phải tung SecurityException
        ConversationStore rogueStore = new ConversationStore() {
            @Override
            public ConversationRecord getConversation(String conversationId, String studentId) {
                return new ConversationRecord(conversationId, studentA.getStudentId(), "Lịch sử của A", null, null, "[]");
            }
            @Override public void saveConversation(ConversationRecord record) {}
            @Override public List<ConversationSummaryItem> listConversations(String studentId) { return List.of(); }
        };

        ConversationHistoryManager rogueManager = new ConversationHistoryManager(rogueStore, new ObjectMapper());
        DefaultAdvisorFacade rogueFacade = new DefaultAdvisorFacade(
                new MockAdvisorModel(), toolAdapter, null, rogueManager, intentClassifier, groundingValidator
        );

        ChatRequest reqB = new ChatRequest(sharedConvId, "Cho xem tin nhắn của A", Instant.now().toString());
        ChatResponse respB = rogueFacade.chat(reqB, studentB);

        assertThat(respB.getWarnings()).anyMatch(w -> w.contains("SECURITY_ERROR"));
        assertThat(respB.getAnswer()).contains("Từ chối quyền truy cập");
    }

    @Test
    @DisplayName("Edge Case 8: Tool capability unready (AcademicFacade capability not ready returns TOOL_UNAVAILABLE)")
    void testToolCapabilityUnreadyReturnsWarning() {
        DefaultAdvisorFacade facade = new DefaultAdvisorFacade(
                new MockAdvisorModel(), toolAdapter, null, historyManager, intentClassifier, groundingValidator
        );

        ChatRequest req = new ChatRequest("CONV-UNREADY-01", "Đồng bộ kế hoạch học tập hiện tại", Instant.now().toString());
        ChatResponse resp = facade.chat(req, defaultContext);

        assertThat(resp).isNotNull();
        assertThat(resp.getWarnings()).anyMatch(w -> w.contains("TOOL_UNAVAILABLE"));
    }

    @Test
    @DisplayName("Edge Case 9: Model provider exception fallback (Handled gracefully with MODEL_PROVIDER_ERROR)")
    void testModelProviderExceptionFallback() {
        LiveAdvisorModel liveModel = new LiveAdvisorModel(
                prompt -> { throw new RuntimeException("503 Service Unavailable: Gemini connection timed out"); },
                groundingValidator
        );

        DefaultAdvisorFacade facade = new DefaultAdvisorFacade(
                liveModel, toolAdapter, null, historyManager, intentClassifier, groundingValidator
        );

        ChatRequest req = new ChatRequest("CONV-MODEL-ERR-01", "Quy chế thi lại", Instant.now().toString());
        ChatResponse resp = facade.chat(req, defaultContext);

        assertThat(resp).isNotNull();
        assertThat(resp.getWarnings()).anyMatch(w -> w.contains("MODEL_PROVIDER_ERROR"));
        assertThat(resp.getAnswer()).contains("gián đoạn");
    }

    @Test
    @DisplayName("Edge Case 10: Conversation state reload & continuation across turns")
    void testConversationStateReloadAndContinuation() {
        DefaultAdvisorFacade facade = new DefaultAdvisorFacade(
                new MockAdvisorModel(), toolAdapter, null, historyManager, intentClassifier, groundingValidator
        );

        String convId = "CONV-CONTINUATION-01";

        // Turn 1
        ChatRequest req1 = new ChatRequest(convId, "Xin chào, tôi là sinh viên K16", Instant.now().toString());
        facade.chat(req1, defaultContext);

        // Kiểm tra đã được lưu vào store
        List<ChatMessageHistoryItem> history = historyManager.loadHistory(convId, defaultContext.getStudentId(), 10);
        assertThat(history).hasSize(2);
        assertThat(history.get(0).getContent()).contains("sinh viên K16");

        // Turn 2
        ChatRequest req2 = new ChatRequest(convId, "Tôi có nợ môn nào không?", Instant.now().toString());
        ChatResponse resp2 = facade.chat(req2, defaultContext);
        assertThat(resp2.getAnswer()).isNotBlank();

        // Kiểm tra sau Turn 2 lịch sử có 4 tin nhắn
        List<ChatMessageHistoryItem> updatedHistory = historyManager.loadHistory(convId, defaultContext.getStudentId(), 10);
        assertThat(updatedHistory).hasSize(4);
    }

    @Test
    @DisplayName("Edge Case 11: Stale data revision detection (REV-0 triggers TRANSCRIPT_REQUIRED)")
    void testStaleDataRevisionDetection() {
        TrustedStudentContext missingTranscriptContext = new TrustedStudentContext(
                "STU-ANONYMOUS",
                "STU-ANONYMOUS",
                "Sinh viên mới",
                "Kỹ thuật phần mềm",
                "K16",
                "REV-0"
        );

        DefaultAdvisorFacade facade = new DefaultAdvisorFacade(
                new MockAdvisorModel(), toolAdapter, null, historyManager, intentClassifier, groundingValidator
        );

        ChatRequest req = new ChatRequest("CONV-STALE-REV-01", "Lập kế hoạch học kỳ tới", Instant.now().toString());
        ChatResponse resp = facade.chat(req, missingTranscriptContext);

        assertThat(resp).isNotNull();
        assertThat(resp.getWarnings()).anyMatch(w -> w.contains("TRANSCRIPT_REQUIRED"));
        assertThat(resp.getActions()).anyMatch(a -> "/academic/import".equals(a.getTargetRoute()) || "OPEN_TRANSCRIPT_IMPORT".equals(a.getActionType()));
    }
}
