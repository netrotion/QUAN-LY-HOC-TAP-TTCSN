package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.util.List;

/**
 * Bảng điểm chính thức của sinh viên ({@code GET /academic/transcript}); chỉ thay đổi khi xác nhận một phiên nhập.
 */
public class TranscriptResponse implements Serializable {
    private String studentId;
    private TranscriptStatus transcriptStatus;
    private TranscriptSourceType sourceType;
    private String importSessionId;
    private String confirmedAt;
    private String dataRevision;
    private List<TranscriptAttemptItem> attempts;

    public TranscriptResponse() {
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public TranscriptStatus getTranscriptStatus() {
        return transcriptStatus;
    }

    public void setTranscriptStatus(TranscriptStatus transcriptStatus) {
        this.transcriptStatus = transcriptStatus;
    }

    public TranscriptSourceType getSourceType() {
        return sourceType;
    }

    public void setSourceType(TranscriptSourceType sourceType) {
        this.sourceType = sourceType;
    }

    public String getImportSessionId() {
        return importSessionId;
    }

    public void setImportSessionId(String importSessionId) {
        this.importSessionId = importSessionId;
    }

    public String getConfirmedAt() {
        return confirmedAt;
    }

    public void setConfirmedAt(String confirmedAt) {
        this.confirmedAt = confirmedAt;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }

    public List<TranscriptAttemptItem> getAttempts() {
        return attempts;
    }

    public void setAttempts(List<TranscriptAttemptItem> attempts) {
        this.attempts = attempts;
    }
}
