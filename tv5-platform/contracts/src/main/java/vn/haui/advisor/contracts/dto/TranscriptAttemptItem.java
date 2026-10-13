package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.math.BigDecimal;

/**
 * Một lần học một học phần trong bảng điểm đã xác nhận.
 * Chỉ gồm dữ liệu gốc (điểm hệ 10, điểm chữ); điểm hệ 4, đạt/không đạt, GPA/CPA do AcademicFacade suy ra theo policy.
 */
public class TranscriptAttemptItem implements Serializable {
    private String courseCode;
    private String courseName;
    private BigDecimal credits;
    private String semesterCode;
    private Integer attemptNumber;
    private BigDecimal score10;
    private String letterGrade;

    public TranscriptAttemptItem() {
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

    public BigDecimal getCredits() {
        return credits;
    }

    public void setCredits(BigDecimal credits) {
        this.credits = credits;
    }

    public String getSemesterCode() {
        return semesterCode;
    }

    public void setSemesterCode(String semesterCode) {
        this.semesterCode = semesterCode;
    }

    public Integer getAttemptNumber() {
        return attemptNumber;
    }

    public void setAttemptNumber(Integer attemptNumber) {
        this.attemptNumber = attemptNumber;
    }

    public BigDecimal getScore10() {
        return score10;
    }

    public void setScore10(BigDecimal score10) {
        this.score10 = score10;
    }

    public String getLetterGrade() {
        return letterGrade;
    }

    public void setLetterGrade(String letterGrade) {
        this.letterGrade = letterGrade;
    }
}
