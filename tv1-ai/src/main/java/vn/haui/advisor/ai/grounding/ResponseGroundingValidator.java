package vn.haui.advisor.ai.grounding;

import com.fasterxml.jackson.databind.ObjectMapper;
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
    private static final Pattern INLINE_POLICY_ID = Pattern.compile("\\bREG-HAUI-[A-Z0-9-]+\\b");

    private final ObjectMapper objectMapper;

    public ResponseGroundingValidator() {
        this(new ObjectMapper());
    }

    public ResponseGroundingValidator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    /**
     * Thẩm định toàn diện kết quả thô từ AdvisorModel.
     */
    public AdvisorModelOutput validate(AdvisorModelOutput rawOutput, AdvisorModelInput input) {
        if (input == null) {
            return validate(rawOutput, null, Collections.emptyMap(), null);
        }
        String studentCode = input.getStudentContext() == null ? null : input.getStudentContext().getStudentCode();
        return validate(rawOutput, input.getGroundedContext(), input.getToolResults(), input.getUserMessage(), studentCode);
    }

    /**
     * Thẩm định chi tiết kết quả thô cùng GroundedContext và toolResults.
     */
    public AdvisorModelOutput validate(AdvisorModelOutput rawOutput,
                                       GroundedContext groundedContext,
                                       Map<String, Object> toolResults) {
        return validate(rawOutput, groundedContext, toolResults, null);
    }

    /**
     * Thẩm định chi tiết kết quả thô cùng GroundedContext, toolResults và userMessage.
     */
    public AdvisorModelOutput validate(AdvisorModelOutput rawOutput,
                                       GroundedContext groundedContext,
                                       Map<String, Object> toolResults,
                                       String userMessage) {
        return validate(rawOutput, groundedContext, toolResults, userMessage, null);
    }

    private AdvisorModelOutput validate(AdvisorModelOutput rawOutput,
                                       GroundedContext groundedContext,
                                       Map<String, Object> toolResults,
                                       String userMessage,
                                       String studentCode) {
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
        if (groundedContext != null && groundedContext.hasEvidence() && groundedContext.getCitations() != null) {
            String answer = rawOutput.getAnswer() != null ? rawOutput.getAnswer() : "";
            validatedSources = groundedContext.getCitations().stream()
                    .filter(source -> source != null && source.getSourceId() != null
                            && answer.contains(source.getSourceId()))
                    .toList();
        }

        // 2. Thẩm định hành động giao diện (Allowlist Actions & Routes)
        List<ChatActionItem> validatedActions = validateActions(rawOutput.getActions(), validatedWarnings);

        // 3. Thẩm định và bảo toàn tính toàn vẹn số liệu học vụ (CPA, GPA, tín chỉ)
        String validatedAnswer = enforceNumericalIntegrity(rawOutput.getAnswer(), toolResults, validatedWarnings);

        // 4. Thẩm định mã học phần chống ảo giác (Course Code Grounding)
        validateCourseCodes(validatedAnswer, groundedContext, toolResults, validatedWarnings);
        String checkedCourseAnswer = correctContradictoryPriorCourse(validatedAnswer, toolResults, validatedWarnings);
        boolean courseFallback = !checkedCourseAnswer.equals(validatedAnswer);
        validatedAnswer = checkedCourseAnswer;
        if (courseFallback) {
            validatedSources = List.of();
            validatedActions = List.of();
        }

        // 5. Khử rò rỉ thông tin cá nhân (PII Redaction Defense-in-depth: loại bỏ Mã SV không được yêu cầu)
        validatedAnswer = redactUnsolicitedPii(validatedAnswer, userMessage, studentCode);
        validatedAnswer = validatedAnswer.replace(" [academic_tool_results]", "");
        // shortcut: remove only observed parenthetical tool labels; broaden if measured output uses other forms.
        validatedAnswer = validatedAnswer.replace(" (`priorCourseCodesNotMissing`)", "")
                .replace(" (`missingEnrollmentRequirements`)", "")
                .replace(" (`eligible=false`)", "")
                .replace(" (`eligible=true`)", "");
        if (containsUnsupportedPolicyId(validatedAnswer, groundedContext, validatedWarnings)) {
            validatedAnswer = "Mình chưa có nguồn quy chế đã xác minh để khẳng định điều này. Bạn có thể hỏi cụ thể quy định cần kiểm tra.";
            validatedSources = List.of();
        }

        return new AdvisorModelOutput(
                validatedAnswer,
                validatedSources,
                validatedActions,
                courseFallback ? null : rawOutput.getPlanProposal(),
                validatedWarnings
        );
    }

    private String correctContradictoryPriorCourse(String answer, Map<String, Object> toolResults, List<String> warnings) {
        if (answer == null || toolResults == null) return answer;
        for (Object result : toolResults.values()) {
            if (!(result instanceof CourseEligibilityResponse course) || course.getPriorCourseCodes() == null) continue;
            for (String priorCode : course.getPriorCourseCodes()) {
                if (priorCode == null) continue;
                // shortcut: catch measured explicit denials of a prior-course link; expand only for reproduced variants.
                Pattern denial = Pattern.compile("(?iu)\\b" + Pattern.quote(priorCode)
                        + "\\b[\\s*]{0,8}không\\s+(?:nằm\\s+trong\\s+(?:(?:danh\\s+sách|yêu\\s+cầu)\\s+)?|(?:phải\\s+là|là)\\s+(?:(?:môn|học\\s+phần)\\s+)?)học\\s+trước\\b");
                if (!denial.matcher(answer).find()) continue;
                warnings.add("COURSE_RELATION_CONTRADICTION: " + priorCode);
                String verified = "Theo CTĐT đã xác minh, " + course.getCourseCode()
                        + (course.getCourseName() == null ? "" : " (" + course.getCourseName() + ")")
                        + " có môn học trước: " + String.join(", ", course.getPriorCourseCodes()) + ".";
                if (course.getPrerequisiteCourseCodes() != null) {
                    verified += course.getPrerequisiteCourseCodes().isEmpty() ? " Không có môn tiên quyết."
                            : " Môn tiên quyết: " + String.join(", ", course.getPrerequisiteCourseCodes()) + ".";
                }
                if (course.getCorequisiteCourseCodes() != null) {
                    verified += course.getCorequisiteCourseCodes().isEmpty() ? " Không có môn song hành."
                            : " Môn song hành: " + String.join(", ", course.getCorequisiteCourseCodes()) + ".";
                }
                if (course.getMissingPrerequisites() != null && !course.getMissingPrerequisites().isEmpty()) {
                    verified += " Theo hồ sơ hiện tại, bạn còn thiếu: "
                            + String.join("; ", course.getMissingPrerequisites()) + ".";
                }
                return verified;
            }
        }
        return answer;
    }

    private boolean containsUnsupportedPolicyId(String answer, GroundedContext groundedContext, List<String> warnings) {
        if (answer == null || answer.isBlank()) return false;
        Set<String> allowed = new HashSet<>();
        if (groundedContext != null && groundedContext.hasEvidence() && groundedContext.getCitations() != null) {
            for (ChatSourceItem source : groundedContext.getCitations()) {
                if (source != null && source.getSourceId() != null) allowed.add(source.getSourceId());
            }
        }
        Matcher matcher = INLINE_POLICY_ID.matcher(answer);
        boolean unsupported = false;
        while (matcher.find()) {
            if (!allowed.contains(matcher.group())) {
                warnings.add("UNGROUNDED_CITATION: " + matcher.group());
                unsupported = true;
            }
        }
        return unsupported;
    }

    private static final Pattern STUDENT_CODE_UNSOLICITED_PATTERN = Pattern.compile(
            "(?i)[(,]?\\h*(?:mã\\s+sinh\\s+viên|mã\\s+sv|msv)(?:\\s+của\\s+bạn|\\s+khác)?\\s*(?::|là|=)?\\s*([A-Z0-9_-]{5,20})\\h*[),.]?"
    );
    private static final Pattern BARE_NUMERIC_STUDENT_CODE = Pattern.compile("(?<![A-Z0-9])\\d{10}(?![A-Z0-9])");

    /**
     * Tự động loại bỏ Mã sinh viên khỏi nội dung câu trả lời nếu người dùng không hỏi trực tiếp về Mã SV.
     */
    public String redactUnsolicitedPii(String answer, String userMessage) {
        return redactUnsolicitedPii(answer, userMessage, null);
    }

    private String redactUnsolicitedPii(String answer, String userMessage, String studentCode) {
        if (answer == null || answer.isBlank()) {
            return answer;
        }
        String lowerQuery = userMessage != null ? userMessage.toLowerCase(Locale.ROOT) : "";
        boolean userAskedForId = lowerQuery.contains("mã sinh viên") || lowerQuery.contains("mã sv") || lowerQuery.contains("msv");
        String redacted = STUDENT_CODE_UNSOLICITED_PATTERN.matcher(answer).replaceAll(match ->
                userAskedForId && studentCode != null && studentCode.equalsIgnoreCase(match.group(1))
                        ? Matcher.quoteReplacement(match.group()) : "");
        if (!userAskedForId && studentCode != null && !studentCode.isBlank()) {
            redacted = redacted.replaceAll("\\(\\h*" + Pattern.quote(studentCode) + "\\h*\\)", "");
        }
        redacted = BARE_NUMERIC_STUDENT_CODE.matcher(redacted).replaceAll(match ->
                userAskedForId && studentCode != null && studentCode.equals(match.group())
                        ? Matcher.quoteReplacement(match.group()) : "");
        if (!userAskedForId && studentCode != null && !studentCode.isBlank()) {
            redacted = redacted.replace(studentCode, "");
        }
        return redacted;
    }

    private static final Pattern COURSE_CODE_REGEX = Pattern.compile("\\b([A-Z]{2,4}\\d{4})\\b");

    private void validateCourseCodes(String answer, GroundedContext groundedContext, Map<String, Object> toolResults, List<String> warnings) {
        if (answer == null || answer.isBlank() || toolResults == null || toolResults.isEmpty()) {
            return;
        }

        Set<String> knownCourseCodes = new HashSet<>();

        for (Object value : toolResults.values()) {
            if (value != null) {
                try {
                    String json = objectMapper.writeValueAsString(value);
                    Matcher m = COURSE_CODE_REGEX.matcher(json);
                    while (m.find()) {
                        knownCourseCodes.add(m.group(1));
                    }
                } catch (Exception e) {
                    Matcher m = COURSE_CODE_REGEX.matcher(value.toString());
                    while (m.find()) {
                        knownCourseCodes.add(m.group(1));
                    }
                }
            }
        }

        if (groundedContext != null && groundedContext.getEvidenceChunks() != null) {
            for (RagChunk chunk : groundedContext.getEvidenceChunks()) {
                if (chunk.getContent() != null) {
                    Matcher m = COURSE_CODE_REGEX.matcher(chunk.getContent());
                    while (m.find()) {
                        knownCourseCodes.add(m.group(1));
                    }
                }
            }
        }

        if (knownCourseCodes.isEmpty()) {
            return;
        }

        Matcher matcher = COURSE_CODE_REGEX.matcher(answer);
        while (matcher.find()) {
            String code = matcher.group(1);
            if (!knownCourseCodes.contains(code)) {
                String warn = "UNGROUNDED_COURSE_CODE: Course " + code + " is not present in authoritative academic context";
                if (!warnings.contains(warn)) {
                    warnings.add(warn);
                }
            }
        }
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

        // No retrieved evidence means no authenticated policy metadata.
        if (groundedContext == null) {
            warnings.add("UNGROUNDED_CITATION_STRIPPED: No retrieved evidence");
            return Collections.emptyList();
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
