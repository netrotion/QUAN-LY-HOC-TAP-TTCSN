package vn.haui.advisor.contracts.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.io.Serializable;
import java.math.BigDecimal;

public class SimulateGradesResponse implements Serializable {
    private String studentId;
    private BigDecimal currentCpa;
    private BigDecimal expectedGpa;
    private BigDecimal projectedCpa;
    private BigDecimal cpaDelta;
    private String dataRevision;
    private String policyVersion;

    public SimulateGradesResponse() {
    }

    public SimulateGradesResponse(String studentId, BigDecimal currentCpa, BigDecimal expectedGpa,
                                  BigDecimal projectedCpa, BigDecimal cpaDelta, String dataRevision) {
        this.studentId = studentId;
        this.currentCpa = currentCpa;
        this.expectedGpa = expectedGpa;
        this.projectedCpa = projectedCpa;
        this.cpaDelta = cpaDelta;
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

    public BigDecimal getExpectedGpa() {
        return expectedGpa;
    }

    public void setExpectedGpa(BigDecimal expectedGpa) {
        this.expectedGpa = expectedGpa;
    }

    public BigDecimal getProjectedCpa() {
        return projectedCpa;
    }

    public void setProjectedCpa(BigDecimal projectedCpa) {
        this.projectedCpa = projectedCpa;
    }

    public BigDecimal getCpaDelta() {
        return cpaDelta;
    }

    public void setCpaDelta(BigDecimal cpaDelta) {
        this.cpaDelta = cpaDelta;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }

    /**
     * Accessor chuyển tiếp cho mã nguồn dùng tên V0; JSON chỉ có trường {@code expectedGpa}.
     *
     * @deprecated dùng {@link #getExpectedGpa()}.
     */
    @Deprecated(since = "1.0.0", forRemoval = true)
    @JsonIgnore
    public BigDecimal getProjectedSemesterGpa() {
        return getExpectedGpa();
    }

    /**
     * Accessor chuyển tiếp cho mã nguồn dùng tên V0; JSON chỉ có trường {@code projectedCpa}.
     *
     * @deprecated dùng {@link #getProjectedCpa()}.
     */
    @Deprecated(since = "1.0.0", forRemoval = true)
    @JsonIgnore
    public BigDecimal getProjectedNewCpa() {
        return getProjectedCpa();
    }

    /**
     * Accessor chuyển tiếp cho mã nguồn dùng tên V0; JSON chỉ có trường {@code cpaDelta}.
     *
     * @deprecated dùng {@link #getCpaDelta()}.
     */
    @Deprecated(since = "1.0.0", forRemoval = true)
    @JsonIgnore
    public BigDecimal getCpaDifference() {
        return getCpaDelta();
    }

    public String getPolicyVersion() {
        return policyVersion;
    }

    public void setPolicyVersion(String policyVersion) {
        this.policyVersion = policyVersion;
    }
}
