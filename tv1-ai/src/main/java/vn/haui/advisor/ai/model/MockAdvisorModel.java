package vn.haui.advisor.ai.model;

import vn.haui.advisor.ai.grounding.ResponseGroundingValidator;
import vn.haui.advisor.ai.intent.ParsedUserIntent;
import vn.haui.advisor.ai.intent.ParsedUserIntent.ScenarioCategory;
import vn.haui.advisor.ai.rag.model.RagChunk;
import vn.haui.advisor.ai.rag.service.GroundedContext;
import vn.haui.advisor.ai.rag.service.RagAdvisorService;
import vn.haui.advisor.contracts.dto.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Triển khai mock deterministic của AdvisorModel phục vụ phát triển cục bộ và kiểm thử tích hợp.
 * Xử lý đầy đủ 8 họ kịch bản chính và các trường hợp biên (Missing transcript, No evidence, Tool error)
 * dựa trên toolResults, groundedContext và userIntent, kết hợp cùng ResponseGroundingValidator.
 */
public class MockAdvisorModel implements AdvisorModel {

    private final RagAdvisorService ragAdvisorService;
    private final ResponseGroundingValidator validator;

    public MockAdvisorModel() {
        this(null, new ResponseGroundingValidator());
    }

    public MockAdvisorModel(RagAdvisorService ragAdvisorService) {
        this(ragAdvisorService, new ResponseGroundingValidator());
    }

    public MockAdvisorModel(RagAdvisorService ragAdvisorService, ResponseGroundingValidator validator) {
        this.ragAdvisorService = ragAdvisorService;
        this.validator = validator != null ? validator : new ResponseGroundingValidator();
    }

