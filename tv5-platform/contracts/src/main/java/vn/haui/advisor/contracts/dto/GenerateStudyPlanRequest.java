package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.math.BigDecimal;

public class GenerateStudyPlanRequest implements Serializable {
    private String studentId;
    private String targetGraduationSemester;
    private BigDecimal targetCpa;
    private Integer maxCreditsPerSemester;
    private Boolean includeSummerSemesters;
    private String dataRevision;

    public GenerateStudyPlanRequest() {
    }

    public GenerateStudyPlanRequest(String studentId, String targetGraduationSemester, BigDecimal targetCpa,
                                   Integer maxCreditsPerSemester, Boolean includeSummerSemesters, String dataRevision) {
        this.studentId = studentId;
        this.targetGraduationSemester = targetGraduationSemester;
        this.targetCpa = targetCpa;
        this.maxCreditsPerSemester = maxCreditsPerSemester;
        this.includeSummerSemesters = includeSummerSemesters;
        this.dataRevision = dataRevision;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getTargetGraduationSemester() {
        return targetGraduationSemester;
    }

    public void setTargetGraduationSemester(String targetGraduationSemester) {
        this.targetGraduationSemester = targetGraduationSemester;
    }

    public BigDecimal getTargetCpa() {
        return targetCpa;
    }

    public void setTargetCpa(BigDecimal targetCpa) {
        this.targetCpa = targetCpa;
    }

    public Integer getMaxCreditsPerSemester() {
        return maxCreditsPerSemester;
    }

    public void setMaxCreditsPerSemester(Integer maxCreditsPerSemester) {
        this.maxCreditsPerSemester = maxCreditsPerSemester;
    }

    public Boolean getIncludeSummerSemesters() {
        return includeSummerSemesters;
    }

    public void setIncludeSummerSemesters(Boolean includeSummerSemesters) {
        this.includeSummerSemesters = includeSummerSemesters;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }
}
