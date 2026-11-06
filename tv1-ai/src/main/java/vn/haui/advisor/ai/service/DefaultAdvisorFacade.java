package vn.haui.advisor.ai.service;

import vn.haui.advisor.ai.conversation.ChatMessageHistoryItem;
import vn.haui.advisor.ai.conversation.ConversationHistoryManager;
import vn.haui.advisor.ai.grounding.ResponseGroundingValidator;
import vn.haui.advisor.ai.intent.IntentClassifier;
import vn.haui.advisor.ai.intent.ParsedUserIntent;
import vn.haui.advisor.ai.model.AdvisorModel;
import vn.haui.advisor.ai.model.AdvisorModelInput;
import vn.haui.advisor.ai.model.AdvisorModelOutput;
import vn.haui.advisor.ai.rag.service.GroundedContext;
import vn.haui.advisor.ai.rag.service.RagAdvisorService;
import vn.haui.advisor.ai.tools.ToolAdapter;
import vn.haui.advisor.ai.tools.ToolNotReadyException;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.AdvisorFacade;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;

/**
 * Triển khai chuẩn của port AdvisorFacade theo contracts.
 * Nhận request và context tin cậy từ server; điều phối công cụ qua ToolAdapter,
 * kiểm tra ngữ cảnh quy chế qua RagAdvisorService, quản lý lịch sử hội thoại qua ConversationHistoryManager,
 * và sinh phản hồi an toàn qua AdvisorModel kết hợp ResponseGroundingValidator.
 */
public class DefaultAdvisorFacade implements AdvisorFacade {

    private static final int DEFAULT_MAX_HISTORY_TURNS = 10;
    private static final int TOOL_EXECUTION_BUDGET = 3;
    private static final long DEFAULT_TOOL_TIMEOUT_MS = 2500;

    private final AdvisorModel advisorModel;
    private final ToolAdapter toolAdapter;
    private final RagAdvisorService ragAdvisorService;
    private final ConversationHistoryManager conversationHistoryManager;
    private final IntentClassifier intentClassifier;
    private final ResponseGroundingValidator responseGroundingValidator;
    private final ConversationTurnPlanner turnPlanner;
    private final ExecutorService executorService;
    private final long toolTimeoutMs;

    public DefaultAdvisorFacade(AdvisorModel advisorModel, ToolAdapter toolAdapter) {
        this(advisorModel, toolAdapter, null, null, null, null, DEFAULT_TOOL_TIMEOUT_MS);
    }

    public DefaultAdvisorFacade(AdvisorModel advisorModel, ToolAdapter toolAdapter, RagAdvisorService ragAdvisorService) {
        this(advisorModel, toolAdapter, ragAdvisorService, null, null, null, DEFAULT_TOOL_TIMEOUT_MS);
    }

    public DefaultAdvisorFacade(AdvisorModel advisorModel,
                                ToolAdapter toolAdapter,
                                RagAdvisorService ragAdvisorService,
                                ConversationHistoryManager conversationHistoryManager,
                                IntentClassifier intentClassifier,
                                ResponseGroundingValidator responseGroundingValidator) {
        this(advisorModel, toolAdapter, ragAdvisorService, conversationHistoryManager, intentClassifier, responseGroundingValidator, DEFAULT_TOOL_TIMEOUT_MS);
    }

    public DefaultAdvisorFacade(AdvisorModel advisorModel,
                                ToolAdapter toolAdapter,
                                RagAdvisorService ragAdvisorService,
                                ConversationHistoryManager conversationHistoryManager,
                                IntentClassifier intentClassifier,
                                ResponseGroundingValidator responseGroundingValidator,
                                long toolTimeoutMs) {
        this.advisorModel = Objects.requireNonNull(advisorModel, "advisorModel must not be null");
        this.toolAdapter = Objects.requireNonNull(toolAdapter, "toolAdapter must not be null");
        this.ragAdvisorService = ragAdvisorService;
        this.conversationHistoryManager = conversationHistoryManager != null ? conversationHistoryManager : new ConversationHistoryManager();
        this.intentClassifier = intentClassifier != null ? intentClassifier : new IntentClassifier();
        this.responseGroundingValidator = responseGroundingValidator != null ? responseGroundingValidator : new ResponseGroundingValidator();
        this.turnPlanner = new ConversationTurnPlanner(this.intentClassifier);
        this.toolTimeoutMs = toolTimeoutMs;
        this.executorService = Executors.newCachedThreadPool(r -> {
            Thread t = new Thread(r, "advisor-tool-runner");
            t.setDaemon(true);
            return t;
        });
    }

