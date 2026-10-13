package vn.haui.advisor.contracts.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.io.Serializable;
import java.util.List;

public class GraduationAuditResponse implements Serializable {
    private String studentId;
    private boolean eligibleForGraduation;
    private Integer completedPercentage;
    private Integer accumulatedCredits;
    private Integer totalCreditsRequired;
    private List<AuditChecklistItem> checklist;
    private List<AuditCertificateAction> pendingActions;
    private String dataRevision;

    public GraduationAuditResponse() {
    }

    public GraduationAuditResponse(String studentId, boolean eligibleForGraduation,
                                   Integer completedPercentage, Integer accumulatedCredits,
                                   Integer totalCreditsRequired, List<AuditChecklistItem> checklist,
                                   List<AuditCertificateAction> pendingActions, String dataRevision) {
        this.studentId = studentId;
        this.eligibleForGraduation = eligibleForGraduation;
        this.completedPercentage = completedPercentage;
        this.accumulatedCredits = accumulatedCredits;
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

    public Integer getAccumulatedCredits() {
        return accumulatedCredits;
    }

    public void setAccumulatedCredits(Integer accumulatedCredits) {
        this.accumulatedCredits = accumulatedCredits;
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

    /**
     * Accessor chuyển tiếp cho mã nguồn dùng tên V0; JSON chỉ có trường {@code accumulatedCredits}.
     *
     * @deprecated dùng {@link #getAccumulatedCredits()}.
     */
    @Deprecated(since = "1.0.0", forRemoval = true)
    @JsonIgnore
    public Integer getTotalCreditsEarned() {
        return getAccumulatedCredits();
    }
}
