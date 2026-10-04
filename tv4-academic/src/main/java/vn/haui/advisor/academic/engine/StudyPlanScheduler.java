package vn.haui.advisor.academic.engine;

import vn.haui.advisor.academic.model.CurriculumFixture;
import vn.haui.advisor.academic.model.PolicyDemo;
import vn.haui.advisor.academic.model.StudentProfileFixture;
import vn.haui.advisor.contracts.dto.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Bộ lập lịch kế hoạch học tập cá nhân hóa (Academic Plan Engine).
 * 
 * NGUYÊN TẮC THIẾT KẾ BẮT BUỘC:
 * 1. Tách biệt hoàn toàn RÀNG BUỘC CỨNG (Hard Constraints) và THANG ĐIỂM TỐI ƯU (Scoring 40/25/20/15).
 * 2. Hard Constraints lọc trước: Môn không thỏa mãn tiên quyết/học trước hoặc vi phạm trần tín chỉ
 *    sẽ bị LOẠI BỎ NGAY LẬP TỨC khỏi danh sách ứng viên, không tham gia chấm điểm.
 * 3. Hỗ trợ kịch bản:
 *    - Học kỳ hè (tối đa 12 TC)
 *    - Học kỳ vượt / đẩy nhanh tiến độ (tối đa 24 TC)
 *    - Sinh viên cảnh báo học tập (tối đa 14 TC - REG-HAUI-02)
 *    - Điều kiện học kỳ tương lai (Chained Prerequisites)
 *    - Xử lý thiếu dữ liệu (Missing Data -> không coi là đạt)
 */
public class StudyPlanScheduler {

    private final PolicyDemo policy;
    private final CurriculumFixture curriculum;

    public StudyPlanScheduler(PolicyDemo policy, CurriculumFixture curriculum) {
        this.policy = policy != null ? policy : new PolicyDemo();
        this.curriculum = curriculum != null ? curriculum : new CurriculumFixture();
    }

