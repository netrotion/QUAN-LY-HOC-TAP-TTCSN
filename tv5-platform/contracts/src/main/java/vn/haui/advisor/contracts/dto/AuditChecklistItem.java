package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

public class AuditChecklistItem implements Serializable {
    private String category;
    private String name;
    private boolean completed;
    private Integer requiredCredits;
    private Integer earnedCredits;
    private String statusMessage;

    public AuditChecklistItem() {
    }

    public AuditChecklistItem(String category, String name, boolean completed,
                              Integer requiredCredits, Integer earnedCredits, String statusMessage) {
        this.category = category;
        this.name = name;
        this.completed = completed;
        this.requiredCredits = requiredCredits;
        this.earnedCredits = earnedCredits;
        this.statusMessage = statusMessage;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public boolean isCompleted() {
        return completed;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }

    public Integer getRequiredCredits() {
        return requiredCredits;
    }

    public void setRequiredCredits(Integer requiredCredits) {
        this.requiredCredits = requiredCredits;
    }

    public Integer getEarnedCredits() {
        return earnedCredits;
    }

    public void setEarnedCredits(Integer earnedCredits) {
        this.earnedCredits = earnedCredits;
    }

    public String getStatusMessage() {
        return statusMessage;
    }

    public void setStatusMessage(String statusMessage) {
        this.statusMessage = statusMessage;
    }
}
