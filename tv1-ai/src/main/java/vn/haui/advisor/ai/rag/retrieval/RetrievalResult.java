package vn.haui.advisor.ai.rag.retrieval;

import vn.haui.advisor.ai.rag.vector.VectorSearchResult;

import java.io.Serializable;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Kết quả tìm kiếm và truy xuất ngữ nghĩa từ VectorStore.
 */
public class RetrievalResult implements Serializable {

    private final String query;
    private final List<VectorSearchResult> items;
    private final boolean hasEvidence;

    public RetrievalResult(String query, List<VectorSearchResult> items, boolean hasEvidence) {
        this.query = query != null ? query : "";
        this.items = items != null ? Collections.unmodifiableList(items) : Collections.emptyList();
        this.hasEvidence = hasEvidence;
    }

    public static RetrievalResult empty(String query) {
        return new RetrievalResult(query, Collections.emptyList(), false);
    }

    public String getQuery() {
        return query;
    }

    public String query() {
        return query;
    }

    public List<VectorSearchResult> getItems() {
        return items;
    }

    public List<VectorSearchResult> items() {
        return items;
    }

    public boolean isHasEvidence() {
        return hasEvidence;
    }

    public boolean hasEvidence() {
        return hasEvidence;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        RetrievalResult that = (RetrievalResult) o;
        return hasEvidence == that.hasEvidence
                && Objects.equals(query, that.query)
                && Objects.equals(items, that.items);
    }

    @Override
    public int hashCode() {
        return Objects.hash(query, items, hasEvidence);
    }

    @Override
    public String toString() {
        return "RetrievalResult{" +
                "query='" + query + '\'' +
                ", itemsCount=" + items.size() +
                ", hasEvidence=" + hasEvidence +
                '}';
    }
}
