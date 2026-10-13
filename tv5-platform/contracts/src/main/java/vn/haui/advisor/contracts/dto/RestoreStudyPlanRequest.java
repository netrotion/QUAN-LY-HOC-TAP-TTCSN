package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

/**
 * Request tạo bản DRAFT mới từ một kế hoạch đã có ({@code POST /planner/plans/{planId}/restore}).
 * Bản gốc giữ nguyên; bản mới mang sourcePlanId trỏ về bản gốc.
 */
public class RestoreStudyPlanRequest implements Serializable {
    private String planName;

    public RestoreStudyPlanRequest() {
    }

    public RestoreStudyPlanRequest(String planName) {
        this.planName = planName;
    }

    public String getPlanName() {
        return planName;
    }

    public void setPlanName(String planName) {
        this.planName = planName;
    }
}
