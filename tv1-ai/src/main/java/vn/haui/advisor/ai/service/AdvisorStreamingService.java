package vn.haui.advisor.ai.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import vn.haui.advisor.ai.conversation.ChatMessageHistoryItem;
import vn.haui.advisor.ai.conversation.ConversationHistoryManager;
import vn.haui.advisor.ai.grounding.ResponseGroundingValidator;
import vn.haui.advisor.ai.intent.IntentClassifier;
import vn.haui.advisor.ai.intent.ParsedUserIntent;
import vn.haui.advisor.ai.model.*;
import vn.haui.advisor.ai.rag.service.GroundedContext;
import vn.haui.advisor.ai.rag.service.RagAdvisorService;
import vn.haui.advisor.ai.telemetry.AiMetricsCollector;
import vn.haui.advisor.ai.tools.GeminiToolDeclarations;
import vn.haui.advisor.ai.tools.ToolAdapter;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.stream.ChatStreamEvent;

import java.math.BigDecimal;
import java.util.*;
import java.util.function.Consumer;

/**
 * Dịch vụ điều phối Server-Sent Events (SSE) Streaming đa pha cho Trợ lý Cố vấn Học vụ.
 * Đảm bảo TTFT < 800ms với chu kỳ sự kiện:
 * STATUS -> TOOL_CALL -> TOOL_RESULT -> CITATION -> CHUNK -> DONE.
 */
@Service
public class AdvisorStreamingService {

    private static final Logger log = LoggerFactory.getLogger(AdvisorStreamingService.class);
    private static final int DEFAULT_MAX_HISTORY_TURNS = 10;
    private static final int TOOL_EXECUTION_BUDGET = 3;

    private final AdvisorModel advisorModel;
    private final ToolAdapter toolAdapter;
    private final RagAdvisorService ragAdvisorService;
    private final ConversationHistoryManager conversationHistoryManager;
    private final ResponseGroundingValidator responseGroundingValidator;
    private final AiMetricsCollector metricsCollector;

    public AdvisorStreamingService(
            AdvisorModel advisorModel,
            ToolAdapter toolAdapter,
            RagAdvisorService ragAdvisorService,
            ConversationHistoryManager conversationHistoryManager,
            ResponseGroundingValidator responseGroundingValidator,
            AiMetricsCollector metricsCollector
    ) {
        this.advisorModel = Objects.requireNonNull(advisorModel, "advisorModel must not be null");
        this.toolAdapter = Objects.requireNonNull(toolAdapter, "toolAdapter must not be null");
        this.ragAdvisorService = ragAdvisorService;
        this.conversationHistoryManager = conversationHistoryManager != null ? conversationHistoryManager : new ConversationHistoryManager();
        this.responseGroundingValidator = responseGroundingValidator != null ? responseGroundingValidator : new ResponseGroundingValidator();
        this.metricsCollector = metricsCollector != null ? metricsCollector : new AiMetricsCollector();
    }

