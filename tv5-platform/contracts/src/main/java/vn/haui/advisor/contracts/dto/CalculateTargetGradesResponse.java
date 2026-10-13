package vn.haui.advisor.contracts.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;

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
    private List<String> warnings;
    private String dataRevision;

    public CalculateTargetGradesResponse() {
    }

    public CalculateTargetGradesResponse(String studentId, BigDecimal currentCpa, BigDecimal targetCpa,
                                         Integer remainingCredits, BigDecimal requiredAverageGpa,
                                         List<TargetCourseGradeRequirement> courseRequirements,
                                         List<String> warnings, String dataRevision) {
        this.studentId = studentId;
        this.currentCpa = currentCpa;
        this.targetCpa = targetCpa;
        this.remainingCredits = remainingCredits;
        this.requiredAverageGpa = requiredAverageGpa;
        this.courseRequirements = courseRequirements;
        this.warnings = warnings;
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

    public List<String> getWarnings() {
        return warnings;
    }

    public void setWarnings(List<String> warnings) {
        this.warnings = warnings;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }

    /**
     * Accessor chuyển tiếp cho mã nguồn dùng tên V0; JSON chỉ có trường {@code warnings}.
     *
     * @deprecated dùng {@link #getWarnings()}.
     */
    @Deprecated(since = "1.0.0", forRemoval = true)
    @JsonIgnore
    public List<String> getFeasibilityWarnings() {
        return getWarnings();
    }
}
