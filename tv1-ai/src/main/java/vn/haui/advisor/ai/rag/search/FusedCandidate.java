package vn.haui.advisor.ai.rag.search;

import vn.haui.advisor.ai.rag.model.RagChunk;

import java.io.Serializable;
import java.util.Objects;

/**
 * Ứng viên RAG sau khi hợp nhất xếp hạng giữa Dense Vector và Lexical BM25 qua Reciprocal Rank Fusion (RRF).
 */
public record FusedCandidate(
        RagChunk chunk,
        double rrfScore,
        double denseScore,
        double lexicalScore,
        int denseRank,
        int lexicalRank
) implements Serializable {

    public FusedCandidate {
        Objects.requireNonNull(chunk, "chunk must not be null");
    }
}