    public void streamChat(
            ChatRequest request,
            TrustedStudentContext context,
            Consumer<ChatStreamEvent> eventConsumer
    ) {
        Objects.requireNonNull(eventConsumer, "eventConsumer must not be null");

        // 1. Kiểm tra validation
        if (request == null || request.getMessage() == null || request.getMessage().trim().isEmpty()) {
            eventConsumer.accept(ChatStreamEvent.error("VALIDATION_ERROR", "Nội dung câu hỏi không được để trống.", false));
            return;
        }

        if (context == null || context.getStudentId() == null || context.getStudentId().trim().isEmpty()) {
            eventConsumer.accept(ChatStreamEvent.error("SECURITY_ERROR", "Không thể xác định danh tính sinh viên từ phiên đăng nhập hợp lệ.", false));
            return;
        }

        String userMessage = request.getMessage().trim();
        String conversationId = request.getConversationId();
        String studentId = context.getStudentId();

        long totalStart = System.currentTimeMillis();
        long ragMs = 0;
        long toolMs = 0;
        long turn1Ms = 0;
        long turn2Ms = 0;
        long promptTokens = 0;
        long genTokens = 0;
        String category = "GENERAL";

        // 2. Phát sự kiện trạng thái khởi tạo ngay lập tức (TTFT milestone)
        eventConsumer.accept(ChatStreamEvent.status("INITIALIZING", "Đang phân tích yêu cầu..."));

        // 3. Tải lịch sử hội thoại
        List<ChatMessageHistoryItem> history = Collections.emptyList();
        if (conversationId != null && !conversationId.trim().isEmpty()) {
            try {
                history = conversationHistoryManager.loadHistory(conversationId, studentId, DEFAULT_MAX_HISTORY_TURNS);
            } catch (SecurityException se) {
                eventConsumer.accept(ChatStreamEvent.error("SECURITY_ERROR", "Từ chối quyền truy cập hội thoại không thuộc sở hữu của bạn.", false));
                return;
            } catch (Exception ignored) {
                history = Collections.emptyList();
            }
        }

        GroundedContext groundedContext = null;
        List<String> combinedWarnings = new ArrayList<>();
        Map<String, Object> toolResults = new LinkedHashMap<>();
        ChatPlanProposal planProposal = null;
        String finalAnswerText;
        List<ChatSourceItem> citations = List.of();
        List<ChatActionItem> actions = List.of();

        if (advisorModel instanceof LiveAdvisorModel liveModel) {
            try {
                eventConsumer.accept(ChatStreamEvent.status("PLANNING", "Đang phân tích công cụ và quy chế..."));

                long t1Start = System.currentTimeMillis();
                LiveAdvisorModel.GeminiTurnResult turnResult = liveModel.inspectTurn(
                        userMessage, history, GeminiToolDeclarations.getToolDeclarations()
                );
                turn1Ms = Math.max(turnResult.latencyMs(), System.currentTimeMillis() - t1Start);
                promptTokens += turnResult.promptTokens();
                genTokens += turnResult.candidatesTokens();

                if (turnResult.hasToolCalls()) {
                    category = "TOOL_USE";
                    int count = 0;
                    for (GeminiToolCall call : turnResult.toolCalls()) {
                        if (count++ >= TOOL_EXECUTION_BUDGET) break;
                        String toolName = call.name();
                        Map<String, Object> args = call.arguments();

                        eventConsumer.accept(ChatStreamEvent.toolCall(toolName, args));

                        if ("search_regulations".equals(toolName)) {
                            category = "REGULATION";
                            eventConsumer.accept(ChatStreamEvent.status("SEARCHING_POLICY", "Đang tra cứu quy chế HaUI..."));
                            String query = args.getOrDefault("query", userMessage).toString();
                            if (ragAdvisorService != null) {
                                long ragStart = System.currentTimeMillis();
                                groundedContext = ragAdvisorService.retrieveAndGround(query, 5, 0.35);
                                long elapsed = System.currentTimeMillis() - ragStart;
                                ragMs += elapsed;
                                combinedWarnings.addAll(groundedContext.getWarnings());
                                toolResults.put("search_regulations", groundedContext.getFormattedPromptContext());
                                metricsCollector.recordToolExecution("search_regulations", elapsed);

                                if (groundedContext.hasEvidence()) {
                                    citations = groundedContext.getCitations();
                                    eventConsumer.accept(ChatStreamEvent.citation(citations));
                                }
                            }
                        } else {
                            eventConsumer.accept(ChatStreamEvent.status("EXECUTING_TOOL", "Đang thực thi công cụ học vụ " + toolName + "..."));
                            long toolStart = System.currentTimeMillis();
                            dispatchAcademicToolByName(context, toolName, args, toolResults, combinedWarnings);
                            long elapsed = System.currentTimeMillis() - toolStart;
                            toolMs += elapsed;
                            metricsCollector.recordToolExecution(toolName, elapsed);

                            if (toolResults.get("planProposal") instanceof ChatPlanProposal p) {
                                planProposal = p;
                                eventConsumer.accept(ChatStreamEvent.toolResult(toolName, "Đã tính toán phương án kế hoạch học tập.", p));
                            } else {
                                eventConsumer.accept(ChatStreamEvent.toolResult(toolName, "Hoàn tất phân tích dữ liệu học vụ.", null));
                            }
                        }
                    }

                    eventConsumer.accept(ChatStreamEvent.status("GENERATING", "Đang tạo câu trả lời..."));

                    long t2Start = System.currentTimeMillis();
                    LiveAdvisorModel.ModelExecutionResult streamResult = liveModel.streamTurn(
                            userMessage,
                            history,
                            turnResult.toolCalls(),
                            turnResult.rawModelParts(),
                            toolResults,
                            chunk -> eventConsumer.accept(ChatStreamEvent.chunk(chunk))
                    );
                    turn2Ms = Math.max(streamResult.latencyMs(), System.currentTimeMillis() - t2Start);
                    promptTokens += streamResult.promptTokens();
                    genTokens += streamResult.candidatesTokens();
                    finalAnswerText = streamResult.answer();

                } else if (turnResult.directText() != null && !turnResult.directText().isBlank()) {
                    category = "DIRECT_ANSWER";
                    eventConsumer.accept(ChatStreamEvent.status("GENERATING", "Đang gửi phản hồi..."));
                    finalAnswerText = turnResult.directText();
                    // Stream direct answer chunks
                    String[] words = finalAnswerText.split("(?<=\\s)|(?=\\s)");
                    for (String w : words) {
                        eventConsumer.accept(ChatStreamEvent.chunk(w));
                    }
                } else {
                    finalAnswerText = "Xin lỗi, mình chưa tìm thấy thông tin phù hợp cho câu hỏi của bạn.";
                    eventConsumer.accept(ChatStreamEvent.chunk(finalAnswerText));
                }

            } catch (Exception ex) {
                log.warn("streaming_model_failed error={}", ex.getMessage());
                eventConsumer.accept(ChatStreamEvent.error("MODEL_PROVIDER_ERROR", "Dịch vụ AI trực tuyến gặp sự cố gián đoạn tạm thời. Vui lòng thử lại sau.", true));
                return;
            }
        } else {
            // MockAdvisorModel or non-live fallback
            eventConsumer.accept(ChatStreamEvent.status("GENERATING", "Đang xử lý câu hỏi..."));
            AdvisorModelInput modelInput = new AdvisorModelInput(
                    userMessage, context, toolResults, groundedContext, history, null
            );
            AdvisorModelOutput rawOutput = advisorModel.generate(modelInput);
            finalAnswerText = rawOutput.getAnswer();
            planProposal = rawOutput.getPlanProposal();
            citations = rawOutput.getSources();
            actions = rawOutput.getActions();

            if (citations != null && !citations.isEmpty()) {
                eventConsumer.accept(ChatStreamEvent.citation(citations));
            }
            if (planProposal != null) {
                eventConsumer.accept(ChatStreamEvent.toolResult("generate_study_plan", "Đã lập phương án kế hoạch học tập.", planProposal));
            }

            if (finalAnswerText != null) {
                String[] words = finalAnswerText.split("(?<=\\s)|(?=\\s)");
                for (String w : words) {
                    eventConsumer.accept(ChatStreamEvent.chunk(w));
                }
            }
            promptTokens = Math.max(1, userMessage.length() / 4 + 200);
            genTokens = Math.max(1, (finalAnswerText != null ? finalAnswerText.length() : 0) / 4);
        }

        // Hậu kiểm định Grounding & Safety
        AdvisorModelOutput modelOutput = new AdvisorModelOutput(
                finalAnswerText, citations, actions, planProposal, combinedWarnings
        );
        AdvisorModelInput modelInput = new AdvisorModelInput(
                userMessage, context, toolResults, groundedContext, history, null
        );
        AdvisorModelOutput validated = responseGroundingValidator.validate(modelOutput, modelInput);

        for (String w : validated.getWarnings()) {
            if (!combinedWarnings.contains(w)) {
                combinedWarnings.add(w);
            }
            if (w.contains("GUARDRAIL") || w.contains("GROUNDING") || w.contains("PII")) {
                metricsCollector.recordGuardrailViolation(w);
            }
        }

        long totalMs = Math.max(1, System.currentTimeMillis() - totalStart);
        Map<String, Object> metrics = new LinkedHashMap<>();
        metrics.put("promptTokens", promptTokens);
        metrics.put("generationTokens", genTokens);
        metrics.put("totalTokens", promptTokens + genTokens);
        metrics.put("totalLatencyMs", totalMs);
        metrics.put("ragLatencyMs", ragMs);
        metrics.put("toolLatencyMs", toolMs);

        // Phát sự kiện DONE
        eventConsumer.accept(ChatStreamEvent.done(
                validated.getAnswer(),
                validated.getSources(),
                validated.getActions(),
                validated.getPlanProposal(),
                combinedWarnings,
                metrics
        ));

        // Ghi nhận đo lường streaming APM
        metricsCollector.recordTurn(
                true,
                category,
                promptTokens,
                genTokens,
                ragMs,
                toolMs,
                turn1Ms,
                turn2Ms,
                totalMs
        );

        // Lưu trữ lịch sử hội thoại bất đồng bộ
        if (conversationId != null && !conversationId.trim().isEmpty()) {
            try {
                ChatMessageHistoryItem userHistoryItem = ChatMessageHistoryItem.ofUser(userMessage);
                ChatMessageHistoryItem assistantHistoryItem = ChatMessageHistoryItem.ofAssistant(
                        validated.getAnswer(),
                        validated.getSources(),
                        validated.getActions(),
                        validated.getPlanProposal() != null ? validated.getPlanProposal().getProposalId() : null,
                        combinedWarnings
                );
                conversationHistoryManager.saveTurn(conversationId, studentId, userHistoryItem, assistantHistoryItem, 900_000);
            } catch (Exception ex) {
                log.warn("failed_to_save_streaming_conversation_turn error={}", ex.getMessage());
            }
        }
    }

