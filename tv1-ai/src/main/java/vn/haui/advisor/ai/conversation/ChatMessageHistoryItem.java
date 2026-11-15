package vn.haui.advisor.ai.conversation;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import vn.haui.advisor.contracts.dto.ChatActionItem;
import vn.haui.advisor.contracts.dto.ChatSourceItem;

import java.io.Serializable;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Mục lưu trữ từng tin nhắn trong lịch sử hội thoại nhiều lượt.
 * Sử dụng Jackson annotations để tuần tự hoá và giải tuần tự hoá an toàn.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class ChatMessageHistoryItem implements Serializable {

    public static final String QUARANTINED_TOMBSTONE =
            "[Nội dung phản hồi này không đạt chuẩn căn cứ học vụ và đã được cách ly để tránh sai lệch thông tin]";

    @JsonProperty("role")
    private String role;

    @JsonProperty("content")
    private String content;

    @JsonProperty("timestamp")
    private String timestamp;

    @JsonProperty("clientTimestamp")
    // shortcut: deduplicate retained turns by the client timestamp and text; use request IDs if clients can send identical turns in the same millisecond.
    private String clientTimestamp;

    @JsonProperty("sources")
    private List<ChatSourceItem> sources;

    @JsonProperty("actions")
    private List<ChatActionItem> actions;

    @JsonProperty("proposalId")
    private String proposalId;

    @JsonProperty("warnings")
    private List<String> warnings;

    @JsonProperty("quarantined")
    private Boolean quarantined;

    public ChatMessageHistoryItem() {
        this.sources = new ArrayList<>();
        this.actions = new ArrayList<>();
        this.warnings = new ArrayList<>();
    }

    public ChatMessageHistoryItem(String role,
                                  String content,
                                  String timestamp,
                                  List<ChatSourceItem> sources,
                                  List<ChatActionItem> actions,
                                  String proposalId,
                                  List<String> warnings) {
        this.role = role;
        this.content = content;
        this.timestamp = timestamp != null ? timestamp : Instant.now().toString();
        this.sources = sources != null ? new ArrayList<>(sources) : new ArrayList<>();
        this.actions = actions != null ? new ArrayList<>(actions) : new ArrayList<>();
        this.proposalId = proposalId;
        this.warnings = warnings != null ? new ArrayList<>(warnings) : new ArrayList<>();
    }

    public static ChatMessageHistoryItem ofUser(String content) {
        return new ChatMessageHistoryItem("user", content, Instant.now().toString(), List.of(), List.of(), null, List.of());
    }

    public static ChatMessageHistoryItem ofUser(String content, String clientTimestamp) {
        var item = ofUser(content);
        if (clientTimestamp != null && clientTimestamp.length() <= 64) {
            try {
                item.clientTimestamp = Instant.parse(clientTimestamp).toString();
            } catch (java.time.format.DateTimeParseException ignored) {
                // Older clients can omit the timestamp or send a non-ISO value.
            }
        }
        return item;
    }

    public static ChatMessageHistoryItem ofAssistant(String content,
                                                     List<ChatSourceItem> sources,
                                                     List<ChatActionItem> actions,
                                                     String proposalId,
                                                     List<String> warnings) {
        return new ChatMessageHistoryItem("assistant", content, Instant.now().toString(), sources, actions, proposalId, warnings);
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    public List<ChatSourceItem> getSources() {
        return sources;
    }

    public void setSources(List<ChatSourceItem> sources) {
        this.sources = sources != null ? new ArrayList<>(sources) : new ArrayList<>();
    }

    public List<ChatActionItem> getActions() {
        return actions;
    }

    public void setActions(List<ChatActionItem> actions) {
        this.actions = actions != null ? new ArrayList<>(actions) : new ArrayList<>();
    }

    public String getProposalId() {
        return proposalId;
    }

    public void setProposalId(String proposalId) {
        this.proposalId = proposalId;
    }

    public List<String> getWarnings() {
        return warnings;
    }

    public void setWarnings(List<String> warnings) {
        this.warnings = warnings != null ? new ArrayList<>(warnings) : new ArrayList<>();
    }

    public boolean isQuarantined() {
        return Boolean.TRUE.equals(quarantined);
    }

    public void setQuarantined(Boolean quarantined) {
        this.quarantined = quarantined;
    }
}
