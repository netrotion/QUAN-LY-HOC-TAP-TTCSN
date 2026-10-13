package vn.haui.advisor.contracts.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;

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
    private List<String> warnings;
    private String dataRevision;

    public AcademicStatusResponse() {
    }

    public AcademicStatusResponse(String studentId, BigDecimal gpa, BigDecimal cpa, Integer accumulatedCredits,
                                  Integer totalCreditsRequired, AcademicRiskLevel riskLevel,
                                  List<String> warnings, String dataRevision) {
        this.studentId = studentId;
        this.gpa = gpa;
        this.cpa = cpa;
        this.accumulatedCredits = accumulatedCredits;
        this.totalCreditsRequired = totalCreditsRequired;
        this.riskLevel = riskLevel;
        this.warnings = warnings;
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

    public List<String> getWarnings() {
        return warnings;
    }

    public void setWarnings(List<String> warnings) {
        this.warnings = warnings;
    }

    /**
     * Accessor chuyển tiếp cho mã nguồn dùng tên V0; JSON chỉ có trường {@code warnings}.
     *
     * @deprecated dùng {@link #getWarnings()}.
     */
    @Deprecated(since = "1.0.0", forRemoval = true)
    @JsonIgnore
    public List<String> getWarningMessages() {
        return warnings;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }
}
