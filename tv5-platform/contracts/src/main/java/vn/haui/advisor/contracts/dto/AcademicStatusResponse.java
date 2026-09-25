package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

public class AcademicStatusResponse implements Serializable {
    private String studentId;
    private BigDecimal gpa;
    private BigDecimal cpa;
    private Integer accumulatedCredits;
    private Integer totalCreditsRequired;
    private AcademicRiskLevel riskLevel;
    private List<String> warningMessages;
    private String dataRevision;

    public AcademicStatusResponse() {
    }

    public AcademicStatusResponse(String studentId, BigDecimal gpa, BigDecimal cpa, Integer accumulatedCredits,
                                  Integer totalCreditsRequired, AcademicRiskLevel riskLevel,
                                  List<String> warningMessages, String dataRevision) {
        this.studentId = studentId;
        this.gpa = gpa;
        this.cpa = cpa;
        this.accumulatedCredits = accumulatedCredits;
        this.totalCreditsRequired = totalCreditsRequired;
        this.riskLevel = riskLevel;
        this.warningMessages = warningMessages;
        this.dataRevision = dataRevision;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public BigDecimal getGpa() {
        return gpa;
    }

    public void setGpa(BigDecimal gpa) {
        this.gpa = gpa;
    }

    public BigDecimal getCpa() {
        return cpa;
    }

    public void setCpa(BigDecimal cpa) {
        this.cpa = cpa;
    }

    public Integer getAccumulatedCredits() {
        return accumulatedCredits;
    }

    public void setAccumulatedCredits(Integer accumulatedCredits) {
        this.accumulatedCredits = accumulatedCredits;
    }

    public Integer getTotalCreditsRequired() {
        return totalCreditsRequired;
    }

    public void setTotalCreditsRequired(Integer totalCreditsRequired) {
        this.totalCreditsRequired = totalCreditsRequired;
    }

    public AcademicRiskLevel getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(AcademicRiskLevel riskLevel) {
        this.riskLevel = riskLevel;
    }

    public List<String> getWarningMessages() {
        return warningMessages;
    }

    public void setWarningMessages(List<String> warningMessages) {
        this.warningMessages = warningMessages;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }
}
