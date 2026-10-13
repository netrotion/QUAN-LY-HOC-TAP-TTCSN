package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

/**
 * Request kích hoạt Kế hoạch học tập: {@code POST /planner/plans/{planId}/activate}.
 * planId nằm trên path; body chỉ mang phiên bản client đang giữ để chặn ghi đè dữ liệu cũ.
 */
public class ActivateStudyPlanRequest implements Serializable {
    private Integer planVersion;
    private String dataRevision;

    public ActivateStudyPlanRequest() {
    }

    public ActivateStudyPlanRequest(Integer planVersion, String dataRevision) {
        this.planVersion = planVersion;
        this.dataRevision = dataRevision;
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
}
