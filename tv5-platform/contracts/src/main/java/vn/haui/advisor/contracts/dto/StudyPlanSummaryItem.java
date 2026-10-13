package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.math.BigDecimal;

/**
 * Một dòng trong lịch sử kế hoạch của sinh viên ({@code GET /planner/plans}).
 */
public class StudyPlanSummaryItem implements Serializable {
    private String planId;
    private String planName;
    private Integer planVersion;
    private StudyPlanStatus status;
    private String sourcePlanId;
    private Integer totalCredits;
    private BigDecimal projectedCpa;
    private String updatedAt;

    public StudyPlanSummaryItem() {
    }

    public StudyPlanSummaryItem(String planId, String planName, Integer planVersion, StudyPlanStatus status, String sourcePlanId, Integer totalCredits, BigDecimal projectedCpa, String updatedAt) {
        this.planId = planId;
        this.planName = planName;
        this.planVersion = planVersion;
        this.status = status;
        this.sourcePlanId = sourcePlanId;
        this.totalCredits = totalCredits;
        this.projectedCpa = projectedCpa;
        this.updatedAt = updatedAt;
    }

    public String getPlanId() {
        return planId;
    }

    public void setPlanId(String planId) {
        this.planId = planId;
    }

    public String getPlanName() {
        return planName;
    }

    public void setPlanName(String planName) {
        this.planName = planName;
    }

    public Integer getPlanVersion() {
        return planVersion;
    }

    public void setPlanVersion(Integer planVersion) {
        this.planVersion = planVersion;
    }

    public StudyPlanStatus getStatus() {
        return status;
    }

    public void setStatus(StudyPlanStatus status) {
        this.status = status;
    }

    public String getSourcePlanId() {
        return sourcePlanId;
    }

    public void setSourcePlanId(String sourcePlanId) {
        this.sourcePlanId = sourcePlanId;
    }

    public Integer getTotalCredits() {
        return totalCredits;
    }

    public void setTotalCredits(Integer totalCredits) {
        this.totalCredits = totalCredits;
    }

    public BigDecimal getProjectedCpa() {
        return projectedCpa;
    }

    public void setProjectedCpa(BigDecimal projectedCpa) {
        this.projectedCpa = projectedCpa;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }
}
