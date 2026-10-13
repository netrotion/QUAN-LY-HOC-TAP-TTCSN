package vn.haui.advisor.ai.tools;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.AcademicFacade;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * Triển khai chuẩn của ToolAdapter gọi AcademicFacade qua interface từ contracts.
 * Không phụ thuộc implementation của tv4-academic.
 * Luôn áp dụng studentId và dataRevision từ TrustedStudentContext đáng tin cậy.
 */
public class DefaultToolAdapter implements ToolAdapter {

    private static final Logger log = LoggerFactory.getLogger(DefaultToolAdapter.class);

    private final AcademicFacade academicFacade;
    private final boolean strictReadiness;

    public DefaultToolAdapter(AcademicFacade academicFacade) {
        this(academicFacade, false);
    }

    public DefaultToolAdapter(AcademicFacade academicFacade, boolean strictReadiness) {
        this.academicFacade = Objects.requireNonNull(academicFacade, "academicFacade must not be null");
        this.strictReadiness = strictReadiness;
    }

    public boolean isStrictReadiness() {
        return strictReadiness;
    }

    @Override
    public boolean isCapabilityReady(AcademicCapability capability) {
        if (capability == null) {
            return false;
        }
        Set<AcademicCapability> ready = academicFacade.readyCapabilities();
        return ready != null && ready.contains(capability);
    }

    @Override
    public Set<AcademicCapability> getReadyCapabilities() {
        Set<AcademicCapability> ready = academicFacade.readyCapabilities();
        return ready != null ? Collections.unmodifiableSet(ready) : Collections.emptySet();
    }

    private void checkReadiness(AcademicCapability capability) {
        if (!isCapabilityReady(capability)) {
            log.warn("Academic capability {} is not ready in AcademicFacade (ready: {})",
                    capability, academicFacade.readyCapabilities());
            if (strictReadiness) {
                throw new ToolNotReadyException(capability,
                        "Academic capability " + capability + " is not ready in AcademicFacade");
            }
        }
    }

    private String extractTrustedStudentId(TrustedStudentContext context) {
        Objects.requireNonNull(context, "context must not be null");
        return Objects.requireNonNull(context.getStudentId(), "trusted studentId must not be null");
    }

    @Override
    public AcademicStatusResponse getAcademicStatus(TrustedStudentContext context) {
        String studentId = extractTrustedStudentId(context);
        checkReadiness(AcademicCapability.GET_ACADEMIC_STATUS);

        AcademicStatusRequest request = new AcademicStatusRequest(studentId, context.getDataRevision());
        return academicFacade.getAcademicStatus(request);
    }

    @Override
    public CourseEligibilityResponse checkCourseEligibility(TrustedStudentContext context, String courseCode, String semester) {
        String studentId = extractTrustedStudentId(context);
        ToolParameterValidator.validateCourseCode(courseCode);
        ToolParameterValidator.validateOptionalSemester(semester);
        checkReadiness(AcademicCapability.CHECK_COURSE_ELIGIBILITY);

        CourseEligibilityRequest request = new CourseEligibilityRequest(
                studentId,
                courseCode,
                semester,
                context.getDataRevision()
        );
        return academicFacade.checkCourseEligibility(request);
    }

    @Override
    public GenerateStudyPlanResponse generateStudyPlan(TrustedStudentContext context,
                                                       String targetGraduationSemester,
                                                       BigDecimal targetCpa,
                                                       Integer maxCreditsPerSemester,
                                                       Boolean includeSummerSemesters,
                                                       List<String> retakeCourses) {
        String studentId = extractTrustedStudentId(context);
        ToolParameterValidator.validateOptionalSemester(targetGraduationSemester);
        ToolParameterValidator.validateOptionalTargetCpa(targetCpa);
        ToolParameterValidator.validateOptionalMaxCreditsPerSemester(maxCreditsPerSemester);
        if (retakeCourses != null) {
            for (String code : retakeCourses) {
                ToolParameterValidator.validateCourseCode(code);
            }
        }
        checkReadiness(AcademicCapability.GENERATE_STUDY_PLAN);

        GenerateStudyPlanRequest request = new GenerateStudyPlanRequest(
                studentId,
                targetGraduationSemester,
                targetCpa,
                maxCreditsPerSemester,
                includeSummerSemesters,
                context.getDataRevision()
        );
        request.setSelectedRetakeCourseCodes(retakeCourses);
        return academicFacade.generateStudyPlan(request);
    }

