package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.util.List;

public class GraduationAuditResponse implements Serializable {
    private String studentId;
    private boolean eligibleForGraduation;
    private Integer completedPercentage;
    private Integer totalCreditsEarned;
    private Integer totalCreditsRequired;
    private List<AuditChecklistItem> checklist;
    private List<AuditCertificateAction> pendingActions;
    private String dataRevision;

    public GraduationAuditResponse() {
    }

    public GraduationAuditResponse(String studentId, boolean eligibleForGraduation,
                                   Integer completedPercentage, Integer totalCreditsEarned,
                                   Integer totalCreditsRequired, List<AuditChecklistItem> checklist,
                                   List<AuditCertificateAction> pendingActions, String dataRevision) {
        this.studentId = studentId;
        this.eligibleForGraduation = eligibleForGraduation;
        this.completedPercentage = completedPercentage;
        this.totalCreditsEarned = totalCreditsEarned;
        this.totalCreditsRequired = totalCreditsRequired;
        this.checklist = checklist;
        this.pendingActions = pendingActions;
        this.dataRevision = dataRevision;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public boolean isEligibleForGraduation() {
        return eligibleForGraduation;
    }

    public void setEligibleForGraduation(boolean eligibleForGraduation) {
        this.eligibleForGraduation = eligibleForGraduation;
    }

    public Integer getCompletedPercentage() {
        return completedPercentage;
    }

    public void setCompletedPercentage(Integer completedPercentage) {
        this.completedPercentage = completedPercentage;
    }

    public Integer getTotalCreditsEarned() {
        return totalCreditsEarned;
    }

    public void setTotalCreditsEarned(Integer totalCreditsEarned) {
        this.totalCreditsEarned = totalCreditsEarned;
    }

    public Integer getTotalCreditsRequired() {
        return totalCreditsRequired;
    }

    public void setTotalCreditsRequired(Integer totalCreditsRequired) {
        this.totalCreditsRequired = totalCreditsRequired;
    }

    public List<AuditChecklistItem> getChecklist() {
        return checklist;
    }

    public void setChecklist(List<AuditChecklistItem> checklist) {
        this.checklist = checklist;
    }

    public List<AuditCertificateAction> getPendingActions() {
        return pendingActions;
    }

    public void setPendingActions(List<AuditCertificateAction> pendingActions) {
        this.pendingActions = pendingActions;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }
}
