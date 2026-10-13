package vn.haui.advisor.ai.rag.vector;

import vn.haui.advisor.ai.rag.model.RagChunk;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Triển khai in-memory thread-safe của {@link VectorStore} sử dụng {@link ConcurrentHashMap}.
 * Phục vụ chạy test nhanh, offline evaluation, và môi trường local không cần cài đặt PostgreSQL pgvector.
 */
public class InMemoryVectorStore implements VectorStore {

    private final ConcurrentMap<String, StoredItem> storage = new ConcurrentHashMap<>();

    private static class StoredItem {
        final RagChunk chunk;
        final float[] vector;

        StoredItem(RagChunk chunk, float[] vector) {
            this.chunk = chunk;
            this.vector = vector;
        }
    }

    @Override
    public void upsert(List<RagChunk> chunks, List<float[]> vectors) {
        if (chunks == null || vectors == null) {
            throw new IllegalArgumentException("Chunks and vectors must not be null");
        }
        if (chunks.size() != vectors.size()) {
            throw new IllegalArgumentException(
                    "Size mismatch: chunks has " + chunks.size() + " items, but vectors has " + vectors.size()
            );
        }

        for (int i = 0; i < chunks.size(); i++) {
            RagChunk chunk = chunks.get(i);
            float[] vector = vectors.get(i);
            if (chunk == null || chunk.getChunkId() == null || chunk.getChunkId().isBlank()) {
                throw new IllegalArgumentException("Chunk and its chunkId must not be null or blank");
            }
            if (vector == null) {
                throw new IllegalArgumentException("Vector must not be null for chunkId: " + chunk.getChunkId());
            }
            storage.put(chunk.getChunkId(), new StoredItem(chunk, vector.clone()));
        }
    }

    @Override
    public List<VectorSearchResult> search(VectorSearchQuery query) {
        if (query == null) {
            throw new IllegalArgumentException("Query must not be null");
        }

        float[] queryVec = query.getQueryVector();
        int topK = query.getTopK();
        double minScore = query.getMinScore();
        String sourceIdFilter = query.getSourceIdFilter();
        String versionFilter = query.getVersionFilter();

        List<VectorSearchResult> matched = new ArrayList<>();

        for (StoredItem item : storage.values()) {
            RagChunk chunk = item.chunk;

            // Bộ lọc sourceId
            if (sourceIdFilter != null && !sourceIdFilter.equals(chunk.getSourceId())) {
                continue;
            }

            // Bộ lọc version
            if (versionFilter != null && !versionFilter.equals(chunk.getVersion())) {
                continue;
            }

            double similarity = computeCosineSimilarity(queryVec, item.vector);
            if (similarity >= minScore) {
                matched.add(new VectorSearchResult(chunk, similarity));
            }
        }

        // Sắp xếp giảm dần theo điểm tương đồng cosine similarity
        matched.sort((a, b) -> Double.compare(b.getScore(), a.getScore()));

        // Cắt theo topK
        if (matched.size() > topK) {
            return new ArrayList<>(matched.subList(0, topK));
        }
        return matched;
    }

    @Override
    public void deleteBySourceId(String sourceId) {
        if (sourceId == null || sourceId.isBlank()) {
            return;
        }
        storage.entrySet().removeIf(entry -> sourceId.equals(entry.getValue().chunk.getSourceId()));
    }

    @Override
    public long count() {
        return storage.size();
    }

    @Override
    public Optional<RagChunk> findById(String chunkId) {
        if (chunkId == null || chunkId.isBlank()) {
            return Optional.empty();
        }
        StoredItem item = storage.get(chunkId);
        return item != null ? Optional.of(item.chunk) : Optional.empty();
    }

    /**
     * Tính toán cosine similarity giữa hai vector float[].
     */
    private double computeCosineSimilarity(float[] vecA, float[] vecB) {
        if (vecA.length != vecB.length) {
            throw new IllegalArgumentException(
                    "Dimension mismatch: query is " + vecA.length + " vs stored is " + vecB.length
            );
        }
        double dot = 0.0;
        double normA = 0.0;
        double normB = 0.0;
        for (int i = 0; i < vecA.length; i++) {
            dot += (double) vecA[i] * vecB[i];
            normA += (double) vecA[i] * vecA[i];
            normB += (double) vecB[i] * vecB[i];
        }
        if (normA <= 1e-12 || normB <= 1e-12) {
            return 0.0;
        }
        double sim = dot / (Math.sqrt(normA) * Math.sqrt(normB));
        return Math.max(-1.0, Math.min(1.0, sim));
    }
}
