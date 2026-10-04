package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

public class ChatActionItem implements Serializable {
    private String actionType;
    private String label;
    private String targetRoute;
    private String payloadJson;
    private String description;
    private Integer priority;

    public ChatActionItem() {
    }

    public ChatActionItem(String actionType, String label, String targetRoute, String payloadJson) {
        this.actionType = actionType;
        this.label = label;
        this.targetRoute = targetRoute;
        this.payloadJson = payloadJson;
    }

    public ChatActionItem(String actionType, String label, String targetRoute, String payloadJson,
                          String description, Integer priority) {
        this.actionType = actionType;
        this.label = label;
        this.targetRoute = targetRoute;
        this.payloadJson = payloadJson;
        this.description = description;
        this.priority = priority;
    }

    public String getDescription() {
        return description != null ? description : label;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getPriority() {
        return priority;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }

    public String getActionType() {
        return actionType;
    }

    public void setActionType(String actionType) {
        this.actionType = actionType;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String getTargetRoute() {
        return targetRoute;
    }

    public void setTargetRoute(String targetRoute) {
        this.targetRoute = targetRoute;
    }

    public String getPayloadJson() {
        return payloadJson;
    }

    public void setPayloadJson(String payloadJson) {
        this.payloadJson = payloadJson;
    }
}
