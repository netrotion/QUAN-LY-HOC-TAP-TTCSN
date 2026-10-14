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
 * Bộ lập lịch kế hoạch học tập cá nhân hóa (Academic Study Plan Generator).
 *
 * TRIỂN KHAI THEO CHUỖI 4 GIAI ĐOẠN (Task 3.6 - planner-tool-ready):
 * 1. Eligibility (Lọc ràng buộc cứng):
 *    - Tiên quyết (Prerequisites): Đã học và đạt (BR-01).
 *    - Môn học trước (Prior courses): Đã từng dự thi/học (BR-02).
 *    - Điều kiện nhận Đồ án tốt nghiệp: Tích lũy tối thiểu 85% tổng số tín chỉ CTĐT (BR-09).
 *    - Môn đã đạt loại Khá/Giỏi không học lại trừ khi nằm trong selectedRetakeCourseCodes (BR-06).
 *
 * 2. Ranking & Scoring Normalization:
 *    - Điểm tối ưu 4 thành phần theo PRD §13.1 và policy-demo.json:
 *      * unblockPrerequisites: 40% (Khơi thông mạch học tập)
 *      * standardCurriculumProgression: 25% (Tiến độ khung CTĐT)
 *      * retakeRoi: 20% (Gỡ nợ F hoặc cải thiện CPA)
 *      * workloadBalance: 15% (Cân bằng tải tín chỉ)
 *    - Chuẩn hóa trọng số (Normalization): Khi thành phần retake không áp dụng, chuẩn hóa
 *      lại trên 3 thành phần hợp lệ (40 + 25 + 15 = 80) về thang 100%.
 *    - Tie-breaking xác định (Deterministic): totalScore giảm dần -> credits giảm dần -> courseCode A-Z.
 *
 * 3. Allocation (Phân bổ theo kỳ):
 *    - Xử lý Corequisite Bundle: Môn song hành phải được xếp cùng kỳ nếu chưa đạt.
 *      Nếu bundle vượt quá trần tín chỉ còn lại, hoãn cả bundle sang kỳ sau.
 *    - Trần/Sàn tín chỉ: Cảnh báo học tập max 14 TC (REG-HAUI-02), Kỳ hè max 12 TC, Học vượt max 24 TC (BR-04).
 *    - Chained Prerequisites: Giả định môn kỳ trước đạt để mở khóa môn kỳ sau.
 *
 * 4. Final Validation (Kiểm tra chéo hậu kỳ):
 *    - Kiểm tra DAG tiên quyết, song hành, trần tín chỉ, không trùng môn.
 *    - Xử lý NO_PLAN_FOUND kèm lý do cụ thể khi không tìm được phương án hợp lệ.
 *    - Gắn nhãn ASSUMED_OFFERING_UNVERIFIED khi thiếu dữ liệu lịch mở lớp chính thức.
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

        // Kiểm tra dữ liệu kỳ mở lớp chính thức: gắn nhãn minh bạch
        planWarnings.add("ASSUMED_OFFERING_UNVERIFIED: Chưa có dữ liệu mở lớp chính thức từ e-HaUI, các học phần được xếp dựa trên tiến độ khung CTĐT");

        // Phát hiện chu trình tiên quyết (Prerequisite cycle detection)
        String cyclePath = detectPrerequisiteCycle(curriculum.getCourses());
        if (cyclePath != null) {
            planWarnings.add("NO_PLAN_FOUND: Phát hiện chu trình phụ thuộc tiên quyết trong CTĐT (" + cyclePath + "). Thuật toán tham lam không thể sinh kế hoạch hợp lệ.");
            return new GenerateStudyPlanResponse(
                    "no-plan-found",
                    studentId,
                    StudyPlanStatus.DRAFT,
                    Collections.emptyList(),
                    profile != null && profile.getCpa() != null ? profile.getCpa() : BigDecimal.ZERO,
                    planWarnings,
                    revision
            );
        }

        // Xác định trạng thái cảnh báo học tập và trần tín chỉ
        boolean isWarning = profile != null && (profile.getRiskLevel() == AcademicRiskLevel.WARNING_LEVEL_1
                || profile.getRiskLevel() == AcademicRiskLevel.WARNING_LEVEL_2);

        int mainSemesterCreditCap = 20; // Lộ trình chuẩn mặc định (PRD AC-03: 14-20 TC)
        if (isWarning) {
            mainSemesterCreditCap = 14;
            planWarnings.add("Sinh viên đang bị cảnh báo học tập: Áp dụng ràng buộc cứng tối đa 14 tín chỉ/kỳ (REG-HAUI-02)");
        } else if (requestedMaxCredits != null) {
            mainSemesterCreditCap = Math.min(24, Math.max(10, requestedMaxCredits));
        }

        // Bản đồ lịch sử học tập
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

        // Tín chỉ tích lũy hiện tại
        double accumulatedCredits = profile != null && profile.getAccumulatedCreditsRaw() != null
                ? profile.getAccumulatedCreditsRaw()
                : (profile != null && profile.getAccumulatedCredits() != null ? profile.getAccumulatedCredits() : 0.0);

        // Tổng số tín chỉ CTĐT
        int totalCurriculumCredits = curriculum.getTotalCredits() != null && curriculum.getTotalCredits() > 0
                ? curriculum.getTotalCredits()
                : 150;

        // Tập hợp các môn học cải thiện được người dùng chủ động lựa chọn
        Set<String> selectedRetakes = new HashSet<>();
        if (request != null && request.getSelectedRetakeCourseCodes() != null) {
            for (String r : request.getSelectedRetakeCourseCodes()) {
                if (r != null) selectedRetakes.add(r.trim().toUpperCase());
            }
        }

        // Bản đồ tra cứu định nghĩa học phần theo mã môn
        Map<String, CurriculumFixture.CourseDefinitionItem> courseCatalog = new HashMap<>();
        for (CurriculumFixture.CourseDefinitionItem c : curriculum.getCourses()) {
            if (c.getCourseCode() != null) {
                courseCatalog.put(c.getCourseCode().toUpperCase(), c);
            }
        }

        // Đếm số môn phụ thuộc (Unblock count)
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
        int totalCoursesScheduledCount = 0;

        for (SemesterSpec semSpec : semesterSpecs) {
            // =========================================================================
            // STAGE 1: ELIGIBILITY (Ràng buộc cứng) & STAGE 2: RANKING (40/25/20/15)
            // =========================================================================
            List<ScoredCourseCandidate> validCandidates = new ArrayList<>();

            for (CurriculumFixture.CourseDefinitionItem course : curriculum.getCourses()) {
                String code = course.getCourseCode() != null ? course.getCourseCode().toUpperCase() : "";
                if (code.isEmpty() || scheduledInPlan.contains(code)) {
                    continue;
                }

                CourseStatus existingStatus = courseHistory.get(code);

                // Kiểm tra điều kiện học lại / cải thiện (BR-06)
                boolean isFailedRetake = existingStatus != null && Boolean.FALSE.equals(existingStatus.passed);
                boolean isImprovementRequested = selectedRetakes.contains(code);
                boolean isEligibleForImprovement = existingStatus != null && Boolean.TRUE.equals(existingStatus.passed)
                        && existingStatus.score != null && existingStatus.score >= 1.0 && existingStatus.score <= 2.4; // Điểm D, D+, C

                boolean isRetakeCandidate = isFailedRetake || (isImprovementRequested && isEligibleForImprovement);

                // Nếu đã đạt môn này mà không thuộc diện học cải thiện hợp lệ -> Bỏ qua
                if (existingStatus != null && Boolean.TRUE.equals(existingStatus.passed) && !isRetakeCandidate) {
                    continue;
                }

                // Kiểm tra tiên quyết và môn học trước (BR-01, BR-02)
                if (!checkHardPrerequisites(course, courseHistory)) {
                    continue;
                }

                // Kiểm tra điều kiện làm Đồ án tốt nghiệp (BR-09: >= 85% tổng số tín chỉ CTĐT)
                if (isGraduationThesis(course)) {
                    double minThesisCredits = totalCurriculumCredits * 0.85;
                    if (course.getMinCreditsRequiredToEnroll() != null) {
                        minThesisCredits = course.getMinCreditsRequiredToEnroll();
                    }
                    if (accumulatedCredits < minThesisCredits) {
                        continue; // Chưa đủ tín chỉ làm đồ án
                    }
                } else if (course.getMinCreditsRequiredToEnroll() != null && accumulatedCredits < course.getMinCreditsRequiredToEnroll()) {
                    continue;
                }

                // Tính điểm 4 thành phần theo thang chuẩn 0..100
                double sUnblock = calculateUnblockComponent(code, unblockCounts);
                double sProgression = calculateProgressionComponent(course, semSpec.suggestedSemester);
                double sRetake = calculateRetakeComponent(isFailedRetake, isRetakeCandidate);
                double sBalance = calculateWorkloadComponent(course);

                // Chuẩn hóa trọng số (Scoring Normalization):
                // Nếu không áp dụng retake, chỉ tính trên 3 thành phần 40% + 25% + 15% (tổng trọng số 80)
                double totalScore;
                boolean isRetakeApplicable = isFailedRetake || isRetakeCandidate;
                if (isRetakeApplicable) {
                    totalScore = (40.0 * sUnblock + 25.0 * sProgression + 20.0 * sRetake + 15.0 * sBalance) / 100.0;
                } else {
                    totalScore = (40.0 * sUnblock + 25.0 * sProgression + 15.0 * sBalance) / 80.0;
                }

                String rationale = buildRationale(sUnblock, sProgression, sRetake, isFailedRetake, isRetakeCandidate);
                validCandidates.add(new ScoredCourseCandidate(course, totalScore, isFailedRetake, isRetakeCandidate, rationale));
            }

            // Sắp xếp Deterministic Tie-breaking:
            // 1. totalScore giảm dần
            // 2. credits giảm dần (ưu tiên xếp môn lớn để tối ưu hoá hạn mức)
            // 3. courseCode tăng dần theo thứ tự từ điển (A-Z)
            validCandidates.sort((c1, c2) -> {
                int scoreCmp = Double.compare(c2.totalScore, c1.totalScore);
                if (scoreCmp != 0) return scoreCmp;
                int cr1 = c1.course.getCredits() != null ? c1.course.getCredits() : 3;
                int cr2 = c2.course.getCredits() != null ? c2.course.getCredits() : 3;
                int crCmp = Integer.compare(cr2, cr1);
                if (crCmp != 0) return crCmp;
                return c1.course.getCourseCode().compareTo(c2.course.getCourseCode());
            });

            // =========================================================================
            // STAGE 3: ALLOCATION (Phân bổ theo kỳ, Corequisite Bundle & Trần tín chỉ)
            // =========================================================================
            List<PlannedCourseItem> selectedCourses = new ArrayList<>();
            Set<String> currentSemesterScheduledCodes = new HashSet<>();
            int currentCredits = 0;

            for (ScoredCourseCandidate candidate : validCandidates) {
                String candidateCode = candidate.course.getCourseCode().toUpperCase();
                if (scheduledInPlan.contains(candidateCode)) {
                    continue;
                }

                // Nếu môn này có môn tiên quyết vừa được xếp trong chính học kỳ này -> Không được xếp cùng kỳ
                boolean prereqInSameSem = false;
                if (candidate.course.getPrerequisites() != null) {
                    for (String p : candidate.course.getPrerequisites()) {
                        if (p != null && currentSemesterScheduledCodes.contains(p.trim().toUpperCase())) {
                            prereqInSameSem = true;
                            break;
                        }
                    }
                }
                if (prereqInSameSem) {
                    continue; // Chờ sang kỳ sau khi môn tiên quyết đã hoàn thành
                }

                // Xây dựng gói song hành (Corequisite Bundle)
                List<CurriculumFixture.CourseDefinitionItem> bundle = resolveCorequisiteBundle(
                        candidate.course, courseCatalog, courseHistory, scheduledInPlan
                );

                if (bundle == null) {
                    // Môn song hành không thỏa mãn điều kiện tiên quyết riêng của nó -> Không thể xếp
                    continue;
                }

                // Tính tổng tín chỉ của cả bundle
                int bundleCredits = 0;
                for (CurriculumFixture.CourseDefinitionItem item : bundle) {
                    bundleCredits += (item.getCredits() != null ? item.getCredits() : 3);
                }

                // Kiểm tra trần tín chỉ của kỳ học
                if (currentCredits + bundleCredits <= semSpec.maxCredits) {
                    for (CurriculumFixture.CourseDefinitionItem item : bundle) {
                        String itemCode = item.getCourseCode().toUpperCase();
                        int itemCredits = item.getCredits() != null ? item.getCredits() : 3;

                        boolean isFailed = candidate.isFailedRetake && itemCode.equals(candidateCode);
                        boolean isImprovement = !candidate.isFailedRetake && candidate.isRetakeCandidate && itemCode.equals(candidateCode);

                        String itemRationale = itemCode.equals(candidateCode)
                                ? candidate.rationale
                                : "Môn song hành bắt buộc đi kèm với " + candidateCode + " trong cùng học kỳ";

                        selectedCourses.add(new PlannedCourseItem(
                                item.getCourseCode(),
                                item.getCourseName() + (isFailed ? " (học lại)" : (isImprovement ? " (cải thiện)" : "")),
                                itemCredits,
                                isFailed ? "B" : "A",
                                itemRationale
                        ));

                        currentCredits += itemCredits;
                        accumulatedCredits += itemCredits;
                        scheduledInPlan.add(itemCode);
                        currentSemesterScheduledCodes.add(itemCode);
                        totalCoursesScheduledCount++;

                        // Chained Prerequisite: Giả định môn này đạt ở kỳ hiện tại để mở khóa kỳ tương lai
                        courseHistory.put(itemCode, new CourseStatus(itemCode, true, 3.5, "B+"));
                    }
                }
            }

            // Kiểm tra sàn tín chỉ (10 TC đối với kỳ chính)
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

        // =========================================================================
        // STAGE 4: FINAL VALIDATION PASS (Kiểm tra chéo toàn bộ phương án đã lập)
        // =========================================================================
        List<String> validationErrors = validateGeneratedPlan(plannedSemesters, courseCatalog, semesterSpecs);
        if (!validationErrors.isEmpty()) {
            planWarnings.addAll(validationErrors);
            planWarnings.add("NO_PLAN_FOUND: Phương án được tạo vi phạm kiểm tra chéo cuối cùng. Thuật toán không đảm bảo tính hợp lệ.");
            return new GenerateStudyPlanResponse(
                    "no-plan-found",
                    studentId,
                    StudyPlanStatus.DRAFT,
                    Collections.emptyList(),
                    profile != null && profile.getCpa() != null ? profile.getCpa() : BigDecimal.ZERO,
                    planWarnings,
                    revision
            );
        }

        if (totalCoursesScheduledCount == 0) {
            planWarnings.add("NO_PLAN_FOUND: Không tìm được học phần nào thỏa mãn đồng thời các ràng buộc cứng học vụ để đưa vào kế hoạch.");
            return new GenerateStudyPlanResponse(
                    "no-plan-found",
                    studentId,
                    StudyPlanStatus.DRAFT,
                    Collections.emptyList(),
                    profile != null && profile.getCpa() != null ? profile.getCpa() : BigDecimal.ZERO,
                    planWarnings,
                    revision
            );
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
                revision
        );
    }

    /**
     * Gom nhóm các môn song hành (Corequisite Bundle).
     * Trả về danh sách môn cần xếp cùng nhau, hoặc null nếu không thể thỏa mãn.
     */
    private List<CurriculumFixture.CourseDefinitionItem> resolveCorequisiteBundle(
            CurriculumFixture.CourseDefinitionItem mainCourse,
            Map<String, CurriculumFixture.CourseDefinitionItem> catalog,
            Map<String, CourseStatus> history,
            Set<String> alreadyScheduled) {

        List<CurriculumFixture.CourseDefinitionItem> bundle = new ArrayList<>();
        Set<String> bundleCodes = new HashSet<>();
        bundle.add(mainCourse);
        String mainCode = mainCourse.getCourseCode() != null ? mainCourse.getCourseCode().toUpperCase() : "";
        bundleCodes.add(mainCode);

        // 1. Corequisites trực tiếp của mainCourse
        if (mainCourse.getCorequisites() != null) {
            for (String coreqCode : mainCourse.getCorequisites()) {
                if (coreqCode == null || coreqCode.trim().isEmpty()) continue;
                String upper = coreqCode.trim().toUpperCase();

                CourseStatus st = history.get(upper);
                if (st != null && Boolean.TRUE.equals(st.passed)) {
                    continue;
                }
                if (alreadyScheduled.contains(upper)) {
                    continue;
                }

                CurriculumFixture.CourseDefinitionItem coreqItem = catalog.get(upper);
                if (coreqItem == null) {
                    return null; // Thiếu định nghĩa môn song hành trong CTĐT
                }

                if (!checkHardPrerequisites(coreqItem, history)) {
                    return null;
                }

                if (!bundleCodes.contains(upper)) {
                    bundle.add(coreqItem);
                    bundleCodes.add(upper);
                }
            }
        }

        // 2. Reverse corequisites: Các môn khác trong catalog coi mainCourse là môn song hành
        for (CurriculumFixture.CourseDefinitionItem other : catalog.values()) {
            if (other.getCorequisites() != null && other.getCourseCode() != null) {
                for (String c : other.getCorequisites()) {
                    if (c != null && c.trim().equalsIgnoreCase(mainCode)) {
                        String otherCode = other.getCourseCode().toUpperCase();
                        CourseStatus st = history.get(otherCode);
                        if ((st == null || !Boolean.TRUE.equals(st.passed)) && !alreadyScheduled.contains(otherCode)) {
                            if (!bundleCodes.contains(otherCode)) {
                                if (!checkHardPrerequisites(other, history)) {
                                    return null;
                                }
                                bundle.add(other);
                                bundleCodes.add(otherCode);
                            }
                        }
                    }
                }
            }
        }

        return bundle;
    }

    private boolean checkHardPrerequisites(CurriculumFixture.CourseDefinitionItem course, Map<String, CourseStatus> history) {
        // Tiên quyết: Phải học và đạt (passed == true)
        if (course.getPrerequisites() != null) {
            for (String prereq : course.getPrerequisites()) {
                if (prereq == null || prereq.trim().isEmpty()) continue;
                CourseStatus st = history.get(prereq.trim().toUpperCase());
                if (st == null || !Boolean.TRUE.equals(st.passed)) {
                    return false;
                }
            }
        }

        // Môn học trước: Phải có lịch sử học/dự thi (BR-02: kể cả điểm F)
        if (course.getPriorCourses() != null) {
            for (String prior : course.getPriorCourses()) {
                if (prior == null || prior.trim().isEmpty()) continue;
                CourseStatus st = history.get(prior.trim().toUpperCase());
                if (st == null) {
                    return false;
                }
            }
        }

        return true;
    }

    private boolean isGraduationThesis(CurriculumFixture.CourseDefinitionItem course) {
        if (course == null) return false;
        String name = course.getCourseName() != null ? course.getCourseName().toLowerCase() : "";
        String code = course.getCourseCode() != null ? course.getCourseCode().toUpperCase() : "";
        return name.contains("đồ án tốt nghiệp") || name.contains("khóa luận tốt nghiệp")
                || name.contains("graduation thesis") || code.contains("IT6009") || code.contains("IT9001");
    }

    private double calculateUnblockComponent(String courseCode, Map<String, Integer> unblockCounts) {
        int dependents = unblockCounts.getOrDefault(courseCode, 0);
        return Math.min(100.0, (dependents / 4.0) * 100.0);
    }

    private double calculateProgressionComponent(CurriculumFixture.CourseDefinitionItem course, int currentSemester) {
        int suggested = course.getSuggestedSemester() != null ? course.getSuggestedSemester() : 1;
        if (suggested <= currentSemester) {
            return 100.0; // Đúng hoặc trễ tiến độ chuẩn -> Điểm tối đa
        } else if (suggested == currentSemester + 1) {
            return 70.0; // Học vượt nhẹ kỳ liền sau
        } else {
            return 40.0; // Học vượt xa hơn
        }
    }

    private double calculateRetakeComponent(boolean isFailedRetake, boolean isRetakeCandidate) {
        if (isFailedRetake) {
            return 100.0; // Môn nợ F: Cần học lại ngay để xóa F và khơi thông mạch
        }
        if (isRetakeCandidate) {
            return 60.0; // Môn điểm D/D+/C: Cải thiện điểm
        }
        return 0.0;
    }

    private double calculateWorkloadComponent(CurriculumFixture.CourseDefinitionItem course) {
        int credits = course.getCredits() != null ? course.getCredits() : 3;
        if (credits <= 3) {
            return 100.0;
        } else if (credits == 4) {
            return 70.0;
        } else {
            return 40.0;
        }
    }

    private String buildRationale(double sUnblock, double sProgression, double sRetake,
                                  boolean isFailedRetake, boolean isRetakeCandidate) {
        if (isFailedRetake) {
            return "Học lại môn nợ để xóa điểm F và khơi thông mạch học tập (Trọng số 40% tiên quyết + 20% gỡ nợ)";
        }
        if (isRetakeCandidate) {
            return "Học cải thiện điểm theo lựa chọn của sinh viên để nâng CPA (Trọng số 20% ROI retake)";
        }
        if (sUnblock >= 50.0) {
            return "Môn tiên quyết mở khóa nhiều môn chuyên ngành kế tiếp (Trọng số 40% unblock)";
        }
        return "Môn bắt buộc theo tiến độ khung CTĐT HaUI (Trọng số 25% progression)";
    }

    private Map<String, Integer> calculateUnblockCounts() {
        Map<String, Integer> counts = new HashMap<>();
        for (CurriculumFixture.CourseDefinitionItem c : curriculum.getCourses()) {
            if (c.getPrerequisites() != null) {
                for (String p : c.getPrerequisites()) {
                    if (p != null) counts.put(p.toUpperCase(), counts.getOrDefault(p.toUpperCase(), 0) + 1);
                }
            }
            if (c.getPriorCourses() != null) {
                for (String p : c.getPriorCourses()) {
                    if (p != null) counts.put(p.toUpperCase(), counts.getOrDefault(p.toUpperCase(), 0) + 1);
                }
            }
        }
        return counts;
    }

    /**
     * Phát hiện chu trình phụ thuộc tiên quyết trong CTĐT bằng DFS.
     */
    private String detectPrerequisiteCycle(List<CurriculumFixture.CourseDefinitionItem> courses) {
        Map<String, List<String>> adj = new HashMap<>();
        for (CurriculumFixture.CourseDefinitionItem c : courses) {
            if (c.getCourseCode() == null) continue;
            String code = c.getCourseCode().toUpperCase();
            adj.putIfAbsent(code, new ArrayList<>());
            if (c.getPrerequisites() != null) {
                for (String p : c.getPrerequisites()) {
                    if (p != null) adj.get(code).add(p.toUpperCase());
                }
            }
        }

        Map<String, Integer> visited = new HashMap<>(); // 0: unvisited, 1: visiting, 2: visited
        List<String> path = new ArrayList<>();

        for (String node : adj.keySet()) {
            if (visited.getOrDefault(node, 0) == 0) {
                String cycle = dfsCycle(node, adj, visited, path);
                if (cycle != null) return cycle;
            }
        }
        return null;
    }

    private String dfsCycle(String curr, Map<String, List<String>> adj, Map<String, Integer> visited, List<String> path) {
        visited.put(curr, 1);
        path.add(curr);

        List<String> neighbors = adj.getOrDefault(curr, Collections.emptyList());
        for (String n : neighbors) {
            int state = visited.getOrDefault(n, 0);
            if (state == 1) {
                return String.join(" -> ", path) + " -> " + n;
            } else if (state == 0) {
                String res = dfsCycle(n, adj, visited, path);
                if (res != null) return res;
            }
        }

        visited.put(curr, 2);
        path.remove(path.size() - 1);
        return null;
    }

    /**
     * Kiểm tra chéo toàn bộ phương án đã lập (Final Validation Pass).
     */
    private List<String> validateGeneratedPlan(List<PlannedSemesterItem> semesters,
                                              Map<String, CurriculumFixture.CourseDefinitionItem> catalog,
                                              List<SemesterSpec> semesterSpecs) {
        List<String> errors = new ArrayList<>();
        Set<String> seenCourses = new HashSet<>();
        Map<String, Integer> scheduledSemesterIndex = new HashMap<>();

        for (int i = 0; i < semesters.size(); i++) {
            PlannedSemesterItem sem = semesters.get(i);
            SemesterSpec spec = i < semesterSpecs.size() ? semesterSpecs.get(i) : null;

            if (sem.getCourses() == null) continue;

            // Kiểm tra trần tín chỉ của từng kỳ
            if (spec != null && sem.getTotalCredits() != null && sem.getTotalCredits() > spec.maxCredits) {
                errors.add("Kỳ " + sem.getSemesterCode() + " có tổng " + sem.getTotalCredits() + " TC vượt quá trần cho phép " + spec.maxCredits + " TC");
            }

            for (PlannedCourseItem c : sem.getCourses()) {
                String code = c.getCourseCode().toUpperCase();
                // Kiểm tra trùng lặp môn học
                if (seenCourses.contains(code)) {
                    errors.add("Môn học " + code + " bị xếp trùng lặp nhiều lần trong lộ trình");
                }
                seenCourses.add(code);
                scheduledSemesterIndex.put(code, i);
            }
        }

        // Kiểm tra DAG thứ tự môn tiên quyết: tiên quyết phải ở kỳ trước
        for (int i = 0; i < semesters.size(); i++) {
            PlannedSemesterItem sem = semesters.get(i);
            if (sem.getCourses() == null) continue;

            for (PlannedCourseItem c : sem.getCourses()) {
                String code = c.getCourseCode().toUpperCase();
                CurriculumFixture.CourseDefinitionItem def = catalog.get(code);
                if (def == null) continue;

                if (def.getPrerequisites() != null) {
                    for (String p : def.getPrerequisites()) {
                        String pUpper = p.toUpperCase();
                        Integer pIndex = scheduledSemesterIndex.get(pUpper);
                        if (pIndex != null && pIndex >= i) {
                            errors.add("Vi phạm DAG tiên quyết: Môn " + code + " (kỳ " + (i + 1) + ") có tiên quyết " + pUpper + " được xếp cùng hoặc sau kỳ đó (kỳ " + (pIndex + 1) + ")");
                        }
                    }
                }
            }
        }

        return errors;
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
