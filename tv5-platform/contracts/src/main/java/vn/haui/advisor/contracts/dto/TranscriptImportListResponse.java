package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.util.List;

/**
 * Các phiên nhập gần nhất của sinh viên đang đăng nhập, mới trước.
 */
public class TranscriptImportListResponse implements Serializable {
    private List<TranscriptImportResponse> sessions;

    public TranscriptImportListResponse() {
    }

    public TranscriptImportListResponse(List<TranscriptImportResponse> sessions) {
        this.sessions = sessions;
    }

    public List<TranscriptImportResponse> getSessions() {
        return sessions;
    }

    public void setSessions(List<TranscriptImportResponse> sessions) {
        this.sessions = sessions;
    }
}
