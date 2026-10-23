package vn.haui.advisor.platform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * Cấu hình Chat endpoint ở platform (haui.advisor.*): hạn trả lời, giới hạn đồng thời và đầu vào, thời gian gợi ý gửi lại.
 * Cấu hình của module AI (mô hình, RAG, công cụ) nằm ở ai.* do TV1 định nghĩa.
 */
@ConfigurationProperties(prefix = "haui.advisor")
public class AdvisorProperties {

    /** Hạn cho cả một lượt chat (RAG + công cụ học vụ + mô hình); quá hạn → 503 AI_UNAVAILABLE, không lưu gì. */
    private Duration chatTimeout = Duration.ofSeconds(45);
    private int maxConcurrentChats = 8;
    private int maxQueuedChats = 16;
    private int maxMessageLength = 4000;
    /** Giá trị Retry-After khi trợ lý tạm thời không trả lời được. */
    private Duration retryAfter = Duration.ofSeconds(10);
    /** Sau một lượt lỗi, trợ lý báo DEGRADED trong khoảng này (vẫn nhận câu hỏi). */
    private Duration degradedWindow = Duration.ofMinutes(2);
    /** Thư mục gốc chứa data-source/documents cho RAG; trống thì tự dò từ thư mục làm việc. */
    private String ragDocumentsRoot;

    public Duration getChatTimeout() {
        return chatTimeout;
    }

    public void setChatTimeout(Duration chatTimeout) {
        this.chatTimeout = chatTimeout;
    }

    public int getMaxConcurrentChats() {
        return maxConcurrentChats;
    }

    public void setMaxConcurrentChats(int maxConcurrentChats) {
        this.maxConcurrentChats = maxConcurrentChats;
    }

    public int getMaxQueuedChats() {
        return maxQueuedChats;
    }

    public void setMaxQueuedChats(int maxQueuedChats) {
        this.maxQueuedChats = maxQueuedChats;
    }

    public int getMaxMessageLength() {
        return maxMessageLength;
    }

    public void setMaxMessageLength(int maxMessageLength) {
        this.maxMessageLength = maxMessageLength;
    }

    public Duration getRetryAfter() {
        return retryAfter;
    }

    public void setRetryAfter(Duration retryAfter) {
        this.retryAfter = retryAfter;
    }

    public Duration getDegradedWindow() {
        return degradedWindow;
    }

    public void setDegradedWindow(Duration degradedWindow) {
        this.degradedWindow = degradedWindow;
    }

    public String getRagDocumentsRoot() {
        return ragDocumentsRoot;
    }

    public void setRagDocumentsRoot(String ragDocumentsRoot) {
        this.ragDocumentsRoot = ragDocumentsRoot;
    }
}
