package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.util.List;

/**
 * Danh sách kế hoạch (mọi trạng thái) của sinh viên đang đăng nhập, mới cập nhật trước.
 * Bản ACTIVE (nếu có) là phần tử có status = ACTIVE; tối đa một bản.
 */
public class StudyPlanListResponse implements Serializable {
    private List<StudyPlanSummaryItem> plans;

    public StudyPlanListResponse() {
    }

    public StudyPlanListResponse(List<StudyPlanSummaryItem> plans) {
        this.plans = plans;
    }

    public List<StudyPlanSummaryItem> getPlans() {
        return plans;
    }

    public void setPlans(List<StudyPlanSummaryItem> plans) {
        this.plans = plans;
    }
}
