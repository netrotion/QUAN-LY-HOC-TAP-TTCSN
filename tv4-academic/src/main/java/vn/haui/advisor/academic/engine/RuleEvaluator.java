package vn.haui.advisor.academic.engine;

import vn.haui.advisor.academic.model.CurriculumFixture;
import vn.haui.advisor.academic.model.PolicyDemo;
import vn.haui.advisor.academic.model.StudentProfileFixture;
import vn.haui.advisor.contracts.dto.*;

import java.math.BigDecimal;
import java.util.*;

public final class RuleEvaluator {

    private RuleEvaluator() {}

    /**
     * Thuật toán phát hiện chu trình phụ thuộc môn học (Prerequisite Cycle Detection - DAG Validation).
     * Trả về chuỗi mô tả chu trình nếu có (vd: "IT1001 -> IT2001 -> IT1001"), hoặc null nếu không có chu trình.
     */
    public static String findPrerequisiteCycle(String startCourse, CurriculumFixture curriculum) {
        if (startCourse == null || curriculum == null || curriculum.getCourses() == null) {
            return null;
        }

        Map<String, List<String>> adjList = new HashMap<>();
        for (CurriculumFixture.CourseDefinitionItem course : curriculum.getCourses()) {
            if (course.getCourseCode() == null) continue;
            List<String> deps = new ArrayList<>();
            if (course.getPrerequisites() != null) deps.addAll(course.getPrerequisites());
            if (course.getPriorCourses() != null) deps.addAll(course.getPriorCourses());
            adjList.put(course.getCourseCode().toUpperCase(), deps);
        }

        Set<String> visiting = new LinkedHashSet<>();
        Set<String> visited = new HashSet<>();
        List<String> cyclePath = new ArrayList<>();

        if (dfsCycle(startCourse.toUpperCase(), adjList, visiting, visited, cyclePath)) {
            return String.join(" -> ", cyclePath);
        }
        return null;
    }

    private static boolean dfsCycle(String current,
                                    Map<String, List<String>> adjList,
                                    Set<String> visiting,
                                    Set<String> visited,
                                    List<String> cyclePath) {
        if (visiting.contains(current)) {
            cyclePath.add(current);
            return true;
        }
        if (visited.contains(current)) {
            return false;
        }

        visiting.add(current);
        List<String> neighbors = adjList.getOrDefault(current, Collections.emptyList());
        for (String next : neighbors) {
            String nextUpper = next.toUpperCase();
            if (dfsCycle(nextUpper, adjList, visiting, visited, cyclePath)) {
                cyclePath.add(0, current);
                return true;
            }
        }
        visiting.remove(current);
        visited.add(current);
        return false;
    }

    public static CourseEligibilityResponse checkEligibility(String courseCode,
                                                             StudentProfileFixture profile,
                                                             CurriculumFixture curriculum,
                                                             String revision) {
        return checkEligibility(courseCode, profile, null, curriculum, Collections.emptyList(), revision);
    }

