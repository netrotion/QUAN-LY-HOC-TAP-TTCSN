package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

/**
 * DTO theo dõi phiên bản dữ liệu học vụ của sinh viên (Optimistic Locking & Stale Data Detection).
 */
public class StudentDataVersion implements Serializable {
    private String studentId;
    private String dataRevision;
    private Integer version;
    private String lastUpdated;
    private Boolean stale;

    public StudentDataVersion() {
    }

    public StudentDataVersion(String studentId, String dataRevision, Integer version,
                              String lastUpdated, Boolean stale) {
        this.studentId = studentId;
        this.dataRevision = dataRevision;
        this.version = version;
        this.lastUpdated = lastUpdated;
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

    public Integer getVersion() {
        return version;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }

    public String getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(String lastUpdated) {
        this.lastUpdated = lastUpdated;
    }

    public Boolean getStale() {
        return stale;
    }

    public void setStale(Boolean stale) {
        this.stale = stale;
    }
}
