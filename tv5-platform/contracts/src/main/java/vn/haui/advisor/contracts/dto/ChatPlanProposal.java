package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

public class ChatPlanProposal implements Serializable {
    private String proposalId;
    private String summary;
    private List<PlannedSemesterItem> suggestedSemesters;
    private BigDecimal projectedCpa;

    public ChatPlanProposal() {
    }

    public ChatPlanProposal(String proposalId, String summary, List<PlannedSemesterItem> suggestedSemesters, BigDecimal projectedCpa) {
        this.proposalId = proposalId;
        this.summary = summary;
        this.suggestedSemesters = suggestedSemesters;
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

    public List<PlannedSemesterItem> getSuggestedSemesters() {
        return suggestedSemesters;
    }

    public void setSuggestedSemesters(List<PlannedSemesterItem> suggestedSemesters) {
        this.suggestedSemesters = suggestedSemesters;
    }

    public BigDecimal getProjectedCpa() {
        return projectedCpa;
    }

    public void setProjectedCpa(BigDecimal projectedCpa) {
        this.projectedCpa = projectedCpa;
    }
}
