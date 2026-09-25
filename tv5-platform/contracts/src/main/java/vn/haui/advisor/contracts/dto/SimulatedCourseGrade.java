package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.math.BigDecimal;

public class SimulatedCourseGrade implements Serializable {
    private String courseCode;
    private Integer credits;
    private String expectedGrade;
    private BigDecimal expectedGradePoints;

    public SimulatedCourseGrade() {
    }

    public SimulatedCourseGrade(String courseCode, Integer credits, String expectedGrade, BigDecimal expectedGradePoints) {
        this.courseCode = courseCode;
        this.credits = credits;
        this.expectedGrade = expectedGrade;
        this.expectedGradePoints = expectedGradePoints;
    }

    public String getCourseCode() {
        return courseCode;
    }

    public void setCourseCode(String courseCode) {
        this.courseCode = courseCode;
    }

    public Integer getCredits() {
        return credits;
    }

    public void setCredits(Integer credits) {
        this.credits = credits;
    }

    public String getExpectedGrade() {
        return expectedGrade;
    }

    public void setExpectedGrade(String expectedGrade) {
        this.expectedGrade = expectedGrade;
    }

    public BigDecimal getExpectedGradePoints() {
        return expectedGradePoints;
    }

    public void setExpectedGradePoints(BigDecimal expectedGradePoints) {
        this.expectedGradePoints = expectedGradePoints;
    }
}
