package vn.haui.advisor.ai.rag.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Đại diện cho một mục tài liệu trong danh mục RAG Source Catalog (source-catalog.json).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class CatalogSourceEntry implements Serializable {

    @JsonProperty("source_id")
    private String sourceId;

    @JsonProperty("title")
    private String title;

    @JsonProperty("path")
    private String path;

    @JsonProperty("version")
    private String version;

    @JsonProperty("source_status")
    private String sourceStatus;

    @JsonProperty("rag_enabled")
    private boolean ragEnabled;

    @JsonProperty("reference_url")
    private String referenceUrl;

    @JsonProperty("sections")
    private List<String> sections;

    public CatalogSourceEntry() {
        this.sections = new ArrayList<>();
    }

    public CatalogSourceEntry(
            String sourceId,
            String title,
            String path,
            String version,
            String sourceStatus,
            boolean ragEnabled,
            String referenceUrl,
            List<String> sections
    ) {
        this.sourceId = sourceId;
        this.title = title;
        this.path = path;
        this.version = version;
        this.sourceStatus = sourceStatus;
        this.ragEnabled = ragEnabled;
        this.referenceUrl = referenceUrl;
        this.sections = sections != null ? new ArrayList<>(sections) : new ArrayList<>();
    }

    public String getSourceId() {
        return sourceId;
    }

    public void setSourceId(String sourceId) {
        this.sourceId = sourceId;
    }

    public String sourceId() {
        return sourceId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String title() {
        return title;
    }

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public String path() {
        return path;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public String version() {
        return version;
    }

    public String getSourceStatus() {
        return sourceStatus;
    }

    public void setSourceStatus(String sourceStatus) {
        this.sourceStatus = sourceStatus;
    }

    public String sourceStatus() {
        return sourceStatus;
    }

    public boolean isRagEnabled() {
        return ragEnabled;
    }

    public void setRagEnabled(boolean ragEnabled) {
        this.ragEnabled = ragEnabled;
    }

    public boolean ragEnabled() {
        return ragEnabled;
    }

    public String getReferenceUrl() {
        return referenceUrl;
    }

    public void setReferenceUrl(String referenceUrl) {
        this.referenceUrl = referenceUrl;
    }

    public String referenceUrl() {
        return referenceUrl;
    }

    public List<String> getSections() {
        return sections != null ? Collections.unmodifiableList(sections) : Collections.emptyList();
    }

    public void setSections(List<String> sections) {
        this.sections = sections != null ? new ArrayList<>(sections) : new ArrayList<>();
    }

    public List<String> sections() {
        return getSections();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CatalogSourceEntry that = (CatalogSourceEntry) o;
        return ragEnabled == that.ragEnabled
                && Objects.equals(sourceId, that.sourceId)
                && Objects.equals(title, that.title)
                && Objects.equals(path, that.path)
                && Objects.equals(version, that.version)
                && Objects.equals(sourceStatus, that.sourceStatus)
                && Objects.equals(referenceUrl, that.referenceUrl)
                && Objects.equals(sections, that.sections);
    }

    @Override
    public int hashCode() {
        return Objects.hash(sourceId, title, path, version, sourceStatus, ragEnabled, referenceUrl, sections);
    }

    @Override
    public String toString() {
        return "CatalogSourceEntry{" +
                "sourceId='" + sourceId + '\'' +
                ", title='" + title + '\'' +
                ", path='" + path + '\'' +
                ", version='" + version + '\'' +
                ", sourceStatus='" + sourceStatus + '\'' +
                ", ragEnabled=" + ragEnabled +
                ", referenceUrl='" + referenceUrl + '\'' +
                ", sections=" + sections +
                '}';
    }
}
