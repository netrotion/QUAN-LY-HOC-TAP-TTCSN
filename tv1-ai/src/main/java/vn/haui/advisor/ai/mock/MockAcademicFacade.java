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
        throw new UnsupportedOperationException("simulateGrades chưa được yêu cầu trong fixture mock của TV1.");
    }

    @Override
    public RankRetakeCoursesResponse rankRetakeCourses(RankRetakeCoursesRequest request) {
        throw new UnsupportedOperationException("rankRetakeCourses chưa được yêu cầu trong fixture mock của TV1.");
    }

    @Override
    public CalculateTargetGradesResponse calculateTargetGrades(CalculateTargetGradesRequest request) {
        throw new UnsupportedOperationException("calculateTargetGrades chưa được yêu cầu trong fixture mock của TV1.");
    }

    @Override
    public GraduationAuditResponse runGraduationAudit(GraduationAuditRequest request) {
        throw new UnsupportedOperationException("runGraduationAudit chưa được yêu cầu trong fixture mock của TV1.");
    }

    @Override
    public ReconcileStudyPlanResponse reconcileStudyPlan(ReconcileStudyPlanRequest request) {
        throw new UnsupportedOperationException("reconcileStudyPlan chưa được yêu cầu trong fixture mock của TV1.");
    }
}
