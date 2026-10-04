package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

/**
 * Response kết quả lưu Kế hoạch học tập (thao tác save).
 */
public class SaveStudyPlanResponse implements Serializable {
    private String planId;
    private String planName;
    private StudyPlanStatus status;
    private Integer planVersion;
    private String dataRevision;
    private String savedAt;
    private String message;

    public SaveStudyPlanResponse() {
    }

    public SaveStudyPlanResponse(String planId, String planName, StudyPlanStatus status,
                                Integer planVersion, String dataRevision, String savedAt, String message) {
        this.planId = planId;
        this.planName = planName;
        this.status = status;
        this.planVersion = planVersion;
        this.dataRevision = dataRevision;
        this.savedAt = savedAt;
        this.message = message;
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

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }

    public String getSavedAt() {
        return savedAt;
    }

    public void setSavedAt(String savedAt) {
        this.savedAt = savedAt;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
