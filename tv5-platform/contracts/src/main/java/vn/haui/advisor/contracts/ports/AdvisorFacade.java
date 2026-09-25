package vn.haui.advisor.contracts.ports;

import vn.haui.advisor.contracts.dto.ChatRequest;
import vn.haui.advisor.contracts.dto.ChatResponse;
import vn.haui.advisor.contracts.dto.TrustedStudentContext;

/**
 * Port giao tiếp trợ lý ảo học vụ do module TV1 implement.
 * Nhận yêu cầu hội thoại và context tin cậy từ server; trả câu trả lời, nguồn, actions, planProposal và cảnh báo.
 */
public interface AdvisorFacade {

    ChatResponse chat(ChatRequest request, TrustedStudentContext context);
}
