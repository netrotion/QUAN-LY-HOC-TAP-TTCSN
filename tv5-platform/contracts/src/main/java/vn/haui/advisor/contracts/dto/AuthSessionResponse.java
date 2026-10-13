package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

/**
 * Trạng thái phiên đăng nhập hiện tại.
 */
public class AuthSessionResponse implements Serializable {
    private boolean authenticated;
    private String studentId;
    private String fullName;
    private AccountRole role;

    public AuthSessionResponse() {
    }

    public AuthSessionResponse(boolean authenticated, String studentId, String fullName, AccountRole role) {
        this.authenticated = authenticated;
        this.studentId = studentId;
        this.fullName = fullName;
        this.role = role;
    }

    public boolean isAuthenticated() {
        return authenticated;
    }

    public void setAuthenticated(boolean authenticated) {
        this.authenticated = authenticated;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public AccountRole getRole() {
        return role;
    }

    public void setRole(AccountRole role) {
        this.role = role;
    }
}
