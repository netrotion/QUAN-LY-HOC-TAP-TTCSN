package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

/**
 * Chi tiết một Kế hoạch học tập đã lưu: {@code GET /planner/plans/{planId}}
 * và kết quả {@code POST /planner/plans/{planId}/restore}.
 */
public class StudyPlanDetailResponse implements Serializable {
    private String planId;
    private String studentId;
    private String planName;
    private StudyPlanStatus status;
    private Integer planVersion;
    private String sourcePlanId;
    private String dataRevision;
    private BigDecimal targetCpa;
    private String targetGraduationSemester;
    private Integer maxCreditsPerSemester;
    private Integer totalCredits;
    private BigDecimal projectedCpa;
    private List<PlannedSemesterItem> semesters;
    private List<ChatActionItem> actions;
    private List<String> warnings;
    private String createdAt;
    private String updatedAt;
    private String activatedAt;

    public StudyPlanDetailResponse() {
    }

    public String getPlanId() {
        return planId;
    }

    public void setPlanId(String planId) {
        this.planId = planId;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
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

    public Integer getPlanVersion() {
        return planVersion;
    }

    public void setPlanVersion(Integer planVersion) {
        this.planVersion = planVersion;
    }

    public String getSourcePlanId() {
        return sourcePlanId;
    }

    public void setSourcePlanId(String sourcePlanId) {
        this.sourcePlanId = sourcePlanId;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }

    public BigDecimal getTargetCpa() {
        return targetCpa;
    }

    public void setTargetCpa(BigDecimal targetCpa) {
        this.targetCpa = targetCpa;
    }

    public String getTargetGraduationSemester() {
        return targetGraduationSemester;
    }

    public void setTargetGraduationSemester(String targetGraduationSemester) {
        this.targetGraduationSemester = targetGraduationSemester;
    }

    public Integer getMaxCreditsPerSemester() {
        return maxCreditsPerSemester;
    }

    public void setMaxCreditsPerSemester(Integer maxCreditsPerSemester) {
        this.maxCreditsPerSemester = maxCreditsPerSemester;
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

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getActivatedAt() {
        return activatedAt;
    }

    public void setActivatedAt(String activatedAt) {
        this.activatedAt = activatedAt;
    }
}
