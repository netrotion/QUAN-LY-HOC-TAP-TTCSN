package vn.haui.advisor.contracts.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.io.Serializable;
import java.math.BigDecimal;

public class RetakeCourseRecommendation implements Serializable {
    private String courseCode;
    private String courseName;
    private Integer credits;
    private String currentGrade;
    private BigDecimal currentGradePoints;
    private String targetGrade;
    private BigDecimal targetGradePoints;
    private BigDecimal cpaDelta;
    private Integer rank;
    private String rationale;

    public RetakeCourseRecommendation() {
    }

    public RetakeCourseRecommendation(String courseCode, String courseName, Integer credits,
                                      String currentGrade, BigDecimal currentGradePoints,
                                      String targetGrade, BigDecimal targetGradePoints,
                                      BigDecimal cpaDelta, Integer rank, String rationale) {
        this.courseCode = courseCode;
        this.courseName = courseName;
        this.credits = credits;
        this.currentGrade = currentGrade;
        this.currentGradePoints = currentGradePoints;
        this.targetGrade = targetGrade;
        this.targetGradePoints = targetGradePoints;
        this.cpaDelta = cpaDelta;
        this.rank = rank;
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

    public String getCurrentGrade() {
        return currentGrade;
    }

    public void setCurrentGrade(String currentGrade) {
        this.currentGrade = currentGrade;
    }

    public BigDecimal getCurrentGradePoints() {
        return currentGradePoints;
    }

    public void setCurrentGradePoints(BigDecimal currentGradePoints) {
        this.currentGradePoints = currentGradePoints;
    }

    public String getTargetGrade() {
        return targetGrade;
    }

    public void setTargetGrade(String targetGrade) {
        this.targetGrade = targetGrade;
    }

    public BigDecimal getTargetGradePoints() {
        return targetGradePoints;
    }

    public void setTargetGradePoints(BigDecimal targetGradePoints) {
        this.targetGradePoints = targetGradePoints;
    }

    public BigDecimal getCpaDelta() {
        return cpaDelta;
    }

    public void setCpaDelta(BigDecimal cpaDelta) {
        this.cpaDelta = cpaDelta;
    }

    public Integer getRank() {
        return rank;
    }

    public void setRank(Integer rank) {
        this.rank = rank;
    }

    public String getRationale() {
        return rationale;
    }

    public void setRationale(String rationale) {
        this.rationale = rationale;
    }

    /**
     * Accessor chuyển tiếp cho mã nguồn dùng tên V0; JSON chỉ có trường {@code cpaDelta}.
     *
     * @deprecated dùng {@link #getCpaDelta()}.
     */
    @Deprecated(since = "1.0.0", forRemoval = true)
    @JsonIgnore
    public BigDecimal getPotentialCpaGain() {
        return getCpaDelta();
    }
}
