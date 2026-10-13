package vn.haui.advisor.ai.rag.embedding;

import java.util.List;

/**
 * Triển khai Embedding Provider thực tế (production) kết nối với REST Model API hoặc Spring AI EmbeddingModel.
 *
 * <p><strong>Nguyên tắc an toàn (Strict Guardrail):</strong>
 * Khi chưa được cấu hình đầy đủ API Endpoint / API Key, class này NÉM NGAY NGOẠI LỆ {@link IllegalStateException}.
 * Tuyệt đối KHÔNG tự ý fallback âm thầm về {@link DeterministicFakeEmbeddingProvider} trong môi trường live.
 */
public class LiveEmbeddingProvider implements EmbeddingProvider {

    public static final int DEFAULT_DIMENSION = 1536;
    public static final String DEFAULT_MODEL = "text-embedding-3-small";

    private final String endpoint;
    private final String apiKey;
    private final String modelName;
    private final int dimension;
    private final boolean configured;

    public LiveEmbeddingProvider() {
        this(null, null, DEFAULT_MODEL, DEFAULT_DIMENSION);
    }

    public LiveEmbeddingProvider(String endpoint, String apiKey, String modelName, int dimension) {
        this.endpoint = endpoint;
        this.apiKey = apiKey;
        this.modelName = (modelName != null && !modelName.isBlank()) ? modelName : DEFAULT_MODEL;
        this.dimension = dimension > 0 ? dimension : DEFAULT_DIMENSION;
        this.configured = endpoint != null && !endpoint.isBlank() && apiKey != null && !apiKey.isBlank();
    }

    @Override
    public float[] embed(String text) {
        checkConfigured();
        if (text == null || text.trim().isEmpty()) {
            throw new IllegalArgumentException("Text must not be null or blank");
        }
        // Khi cấu hình hoàn tất, thực hiện gọi HTTP REST Client tới endpoint embedding
        throw new UnsupportedOperationException(
                "Live embedding HTTP client execution not yet connected. Model: " + modelName + " at " + endpoint
        );
    }

    @Override
    public List<float[]> embedAll(List<String> texts) {
        checkConfigured();
        if (texts == null) {
            throw new IllegalArgumentException("texts must not be null");
        }
        throw new UnsupportedOperationException(
                "Live batch embedding HTTP client execution not yet connected. Model: " + modelName + " at " + endpoint
        );
    }

    @Override
    public int getDimension() {
        return dimension;
    }

    @Override
    public String getModelName() {
        return modelName;
    }

    public boolean isConfigured() {
        return configured;
    }

    public String getEndpoint() {
        return endpoint;
    }

    private void checkConfigured() {
        if (!configured) {
            throw new IllegalStateException(
                    "LiveEmbeddingProvider is not configured (missing or blank endpoint/apiKey). " +
                    "Production system requires explicit model API configuration. Silent fallback to fake embedding is strictly prohibited."
            );
        }
    }
}
