package vn.haui.advisor.ai.grounding;

import org.springframework.stereotype.Component;
import vn.haui.advisor.ai.model.AdvisorModelInput;
import vn.haui.advisor.ai.model.AdvisorModelOutput;
import vn.haui.advisor.ai.rag.model.RagChunk;
import vn.haui.advisor.ai.rag.service.GroundedContext;
import vn.haui.advisor.contracts.dto.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Thẩm định tính chuẩn xác và neo dẫn chứng (Grounding Guardrail) cho câu trả lời của AdvisorModel:
 * 1. Kiểm tra tính toàn vẹn của trích dẫn (ChatSourceItem): mọi nguồn trích dẫn bắt buộc phải tồn tại
 *    trong retrieved evidence chunks. Nếu không có chứng cứ (hasEvidence == false), danh mục nguồn phải rỗng.
 *    Bất kỳ nguồn trích dẫn không được neo (bịa đặt như REG-HAUI-99) sẽ bị loại bỏ và ghi nhận cảnh báo.
 * 2. Kiểm tra allowlist hành động (ChatActionItem): actionType và target route phải thuộc danh mục cho phép.
 * 3. Bảo toàn tính toàn vẹn toán học và số liệu học vụ (Mathematical Integrity): bảo toàn CPA, GPA,
 *    tín chỉ tích lũy từ kết quả của công cụ (AcademicFacade/ToolAdapter), ngăn chặn LLM ghi đè hoặc bịa số liệu.
 */
@Component
public class ResponseGroundingValidator {

    public static final Set<String> ALLOWED_ACTION_TYPES = Set.of(
            "NAVIGATE",
            "OPEN_PLANNER",
            "OPEN_WHAT_IF",
            "OPEN_AUDIT",
            "OPEN_TRANSCRIPT_IMPORT"
    );

    public static final Set<String> ALLOWED_ROUTES = Set.of(
            "/planner",
            "/what-if",
            "/simulator",
            "/audit",
            "/transcript",
            "/progress",
            "/curriculum",
            "/dashboard",
            "/academic/rules",
            "/academic/transcript",
            "/academic/audit",
            "/academic/import",
            "/academic"
    );

    private static final Pattern CPA_MENTION_PATTERN = Pattern.compile(
            "(?i)\\b(?:cpa|điểm tích lũy)[^\\d\\n.]{0,35}?(\\d+[.,]\\d+)"
    );

    private static final Pattern GPA_MENTION_PATTERN = Pattern.compile(
            "(?i)\\b(?:gpa|điểm trung bình học kỳ)[^\\d\\n.]{0,35}?(\\d+[.,]\\d+)"
    );

    private static final Pattern CREDITS_MENTION_PATTERN = Pattern.compile(
            "(?i)\\b(?:tích lũy|hoàn thành|được|có)[^\\d\\n.]{0,35}?(\\d+)\\s*(?:tín chỉ|tc)"
    );

    private static final Pattern PROJECTED_CPA_PATTERN = Pattern.compile(
            "(?i)\\b(?:cpa dự kiến|dự kiến cpa|cpa mới)[^\\d\\n.]{0,35}?(\\d+[.,]\\d+)"
    );

    public ResponseGroundingValidator() {
    }

    /**
     * Thẩm định toàn diện kết quả thô từ AdvisorModel.
     */
    public AdvisorModelOutput validate(AdvisorModelOutput rawOutput, AdvisorModelInput input) {
        if (input == null) {
            return validate(rawOutput, null, Collections.emptyMap());
        }
        return validate(rawOutput, input.getGroundedContext(), input.getToolResults());
    }

