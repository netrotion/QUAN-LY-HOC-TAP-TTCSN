package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

public class AuditChecklistItem implements Serializable {
    private String category;
    private String name;
    private boolean completed;
    private Integer totalCreditsRequired;
    private Integer accumulatedCredits;
    private String statusMessage;

    public AuditChecklistItem() {
    }

    public AuditChecklistItem(String category, String name, boolean completed,
                              Integer totalCreditsRequired, Integer accumulatedCredits, String statusMessage) {
        this.category = category;
        this.name = name;
        this.completed = completed;
        this.totalCreditsRequired = totalCreditsRequired;
        this.accumulatedCredits = accumulatedCredits;
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

    public Integer getTotalCreditsRequired() {
        return totalCreditsRequired;
    }

    public void setTotalCreditsRequired(Integer totalCreditsRequired) {
        this.totalCreditsRequired = totalCreditsRequired;
    }

    public Integer getAccumulatedCredits() {
        return accumulatedCredits;
    }

    public void setAccumulatedCredits(Integer accumulatedCredits) {
        this.accumulatedCredits = accumulatedCredits;
    }

    public String getStatusMessage() {
        return statusMessage;
    }

    public void setStatusMessage(String statusMessage) {
        this.statusMessage = statusMessage;
    }
}
