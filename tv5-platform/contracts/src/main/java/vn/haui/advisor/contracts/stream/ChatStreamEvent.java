package vn.haui.advisor.contracts.stream;

import com.fasterxml.jackson.annotation.JsonInclude;
import vn.haui.advisor.contracts.dto.ChatActionItem;
import vn.haui.advisor.contracts.dto.ChatPlanProposal;
import vn.haui.advisor.contracts.dto.ChatSourceItem;

import java.io.Serializable;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Event đại diện cho một sự kiện trong luồng Server-Sent Events (SSE) của Trợ lý Cố vấn Học vụ.
 * Hỗ trợ các pha: STATUS, TOOL_CALL, TOOL_RESULT, CITATION, CHUNK, DONE, ERROR.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChatStreamEvent implements Serializable {

    public enum EventType {
        STATUS,
        TOOL_CALL,
        TOOL_RESULT,
        CITATION,
        CHUNK,
        DONE,
        ERROR
    }

    private EventType eventType;
    private String phase;
    private String message;
    private String toolName;
    private Map<String, Object> toolArguments;
    private String text;
    private ChatPlanProposal proposal;
    private List<ChatSourceItem> sources;
    private List<ChatActionItem> actions;
    private List<String> warnings;
    private Map<String, Object> metrics;
    private String code;
    private Boolean retryable;

    public ChatStreamEvent() {
    }

    public ChatStreamEvent(EventType eventType) {
        this.eventType = eventType;
    }

    public static ChatStreamEvent status(String phase, String message) {
        ChatStreamEvent e = new ChatStreamEvent(EventType.STATUS);
        e.setPhase(phase);
        e.setMessage(message);
        return e;
    }

    public static ChatStreamEvent toolCall(String toolName, Map<String, Object> toolArguments) {
        ChatStreamEvent e = new ChatStreamEvent(EventType.TOOL_CALL);
        e.setToolName(toolName);
        e.setToolArguments(toolArguments);
        return e;
    }

    public static ChatStreamEvent toolResult(String toolName, String message, ChatPlanProposal proposal) {
        ChatStreamEvent e = new ChatStreamEvent(EventType.TOOL_RESULT);
        e.setToolName(toolName);
        e.setMessage(message);
        e.setProposal(proposal);
        return e;
    }

    public static ChatStreamEvent citation(List<ChatSourceItem> sources) {
        ChatStreamEvent e = new ChatStreamEvent(EventType.CITATION);
        e.setSources(sources);
        return e;
    }

    public static ChatStreamEvent chunk(String text) {
        ChatStreamEvent e = new ChatStreamEvent(EventType.CHUNK);
        e.setText(text);
        return e;
    }

    public static ChatStreamEvent done(String text,
                                       List<ChatSourceItem> sources,
                                       List<ChatActionItem> actions,
                                       ChatPlanProposal proposal,
                                       List<String> warnings,
                                       Map<String, Object> metrics) {
        ChatStreamEvent e = new ChatStreamEvent(EventType.DONE);
        e.setText(text);
        e.setSources(sources);
        e.setActions(actions);
        e.setProposal(proposal);
        e.setWarnings(warnings);
        e.setMetrics(metrics);
        return e;
    }

    public static ChatStreamEvent error(String code, String message, boolean retryable) {
        ChatStreamEvent e = new ChatStreamEvent(EventType.ERROR);
        e.setCode(code);
        e.setMessage(message);
        e.setRetryable(retryable);
        return e;
    }

    public EventType getEventType() {
        return eventType;
    }

    public void setEventType(EventType eventType) {
        this.eventType = eventType;
    }

    public String getPhase() {
        return phase;
    }

    public void setPhase(String phase) {
        this.phase = phase;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getToolName() {
        return toolName;
    }

    public void setToolName(String toolName) {
        this.toolName = toolName;
    }

    public Map<String, Object> getToolArguments() {
        return toolArguments;
    }

    public void setToolArguments(Map<String, Object> toolArguments) {
        this.toolArguments = toolArguments;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public ChatPlanProposal getProposal() {
        return proposal;
    }

    public void setProposal(ChatPlanProposal proposal) {
        this.proposal = proposal;
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

    public List<String> getWarnings() {
        return warnings;
    }

    public void setWarnings(List<String> warnings) {
        this.warnings = warnings;
    }

    public Map<String, Object> getMetrics() {
        return metrics;
    }

    public void setMetrics(Map<String, Object> metrics) {
        this.metrics = metrics;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public Boolean getRetryable() {
        return retryable;
    }

    public void setRetryable(Boolean retryable) {
        this.retryable = retryable;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ChatStreamEvent that = (ChatStreamEvent) o;
        return eventType == that.eventType &&
                Objects.equals(phase, that.phase) &&
                Objects.equals(message, that.message) &&
                Objects.equals(toolName, that.toolName) &&
                Objects.equals(text, that.text) &&
                Objects.equals(code, that.code);
    }

    @Override
    public int hashCode() {
        return Objects.hash(eventType, phase, message, toolName, text, code);
    }

    @Override
    public String toString() {
        return "ChatStreamEvent{" +
                "eventType=" + eventType +
                ", phase='" + phase + '\'' +
                ", message='" + message + '\'' +
                ", toolName='" + toolName + '\'' +
                ", text='" + (text != null ? (text.length() > 30 ? text.substring(0, 30) + "..." : text) : null) + '\'' +
                ", code='" + code + '\'' +
                '}';
    }
}

