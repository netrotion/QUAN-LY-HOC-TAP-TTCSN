package vn.haui.advisor.academic.engine;

import vn.haui.advisor.academic.fixture.AcademicFixtures;
import vn.haui.advisor.academic.model.CurriculumFixture;
import vn.haui.advisor.academic.model.PolicyDemo;
import vn.haui.advisor.academic.model.StudentProfileFixture;
import vn.haui.advisor.contracts.dto.CalculateTargetGradesRequest;
import vn.haui.advisor.contracts.dto.CalculateTargetGradesResponse;
import vn.haui.advisor.contracts.dto.RankRetakeCoursesRequest;
import vn.haui.advisor.contracts.dto.RankRetakeCoursesResponse;
import vn.haui.advisor.contracts.dto.RetakeCourseRecommendation;
import vn.haui.advisor.contracts.dto.SimulateGradesRequest;
import vn.haui.advisor.contracts.dto.SimulateGradesResponse;
import vn.haui.advisor.contracts.dto.SimulatedCourseGrade;
import vn.haui.advisor.contracts.dto.TargetCourseGradeRequirement;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Động cơ mô phỏng điểm số học tập (What-if Simulator) — TV4.
 *
 * Thực hiện:
 * 1. simulateGrades: Giả lập điểm số học kỳ tới, tính toán GPA kỳ và CPA tích lũy mới (BR-06).
 * 2. rankRetakeCourses: Xếp hạng môn học cải thiện điểm D, D+, C theo ROI tăng CPA cao nhất (BR-06).
 * 3. calculateTargetGrades: Tính toán GPA trung bình cần đạt và phân bổ điểm theo môn (BR-08, BR-09, BR-10).
 * 4. Tuân thủ chính sách Missing Data Strictness (không tự gán giá trị giả định cứng khi thiếu dữ liệu).
 * 5. Hỗ trợ đầy đủ hồ sơ sinh viên V0 và V1.
 */
public class GradeSimulator {

    private final PolicyDemo policy;
    private final CurriculumFixture curriculum;
    private final Map<String, StudentProfileFixture> profiles;

    public GradeSimulator() {
        this(AcademicFixtures.getPolicyDemo(), AcademicFixtures.getCurriculum(), AcademicFixtures.getStudentProfiles());
    }

    public GradeSimulator(PolicyDemo policy, Map<String, StudentProfileFixture> profiles) {
        this(policy, AcademicFixtures.getCurriculum(), profiles);
    }

    public GradeSimulator(PolicyDemo policy, CurriculumFixture curriculum, Map<String, StudentProfileFixture> profiles) {
        this.policy = policy != null ? policy : AcademicFixtures.getPolicyDemo();
        this.curriculum = curriculum != null ? curriculum : AcademicFixtures.getCurriculum();
        this.profiles = profiles != null ? new HashMap<>(profiles) : new HashMap<>();
    }

    /**
     * Tra cứu hồ sơ sinh viên theo studentId (ưu tiên profiles cấu hình, sau đó đến fixtures V0 và V1).
     */
    private StudentProfileFixture resolveProfile(String studentId) {
        if (studentId == null) {
            return null;
        }
        StudentProfileFixture profile = profiles.get(studentId);
        if (profile == null) {
            profile = AcademicFixtures.getStudentProfiles().get(studentId);
        }
        if (profile == null) {
            profile = AcademicFixtures.getStudentProfilesV1().get(studentId);
        }
        return profile;
    }

    /**
     * Xác định CTĐT phù hợp với sinh viên (hỗ trợ CTĐT KTPM V1 và CNTT V0).
     */
    private CurriculumFixture resolveCurriculum(StudentProfileFixture profile) {
        if (this.curriculum != null && this.curriculum != AcademicFixtures.getCurriculum()) {
            return this.curriculum;
        }
        if (profile != null && "CT1085".equalsIgnoreCase(profile.getMajorCode())) {
            return AcademicFixtures.getCurriculumV1();
        }
        return this.curriculum != null ? this.curriculum : AcademicFixtures.getCurriculum();
    }

