package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

/**
 * Trạng thái một chứng chỉ/chuẩn đầu ra phi tín chỉ của sinh viên (tự khai báo hoặc demo).
 */
public class CertificateStatusItem implements Serializable {
    private String requirementCode;
    private String category;
    private String name;
    private CertificateStatus status;
    private CertificateVerification verification;
    private String evidenceNote;
    private String achievedOn;
    private String updatedAt;

    public CertificateStatusItem() {
    }

    public String getRequirementCode() {
        return requirementCode;
    }

    public void setRequirementCode(String requirementCode) {
        this.requirementCode = requirementCode;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public CertificateStatus getStatus() {
        return status;
    }

    public void setStatus(CertificateStatus status) {
        this.status = status;
    }

    public CertificateVerification getVerification() {
        return verification;
    }

    public void setVerification(CertificateVerification verification) {
        this.verification = verification;
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

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }
}
