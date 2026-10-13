package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

/**
 * Xác nhận phiên nhập: thay bảng điểm chính thức bằng các dòng included và tăng dataRevision.
 */
public class ConfirmTranscriptImportRequest implements Serializable {
    private Integer sessionVersion;
    private String dataRevision;

    public ConfirmTranscriptImportRequest() {
    }

    public ConfirmTranscriptImportRequest(Integer sessionVersion, String dataRevision) {
        this.sessionVersion = sessionVersion;
        this.dataRevision = dataRevision;
    }

    public Integer getSessionVersion() {
        return sessionVersion;
    }

    public void setSessionVersion(Integer sessionVersion) {
        this.sessionVersion = sessionVersion;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }
}
