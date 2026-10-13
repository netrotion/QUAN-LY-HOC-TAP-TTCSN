package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

/**
 * Kết quả lưu nháp ({@code POST /planner/plans}). Lưu luôn trả status = DRAFT;
 * lưu từ bản ACTIVE tạo DRAFT mới kế thừa (sourcePlanId = bản ACTIVE), bản ACTIVE không đổi.
 */
public class SaveStudyPlanResponse implements Serializable {
    private String planId;
    private String planName;
    private StudyPlanStatus status;
    private Integer planVersion;
    private String sourcePlanId;
    private String dataRevision;
    private String updatedAt;
    private String message;

    public SaveStudyPlanResponse() {
    }

    public SaveStudyPlanResponse(String planId, String planName, StudyPlanStatus status, Integer planVersion, String sourcePlanId, String dataRevision, String updatedAt, String message) {
        this.planId = planId;
        this.planName = planName;
        this.status = status;
        this.planVersion = planVersion;
        this.sourcePlanId = sourcePlanId;
        this.dataRevision = dataRevision;
        this.updatedAt = updatedAt;
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

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