    /**
     * Thẩm định chi tiết kết quả thô cùng GroundedContext và toolResults.
     */
    public AdvisorModelOutput validate(AdvisorModelOutput rawOutput,
                                       GroundedContext groundedContext,
                                       Map<String, Object> toolResults) {
        if (rawOutput == null) {
            return new AdvisorModelOutput(
                    "Không có phản hồi từ mô hình tư vấn.",
                    List.of(),
                    List.of(),
                    null,
                    List.of("VALIDATION_ERROR: Null model output")
            );
        }

        List<String> validatedWarnings = new ArrayList<>(rawOutput.getWarnings() != null ? rawOutput.getWarnings() : List.of());

        // 1. Thẩm định trích dẫn RAG
        List<ChatSourceItem> validatedSources = validateSources(rawOutput.getSources(), groundedContext, validatedWarnings);

        // 2. Thẩm định hành động giao diện (Allowlist Actions & Routes)
        List<ChatActionItem> validatedActions = validateActions(rawOutput.getActions(), validatedWarnings);

        // 3. Thẩm định và bảo toàn tính toàn vẹn số liệu học vụ (CPA, GPA, tín chỉ)
        String validatedAnswer = enforceNumericalIntegrity(rawOutput.getAnswer(), toolResults, validatedWarnings);

        return new AdvisorModelOutput(
                validatedAnswer,
                validatedSources,
                validatedActions,
                rawOutput.getPlanProposal(),
                validatedWarnings
        );
    }

    /**
     * Xác thực các nguồn trích dẫn: Bắt buộc tồn tại trong retrieved evidence chunks.
     */
    public List<ChatSourceItem> validateSources(List<ChatSourceItem> rawSources,
                                                GroundedContext groundedContext,
                                                List<String> warnings) {
        if (rawSources == null || rawSources.isEmpty()) {
            return Collections.emptyList();
        }

        // Nếu không có groundedContext (legacy bootstrap/unit tests không dùng RAG), bảo toàn rawSources
        if (groundedContext == null) {
            return rawSources;
        }

        // Nếu có groundedContext nhưng không có evidence, toàn bộ sources phải rỗng
        if (!groundedContext.hasEvidence()) {
            for (ChatSourceItem s : rawSources) {
                String srcId = (s != null && s.getSourceId() != null) ? s.getSourceId() : "UNKNOWN";
                warnings.add("UNGROUNDED_CITATION_STRIPPED: Source " + srcId + " is not in retrieved evidence");
            }
            return Collections.emptyList();
        }

        Set<String> validSources = new HashSet<>();
        if (groundedContext.getEvidenceChunks() != null) {
            for (RagChunk chunk : groundedContext.getEvidenceChunks()) {
                if (chunk.getSourceId() != null) {
                    validSources.add(chunk.getSourceId());
                }
            }
        }

        List<ChatSourceItem> validated = new ArrayList<>();
        for (ChatSourceItem source : rawSources) {
            if (source != null && source.getSourceId() != null && validSources.contains(source.getSourceId())) {
                validated.add(source);
            } else {
                String srcId = (source != null && source.getSourceId() != null) ? source.getSourceId() : "UNKNOWN";
                warnings.add("UNGROUNDED_CITATION_STRIPPED: Source " + srcId + " is not in retrieved evidence");
            }
        }
        return validated;
    }

    /**
     * Xác thực các hành động gợi ý: actionType và route phải nằm trong allowlist.
     */
    public List<ChatActionItem> validateActions(List<ChatActionItem> rawActions, List<String> warnings) {
        if (rawActions == null || rawActions.isEmpty()) {
            return Collections.emptyList();
        }

        List<ChatActionItem> validated = new ArrayList<>();
        for (ChatActionItem action : rawActions) {
            if (action == null) {
                continue;
            }

            String actionType = action.getActionType();
            String target = action.getTargetRoute();

            if (actionType == null || !ALLOWED_ACTION_TYPES.contains(actionType.toUpperCase(Locale.ROOT))) {
                warnings.add("UNGROUNDED_ACTION_STRIPPED: Action type " + actionType + " is not permitted");
                continue;
            }

            if (target == null || !isAllowedRoute(target)) {
                warnings.add("UNGROUNDED_ACTION_STRIPPED: Route " + target + " is not permitted");
                continue;
            }

            validated.add(action);
        }
        return validated;
    }

