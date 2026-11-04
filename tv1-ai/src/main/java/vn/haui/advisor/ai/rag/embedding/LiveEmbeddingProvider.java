package vn.haui.advisor.ai.rag.embedding;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;

/**
 * Triển khai Embedding Provider thực tế (production) kết nối với REST Model API (Google Gemini / OpenAI compatible)
 * hoặc custom ProviderFunction.
 *
 * <p><strong>Nguyên tắc an toàn (Strict Guardrail):</strong>
 * Khi chưa được cấu hình đầy đủ API Endpoint / API Key hoặc custom provider, class này NÉM NGAY NGOẠI LỆ {@link IllegalStateException}.
 * Tuyệt đối KHÔNG tự ý fallback âm thầm về {@link DeterministicFakeEmbeddingProvider} trong môi trường live.
 */
public class LiveEmbeddingProvider implements EmbeddingProvider {

    private static final Logger log = LoggerFactory.getLogger(LiveEmbeddingProvider.class);

    public static final int DEFAULT_GEMINI_DIMENSION = 768;
    public static final String DEFAULT_GEMINI_MODEL = "text-embedding-004";
    public static final String DEFAULT_GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

    private final String endpoint;
    private final String apiKey;
    private final String modelName;
    private final int dimension;
    private final boolean configured;
    private final Function<String, float[]> customEmbedder;
    private final Function<List<String>, List<float[]>> customBatchEmbedder;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public LiveEmbeddingProvider() {
        this(null, null, DEFAULT_GEMINI_MODEL, DEFAULT_GEMINI_DIMENSION, null, null);
    }

    public LiveEmbeddingProvider(String endpoint, String apiKey, String modelName, int dimension) {
        this(endpoint, apiKey, modelName, dimension, null, null);
    }

    public LiveEmbeddingProvider(Function<String, float[]> customEmbedder, int dimension) {
        this(null, null, "custom-embedder", dimension, customEmbedder, null);
    }

    public LiveEmbeddingProvider(Function<String, float[]> customEmbedder,
                                 Function<List<String>, List<float[]>> customBatchEmbedder,
                                 int dimension) {
        this(null, null, "custom-embedder", dimension, customEmbedder, customBatchEmbedder);
    }

    public LiveEmbeddingProvider(String endpoint,
                                 String apiKey,
                                 String modelName,
                                 int dimension,
                                 Function<String, float[]> customEmbedder) {
        this(endpoint, apiKey, modelName, dimension, customEmbedder, null);
    }