    public static CourseEligibilityResponse checkEligibility(String courseCode,
                                                             StudentProfileFixture profile,
                                                             List<TranscriptAttemptItem> transcriptAttempts,
                                                             CurriculumFixture curriculum,
                                                             List<String> currentTermRegistrations,
                                                             String revision) {
        if (courseCode == null || curriculum == null) {
            return new CourseEligibilityResponse(courseCode, false,
                    List.of("Không tìm thấy thông tin môn học"),
                    List.of("Dữ liệu CTĐT không khả dụng"), revision);
        }

        CurriculumFixture.CourseDefinitionItem courseDef = curriculum.getCourses().stream()
                .filter(c -> courseCode.equalsIgnoreCase(c.getCourseCode()))
                .findFirst()
                .orElse(null);

        if (courseDef == null) {
            return new CourseEligibilityResponse(courseCode, false,
                    List.of("Môn học " + courseCode + " không thuộc CTĐT hiện tại"),
                    Collections.emptyList(), revision);
        }

        List<String> missingPrereqs = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        // Kiểm tra chu trình phụ thuộc môn học (Cycle detection)
        String cycle = findPrerequisiteCycle(courseCode, curriculum);
        if (cycle != null) {
            missingPrereqs.add("Phát hiện chu trình phụ thuộc môn học (Cycle detected): " + cycle);
            warnings.add("Đồ thị môn học CTĐT vi phạm tính chất Directed Acyclic Graph (DAG) tại chu trình: " + cycle);
        }

        // Gom các lần học từ Profile hoặc TranscriptAttemptItem
        Map<String, Boolean> coursePassedMap = new HashMap<>();
        Map<String, String> courseGradeMap = new HashMap<>();
        Map<String, Boolean> isUnknownMap = new HashMap<>();

        if (profile != null && profile.getCourseAttempts() != null) {
            for (StudentProfileFixture.CourseAttempt a : profile.getCourseAttempts()) {
                if (a.getCourseCode() == null) continue;
                String code = a.getCourseCode().toUpperCase();
                Boolean passed = a.getPassed() != null ? a.getPassed() : GradeCalculator.isPassed(a.getLetterGrade());
                coursePassedMap.put(code, passed);
                courseGradeMap.put(code, a.getLetterGrade());
                if (a.getLetterGrade() == null || "UNKNOWN".equalsIgnoreCase(a.getLetterGrade().trim())
                        || "IN_PROGRESS".equalsIgnoreCase(a.getLetterGrade().trim())) {
                    isUnknownMap.put(code, true);
                }
            }
        } else if (transcriptAttempts != null) {
            for (TranscriptAttemptItem a : transcriptAttempts) {
                if (a.getCourseCode() == null) continue;
                String code = a.getCourseCode().toUpperCase();
                Boolean passed = GradeCalculator.isPassed(a.getLetterGrade());
                coursePassedMap.put(code, passed);
                courseGradeMap.put(code, a.getLetterGrade());
                if (a.getLetterGrade() == null || "UNKNOWN".equalsIgnoreCase(a.getLetterGrade().trim())
                        || "IN_PROGRESS".equalsIgnoreCase(a.getLetterGrade().trim())) {
                    isUnknownMap.put(code, true);
                }
            }
        }

        // BR-01: Kiểm tra môn tiên quyết (Prerequisites)
        if (courseDef.getPrerequisites() != null) {
            for (String prereqCode : courseDef.getPrerequisites()) {
                String code = prereqCode.toUpperCase();
                if (!coursePassedMap.containsKey(code)) {
                    missingPrereqs.add(prereqCode + " (chưa đăng ký học)");
                } else {
                    Boolean passed = coursePassedMap.get(code);
                    Boolean isUnknown = isUnknownMap.getOrDefault(code, false);

                    if (Boolean.TRUE.equals(isUnknown) || passed == null) {
                        missingPrereqs.add(prereqCode + " (kết quả chưa xác định / UNKNOWN)");
                        warnings.add("Dữ liệu môn tiên quyết " + prereqCode + " chưa có kết quả kết chuyển, không thể coi là đã đạt");
                    } else if (Boolean.FALSE.equals(passed)) {
                        String grade = courseGradeMap.get(code);
                        missingPrereqs.add(prereqCode + " (chưa đạt, điểm: " + (grade != null ? grade : "F") + ")");
                    }
                }
            }
        }

        // BR-01b: Kiểm tra môn học trước (Prior courses)
        if (courseDef.getPriorCourses() != null) {
            for (String priorCode : courseDef.getPriorCourses()) {
                String code = priorCode.toUpperCase();
                if (!coursePassedMap.containsKey(code)) {
                    missingPrereqs.add(priorCode + " (chưa đăng ký học phần học trước)");
                }
            }
        }

        // BR-01c: Kiểm tra môn học song hành (Corequisites)
        if (courseDef.getCorequisites() != null) {
            Set<String> registeredInTerm = new HashSet<>();
            if (currentTermRegistrations != null) {
                for (String c : currentTermRegistrations) {
                    if (c != null) registeredInTerm.add(c.toUpperCase());
                }
            }
            for (String coreqCode : courseDef.getCorequisites()) {
                String code = coreqCode.toUpperCase();
                boolean passedInPast = Boolean.TRUE.equals(coursePassedMap.get(code));
                boolean registeredSameTerm = registeredInTerm.contains(code);

                if (!passedInPast && !registeredSameTerm) {
                    missingPrereqs.add(coreqCode + " (chưa đạt trong quá khứ và chưa đăng ký song hành cùng kỳ)");
                    warnings.add("Môn song hành " + coreqCode + " cần được đăng ký đồng thời trong cùng kỳ hoặc đã đạt trước đó");
                }
            }
        }

        // BR-09: Kiểm tra điều kiện làm đồ án tốt nghiệp
        int earnedCredits = 0;
        if (profile != null && profile.getAccumulatedCredits() != null) {
            earnedCredits = profile.getAccumulatedCredits();
        } else if (transcriptAttempts != null) {
            earnedCredits = GradeCalculator.calculateAccumulatedCreditsFromAttempts(transcriptAttempts);
        }

        if (courseDef.getMinCreditsRequiredToEnroll() != null) {
            if (earnedCredits < courseDef.getMinCreditsRequiredToEnroll()) {
                missingPrereqs.add("Cần tích lũy tối thiểu " + courseDef.getMinCreditsRequiredToEnroll()
                        + " TC (hiện có " + earnedCredits + " TC)");
            }
        } else if ("IT6130".equalsIgnoreCase(courseCode) || (courseDef.getCourseName() != null && courseDef.getCourseName().toLowerCase().contains("khóa luận tốt nghiệp"))) {
            int minCredits = 128; // 85% của 150 TC = 127.5 -> 128 TC
            if (earnedCredits < minCredits) {
                missingPrereqs.add("Cần tích lũy tối thiểu " + minCredits + " TC (>= 85% CTĐT) để làm đồ án tốt nghiệp (hiện có " + earnedCredits + " TC)");
            }
        }

        boolean eligible = missingPrereqs.isEmpty();
        return new CourseEligibilityResponse(courseCode, eligible, missingPrereqs, warnings, revision);
    }

