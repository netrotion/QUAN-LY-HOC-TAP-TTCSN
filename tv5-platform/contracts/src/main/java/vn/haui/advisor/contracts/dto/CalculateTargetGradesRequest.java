package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.math.BigDecimal;

public class CalculateTargetGradesRequest implements Serializable {
    private String studentId;
    private BigDecimal targetCpa;
    private String targetGraduationSemester;
    private String dataRevision;

    public CalculateTargetGradesRequest() {
    }

    public CalculateTargetGradesRequest(String studentId, BigDecimal targetCpa,
                                       String targetGraduationSemester, String dataRevision) {
        this.studentId = studentId;
        this.targetCpa = targetCpa;
        this.targetGraduationSemester = targetGraduationSemester;
        this.dataRevision = dataRevision;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public BigDecimal getTargetCpa() {
        return targetCpa;
    }

    public void setTargetCpa(BigDecimal targetCpa) {
        this.targetCpa = targetCpa;
    }

    public String getTargetGraduationSemester() {
        return targetGraduationSemester;
    }

    public void setTargetGraduationSemester(String targetGraduationSemester) {
        this.targetGraduationSemester = targetGraduationSemester;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }
}
