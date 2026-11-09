package vn.haui.advisor.ai.rag.search;

import java.io.Serializable;
import java.util.Objects;

/**
 * Kết quả khớp từ vựng từ Lucene BM25.
 */
public record LexicalHit(
        String chunkId,
        double score,
        String section,
        String title,
        String content
) implements Serializable {

    public LexicalHit {
        Objects.requireNonNull(chunkId, "chunkId must not be null");
        section = section != null ? section : "";
        title = title != null ? title : "";
        content = content != null ? content : "";
    }
}
