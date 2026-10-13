package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

/**
 * Đăng nhập tài khoản HaUI Advisor ({@code POST /auth/login}); tạo session cookie. Không đăng nhập cổng e-HaUI.
 */
public class LoginRequest implements Serializable {
    private String studentId;
    private String password;

    public LoginRequest() {
    }

    public LoginRequest(String studentId, String password) {
        this.studentId = studentId;
        this.password = password;
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
}
