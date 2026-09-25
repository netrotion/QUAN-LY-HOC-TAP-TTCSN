package vn.haui.advisor.ai.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Cấu hình tham số AI module (prefix ai.*).
 */
@ConfigurationProperties(prefix = "ai")
public class AiProperties {

    /**
     * Chế độ hoạt động của AI Module: MOCK hoặc LIVE.
     * Mặc định là MOCK cho môi trường local dev và unit test.
     * Ở môi trường LIVE/production, chế độ LIVE yêu cầu bean model thật, không tự sinh mock.
     */
    private AiMode mode = AiMode.MOCK;

    public AiMode getMode() {
        return mode;
    }

    public void setMode(AiMode mode) {
        this.mode = mode;
    }
}
