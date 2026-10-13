package vn.haui.advisor.ai.rag.model;

import java.io.Serializable;
import java.util.Objects;

/**
 * Đại diện cho một đoạn văn bản ngữ nghĩa (chunk) được chia tách từ RagDocument để lập chỉ mục Vector hoặc đối chiếu RAG.
 */
public class RagChunk implements Serializable {

    private final String chunkId;
    private final String sourceId;
    private final String title;
    private final String section;
    private final String version;
    private final String referenceUrl;
    private final String content;
    private final int chunkIndex;
    private final int tokenEstimate;

    public RagChunk(
            String chunkId,
            String sourceId,
            String title,
            String section,
            String version,
            String referenceUrl,
            String content,
            int chunkIndex,
            int tokenEstimate
    ) {
        this.chunkId = chunkId;
        this.sourceId = sourceId;
        this.title = title;
        this.section = section;
        this.version = version;
        this.referenceUrl = referenceUrl;
        this.content = content != null ? content : "";
        this.chunkIndex = chunkIndex;
        this.tokenEstimate = tokenEstimate;
    }

    public String getChunkId() {
        return chunkId;
    }

    public String chunkId() {
        return chunkId;
    }

    public String getSourceId() {
        return sourceId;
    }

    public String sourceId() {
        return sourceId;
    }

    public String getTitle() {
        return title;
    }

    public String title() {
        return title;
    }

    public String getSection() {
        return section;
    }

    public String section() {
        return section;
    }

    public String getVersion() {
        return version;
    }

    public String version() {
        return version;
    }

    public String getReferenceUrl() {
        return referenceUrl;
    }

    public String referenceUrl() {
        return referenceUrl;
    }

    public String getContent() {
        return content;
    }

    public String content() {
        return content;
    }

    public int getChunkIndex() {
        return chunkIndex;
    }

    public int chunkIndex() {
        return chunkIndex;
    }

    public int getTokenEstimate() {
        return tokenEstimate;
    }

    public int tokenEstimate() {
        return tokenEstimate;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        RagChunk ragChunk = (RagChunk) o;
        return chunkIndex == ragChunk.chunkIndex
                && tokenEstimate == ragChunk.tokenEstimate
                && Objects.equals(chunkId, ragChunk.chunkId)
                && Objects.equals(sourceId, ragChunk.sourceId)
                && Objects.equals(title, ragChunk.title)
                && Objects.equals(section, ragChunk.section)
                && Objects.equals(version, ragChunk.version)
                && Objects.equals(referenceUrl, ragChunk.referenceUrl)
                && Objects.equals(content, ragChunk.content);
    }

    @Override
    public int hashCode() {
        return Objects.hash(chunkId, sourceId, title, section, version, referenceUrl, content, chunkIndex, tokenEstimate);
    }

    @Override
    public String toString() {
        return "RagChunk{" +
                "chunkId='" + chunkId + '\'' +
                ", sourceId='" + sourceId + '\'' +
                ", section='" + section + '\'' +
                ", chunkIndex=" + chunkIndex +
                ", tokenEstimate=" + tokenEstimate +
                ", contentLength=" + content.length() +
                '}';
    }
}