    @Override
    public AdvisorModelOutput generate(AdvisorModelInput input) {
        String rawMsg = input.getUserMessage() != null ? input.getUserMessage().trim() : "";
        String userMsg = rawMsg.toLowerCase();
        TrustedStudentContext context = input.getStudentContext();
        Map<String, Object> toolResults = input.getToolResults();
        GroundedContext groundedContext = input.getGroundedContext();
        ParsedUserIntent userIntent = input.getUserIntent();

        String studentName = context != null && context.getFullName() != null ? context.getFullName() : "Sinh viên";
        String studentCode = context != null && context.getStudentCode() != null ? context.getStudentCode() : "Chưa xác định";

        GroundedContext effectiveGrounded = groundedContext;

        // ==========================================
        // 1. TOOL_ERROR / TOOL_UNAVAILABLE SCENARIO
        // ==========================================
        boolean hasUsefulToolResult = toolResults.keySet().stream()
                .anyMatch(key -> !List.of("toolError", "toolUnavailable", "error", "warnings").contains(key));
        if (!hasUsefulToolResult && (toolResults.containsKey("toolError") || toolResults.containsKey("toolUnavailable") || toolResults.containsKey("error"))) {
            List<String> warnings = List.of("TOOL_UNAVAILABLE", "TOOL_UNAVAILABLE: Capability reconcileStudyPlan is not currently exposed in ToolAdapter");
            String answer = String.format(
                    "[MOCK_ADVISOR] Công cụ học vụ tạm thời không khả dụng hoặc gặp sự cố xử lý dữ liệu của sinh viên %s (%s). Yêu cầu chưa thể thực hiện hoặc dịch vụ tạm thời gián đoạn. Vui lòng thử lại sau hoặc liên hệ phòng đào tạo HaUI.",
                    studentName, studentCode
            );
            return validator.validate(new AdvisorModelOutput(answer, List.of(), List.of(), null, warnings), input);
        }

        // ==========================================
        // 1b. TOOL WARNINGS SCENARIO
        // ==========================================
        List<String> collectedWarnings = new ArrayList<>();
        if (toolResults.containsKey("warnings")) {
            Object rawWarnings = toolResults.get("warnings");
            if (rawWarnings instanceof List<?> list) {
                for (Object item : list) {
                    if (item != null) {
                        collectedWarnings.add(item.toString());
                    }
                }
            }
        }
        if (!collectedWarnings.isEmpty()) {
            String answer = String.format(
                    "[MOCK_ADVISOR] Cảnh báo học vụ đối với sinh viên %s (%s): %s. Vui lòng rà soát lại kết quả học tập.",
                    studentName, studentCode, String.join("; ", collectedWarnings)
            );
            List<ChatActionItem> actions = List.of(
                    new ChatActionItem("NAVIGATE", "Rà soát điều kiện học vụ", "/academic/audit", "{\"studentCode\":\"" + studentCode + "\"}")
            );
            return validator.validate(new AdvisorModelOutput(answer, List.of(), actions, null, collectedWarnings), input);
        }

        // ==========================================
        // 2. MISSING_TRANSCRIPT SCENARIO
        // ==========================================
        boolean isMissingTranscript = (userIntent != null && userIntent.isTranscriptMissing())
                || toolResults.containsKey("missingTranscript")
                || userMsg.contains("chưa có bảng điểm") || userMsg.contains("thiếu bảng điểm");
        if (isMissingTranscript) {
            List<String> warnings = List.of("TRANSCRIPT_REQUIRED", "TRANSCRIPT_REQUIRED: Student academic transcript is missing or incomplete");
            String answer = String.format(
                    "[MOCK_ADVISOR] Dữ liệu học vụ của sinh viên %s (%s) hiện chưa có thông tin bảng điểm. Vui lòng tải lên bảng điểm hoặc import bảng điểm để hệ thống tư vấn chính xác.",
                    studentName, studentCode
            );
            List<ChatActionItem> actions = List.of(
                    new ChatActionItem("OPEN_TRANSCRIPT_IMPORT", "Tải lên bảng điểm học tập", "/academic/import", "{}")
            );
            return validator.validate(new AdvisorModelOutput(answer, List.of(), actions, null, warnings), input);
        }
 
        // ==========================================
        // 2b. REGULATION SCENARIO (Ưu tiên khi intent được phân loại là REGULATION)
        // ==========================================
        if (userIntent != null && userIntent.getCategory() == ScenarioCategory.REGULATION) {
            if (effectiveGrounded != null && effectiveGrounded.hasEvidence() && !effectiveGrounded.getCitations().isEmpty()) {
                ChatSourceItem firstSource = effectiveGrounded.getCitations().getFirst();
                StringBuilder excerptBuilder = new StringBuilder();
                if (effectiveGrounded.getEvidenceChunks() != null) {
                    for (RagChunk chunk : effectiveGrounded.getEvidenceChunks()) {
                        if (chunk != null && firstSource.getSourceId().equalsIgnoreCase(chunk.getSourceId()) && chunk.getContent() != null && !chunk.getContent().isBlank()) {
                            if (!excerptBuilder.isEmpty()) {
                                excerptBuilder.append("\n\n");
                            }
                            excerptBuilder.append(chunk.getContent());
                        }
                    }
                }
                String excerpt = excerptBuilder.toString();
                if (excerpt.length() > 2500) {
                    excerpt = excerpt.substring(0, 2500) + "...";
                }

                String answer = String.format(
                        "[MOCK_ADVISOR] Xin chào %s (%s). Căn cứ theo quy định tại [%s] %s (%s):\n\n%s\n\nNội dung được trích xuất trực tiếp từ văn bản quy chế chính thức của HaUI.",
                        studentName, studentCode, firstSource.getSourceId(), firstSource.getTitle(),
                        firstSource.getSection() != null ? firstSource.getSection() : "Toàn văn",
                        excerpt
                );

                List<ChatActionItem> actions = List.of(
                        new ChatActionItem("NAVIGATE", "Tra cứu quy chế chi tiết", "/academic/rules", "{\"sourceId\":\"" + firstSource.getSourceId() + "\"}")
                );

                return validator.validate(new AdvisorModelOutput(answer, effectiveGrounded.getCitations(), actions, null, effectiveGrounded.getWarnings()), input);
            } else {
                List<String> warnings = new ArrayList<>(effectiveGrounded != null ? effectiveGrounded.getWarnings() : List.of());
                if (!warnings.contains("POLICY_SOURCE_UNAVAILABLE")) {
                    warnings.add("POLICY_SOURCE_UNAVAILABLE");
                }
                if (!warnings.contains("POLICY_SOURCE_UNAVAILABLE: No grounded evidence found in knowledge base")) {
                    warnings.add("POLICY_SOURCE_UNAVAILABLE: No grounded evidence found in knowledge base");
                }

                String answer = String.format(
                        "[MOCK_ADVISOR] Hệ thống trợ lý học vụ HaUI chưa có thông tin hoặc câu hỏi không nằm trong phạm vi quy chế học vụ hiện hành: \"%s\" của sinh viên %s (%s). Vui lòng liên hệ phòng Công tác sinh viên, Ban quản lý ký túc xá hoặc phòng đào tạo HaUI để được hỗ trợ.",
                        rawMsg, studentName, studentCode
                );

                return validator.validate(new AdvisorModelOutput(answer, List.of(), List.of(), null, warnings), input);
            }
        }

        // ==========================================
        // 3. ACCELERATED STUDY (CLARIFICATION NEEDED)
        // ==========================================
        boolean isAccelerated = (userIntent != null && userIntent.getCategory() == ScenarioCategory.ACCELERATED_STUDY)
                || userMsg.contains("học vượt") || userMsg.contains("tốt nghiệp sớm");
        if (isAccelerated) {
            boolean clarificationNeeded = (userIntent != null && userIntent.isClarificationNeeded())
                    || (userIntent != null && userIntent.getTargetSemester() == null && !toolResults.containsKey("planProposal"))
                    || (!userMsg.matches(".*(?:kỳ|học kỳ)\\s*\\d+.*") && !toolResults.containsKey("planProposal"));

            if (clarificationNeeded) {
                List<String> warnings = List.of("INCOMPLETE_TARGET", "INCOMPLETE_TARGET: Missing target graduation semester");
                String answer = String.format(
                        "[MOCK_ADVISOR] Bạn có nguyện vọng học vượt để tốt nghiệp sớm. Để lập kế hoạch chính xác cho sinh viên %s (%s), bạn dự kiến hoàn thành chương trình ở học kỳ nào (ví dụ: kỳ 7 hoặc kỳ hè)? Vui lòng cho biết kỳ đích hoặc mục tiêu tốt nghiệp sớm bao nhiêu kỳ.",
                        studentName, studentCode
                );
                return validator.validate(new AdvisorModelOutput(answer, List.of(), List.of(), null, warnings), input);
            } else {
                ChatPlanProposal proposal = toolResults.get("planProposal") instanceof ChatPlanProposal p ? p : null;
                String targetSem = userIntent != null && userIntent.getTargetSemester() != null ? userIntent.getTargetSemester() : "chưa xác định";
                String answer = String.format(
                        "[MOCK_ADVISOR] Kế hoạch học vượt cho mốc %s của sinh viên %s (%s) cần được xem xét theo kết quả Academic Tool; chưa thể khẳng định số tín chỉ hay kỳ hè chỉ từ yêu cầu này.",
                        targetSem, studentName, studentCode
                );
                List<ChatActionItem> actions = List.of(
                        new ChatActionItem("OPEN_PLANNER", "Xem kế hoạch học vượt", "/planner", "{}")
                );
                List<ChatSourceItem> sources = (effectiveGrounded != null && effectiveGrounded.hasEvidence()) ? effectiveGrounded.getCitations() : List.of();
                return validator.validate(new AdvisorModelOutput(answer, sources, actions, proposal, List.of()), input);
            }
        }

        // ==========================================
        // 4. GOAL_CHANGE SCENARIO
        // ==========================================
        boolean isGoalChange = (userIntent != null && userIntent.getCategory() == ScenarioCategory.GOAL_CHANGE)
                || userMsg.contains("đổi mục tiêu") || userMsg.contains("đổi thành");
        if (isGoalChange) {
            BigDecimal targetCpa = userIntent != null ? userIntent.getTargetCpa() : null;
            if (targetCpa == null) {
                return validator.validate(new AdvisorModelOutput("Bạn muốn đổi CPA mục tiêu thành bao nhiêu?",
                        List.of(), List.of(), null, List.of()), input);
            }
            String targetStr = targetCpa.toPlainString();
            String answer = "[MOCK_ADVISOR] Mục tiêu CPA bạn nêu là " + targetStr + ".";
            CalculateTargetGradesResponse calculation = toolResults.get("calculateTargetGrades") instanceof CalculateTargetGradesResponse c ? c : null;
            if (calculation != null && calculation.getRequiredAverageGpa() != null) {
                answer += " Theo Academic Tool, GPA trung bình cần đạt ở phần tín chỉ còn lại là "
                        + calculation.getRequiredAverageGpa().toPlainString() + ".";
            }
            if (toolResults.containsKey("toolUnavailable")) answer += " Phần kế hoạch chưa tạo được; bạn có thể thử lại sau.";
            ChatPlanProposal proposal = toolResults.get("planProposal") instanceof ChatPlanProposal p ? p : null;
            List<ChatActionItem> actions = List.of(
                    new ChatActionItem("OPEN_PLANNER", "Xem kế hoạch điều chỉnh trên Study Planner", "/planner", "{}")
            );
            List<ChatSourceItem> sources = (effectiveGrounded != null && effectiveGrounded.hasEvidence()) ? effectiveGrounded.getCitations() : List.of();
            return validator.validate(new AdvisorModelOutput(answer, sources, actions, proposal, List.of()), input);
        }

        // ==========================================
        // 5. WHAT_IF SIMULATOR SCENARIO
        // ==========================================
        boolean isWhatIf = (userIntent != null && userIntent.getCategory() == ScenarioCategory.WHAT_IF)
                || toolResults.containsKey("simulateGrades")
                || userMsg.contains("nếu kỳ tới") || userMsg.contains("mô phỏng") || userMsg.contains("what-if");
        if (isWhatIf) {
            SimulateGradesResponse sim = toolResults.get("simulateGrades") instanceof SimulateGradesResponse s ? s : null;
            if (sim == null) {
                return validator.validate(new AdvisorModelOutput(
                        "Mình cần môn hoặc số tín chỉ và điểm dự kiến để mô phỏng CPA; bạn cho mình các dữ kiện đó nhé?",
                        List.of(), List.of(), null, List.of()), input);
            }
            String simGpa = sim.getExpectedGpa() != null ? sim.getExpectedGpa().toPlainString() : "chưa xác định";
            String simCpa = sim.getProjectedCpa() != null ? sim.getProjectedCpa().toPlainString() : "chưa xác định";
            String currentCpa = sim.getCurrentCpa() != null ? sim.getCurrentCpa().toPlainString() : "chưa xác định";
            String delta = sim.getCpaDelta() != null ? sim.getCpaDelta().toPlainString() : "chưa xác định";

            String answer = String.format(
                    "[MOCK_ADVISOR] Kết quả mô phỏng điểm số (What-if) theo công thức tính điểm trung bình gia quyền cho sinh viên %s (%s): Điểm trung bình học kỳ dự kiến (GPA) đạt %s, CPA dự kiến tăng lên %s (biến động %s so với CPA hiện tại %s).",
                    studentName, studentCode, simGpa, simCpa, delta, currentCpa
            );
            List<ChatActionItem> actions = List.of(
                    new ChatActionItem("OPEN_WHAT_IF", "Mở bộ giả lập What-if Simulator", "/simulator", "{}")
            );
            List<ChatSourceItem> sources = (effectiveGrounded != null && effectiveGrounded.hasEvidence()) ? effectiveGrounded.getCitations() : List.of();
            return validator.validate(new AdvisorModelOutput(answer, sources, actions, null, List.of()), input);
        }

        // ==========================================
        // 6. RETAKE_IMPROVEMENT SCENARIO
        // ==========================================
        boolean isRetake = (userIntent != null && userIntent.getCategory() == ScenarioCategory.RETAKE_IMPROVEMENT)
                || toolResults.containsKey("rankRetakeCourses")
                || userMsg.contains("học cải thiện") || userMsg.contains("cải thiện điểm") || userMsg.contains("kéo điểm");
        if (isRetake) {
            RankRetakeCoursesResponse rank = toolResults.get("rankRetakeCourses") instanceof RankRetakeCoursesResponse r ? r : null;
            if (rank == null) {
                return validator.validate(new AdvisorModelOutput(
                        "Nếu thời gian hạn chế, bạn nên cân nhắc môn cải thiện theo mục tiêu CPA và khối lượng học. Bạn muốn ưu tiên nâng điểm hay hoàn thành môn mới trước?",
                        List.of(), List.of(), null, List.of()), input);
            }
            StringBuilder details = new StringBuilder();
            if (rank != null && rank.getRecommendations() != null && !rank.getRecommendations().isEmpty()) {
                for (RetakeCourseRecommendation rec : rank.getRecommendations()) {
                    details.append(String.format("\n- %s (%s, điểm hiện tại %s, mục tiêu %s, ROI CPA +%s)",
                            rec.getCourseCode(), rec.getCourseName(), rec.getCurrentGrade(), rec.getTargetGrade(), rec.getCpaDelta()));
                }
            } else {
                details.append("\nChưa có môn cải thiện nào được công cụ xếp hạng.");
            }

            String answer = String.format(
                    "[MOCK_ADVISOR] Danh sách môn học ưu tiên cải thiện điểm có ROI cao nhất cho sinh viên %s (%s):%s",
                    studentName, studentCode, details.toString()
            );
            List<ChatActionItem> actions = List.of(
                    new ChatActionItem("OPEN_PLANNER", "Xem bảng kế hoạch và danh sách môn cải thiện", "/planner", "{\"studentCode\":\"" + studentCode + "\"}")
            );
            List<ChatSourceItem> sources = (effectiveGrounded != null && effectiveGrounded.hasEvidence()) ? effectiveGrounded.getCitations() : List.of();
            return validator.validate(new AdvisorModelOutput(answer, sources, actions, null, List.of()), input);
        }

        // ==========================================
        // 7. GRADUATION_AUDIT SCENARIO
        // ==========================================
        boolean isGraduationAudit = toolResults.containsKey("graduationAudit");
        if (isGraduationAudit) {
            GraduationAuditResponse audit = toolResults.get("graduationAudit") instanceof GraduationAuditResponse a ? a : null;
            if (audit == null) {
                return validator.validate(new AdvisorModelOutput("Chưa có kết quả kiểm tra tốt nghiệp đáng tin cậy.",
                        List.of(), List.of(), null, List.of()), input);
            }
            StringBuilder answer = new StringBuilder("Kết quả kiểm tra tốt nghiệp: ")
                    .append(audit.isEligibleForGraduation() ? "đã đủ điều kiện." : "chưa đủ điều kiện.");
            if (audit.getAccumulatedCredits() != null && audit.getTotalCreditsRequired() != null) {
                answer.append(" Tín chỉ tích lũy ").append(audit.getAccumulatedCredits())
                        .append("/").append(audit.getTotalCreditsRequired()).append(".");
            }
            if (audit.getChecklist() != null) {
                audit.getChecklist().stream().filter(item -> item != null && !item.isCompleted())
                        .map(AuditChecklistItem::getName).filter(Objects::nonNull)
                        .forEach(name -> answer.append(" Còn thiếu: ").append(name).append("."));
            }
            List<ChatActionItem> actions = List.of(
                    new ChatActionItem("OPEN_AUDIT", "Xem bảng kiểm toán tốt nghiệp", "/academic/audit", "{\"studentCode\":\"" + studentCode + "\"}")
            );
            List<ChatSourceItem> sources = (effectiveGrounded != null && effectiveGrounded.hasEvidence()) ? effectiveGrounded.getCitations() : List.of();
            return validator.validate(new AdvisorModelOutput(answer.toString(), sources, actions, null, List.of()), input);
        }

        // ==========================================
        // 8. DEBT_COURSES SCENARIO
        // ==========================================
        boolean isDebt = (userIntent != null && userIntent.getCategory() == ScenarioCategory.DEBT_COURSES)
                || userMsg.contains("nợ môn") || userMsg.contains("môn nợ") || userMsg.contains("chặn môn") || userMsg.contains("điểm f");
        if (isDebt || (toolResults.containsKey("academicStatus") && (userMsg.contains("nợ") || userMsg.contains("môn nợ")))) {
            AcademicStatusResponse status = (AcademicStatusResponse) toolResults.get("academicStatus");
            String cpaInfo = (status != null && status.getCpa() != null)
                    ? String.format(", CPA hiện tại %s", status.getCpa().toPlainString())
                    : "";
            String answer = String.format(
                    "[MOCK_ADVISOR] Dữ liệu tổng quan%s chưa xác định được chính xác môn nào bạn đang nợ. Hãy kiểm tra bảng điểm chi tiết để chọn môn cần xử lý.",
                    cpaInfo
            );
            if (effectiveGrounded != null && effectiveGrounded.hasEvidence() && !effectiveGrounded.getCitations().isEmpty()) {
                answer += " Quy định liên quan có tại [" + effectiveGrounded.getCitations().getFirst().getSourceId() + "].";
            }
            List<ChatActionItem> actions = List.of(
                    new ChatActionItem("NAVIGATE", "Kiểm tra bảng điểm và học phần nợ", "/academic/transcript", "{\"studentCode\":\"" + studentCode + "\"}")
            );
            List<ChatSourceItem> sources = (effectiveGrounded != null && effectiveGrounded.hasEvidence()) ? effectiveGrounded.getCitations() : List.of();
            return validator.validate(new AdvisorModelOutput(answer, sources, actions, null, List.of()), input);
        }

        // ==========================================
        // 8b. LEGACY FALLBACK (Khi không inject RagAdvisorService và không có GroundedContext)
        // ==========================================
        if (ragAdvisorService == null && groundedContext == null && !toolResults.containsKey("planProposal") && !toolResults.containsKey("studyPlan")) {
            if (userIntent == null || userIntent.getCategory() == ScenarioCategory.GENERAL) {
                if (userMsg.contains("tình trạng") || userMsg.contains("học tập") || userMsg.contains("điểm") || userMsg.contains("gpa") || userMsg.contains("cpa")) {
                AcademicStatusResponse status = toolResults.get("academicStatus") instanceof AcademicStatusResponse s ? s : null;
                String answer = String.format(
                    "[MOCK_ADVISOR] %s (%s), %s",
                    studentName, studentCode,
                    status == null ? "mình chưa có kết quả học vụ đã xác minh để đánh giá tình trạng hiện tại."
                            : "CPA hiện tại theo Academic Tool là " + (status.getCpa() == null ? "chưa xác định" : status.getCpa().toPlainString())
                            + "; mức cảnh báo là " + (status.getRiskLevel() == null ? "chưa xác định" : status.getRiskLevel()) + "."
                );
                List<ChatActionItem> actions = List.of(
                        new ChatActionItem("NAVIGATE", "Xem bảng điểm chi tiết", "/academic/transcript", "{\"studentCode\":\"" + studentCode + "\"}")
                );
                return validator.validate(new AdvisorModelOutput(answer, List.of(), actions, null, List.of()), input);
            }
        }
        }

        // ==========================================
        // 9. STUDY_PLAN SCENARIO
        // ==========================================
        if (toolResults.containsKey("planProposal") && toolResults.get("planProposal") instanceof ChatPlanProposal proposal) {
            String answer = String.format(
                    "[MOCK_ADVISOR] Đã tạo dự thảo kế hoạch học tập đề xuất cho sinh viên %s (%s) với CPA dự kiến đạt %s. Bạn có thể xem xét và điều chỉnh trước khi lưu chính thức.",
                    studentName, studentCode, proposal.getProjectedCpa() != null ? proposal.getProjectedCpa().toPlainString() : "N/A"
            );

            List<ChatSourceItem> sources;
            if (groundedContext != null && groundedContext.hasEvidence()) {
                sources = groundedContext.getCitations();
            } else {
                sources = List.of();
            }

            List<ChatActionItem> actions = List.of(
                    new ChatActionItem("OPEN_PLANNER", "Xem chi tiết kế hoạch trên Study Planner", "/planner", "{\"proposalId\":\"" + proposal.getProposalId() + "\"}")
            );
            return validator.validate(new AdvisorModelOutput(answer, sources, actions, proposal, List.of()), input);
        }

        // ==========================================
        // 10. REGULATION & RAG RETRIEVAL SCENARIO
        // ==========================================
        if (effectiveGrounded != null) {
            if (effectiveGrounded.hasEvidence() && !effectiveGrounded.getCitations().isEmpty()) {
                ChatSourceItem firstSource = effectiveGrounded.getCitations().getFirst();
                StringBuilder excerptBuilder = new StringBuilder();
                if (effectiveGrounded.getEvidenceChunks() != null) {
                    for (RagChunk chunk : effectiveGrounded.getEvidenceChunks()) {
                        if (chunk != null && firstSource.getSourceId().equalsIgnoreCase(chunk.getSourceId()) && chunk.getContent() != null && !chunk.getContent().isBlank()) {
                            if (!excerptBuilder.isEmpty()) {
                                excerptBuilder.append("\n\n");
                            }
                            excerptBuilder.append(chunk.getContent());
                        }
                    }
                }
                String excerpt = excerptBuilder.toString();
                if (excerpt.length() > 2500) {
                    excerpt = excerpt.substring(0, 2500) + "...";
                }

                String answer = String.format(
                        "[MOCK_ADVISOR] Xin chào %s (%s). Căn cứ theo quy định tại [%s] %s (%s):\n\n%s\n\nNội dung được trích xuất trực tiếp từ văn bản quy chế chính thức của HaUI.",
                        studentName, studentCode, firstSource.getSourceId(), firstSource.getTitle(),
                        firstSource.getSection() != null ? firstSource.getSection() : "Toàn văn",
                        excerpt
                );

                List<ChatActionItem> actions = List.of(
                        new ChatActionItem("NAVIGATE", "Tra cứu quy chế chi tiết", "/academic/rules", "{\"sourceId\":\"" + firstSource.getSourceId() + "\"}")
                );

                return validator.validate(new AdvisorModelOutput(answer, effectiveGrounded.getCitations(), actions, null, effectiveGrounded.getWarnings()), input);
            } else {
                // NO_EVIDENCE
                List<String> warnings = new ArrayList<>(effectiveGrounded.getWarnings());
                if (!warnings.contains("POLICY_SOURCE_UNAVAILABLE")) {
                    warnings.add("POLICY_SOURCE_UNAVAILABLE");
                }
                if (!warnings.contains("POLICY_SOURCE_UNAVAILABLE: No grounded evidence found in knowledge base")) {
                    warnings.add("POLICY_SOURCE_UNAVAILABLE: No grounded evidence found in knowledge base");
                }

                String answer = String.format(
                        "[MOCK_ADVISOR] Hệ thống trợ lý học vụ HaUI chưa có thông tin hoặc câu hỏi không nằm trong phạm vi quy chế học vụ hiện hành: \"%s\" của sinh viên %s (%s). Vui lòng liên hệ phòng Công tác sinh viên, Ban quản lý ký túc xá hoặc phòng đào tạo HaUI để được hỗ trợ.",
                        rawMsg, studentName, studentCode
                );

                return validator.validate(new AdvisorModelOutput(answer, List.of(), List.of(), null, warnings), input);
            }
        }

        // ==========================================
        // 11. DEFAULT FALLBACK
        // ==========================================
        String answer = String.format(
                "[MOCK_ADVISOR] Hệ thống trợ lý học vụ HaUI (Chế độ Mock) đã nhận tin nhắn: \"%s\" từ sinh viên %s (%s). Bạn có thể hỏi về tình trạng học tập hoặc yêu cầu lập kế hoạch học kỳ tới.",
                rawMsg, studentName, studentCode
        );
        return validator.validate(new AdvisorModelOutput(answer, List.of(), List.of(), null, List.of()), input);
    }
}
