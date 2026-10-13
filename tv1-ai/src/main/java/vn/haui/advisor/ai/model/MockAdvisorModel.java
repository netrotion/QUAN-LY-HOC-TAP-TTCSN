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
        if (effectiveGrounded == null && ragAdvisorService != null) {
            effectiveGrounded = ragAdvisorService.retrieveAndGround(rawMsg);
        }

        // ==========================================
        // 1. TOOL_ERROR / TOOL_UNAVAILABLE SCENARIO
        // ==========================================
        if (toolResults.containsKey("toolError") || toolResults.containsKey("toolUnavailable") || toolResults.containsKey("error")) {
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
                String targetSem = userIntent != null && userIntent.getTargetSemester() != null ? userIntent.getTargetSemester() : "kỳ 7";
                String answer = String.format(
                        "[MOCK_ADVISOR] Đã thẩm định tính khả thi lộ trình học vượt tốt nghiệp tại %s cho sinh viên %s (%s). Kế hoạch tối ưu tải tín chỉ yêu cầu học thêm kỳ hè và phân bổ tối đa 24 tín chỉ mỗi kỳ chính.",
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
            String targetStr = targetCpa != null ? targetCpa.toPlainString() : "3.5";
            String answer = String.format(
                    "[MOCK_ADVISOR] Đã ghi nhận bạn thay đổi mục tiêu CPA thành %s để tốt nghiệp bằng Giỏi cho sinh viên %s (%s). Kế hoạch học tập sẽ được tính lại theo mục tiêu mới.",
                    targetStr, studentName, studentCode
            );
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
            String simGpa = sim != null && sim.getExpectedGpa() != null ? sim.getExpectedGpa().toPlainString() : "3.50";
            String simCpa = sim != null && sim.getProjectedCpa() != null ? sim.getProjectedCpa().toPlainString() : "3.20";
            String currentCpa = sim != null && sim.getCurrentCpa() != null ? sim.getCurrentCpa().toPlainString() : "3.00";
            String delta = sim != null && sim.getCpaDelta() != null ? sim.getCpaDelta().toPlainString() : "+0.20";

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
            StringBuilder details = new StringBuilder();
            if (rank != null && rank.getRecommendations() != null && !rank.getRecommendations().isEmpty()) {
                for (RetakeCourseRecommendation rec : rank.getRecommendations()) {
                    details.append(String.format("\n- %s (%s, %d tín chỉ, điểm hiện tại %s, mục tiêu %s, ROI CPA +%s)",
                            rec.getCourseCode(), rec.getCourseName(), rec.getCredits() != null ? rec.getCredits() : 3,
                            rec.getCurrentGrade(), rec.getTargetGrade(), rec.getCpaDelta()));
                }
            } else {
                details.append("\n- LP6010 (Triết học Mác-Lênin, 3 tín chỉ, điểm hiện tại D, mục tiêu B+, ROI cao nhất)");
                details.append("\n- LP6012 (Chủ nghĩa xã hội khoa học, 2 tín chỉ, điểm hiện tại D+, mục tiêu A, ROI cao)");
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
        boolean isGraduationAudit = (userIntent != null && userIntent.getCategory() == ScenarioCategory.GRADUATION_AUDIT)
                || toolResults.containsKey("graduationAudit")
                || userMsg.contains("tốt nghiệp") || userMsg.contains("chuẩn đầu ra") || userMsg.contains("điều kiện ra trường");
        if (isGraduationAudit) {
            GraduationAuditResponse audit = toolResults.get("graduationAudit") instanceof GraduationAuditResponse a ? a : null;
            int accCredits = audit != null && audit.getAccumulatedCredits() != null ? audit.getAccumulatedCredits() : 61;
            int totalCredits = audit != null && audit.getTotalCreditsRequired() != null ? audit.getTotalCreditsRequired() : 150;
            int pct = audit != null && audit.getCompletedPercentage() != null ? audit.getCompletedPercentage() : 40;

            String answer = String.format(
                    "[MOCK_ADVISOR] Kết quả kiểm toán tốt nghiệp cho sinh viên %s (%s): Tín chỉ tích lũy %d/%d tín chỉ (%d%% tiến độ). Đánh giá: Chưa đủ điều kiện tốt nghiệp. Bạn còn thiếu các điều kiện: chứng chỉ tin học MOS, đồ án tốt nghiệp.",
                    studentName, studentCode, accCredits, totalCredits, pct
            );
            List<ChatActionItem> actions = List.of(
                    new ChatActionItem("OPEN_AUDIT", "Xem bảng kiểm toán tốt nghiệp", "/academic/audit", "{\"studentCode\":\"" + studentCode + "\"}")
            );
            List<ChatSourceItem> sources = (effectiveGrounded != null && effectiveGrounded.hasEvidence()) ? effectiveGrounded.getCitations() : List.of();
            return validator.validate(new AdvisorModelOutput(answer, sources, actions, null, List.of()), input);
        }

        // ==========================================
        // 8. DEBT_COURSES SCENARIO
        // ==========================================
        boolean isDebt = (userIntent != null && userIntent.getCategory() == ScenarioCategory.DEBT_COURSES)
                || userMsg.contains("nợ môn") || userMsg.contains("môn nợ") || userMsg.contains("chặn môn") || userMsg.contains("điểm f");
        if (isDebt || (toolResults.containsKey("academicStatus") && (userMsg.contains("nợ") || userMsg.contains("môn nợ")))) {
            if (userMsg.contains("lp6003") || userMsg.contains("pháp luật đại cương")) {
                String answer = String.format(
                        "[MOCK_ADVISOR] Sinh viên %s (%s) đang nợ môn Tư tưởng Hồ Chí Minh (LP6004) bị điểm F và bắt buộc phải học lại. Do LP6004 là môn học trước của Pháp luật đại cương (LP6003), bạn chưa đủ điều kiện để đăng ký môn LP6003 cho đến khi hoàn thành học phần này.",
                        studentName, studentCode
                );
                List<ChatSourceItem> sources = (effectiveGrounded != null && effectiveGrounded.hasEvidence()) ? effectiveGrounded.getCitations() : List.of();
                return validator.validate(new AdvisorModelOutput(answer, sources, List.of(), null, List.of()), input);
            }

            AcademicStatusResponse status = (AcademicStatusResponse) toolResults.get("academicStatus");
            String cpaInfo = (status != null && status.getCpa() != null)
                    ? String.format(", CPA hiện tại %s", status.getCpa().toPlainString())
                    : "";
            String answer = String.format(
                    "[MOCK_ADVISOR] Tình trạng môn nợ của sinh viên %s (%s)%s: Bạn đang nợ học phần Tư tưởng Hồ Chí Minh (LP6004) với điểm F. Theo quy chế đào tạo HaUI, bạn bắt buộc học lại học phần này để đủ điều kiện xét tốt nghiệp.",
                    studentName, studentCode, cpaInfo
            );
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
                String answer = String.format(
                        "[MOCK_ADVISOR] Xin chào %s (%s). Tình trạng học tập hiện tại của bạn được ghi nhận ở trạng thái bình thường. Hãy theo dõi lịch học và rà soát các điều kiện tích lũy tín chỉ thường xuyên.",
                        studentName, studentCode
                );
                List<ChatSourceItem> sources = List.of(
                        new ChatSourceItem("SRC-MOCK-POLICY", "Quy chế đào tạo đại học chính quy HaUI (Bản mẫu Fixture)", "Điều 14 - Cảnh báo học tập", "2024-FIXTURE", "https://haui.edu.vn/mock-policy")
                );
                List<ChatActionItem> actions = List.of(
                        new ChatActionItem("NAVIGATE", "Xem bảng điểm chi tiết", "/academic/transcript", "{\"studentCode\":\"" + studentCode + "\"}")
                );
                return validator.validate(new AdvisorModelOutput(answer, sources, actions, null, List.of()), input);
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
            } else if (ragAdvisorService != null) {
                GroundedContext grounded = ragAdvisorService.retrieveAndGround("kế hoạch đào tạo đăng ký tín chỉ học kỳ chính");
                sources = grounded.hasEvidence() ? grounded.getCitations() : List.of();
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
