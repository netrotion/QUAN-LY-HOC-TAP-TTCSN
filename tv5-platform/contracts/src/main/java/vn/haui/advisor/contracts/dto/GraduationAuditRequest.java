package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

public class GraduationAuditRequest implements Serializable {
    private String studentId;
    private String dataRevision;

    public GraduationAuditRequest() {
    }

    public GraduationAuditRequest(String studentId, String dataRevision) {
        this.studentId = studentId;
        this.dataRevision = dataRevision;
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
}