    @Override
    public ValidateStudyPlanResponse validateStudyPlan(TrustedStudentContext context, ValidateStudyPlanRequest request) {
        String studentId = extractTrustedStudentId(context);
        Objects.requireNonNull(request, "request must not be null");
        checkReadiness(AcademicCapability.VALIDATE_STUDY_PLAN);

        // Đảm bảo định danh sinh viên và dataRevision được ghi đè từ trusted context
        request.setStudentId(studentId);
        request.setDataRevision(context.getDataRevision());
        return academicFacade.validateStudyPlan(request);
    }

    @Override
    public SimulateGradesResponse simulateGrades(TrustedStudentContext context, List<SimulatedCourseGrade> courses) {
        String studentId = extractTrustedStudentId(context);
        if (courses != null) {
            for (SimulatedCourseGrade grade : courses) {
                if (grade != null) {
                    if (grade.getCourseCode() != null) {
                        ToolParameterValidator.validateCourseCode(grade.getCourseCode());
                    }
                    if (grade.getCredits() != null && grade.getCredits() < 0) {
                        throw new IllegalArgumentException("credits must not be negative: " + grade.getCredits());
                    }
                    if (grade.getExpectedGradePoints() != null) {
                        ToolParameterValidator.validateTargetCpa(grade.getExpectedGradePoints());
                    }
                }
            }
        }
        checkReadiness(AcademicCapability.SIMULATE_GRADES);

        SimulateGradesRequest request = new SimulateGradesRequest(
                studentId,
                courses,
                context.getDataRevision()
        );
        return academicFacade.simulateGrades(request);
    }

    @Override
    public RankRetakeCoursesResponse rankRetakeCourses(TrustedStudentContext context, Integer maxSuggestions) {
        String studentId = extractTrustedStudentId(context);
        ToolParameterValidator.validateOptionalMaxSuggestions(maxSuggestions);
        checkReadiness(AcademicCapability.RANK_RETAKE_COURSES);

        RankRetakeCoursesRequest request = new RankRetakeCoursesRequest(
                studentId,
                maxSuggestions,
                context.getDataRevision()
        );
        return academicFacade.rankRetakeCourses(request);
    }

    @Override
    public CalculateTargetGradesResponse calculateTargetGrades(TrustedStudentContext context, BigDecimal targetCpa, String targetSemester) {
        String studentId = extractTrustedStudentId(context);
        ToolParameterValidator.validateTargetCpa(targetCpa);
        ToolParameterValidator.validateOptionalSemester(targetSemester);
        checkReadiness(AcademicCapability.CALCULATE_TARGET_GRADES);

        CalculateTargetGradesRequest request = new CalculateTargetGradesRequest(
                studentId,
                targetCpa,
                targetSemester,
                context.getDataRevision()
        );
        return academicFacade.calculateTargetGrades(request);
    }

    @Override
    public GraduationAuditResponse runGraduationAudit(TrustedStudentContext context) {
        String studentId = extractTrustedStudentId(context);
        checkReadiness(AcademicCapability.RUN_GRADUATION_AUDIT);

        GraduationAuditRequest request = new GraduationAuditRequest(
                studentId,
                context.getDataRevision()
        );
        return academicFacade.runGraduationAudit(request);
    }

    @Override
    public ReconcileStudyPlanResponse reconcileStudyPlan(TrustedStudentContext context, String planId, String completedSemester, Integer planVersion) {
        String studentId = extractTrustedStudentId(context);
        if (planId == null || planId.isBlank()) {
            throw new IllegalArgumentException("planId must not be blank");
        }
        ToolParameterValidator.validateOptionalSemester(completedSemester);
        if (planVersion != null && planVersion < 1) {
            throw new IllegalArgumentException("planVersion must be positive, got: " + planVersion);
        }
        checkReadiness(AcademicCapability.RECONCILE_STUDY_PLAN);

        ReconcileStudyPlanRequest request = new ReconcileStudyPlanRequest(
                planId,
                studentId,
                completedSemester,
                planVersion,
                context.getDataRevision()
        );
        return academicFacade.reconcileStudyPlan(request);
    }
}
