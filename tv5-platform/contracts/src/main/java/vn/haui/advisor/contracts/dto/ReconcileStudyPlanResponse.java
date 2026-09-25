package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.util.List;

public class ReconcileStudyPlanResponse implements Serializable {
    private String planId;
    private String studentId;
    private boolean onTrack;
    private List<String> completedCourses;
    private List<String> missedOrFailedCourses;
    private List<String> adjustmentsRecommended;
    private Integer planVersion;
    private String dataRevision;

    public ReconcileStudyPlanResponse() {
    }

    public ReconcileStudyPlanResponse(String planId, String studentId, boolean onTrack,
                                     List<String> completedCourses, List<String> missedOrFailedCourses,
                                     List<String> adjustmentsRecommended, Integer planVersion, String dataRevision) {
        this.planId = planId;
        this.studentId = studentId;
        this.onTrack = onTrack;
        this.completedCourses = completedCourses;
        this.missedOrFailedCourses = missedOrFailedCourses;
        this.adjustmentsRecommended = adjustmentsRecommended;
        this.planVersion = planVersion;
        this.dataRevision = dataRevision;
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

    public boolean isOnTrack() {
        return onTrack;
    }

    public void setOnTrack(boolean onTrack) {
        this.onTrack = onTrack;
    }

    public List<String> getCompletedCourses() {
        return completedCourses;
    }

    public void setCompletedCourses(List<String> completedCourses) {
        this.completedCourses = completedCourses;
    }

    public List<String> getMissedOrFailedCourses() {
        return missedOrFailedCourses;
    }

    public void setMissedOrFailedCourses(List<String> missedOrFailedCourses) {
        this.missedOrFailedCourses = missedOrFailedCourses;
    }

    public List<String> getAdjustmentsRecommended() {
        return adjustmentsRecommended;
    }

    public void setAdjustmentsRecommended(List<String> adjustmentsRecommended) {
        this.adjustmentsRecommended = adjustmentsRecommended;
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
