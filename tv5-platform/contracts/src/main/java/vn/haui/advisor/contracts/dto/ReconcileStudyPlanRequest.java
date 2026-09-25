package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.util.List;

public class ReconcileStudyPlanRequest implements Serializable {
    private String planId;
    private String studentId;
    private String completedSemester;
    private Integer planVersion;
    private String dataRevision;

    public ReconcileStudyPlanRequest() {
    }

    public ReconcileStudyPlanRequest(String planId, String studentId, String completedSemester,
                                    Integer planVersion, String dataRevision) {
        this.planId = planId;
        this.studentId = studentId;
        this.completedSemester = completedSemester;
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

    public String getCompletedSemester() {
        return completedSemester;
    }

    public void setCompletedSemester(String completedSemester) {
        this.completedSemester = completedSemester;
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