    @Override
    public ChatResponse chat(ChatRequest request, TrustedStudentContext context) {
        // 1. Kiểm tra tính hợp lệ của request
        if (request == null || request.getMessage() == null || request.getMessage().trim().isEmpty()) {
            return new ChatResponse(
                    "Nội dung câu hỏi không được để trống.",
                    List.of(),
                    List.of(),
                    null,
                    List.of("VALIDATION_ERROR: Empty message")
            );
        }

        // 2. Kiểm tra context tin cậy (ngăn chặn giả mạo danh tính)
        if (context == null || context.getStudentId() == null || context.getStudentId().trim().isEmpty()) {
            return new ChatResponse(
                    "Không thể xác định danh tính sinh viên từ phiên đăng nhập hợp lệ.",
                    List.of(),
                    List.of(),
                    null,
                    List.of("SECURITY_ERROR: Unauthenticated student context")
            );
        }

        String userMessage = request.getMessage().trim();
        String conversationId = request.getConversationId();
        String studentId = context.getStudentId();

        // 3. Tải lịch sử hội thoại (Sliding Window bounding)
        List<ChatMessageHistoryItem> history = Collections.emptyList();
        if (conversationId != null && !conversationId.trim().isEmpty()) {
            try {
                history = conversationHistoryManager.loadHistory(conversationId, studentId, DEFAULT_MAX_HISTORY_TURNS);
            } catch (SecurityException se) {
                return new ChatResponse(
                        "Từ chối quyền truy cập hội thoại không thuộc sở hữu của bạn.",
                        List.of(),
                        List.of(),
                        null,
                        List.of("SECURITY_ERROR: Access denied to conversation " + conversationId)
                );
            } catch (Exception ignored) {
                history = Collections.emptyList();
            }
        }

        // 4. Phân loại ý định và bóc tách tham số (Context & Intent Understanding)
        ConversationTurnPlanner.TurnDecision decision = turnPlanner.decide(userMessage, history);
        ParsedUserIntent userIntent = decision.intent();
        boolean isTranscriptMissing = context.getStudentId() != null &&
                (context.getStudentId().contains("ANONYMOUS") || "REV-0".equals(context.getDataRevision()) || "REV-EMPTY".equals(context.getDataRevision()));
        if (isTranscriptMissing && userIntent.getCategory() != ParsedUserIntent.ScenarioCategory.REGULATION) {
            userIntent = ParsedUserIntent.builder()
                    .category(userIntent.getCategory())
                    .targetCpa(userIntent.getTargetCpa())
                    .targetSemester(userIntent.getTargetSemester())
                    .courseCode(userIntent.getCourseCode())
                    .maxCredits(userIntent.getMaxCredits())
                    .includeSummer(userIntent.getIncludeSummer())
                    .retakeSuggestions(userIntent.getRetakeSuggestions())
                    .simulatedGrades(userIntent.getSimulatedGrades())
                    .isTranscriptMissing(true)
                    .build();
        }

        // 5. Truy xuất RAG và neo chứng cứ quy chế
        GroundedContext groundedContext = null;
        List<String> combinedWarnings = new ArrayList<>();
        if (isTranscriptMissing && decision.mode() != ConversationTurnPlanner.Mode.POLICY
                && decision.mode() != ConversationTurnPlanner.Mode.DIRECT) {
            combinedWarnings.add("TRANSCRIPT_REQUIRED");
        }
        if (ragAdvisorService != null && decision.policyEvidenceNeeded() && decision.clarificationQuestion() == null) {
            groundedContext = ragAdvisorService.retrieveAndGround(decision.retrievalQuery(), 5, 0.35);
            combinedWarnings.addAll(groundedContext.getWarnings());
        }

        // 6. Điều phối công cụ học vụ (Academic Tool Calling với Budget & Timeout)
        Map<String, Object> toolResults = new HashMap<>();
        if (decision.clarificationQuestion() == null) {
            executeAcademicTools(context, userIntent, decision, toolResults, combinedWarnings);
        }

        // 7. Đóng gói Input và gọi AdvisorModel (Mock hoặc Live)
        AdvisorModelInput modelInput = new AdvisorModelInput(
                userMessage,
                context,
                toolResults,
                groundedContext,
                history,
                userIntent
        );

        AdvisorModelOutput rawModelOutput = decision.clarificationQuestion() != null
                ? new AdvisorModelOutput(
                        isTranscriptMissing
                                ? "Mình chưa có bảng điểm đã xác nhận để lập kế hoạch cá nhân. Bạn vui lòng nhập bảng điểm trước; sau đó cho mình biết "
                                    + decision.clarificationQuestion().toLowerCase(Locale.ROOT)
                                : decision.clarificationQuestion(),
                        List.of(),
                        isTranscriptMissing ? List.of(new ChatActionItem("OPEN_TRANSCRIPT_IMPORT", "Nhập bảng điểm", "/academic/import", "{}")) : List.of(),
                        null, List.of())
                : advisorModel.generate(modelInput);

        // 8. Hậu kiểm định neo nguồn và chuẩn hóa phản hồi (Response Grounding Validation kèm PII redaction)
        AdvisorModelOutput validatedOutput = responseGroundingValidator.validate(rawModelOutput, modelInput);

        // Gộp cảnh báo từ model và tool results
        for (String w : validatedOutput.getWarnings()) {
            if (!combinedWarnings.contains(w)) {
                combinedWarnings.add(w);
            }
        }

        ChatResponse response = new ChatResponse(
                validatedOutput.getAnswer(),
                validatedOutput.getSources(),
                validatedOutput.getActions(),
                validatedOutput.getPlanProposal(),
                combinedWarnings
        );

        // 9. Lưu trữ trạng thái hội thoại đa lượt (Conversation Persistence)
        if (conversationId != null && !conversationId.trim().isEmpty()) {
            try {
                ChatMessageHistoryItem userHistoryItem = ChatMessageHistoryItem.ofUser(userMessage);
                ChatMessageHistoryItem assistantHistoryItem = ChatMessageHistoryItem.ofAssistant(
                        response.getAnswer(),
                        response.getSources(),
                        response.getActions(),
                        response.getPlanProposal() != null ? response.getPlanProposal().getProposalId() : null,
                        response.getWarnings()
                );
                conversationHistoryManager.saveTurn(conversationId, studentId, userHistoryItem, assistantHistoryItem, 900_000);
            } catch (SecurityException | IllegalArgumentException se) {
                if (se.getMessage() != null && (se.getMessage().contains("sinh viên khác") || se.getMessage().contains("Cross-account") || se.getMessage().contains("belongs to another student"))) {
                    return new ChatResponse(
                            "Từ chối quyền truy cập hội thoại không thuộc sở hữu của bạn.",
                            List.of(),
                            List.of(),
                            null,
                            List.of("SECURITY_ERROR: Access denied to conversation " + conversationId)
                    );
                }
                combinedWarnings.add("PERSISTENCE_ERROR: " + se.getMessage());
            } catch (Exception e) {
                combinedWarnings.add("PERSISTENCE_ERROR: Failed to save turn: " + e.getMessage());
            }
        }

        return response;
    }

