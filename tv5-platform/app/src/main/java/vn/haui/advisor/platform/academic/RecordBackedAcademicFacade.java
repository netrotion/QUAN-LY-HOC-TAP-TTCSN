package vn.haui.advisor.platform.academic;

import vn.haui.advisor.academic.engine.PlanReconciler;
import vn.haui.advisor.academic.model.StudentProfileFixture;
import vn.haui.advisor.academic.service.DefaultAcademicFacade;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.platform.transcript.DbStudentAcademicRecordProvider;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.regex.Pattern;

/**
 * AcademicFacade của runtime: engine học vụ TV4 (DefaultAcademicFacade) trên hồ sơ DB.
 *
 * Trạng thái, điều kiện học phần và rà soát tốt nghiệp đọc hồ sơ qua StudentAcademicRecordProvider (Task 4.1). Các công cụ
 * còn lại của TV4 (sinh/thẩm định kế hoạch, mô phỏng điểm, xếp hạng học cải thiện, tính điểm mục tiêu, đối chiếu kế hoạch)
 * lại đọc hồ sơ dạng StudentProfileFixture và khi không có thì lấy hồ sơ mẫu của TV4 theo mã sinh viên. Lớp này cấp cho
 * các hàm đó đúng hồ sơ DB của sinh viên (Task 4.2b, 4.3b): bảng điểm đã xác nhận cùng CPA, tín chỉ tích lũy và mức cảnh
 * báo do chính engine tính từ bảng điểm đó; đối chiếu chạy trên kế hoạch đã lưu của sinh viên. Không có nhánh dữ liệu mẫu.
 */
public class RecordBackedAcademicFacade extends DefaultAcademicFacade {

    private static final Pattern MAIN_SEMESTER = Pattern.compile("^[0-9]{4}_(1|2)$");

    private final DbStudentAcademicRecordProvider records;
    private final AcademicEngineSources sources;
    private final StoredPlanSource plans;

    public RecordBackedAcademicFacade(DbStudentAcademicRecordProvider records, AcademicEngineSources sources,
                                      StoredPlanSource plans) {
        super(records, sources.policy(), sources.curriculum(), Map.of());
        this.records = records;
        this.sources = sources;
        this.plans = plans;
    }

    @Override
    public GenerateStudyPlanResponse generateStudyPlan(GenerateStudyPlanRequest request) {
        return withEngine(request == null ? null : request.getStudentId(), engine -> engine.generateStudyPlan(request));
    }

    @Override
    public ValidateStudyPlanResponse validateStudyPlan(ValidateStudyPlanRequest request) {
        return withEngine(request == null ? null : request.getStudentId(), engine -> engine.validateStudyPlan(request));
    }

    @Override
    public SimulateGradesResponse simulateGrades(SimulateGradesRequest request) {
        return withEngine(request == null ? null : request.getStudentId(), engine -> engine.simulateGrades(request));
    }

    @Override
    public RankRetakeCoursesResponse rankRetakeCourses(RankRetakeCoursesRequest request) {
        return withEngine(request == null ? null : request.getStudentId(), engine -> engine.rankRetakeCourses(request));
    }

    @Override
    public CalculateTargetGradesResponse calculateTargetGrades(CalculateTargetGradesRequest request) {
        return withEngine(request == null ? null : request.getStudentId(), engine -> engine.calculateTargetGrades(request));
    }

    /**
     * Đối chiếu trên kế hoạch đã lưu của chính sinh viên. Bộ đối chiếu TV4 có sẵn vài kế hoạch mẫu theo mã; kế hoạch không
     * thuộc sinh viên thì dừng thay vì để engine dùng kế hoạch mẫu trùng mã.
     */
    @Override
    public ReconcileStudyPlanResponse reconcileStudyPlan(ReconcileStudyPlanRequest request) {
        String studentId = request == null ? null : request.getStudentId();
        String planId = request == null ? null : request.getPlanId();
        List<PlannedSemesterItem> semesters = plans.semesters(studentId, planId)
                .orElseThrow(() -> new IllegalArgumentException("Không có kế hoạch " + planId + " của sinh viên đang xử lý"));
        return withProfile(studentId, profile -> {
            PlanReconciler reconciler = new PlanReconciler(sources.policy(), sources.curriculum(), Map.of(studentId, profile));
            reconciler.registerPlan(new PlanReconciler.PlanDefinition(planId, studentId, coursesBySemester(semesters)));
            return reconciler.reconcileStudyPlan(request);
        });
    }

    /** Engine TV4 với đúng một hồ sơ (hồ sơ DB của sinh viên), cùng quy chế và CTĐT với facade. */
    private <T> T withEngine(String studentId, Function<DefaultAcademicFacade, T> call) {
        return withProfile(studentId, profile -> call.apply(new DefaultAcademicFacade(records, sources.policy(),
                sources.curriculum(), Map.of(studentId, profile))));
    }

