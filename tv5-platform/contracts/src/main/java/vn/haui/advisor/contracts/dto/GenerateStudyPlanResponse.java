package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

public class GenerateStudyPlanResponse implements Serializable {
    private String planId;
    private String studentId;
    private StudyPlanStatus status;
    private List<PlannedSemesterItem> semesters;
    private BigDecimal projectedCpa;
    private List<String> warnings;
    private Integer planVersion;
    private String dataRevision;

    public GenerateStudyPlanResponse() {
    }

    public GenerateStudyPlanResponse(String planId, String studentId, StudyPlanStatus status,
                                    List<PlannedSemesterItem> semesters, BigDecimal projectedCpa,
                                    List<String> warnings, Integer planVersion, String dataRevision) {
        this.planId = planId;
        this.studentId = studentId;
        this.status = status;
        this.semesters = semesters;
        this.projectedCpa = projectedCpa;
        this.warnings = warnings;
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

    public StudyPlanStatus getStatus() {
        return status;
    }

    public void setStatus(StudyPlanStatus status) {
        this.status = status;
    }

    public List<PlannedSemesterItem> getSemesters() {
        return semesters;
    }

    public void setSemesters(List<PlannedSemesterItem> semesters) {
        this.semesters = semesters;
    }

    public BigDecimal getProjectedCpa() {
        return projectedCpa;
    }

    public void setProjectedCpa(BigDecimal projectedCpa) {
        this.projectedCpa = projectedCpa;
    }

    public List<String> getWarnings() {
        return warnings;
    }

    public void setWarnings(List<String> warnings) {
        this.warnings = warnings;
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
