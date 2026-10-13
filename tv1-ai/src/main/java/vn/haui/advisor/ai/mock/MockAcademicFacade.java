package vn.haui.advisor.ai.mock;

import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.AcademicFacade;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Fixture giả lập của AcademicFacade dùng cho chế độ MOCK và kiểm thử tích hợp.
 * CHỈ được kích hoạt khi ai.mode=mock và chưa có bean AcademicFacade thật từ TV4.
 * Tuyệt đối KHÔNG được nạp trong chế độ LIVE.
 */
public class MockAcademicFacade implements AcademicFacade {

    private List<String> simulatedWarnings = new ArrayList<>();

    public MockAcademicFacade() {
    }

    public MockAcademicFacade(List<String> simulatedWarnings) {
        if (simulatedWarnings != null) {
            this.simulatedWarnings = new ArrayList<>(simulatedWarnings);
        }
    }

    public void setSimulatedWarnings(List<String> simulatedWarnings) {
        this.simulatedWarnings = simulatedWarnings != null ? new ArrayList<>(simulatedWarnings) : new ArrayList<>();
    }

    @Override
    public AcademicStatusResponse getAcademicStatus(AcademicStatusRequest request) {
        String studentId = request != null ? request.getStudentId() : "MOCK_STUDENT";
        return new AcademicStatusResponse(
                studentId,
                new BigDecimal("3.20"),
                new BigDecimal("3.15"),
                65,
                145,
                simulatedWarnings.isEmpty() ? AcademicRiskLevel.NORMAL : AcademicRiskLevel.WARNING_LEVEL_1,
                Collections.unmodifiableList(simulatedWarnings),
                "MOCK_REVISION_V0"
        );
    }

    @Override
    public GenerateStudyPlanResponse generateStudyPlan(GenerateStudyPlanRequest request) {
        String studentId = request != null ? request.getStudentId() : "MOCK_STUDENT";

        List<PlannedCourseItem> courses = List.of(
                new PlannedCourseItem("IT6015", "Phát triển ứng dụng Web", 3, "A", "Môn bắt buộc ngành CNTT"),
                new PlannedCourseItem("IT6020", "Trí tuệ nhân tạo", 3, "B+", "Môn cơ sở nhóm ngành")
        );

        PlannedSemesterItem semester = new PlannedSemesterItem(
                "2024_2025_HK2",
                "Học kỳ 2 (2024 - 2025)",
                courses,
                6,
                new BigDecimal("3.35")
        );

        return new GenerateStudyPlanResponse(
                "PLAN-MOCK-001",
                studentId,
                StudyPlanStatus.DRAFT,
                List.of(semester),
                new BigDecimal("3.25"),
                Collections.unmodifiableList(simulatedWarnings),
                1,
                "MOCK_REVISION_V0"
        );
    }

    @Override
    public CourseEligibilityResponse checkCourseEligibility(CourseEligibilityRequest request) {
        String courseCode = request != null && request.getCourseCode() != null ? request.getCourseCode() : "MOCK_COURSE";
        return new CourseEligibilityResponse(
                courseCode,
                true,
                List.of(),
                List.of(),
                "MOCK_REVISION_V0"
        );
    }

    @Override
    public ValidateStudyPlanResponse validateStudyPlan(ValidateStudyPlanRequest request) {
        boolean valid = simulatedWarnings.isEmpty();
        return new ValidateStudyPlanResponse(
                valid,
                valid ? StudyPlanStatus.VALIDATED : StudyPlanStatus.DRAFT,
                valid ? List.of() : simulatedWarnings,
                List.of(),
                1,
                "MOCK_REVISION_V0"
        );
    }

    @Override
    public SimulateGradesResponse simulateGrades(SimulateGradesRequest request) {
        String studentId = request != null ? request.getStudentId() : "MOCK_STUDENT";
        return new SimulateGradesResponse(
                studentId,
                new BigDecimal("3.00"),
                new BigDecimal("3.50"),
                new BigDecimal("3.20"),
                new BigDecimal("0.20"),
                "MOCK_REVISION_V0"
        );
    }

