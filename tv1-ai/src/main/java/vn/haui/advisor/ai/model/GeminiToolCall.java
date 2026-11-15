package vn.haui.advisor.ai.model;

import java.util.Collections;
import java.util.Map;

/**
 * Đóng gói một lệnh gọi công cụ được Gemini phát ra qua functionCall.
 */
public record GeminiToolCall(String name, Map<String, Object> arguments, String id) {
    public GeminiToolCall(String name, Map<String, Object> arguments) {
        this(name, arguments, null);
    }

    public GeminiToolCall {
        arguments = arguments != null ? Collections.unmodifiableMap(arguments) : Collections.emptyMap();
    }
}
