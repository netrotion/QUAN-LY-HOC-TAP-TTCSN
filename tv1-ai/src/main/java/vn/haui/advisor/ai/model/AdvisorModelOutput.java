package vn.haui.advisor.ai.model;

import vn.haui.advisor.contracts.dto.ChatActionItem;
import vn.haui.advisor.contracts.dto.ChatPlanProposal;
import vn.haui.advisor.contracts.dto.ChatSourceItem;

import java.io.Serializable;
import java.util.Collections;
import java.util.List;

/**
 * Đầu ra từ abstraction AdvisorModel.
 * Chứa câu trả lời, nguồn trích dẫn, hành động gợi ý, đề xuất kế hoạch (nếu có) và danh sách cảnh báo.
 */
public class AdvisorModelOutput implements Serializable {
    private final String answer;
    private final List<ChatSourceItem> sources;
    private final List<ChatActionItem> actions;
    private final ChatPlanProposal planProposal;
    private final List<String> warnings;

    public AdvisorModelOutput(String answer, List<ChatSourceItem> sources, List<ChatActionItem> actions,
                              ChatPlanProposal planProposal, List<String> warnings) {
        this.answer = answer;
        this.sources = sources != null ? Collections.unmodifiableList(sources) : Collections.emptyList();
        this.actions = actions != null ? Collections.unmodifiableList(actions) : Collections.emptyList();
        this.planProposal = planProposal;
        this.warnings = warnings != null ? Collections.unmodifiableList(warnings) : Collections.emptyList();
    }

    public String getAnswer() {
        return answer;
    }

    public List<ChatSourceItem> getSources() {
        return sources;
    }

    public List<ChatActionItem> getActions() {
        return actions;
    }

    public ChatPlanProposal getPlanProposal() {
        return planProposal;
    }

    public List<String> getWarnings() {
        return warnings;
    }
}