    @Override
    public RankRetakeCoursesResponse rankRetakeCourses(RankRetakeCoursesRequest request) {
        String studentId = request != null ? request.getStudentId() : "MOCK_STUDENT";
        List<RetakeCourseRecommendation> recs = List.of(
                new RetakeCourseRecommendation(
                        "LP6010",
                        "Triết học Mác-Lênin",
                        3,
                        "D",
                        new BigDecimal("1.0"),
                        "B+",
                        new BigDecimal("3.5"),
                        new BigDecimal("0.08"),
                        1,
                        "Cải thiện điểm từ D lên B+ với 3 tín chỉ mang lại hiệu quả ROI CPA cao nhất"
                ),
                new RetakeCourseRecommendation(
                        "LP6012",
                        "Chủ nghĩa xã hội khoa học",
                        2,
                        "D+",
                        new BigDecimal("1.5"),
                        "A",
                        new BigDecimal("4.0"),
                        new BigDecimal("0.05"),
                        2,
                        "Cải thiện điểm từ D+ lên A với 2 tín chỉ"
                )
        );
        return new RankRetakeCoursesResponse(studentId, recs, "MOCK_REVISION_V0");
    }

    @Override
    public CalculateTargetGradesResponse calculateTargetGrades(CalculateTargetGradesRequest request) {
        String studentId = request != null ? request.getStudentId() : "MOCK_STUDENT";
        BigDecimal target = request != null && request.getTargetCpa() != null ? request.getTargetCpa() : new BigDecimal("3.50");
        return new CalculateTargetGradesResponse(
                studentId,
                new BigDecimal("3.18"),
                target,
                60,
                new BigDecimal("3.65"),
                List.of(
                        new TargetCourseGradeRequirement("IT6015", "Phát triển ứng dụng Web", 3, "B+", new BigDecimal("3.5"), "Môn bắt buộc"),
                        new TargetCourseGradeRequirement("IT6020", "Trí tuệ nhân tạo", 3, "A", new BigDecimal("4.0"), "Môn cơ sở")
                ),
                simulatedWarnings,
                "MOCK_REVISION_V0"
        );
    }

    @Override
    public GraduationAuditResponse runGraduationAudit(GraduationAuditRequest request) {
        String studentId = request != null ? request.getStudentId() : "MOCK_STUDENT";
        List<AuditChecklistItem> checklist = List.of(
                new AuditChecklistItem("Tín chỉ", "Tín chỉ tích lũy chuyên ngành", false, 150, 61, "Cần tích lũy thêm 89 tín chỉ"),
                new AuditChecklistItem("Chứng chỉ", "Chuẩn đầu ra tin học MOS", false, 0, 0, "Bắt buộc trước đợt xét tốt nghiệp"),
                new AuditChecklistItem("Chứng chỉ", "Chuẩn đầu ra ngoại ngữ TOEIC", true, 0, 0, "Đã hoàn thành"),
                new AuditChecklistItem("Chứng chỉ", "Giáo dục quốc phòng an ninh", true, 0, 0, "Đã hoàn thành"),
                new AuditChecklistItem("Khóa luận", "Đồ án tốt nghiệp", false, 10, 0, "Điều kiện cuối khóa")
        );
        return new GraduationAuditResponse(
                studentId,
                false,
                40,
                61,
                150,
                checklist,
                List.of(),
                "MOCK_REVISION_V0"
        );
    }

    @Override
    public ReconcileStudyPlanResponse reconcileStudyPlan(ReconcileStudyPlanRequest request) {
        String studentId = request != null ? request.getStudentId() : "MOCK_STUDENT";
        return new ReconcileStudyPlanResponse(
                "PLAN-MOCK-001",
                studentId,
                true,
                List.of("IT6015"),
                List.of(),
                List.of(),
                1,
                "MOCK_REVISION_V0"
        );
    }

    @Override
    public java.util.Set<AcademicCapability> readyCapabilities() {
        return java.util.Set.of(
                AcademicCapability.GET_ACADEMIC_STATUS,
                AcademicCapability.CHECK_COURSE_ELIGIBILITY,
                AcademicCapability.GENERATE_STUDY_PLAN,
                AcademicCapability.VALIDATE_STUDY_PLAN,
                AcademicCapability.SIMULATE_GRADES,
                AcademicCapability.RANK_RETAKE_COURSES,
                AcademicCapability.CALCULATE_TARGET_GRADES,
                AcademicCapability.RUN_GRADUATION_AUDIT
        );
    }
}
