package vn.haui.advisor.ai.rag.service;

import vn.haui.advisor.ai.rag.model.RagChunk;
import vn.haui.advisor.contracts.dto.ChatSourceItem;

import java.io.Serializable;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Ngữ cảnh tri thức đã qua kiểm định và neo dẫn chứng (Grounded Context) cung cấp cho LLM:
 * Bao gồm danh sách chunk căn cứ, danh sách trích dẫn chuẩn hóa, cảnh báo an toàn và
 * chuỗi Markdown formatted prompt context sẵn sàng để đưa vào prompt cho mô hình ngôn ngữ lớn (Task 3.8).
 */
public class GroundedContext implements Serializable {

    private final String query;
    private final List<RagChunk> evidenceChunks;
    private final List<ChatSourceItem> citations;
    private final String formattedPromptContext;
    private final boolean hasEvidence;
    private final List<String> warnings;

    public GroundedContext(
            String query,
            List<RagChunk> evidenceChunks,
            List<ChatSourceItem> citations,
            String formattedPromptContext,
            boolean hasEvidence,
            List<String> warnings
    ) {
        this.query = query != null ? query : "";
        this.evidenceChunks = evidenceChunks != null ? Collections.unmodifiableList(evidenceChunks) : Collections.emptyList();
        this.citations = citations != null ? Collections.unmodifiableList(citations) : Collections.emptyList();
        this.formattedPromptContext = formattedPromptContext != null ? formattedPromptContext : "";
        this.hasEvidence = hasEvidence;
        this.warnings = warnings != null ? Collections.unmodifiableList(warnings) : Collections.emptyList();
    }

    public static GroundedContext noEvidence(String query, String promptContext, List<String> warnings) {
        return new GroundedContext(query, Collections.emptyList(), Collections.emptyList(), promptContext, false, warnings);
    }

    public String getQuery() {
        return query;
    }

    public String query() {
        return query;
    }

    public List<RagChunk> getEvidenceChunks() {
        return evidenceChunks;
    }

    public List<RagChunk> evidenceChunks() {
        return evidenceChunks;
    }

    public List<ChatSourceItem> getCitations() {
        return citations;
    }

    public List<ChatSourceItem> citations() {
        return citations;
    }

    public String getFormattedPromptContext() {
        return formattedPromptContext;
    }

    public String formattedPromptContext() {
        return formattedPromptContext;
    }

    public boolean isHasEvidence() {
        return hasEvidence;
    }

    public boolean hasEvidence() {
        return hasEvidence;
    }

    public List<String> getWarnings() {
        return warnings;
    }

    public List<String> warnings() {
        return warnings;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        GroundedContext that = (GroundedContext) o;
        return hasEvidence == that.hasEvidence
                && Objects.equals(query, that.query)
                && Objects.equals(evidenceChunks, that.evidenceChunks)
                && Objects.equals(citations, that.citations)
                && Objects.equals(formattedPromptContext, that.formattedPromptContext)
                && Objects.equals(warnings, that.warnings);
    }

    @Override
    public int hashCode() {
        return Objects.hash(query, evidenceChunks, citations, formattedPromptContext, hasEvidence, warnings);
    }

    @Override
    public String toString() {
        return "GroundedContext{" +
                "query='" + query + '\'' +
                ", evidenceChunksCount=" + evidenceChunks.size() +
                ", citationsCount=" + citations.size() +
                ", hasEvidence=" + hasEvidence +
                ", warningsCount=" + warnings.size() +
                '}';
    }
}
