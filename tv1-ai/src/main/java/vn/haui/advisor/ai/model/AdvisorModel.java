package vn.haui.advisor.ai.model;

/**
 * Abstraction nội bộ cho model AI của module tv1-ai.
 * Cho phép chuyển đổi giữa MockAdvisorModel (deterministic) và LiveAdvisorModel (Spring AI / Gemini).
 */
public interface AdvisorModel {

    /**
     * Sinh phản hồi tư vấn học vụ từ đầu vào chuẩn hóa.
     *
     * @param input thông tin đầu vào bao gồm user message, trusted student context, tool results
     * @return kết quả chuẩn hóa bao gồm answer, sources, actions, planProposal, warnings
     */
    AdvisorModelOutput generate(AdvisorModelInput input);
}
