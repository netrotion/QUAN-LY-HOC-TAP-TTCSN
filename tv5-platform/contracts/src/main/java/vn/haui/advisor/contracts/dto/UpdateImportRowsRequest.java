package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.util.List;

/**
 * Thay toàn bộ danh sách dòng sau khi sinh viên sửa ({@code PUT .../rows}); dòng mới để rowId = null.
 */
public class UpdateImportRowsRequest implements Serializable {
    private Integer sessionVersion;
    private List<TranscriptImportRowItem> rows;

    public UpdateImportRowsRequest() {
    }

    public UpdateImportRowsRequest(Integer sessionVersion, List<TranscriptImportRowItem> rows) {
        this.sessionVersion = sessionVersion;
        this.rows = rows;
    }

    public Integer getSessionVersion() {
        return sessionVersion;
    }

    public void setSessionVersion(Integer sessionVersion) {
        this.sessionVersion = sessionVersion;
    }

    public List<TranscriptImportRowItem> getRows() {
        return rows;
    }

    public void setRows(List<TranscriptImportRowItem> rows) {
        this.rows = rows;
    }
}
