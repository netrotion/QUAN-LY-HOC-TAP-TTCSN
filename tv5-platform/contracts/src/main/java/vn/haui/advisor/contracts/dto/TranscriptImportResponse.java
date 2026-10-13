package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.util.List;

/**
 * Phiên nhập bảng điểm: tải lên/nhập tay → xem lại → xác nhận. Không ghi bảng điểm chính thức trước khi xác nhận.
 */
public class TranscriptImportResponse implements Serializable {
    private String importSessionId;
    private ImportSessionStatus status;
    private TranscriptSourceType sourceType;
    private String fileName;
    private Long fileSizeBytes;
    private Integer pageCount;
    private Integer sessionVersion;
    private List<TranscriptImportRowItem> rows;
    private TranscriptDocumentSummary documentSummary;
    private List<String> warnings;
    private Integer blockingIssueCount;
    private String createdAt;
    private String updatedAt;
    private String expiresAt;
    private String confirmedAt;

    public TranscriptImportResponse() {
    }

    public String getImportSessionId() {
        return importSessionId;
    }

    public void setImportSessionId(String importSessionId) {
        this.importSessionId = importSessionId;
    }

    public ImportSessionStatus getStatus() {
        return status;
    }

    public void setStatus(ImportSessionStatus status) {
        this.status = status;
    }

    public TranscriptSourceType getSourceType() {
        return sourceType;
    }

    public void setSourceType(TranscriptSourceType sourceType) {
        this.sourceType = sourceType;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public Long getFileSizeBytes() {
        return fileSizeBytes;
    }

    public void setFileSizeBytes(Long fileSizeBytes) {
        this.fileSizeBytes = fileSizeBytes;
    }

    public Integer getPageCount() {
        return pageCount;
    }

    public void setPageCount(Integer pageCount) {
        this.pageCount = pageCount;
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

    public TranscriptDocumentSummary getDocumentSummary() {
        return documentSummary;
    }

    public void setDocumentSummary(TranscriptDocumentSummary documentSummary) {
        this.documentSummary = documentSummary;
    }

    public List<String> getWarnings() {
        return warnings;
    }

    public void setWarnings(List<String> warnings) {
        this.warnings = warnings;
    }

    public Integer getBlockingIssueCount() {
        return blockingIssueCount;
    }

    public void setBlockingIssueCount(Integer blockingIssueCount) {
        this.blockingIssueCount = blockingIssueCount;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(String expiresAt) {
        this.expiresAt = expiresAt;
    }

    public String getConfirmedAt() {
        return confirmedAt;
    }

    public void setConfirmedAt(String confirmedAt) {
        this.confirmedAt = confirmedAt;
    }
}
