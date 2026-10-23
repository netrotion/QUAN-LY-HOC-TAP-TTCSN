package vn.haui.advisor.platform.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import vn.haui.advisor.ai.config.AiMode;
import vn.haui.advisor.ai.grounding.ResponseGroundingValidator;
import vn.haui.advisor.ai.model.AdvisorModel;
import vn.haui.advisor.ai.model.LiveAdvisorModel;
import vn.haui.advisor.platform.advisor.AdvisorReadiness;

import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;

/**
 * Chỉ dùng trong test. Mô hình giả lập có kiểm soát: AdvisorModel vẫn là LiveAdvisorModel của module AI (dựng prompt,
 * đọc phản hồi, neo nguồn như runtime), chỉ thay lời gọi nhà cung cấp Gemini bằng {@link ScriptedProvider}. Test quyết
 * định có khóa API hay không, phản hồi gì, ném lỗi hay trả chậm, và đọc lại prompt module AI đã gửi.
 * Bean dùng chung trong context: test sửa trạng thái phải gọi {@link ScriptedProvider#reset()}.
 */
@TestConfiguration
public class AdvisorTestConfig {

    @Bean
    public ScriptedProvider scriptedProvider() {
        return new ScriptedProvider();
    }

    @Bean
    @Primary
    public AdvisorModel scriptedAdvisorModel(ScriptedProvider provider, ResponseGroundingValidator validator) {
        return new LiveAdvisorModel(provider::respond, validator, false);
    }

    @Bean
    @Primary
    public AdvisorReadiness scriptedAdvisorReadiness(ScriptedProvider provider) {
        return new AdvisorReadiness(AiMode.LIVE, () -> provider.configured, Duration.ofMinutes(2), Clock.systemUTC());
    }

    public static class ScriptedProvider {

        private static final Function<String, String> DEFAULT = prompt -> "{\"answer\": \"Câu trả lời của mô hình giả lập\"}";

        private volatile boolean configured = true;
        private volatile Function<String, String> behavior = DEFAULT;
        private final List<String> prompts = new CopyOnWriteArrayList<>();
        private final AtomicInteger calls = new AtomicInteger();

        String respond(String prompt) {
            calls.incrementAndGet();
            prompts.add(prompt);
            return behavior.apply(prompt);
        }

        /** false: chưa có khóa API (trợ lý NOT_CONFIGURED). */
        public void setConfigured(boolean configured) {
            this.configured = configured;
        }

        public void answer(Function<String, String> behavior) {
            this.behavior = behavior;
        }

        public int calls() {
            return calls.get();
        }

        public String lastPrompt() {
            return prompts.isEmpty() ? null : prompts.get(prompts.size() - 1);
        }

        public void reset() {
            configured = true;
            behavior = DEFAULT;
        }
    }
}