    private void dispatchAcademicToolByName(
            TrustedStudentContext context,
            String toolName,
            Map<String, Object> args,
            Map<String, Object> toolResults,
            List<String> warnings
    ) {
        if (toolAdapter == null) return;
        try {
            switch (toolName) {
                case "run_graduation_audit" -> {
                    GraduationAuditResponse audit = toolAdapter.runGraduationAudit(context);
                    if (audit != null) toolResults.put("run_graduation_audit", audit);
                }
                case "get_academic_status" -> {
                    AcademicStatusResponse status = toolAdapter.getAcademicStatus(context);
                    if (status != null) toolResults.put("get_academic_status", status);
                }
                case "check_course_eligibility" -> {
                    String courseCode = (String) args.get("course_code");
                    String semester = (String) args.get("semester");
                    if (courseCode != null && !courseCode.isBlank()) {
                        CourseEligibilityResponse eligibility = toolAdapter.checkCourseEligibility(context, courseCode.trim().toUpperCase(Locale.ROOT), semester);
                        if (eligibility != null) toolResults.put("check_course_eligibility", eligibility);
                    }
                }
                case "rank_retake_courses" -> {
                    Integer maxSuggestions = args.get("max_suggestions") != null
                            ? Integer.valueOf(args.get("max_suggestions").toString()) : 3;
                    RankRetakeCoursesResponse rank = toolAdapter.rankRetakeCourses(context, maxSuggestions);
                    if (rank != null) toolResults.put("rank_retake_courses", rank);
                }
                case "simulate_grades" -> {
                    List<SimulatedCourseGrade> simList = new ArrayList<>();
                    if (args.get("simulations") instanceof List<?> list) {
                        for (Object o : list) {
                            if (o instanceof Map<?, ?> m) {
                                String code = m.get("course_code") != null ? m.get("course_code").toString() : null;
                                String grade = m.get("expected_grade") != null ? m.get("expected_grade").toString() : null;
                                if (code != null && grade != null) {
                                    BigDecimal points = gradeToPoints(grade);
                                    simList.add(new SimulatedCourseGrade(code.trim().toUpperCase(Locale.ROOT), 3, grade.trim().toUpperCase(Locale.ROOT), points));
                                }
                            }
                        }
                    }
                    if (!simList.isEmpty()) {
                        SimulateGradesResponse sim = toolAdapter.simulateGrades(context, simList);
                        if (sim != null) toolResults.put("simulate_grades", sim);
                    }
                }
                case "generate_study_plan" -> {
                    String targetSemester = (String) args.get("target_semester");
                    Integer maxCredits = args.get("max_credits") != null
                            ? Integer.valueOf(args.get("max_credits").toString()) : 18;
                    BigDecimal targetCpa = args.get("target_cpa") != null
                            ? new BigDecimal(args.get("target_cpa").toString()) : null;
                    GenerateStudyPlanResponse plan = toolAdapter.generateStudyPlan(context, targetSemester, targetCpa, maxCredits, false, List.of());
                    if (plan != null) {
                        toolResults.put("generate_study_plan", plan);
                        if (plan.getSemesters() != null && !plan.getSemesters().isEmpty()) {
                            String label = targetCpa == null ? "Đề xuất kế hoạch học tập" : "Kế hoạch cải thiện CPA";
                            ChatPlanProposal prop = new ChatPlanProposal(
                                    plan.getProposalId(),
                                    label,
                                    plan.getSemesters(),
                                    plan.getProjectedCpa()
                            );
                            toolResults.put("planProposal", prop);
                        }
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("tool_dispatch_failed tool={} error={}", toolName, ex.getMessage());
            warnings.add("TOOL_EXECUTION_ERROR: " + toolName);
        }
    }

    private static BigDecimal gradeToPoints(String grade) {
        if (grade == null) return BigDecimal.ZERO;
        return switch (grade.trim().toUpperCase(Locale.ROOT)) {
            case "A" -> BigDecimal.valueOf(4.0);
            case "B+" -> BigDecimal.valueOf(3.5);
            case "B" -> BigDecimal.valueOf(3.0);
            case "C+" -> BigDecimal.valueOf(2.5);
            case "C" -> BigDecimal.valueOf(2.0);
            case "D+" -> BigDecimal.valueOf(1.5);
            case "D" -> BigDecimal.valueOf(1.0);
            default -> BigDecimal.ZERO;
        };
    }
}
