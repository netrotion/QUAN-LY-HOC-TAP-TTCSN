package vn.haui.advisor.ai.rag.retrieval;

import org.springframework.stereotype.Component;
import vn.haui.advisor.ai.rag.embedding.EmbeddingProvider;
import vn.haui.advisor.ai.rag.vector.VectorSearchQuery;
import vn.haui.advisor.ai.rag.vector.VectorSearchResult;
import vn.haui.advisor.ai.rag.vector.VectorStore;

import java.util.*;

/**
 * Thành phần thực thi truy xuất tương đồng vector kết hợp chuẩn hóa câu hỏi và khử trùng lặp theo mục tài liệu:
 * 1. Chuẩn hóa câu hỏi tiếng Việt qua {@link VietnameseQueryNormalizer}.
 * 2. Vector hóa câu hỏi qua {@link EmbeddingProvider}.
 * 3. Tìm kiếm không gian vector qua {@link VectorStore} với ngưỡng tin cậy tương đồng (mặc định 0.45) và top-K.
 * 4. Khử trùng lặp: nếu nhiều chunk thuộc cùng một mục (section) trong cùng một tài liệu (sourceId),
 *    chỉ giữ lại chunk có điểm tương đồng cao nhất.
 */
@Component
public class RagRetriever {

    public static final double DEFAULT_SIMILARITY_THRESHOLD = 0.45;
    public static final int DEFAULT_TOP_K = 3;

    private final EmbeddingProvider embeddingProvider;
    private final VectorStore vectorStore;
    private final VietnameseQueryNormalizer normalizer;
    private final double defaultSimilarityThreshold;
    private final int defaultTopK;

    public RagRetriever(EmbeddingProvider embeddingProvider, VectorStore vectorStore) {
        this(embeddingProvider, vectorStore, new VietnameseQueryNormalizer(), DEFAULT_SIMILARITY_THRESHOLD, DEFAULT_TOP_K);
    }

    public RagRetriever(
            EmbeddingProvider embeddingProvider,
            VectorStore vectorStore,
            VietnameseQueryNormalizer normalizer,
            double defaultSimilarityThreshold,
            int defaultTopK
    ) {
        this.embeddingProvider = Objects.requireNonNull(embeddingProvider, "embeddingProvider must not be null");
        this.vectorStore = Objects.requireNonNull(vectorStore, "vectorStore must not be null");
        this.normalizer = normalizer != null ? normalizer : new VietnameseQueryNormalizer();
        this.defaultSimilarityThreshold = defaultSimilarityThreshold > 0.0 ? defaultSimilarityThreshold : DEFAULT_SIMILARITY_THRESHOLD;
        this.defaultTopK = defaultTopK > 0 ? defaultTopK : DEFAULT_TOP_K;
    }

    /**
     * Truy xuất tài liệu với topK và similarityThreshold mặc định.
     */
    public RetrievalResult retrieve(String query) {
        return retrieve(query, defaultTopK, defaultSimilarityThreshold);
    }

    /**
     * Truy xuất tài liệu với topK và similarityThreshold tùy chỉnh.
     *
     * @param query               câu hỏi người dùng
     * @param topK                số lượng kết quả tối đa
     * @param similarityThreshold ngưỡng tương đồng tối thiểu (cosine similarity)
     * @return {@link RetrievalResult}
     */
    public RetrievalResult retrieve(String query, int topK, double similarityThreshold) {
        if (query == null || query.isBlank()) {
            return RetrievalResult.empty(query);
        }

        String normalizedQuery = normalizer.normalize(query);
        if (normalizedQuery.isBlank()) {
            return RetrievalResult.empty(query);
        }

        // 1. Vector hóa truy vấn đã mở rộng ngữ nghĩa
        String searchTarget = normalizer.expandForSearch(normalizedQuery);
        float[] queryVector = embeddingProvider.embed(searchTarget);

        // 2. Tìm kiếm ứng viên từ VectorStore (lấy dư ứng viên để bù trừ sau khi khử trùng lặp)
        int candidateLimit = Math.max(topK * 4, 15);
        VectorSearchQuery searchQuery = VectorSearchQuery.builder()
                .queryVector(queryVector)
                .topK(candidateLimit)
                .minScore(similarityThreshold)
                .build();

        List<VectorSearchResult> rawResults = vectorStore.search(searchQuery);
        if (rawResults == null || rawResults.isEmpty()) {
            return RetrievalResult.empty(query);
        }

        // 3. Khử trùng lặp và xếp hạng:
        // Đảm bảo đa dạng nguồn: mỗi sourceId nhận tối đa 2 chunk, mỗi (sourceId, section) nhận tối đa 1 chunk
        Map<String, Integer> sourceCounts = new HashMap<>();
        Set<String> seenSections = new HashSet<>();
        List<VectorSearchResult> deduped = new ArrayList<>();

        for (VectorSearchResult result : rawResults) {
            if (result.getScore() < similarityThreshold) {
                continue;
            }

            String sourceId = result.chunk().getSourceId();
            if (sourceCounts.getOrDefault(sourceId, 0) >= 2) {
                continue;
            }

            String sectionKey = sourceId + "::" +
                    (result.chunk().getSection() != null ? result.chunk().getSection().trim() : "");

            if (seenSections.add(sectionKey)) {
                deduped.add(result);
                sourceCounts.put(sourceId, sourceCounts.getOrDefault(sourceId, 0) + 1);
                if (deduped.size() >= topK) {
                    break;
                }
            }
        }

        boolean hasEvidence = !deduped.isEmpty();
        return new RetrievalResult(query, deduped, hasEvidence);
    }

    public EmbeddingProvider getEmbeddingProvider() {
        return embeddingProvider;
    }

    public VectorStore getVectorStore() {
        return vectorStore;
    }

    public VietnameseQueryNormalizer getNormalizer() {
        return normalizer;
    }

    public double getDefaultSimilarityThreshold() {
        return defaultSimilarityThreshold;
    }

    public int getDefaultTopK() {
        return defaultTopK;
    }
}