    /**
     * Bảo toàn tính toàn vẹn số liệu học vụ authoritative từ ToolAdapter / AcademicFacade.
     * Ngăn chặn việc câu trả lời ghi đè hoặc cung cấp số liệu sai lệch so với dữ liệu gốc.
     */
    public String enforceNumericalIntegrity(String rawAnswer,
                                            Map<String, Object> toolResults,
                                            List<String> warnings) {
        if (rawAnswer == null || toolResults == null || toolResults.isEmpty()) {
            return rawAnswer != null ? rawAnswer : "";
        }

        String answer = rawAnswer;

        // 1. Kiểm tra và bảo toàn CPA authoritative (hiện tại)
        BigDecimal authoritativeCpa = extractAuthoritativeCpa(toolResults);
        if (authoritativeCpa != null) {
            Matcher m = CPA_MENTION_PATTERN.matcher(answer);
            if (m.find()) {
                String prefix = answer.substring(m.start(), m.start(1)).toLowerCase();
                // Không nhầm lẫn giữa CPA hiện tại và CPA dự kiến / mục tiêu hoặc ngưỡng quy chế
                if (!prefix.contains("dự kiến") && !prefix.contains("mục tiêu") && !prefix.contains("mới")
                        && !prefix.contains("ngưỡng") && !prefix.contains("mức") && !prefix.contains("dưới") && !prefix.contains("tối thiểu")) {
                    String matchedStr = m.group(1).replace(',', '.');
                    try {
                        BigDecimal matchedVal = new BigDecimal(matchedStr);
                        if (matchedVal.compareTo(authoritativeCpa) != 0) {
                            String replacement = authoritativeCpa.toPlainString();
                            answer = answer.substring(0, m.start(1)) + replacement + answer.substring(m.end(1));
                            warnings.add("NUMERICAL_OVERWRITE_PREVENTED: Overwritten CPA " + matchedStr + " to authoritative " + replacement);
                        }
                    } catch (NumberFormatException ignored) {
                    }
                }
            }
        }

        // 2. Kiểm tra và bảo toàn GPA authoritative
        BigDecimal authoritativeGpa = extractAuthoritativeGpa(toolResults);
        if (authoritativeGpa != null) {
            Matcher m = GPA_MENTION_PATTERN.matcher(answer);
            if (m.find()) {
                String prefix = answer.substring(m.start(), m.start(1)).toLowerCase();
                if (!prefix.contains("dự kiến") && !prefix.contains("mục tiêu") && !prefix.contains("mới")
                        && !prefix.contains("ngưỡng") && !prefix.contains("mức") && !prefix.contains("dưới") && !prefix.contains("tối thiểu")) {
                    String matchedStr = m.group(1).replace(',', '.');
                    try {
                        BigDecimal matchedVal = new BigDecimal(matchedStr);
                        if (matchedVal.compareTo(authoritativeGpa) != 0) {
                            String replacement = authoritativeGpa.toPlainString();
                            answer = answer.substring(0, m.start(1)) + replacement + answer.substring(m.end(1));
                            warnings.add("NUMERICAL_OVERWRITE_PREVENTED: Overwritten GPA " + matchedStr + " to authoritative " + replacement);
                        }
                    } catch (NumberFormatException ignored) {
                    }
                }
            }
        }

        // 3. Kiểm tra và bảo toàn tín chỉ tích lũy authoritative
        Integer authoritativeCredits = extractAuthoritativeCredits(toolResults);
        if (authoritativeCredits != null) {
            Matcher m = CREDITS_MENTION_PATTERN.matcher(answer);
            if (m.find()) {
                String prefix = answer.substring(m.start(), m.start(1)).toLowerCase();
                if (!prefix.contains("tối đa") && !prefix.contains("tối thiểu") && !prefix.contains("đăng ký") && !prefix.contains("học kỳ")) {
                    String matchedStr = m.group(1);
                    try {
                        int matchedVal = Integer.parseInt(matchedStr);
                        if (matchedVal != authoritativeCredits) {
                            String replacement = String.valueOf(authoritativeCredits);
                            answer = answer.substring(0, m.start(1)) + replacement + answer.substring(m.end(1));
                            warnings.add("NUMERICAL_OVERWRITE_PREVENTED: Overwritten credits " + matchedStr + " to authoritative " + replacement);
                        }
                    } catch (NumberFormatException ignored) {
                    }
                }
            }
        }

        // 4. Kiểm tra projected CPA từ planProposal hoặc simulateGrades
        BigDecimal projectedCpa = extractProjectedCpa(toolResults);
        if (projectedCpa != null) {
            Matcher m = PROJECTED_CPA_PATTERN.matcher(answer);
            if (m.find()) {
                String matchedStr = m.group(1).replace(',', '.');
                try {
                    BigDecimal matchedVal = new BigDecimal(matchedStr);
                    if (matchedVal.compareTo(projectedCpa) != 0) {
                        String replacement = projectedCpa.toPlainString();
                        answer = answer.substring(0, m.start(1)) + replacement + answer.substring(m.end(1));
                        warnings.add("NUMERICAL_OVERWRITE_PREVENTED: Overwritten projected CPA " + matchedStr + " to authoritative " + replacement);
                    }
                } catch (NumberFormatException ignored) {
                }
            }
        }

        return answer;
    }

