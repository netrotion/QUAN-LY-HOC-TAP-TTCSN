package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

/**
 * Tạo tài khoản sinh viên ({@code POST /auth/register}); mã sinh viên do người dùng khai báo, không xác minh với trường.
 */
public class RegisterAccountRequest implements Serializable {
    private String studentId;
    private String password;
    private String fullName;
    private String email;
    private String className;
    private String cohort;
    private String curriculumId;

    public RegisterAccountRequest() {
    }

    public RegisterAccountRequest(String studentId, String password, String fullName, String email, String className, String cohort, String curriculumId) {
        this.studentId = studentId;
        this.password = password;
        this.fullName = fullName;
        this.email = email;
        this.className = className;
        this.cohort = cohort;
        this.curriculumId = curriculumId;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
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
}
