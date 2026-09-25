package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.util.List;

public class ValidateStudyPlanRequest implements Serializable {
    private String planId;
    private String studentId;
    private List<PlannedSemesterItem> semesters;
    private Integer planVersion;
    private String dataRevision;

    public ValidateStudyPlanRequest() {
    }

    public ValidateStudyPlanRequest(String planId, String studentId, List<PlannedSemesterItem> semesters,
                                   Integer planVersion, String dataRevision) {
        this.planId = planId;
        this.studentId = studentId;
        this.semesters = semesters;
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

    public List<PlannedSemesterItem> getSemesters() {
        return semesters;
    }

    public void setSemesters(List<PlannedSemesterItem> semesters) {
        this.semesters = semesters;
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
