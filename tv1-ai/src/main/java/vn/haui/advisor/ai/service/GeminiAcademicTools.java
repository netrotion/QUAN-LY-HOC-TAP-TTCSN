package vn.haui.advisor.ai.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import vn.haui.advisor.ai.tools.StudentJourneySummarizer;
import vn.haui.advisor.ai.tools.ToolAdapter;
import vn.haui.advisor.contracts.dto.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

final class GeminiAcademicTools {
    private static final Logger log = LoggerFactory.getLogger(GeminiAcademicTools.class);
    private static final java.util.regex.Pattern SAFE_COURSE_CODE_PATTERN = java.util.regex.Pattern.compile("^[A-Za-z0-9_. -]{2,20}$");

    private GeminiAcademicTools() {}

    private static boolean isValidCourseCode(String code) {
        return code != null && SAFE_COURSE_CODE_PATTERN.matcher(code.trim()).matches();
    }

    static void execute(ToolAdapter toolAdapter, TrustedStudentContext context,
                        String toolName, Map<String, Object> args,
                        Map<String, Object> toolResults, List<String> warnings) {
        if (context == null || context.getStudentId() == null || context.getStudentId().isBlank()) {
            throw new SecurityException("Mã sinh viên xác thực không hợp lệ. Từ chối thực thi công cụ học vụ.");
        }

        // Phòng thủ chống Parameter Tampering: vô hiệu hoá nỗ lực truy vấn chéo dữ liệu sinh viên khác
        if (args != null) {
            for (String key : List.of("student_id", "studentId", "mssv", "target_student")) {
                if (args.containsKey(key)) {
                    Object val = args.get(key);
                    if (val != null && !context.getStudentId().equalsIgnoreCase(val.toString().trim())) {
                        String warnMsg = "Cảnh báo Parameter Tampering: LLM cố gắng gọi tool với studentId="
                                + val + " khác với phiên đăng nhập=" + context.getStudentId();
                        log.warn(warnMsg);
                        if (warnings != null) {
                            warnings.add(warnMsg);
                        }
                    }
                }
            }
        }

        long started = System.currentTimeMillis();
        try {
            switch (toolName) {
                case "run_graduation_audit" -> {
                    GraduationAuditResponse audit = toolAdapter.runGraduationAudit(context);
                    if (audit != null) toolResults.put("run_graduation_audit", audit);
                }
                case "get_academic_status" -> {
                    AcademicStatusResponse status = toolAdapter.getAcademicStatus(context);
                    if (status != null) toolResults.put("get_academic_status", status);
                }
                case "check_course_eligibility" -> {
                    String courseCode = (String) args.get("course_code");
                    String semester = (String) args.get("semester");
                    if (courseCode != null && !courseCode.isBlank()) {
                        if (!isValidCourseCode(courseCode)) {
                            String warnMsg = "Mã học phần không hợp lệ hoặc chứa ký tự nguy hiểm: " + courseCode;
                            log.warn(warnMsg);
                            if (warnings != null) warnings.add(warnMsg);
                        } else {
                            CourseEligibilityResponse eligibility = toolAdapter.checkCourseEligibility(context, courseCode.trim().toUpperCase(Locale.ROOT), semester);
                            if (eligibility != null) toolResults.put("check_course_eligibility", eligibility);
                        }
                    }
                }
                case "rank_retake_courses" -> {
                    Integer maxSuggestions = args.get("max_suggestions") != null
                            ? Integer.valueOf(args.get("max_suggestions").toString()) : 3;
                    RankRetakeCoursesResponse rank = toolAdapter.rankRetakeCourses(context, maxSuggestions);
                    if (rank != null) toolResults.put("rank_retake_courses", rank);
                }
                case "simulate_grades" -> {
                    List<SimulatedCourseGrade> simList = new ArrayList<>();
                    if (args.get("simulations") instanceof List<?> list) {
                        for (Object o : list) {
                            if (o instanceof Map<?, ?> m) {
                                String code = m.get("course_code") != null ? m.get("course_code").toString() : null;
                                String grade = m.get("expected_grade") != null ? m.get("expected_grade").toString() : null;
                                if (code != null && grade != null) {
                                    if (!isValidCourseCode(code)) {
                                        String warnMsg = "Mã học phần không hợp lệ trong giả lập điểm: " + code;
                                        log.warn(warnMsg);
                                        if (warnings != null) warnings.add(warnMsg);
                                    } else {
                                        simList.add(new SimulatedCourseGrade(code.trim().toUpperCase(Locale.ROOT), null, grade.trim().toUpperCase(Locale.ROOT), null));
                                    }
                                }
                            }
                        }
                    }
                    if (!simList.isEmpty()) {
                        SimulateGradesResponse sim = toolAdapter.simulateGrades(context, simList);
                        if (sim != null) toolResults.put("simulate_grades", sim);
                    }
                }
                case "generate_study_plan" -> {
                    String targetSemester = (String) args.get("target_semester");
                    Integer maxCredits = args.get("max_credits") != null
                            ? Integer.valueOf(args.get("max_credits").toString()) : 18;
                    BigDecimal targetCpa = args.get("target_cpa") != null
                            ? new BigDecimal(args.get("target_cpa").toString()) : null;
                    GenerateStudyPlanResponse plan = toolAdapter.generateStudyPlan(context, targetSemester, targetCpa, maxCredits, false, List.of());
                    if (plan != null) {
                        toolResults.put("generate_study_plan", plan);
                        if (plan.getSemesters() != null && !plan.getSemesters().isEmpty()) {
                            String label = targetCpa == null ? "Đề xuất kế hoạch học tập"
                                    : "Đề xuất kế hoạch học tập mục tiêu CPA " + targetCpa.toPlainString();
                            toolResults.put("planProposal", new ChatPlanProposal(
                                    plan.getProposalId(), label, plan.getSemesters(), plan.getProjectedCpa()));
                        }
                    }
                }
                case "get_transcript" -> {
                    String filter = args.get("filter") != null ? args.get("filter").toString() : "ALL";
                    TranscriptResponse transcript = toolAdapter.getTranscript(context);
                    if (transcript != null) {
                        String summary = StudentJourneySummarizer.summarizeTranscript(transcript, filter);
                        toolResults.put("get_transcript", summary);
                    }
                }
                case "get_curriculum_tree" -> {
                    String scope = args.get("scope") != null ? args.get("scope").toString() : "ELIGIBLE_NEXT_SEMESTER";
                    CurriculumTreeResponse tree = toolAdapter.getCurriculumTree(context);
                    if (tree != null) {
                        String summary = StudentJourneySummarizer.summarizeCurriculumTree(tree, scope);
                        toolResults.put("get_curriculum_tree", summary);
                    }
                }
                default -> log.warn("Unknown native tool call: {}", toolName);
            }
            long elapsed = System.currentTimeMillis() - started;
            boolean found = toolResults.containsKey(toolName);
            if (!found) warnings.add("TOOL_FAILURE: " + toolName);
            log.info("advisor_native_tool capability={} outcome={} elapsedMs={}", toolName, found ? "SUCCESS" : "UNAVAILABLE", elapsed);
        } catch (Exception ex) {
            long elapsed = System.currentTimeMillis() - started;
            log.warn("advisor_native_tool capability={} outcome=FAILURE elapsedMs={} error={}", toolName, elapsed, ex.getMessage());
            warnings.add("TOOL_FAILURE: " + toolName);
        }
    }

}
