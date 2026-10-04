package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

/**
 * Response kết quả xem trước Kế hoạch học tập (thao tác preview).
 */
public class PreviewStudyPlanResponse implements Serializable {
    private String planName;
    private StudyPlanStatus status;
    private BigDecimal targetCpa;
    private BigDecimal estimatedFinalCpa;
    private Integer totalPlannedCredits;
    private List<PlannedSemesterItem> semesters;
    private List<ChatActionItem> actions;
    private List<String> warnings;
    private String dataRevision;

    public PreviewStudyPlanResponse() {
    }

    public PreviewStudyPlanResponse(String planName, StudyPlanStatus status, BigDecimal targetCpa,
                                   BigDecimal estimatedFinalCpa, Integer totalPlannedCredits,
                                   List<PlannedSemesterItem> semesters, List<ChatActionItem> actions,
                                   List<String> warnings, String dataRevision) {
        this.planName = planName;
        this.status = status;
        this.targetCpa = targetCpa;
        this.estimatedFinalCpa = estimatedFinalCpa;
        this.totalPlannedCredits = totalPlannedCredits;
        this.semesters = semesters;
        this.actions = actions;
        this.warnings = warnings;
        this.dataRevision = dataRevision;
    }

    public String getPlanName() {
        return planName;
    }

    public void setPlanName(String planName) {
        this.planName = planName;
    }

    public StudyPlanStatus getStatus() {
        return status;
    }

    public void setStatus(StudyPlanStatus status) {
        this.status = status;
    }

    public BigDecimal getTargetCpa() {
        return targetCpa;
    }

    public void setTargetCpa(BigDecimal targetCpa) {
        this.targetCpa = targetCpa;
    }

    public BigDecimal getEstimatedFinalCpa() {
        return estimatedFinalCpa;
    }

    public void setEstimatedFinalCpa(BigDecimal estimatedFinalCpa) {
        this.estimatedFinalCpa = estimatedFinalCpa;
    }

    public Integer getTotalPlannedCredits() {
        return totalPlannedCredits;
    }

    public void setTotalPlannedCredits(Integer totalPlannedCredits) {
        this.totalPlannedCredits = totalPlannedCredits;
    }

    public List<PlannedSemesterItem> getSemesters() {
        return semesters;
    }

    public void setSemesters(List<PlannedSemesterItem> semesters) {
        this.semesters = semesters;
    }

    public List<ChatActionItem> getActions() {
        return actions;
    }

    public void setActions(List<ChatActionItem> actions) {
        this.actions = actions;
    }

    public List<String> getWarnings() {
        return warnings;
    }

    public void setWarnings(List<String> warnings) {
        this.warnings = warnings;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }
}
