package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.math.BigDecimal;

public class SimulateGradesResponse implements Serializable {
    private String studentId;
    private BigDecimal currentCpa;
    private BigDecimal projectedSemesterGpa;
    private BigDecimal projectedNewCpa;
    private BigDecimal cpaDifference;
    private String dataRevision;

    public SimulateGradesResponse() {
    }

    public SimulateGradesResponse(String studentId, BigDecimal currentCpa, BigDecimal projectedSemesterGpa,
                                  BigDecimal projectedNewCpa, BigDecimal cpaDifference, String dataRevision) {
        this.studentId = studentId;
        this.currentCpa = currentCpa;
        this.projectedSemesterGpa = projectedSemesterGpa;
        this.projectedNewCpa = projectedNewCpa;
        this.cpaDifference = cpaDifference;
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

    public BigDecimal getProjectedSemesterGpa() {
        return projectedSemesterGpa;
    }

    public void setProjectedSemesterGpa(BigDecimal projectedSemesterGpa) {
        this.projectedSemesterGpa = projectedSemesterGpa;
    }

    public BigDecimal getProjectedNewCpa() {
        return projectedNewCpa;
    }

    public void setProjectedNewCpa(BigDecimal projectedNewCpa) {
        this.projectedNewCpa = projectedNewCpa;
    }

    public BigDecimal getCpaDifference() {
        return cpaDifference;
    }

    public void setCpaDifference(BigDecimal cpaDifference) {
        this.cpaDifference = cpaDifference;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }
}
