package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

/**
 * Sinh viên tự khai báo trạng thái chứng chỉ ({@code PUT /academic/certificates/{requirementCode}}).
 */
public class DeclareCertificateRequest implements Serializable {
    private CertificateStatus status;
    private String evidenceNote;
    private String achievedOn;
    private String dataRevision;

    public DeclareCertificateRequest() {
    }

    public DeclareCertificateRequest(CertificateStatus status, String evidenceNote, String achievedOn, String dataRevision) {
        this.status = status;
        this.evidenceNote = evidenceNote;
        this.achievedOn = achievedOn;
        this.dataRevision = dataRevision;
    }

    public CertificateStatus getStatus() {
        return status;
    }

    public void setStatus(CertificateStatus status) {
        this.status = status;
    }

    public String getEvidenceNote() {
        return evidenceNote;
    }

    public void setEvidenceNote(String evidenceNote) {
        this.evidenceNote = evidenceNote;
    }

    public String getAchievedOn() {
        return achievedOn;
    }

    public void setAchievedOn(String achievedOn) {
        this.achievedOn = achievedOn;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }
}
