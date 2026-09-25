package vn.haui.advisor.ai.tools;

import vn.haui.advisor.contracts.dto.*;

import java.math.BigDecimal;

/**
 * Adapter trung gian giữa AI Orchestration và AcademicFacade interface.
 * Đảm bảo mọi studentId đều được trích xuất an toàn từ TrustedStudentContext.
 * Tuyệt đối không tự tính toán lại GPA/CPA hay sao chép logic nghiệp vụ học vụ.
 */
public interface ToolAdapter {

    /**
     * Tra cứu trạng thái học vụ của sinh viên qua AcademicFacade.
     */
    AcademicStatusResponse getAcademicStatus(TrustedStudentContext context);

    /**
     * Yêu cầu AcademicFacade sinh kế hoạch học tập đề xuất.
     */
    GenerateStudyPlanResponse generateStudyPlan(TrustedStudentContext context,
                                                String targetGraduationSemester,
                                                BigDecimal targetCpa,
                                                Integer maxCreditsPerSemester,
                                                Boolean includeSummerSemesters);

    /**
     * Thẩm định kế hoạch học tập qua AcademicFacade.
     */
    ValidateStudyPlanResponse validateStudyPlan(TrustedStudentContext context, ValidateStudyPlanRequest request);
}
