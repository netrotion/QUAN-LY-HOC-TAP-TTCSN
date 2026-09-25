package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

public class CalculateTargetGradesResponse implements Serializable {
    private String studentId;
    private BigDecimal currentCpa;
    private BigDecimal targetCpa;
    private Integer remainingCredits;
    private BigDecimal requiredAverageGpa;
    private List<TargetCourseGradeRequirement> courseRequirements;
    private List<String> feasibilityWarnings;
    private String dataRevision;

    public CalculateTargetGradesResponse() {
    }

    public CalculateTargetGradesResponse(String studentId, BigDecimal currentCpa, BigDecimal targetCpa,
                                         Integer remainingCredits, BigDecimal requiredAverageGpa,
                                         List<TargetCourseGradeRequirement> courseRequirements,
                                         List<String> feasibilityWarnings, String dataRevision) {
        this.studentId = studentId;
        this.currentCpa = currentCpa;
        this.targetCpa = targetCpa;
        this.remainingCredits = remainingCredits;
        this.requiredAverageGpa = requiredAverageGpa;
        this.courseRequirements = courseRequirements;
        this.feasibilityWarnings = feasibilityWarnings;
        this.dataRevision = dataRevision;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public BigDecimal getCurrentCpa() {
        return currentCpa;
    }

    public void setCurrentCpa(BigDecimal currentCpa) {
        this.currentCpa = currentCpa;
    }

    public BigDecimal getTargetCpa() {
        return targetCpa;
    }

    public void setTargetCpa(BigDecimal targetCpa) {
        this.targetCpa = targetCpa;
    }

    public Integer getRemainingCredits() {
        return remainingCredits;
    }

    public void setRemainingCredits(Integer remainingCredits) {
        this.remainingCredits = remainingCredits;
    }

    public BigDecimal getRequiredAverageGpa() {
        return requiredAverageGpa;
    }

    public void setRequiredAverageGpa(BigDecimal requiredAverageGpa) {
        this.requiredAverageGpa = requiredAverageGpa;
    }

    public List<TargetCourseGradeRequirement> getCourseRequirements() {
        return courseRequirements;
    }

    public void setCourseRequirements(List<TargetCourseGradeRequirement> courseRequirements) {
        this.courseRequirements = courseRequirements;
    }

    public List<String> getFeasibilityWarnings() {
        return feasibilityWarnings;
    }

    public void setFeasibilityWarnings(List<String> feasibilityWarnings) {
        this.feasibilityWarnings = feasibilityWarnings;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }
}
