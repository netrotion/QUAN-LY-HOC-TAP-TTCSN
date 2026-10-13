package vn.haui.advisor.ai.rag.model;

import java.io.Serializable;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/**
 * Đại diện cho một tài liệu văn bản hoàn chỉnh đã đọc từ hệ thống lưu trữ RAG.
 */
public class RagDocument implements Serializable {

    private final String sourceId;
    private final String title;
    private final String path;
    private final String version;
    private final String content;
    private final String referenceUrl;
    private final Map<String, Object> metadata;

    public RagDocument(
            String sourceId,
            String title,
            String path,
            String version,
            String content,
            String referenceUrl,
            Map<String, Object> metadata
    ) {
        this.sourceId = sourceId;
        this.title = title;
        this.path = path;
        this.version = version;
        this.content = content != null ? content : "";
        this.referenceUrl = referenceUrl;
        this.metadata = metadata != null ? Collections.unmodifiableMap(new HashMap<>(metadata)) : Collections.emptyMap();
    }

    public RagDocument(
            String sourceId,
            String title,
            String path,
            String version,
            String content,
            String referenceUrl
    ) {
        this(sourceId, title, path, version, content, referenceUrl, Collections.emptyMap());
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

    public String getPath() {
        return path;
    }

    public String path() {
        return path;
    }

    public String getVersion() {
        return version;
    }

    public String version() {
        return version;
    }

    public String getContent() {
        return content;
    }

    public String content() {
        return content;
    }

    public String getReferenceUrl() {
        return referenceUrl;
    }

    public String referenceUrl() {
        return referenceUrl;
    }

    public Map<String, Object> getMetadata() {
        return metadata;
    }

    public Map<String, Object> metadata() {
        return metadata;
    }

    @SuppressWarnings("unchecked")
    public <T> T getMetadataProperty(String key, Class<T> clazz) {
        Object val = metadata.get(key);
        if (val != null && clazz.isInstance(val)) {
            return (T) val;
        }
        return null;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        RagDocument that = (RagDocument) o;
        return Objects.equals(sourceId, that.sourceId)
                && Objects.equals(title, that.title)
                && Objects.equals(path, that.path)
                && Objects.equals(version, that.version)
                && Objects.equals(content, that.content)
                && Objects.equals(referenceUrl, that.referenceUrl)
                && Objects.equals(metadata, that.metadata);
    }

    @Override
    public int hashCode() {
        return Objects.hash(sourceId, title, path, version, content, referenceUrl, metadata);
    }

    @Override
    public String toString() {
        return "RagDocument{" +
                "sourceId='" + sourceId + '\'' +
                ", title='" + title + '\'' +
                ", path='" + path + '\'' +
                ", version='" + version + '\'' +
                ", contentLength=" + content.length() +
                ", referenceUrl='" + referenceUrl + '\'' +
                ", metadata=" + metadata +
                '}';
    }
}