    /**
     * Điều phối thực thi các công cụ học vụ dựa trên ý định đã phân tích.
     */
    private void executeAcademicTools(TrustedStudentContext context,
                                      ParsedUserIntent intent,
                                      ConversationTurnPlanner.TurnDecision decision,
                                      Map<String, Object> toolResults,
                                      List<String> warnings) {
        if (intent.isTranscriptMissing()) {
            warnings.add("TRANSCRIPT_REQUIRED");
            return;
        }
        int calls = 0;
        for (AcademicCapability capability : decision.capabilities()) {
            if (calls++ >= TOOL_EXECUTION_BUDGET) break;
            Object result = switch (capability) {
                case GET_ACADEMIC_STATUS -> executeWithTimeout(
                        () -> toolAdapter.getAcademicStatus(context), capability, warnings);
                case CHECK_COURSE_ELIGIBILITY -> executeWithTimeout(
                        () -> toolAdapter.checkCourseEligibility(context, intent.getCourseCode(), intent.getTargetSemester()),
                        capability, warnings);
                case GENERATE_STUDY_PLAN -> executeWithTimeout(
                        () -> toolAdapter.generateStudyPlan(context, intent.getTargetSemester(), intent.getTargetCpa(),
                                intent.getMaxCredits(), intent.getIncludeSummer(), null), capability, warnings);
                case SIMULATE_GRADES -> executeWithTimeout(
                        () -> toolAdapter.simulateGrades(context, intent.getSimulatedGrades()), capability, warnings);
                case RANK_RETAKE_COURSES -> executeWithTimeout(
                        () -> toolAdapter.rankRetakeCourses(context, intent.getRetakeSuggestions()), capability, warnings);
                case CALCULATE_TARGET_GRADES -> executeWithTimeout(
                        () -> toolAdapter.calculateTargetGrades(context, intent.getTargetCpa(), intent.getTargetSemester()),
                        capability, warnings);
                case RUN_GRADUATION_AUDIT -> executeWithTimeout(
                        () -> toolAdapter.runGraduationAudit(context), capability, warnings);
                case RECONCILE_STUDY_PLAN -> executeWithTimeout(
                        () -> toolAdapter.reconcileStudyPlan(context, decision.planId(), intent.getTargetSemester(),
                                decision.planVersion()), capability, warnings);
                case VALIDATE_STUDY_PLAN -> null; // Requires an owned, concrete draft payload.
            };
            if (result == null) {
                toolResults.put("toolUnavailable", true);
                continue;
            }
            String key = switch (capability) {
                case GET_ACADEMIC_STATUS -> "academicStatus";
                case CHECK_COURSE_ELIGIBILITY -> "courseEligibility";
                case GENERATE_STUDY_PLAN -> "studyPlan";
                case VALIDATE_STUDY_PLAN -> "validateStudyPlan";
                case SIMULATE_GRADES -> "simulateGrades";
                case RANK_RETAKE_COURSES -> "rankRetakeCourses";
                case CALCULATE_TARGET_GRADES -> "calculateTargetGrades";
                case RUN_GRADUATION_AUDIT -> "graduationAudit";
                case RECONCILE_STUDY_PLAN -> "reconcileStudyPlan";
            };
            toolResults.put(key, result);
            collectToolWarnings(result, toolResults, warnings);
            if (result instanceof GenerateStudyPlanResponse plan
                    && plan.getSemesters() != null && !plan.getSemesters().isEmpty()) {
                String label = intent.getTargetCpa() == null ? "Đề xuất kế hoạch học tập"
                        : "Đề xuất kế hoạch học tập mục tiêu CPA " + intent.getTargetCpa().toPlainString();
                toolResults.put("planProposal", new ChatPlanProposal(
                        plan.getProposalId(), label, plan.getSemesters(), plan.getProjectedCpa()));
            }
        }
    }
    /**
     * Thu thập các cảnh báo học vụ từ phản hồi của công cụ và đưa vào danh sách cảnh báo tập trung.
     */
    private void collectToolWarnings(Object response, Map<String, Object> toolResults, List<String> combinedWarnings) {
        if (response == null) {
            return;
        }
        List<String> toolWarnings = null;
        if (response instanceof AcademicStatusResponse r) {
            toolWarnings = r.getWarnings();
        } else if (response instanceof GenerateStudyPlanResponse r) {
            toolWarnings = r.getWarnings();
        } else if (response instanceof ValidateStudyPlanResponse r) {
            toolWarnings = r.getWarnings();
        } else if (response instanceof CalculateTargetGradesResponse r) {
            toolWarnings = r.getWarnings();
        } else if (response instanceof CourseEligibilityResponse r) {
            toolWarnings = r.getWarnings();
        }

        if (toolWarnings != null && !toolWarnings.isEmpty()) {
            for (String w : toolWarnings) {
                if (w != null && !w.isBlank() && !combinedWarnings.contains(w)) {
                    combinedWarnings.add(w);
                }
            }
            @SuppressWarnings("unchecked")
            List<String> existing = (List<String>) toolResults.computeIfAbsent("warnings", k -> new ArrayList<String>());
            for (String w : toolWarnings) {
                if (w != null && !w.isBlank() && !existing.contains(w)) {
                    existing.add(w);
                }
            }
        }
    }

