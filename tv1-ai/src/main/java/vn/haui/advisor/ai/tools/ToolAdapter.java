package vn.haui.advisor.ai.tools;

import vn.haui.advisor.contracts.dto.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

/**
 * Adapter trung gian giữa AI Orchestration và AcademicFacade interface.
 * Đảm bảo mọi studentId và dataRevision đều được trích xuất an toàn từ TrustedStudentContext.
 * Tuyệt đối không tự tính toán lại GPA/CPA hay sao chép logic nghiệp vụ học vụ.
 */
public interface ToolAdapter {

    /**
     * Tra cứu trạng thái học vụ của sinh viên qua AcademicFacade.
     */
    AcademicStatusResponse getAcademicStatus(TrustedStudentContext context);

    /**
     * Kiểm tra điều kiện tiên quyết và tính hợp lệ để đăng ký học phần.
     */
    CourseEligibilityResponse checkCourseEligibility(TrustedStudentContext context, String courseCode, String semester);

    /**
     * Yêu cầu AcademicFacade sinh kế hoạch học tập đề xuất với danh sách môn học lại.
     */
    GenerateStudyPlanResponse generateStudyPlan(TrustedStudentContext context,
                                                String targetGraduationSemester,
                                                BigDecimal targetCpa,
                                                Integer maxCreditsPerSemester,
                                                Boolean includeSummerSemesters,
                                                List<String> retakeCourses);

    /**
     * Overload tương thích ngược cho sinh kế hoạch học tập không kèm danh sách môn học lại.
     */
    default GenerateStudyPlanResponse generateStudyPlan(TrustedStudentContext context,
                                                        String targetGraduationSemester,
                                                        BigDecimal targetCpa,
                                                        Integer maxCreditsPerSemester,
                                                        Boolean includeSummerSemesters) {
        return generateStudyPlan(context, targetGraduationSemester, targetCpa, maxCreditsPerSemester, includeSummerSemesters, null);
    }

    /**
     * Thẩm định kế hoạch học tập qua AcademicFacade.
     */
    ValidateStudyPlanResponse validateStudyPlan(TrustedStudentContext context, ValidateStudyPlanRequest request);

    /**
     * Giả lập điểm số các môn học dự kiến và tính toán GPA/CPA kỳ tới.
     */
    SimulateGradesResponse simulateGrades(TrustedStudentContext context, List<SimulatedCourseGrade> courses);

    /**
     * Xếp hạng và gợi ý các môn học nên học lại để cải thiện CPA tối ưu.
     */
    RankRetakeCoursesResponse rankRetakeCourses(TrustedStudentContext context, Integer maxSuggestions);

    /**
     * Tính toán mục tiêu điểm cần đạt trong các kỳ còn lại để đạt CPA tốt nghiệp mong muốn.
     */
    CalculateTargetGradesResponse calculateTargetGrades(TrustedStudentContext context, BigDecimal targetCpa, String targetSemester);

    /**
     * Thực hiện kiểm tra tiến độ tốt nghiệp của sinh viên theo chuẩn CTĐT.
     */
    GraduationAuditResponse runGraduationAudit(TrustedStudentContext context);

    /**
     * Đối soát và điều chỉnh kế hoạch học tập sau khi có điểm chính thức của một học kỳ.
     */
    ReconcileStudyPlanResponse reconcileStudyPlan(TrustedStudentContext context, String planId, String completedSemester, Integer planVersion);

    /**
     * Kiểm tra xem một capability học vụ cụ thể đã sẵn sàng (được AcademicFacade khai báo là công cụ thật) hay chưa.
     */
    boolean isCapabilityReady(AcademicCapability capability);

    /**
     * Trả về tập hợp các capability học vụ đã sẵn sàng.
     */
    Set<AcademicCapability> getReadyCapabilities();
}
