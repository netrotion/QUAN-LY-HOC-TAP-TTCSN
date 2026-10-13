package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

/**
 * Phiên bản dữ liệu học vụ của sinh viên (phát hiện dữ liệu cũ). dataRevision là token duy nhất
 * đại diện phiên bản; client gửi lại nguyên văn trong các thao tác ghi.
 */
public class StudentDataVersion implements Serializable {
    private String studentId;
    private String dataRevision;
    private String updatedAt;
    private Boolean stale;

    public StudentDataVersion() {
    }

    public StudentDataVersion(String studentId, String dataRevision, String updatedAt, Boolean stale) {
        this.studentId = studentId;
        this.dataRevision = dataRevision;
        this.updatedAt = updatedAt;
        this.stale = stale;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Boolean getStale() {
        return stale;
    }

    public void setStale(Boolean stale) {
        this.stale = stale;
    }
}
