package vn.haui.advisor.academic.engine;

import vn.haui.advisor.academic.model.CurriculumFixture;
import vn.haui.advisor.academic.model.PolicyDemo;
import vn.haui.advisor.academic.model.StudentProfileFixture;
import vn.haui.advisor.contracts.dto.*;

import java.math.BigDecimal;
import java.util.*;

public final class RuleEvaluator {

    private RuleEvaluator() {}

    public static CourseEligibilityResponse checkEligibility(String courseCode,
                                                             StudentProfileFixture profile,
                                                             CurriculumFixture curriculum,
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

        List<StudentProfileFixture.CourseAttempt> attempts = profile != null && profile.getCourseAttempts() != null
                ? profile.getCourseAttempts()
                : Collections.emptyList();

        Map<String, StudentProfileFixture.CourseAttempt> latestAttempts = new HashMap<>();
        for (StudentProfileFixture.CourseAttempt a : attempts) {
            if (a.getCourseCode() != null) {
                latestAttempts.put(a.getCourseCode().toUpperCase(), a);
            }
        }

        // BR-01: Kiểm tra môn tiên quyết
        for (String prereqCode : courseDef.getPrerequisites()) {
            StudentProfileFixture.CourseAttempt attempt = latestAttempts.get(prereqCode.toUpperCase());
            if (attempt == null) {
                missingPrereqs.add(prereqCode + " (chưa đăng ký học)");
            } else {
                Boolean passed = attempt.getPassed();
                if (passed == null) {
                    passed = GradeCalculator.isPassed(attempt.getLetterGrade());
                }

                if (passed == null) {
                    // RÀNG BUỘC: Missing/unknown data KHÔNG ĐƯỢC tự động gán điểm = 0 hoặc mặc định là Đã đạt
                    missingPrereqs.add(prereqCode + " (kết quả chưa xác định / UNKNOWN)");
                    warnings.add("Dữ liệu môn tiên quyết " + prereqCode + " chưa có kết quả kết chuyển, không thể coi là đã đạt");
                } else if (!passed) {
                    missingPrereqs.add(prereqCode + " (chưa đạt, điểm: " +
                            (attempt.getLetterGrade() != null ? attempt.getLetterGrade() : "F") + ")");
                }
            }
        }

        // BR-09: Kiểm tra điều kiện làm đồ án tốt nghiệp
        if (courseDef.getMinCreditsRequiredToEnroll() != null) {
            int earnedCredits = profile != null && profile.getAccumulatedCredits() != null
                    ? profile.getAccumulatedCredits()
                    : 0;
            if (earnedCredits < courseDef.getMinCreditsRequiredToEnroll()) {
                missingPrereqs.add("Cần tích lũy tối thiểu " + courseDef.getMinCreditsRequiredToEnroll()
                        + " TC (hiện có " + earnedCredits + " TC)");
            }
        }

        boolean eligible = missingPrereqs.isEmpty();
        return new CourseEligibilityResponse(courseCode, eligible, missingPrereqs, warnings, revision);
    }

    public static List<String> validateCreditLimits(int credits, boolean isSummer, boolean isGraduationSemester) {
        List<String> violations = new ArrayList<>();

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
            default -> new BigDecimal("1.60");
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