    /**
     * Mô phỏng điểm số học kỳ tới và tính biến thiên CPA (BR-06, FR-14, US-11).
     *
     * @param request Yêu cầu mô phỏng chứa danh sách môn và điểm kỳ vọng
     * @return Kết quả mô phỏng gồm CPA hiện tại, GPA kỳ dự kiến, CPA mới và độ lệch CPA
     */
    public SimulateGradesResponse simulateGrades(SimulateGradesRequest request) {
        String studentId = request != null ? request.getStudentId() : null;
        String revision = request != null && request.getDataRevision() != null ? request.getDataRevision() : "rev-v0";

        List<SimulatedCourseGrade> courses = request != null && request.getCourses() != null
                ? request.getCourses()
                : Collections.emptyList();

        // 1. Tính GPA dự kiến cho các môn giả lập trong học kỳ
        BigDecimal expectedGpa = GradeCalculator.calculateSemesterGpa(courses);

        // 2. Tra cứu hồ sơ sinh viên (hỗ trợ cả V0 và V1)
        StudentProfileFixture profile = resolveProfile(studentId);

        // 3. Chính sách Missing Data Strictness:
        // Nếu không tìm thấy hồ sơ sinh viên -> Trả về null cho các trường điểm số của sinh viên,
        // tuyệt đối KHÔNG tự động fallback sang giá trị giả định cứng (như CPA = 2.45 hay 68 TC).
        if (profile == null) {
            return new SimulateGradesResponse(studentId, null, expectedGpa, null, null, revision);
        }

        // 4. Lấy CPA và số tín chỉ tích lũy hiện tại từ hồ sơ
        BigDecimal currentCpa = profile.getCpa();
        if (currentCpa == null && profile.getCourseAttempts() != null && !profile.getCourseAttempts().isEmpty()) {
            currentCpa = GradeCalculator.calculateCpa(profile.getCourseAttempts());
        }

        Integer accumulatedCredits = profile.getAccumulatedCredits();
        if (accumulatedCredits == null && profile.getAccumulatedCreditsRaw() != null) {
            accumulatedCredits = (int) Math.round(profile.getAccumulatedCreditsRaw());
        }

        // Nếu sinh viên chưa có bất kỳ dữ liệu điểm nào (ví dụ sinh viên mới nhập học)
        if (currentCpa == null && (accumulatedCredits == null || accumulatedCredits == 0)) {
            BigDecimal projectedCpa = expectedGpa;
            return new SimulateGradesResponse(studentId, null, expectedGpa, projectedCpa, null, revision);
        }

        // Nếu không xác định được CPA hiện tại -> Giữ null theo quy tắc missing data
        if (currentCpa == null) {
            return new SimulateGradesResponse(studentId, null, expectedGpa, null, null, revision);
        }

        // 5. Tính CPA dự kiến qua GradeCalculator có phân biệt môn mới vs môn cải thiện vs môn học lại F (BR-06)
        BigDecimal projectedCpa = GradeCalculator.simulateCpaWithHistory(
                currentCpa,
                accumulatedCredits != null ? accumulatedCredits : 0,
                profile.getCourseAttempts(),
                courses
        );

        BigDecimal cpaDelta = projectedCpa != null
                ? projectedCpa.subtract(currentCpa).setScale(GradeCalculator.DEFAULT_SCALE, GradeCalculator.ROUNDING_MODE)
                : null;

        return new SimulateGradesResponse(studentId, currentCpa, expectedGpa, projectedCpa, cpaDelta, revision);
    }

