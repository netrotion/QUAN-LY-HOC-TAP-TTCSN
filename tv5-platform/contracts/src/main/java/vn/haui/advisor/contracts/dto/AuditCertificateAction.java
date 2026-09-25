package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

/**
 * Hành động hoàn thành điều kiện phi học phần (chứng chỉ ngoại ngữ, tin học, chuẩn đầu ra).
 * Tuyệt đối không biểu diễn thành môn có tín chỉ.
 */
public class AuditCertificateAction implements Serializable {
    private String certificateType;
    private String requiredStandard;
    private String actionDescription;
    private String deadline;
    private String status;

    public AuditCertificateAction() {
    }

    public AuditCertificateAction(String certificateType, String requiredStandard,
                                  String actionDescription, String deadline, String status) {
        this.certificateType = certificateType;
        this.requiredStandard = requiredStandard;
        this.actionDescription = actionDescription;
        this.deadline = deadline;
        this.status = status;
    }

    public String getCertificateType() {
        return certificateType;
    }

    public void setCertificateType(String certificateType) {
        this.certificateType = certificateType;
    }

    public String getRequiredStandard() {
        return requiredStandard;
    }

    public void setRequiredStandard(String requiredStandard) {
        this.requiredStandard = requiredStandard;
    }

    public String getActionDescription() {
        return actionDescription;
    }

    public void setActionDescription(String actionDescription) {
        this.actionDescription = actionDescription;
    }

    public String getDeadline() {
        return deadline;
    }

    public void setDeadline(String deadline) {
        this.deadline = deadline;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
