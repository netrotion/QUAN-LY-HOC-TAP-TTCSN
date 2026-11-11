package vn.haui.advisor.ai.rag.search;

import vn.haui.advisor.ai.rag.model.RagChunk;

import java.io.Serializable;
import java.util.Objects;

/**
 * Kết quả RAG sau tầng Cross-Encoder / Contextual Re-ranking.
 */
public record ReRankedResult(
        RagChunk chunk,
        double score,
        double rrfScore,
        double semanticOverlapScore,
        String explanation
) implements Serializable {

    public ReRankedResult {
        Objects.requireNonNull(chunk, "chunk must not be null");
        explanation = explanation != null ? explanation : "";
    }
}

