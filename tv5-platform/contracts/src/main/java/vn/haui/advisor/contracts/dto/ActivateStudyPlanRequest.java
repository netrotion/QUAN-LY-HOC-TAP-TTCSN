package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

/**
 * Request kích hoạt Kế hoạch học tập (thao tác activate).
 * Chuyển trạng thái sang ACTIVE và lưu trữ (ARCHIVED) các kế hoạch ACTIVE trước đó.
 */
public class ActivateStudyPlanRequest implements Serializable {
    private String planId;
    private Integer expectedVersion;
    private String dataRevision;

    public ActivateStudyPlanRequest() {
    }

    public ActivateStudyPlanRequest(String planId, Integer expectedVersion, String dataRevision) {
        this.planId = planId;
        this.expectedVersion = expectedVersion;
        this.dataRevision = dataRevision;
    }

    public String getPlanId() {
        return planId;
    }

    public void setPlanId(String planId) {
        this.planId = planId;
    }

    public Integer getExpectedVersion() {
        return expectedVersion;
    }

    public void setExpectedVersion(Integer expectedVersion) {
        this.expectedVersion = expectedVersion;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }
}