    /**
     * Thực thi một lệnh gọi công cụ trong ranh giới timeout và ghi nhận cảnh báo.
     */
    private <T> T executeWithTimeout(Callable<T> task, AcademicCapability capability, List<String> warnings) {
        // Kiểm tra độ sẵn sàng trước khi gọi
        if (!toolAdapter.isCapabilityReady(capability)) {
            String notReadyWarning = (capability == AcademicCapability.RECONCILE_STUDY_PLAN)
                    ? "TOOL_UNAVAILABLE: Capability reconcileStudyPlan is not currently exposed in ToolAdapter"
                    : "TOOL_UNAVAILABLE: Capability " + capability.name() + " is not ready in AcademicFacade";
            if (!warnings.contains(notReadyWarning)) {
                warnings.add(notReadyWarning);
            }
            return null;
        }

        Future<T> future = executorService.submit(task);
        try {
            return future.get(toolTimeoutMs, TimeUnit.MILLISECONDS);
        } catch (TimeoutException te) {
            future.cancel(true);
            String timeoutWarning = "TOOL_TIMEOUT: Academic tool call exceeded deadline (" + toolTimeoutMs + "ms)";
            if (!warnings.contains(timeoutWarning)) {
                warnings.add(timeoutWarning);
            }
            return null;
        } catch (ExecutionException ee) {
            Throwable cause = ee.getCause();
            if (cause instanceof ToolNotReadyException tnre) {
                String notReadyWarning = "TOOL_UNAVAILABLE: " + tnre.getMessage();
                if (!warnings.contains(notReadyWarning)) {
                    warnings.add(notReadyWarning);
                }
                return null;
            }
            String errorWarning = "TOOL_ERROR: " + (cause != null ? cause.getMessage() : "Unknown error");
            if (!warnings.contains(errorWarning)) {
                warnings.add(errorWarning);
            }
            return null;
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            warnings.add("TOOL_ERROR: Execution interrupted");
            return null;
        }
    }
}