    public GenerateStudyPlanResponse plan(StudentProfileFixture profile, GenerateStudyPlanRequest request) {
        String studentId = request != null && request.getStudentId() != null
                ? request.getStudentId()
                : (profile != null ? profile.getStudentId() : "std-unknown");

        String revision = request != null && request.getDataRevision() != null
                ? request.getDataRevision()
                : "rev-v1";

        boolean includeSummer = request != null && Boolean.TRUE.equals(request.getIncludeSummerSemesters());
        Integer requestedMaxCredits = request != null ? request.getMaxCreditsPerSemester() : null;
        BigDecimal targetCpa = request != null && request.getTargetCpa() != null
                ? request.getTargetCpa()
                : (profile != null && profile.getCpa() != null ? profile.getCpa().add(new BigDecimal("0.20")) : new BigDecimal("3.20"));

        List<String> planWarnings = new ArrayList<>();

        // Xác định trạng thái cảnh báo học tập
        boolean isWarning = profile != null && (profile.getRiskLevel() == AcademicRiskLevel.WARNING_LEVEL_1
                || profile.getRiskLevel() == AcademicRiskLevel.WARNING_LEVEL_2);

        // Trần tín chỉ kỳ chính (Mặc định 18-24, nhưng nếu cảnh báo thì max 14)
        int mainSemesterCreditCap = 20;
        if (isWarning) {
            mainSemesterCreditCap = 14;
            planWarnings.add("Sinh viên đang bị cảnh báo học tập: Áp dụng ràng buộc cứng tối đa 14 tín chỉ/kỳ (REG-HAUI-02)");
        } else if (requestedMaxCredits != null) {
            mainSemesterCreditCap = Math.min(24, Math.max(10, requestedMaxCredits));
        }

        // Bản đồ các môn đã đạt hoặc đã học của sinh viên
        Map<String, CourseStatus> courseHistory = new HashMap<>();
        if (profile != null && profile.getCourseAttempts() != null) {
            for (StudentProfileFixture.CourseAttempt a : profile.getCourseAttempts()) {
                if (a.getCourseCode() == null) continue;
                String code = a.getCourseCode().toUpperCase();
                Boolean passed = a.getPassed() != null ? a.getPassed() : GradeCalculator.isPassed(a.getLetterGrade());
                Double score = a.getGradePoint4() != null ? a.getGradePoint4() : GradeCalculator.toGradePoint4(a.getLetterGrade());
                courseHistory.put(code, new CourseStatus(code, passed, score, a.getLetterGrade()));
            }
        }

        // Tích lũy tín chỉ hiện tại
        double accumulatedCredits = profile != null && profile.getAccumulatedCreditsRaw() != null
                ? profile.getAccumulatedCreditsRaw()
                : (profile != null && profile.getAccumulatedCredits() != null ? profile.getAccumulatedCredits() : 0.0);

        // Đếm số môn phụ thuộc vào từng môn (Unblock count)
        Map<String, Integer> unblockCounts = calculateUnblockCounts();

        // Chuẩn bị danh sách học kỳ cần lập lịch
        List<SemesterSpec> semesterSpecs = new ArrayList<>();
        int startSemNumber = profile != null && profile.getCurrentSemester() != null ? profile.getCurrentSemester() + 1 : 4;
        
        semesterSpecs.add(new SemesterSpec(
                "2025_1",
                "Học kỳ 1 (2025-2026)",
                false,
                mainSemesterCreditCap,
                10,
                startSemNumber
        ));

        if (includeSummer) {
            semesterSpecs.add(new SemesterSpec(
                    "2025_SUMMER",
                    "Học kỳ hè (2025-2026)",
                    true,
                    12,
                    0,
                    startSemNumber
            ));
        }

        semesterSpecs.add(new SemesterSpec(
                "2025_2",
                "Học kỳ 2 (2025-2026)",
                false,
                mainSemesterCreditCap,
                10,
                startSemNumber + (includeSummer ? 0 : 1)
        ));

        List<PlannedSemesterItem> plannedSemesters = new ArrayList<>();
        Set<String> scheduledInPlan = new HashSet<>();

        for (SemesterSpec semSpec : semesterSpecs) {
            // Lọc ứng viên qua RÀNG BUỘC CỨNG (Stage 1: Hard Constraints)
            List<ScoredCourseCandidate> validCandidates = new ArrayList<>();

            for (CurriculumFixture.CourseDefinitionItem course : curriculum.getCourses()) {
                String code = course.getCourseCode().toUpperCase();

                if (scheduledInPlan.contains(code)) {
                    continue; // Đã lập lịch ở kỳ trước
                }

                CourseStatus existingStatus = courseHistory.get(code);

                // Ràng buộc cứng 1: Nếu đã ĐẠT rồi thì không học lại như môn mới (trừ khi có điểm D/D+/C và muốn retake)
                boolean isRetakeCandidate = existingStatus != null && Boolean.TRUE.equals(existingStatus.passed)
                        && existingStatus.score != null && existingStatus.score < 2.5; // D, D+, C
                boolean isFailedRetake = existingStatus != null && Boolean.FALSE.equals(existingStatus.passed);

                if (existingStatus != null && Boolean.TRUE.equals(existingStatus.passed) && !isRetakeCandidate) {
                    continue; // Đã đạt loại khá/giỏi, không học lại
                }

                // Ràng buộc cứng 2: Tiên quyết và Môn học trước
                boolean satisfiesPrereqs = checkHardPrerequisites(course, courseHistory);
                if (!satisfiesPrereqs) {
                    continue; // Vi phạm môn tiên quyết -> Loại ngay
                }

                // Ràng buộc cứng 3: Điều kiện làm Đồ án tốt nghiệp (>= 128 TC cho CT1085)
                if (course.getMinCreditsRequiredToEnroll() != null && accumulatedCredits < course.getMinCreditsRequiredToEnroll()) {
                    continue;
                }
                if (code.contains("IT6130") && accumulatedCredits < 128) {
                    continue;
                }

                // Stage 2: Thang điểm tối ưu (Scoring 40/25/20/15)
                double scoreUnblock = calculateUnblockScore(code, unblockCounts);
                double scoreProgression = calculateProgressionScore(course, semSpec.suggestedSemester);
                double scoreRetake = calculateRetakeScore(existingStatus);
                double scoreBalance = calculateWorkloadScore(course);

                double totalScore = scoreUnblock + scoreProgression + scoreRetake + scoreBalance;

                String rationale = buildRationale(scoreUnblock, scoreProgression, scoreRetake, isFailedRetake, isRetakeCandidate);
                validCandidates.add(new ScoredCourseCandidate(course, totalScore, isFailedRetake, isRetakeCandidate, rationale));
            }

            // Sắp xếp giảm dần theo điểm tối ưu
            validCandidates.sort((c1, c2) -> Double.compare(c2.totalScore, c1.totalScore));

            // Tham lam chọn môn theo trần tín chỉ
            List<PlannedCourseItem> selectedCourses = new ArrayList<>();
            int currentCredits = 0;

            for (ScoredCourseCandidate candidate : validCandidates) {
                int courseCredits = candidate.course.getCredits() != null ? candidate.course.getCredits() : 3;
                if (currentCredits + courseCredits <= semSpec.maxCredits) {
                    selectedCourses.add(new PlannedCourseItem(
                            candidate.course.getCourseCode(),
                            candidate.course.getCourseName() + (candidate.isFailedRetake ? " (học lại)" : (candidate.isRetakeCandidate ? " (cải thiện)" : "")),
                            courseCredits,
                            candidate.isFailedRetake ? "B" : "A",
                            candidate.rationale
                    ));
                    currentCredits += courseCredits;
                    scheduledInPlan.add(candidate.course.getCourseCode().toUpperCase());

                    // Chained Prerequisite: Giả định môn này sẽ ĐẠT ở kỳ này để mở khóa cho kỳ tương lai
                    courseHistory.put(candidate.course.getCourseCode().toUpperCase(),
                            new CourseStatus(candidate.course.getCourseCode().toUpperCase(), true, 3.5, "B+"));
                    accumulatedCredits += courseCredits;
                }
            }

            // Kiểm tra sàn tín chỉ
            if (!semSpec.isSummer && currentCredits < semSpec.minCredits) {
                planWarnings.add("Học kỳ " + semSpec.code + " chỉ chọn được " + currentCredits + " TC, nhỏ hơn mức sàn " + semSpec.minCredits + " TC");
            }

            plannedSemesters.add(new PlannedSemesterItem(
                    semSpec.code,
                    semSpec.name,
                    selectedCourses,
                    currentCredits,
                    new BigDecimal("3.50")
            ));
        }

        BigDecimal currentCpa = profile != null && profile.getCpa() != null ? profile.getCpa() : new BigDecimal("2.50");
        BigDecimal projectedCpa = currentCpa.add(new BigDecimal("0.25")).min(new BigDecimal("4.00")).setScale(2, RoundingMode.HALF_UP);

        return new GenerateStudyPlanResponse(
                "plan-" + studentId + "-v1",
                studentId,
                StudyPlanStatus.DRAFT,
                plannedSemesters,
                projectedCpa,
                planWarnings,
                1,
                revision
        );
    }

