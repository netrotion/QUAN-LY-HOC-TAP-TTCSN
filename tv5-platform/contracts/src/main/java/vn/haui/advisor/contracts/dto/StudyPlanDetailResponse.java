package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

/**
 * DTO chi tiết Kế hoạch học tập (thao tác read).
 */
public class StudyPlanDetailResponse implements Serializable {
    private String planId;
    private String studentId;
    private String planName;
    private StudyPlanStatus status;
    private Integer version;
    private String dataRevision;
    private BigDecimal targetCpa;
    private String targetGraduationSemester;
    private Integer maxCreditsPerSemester;
    private List<PlannedSemesterItem> semesters;
    private List<ChatActionItem> actions;
    private List<String> warnings;
    private String createdAt;
    private String updatedAt;

    public StudyPlanDetailResponse() {
    }

    public StudyPlanDetailResponse(String planId, String studentId, String planName, StudyPlanStatus status,
                                   Integer version, String dataRevision, BigDecimal targetCpa,
                                   String targetGraduationSemester, Integer maxCreditsPerSemester,
                                   List<PlannedSemesterItem> semesters, List<ChatActionItem> actions,
                                   List<String> warnings, String createdAt, String updatedAt) {
        this.planId = planId;
        this.studentId = studentId;
        this.planName = planName;
        this.status = status;
        this.version = version;
        this.dataRevision = dataRevision;
        this.targetCpa = targetCpa;
        this.targetGraduationSemester = targetGraduationSemester;
        this.maxCreditsPerSemester = maxCreditsPerSemester;
        this.semesters = semesters;
        this.actions = actions;
        this.warnings = warnings;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
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

    public Integer getVersion() {
        return version;
    }

    public void setVersion(Integer version) {
        this.version = version;
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
}
