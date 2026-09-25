package vn.haui.advisor.ai.model;

import vn.haui.advisor.contracts.dto.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Triển khai mock deterministic của AdvisorModel phục vụ phát triển cục bộ và kiểm thử tích hợp.
 * Không gọi network, không gọi Gemini API, kết quả ổn định và lặp lại 100%.
 */
public class MockAdvisorModel implements AdvisorModel {

    @Override
    public AdvisorModelOutput generate(AdvisorModelInput input) {
        String userMsg = input.getUserMessage() != null ? input.getUserMessage().toLowerCase().trim() : "";
        TrustedStudentContext context = input.getStudentContext();
        Map<String, Object> toolResults = input.getToolResults();

        String studentName = context != null && context.getFullName() != null ? context.getFullName() : "Sinh viên";
        String studentCode = context != null && context.getStudentCode() != null ? context.getStudentCode() : "Chưa xác định";

        // Kiểm tra kịch bản C: Có cảnh báo/lỗi từ kết quả công cụ
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
            // CASE C: Warning / Error scenario
            String answer = String.format(
                    "[MOCK_ADVISOR] Cảnh báo học vụ đối với sinh viên %s (%s): %s. Vui lòng rà soát lại kết quả học tập.",
                    studentName, studentCode, String.join("; ", collectedWarnings)
            );
            List<ChatActionItem> actions = List.of(
                    new ChatActionItem("NAVIGATE", "Rà soát điều kiện học vụ", "/academic/audit", "{\"studentCode\":\"" + studentCode + "\"}")
            );
            return new AdvisorModelOutput(answer, List.of(), actions, null, collectedWarnings);
        }

        // Kiểm tra kịch bản B: Đề xuất kế hoạch học tập (Study Plan)
        if (toolResults.containsKey("planProposal") && toolResults.get("planProposal") instanceof ChatPlanProposal proposal) {
            String answer = String.format(
                    "[MOCK_ADVISOR] Đã tạo dự thảo kế hoạch học tập đề xuất cho sinh viên %s (%s) với CPA dự kiến đạt %s. Bạn có thể xem xét và điều chỉnh trước khi lưu chính thức.",
                    studentName, studentCode, proposal.getProjectedCpa() != null ? proposal.getProjectedCpa().toPlainString() : "N/A"
            );
            List<ChatSourceItem> sources = List.of(
                    new ChatSourceItem("SRC-MOCK-PLAN", "Khung chương trình đào tạo HaUI (Bản mẫu Fixture)", "Kế hoạch đề xuất", "2024-FIXTURE", "https://haui.edu.vn/mock-curriculum")
            );
            List<ChatActionItem> actions = List.of(
                    new ChatActionItem("OPEN_PLANNER", "Xem chi tiết kế hoạch trên Study Planner", "/planner", "{\"proposalId\":\"" + proposal.getProposalId() + "\"}")
            );
            return new AdvisorModelOutput(answer, sources, actions, proposal, List.of());
        }

        // Kịch bản A: Hỏi đáp tổng quát / tình trạng học tập
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
            return new AdvisorModelOutput(answer, sources, actions, null, List.of());
        }

        // Kịch bản mặc định: Phản hồi mock chung
        String answer = String.format(
                "[MOCK_ADVISOR] Hệ thống trợ lý học vụ HaUI (Chế độ Mock) đã nhận tin nhắn: \"%s\" từ sinh viên %s (%s). Bạn có thể hỏi về tình trạng học tập hoặc yêu cầu lập kế hoạch học kỳ tới.",
                input.getUserMessage(), studentName, studentCode
        );
        return new AdvisorModelOutput(answer, List.of(), List.of(), null, List.of());
    }
}
