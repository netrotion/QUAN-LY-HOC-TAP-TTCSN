package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.util.List;

/**
 * Danh sách chuẩn đầu ra phi tín chỉ và trạng thái khai báo của sinh viên.
 */
public class CertificateListResponse implements Serializable {
    private List<CertificateStatusItem> certificates;

    public CertificateListResponse() {
    }

    public CertificateListResponse(List<CertificateStatusItem> certificates) {
        this.certificates = certificates;
    }

    public List<CertificateStatusItem> getCertificates() {
        return certificates;
    }

    public void setCertificates(List<CertificateStatusItem> certificates) {
        this.certificates = certificates;
    }
}
