package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

public class ChatActionItem implements Serializable {
    private String actionType;
    private String label;
    private String targetRoute;
    private String payloadJson;

    public ChatActionItem() {
    }

    public ChatActionItem(String actionType, String label, String targetRoute, String payloadJson) {
        this.actionType = actionType;
        this.label = label;
        this.targetRoute = targetRoute;
        this.payloadJson = payloadJson;
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
