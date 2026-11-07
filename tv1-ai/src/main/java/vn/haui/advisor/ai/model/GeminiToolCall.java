package vn.haui.advisor.ai.model;

import java.util.Collections;
import java.util.Map;

/**
 * Đóng gói một lệnh gọi công cụ được Gemini phát ra qua functionCall.
 */
public record GeminiToolCall(String name, Map<String, Object> arguments) {
    public GeminiToolCall {
        arguments = arguments != null ? Collections.unmodifiableMap(arguments) : Collections.emptyMap();
    }
}
