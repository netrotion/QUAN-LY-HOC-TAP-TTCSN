package vn.haui.advisor.ai.config;

/**
 * Chế độ hoạt động của AI Module trong HaUI Advisor.
 */
public enum AiMode {
    /**
     * Chế độ Mock: sử dụng MockAdvisorModel deterministic, không gọi network hay Gemini API.
     */
    MOCK,

    /**
     * Chế độ Live: kết nối trực tiếp với LLM provider (Spring AI Gemini).
     * Tuyệt đối không fallback sang mock nếu thiếu cấu hình hoặc lỗi.
     */
    LIVE
}
