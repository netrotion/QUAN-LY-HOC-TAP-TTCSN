package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.util.List;

public class ChatResponse implements Serializable {
    private String answer;
    private List<ChatSourceItem> sources;
    private List<ChatActionItem> actions;
    private ChatPlanProposal planProposal;
    private List<String> warnings;

    public ChatResponse() {
    }

    public ChatResponse(String answer, List<ChatSourceItem> sources, List<ChatActionItem> actions,
                        ChatPlanProposal planProposal, List<String> warnings) {
        this.answer = answer;
        this.sources = sources;
        this.actions = actions;
        this.planProposal = planProposal;
        this.warnings = warnings;
    }

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }

    public List<ChatSourceItem> getSources() {
        return sources;
    }

    public void setSources(List<ChatSourceItem> sources) {
        this.sources = sources;
    }

    public List<ChatActionItem> getActions() {
        return actions;
    }

    public void setActions(List<ChatActionItem> actions) {
        this.actions = actions;
    }

    public ChatPlanProposal getPlanProposal() {
        return planProposal;
    }

    public void setPlanProposal(ChatPlanProposal planProposal) {
        this.planProposal = planProposal;
    }

    public List<String> getWarnings() {
        return warnings;
    }

    public void setWarnings(List<String> warnings) {
        this.warnings = warnings;
    }
}
