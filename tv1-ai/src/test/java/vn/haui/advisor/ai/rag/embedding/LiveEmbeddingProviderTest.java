package vn.haui.advisor.ai.rag.embedding;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LiveEmbeddingProviderTest {

    @Test
    @DisplayName("Unconfigured LiveEmbeddingProvider throws IllegalStateException and never falls back to fake")
    void testUnconfiguredThrowsIllegalStateException() {
        LiveEmbeddingProvider provider = new LiveEmbeddingProvider();
        assertThat(provider.isConfigured()).isFalse();

        assertThatThrownBy(() -> provider.embed("Đăng ký tín chỉ"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("not configured");

        assertThatThrownBy(() -> provider.embedAll(List.of("Đăng ký tín chỉ")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("not configured");
    }

    @Test
    @DisplayName("Blank endpoint or API key leaves provider unconfigured")
    void testBlankConfigLeavesUnconfigured() {
        LiveEmbeddingProvider providerWithBlankKey = new LiveEmbeddingProvider("https://api.openai.com/v1", "   ", "text-embedding-3-small", 1536);
        assertThat(providerWithBlankKey.isConfigured()).isFalse();
        assertThatThrownBy(() -> providerWithBlankKey.embed("test"))
                .isInstanceOf(IllegalStateException.class);

        LiveEmbeddingProvider providerWithBlankUrl = new LiveEmbeddingProvider("", "secret-key", "text-embedding-3-small", 1536);
        assertThat(providerWithBlankUrl.isConfigured()).isFalse();
        assertThatThrownBy(() -> providerWithBlankUrl.embed("test"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("Reports dimension and model name")
    void testMetadata() {
        LiveEmbeddingProvider provider = new LiveEmbeddingProvider();
        assertThat(provider.getModelName()).isNotBlank();
        assertThat(provider.getDimension()).isGreaterThan(0);
    }
}