    private boolean isAllowedRoute(String target) {
        String baseRoute = target.trim();
        int qIdx = baseRoute.indexOf('?');
        if (qIdx >= 0) {
            baseRoute = baseRoute.substring(0, qIdx);
        }
        int hIdx = baseRoute.indexOf('#');
        if (hIdx >= 0) {
            baseRoute = baseRoute.substring(0, hIdx);
        }
        baseRoute = baseRoute.trim();
        return ALLOWED_ROUTES.contains(baseRoute);
    }

    private BigDecimal extractAuthoritativeCpa(Map<String, Object> toolResults) {
        if (toolResults.get("academicStatus") instanceof AcademicStatusResponse status && status.getCpa() != null) {
            return status.getCpa();
        }
        if (toolResults.get("cpa") instanceof BigDecimal cpa) {
            return cpa;
        }
        if (toolResults.get("cpa") instanceof Number num) {
            return BigDecimal.valueOf(num.doubleValue());
        }
        return null;
    }

    private BigDecimal extractAuthoritativeGpa(Map<String, Object> toolResults) {
        if (toolResults.get("academicStatus") instanceof AcademicStatusResponse status && status.getGpa() != null) {
            return status.getGpa();
        }
        if (toolResults.get("gpa") instanceof BigDecimal gpa) {
            return gpa;
        }
        if (toolResults.get("gpa") instanceof Number num) {
            return BigDecimal.valueOf(num.doubleValue());
        }
        return null;
    }

    private Integer extractAuthoritativeCredits(Map<String, Object> toolResults) {
        if (toolResults.get("academicStatus") instanceof AcademicStatusResponse status && status.getAccumulatedCredits() != null) {
            return status.getAccumulatedCredits();
        }
        if (toolResults.get("graduationAudit") instanceof GraduationAuditResponse audit && audit.getAccumulatedCredits() != null) {
            return audit.getAccumulatedCredits();
        }
        if (toolResults.get("accumulatedCredits") instanceof Integer creds) {
            return creds;
        }
        if (toolResults.get("accumulatedCredits") instanceof Number num) {
            return num.intValue();
        }
        return null;
    }

    private BigDecimal extractProjectedCpa(Map<String, Object> toolResults) {
        if (toolResults.get("simulateGrades") instanceof SimulateGradesResponse sim && sim.getProjectedCpa() != null) {
            return sim.getProjectedCpa();
        }
        if (toolResults.get("planProposal") instanceof ChatPlanProposal prop && prop.getProjectedCpa() != null) {
            return prop.getProjectedCpa();
        }
        return null;
    }
}