    private boolean checkHardPrerequisites(CurriculumFixture.CourseDefinitionItem course, Map<String, CourseStatus> history) {
        // Kiểm tra tiên quyết: Phải học và ĐẠT (passed == true)
        if (course.getPrerequisites() != null) {
            for (String prereq : course.getPrerequisites()) {
                CourseStatus st = history.get(prereq.toUpperCase());
                if (st == null || !Boolean.TRUE.equals(st.passed)) {
                    return false; // Chưa học hoặc chưa đạt
                }
            }
        }

        // Kiểm tra môn học trước: Phải có bản ghi học (attempted)
        if (course.getPriorCourses() != null) {
            for (String prior : course.getPriorCourses()) {
                CourseStatus st = history.get(prior.toUpperCase());
                if (st == null) {
                    return false; // Chưa từng đăng ký học môn học trước
                }
            }
        }

        return true;
    }

    private double calculateUnblockScore(String courseCode, Map<String, Integer> unblockCounts) {
        int dependents = unblockCounts.getOrDefault(courseCode, 0);
        return Math.min(1.0, dependents / 4.0) * 40.0;
    }

    private double calculateProgressionScore(CurriculumFixture.CourseDefinitionItem course, int currentSemester) {
        int suggested = course.getSuggestedSemester() != null ? course.getSuggestedSemester() : 1;
        if (suggested <= currentSemester) {
            return 25.0; // Đúng hoặc trễ tiến độ chuẩn -> Ưu tiên cao nhất
        } else if (suggested == currentSemester + 1) {
            return 18.0; // Học vượt nhẹ kỳ sau
        } else {
            return 10.0; // Vượt xa hơn
        }
    }

