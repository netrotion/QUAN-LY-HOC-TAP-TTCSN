package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

/**
 * CSRF token cho request ghi (cookie XSRF-TOKEN + header X-XSRF-TOKEN).
 */
public class CsrfTokenResponse implements Serializable {
    private String headerName;
    private String parameterName;
    private String token;

    public CsrfTokenResponse() {
    }

    public CsrfTokenResponse(String headerName, String parameterName, String token) {
        this.headerName = headerName;
        this.parameterName = parameterName;
        this.token = token;
    }

    public String getHeaderName() {
        return headerName;
    }

    public void setHeaderName(String headerName) {
        this.headerName = headerName;
    }

    public String getParameterName() {
        return parameterName;
    }

    public void setParameterName(String parameterName) {
        this.parameterName = parameterName;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }
}