    /**
     * Xếp hạng các môn học cải thiện điểm (D, D+, C) theo ROI tăng CPA cao nhất (BR-06, FR-14, US-11).
     *
     * @param request Yêu cầu xếp hạng môn cải thiện kèm studentId và maxSuggestions
     * @return Danh sách đề xuất môn học cải thiện kèm mức tăng CPA dự kiến (cpaDelta) và thứ hạng
     */
    public RankRetakeCoursesResponse rankRetakeCourses(RankRetakeCoursesRequest request) {
        String studentId = request != null ? request.getStudentId() : null;
        Integer maxSuggestions = request != null ? request.getMaxSuggestions() : null;

        // Nếu maxSuggestions <= 0: Trả về danh sách rỗng theo đặc tả
        if (maxSuggestions != null && maxSuggestions <= 0) {
            String rev = request != null && request.getDataRevision() != null ? request.getDataRevision() : "rev-v0";
            return new RankRetakeCoursesResponse(studentId, Collections.emptyList(), rev);
        }

        StudentProfileFixture profile = resolveProfile(studentId);
        String revision = request != null && request.getDataRevision() != null
                ? request.getDataRevision()
                : (profile != null && profile.getDataRevision() != null ? profile.getDataRevision() : "rev-v0");

        // Missing Data Strictness: Không có hồ sơ hoặc hồ sơ rỗng -> Trả về danh sách rỗng an toàn, không tự bịa dữ liệu
        if (profile == null || profile.getCourseAttempts() == null || profile.getCourseAttempts().isEmpty()) {
            return new RankRetakeCoursesResponse(studentId, Collections.emptyList(), revision);
        }

        // 1. Nhóm theo mã môn duy nhất và lấy lần học có kết quả tốt nhất (BR-06)
        Map<String, GradeCalculator.CourseAttemptSummary> bestAttempts =
                GradeCalculator.extractBestHistoryAttempts(profile.getCourseAttempts());

        if (bestAttempts.isEmpty()) {
            return new RankRetakeCoursesResponse(studentId, Collections.emptyList(), revision);
        }

        // 2. Xác định tổng số tín chỉ tính CPA của sinh viên (không hardcode 68)
        int totalCredits = 0;
        if (profile.getAccumulatedCredits() != null && profile.getAccumulatedCredits() > 0) {
            totalCredits = profile.getAccumulatedCredits();
        } else {
            for (GradeCalculator.CourseAttemptSummary att : bestAttempts.values()) {
                totalCredits += att.credits();
            }
        }

        // Nếu tổng tín chỉ không xác định hoặc <= 0: Tránh chia cho 0, trả về danh sách rỗng an toàn
        if (totalCredits <= 0) {
            return new RankRetakeCoursesResponse(studentId, Collections.emptyList(), revision);
        }

        // 3. Lọc danh sách môn hợp lệ theo BR-06:
        // - Chỉ lấy môn có điểm tốt nhất là D, D+, C (1.0 <= pts <= 2.0, passed = true)
        // - Loại trừ F (học lại bắt buộc), loại trừ A, B+, B, C+
        // - Loại trừ môn chứng chỉ phi tín chỉ và môn chưa kết chuyển điểm (đã lọc trong extractBestHistoryAttempts)
        List<RetakeCourseRecommendation> recommendations = new ArrayList<>();

        for (GradeCalculator.CourseAttemptSummary att : bestAttempts.values()) {
            if (!GradeCalculator.isImprovementEligibleGrade(att.letterGrade(), att.points())) {
                continue;
            }
            if (!att.passed() || att.points() == 0.0) {
                // Điểm F hoặc không đạt -> Học lại bắt buộc, không đưa vào danh sách học cải thiện tự chọn
                continue;
            }

            double currentPts = att.points();
            double targetPts = 4.0; // Kỳ vọng đạt điểm A
            int credits = att.credits();

            BigDecimal cpaDelta = GradeCalculator.calculateRetakeRoi(credits, currentPts, targetPts, totalCredits);

            String courseName = att.courseName() != null ? att.courseName() : att.courseCode();
            String rationale = "Cải thiện từ " + att.letterGrade() + " lên A mang lại ROI CPA cao nhất";

            recommendations.add(new RetakeCourseRecommendation(
                    att.courseCode(),
                    courseName,
                    credits,
                    att.letterGrade(),
                    BigDecimal.valueOf(currentPts).setScale(1, RoundingMode.HALF_UP),
                    "A",
                    BigDecimal.valueOf(targetPts).setScale(1, RoundingMode.HALF_UP),
                    cpaDelta,
                    0, // Sẽ gán thứ hạng sau khi sắp xếp
                    rationale
            ));
        }

        // 4. Sắp xếp với tie-breaking 3 cấp:
        // (1) cpaDelta giảm dần
        // (2) credits tăng dần (ít tín chỉ hơn xếp trước)
        // (3) courseCode tăng dần theo thứ tự bảng chữ cái (A-Z)
        recommendations.sort((r1, r2) -> {
            int deltaCmp = r2.getCpaDelta().compareTo(r1.getCpaDelta());
            if (deltaCmp != 0) {
                return deltaCmp;
            }
            int creditCmp = Integer.compare(
                    r1.getCredits() != null ? r1.getCredits() : 0,
                    r2.getCredits() != null ? r2.getCredits() : 0
            );
            if (creditCmp != 0) {
                return creditCmp;
            }
            String code1 = r1.getCourseCode() != null ? r1.getCourseCode() : "";
            String code2 = r2.getCourseCode() != null ? r2.getCourseCode() : "";
            return code1.compareTo(code2);
        });

        // 5. Gán rank 1, 2, ...
        for (int i = 0; i < recommendations.size(); i++) {
            recommendations.get(i).setRank(i + 1);
        }

        // 6. Giới hạn số lượng theo maxSuggestions nếu có
        if (maxSuggestions != null && maxSuggestions > 0 && recommendations.size() > maxSuggestions) {
            recommendations = new ArrayList<>(recommendations.subList(0, maxSuggestions));
        }

        return new RankRetakeCoursesResponse(studentId, recommendations, revision);
    }