    public static List<String> validateCreditLimits(int credits, boolean isSummer, boolean isGraduationSemester) {
        return validateCreditLimits(credits, isSummer, isGraduationSemester, false);
    }

    public static List<String> validateCreditLimits(int credits, boolean isSummer, boolean isGraduationSemester, boolean isAcademicWarning) {
        List<String> violations = new ArrayList<>();

        if (isAcademicWarning && credits > 14) {
            violations.add("Sinh viên đang bị cảnh báo học tập chỉ được phép đăng ký tối đa 14 tín chỉ (hiện tại: " + credits + " TC)");
        }

        if (!isGraduationSemester && !isSummer && credits < 10) {
            violations.add("Tổng số tín chỉ học kỳ (" + credits + " TC) nhỏ hơn hạn mức tối thiểu theo quy chế (10 TC)");
        }

        if (!isSummer && credits > 24) {
            violations.add("Tổng số tín chỉ học kỳ (" + credits + " TC) vượt quá hạn mức tối đa cho phép (24 TC)");
        }

        if (isSummer && credits > 12) {
            violations.add("Học kỳ hè chỉ được phép đăng ký tối đa 12 tín chỉ (hiện tại: " + credits + " TC)");
        }

        return violations;
    }

    public static AcademicRiskLevel evaluateRiskLevel(BigDecimal cpa, Integer currentSemester, Integer debtCredits) {
        if (cpa == null) {
            return AcademicRiskLevel.NORMAL;
        }

        int year = (currentSemester != null && currentSemester > 0) ? ((currentSemester - 1) / 2 + 1) : 1;
        BigDecimal threshold = switch (year) {
            case 1 -> new BigDecimal("1.20");
            case 2 -> new BigDecimal("1.40");
            case 3 -> new BigDecimal("1.60");
            default -> new BigDecimal("1.80");
        };

        if (debtCredits != null && debtCredits > 24) {
            return AcademicRiskLevel.WARNING_LEVEL_1;
        }

        if (cpa.compareTo(threshold) < 0) {
            return AcademicRiskLevel.WARNING_LEVEL_1;
        }

        return AcademicRiskLevel.NORMAL;
    }
}
