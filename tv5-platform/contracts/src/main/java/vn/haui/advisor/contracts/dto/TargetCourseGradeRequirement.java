package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.math.BigDecimal;

public class TargetCourseGradeRequirement implements Serializable {
    private String courseCode;
    private String courseName;
    private Integer credits;
    private String requiredGrade;
    private BigDecimal requiredGradePoints;
    private String rationale;

    public TargetCourseGradeRequirement() {
    }

    public TargetCourseGradeRequirement(String courseCode, String courseName, Integer credits,
                                       String requiredGrade, BigDecimal requiredGradePoints, String rationale) {
        this.courseCode = courseCode;
        this.courseName = courseName;
        this.credits = credits;
        this.requiredGrade = requiredGrade;
        this.requiredGradePoints = requiredGradePoints;
        this.rationale = rationale;
    }

    public String getCourseCode() {
        return courseCode;
    }

    public void setCourseCode(String courseCode) {
        this.courseCode = courseCode;
    }

    public String getCourseName() {
        return courseName;
    }

    public void setCourseName(String courseName) {
        this.courseName = courseName;
    }

    public Integer getCredits() {
        return credits;
    }

    public void setCredits(Integer credits) {
        this.credits = credits;
    }

    public String getRequiredGrade() {
        return requiredGrade;
    }

    public void setRequiredGrade(String requiredGrade) {
        this.requiredGrade = requiredGrade;
    }

    public BigDecimal getRequiredGradePoints() {
        return requiredGradePoints;
    }

    public void setRequiredGradePoints(BigDecimal requiredGradePoints) {
        this.requiredGradePoints = requiredGradePoints;
    }

    public String getRationale() {
        return rationale;
    }

    public void setRationale(String rationale) {
        this.rationale = rationale;
    }
}
