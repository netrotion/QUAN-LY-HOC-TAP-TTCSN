package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.util.List;

/**
 * Response kết quả kích hoạt Kế hoạch học tập (thao tác activate).
 */
public class ActivateStudyPlanResponse implements Serializable {
    private String planId;
    private StudyPlanStatus status;
    private String activatedAt;
    private List<String> archivedPlanIds;
    private String message;

    public ActivateStudyPlanResponse() {
    }

    public ActivateStudyPlanResponse(String planId, StudyPlanStatus status, String activatedAt,
                                    List<String> archivedPlanIds, String message) {
        this.planId = planId;
        this.status = status;
        this.activatedAt = activatedAt;
        this.archivedPlanIds = archivedPlanIds;
        this.message = message;
    }

    public String getPlanId() {
        return planId;
    }

    public void setPlanId(String planId) {
        this.planId = planId;
    }

    public StudyPlanStatus getStatus() {
        return status;
    }

    public void setStatus(StudyPlanStatus status) {
        this.status = status;
    }

    public String getActivatedAt() {
        return activatedAt;
    }

    public void setActivatedAt(String activatedAt) {
        this.activatedAt = activatedAt;
    }

    public List<String> getArchivedPlanIds() {
        return archivedPlanIds;
    }

    public void setArchivedPlanIds(List<String> archivedPlanIds) {
        this.archivedPlanIds = archivedPlanIds;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
