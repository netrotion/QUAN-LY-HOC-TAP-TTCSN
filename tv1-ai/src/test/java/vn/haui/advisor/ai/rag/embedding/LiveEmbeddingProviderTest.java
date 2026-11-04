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

    @Test
    @DisplayName("embedAll executes batch embedding for multiple texts using customBatchEmbedder")
    void shouldExecuteBatchEmbeddingEfficiently() {
        java.util.concurrent.atomic.AtomicInteger batchCallCount = new java.util.concurrent.atomic.AtomicInteger(0);
        LiveEmbeddingProvider provider = new LiveEmbeddingProvider(
                null,
                texts -> {
                    batchCallCount.incrementAndGet();
                    java.util.List<float[]> list = new java.util.ArrayList<>();
                    for (int i = 0; i < texts.size(); i++) {
                        list.add(new float[768]);
                    }
                    return list;
                },
                768
        );

        List<float[]> embeddings = provider.embedAll(List.of("Văn bản 1", "Văn bản 2", "Văn bản 3"));

        assertThat(embeddings).hasSize(3);
        assertThat(batchCallCount.get()).isEqualTo(1);
    }
}
