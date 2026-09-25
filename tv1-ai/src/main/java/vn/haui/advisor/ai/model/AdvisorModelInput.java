package vn.haui.advisor.ai.model;

import vn.haui.advisor.contracts.dto.TrustedStudentContext;

import java.io.Serializable;
import java.util.Collections;
import java.util.Map;

/**
 * Đầu vào cho abstraction AdvisorModel.
 * Chứa tin nhắn người dùng, danh tính sinh viên tin cậy từ server context, và kết quả từ ToolAdapter.
 */
public class AdvisorModelInput implements Serializable {
    private final String userMessage;
    private final TrustedStudentContext studentContext;
    private final Map<String, Object> toolResults;

    public AdvisorModelInput(String userMessage, TrustedStudentContext studentContext, Map<String, Object> toolResults) {
        this.userMessage = userMessage;
        this.studentContext = studentContext;
        this.toolResults = toolResults != null ? Collections.unmodifiableMap(toolResults) : Collections.emptyMap();
    }

    public String getUserMessage() {
        return userMessage;
    }

    public TrustedStudentContext getStudentContext() {
        return studentContext;
    }

    public Map<String, Object> getToolResults() {
        return toolResults;
    }
}
