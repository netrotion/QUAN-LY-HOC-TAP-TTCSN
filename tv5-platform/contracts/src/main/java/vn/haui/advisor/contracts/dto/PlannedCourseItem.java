package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

public class PlannedCourseItem implements Serializable {
    private String courseCode;
    private String courseName;
    private Integer credits;
    private String targetGrade;
    private String rationale;

    public PlannedCourseItem() {
    }

    public PlannedCourseItem(String courseCode, String courseName, Integer credits, String targetGrade, String rationale) {
        this.courseCode = courseCode;
        this.courseName = courseName;
        this.credits = credits;
        this.targetGrade = targetGrade;
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

    public String getTargetGrade() {
        return targetGrade;
    }

    public void setTargetGrade(String targetGrade) {
        this.targetGrade = targetGrade;
    }

    public String getRationale() {
        return rationale;
    }

    public void setRationale(String rationale) {
        this.rationale = rationale;
    }
}