    /**
     * Lớp nội bộ lưu trữ thông tin học phần ứng viên chưa hoàn thành.
     */
    private record CandidateCourse(
            String courseCode,
            String courseName,
            int credits,
            int suggestedSemester,
            boolean isFailedRetake
    ) {}

    /**
     * Tính toán điểm số trung bình cần đạt và phân bổ điểm mục tiêu theo môn học cho các kỳ còn lại (BR-08, BR-09, BR-10).
     *
     * @param request Yêu cầu tính điểm mục tiêu kèm targetCpa và targetGraduationSemester
     * @return Response chứa requiredAverageGpa, danh sách courseRequirements và warnings
     */
    public CalculateTargetGradesResponse calculateTargetGrades(CalculateTargetGradesRequest request) {
        String studentId = request != null ? request.getStudentId() : null;
        BigDecimal targetCpa = request != null ? request.getTargetCpa() : null;
        String revision = request != null && request.getDataRevision() != null ? request.getDataRevision() : "rev-v0";

        List<String> warnings = new ArrayList<>();

        if (request == null) {
            warnings.add("Yêu cầu không hợp lệ (request null)");
            return new CalculateTargetGradesResponse(null, null, null, 0, null, Collections.emptyList(), warnings, revision);
        }

        // 1. Kiểm tra tính hợp lệ của targetCpa (Special Cases 1, 2)
        if (targetCpa == null) {
            warnings.add("CPA mục tiêu không được để trống");
            return new CalculateTargetGradesResponse(studentId, null, null, 0, null, Collections.emptyList(), warnings, revision);
        }
        if (targetCpa.compareTo(new BigDecimal("4.00")) > 0) {
            warnings.add("CPA mục tiêu không hợp lệ: vượt quá thang điểm tối đa 4.00");
            return new CalculateTargetGradesResponse(studentId, null, targetCpa, 0, null, Collections.emptyList(), warnings, revision);
        }
        if (targetCpa.compareTo(BigDecimal.ZERO) < 0) {
            warnings.add("CPA mục tiêu không hợp lệ: nhỏ hơn 0.00");
            return new CalculateTargetGradesResponse(studentId, null, targetCpa, 0, null, Collections.emptyList(), warnings, revision);
        }

        // 2. Tra cứu hồ sơ sinh viên (Special Case 7)
        StudentProfileFixture profile = resolveProfile(studentId);
        if (profile == null) {
            warnings.add("Không tìm thấy hồ sơ sinh viên");
            return new CalculateTargetGradesResponse(studentId, null, targetCpa, 0, null, Collections.emptyList(), warnings, revision);
        }

        if (profile.getDataRevision() != null && request.getDataRevision() == null) {
            revision = profile.getDataRevision();
        }

        // 3. Xác định CPA và số tín chỉ tích lũy hiện tại (Special Case 8)
        BigDecimal currentCpa = profile.getCpa();
        if (currentCpa == null && profile.getCourseAttempts() != null && !profile.getCourseAttempts().isEmpty()) {
            currentCpa = GradeCalculator.calculateCpa(profile.getCourseAttempts());
        }

        Integer currentCredits = profile.getAccumulatedCredits();
        if (currentCredits == null && profile.getAccumulatedCreditsRaw() != null) {
            currentCredits = (int) Math.round(profile.getAccumulatedCreditsRaw());
        }
        if (currentCredits == null && profile.getCourseAttempts() != null) {
            int earned = 0;
            boolean hasAnyEarned = false;
            for (StudentProfileFixture.CourseAttempt a : profile.getCourseAttempts()) {
                if (a == null) continue;
                Boolean passed = a.getPassed() != null ? a.getPassed() : GradeCalculator.isPassed(a.getLetterGrade());
                if (Boolean.TRUE.equals(passed) && a.getCredits() != null && a.getCredits() > 0) {
                    earned += a.getCredits();
                    hasAnyEarned = true;
                }
            }
            if (hasAnyEarned) {
                currentCredits = earned;
            }
        }
        int curCredits = currentCredits != null ? currentCredits : 0;

        // Nếu sinh viên chưa có CPA và cũng không có tín chỉ nào (sinh viên mới)
        if (currentCpa == null && curCredits == 0) {
            currentCpa = BigDecimal.ZERO;
        } else if (currentCpa == null) {
            warnings.add("Thiếu dữ liệu CPA hiện tại của sinh viên, không thể tính toán mục tiêu");
            return new CalculateTargetGradesResponse(studentId, null, targetCpa, 0, null, Collections.emptyList(), warnings, revision);
        }

        // 4. Xác định CTĐT và tổng số tín chỉ yêu cầu (Special Cases 9, 12)
        CurriculumFixture targetCurriculum = resolveCurriculum(profile);
        int totalRequired = 135;
        if (profile.getTotalCreditsRequired() != null && profile.getTotalCreditsRequired() > 0) {
            totalRequired = profile.getTotalCreditsRequired();
        } else if (targetCurriculum != null && targetCurriculum.getTotalCredits() != null && targetCurriculum.getTotalCredits() > 0) {
            totalRequired = targetCurriculum.getTotalCredits();
        }

        if (profile.getTotalCreditsRequired() != null && targetCurriculum != null && targetCurriculum.getTotalCredits() != null
                && !profile.getTotalCreditsRequired().equals(targetCurriculum.getTotalCredits())) {
            warnings.add("Lưu ý: Tổng tín chỉ yêu cầu trong hồ sơ (" + profile.getTotalCreditsRequired() + " TC) khác với chuẩn CTĐT (" + targetCurriculum.getTotalCredits() + " TC). Sử dụng tổng tín chỉ hồ sơ sinh viên.");
        }

        int remainingCredits = Math.max(0, totalRequired - curCredits);

        // 5. Xử lý trường hợp không còn tín chỉ học mới (Special Case 5)
        if (remainingCredits == 0) {
            if (currentCpa.compareTo(targetCpa) >= 0) {
                warnings.add("Sinh viên đã hoàn thành đủ 100% tín chỉ và đạt CPA mục tiêu (" + targetCpa + ")");
            } else {
                warnings.add("Sinh viên không còn tín chỉ học mới và CPA hiện tại chưa đạt mục tiêu: Cần xem xét đăng ký học cải thiện điểm các môn D, D+, C theo chính sách BR-06 để nâng CPA; không tự tạo môn học mới.");
            }
            return new CalculateTargetGradesResponse(studentId, currentCpa, targetCpa, 0, null, Collections.emptyList(), warnings, revision);
        }

        // 6. Tính điểm trung bình cần đạt requiredAverageGpa qua GradeCalculator
        BigDecimal reqGpa = GradeCalculator.calculateRequiredAverageGpa(currentCpa, curCredits, targetCpa, remainingCredits);

        // 7. Xử lý mục tiêu khả thi vs không khả thi (Special Cases 3, 4, 6)
        if (reqGpa != null) {
            if (reqGpa.compareTo(new BigDecimal("4.00")) > 0) {
                warnings.add("Mục tiêu CPA không khả thi về mặt toán học với số tín chỉ còn lại (yêu cầu GPA > 4.00)");
                return new CalculateTargetGradesResponse(studentId, currentCpa, targetCpa, remainingCredits, reqGpa, Collections.emptyList(), warnings, revision);
            } else if (currentCpa.compareTo(targetCpa) >= 0) {
                warnings.add("CPA hiện tại (" + currentCpa + ") đã đạt hoặc vượt CPA mục tiêu (" + targetCpa + "). Chỉ cần duy trì kết quả đạt các môn còn lại.");
            } else if (reqGpa.compareTo(new BigDecimal("3.40")) >= 0) {
                warnings.add("Mục tiêu đòi hỏi GPA trung bình các kỳ còn lại >= " + reqGpa + " (mức tương đối thử thách)");
                warnings.add("Gợi ý: Sinh viên có thể kết hợp học cải thiện các môn điểm D, D+, C theo BR-06 để giảm áp lực điểm cho các kỳ còn lại.");
            }
        }

        // 8. Thu thập danh sách môn chưa hoàn thành từ CTĐT và các môn nợ F (Special Case 10)
        Set<String> passedCodes = new HashSet<>();
        Map<String, StudentProfileFixture.CourseAttempt> failedAttempts = new LinkedHashMap<>();

        if (profile.getCourseAttempts() != null) {
            for (StudentProfileFixture.CourseAttempt a : profile.getCourseAttempts()) {
                if (a == null || a.getCourseCode() == null) continue;
                String code = a.getCourseCode().trim().toUpperCase();
                Boolean passed = a.getPassed() != null ? a.getPassed() : GradeCalculator.isPassed(a.getLetterGrade());
                if (Boolean.TRUE.equals(passed)) {
                    passedCodes.add(code);
                    failedAttempts.remove(code);
                } else if (Boolean.FALSE.equals(passed)) {
                    if (!passedCodes.contains(code)) {
                        failedAttempts.put(code, a);
                    }
                }
            }
        }

        if (!failedAttempts.isEmpty()) {
            for (String fCode : failedAttempts.keySet()) {
                warnings.add("Sinh viên có môn nợ điểm F chưa hoàn thành cần ưu tiên đăng ký học lại: " + fCode);
            }
        }

        List<CandidateCourse> uncompletedCandidates = new ArrayList<>();
        Set<String> addedCodes = new HashSet<>();

        // Môn nợ F trước
        for (StudentProfileFixture.CourseAttempt fa : failedAttempts.values()) {
            String code = fa.getCourseCode().trim().toUpperCase();
            if (GradeCalculator.isCertificateCourse(code, fa.getCourseName())) continue;
            int cr = fa.getCredits() != null && fa.getCredits() > 0 ? fa.getCredits() : 3;
            String name = fa.getCourseName() != null ? fa.getCourseName() : code;
            uncompletedCandidates.add(new CandidateCourse(code, name, cr, 0, true));
            addedCodes.add(code);
        }

        // Các môn chưa hoàn thành trong CTĐT
        if (targetCurriculum == null || targetCurriculum.getCourses() == null || targetCurriculum.getCourses().isEmpty()) {
            warnings.add("Không tìm thấy chương trình đào tạo phù hợp cho sinh viên");
            if (uncompletedCandidates.isEmpty()) {
                return new CalculateTargetGradesResponse(studentId, currentCpa, targetCpa, remainingCredits, reqGpa, Collections.emptyList(), warnings, revision);
            }
        } else {
            for (CurriculumFixture.CourseDefinitionItem c : targetCurriculum.getCourses()) {
                if (c == null || c.getCourseCode() == null) continue;
                String code = c.getCourseCode().trim().toUpperCase();
                if (passedCodes.contains(code) || addedCodes.contains(code)) continue;
                if (GradeCalculator.isCertificateCourse(code, c.getCourseName())) continue;

                int cr = c.getCredits() != null && c.getCredits() > 0 ? c.getCredits() : 3;
                int sem = c.getSuggestedSemester() != null ? c.getSuggestedSemester() : 99;
                uncompletedCandidates.add(new CandidateCourse(code, c.getCourseName(), cr, sem, false));
                addedCodes.add(code);
            }
        }

        // Sắp xếp deterministic:
        // (1) Môn nợ F trước
        // (2) suggestedSemester tăng dần
        // (3) courseCode tăng dần (A-Z)
        uncompletedCandidates.sort((c1, c2) -> {
            if (c1.isFailedRetake != c2.isFailedRetake) {
                return c1.isFailedRetake ? -1 : 1;
            }
            int semCmp = Integer.compare(c1.suggestedSemester, c2.suggestedSemester);
            if (semCmp != 0) return semCmp;
            return c1.courseCode.compareTo(c2.courseCode);
        });

        // 9. Chọn các môn chưa học cho đến khi đủ số tín chỉ remainingCredits
        List<CandidateCourse> selectedCourses = new ArrayList<>();
        int selectedCredits = 0;
        for (CandidateCourse c : uncompletedCandidates) {
            if (selectedCredits >= remainingCredits) {
                break;
            }
            selectedCourses.add(c);
            selectedCredits += c.credits;
        }

        if (selectedCredits < remainingCredits) {
            warnings.add("Lưu ý: Tổng số tín chỉ các môn học chưa tích lũy trong CTĐT (" + selectedCredits + " TC) ít hơn số tín chỉ còn lại theo hồ sơ (" + remainingCredits + " TC). Cần đăng ký thêm học phần tự chọn hoặc học cải thiện.");
        }

        // 10. Phân bổ điểm rời rạc A, B+, B, C+, C, D+, D theo cơ chế Round-robin tối ưu
        List<TargetCourseGradeRequirement> courseRequirements = new ArrayList<>();
        if (!selectedCourses.isEmpty() && reqGpa != null) {
            record GradeLevel(String letter, double points) {}
            List<GradeLevel> gradeLevels = List.of(
                    new GradeLevel("A", 4.0),
                    new GradeLevel("B+", 3.5),
                    new GradeLevel("B", 3.0),
                    new GradeLevel("C+", 2.5),
                    new GradeLevel("C", 2.0),
                    new GradeLevel("D+", 1.5),
                    new GradeLevel("D", 1.0)
            );

            int n = selectedCourses.size();
            int[] gradeIndices = new int[n]; // Tất cả bắt đầu ở mức A (4.0)

            BigDecimal neededWeightedPoints = reqGpa.compareTo(BigDecimal.ONE) > 0
                    ? reqGpa.multiply(BigDecimal.valueOf(selectedCredits))
                    : BigDecimal.valueOf(selectedCredits);

            BigDecimal currentWeightedPoints = BigDecimal.valueOf(4.0).multiply(BigDecimal.valueOf(selectedCredits));
            BigDecimal surplus = currentWeightedPoints.subtract(neededWeightedPoints);

            boolean canDowngradeMore = true;
            while (canDowngradeMore && surplus.compareTo(BigDecimal.ZERO) > 0) {
                canDowngradeMore = false;
                for (int i = n - 1; i >= 0; i--) {
                    int currentLevel = gradeIndices[i];
                    if (currentLevel < gradeLevels.size() - 1) {
                        double pointDiff = gradeLevels.get(currentLevel).points - gradeLevels.get(currentLevel + 1).points;
                        BigDecimal cost = BigDecimal.valueOf(pointDiff).multiply(BigDecimal.valueOf(selectedCourses.get(i).credits));
                        if (surplus.compareTo(cost) >= 0) {
                            gradeIndices[i]++;
                            surplus = surplus.subtract(cost);
                            canDowngradeMore = true;
                        }
                    }
                }
            }

            for (int i = 0; i < n; i++) {
                CandidateCourse c = selectedCourses.get(i);
                GradeLevel gl = gradeLevels.get(gradeIndices[i]);
                BigDecimal pts = BigDecimal.valueOf(gl.points).setScale(1, RoundingMode.HALF_UP);

                String rationale;
                if (c.isFailedRetake) {
                    rationale = "Môn nợ F cần học lại: Cần đạt mức " + gl.letter + " (" + pts + ") để hoàn thành tiến độ và tích lũy đạt CPA mục tiêu " + targetCpa;
                } else {
                    rationale = "Cần đạt mức " + gl.letter + " (" + pts + ") để đảm bảo CPA mục tiêu " + targetCpa;
                }

                courseRequirements.add(new TargetCourseGradeRequirement(
                        c.courseCode,
                        c.courseName,
                        c.credits,
                        gl.letter,
                        pts,
                        rationale
                ));
            }
        }

        return new CalculateTargetGradesResponse(studentId, currentCpa, targetCpa, remainingCredits, reqGpa,
                courseRequirements, warnings, revision);
    }
}
