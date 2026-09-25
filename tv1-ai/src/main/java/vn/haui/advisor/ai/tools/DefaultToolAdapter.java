package vn.haui.advisor.ai.tools;

import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.AcademicFacade;

import java.math.BigDecimal;
import java.util.Objects;

/**
 * Triển khai chuẩn của ToolAdapter gọi AcademicFacade qua interface từ contracts.
 * Không phụ thuộc implementation của tv4-academic.
 */
public class DefaultToolAdapter implements ToolAdapter {

    private final AcademicFacade academicFacade;

    public DefaultToolAdapter(AcademicFacade academicFacade) {
        this.academicFacade = Objects.requireNonNull(academicFacade, "academicFacade must not be null");
    }

    @Override
    public AcademicStatusResponse getAcademicStatus(TrustedStudentContext context) {
        Objects.requireNonNull(context, "context must not be null");
        String studentId = Objects.requireNonNull(context.getStudentId(), "trusted studentId must not be null");
        AcademicStatusRequest request = new AcademicStatusRequest(studentId, context.getDataRevision());
        return academicFacade.getAcademicStatus(request);
    }

    @Override
    public GenerateStudyPlanResponse generateStudyPlan(TrustedStudentContext context,
                                                       String targetGraduationSemester,
                                                       BigDecimal targetCpa,
                                                       Integer maxCreditsPerSemester,
                                                       Boolean includeSummerSemesters) {
        Objects.requireNonNull(context, "context must not be null");
        String studentId = Objects.requireNonNull(context.getStudentId(), "trusted studentId must not be null");
        GenerateStudyPlanRequest request = new GenerateStudyPlanRequest(
                studentId,
                targetGraduationSemester,
                targetCpa,
                maxCreditsPerSemester,
                includeSummerSemesters,
                context.getDataRevision()
        );
        return academicFacade.generateStudyPlan(request);
    }

    @Override
    public ValidateStudyPlanResponse validateStudyPlan(TrustedStudentContext context, ValidateStudyPlanRequest request) {
        Objects.requireNonNull(context, "context must not be null");
        Objects.requireNonNull(request, "request must not be null");
        // Đảm bảo định danh sinh viên được gán từ trusted context
        request.setStudentId(context.getStudentId());
        return academicFacade.validateStudyPlan(request);
    }
}
