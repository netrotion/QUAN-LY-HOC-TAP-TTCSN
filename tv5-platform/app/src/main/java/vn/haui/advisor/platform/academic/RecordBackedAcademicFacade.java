package vn.haui.advisor.platform.academic;

import vn.haui.advisor.academic.model.StudentProfileFixture;
import vn.haui.advisor.academic.service.DefaultAcademicFacade;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.platform.transcript.DbStudentAcademicRecordProvider;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.regex.Pattern;

/**
 * AcademicFacade của runtime: engine học vụ TV4 (DefaultAcademicFacade) trên hồ sơ DB.
 *
 * Trạng thái, điều kiện học phần và rà soát tốt nghiệp đọc hồ sơ qua StudentAcademicRecordProvider (Task 4.1). Planner tool
 * của TV4 (generateStudyPlan, validateStudyPlan) lại đọc hồ sơ dạng StudentProfileFixture và khi không có thì lấy hồ sơ mẫu
 * của TV4 theo mã sinh viên. Lớp này cấp cho hai hàm đó đúng hồ sơ DB của sinh viên (Task 4.2b): bảng điểm đã xác nhận cùng
 * CPA, tín chỉ tích lũy và mức cảnh báo do chính engine tính từ bảng điểm đó. Không có nhánh hồ sơ mẫu.
 */
public class RecordBackedAcademicFacade extends DefaultAcademicFacade {

    private static final Pattern MAIN_SEMESTER = Pattern.compile("^[0-9]{4}_(1|2)$");

    private final DbStudentAcademicRecordProvider records;
    private final AcademicEngineSources sources;

    public RecordBackedAcademicFacade(DbStudentAcademicRecordProvider records, AcademicEngineSources sources) {
        super(records, sources.policy(), sources.curriculum(), Map.of());
        this.records = records;
        this.sources = sources;
    }

    @Override
    public GenerateStudyPlanResponse generateStudyPlan(GenerateStudyPlanRequest request) {
        return withPlanner(request == null ? null : request.getStudentId(), planner -> planner.generateStudyPlan(request));
    }

    @Override
    public ValidateStudyPlanResponse validateStudyPlan(ValidateStudyPlanRequest request) {
        return withPlanner(request == null ? null : request.getStudentId(), planner -> planner.validateStudyPlan(request));
    }

    /**
     * Chạy planner tool TV4 với đúng một hồ sơ: hồ sơ DB của sinh viên (bản platform đã ghim cho lượt gọi nếu có), cùng
     * quy chế và CTĐT với facade. CTĐT của sinh viên khác CTĐT engine thì dừng, không lập kế hoạch trên CTĐT sai.
     */
    private <T> T withPlanner(String studentId, Function<DefaultAcademicFacade, T> call) {
        if (studentId == null || studentId.isBlank()) {
            throw new IllegalArgumentException("Planner tool cần studentId của sinh viên đang xử lý");
        }
        StudentAcademicRecord record = records.getAcademicRecord(studentId);
        if (!sources.curriculumId().equals(record.getCurriculumId())) {
            throw new IllegalStateException("Engine học vụ chưa có CTĐT " + record.getCurriculumId() + " của sinh viên " + studentId);
        }
        return records.withRecord(record, () -> {
            AcademicStatusResponse status = getAcademicStatus(new AcademicStatusRequest(studentId, record.getDataRevision()));
            DefaultAcademicFacade planner = new DefaultAcademicFacade(records, sources.policy(), sources.curriculum(),
                    Map.of(studentId, planningProfile(record, status)));
            return call.apply(planner);
        });
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
