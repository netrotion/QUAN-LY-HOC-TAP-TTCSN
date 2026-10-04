package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

/**
 * Request lưu Kế hoạch học tập (thao tác save).
 * Hỗ trợ tạo mới (planId == null) hoặc cập nhật (kèm planVersion cho optimistic lock).
 */
public class SaveStudyPlanRequest implements Serializable {
    private String planId;
    private String planName;
    private Integer planVersion;
    private String dataRevision;
    private BigDecimal targetCpa;
    private String targetGraduationSemester;
    private Integer maxCreditsPerSemester;
    private List<PlannedSemesterItem> semesters;
    private List<ChatActionItem> actions;

    public SaveStudyPlanRequest() {
    }

    public SaveStudyPlanRequest(String planId, String planName, Integer planVersion, String dataRevision,
                                BigDecimal targetCpa, String targetGraduationSemester,
                                Integer maxCreditsPerSemester, List<PlannedSemesterItem> semesters,
                                List<ChatActionItem> actions) {
        this.planId = planId;
        this.planName = planName;
        this.planVersion = planVersion;
        this.dataRevision = dataRevision;
        this.targetCpa = targetCpa;
        this.targetGraduationSemester = targetGraduationSemester;
        this.maxCreditsPerSemester = maxCreditsPerSemester;
        this.semesters = semesters;
        this.actions = actions;
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
}
