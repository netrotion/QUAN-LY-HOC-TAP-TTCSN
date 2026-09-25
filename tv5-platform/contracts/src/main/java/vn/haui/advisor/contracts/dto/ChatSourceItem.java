package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

public class ChatSourceItem implements Serializable {
    private String sourceId;
    private String title;
    private String section;
    private String version;
    private String referenceUrl;

    public ChatSourceItem() {
    }

    public ChatSourceItem(String sourceId, String title, String section, String version, String referenceUrl) {
        this.sourceId = sourceId;
        this.title = title;
        this.section = section;
        this.version = version;
        this.referenceUrl = referenceUrl;
    }

    public String getSourceId() {
        return sourceId;
    }

    public void setSourceId(String sourceId) {
        this.sourceId = sourceId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSection() {
        return section;
    }

    public void setSection(String section) {
        this.section = section;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public String getReferenceUrl() {
        return referenceUrl;
    }

    public void setReferenceUrl(String referenceUrl) {
        this.referenceUrl = referenceUrl;
    }
}