    /**
     * Hồ sơ đầu vào cho công cụ TV4: hồ sơ DB của sinh viên (bản platform đã ghim cho lượt gọi nếu có). CTĐT của sinh viên
     * khác CTĐT engine thì dừng, không tính trên CTĐT sai.
     */
    private <T> T withProfile(String studentId, Function<StudentProfileFixture, T> call) {
        if (studentId == null || studentId.isBlank()) {
            throw new IllegalArgumentException("Công cụ học vụ cần studentId của sinh viên đang xử lý");
        }
        StudentAcademicRecord record = records.getAcademicRecord(studentId);
        if (!sources.curriculumId().equals(record.getCurriculumId())) {
            throw new IllegalStateException("Engine học vụ chưa có CTĐT " + record.getCurriculumId() + " của sinh viên " + studentId);
        }
        return records.withRecord(record, () -> {
            AcademicStatusResponse status = getAcademicStatus(new AcademicStatusRequest(studentId, record.getDataRevision()));
            return call.apply(planningProfile(record, status));
        });
    }

    /** Học phần theo học kỳ của kế hoạch đã lưu, theo dạng bộ đối chiếu TV4 nhận (gộp các học kỳ trùng mã). */
    static Map<String, List<PlanReconciler.PlannedCourseItem>> coursesBySemester(List<PlannedSemesterItem> semesters) {
        Map<String, List<PlanReconciler.PlannedCourseItem>> result = new LinkedHashMap<>();
        for (PlannedSemesterItem semester : semesters) {
            List<PlanReconciler.PlannedCourseItem> courses = result.computeIfAbsent(semester.getSemesterCode(),
                    code -> new ArrayList<>());
            for (PlannedCourseItem course : semester.getCourses()) {
                courses.add(new PlanReconciler.PlannedCourseItem(course.getCourseCode(), course.getCourseName(),
                        course.getCredits(), course.getTargetGrade(), course.getCourseType(), course.getRationale()));
            }
        }
        return result;
    }

    /**
     * Hồ sơ đầu vào của planner tool, dựng từ hồ sơ DB và trạng thái học vụ engine tính trên chính hồ sơ đó.
     * Lần học giữ nguyên mã/tín chỉ/học kỳ/điểm; đạt hay không do engine xác định (GradeCalculator), như khi tính CPA.
     * Không điền majorCode: engine đổi sang CTĐT đóng gói sẵn khi gặp mã ngành CT1085, trong khi CTĐT của engine ở đây
     * đã là CTĐT của sinh viên trong DB.
     */
    static StudentProfileFixture planningProfile(StudentAcademicRecord record, AcademicStatusResponse status) {
        List<TranscriptAttemptItem> attempts = record.getAttempts() == null ? List.of() : record.getAttempts();
        StudentProfileFixture profile = new StudentProfileFixture();
        profile.setStudentId(record.getStudentId());
        profile.setDataRevision(record.getDataRevision());
        profile.setCpa(status.getCpa());
        profile.setAccumulatedCredits(status.getAccumulatedCredits() == null ? null : status.getAccumulatedCredits().doubleValue());
        profile.setRiskLevel(status.getRiskLevel());
        profile.setCurrentSemester(completedMainSemesters(attempts));
        profile.setCourseAttempts(attempts.stream().map(RecordBackedAcademicFacade::attempt).toList());
        return profile;
    }

    /** Số học kỳ chính (yyyy_1, yyyy_2) có trong bảng điểm; null khi chưa có, để engine dùng mặc định của nó. */
    static Integer completedMainSemesters(List<TranscriptAttemptItem> attempts) {
        long count = attempts.stream()
                .map(TranscriptAttemptItem::getSemesterCode)
                .filter(code -> code != null && MAIN_SEMESTER.matcher(code).matches())
                .distinct()
                .count();
        return count == 0 ? null : (int) count;
    }

    private static StudentProfileFixture.CourseAttempt attempt(TranscriptAttemptItem item) {
        StudentProfileFixture.CourseAttempt attempt = new StudentProfileFixture.CourseAttempt();
        attempt.setCourseCode(item.getCourseCode());
        attempt.setCourseName(item.getCourseName());
        attempt.setCredits(item.getCredits() == null ? null : item.getCredits().doubleValue());
        attempt.setSemesterCode(item.getSemesterCode());
        attempt.setLetterGrade(item.getLetterGrade());
        attempt.setScore10(item.getScore10() == null ? null : item.getScore10().doubleValue());
        return attempt;
    }
}
