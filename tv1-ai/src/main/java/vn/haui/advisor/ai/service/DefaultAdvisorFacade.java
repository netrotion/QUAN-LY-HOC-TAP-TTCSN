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
        ParsedUserIntent userIntent = intentClassifier.classify(userMessage, history);
        boolean isTranscriptMissing = context.getStudentId() != null &&
                (context.getStudentId().contains("ANONYMOUS") || "REV-0".equals(context.getDataRevision()) || "REV-EMPTY".equals(context.getDataRevision()));
        if (isTranscriptMissing && userIntent.getCategory() != ParsedUserIntent.ScenarioCategory.REGULATION) {
            userIntent = ParsedUserIntent.builder()
                    .category(userIntent.getCategory())
                    .targetCpa(userIntent.getTargetCpa())
                    .targetSemester(userIntent.getTargetSemester())
                    .courseCode(userIntent.getCourseCode())
                    .isTranscriptMissing(true)
                    .build();
        }

        // 5. Truy xuất RAG và neo chứng cứ quy chế
        GroundedContext groundedContext = null;
        List<String> combinedWarnings = new ArrayList<>();
        if (ragAdvisorService != null) {
            groundedContext = ragAdvisorService.retrieveAndGround(userMessage, 5, 0.35);
            combinedWarnings.addAll(groundedContext.getWarnings());
        }

        // 6. Điều phối công cụ học vụ (Academic Tool Calling với Budget & Timeout)
        Map<String, Object> toolResults = new HashMap<>();
        executeAcademicTools(userMessage, context, userIntent, toolResults, combinedWarnings);

        // 7. Đóng gói Input và gọi AdvisorModel (Mock hoặc Live)
        AdvisorModelInput modelInput = new AdvisorModelInput(
                userMessage,
                context,
                toolResults,
                groundedContext,
                history,
                userIntent
        );

        AdvisorModelOutput rawModelOutput = advisorModel.generate(modelInput);

        // 8. Hậu kiểm định neo nguồn và chuẩn hóa phản hồi (Response Grounding Validation)
        AdvisorModelOutput validatedOutput = responseGroundingValidator.validate(rawModelOutput, groundedContext, toolResults);

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
            } catch (Exception ignored) {
                // Lỗi lưu trữ không làm gãy luồng phản hồi trực tiếp cho người dùng
            }
        }

        return response;
    }

    /**
     * Điều phối thực thi các công cụ học vụ dựa trên ý định đã phân tích.
     */
    private void executeAcademicTools(String userMessage,
                                      TrustedStudentContext context,
                                      ParsedUserIntent userIntent,
                                      Map<String, Object> toolResults,
                                      List<String> combinedWarnings) {
        // Kiểm tra trường hợp thiếu bảng điểm
        if (userIntent.isTranscriptMissing()) {
            if (!combinedWarnings.contains("TRANSCRIPT_REQUIRED")) {
                combinedWarnings.add("TRANSCRIPT_REQUIRED");
            }
            return;
        }

        // Kiểm tra trường hợp cần làm rõ tham số học kỳ khi học vượt
        if (userIntent.isClarificationNeeded()) {
            if (userIntent.getClarificationReason() != null && !combinedWarnings.contains(userIntent.getClarificationReason())) {
                combinedWarnings.add(userIntent.getClarificationReason());
            }
            return;
        }

        // Kiểm tra trường hợp đồng bộ kế hoạch học tập (Reconcile)
        String lowerMsg = userMessage != null ? userMessage.toLowerCase() : "";
        if (lowerMsg.contains("đồng bộ") || lowerMsg.contains("reconcile")) {
            ReconcileStudyPlanResponse recResp = executeWithTimeout(
                    () -> toolAdapter.reconcileStudyPlan(context, "PLAN-CURRENT", "2024_1", 1),
                    AcademicCapability.RECONCILE_STUDY_PLAN,
                    combinedWarnings
            );
            if (recResp != null) {
                toolResults.put("reconcileStudyPlan", recResp);
                collectToolWarnings(recResp, toolResults, combinedWarnings);
            } else {
                toolResults.put("toolUnavailable", true);
            }
            return;
        }

        ParsedUserIntent.ScenarioCategory category = userIntent.getCategory();
        int toolCallsExecuted = 0;

        switch (category) {
            case DEBT_COURSES -> {
                // 1. getAcademicStatus
                if (toolCallsExecuted < TOOL_EXECUTION_BUDGET) {
                    AcademicStatusResponse status = executeWithTimeout(
                            () -> toolAdapter.getAcademicStatus(context),
                            AcademicCapability.GET_ACADEMIC_STATUS,
                            combinedWarnings
                    );
                    if (status != null) {
                        toolResults.put("academicStatus", status);
                        collectToolWarnings(status, toolResults, combinedWarnings);
                        toolCallsExecuted++;
                    }
                }
                // 2. checkCourseEligibility (nếu có mã học phần)
                if (userIntent.getCourseCode() != null && toolCallsExecuted < TOOL_EXECUTION_BUDGET) {
                    CourseEligibilityResponse elig = executeWithTimeout(
                            () -> toolAdapter.checkCourseEligibility(context, userIntent.getCourseCode(), userIntent.getTargetSemester() != null ? userIntent.getTargetSemester() : "2024_2"),
                            AcademicCapability.CHECK_COURSE_ELIGIBILITY,
                            combinedWarnings
                    );
                    if (elig != null) {
                        toolResults.put("courseEligibility", elig);
                        collectToolWarnings(elig, toolResults, combinedWarnings);
                        toolCallsExecuted++;
                    }
                }
            }
            case STUDY_PLAN -> {
                // 1. getAcademicStatus
                if (toolCallsExecuted < TOOL_EXECUTION_BUDGET) {
                    AcademicStatusResponse status = executeWithTimeout(
                            () -> toolAdapter.getAcademicStatus(context),
                            AcademicCapability.GET_ACADEMIC_STATUS,
                            combinedWarnings
                    );
                    if (status != null) {
                        toolResults.put("academicStatus", status);
                        collectToolWarnings(status, toolResults, combinedWarnings);
                        toolCallsExecuted++;
                    }
                }
                // 2. generateStudyPlan
                if (toolCallsExecuted < TOOL_EXECUTION_BUDGET) {
                    String targetSemester = userIntent.getTargetSemester() != null ? userIntent.getTargetSemester() : "2025_2";
                    BigDecimal targetCpa = userIntent.getTargetCpa() != null ? userIntent.getTargetCpa() : new BigDecimal("3.0");
                    int maxCredits = userIntent.getMaxCredits() != null ? userIntent.getMaxCredits() : 18;
                    boolean summer = Boolean.TRUE.equals(userIntent.getIncludeSummer());

                    GenerateStudyPlanResponse plan = executeWithTimeout(
                            () -> toolAdapter.generateStudyPlan(context, targetSemester, targetCpa, maxCredits, summer, null),
                            AcademicCapability.GENERATE_STUDY_PLAN,
                            combinedWarnings
                    );
                    if (plan != null) {
                        toolResults.put("studyPlan", plan);
                        collectToolWarnings(plan, toolResults, combinedWarnings);
                        if (plan.getSemesters() != null && !plan.getSemesters().isEmpty()) {
                            ChatPlanProposal proposal = new ChatPlanProposal(
                                    plan.getProposalId(),
                                    "Đề xuất kế hoạch học tập mục tiêu CPA " + targetCpa.toPlainString(),
                                    plan.getSemesters(),
                                    plan.getProjectedCpa() != null ? plan.getProjectedCpa() : targetCpa
                            );
                            toolResults.put("planProposal", proposal);
                        }
                        toolCallsExecuted++;
                    }
                }
            }
            case ACCELERATED_STUDY -> {
                // Đã có học kỳ mục tiêu -> sinh và thẩm định kế hoạch
                if (toolCallsExecuted < TOOL_EXECUTION_BUDGET) {
                    String targetSemester = userIntent.getTargetSemester() != null ? userIntent.getTargetSemester() : "2026_1";
                    BigDecimal targetCpa = userIntent.getTargetCpa() != null ? userIntent.getTargetCpa() : new BigDecimal("3.2");
                    int maxCredits = userIntent.getMaxCredits() != null ? userIntent.getMaxCredits() : 22;

                    GenerateStudyPlanResponse plan = executeWithTimeout(
                            () -> toolAdapter.generateStudyPlan(context, targetSemester, targetCpa, maxCredits, true, null),
                            AcademicCapability.GENERATE_STUDY_PLAN,
                            combinedWarnings
                    );
                    if (plan != null) {
                        toolResults.put("studyPlan", plan);
                        collectToolWarnings(plan, toolResults, combinedWarnings);
                        if (plan.getSemesters() != null && !plan.getSemesters().isEmpty()) {
                            ChatPlanProposal proposal = new ChatPlanProposal(
                                    plan.getProposalId(),
                                    "Đề xuất lộ trình học vượt tốt nghiệp tại học kỳ " + targetSemester,
                                    plan.getSemesters(),
                                    plan.getProjectedCpa() != null ? plan.getProjectedCpa() : targetCpa
                            );
                            toolResults.put("planProposal", proposal);
                        }
                        toolCallsExecuted++;
                    }
                }
                if (toolCallsExecuted < TOOL_EXECUTION_BUDGET) {
                    ValidateStudyPlanRequest valReq = new ValidateStudyPlanRequest();
                    valReq.setStudentId(context.getStudentId());
                    valReq.setDataRevision(context.getDataRevision());
                    ValidateStudyPlanResponse valResp = executeWithTimeout(
                            () -> toolAdapter.validateStudyPlan(context, valReq),
                            AcademicCapability.VALIDATE_STUDY_PLAN,
                            combinedWarnings
                    );
                    if (valResp != null) {
                        toolResults.put("validateStudyPlan", valResp);
                        collectToolWarnings(valResp, toolResults, combinedWarnings);
                        toolCallsExecuted++;
                    }
                }
            }
            case WHAT_IF -> {
                if (toolCallsExecuted < TOOL_EXECUTION_BUDGET) {
                    List<SimulatedCourseGrade> simGrades = userIntent.getSimulatedGrades() != null ?
                            userIntent.getSimulatedGrades() :
                            List.of(new SimulatedCourseGrade("GEN_SIM", 18, "B+", new BigDecimal("3.5")));

                    SimulateGradesResponse simResp = executeWithTimeout(
                            () -> toolAdapter.simulateGrades(context, simGrades),
                            AcademicCapability.SIMULATE_GRADES,
                            combinedWarnings
                    );
                    if (simResp != null) {
                        toolResults.put("simulateGrades", simResp);
                        collectToolWarnings(simResp, toolResults, combinedWarnings);
                        toolCallsExecuted++;
                    }
                }
            }
            case RETAKE_IMPROVEMENT -> {
                if (toolCallsExecuted < TOOL_EXECUTION_BUDGET) {
                    AcademicStatusResponse status = executeWithTimeout(
                            () -> toolAdapter.getAcademicStatus(context),
                            AcademicCapability.GET_ACADEMIC_STATUS,
                            combinedWarnings
                    );
                    if (status != null) {
                        toolResults.put("academicStatus", status);
                        collectToolWarnings(status, toolResults, combinedWarnings);
                        toolCallsExecuted++;
                    }
                }
                if (toolCallsExecuted < TOOL_EXECUTION_BUDGET) {
                    int maxSuggestions = userIntent.getRetakeSuggestions() != null ? userIntent.getRetakeSuggestions() : 5;
                    RankRetakeCoursesResponse rankResp = executeWithTimeout(
                            () -> toolAdapter.rankRetakeCourses(context, maxSuggestions),
                            AcademicCapability.RANK_RETAKE_COURSES,
                            combinedWarnings
                    );
                    if (rankResp != null) {
                        toolResults.put("rankRetakeCourses", rankResp);
                        collectToolWarnings(rankResp, toolResults, combinedWarnings);
                        toolCallsExecuted++;
                    }
                }
            }
            case GRADUATION_AUDIT -> {
                if (toolCallsExecuted < TOOL_EXECUTION_BUDGET) {
                    GraduationAuditResponse auditResp = executeWithTimeout(
                            () -> toolAdapter.runGraduationAudit(context),
                            AcademicCapability.RUN_GRADUATION_AUDIT,
                            combinedWarnings
                    );
                    if (auditResp != null) {
                        toolResults.put("graduationAudit", auditResp);
                        collectToolWarnings(auditResp, toolResults, combinedWarnings);
                        toolCallsExecuted++;
                    }
                }
            }
            case GOAL_CHANGE -> {
                BigDecimal targetCpa = userIntent.getTargetCpa() != null ? userIntent.getTargetCpa() : new BigDecimal("3.5");
                String targetSemester = userIntent.getTargetSemester() != null ? userIntent.getTargetSemester() : "2026_1";

                if (toolCallsExecuted < TOOL_EXECUTION_BUDGET) {
                    CalculateTargetGradesResponse targetResp = executeWithTimeout(
                            () -> toolAdapter.calculateTargetGrades(context, targetCpa, targetSemester),
                            AcademicCapability.CALCULATE_TARGET_GRADES,
                            combinedWarnings
                    );
                    if (targetResp != null) {
                        toolResults.put("calculateTargetGrades", targetResp);
                        collectToolWarnings(targetResp, toolResults, combinedWarnings);
                        toolCallsExecuted++;
                    }
                }
                if (toolCallsExecuted < TOOL_EXECUTION_BUDGET) {
                    GenerateStudyPlanResponse plan = executeWithTimeout(
                            () -> toolAdapter.generateStudyPlan(context, targetSemester, targetCpa, 18, false, null),
                            AcademicCapability.GENERATE_STUDY_PLAN,
                            combinedWarnings
                    );
                    if (plan != null) {
                        toolResults.put("studyPlan", plan);
                        collectToolWarnings(plan, toolResults, combinedWarnings);
                        if (plan.getSemesters() != null && !plan.getSemesters().isEmpty()) {
                            ChatPlanProposal proposal = new ChatPlanProposal(
                                    plan.getProposalId(),
                                    "Kế hoạch học tập điều chỉnh theo mục tiêu CPA " + targetCpa.toPlainString(),
                                    plan.getSemesters(),
                                    plan.getProjectedCpa() != null ? plan.getProjectedCpa() : targetCpa
                            );
                            toolResults.put("planProposal", proposal);
                        }
                        toolCallsExecuted++;
                    }
                }
            }
            case GENERAL -> {
                // Fallback nếu có từ khóa lộ trình/tình trạng mà chưa bắt được ở intent
                String msg = userMessage.toLowerCase();
                if (msg.contains("lộ trình") || msg.contains("kế hoạch")) {
                    GenerateStudyPlanResponse plan = executeWithTimeout(
                            () -> toolAdapter.generateStudyPlan(context, "2025_2", new BigDecimal("3.0"), 18, false, null),
                            AcademicCapability.GENERATE_STUDY_PLAN,
                            combinedWarnings
                    );
                    if (plan != null) {
                        collectToolWarnings(plan, toolResults, combinedWarnings);
                        if (plan.getSemesters() != null && !plan.getSemesters().isEmpty()) {
                            toolResults.put("planProposal", new ChatPlanProposal(
                                    plan.getProposalId(),
                                    "Đề xuất kế hoạch học tập",
                                    plan.getSemesters(),
                                    plan.getProjectedCpa()
                            ));
                        }
                    }
                } else if (msg.contains("tình trạng") || msg.contains("điểm")) {
                    AcademicStatusResponse status = executeWithTimeout(
                            () -> toolAdapter.getAcademicStatus(context),
                            AcademicCapability.GET_ACADEMIC_STATUS,
                            combinedWarnings
                    );
                    if (status != null) {
                        toolResults.put("academicStatus", status);
                        collectToolWarnings(status, toolResults, combinedWarnings);
                    }
                }
            }
            case REGULATION -> {
                // Không gọi công cụ cá nhân cho câu hỏi thuần quy chế
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
