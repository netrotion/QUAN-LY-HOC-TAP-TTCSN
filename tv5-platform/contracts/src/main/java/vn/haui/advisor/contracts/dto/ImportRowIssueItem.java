package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

/**
 * Một vấn đề trên dòng nhập bảng điểm.
 */
public class ImportRowIssueItem implements Serializable {
    private ImportIssueCode code;
    private boolean blocking;
    private String message;

    public ImportRowIssueItem() {
    }

    public ImportRowIssueItem(ImportIssueCode code, boolean blocking, String message) {
        this.code = code;
        this.blocking = blocking;
        this.message = message;
    }

    public ImportIssueCode getCode() {
        return code;
    }

    public void setCode(ImportIssueCode code) {
        this.code = code;
    }

    public boolean isBlocking() {
        return blocking;
    }

    public void setBlocking(boolean blocking) {
        this.blocking = blocking;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
