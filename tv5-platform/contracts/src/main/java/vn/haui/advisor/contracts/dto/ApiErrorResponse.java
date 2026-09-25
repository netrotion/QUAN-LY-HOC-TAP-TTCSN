package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.time.Instant;
import java.util.List;

public class ApiErrorResponse implements Serializable {
    private String code;
    private String message;
    private String requestId;
    private Instant timestamp;
    private List<String> details;

    public ApiErrorResponse() {
        this.timestamp = Instant.now();
    }

    public ApiErrorResponse(String code, String message, String requestId, List<String> details) {
        this.code = code;
        this.message = message;
        this.requestId = requestId;
        this.timestamp = Instant.now();
        this.details = details;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getRequestId() {
        return requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

    public List<String> getDetails() {
        return details;
    }

    public void setDetails(List<String> details) {
        this.details = details;
    }
}