    private double calculateRetakeScore(CourseStatus status) {
        if (status == null) {
            return 0.0;
        }
        if (Boolean.FALSE.equals(status.passed)) {
            return 20.0; // Môn nợ F: Cần học lại ngay để xóa điểm F
        }
        if (status.score != null && status.score < 2.5) {
            return 12.0; // Môn điểm D/D+/C có ROI cải thiện
        }
        return 0.0;
    }

    private double calculateWorkloadScore(CurriculumFixture.CourseDefinitionItem course) {
        int credits = course.getCredits() != null ? course.getCredits() : 3;
        if (credits <= 3) {
            return 15.0; // Phân bổ môn vừa phải
        }
        return 10.0; // Môn nhiều tín chỉ
    }

    private String buildRationale(double scoreUnblock, double scoreProgression, double scoreRetake,
                                  boolean isFailedRetake, boolean isRetakeCandidate) {
        if (isFailedRetake) {
            return "Học lại môn nợ để xóa điểm F và khơi thông mạch học tập (Trọng số 40% tiên quyết + 20% gỡ nợ)";
        }
        if (isRetakeCandidate) {
            return "Học cải thiện điểm để nâng CPA (Trọng số 20% ROI retake)";
        }
        if (scoreUnblock >= 25.0) {
            return "Môn tiên quyết mở khóa nhiều môn chuyên ngành kế tiếp (Trọng số 40% unblock)";
        }
        return "Môn bắt buộc theo tiến độ khung CTĐT HaUI (Trọng số 25% progression)";
    }

    private Map<String, Integer> calculateUnblockCounts() {
        Map<String, Integer> counts = new HashMap<>();
        for (CurriculumFixture.CourseDefinitionItem c : curriculum.getCourses()) {
            if (c.getPrerequisites() != null) {
                for (String p : c.getPrerequisites()) {
                    counts.put(p.toUpperCase(), counts.getOrDefault(p.toUpperCase(), 0) + 1);
                }
            }
            if (c.getPriorCourses() != null) {
                for (String p : c.getPriorCourses()) {
                    counts.put(p.toUpperCase(), counts.getOrDefault(p.toUpperCase(), 0) + 1);
                }
            }
        }
        return counts;
    }

    private static class SemesterSpec {
        final String code;
        final String name;
        final boolean isSummer;
        final int maxCredits;
        final int minCredits;
        final int suggestedSemester;

        SemesterSpec(String code, String name, boolean isSummer, int maxCredits, int minCredits, int suggestedSemester) {
            this.code = code;
            this.name = name;
            this.isSummer = isSummer;
            this.maxCredits = maxCredits;
            this.minCredits = minCredits;
            this.suggestedSemester = suggestedSemester;
        }
    }

    private static class CourseStatus {
        final String code;
        final Boolean passed;
        final Double score;
        final String letterGrade;

        CourseStatus(String code, Boolean passed, Double score, String letterGrade) {
            this.code = code;
            this.passed = passed;
            this.score = score;
            this.letterGrade = letterGrade;
        }
    }

    private static class ScoredCourseCandidate {
        final CurriculumFixture.CourseDefinitionItem course;
        final double totalScore;
        final boolean isFailedRetake;
        final boolean isRetakeCandidate;
        final String rationale;

        ScoredCourseCandidate(CurriculumFixture.CourseDefinitionItem course, double totalScore,
                              boolean isFailedRetake, boolean isRetakeCandidate, String rationale) {
            this.course = course;
            this.totalScore = totalScore;
            this.isFailedRetake = isFailedRetake;
            this.isRetakeCandidate = isRetakeCandidate;
            this.rationale = rationale;
        }
    }
}
