package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

public class TrustedStudentContext implements Serializable {
    private String studentId;
    private String studentCode;
    private String fullName;
    private String majorCode;
    private String cohort;
    private String dataRevision;

    public TrustedStudentContext() {
    }

    public TrustedStudentContext(String studentId, String studentCode, String fullName, String majorCode, String cohort, String dataRevision) {
        this.studentId = studentId;
        this.studentCode = studentCode;
        this.fullName = fullName;
        this.majorCode = majorCode;
        this.cohort = cohort;
        this.dataRevision = dataRevision;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getStudentCode() {
        return studentCode;
    }

    public void setStudentCode(String studentCode) {
        this.studentCode = studentCode;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getMajorCode() {
        return majorCode;
    }

    public void setMajorCode(String majorCode) {
        this.majorCode = majorCode;
    }

    public String getCohort() {
        return cohort;
    }

    public void setCohort(String cohort) {
        this.cohort = cohort;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }
}
