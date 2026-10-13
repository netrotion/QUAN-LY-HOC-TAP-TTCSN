package vn.haui.advisor.contracts.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

public class ChatPlanProposal implements Serializable {
    private String proposalId;
    private String summary;
    private List<PlannedSemesterItem> semesters;
    private BigDecimal projectedCpa;

    public ChatPlanProposal() {
    }

    public ChatPlanProposal(String proposalId, String summary, List<PlannedSemesterItem> semesters, BigDecimal projectedCpa) {
        this.proposalId = proposalId;
        this.summary = summary;
        this.semesters = semesters;
        this.projectedCpa = projectedCpa;
    }

    public String getProposalId() {
        return proposalId;
    }

    public void setProposalId(String proposalId) {
        this.proposalId = proposalId;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public List<PlannedSemesterItem> getSemesters() {
        return semesters;
    }

    public void setSemesters(List<PlannedSemesterItem> semesters) {
        this.semesters = semesters;
    }

    public BigDecimal getProjectedCpa() {
        return projectedCpa;
    }

    public void setProjectedCpa(BigDecimal projectedCpa) {
        this.projectedCpa = projectedCpa;
    }

    /**
     * Accessor chuyển tiếp cho mã nguồn dùng tên V0; JSON chỉ có trường {@code semesters}.
     *
     * @deprecated dùng {@link #getSemesters()}.
     */
    @Deprecated(since = "1.0.0", forRemoval = true)
    @JsonIgnore
    public List<PlannedSemesterItem> getSuggestedSemesters() {
        return getSemesters();
    }
}