    public LiveEmbeddingProvider(String endpoint,
                                 String apiKey,
                                 String modelName,
                                 int dimension,
                                 Function<String, float[]> customEmbedder,
                                 Function<List<String>, List<float[]>> customBatchEmbedder) {
        boolean hasHttpConfig = (endpoint != null && !endpoint.isBlank()) && (apiKey != null && !apiKey.isBlank());
        this.endpoint = (endpoint != null && !endpoint.isBlank()) ? endpoint.trim() : DEFAULT_GEMINI_ENDPOINT;
        this.apiKey = (apiKey != null && !apiKey.isBlank()) ? apiKey.trim() : null;
        this.modelName = (modelName != null && !modelName.isBlank()) ? modelName.trim() : DEFAULT_GEMINI_MODEL;
        this.dimension = dimension > 0 ? dimension : DEFAULT_GEMINI_DIMENSION;
        this.customEmbedder = customEmbedder;
        this.customBatchEmbedder = customBatchEmbedder;
        this.configured = customEmbedder != null || customBatchEmbedder != null || hasHttpConfig;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public float[] embed(String text) {
        checkConfigured();
        if (text == null || text.trim().isEmpty()) {
            throw new IllegalArgumentException("Text must not be null or blank");
        }

        if (customEmbedder != null) {
            float[] result = customEmbedder.apply(text);
            if (result == null || result.length == 0) {
                throw new IllegalStateException("Custom embedder returned null or empty vector");
            }
            return result;
        }

        return executeHttpEmbedding(text);
    }

    @Override
    public List<float[]> embedAll(List<String> texts) {
        checkConfigured();
        if (texts == null) {
            throw new IllegalArgumentException("texts must not be null");
        }
        if (texts.isEmpty()) {
            return List.of();
        }
        for (String t : texts) {
            if (t == null || t.trim().isEmpty()) {
                throw new IllegalArgumentException("Text in batch must not be null or blank");
            }
        }

        if (customBatchEmbedder != null) {
            List<float[]> res = customBatchEmbedder.apply(texts);
            if (res == null || res.size() != texts.size()) {
                throw new IllegalStateException("Custom batch embedder returned invalid result size");
            }
            return res;
        }

        if (customEmbedder != null) {
            List<float[]> results = new ArrayList<>(texts.size());
            for (String t : texts) {
                results.add(embed(t));
            }
            return results;
        }

        return executeHttpBatchEmbedding(texts);
    }

    private List<float[]> executeHttpBatchEmbedding(List<String> texts) {
        List<float[]> allResults = new ArrayList<>(texts.size());
        int batchSize = 100;
        for (int i = 0; i < texts.size(); i += batchSize) {
            List<String> slice = texts.subList(i, Math.min(i + batchSize, texts.size()));
            allResults.addAll(executeSingleHttpBatch(slice));
        }
        return allResults;
    }

    private List<float[]> executeSingleHttpBatch(List<String> batch) {
        try {
            boolean isGemini = endpoint.contains("googleapis.com") || modelName.contains("text-embedding") || modelName.contains("embedding");

            String requestUrl;
            String requestBody;
            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder().timeout(Duration.ofSeconds(30));

            if (isGemini) {
                String cleanEndpoint = endpoint.endsWith("/") ? endpoint.substring(0, endpoint.length() - 1) : endpoint;
                requestUrl = cleanEndpoint + "/" + modelName + ":batchEmbedContents?key=" + apiKey;

                String effectiveModel = modelName.startsWith("models/") ? modelName : "models/" + modelName;
                List<Map<String, Object>> requests = new ArrayList<>(batch.size());
                for (String text : batch) {
                    requests.add(Map.of(
                            "model", effectiveModel,
                            "content", Map.of("parts", List.of(Map.of("text", text)))
                    ));
                }

                Map<String, Object> payload = Map.of("requests", requests);
                requestBody = objectMapper.writeValueAsString(payload);
                reqBuilder.uri(URI.create(requestUrl))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody));
            } else {
                requestUrl = endpoint;
                Map<String, Object> payload = Map.of(
                        "input", batch,
                        "model", modelName
                );
                requestBody = objectMapper.writeValueAsString(payload);
                reqBuilder.uri(URI.create(requestUrl))
                        .header("Content-Type", "application/json")
                        .header("Authorization", "Bearer " + apiKey)
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody));
            }

            HttpResponse<String> response = httpClient.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.warn("Batch embedding failed with HTTP {}, falling back to sequential embed", response.statusCode());
                List<float[]> fallbackList = new ArrayList<>(batch.size());
                for (String t : batch) {
                    fallbackList.add(executeHttpEmbedding(t));
                }
                return fallbackList;
            }

            JsonNode root = objectMapper.readTree(response.body());
            List<float[]> batchResults = new ArrayList<>(batch.size());

            if (root.has("embeddings") && root.get("embeddings").isArray()) {
                JsonNode embeddingsArray = root.get("embeddings");
                for (JsonNode item : embeddingsArray) {
                    JsonNode valuesNode = item.get("values");
                    if (valuesNode != null && valuesNode.isArray()) {
                        float[] vec = new float[valuesNode.size()];
                        for (int k = 0; k < valuesNode.size(); k++) {
                            vec[k] = (float) valuesNode.get(k).asDouble();
                        }
                        batchResults.add(vec);
                    }
                }
            } else if (root.has("data") && root.get("data").isArray()) {
                JsonNode dataArray = root.get("data");
                for (JsonNode item : dataArray) {
                    JsonNode valuesNode = item.get("embedding");
                    if (valuesNode != null && valuesNode.isArray()) {
                        float[] vec = new float[valuesNode.size()];
                        for (int k = 0; k < valuesNode.size(); k++) {
                            vec[k] = (float) valuesNode.get(k).asDouble();
                        }
                        batchResults.add(vec);
                    }
                }
            }

            if (batchResults.size() != batch.size()) {
                log.warn("Batch embedding response count mismatch (expected {}, got {}), falling back to sequential embed", batch.size(), batchResults.size());
                List<float[]> fallbackList = new ArrayList<>(batch.size());
                for (String t : batch) {
                    fallbackList.add(executeHttpEmbedding(t));
                }
                return fallbackList;
            }

            return batchResults;
        } catch (Exception e) {
            log.warn("Batch embedding encountered exception: {}, falling back to sequential embed", e.getMessage());
            List<float[]> fallbackList = new ArrayList<>(batch.size());
            for (String t : batch) {
                fallbackList.add(executeHttpEmbedding(t));
            }
            return fallbackList;
        }
    }

    private float[] executeHttpEmbedding(String text) {
        try {
            boolean isGemini = endpoint.contains("googleapis.com") || modelName.contains("text-embedding") || modelName.contains("embedding");

            String requestUrl;
            String requestBody;
            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder().timeout(Duration.ofSeconds(15));

            if (isGemini) {
                String cleanEndpoint = endpoint.endsWith("/") ? endpoint.substring(0, endpoint.length() - 1) : endpoint;
                requestUrl = cleanEndpoint + "/" + modelName + ":embedContent?key=" + apiKey;
                Map<String, Object> payload = Map.of(
                        "content", Map.of(
                                "parts", List.of(Map.of("text", text))
                        )
                );
                requestBody = objectMapper.writeValueAsString(payload);
                reqBuilder.uri(URI.create(requestUrl))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody));
            } else {
                requestUrl = endpoint;
                Map<String, Object> payload = Map.of(
                        "input", text,
                        "model", modelName
                );
                requestBody = objectMapper.writeValueAsString(payload);
                reqBuilder.uri(URI.create(requestUrl))
                        .header("Content-Type", "application/json")
                        .header("Authorization", "Bearer " + apiKey)
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody));
            }

            HttpResponse<String> response = httpClient.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new IllegalStateException("Embedding API returned HTTP " + response.statusCode() + ": " + response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode valuesNode = null;

            if (root.has("embedding") && root.get("embedding").has("values")) {
                valuesNode = root.get("embedding").get("values");
            } else if (root.has("data") && root.get("data").isArray() && root.get("data").size() > 0) {
                JsonNode first = root.get("data").get(0);
                if (first.has("embedding")) {
                    valuesNode = first.get("embedding");
                }
            }

            if (valuesNode == null || !valuesNode.isArray()) {
                throw new IllegalStateException("Failed to parse embedding vector from response: " + response.body());
            }

            float[] vector = new float[valuesNode.size()];
            for (int i = 0; i < valuesNode.size(); i++) {
                vector[i] = (float) valuesNode.get(i).asDouble();
            }

            return vector;
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new IllegalStateException("Failed to call live embedding API: " + e.getMessage(), e);
        }
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
