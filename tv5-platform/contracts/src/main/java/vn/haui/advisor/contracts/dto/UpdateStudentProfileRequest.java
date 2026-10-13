package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

/**
 * Cập nhật hồ sơ ({@code PUT /students/me}). Đổi curriculumId làm dữ liệu học vụ đổi revision.
 */
public class UpdateStudentProfileRequest implements Serializable {
    private String fullName;
    private String email;
    private String className;
    private String cohort;
    private String curriculumId;
    private String dataRevision;

    public UpdateStudentProfileRequest() {
    }

    public UpdateStudentProfileRequest(String fullName, String email, String className, String cohort, String curriculumId, String dataRevision) {
        this.fullName = fullName;
        this.email = email;
        this.className = className;
        this.cohort = cohort;
        this.curriculumId = curriculumId;
        this.dataRevision = dataRevision;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getClassName() {
        return className;
    }

    public void setClassName(String className) {
        this.className = className;
    }

    public String getCohort() {
        return cohort;
    }

    public void setCohort(String cohort) {
        this.cohort = cohort;
    }

    public String getCurriculumId() {
        return curriculumId;
    }

    public void setCurriculumId(String curriculumId) {
        this.curriculumId = curriculumId;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }
}
