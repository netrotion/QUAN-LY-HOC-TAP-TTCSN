package vn.haui.advisor.ai.rag.vector;

import vn.haui.advisor.ai.rag.model.RagChunk;

import java.io.Serializable;
import java.util.Objects;

/**
 * Kết quả tìm kiếm tương đồng vector, chứa RagChunk và điểm số cosine similarity.
 */
public class VectorSearchResult implements Serializable {

    private final RagChunk chunk;
    private final double score;

    public VectorSearchResult(RagChunk chunk, double score) {
        this.chunk = Objects.requireNonNull(chunk, "chunk must not be null");
        this.score = score;
    }

    public RagChunk getChunk() {
        return chunk;
    }

    public RagChunk chunk() {
        return chunk;
    }

    public double getScore() {
        return score;
    }

    public double score() {
        return score;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        VectorSearchResult that = (VectorSearchResult) o;
        return Double.compare(that.score, score) == 0 && Objects.equals(chunk, that.chunk);
    }

    @Override
    public int hashCode() {
        return Objects.hash(chunk, score);
    }

    @Override
    public String toString() {
        return "VectorSearchResult{" +
                "chunkId='" + chunk.getChunkId() + '\'' +
                ", score=" + score +
                '}';
    }
}
