package vn.haui.advisor.ai.service;

import vn.haui.advisor.ai.model.AdvisorModel;
import vn.haui.advisor.ai.model.AdvisorModelInput;
import vn.haui.advisor.ai.model.AdvisorModelOutput;
import vn.haui.advisor.ai.tools.ToolAdapter;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.AdvisorFacade;

import java.math.BigDecimal;
import java.util.*;

/**
 * Triển khai chuẩn của port AdvisorFacade theo contracts.
 * Nhận request và context tin cậy từ server; điều phối công cụ qua ToolAdapter và sinh kết quả qua AdvisorModel.
 */
public class DefaultAdvisorFacade implements AdvisorFacade {

    private final AdvisorModel advisorModel;
    private final ToolAdapter toolAdapter;

    public DefaultAdvisorFacade(AdvisorModel advisorModel, ToolAdapter toolAdapter) {
        this.advisorModel = Objects.requireNonNull(advisorModel, "advisorModel must not be null");
        this.toolAdapter = Objects.requireNonNull(toolAdapter, "toolAdapter must not be null");
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
        String lowerMsg = userMessage.toLowerCase();
        Map<String, Object> toolResults = new HashMap<>();
        List<String> combinedWarnings = new ArrayList<>();

        // 3. Điều phối (Orchestration): Gọi ToolAdapter khi câu hỏi yêu cầu dữ liệu học vụ
        if (lowerMsg.contains("kế hoạch") || lowerMsg.contains("lộ trình") || lowerMsg.contains("học kỳ tới")) {
            GenerateStudyPlanResponse planResp = toolAdapter.generateStudyPlan(
                    context,
                    "2024_2025_HK2",
                    new BigDecimal("3.0"),
                    18,
                    false
            );

            if (planResp != null) {
                if (planResp.getWarnings() != null && !planResp.getWarnings().isEmpty()) {
                    combinedWarnings.addAll(planResp.getWarnings());
                    toolResults.put("warnings", planResp.getWarnings());
                }

                if (planResp.getSemesters() != null && !planResp.getSemesters().isEmpty()) {
                    ChatPlanProposal proposal = new ChatPlanProposal(
                            planResp.getPlanId(),
                            "Đề xuất kế hoạch học tập kỳ tới cho sinh viên " + (context.getFullName() != null ? context.getFullName() : context.getStudentCode()),
                            planResp.getSemesters(),
                            planResp.getProjectedCpa()
                    );
                    toolResults.put("planProposal", proposal);
                }
            }
        } else if (lowerMsg.contains("tình trạng") || lowerMsg.contains("học tập") || lowerMsg.contains("điểm") || lowerMsg.contains("gpa") || lowerMsg.contains("cpa")) {
            AcademicStatusResponse statusResp = toolAdapter.getAcademicStatus(context);
            if (statusResp != null) {
                toolResults.put("academicStatus", statusResp);
                if (statusResp.getWarningMessages() != null && !statusResp.getWarningMessages().isEmpty()) {
                    combinedWarnings.addAll(statusResp.getWarningMessages());
                    toolResults.put("warnings", statusResp.getWarningMessages());
                }
            }
        }

        // 4. Sinh phản hồi từ AdvisorModel
        AdvisorModelInput modelInput = new AdvisorModelInput(userMessage, context, toolResults);
        AdvisorModelOutput modelOutput = advisorModel.generate(modelInput);

        // 5. Giữ nguyên cảnh báo, không encode cảnh báo vào answer
        if (modelOutput.getWarnings() != null) {
            for (String w : modelOutput.getWarnings()) {
                if (!combinedWarnings.contains(w)) {
                    combinedWarnings.add(w);
                }
            }
        }

        return new ChatResponse(
                modelOutput.getAnswer(),
                modelOutput.getSources(),
                modelOutput.getActions(),
                modelOutput.getPlanProposal(),
                combinedWarnings
        );
    }
}
