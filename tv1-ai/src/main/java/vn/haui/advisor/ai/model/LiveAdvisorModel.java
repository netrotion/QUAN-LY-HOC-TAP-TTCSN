package vn.haui.advisor.ai.model;

/**
 * Skeleton adapter cho live model (Spring AI / Gemini API).
 * Được kích hoạt duy nhất khi ai.mode=live.
 * Tuyệt đối không fallback sang mock nếu thiếu cấu hình hoặc lỗi inference.
 */
public class LiveAdvisorModel implements AdvisorModel {

    @Override
    public AdvisorModelOutput generate(AdvisorModelInput input) {
        throw new UnsupportedOperationException(
                "Live Gemini inference is not configured or implemented in Task 1.3c skeleton. " +
                "Live model adapter will be wired with Spring AI ChatModel in Phase 2."
        );
    }
}
