package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

public class PlannedSemesterItem implements Serializable {
    private String semesterCode;
    private String semesterName;
    private List<PlannedCourseItem> courses;
    private Integer totalCredits;
    private BigDecimal expectedGpa;

    public PlannedSemesterItem() {
    }

    public PlannedSemesterItem(String semesterCode, String semesterName, List<PlannedCourseItem> courses,
                               Integer totalCredits, BigDecimal expectedGpa) {
        this.semesterCode = semesterCode;
        this.semesterName = semesterName;
        this.courses = courses;
        this.totalCredits = totalCredits;
        this.expectedGpa = expectedGpa;
    }

    public String getSemesterCode() {
        return semesterCode;
    }

    public void setSemesterCode(String semesterCode) {
        this.semesterCode = semesterCode;
    }

    public String getSemesterName() {
        return semesterName;
    }

    public void setSemesterName(String semesterName) {
        this.semesterName = semesterName;
    }

    public List<PlannedCourseItem> getCourses() {
        return courses;
    }

    public void setCourses(List<PlannedCourseItem> courses) {
        this.courses = courses;
    }

    public Integer getTotalCredits() {
        return totalCredits;
    }

    public void setTotalCredits(Integer totalCredits) {
        this.totalCredits = totalCredits;
    }

    public BigDecimal getExpectedGpa() {
        return expectedGpa;
    }

    public void setExpectedGpa(BigDecimal expectedGpa) {
        this.expectedGpa = expectedGpa;
    }
}
