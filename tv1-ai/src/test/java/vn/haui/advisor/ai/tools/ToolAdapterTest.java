package vn.haui.advisor.ai.tools;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.AcademicFacade;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ToolAdapterTest {

    private AcademicFacade academicFacade;
    private ToolAdapter toolAdapter;
    private TrustedStudentContext trustedContext;

    @BeforeEach
    void setUp() {
        academicFacade = mock(AcademicFacade.class);
        toolAdapter = new DefaultToolAdapter(academicFacade);
        trustedContext = new TrustedStudentContext(
                "STU-2021600123",
                "2021600123",
                "Nguyễn Văn A",
                "IT_K16",
                "K16",
                "REV-2024-V1"
        );
    }

    // =========================================================================
    // 1. Tests for all 9 capabilities delegation and response preservation
    // =========================================================================

    @Nested
    @DisplayName("All 9 Capabilities Delegation Tests")
    class CapabilityDelegationTests {

        @Test
        @DisplayName("1. getAcademicStatus delegates with trusted studentId and dataRevision")
        void testGetAcademicStatus() {
            AcademicStatusResponse mockResponse = new AcademicStatusResponse(
                    "STU-2021600123",
                    new BigDecimal("3.25"),
                    new BigDecimal("3.10"),
                    70,
                    145,
                    AcademicRiskLevel.NORMAL,
                    List.of(),
                    "REV-2024-V1"
            );
            when(academicFacade.getAcademicStatus(any())).thenReturn(mockResponse);

            AcademicStatusResponse result = toolAdapter.getAcademicStatus(trustedContext);

            ArgumentCaptor<AcademicStatusRequest> captor = ArgumentCaptor.forClass(AcademicStatusRequest.class);
            verify(academicFacade).getAcademicStatus(captor.capture());

            AcademicStatusRequest captured = captor.getValue();
            assertThat(captured.getStudentId()).isEqualTo("STU-2021600123");
            assertThat(captured.getDataRevision()).isEqualTo("REV-2024-V1");
            assertThat(result).isSameAs(mockResponse);
        }

        @Test
        @DisplayName("2. checkCourseEligibility delegates with courseCode, semester, and trusted context")
        void testCheckCourseEligibility() {
            CourseEligibilityResponse mockResponse = new CourseEligibilityResponse(
                    "IT6015",
                    true,
                    List.of(),
                    List.of(),
                    "REV-2024-V1"
            );
            when(academicFacade.checkCourseEligibility(any())).thenReturn(mockResponse);

            CourseEligibilityResponse result = toolAdapter.checkCourseEligibility(trustedContext, "IT6015", "2024_2");

            ArgumentCaptor<CourseEligibilityRequest> captor = ArgumentCaptor.forClass(CourseEligibilityRequest.class);
            verify(academicFacade).checkCourseEligibility(captor.capture());

            CourseEligibilityRequest captured = captor.getValue();
            assertThat(captured.getStudentId()).isEqualTo("STU-2021600123");
            assertThat(captured.getCourseCode()).isEqualTo("IT6015");
            assertThat(captured.getTargetSemester()).isEqualTo("2024_2");
            assertThat(captured.getDataRevision()).isEqualTo("REV-2024-V1");
            assertThat(result).isSameAs(mockResponse);
        }

        @Test
        @DisplayName("3. generateStudyPlan delegates with retakeCourses and all parameters")
        void testGenerateStudyPlan() {
            GenerateStudyPlanResponse mockResponse = new GenerateStudyPlanResponse(
                    "PLAN-001",
                    "STU-2021600123",
                    StudyPlanStatus.DRAFT,
                    List.of(),
                    new BigDecimal("3.40"),
                    List.of(),
                    1,
                    "REV-2024-V1"
            );
            when(academicFacade.generateStudyPlan(any())).thenReturn(mockResponse);

            GenerateStudyPlanResponse result = toolAdapter.generateStudyPlan(
                    trustedContext,
                    "2024_2025_HK2",
                    new BigDecimal("3.50"),
                    20,
                    true,
                    List.of("IT6010", "IT6012")
            );

            ArgumentCaptor<GenerateStudyPlanRequest> captor = ArgumentCaptor.forClass(GenerateStudyPlanRequest.class);
            verify(academicFacade).generateStudyPlan(captor.capture());

            GenerateStudyPlanRequest captured = captor.getValue();
            assertThat(captured.getStudentId()).isEqualTo("STU-2021600123");
            assertThat(captured.getTargetGraduationSemester()).isEqualTo("2024_2025_HK2");
            assertThat(captured.getTargetCpa()).isEqualByComparingTo("3.50");
            assertThat(captured.getMaxCreditsPerSemester()).isEqualTo(20);
            assertThat(captured.getIncludeSummerSemesters()).isTrue();
            assertThat(captured.getSelectedRetakeCourseCodes()).containsExactly("IT6010", "IT6012");
            assertThat(captured.getDataRevision()).isEqualTo("REV-2024-V1");
            assertThat(result).isSameAs(mockResponse);
        }

        @Test
        @DisplayName("3b. generateStudyPlan 5-arg overload delegates with null retakeCourses")
        void testGenerateStudyPlanOverload() {
            GenerateStudyPlanResponse mockResponse = new GenerateStudyPlanResponse(
                    "PLAN-001",
                    "STU-2021600123",
                    StudyPlanStatus.DRAFT,
                    List.of(),
                    new BigDecimal("3.40"),
                    List.of(),
                    1,
                    "REV-2024-V1"
            );
            when(academicFacade.generateStudyPlan(any())).thenReturn(mockResponse);

            GenerateStudyPlanResponse result = toolAdapter.generateStudyPlan(
                    trustedContext,
                    "2024_2025_HK2",
                    new BigDecimal("3.20"),
                    18,
                    false
            );

            ArgumentCaptor<GenerateStudyPlanRequest> captor = ArgumentCaptor.forClass(GenerateStudyPlanRequest.class);
            verify(academicFacade).generateStudyPlan(captor.capture());

            GenerateStudyPlanRequest captured = captor.getValue();
            assertThat(captured.getSelectedRetakeCourseCodes()).isNull();
            assertThat(result).isSameAs(mockResponse);
        }

        @Test
        @DisplayName("4. validateStudyPlan delegates and overwrites untrusted studentId and dataRevision")
        void testValidateStudyPlan() {
            ValidateStudyPlanRequest untrusted = new ValidateStudyPlanRequest(
                    "PLAN-001",
                    "MALICIOUS_STUDENT",
                    List.of(),
                    1,
                    "MALICIOUS_REV"
            );
            ValidateStudyPlanResponse mockResponse = new ValidateStudyPlanResponse(
                    true,
                    StudyPlanStatus.VALIDATED,
                    List.of(),
                    List.of(),
                    1,
                    "REV-2024-V1"
            );
            when(academicFacade.validateStudyPlan(any())).thenReturn(mockResponse);

            ValidateStudyPlanResponse result = toolAdapter.validateStudyPlan(trustedContext, untrusted);

            ArgumentCaptor<ValidateStudyPlanRequest> captor = ArgumentCaptor.forClass(ValidateStudyPlanRequest.class);
            verify(academicFacade).validateStudyPlan(captor.capture());

            ValidateStudyPlanRequest captured = captor.getValue();
            assertThat(captured.getStudentId()).isEqualTo("STU-2021600123");
            assertThat(captured.getDataRevision()).isEqualTo("REV-2024-V1");
            assertThat(result).isSameAs(mockResponse);
        }

        @Test
        @DisplayName("5. simulateGrades delegates with simulated courses list and trusted context")
        void testSimulateGrades() {
            List<SimulatedCourseGrade> courses = List.of(
                    new SimulatedCourseGrade("IT6015", 3, "A", new BigDecimal("4.00")),
                    new SimulatedCourseGrade("IT6020", 3, "B+", new BigDecimal("3.50"))
            );
            SimulateGradesResponse mockResponse = new SimulateGradesResponse(
                    "STU-2021600123",
                    new BigDecimal("3.10"),
                    new BigDecimal("3.75"),
                    new BigDecimal("3.22"),
                    new BigDecimal("0.12"),
                    "REV-2024-V1"
            );
            when(academicFacade.simulateGrades(any())).thenReturn(mockResponse);

            SimulateGradesResponse result = toolAdapter.simulateGrades(trustedContext, courses);

            ArgumentCaptor<SimulateGradesRequest> captor = ArgumentCaptor.forClass(SimulateGradesRequest.class);
            verify(academicFacade).simulateGrades(captor.capture());

            SimulateGradesRequest captured = captor.getValue();
            assertThat(captured.getStudentId()).isEqualTo("STU-2021600123");
            assertThat(captured.getCourses()).hasSize(2);
            assertThat(captured.getDataRevision()).isEqualTo("REV-2024-V1");
            assertThat(result).isSameAs(mockResponse);
        }

        @Test
        @DisplayName("6. rankRetakeCourses delegates with maxSuggestions and trusted context")
        void testRankRetakeCourses() {
            RankRetakeCoursesResponse mockResponse = new RankRetakeCoursesResponse(
                    "STU-2021600123",
                    List.of(),
                    "REV-2024-V1"
            );
            when(academicFacade.rankRetakeCourses(any())).thenReturn(mockResponse);

            RankRetakeCoursesResponse result = toolAdapter.rankRetakeCourses(trustedContext, 5);

            ArgumentCaptor<RankRetakeCoursesRequest> captor = ArgumentCaptor.forClass(RankRetakeCoursesRequest.class);
            verify(academicFacade).rankRetakeCourses(captor.capture());

            RankRetakeCoursesRequest captured = captor.getValue();
            assertThat(captured.getStudentId()).isEqualTo("STU-2021600123");
            assertThat(captured.getMaxSuggestions()).isEqualTo(5);
            assertThat(captured.getDataRevision()).isEqualTo("REV-2024-V1");
            assertThat(result).isSameAs(mockResponse);
        }

        @Test
        @DisplayName("7. calculateTargetGrades delegates with targetCpa and semester")
        void testCalculateTargetGrades() {
            CalculateTargetGradesResponse mockResponse = new CalculateTargetGradesResponse(
                    "STU-2021600123",
                    new BigDecimal("3.10"),
                    new BigDecimal("3.50"),
                    45,
                    new BigDecimal("3.72"),
                    List.of(),
                    List.of(),
                    "REV-2024-V1"
            );
            when(academicFacade.calculateTargetGrades(any())).thenReturn(mockResponse);

            CalculateTargetGradesResponse result = toolAdapter.calculateTargetGrades(
                    trustedContext,
                    new BigDecimal("3.50"),
                    "2026_1"
            );

            ArgumentCaptor<CalculateTargetGradesRequest> captor = ArgumentCaptor.forClass(CalculateTargetGradesRequest.class);
            verify(academicFacade).calculateTargetGrades(captor.capture());

            CalculateTargetGradesRequest captured = captor.getValue();
            assertThat(captured.getStudentId()).isEqualTo("STU-2021600123");
            assertThat(captured.getTargetCpa()).isEqualByComparingTo("3.50");
            assertThat(captured.getTargetGraduationSemester()).isEqualTo("2026_1");
            assertThat(captured.getDataRevision()).isEqualTo("REV-2024-V1");
            assertThat(result).isSameAs(mockResponse);
        }

        @Test
        @DisplayName("8. runGraduationAudit delegates with trusted studentId and dataRevision")
        void testRunGraduationAudit() {
            GraduationAuditResponse mockResponse = new GraduationAuditResponse(
                    "STU-2021600123",
                    false,
                    75,
                    110,
                    145,
                    List.of(),
                    List.of(),
                    "REV-2024-V1"
            );
            when(academicFacade.runGraduationAudit(any())).thenReturn(mockResponse);

            GraduationAuditResponse result = toolAdapter.runGraduationAudit(trustedContext);

            ArgumentCaptor<GraduationAuditRequest> captor = ArgumentCaptor.forClass(GraduationAuditRequest.class);
            verify(academicFacade).runGraduationAudit(captor.capture());

            GraduationAuditRequest captured = captor.getValue();
            assertThat(captured.getStudentId()).isEqualTo("STU-2021600123");
            assertThat(captured.getDataRevision()).isEqualTo("REV-2024-V1");
            assertThat(result).isSameAs(mockResponse);
        }

        @Test
        @DisplayName("9. reconcileStudyPlan delegates with planId, completedSemester, and version")
        void testReconcileStudyPlan() {
            ReconcileStudyPlanResponse mockResponse = new ReconcileStudyPlanResponse(
                    "PLAN-001",
                    "STU-2021600123",
                    true,
                    List.of("IT6015"),
                    List.of(),
                    List.of(),
                    1,
                    "REV-2024-V1"
            );
            when(academicFacade.reconcileStudyPlan(any())).thenReturn(mockResponse);

            ReconcileStudyPlanResponse result = toolAdapter.reconcileStudyPlan(
                    trustedContext,
                    "PLAN-001",
                    "2024_1",
                    1
            );

            ArgumentCaptor<ReconcileStudyPlanRequest> captor = ArgumentCaptor.forClass(ReconcileStudyPlanRequest.class);
            verify(academicFacade).reconcileStudyPlan(captor.capture());

            ReconcileStudyPlanRequest captured = captor.getValue();
            assertThat(captured.getPlanId()).isEqualTo("PLAN-001");
            assertThat(captured.getStudentId()).isEqualTo("STU-2021600123");
            assertThat(captured.getCompletedSemester()).isEqualTo("2024_1");
            assertThat(captured.getPlanVersion()).isEqualTo(1);
            assertThat(captured.getDataRevision()).isEqualTo("REV-2024-V1");
            assertThat(result).isSameAs(mockResponse);
        }
    }

    // =========================================================================
    // 2. Parameter validation tests
    // =========================================================================

    @Nested
    @DisplayName("Parameter Validation Tests")
    class ParameterValidationTests {

        @Test
        @DisplayName("Rejects targetCpa greater than 4.00")
        void testRejectTargetCpaGreaterThanFour() {
            assertThatThrownBy(() -> toolAdapter.calculateTargetGrades(trustedContext, new BigDecimal("4.01"), "2025_1"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("targetCpa must be between 0.00 and 4.00");

            assertThatThrownBy(() -> toolAdapter.generateStudyPlan(trustedContext, "2025_1", new BigDecimal("4.50"), 20, false, null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("targetCpa must be between 0.00 and 4.00");
        }

        @Test
        @DisplayName("Rejects targetCpa less than 0.00")
        void testRejectNegativeTargetCpa() {
            assertThatThrownBy(() -> toolAdapter.calculateTargetGrades(trustedContext, new BigDecimal("-0.10"), "2025_1"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("targetCpa must be between 0.00 and 4.00");

            assertThatThrownBy(() -> toolAdapter.generateStudyPlan(trustedContext, "2025_1", new BigDecimal("-1.00"), 20, false, null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("targetCpa must be between 0.00 and 4.00");
        }

        @Test
        @DisplayName("Rejects calculateTargetGrades with null targetCpa")
        void testRejectNullTargetCpa() {
            assertThatThrownBy(() -> toolAdapter.calculateTargetGrades(trustedContext, null, "2025_1"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("targetCpa must not be null");
        }

        @Test
        @DisplayName("Rejects negative maxCredits and maxCredits out of [10, 30]")
        void testRejectCreditsOutOfRange() {
            // Negative credits
            assertThatThrownBy(() -> toolAdapter.generateStudyPlan(trustedContext, "2025_1", new BigDecimal("3.0"), -5, false, null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("maxCreditsPerSemester must be between 10 and 30");

            // Credits < 10
            assertThatThrownBy(() -> toolAdapter.generateStudyPlan(trustedContext, "2025_1", new BigDecimal("3.0"), 9, false, null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("maxCreditsPerSemester must be between 10 and 30");

            // Credits > 30
            assertThatThrownBy(() -> toolAdapter.generateStudyPlan(trustedContext, "2025_1", new BigDecimal("3.0"), 31, false, null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("maxCreditsPerSemester must be between 10 and 30");
        }

        @Test
        @DisplayName("Rejects invalid courseCode formats")
        void testRejectInvalidCourseCode() {
            // Lowercase
            assertThatThrownBy(() -> toolAdapter.checkCourseEligibility(trustedContext, "it6015", "2024_1"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("courseCode must match pattern");

            // Too short (< 4 chars)
            assertThatThrownBy(() -> toolAdapter.checkCourseEligibility(trustedContext, "IT", "2024_1"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("courseCode must match pattern");

            // Too long (> 10 chars)
            assertThatThrownBy(() -> toolAdapter.checkCourseEligibility(trustedContext, "IT1234567890", "2024_1"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("courseCode must match pattern");

            // Special characters
            assertThatThrownBy(() -> toolAdapter.checkCourseEligibility(trustedContext, "IT_6015", "2024_1"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("courseCode must match pattern");

            // Null courseCode
            assertThatThrownBy(() -> toolAdapter.checkCourseEligibility(trustedContext, null, "2024_1"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("courseCode must match pattern");
        }

        @Test
        @DisplayName("Rejects invalid retake course codes in generateStudyPlan")
        void testRejectInvalidRetakeCourseCode() {
            assertThatThrownBy(() -> toolAdapter.generateStudyPlan(trustedContext, "2025_1", new BigDecimal("3.0"), 20, false, List.of("VALID1", "bad_code")))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("courseCode must match pattern");
        }

        @Test
        @DisplayName("Rejects invalid semester formats")
        void testRejectInvalidSemester() {
            assertThatThrownBy(() -> toolAdapter.checkCourseEligibility(trustedContext, "IT6015", "2024-invalid"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("semester must match pattern");

            assertThatThrownBy(() -> toolAdapter.checkCourseEligibility(trustedContext, "IT6015", "2024_3"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("semester must match pattern");
        }

        @Test
        @DisplayName("Accepts valid semester formats: short, long, and descriptive")
        void testAcceptValidSemesterFormats() {
            assertThat(ToolParameterValidator.isValidSemester("2024_1")).isTrue();
            assertThat(ToolParameterValidator.isValidSemester("2024_2")).isTrue();
            assertThat(ToolParameterValidator.isValidSemester("2024_S")).isTrue();
            assertThat(ToolParameterValidator.isValidSemester("2024_2025_HK1")).isTrue();
            assertThat(ToolParameterValidator.isValidSemester("2024_2025_HK2")).isTrue();
            assertThat(ToolParameterValidator.isValidSemester("2024_2025_HKS")).isTrue();
            assertThat(ToolParameterValidator.isValidSemester("HK1")).isTrue();
            assertThat(ToolParameterValidator.isValidSemester("Học kỳ 1")).isTrue();
            assertThat(ToolParameterValidator.isValidSemester("Học kỳ 2")).isTrue();
            assertThat(ToolParameterValidator.isValidSemester("Học kỳ hè")).isTrue();
            assertThat(ToolParameterValidator.isValidSemester("kỳ tới")).isTrue();
            assertThat(ToolParameterValidator.isValidSemester("học kỳ tới")).isTrue();
            assertThat(ToolParameterValidator.isValidSemester("next_semester")).isTrue();
        }

        @Test
        @DisplayName("Rejects maxSuggestions out of [1, 20]")
        void testRejectInvalidMaxSuggestions() {
            assertThatThrownBy(() -> toolAdapter.rankRetakeCourses(trustedContext, 0))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("maxSuggestions must be between 1 and 20");

            assertThatThrownBy(() -> toolAdapter.rankRetakeCourses(trustedContext, 21))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("maxSuggestions must be between 1 and 20");
        }

        @Test
        @DisplayName("Rejects negative credits in simulateGrades")
        void testRejectNegativeCreditsInSimulateGrades() {
            List<SimulatedCourseGrade> invalidCourses = List.of(
                    new SimulatedCourseGrade("IT6015", -3, "A", new BigDecimal("4.00"))
            );
            assertThatThrownBy(() -> toolAdapter.simulateGrades(trustedContext, invalidCourses))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("credits must not be negative");
        }

        @Test
        @DisplayName("Rejects blank planId and non-positive version in reconcileStudyPlan")
        void testRejectInvalidReconcileParameters() {
            assertThatThrownBy(() -> toolAdapter.reconcileStudyPlan(trustedContext, "  ", "2024_1", 1))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("planId must not be blank");

            assertThatThrownBy(() -> toolAdapter.reconcileStudyPlan(trustedContext, "PLAN-001", "2024_1", 0))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("planVersion must be positive");
        }
    }

    // =========================================================================
    // 3. Readiness check tests (isCapabilityReady & getReadyCapabilities)
    // =========================================================================

    @Nested
    @DisplayName("Capability Readiness Tests")
    class CapabilityReadinessTests {

        @Test
        @DisplayName("isCapabilityReady returns true when capability is declared in readyCapabilities")
        void testIsCapabilityReadyTrue() {
            when(academicFacade.readyCapabilities()).thenReturn(Set.of(
                    AcademicCapability.GET_ACADEMIC_STATUS,
                    AcademicCapability.GENERATE_STUDY_PLAN
            ));

            assertThat(toolAdapter.isCapabilityReady(AcademicCapability.GET_ACADEMIC_STATUS)).isTrue();
            assertThat(toolAdapter.isCapabilityReady(AcademicCapability.GENERATE_STUDY_PLAN)).isTrue();
            assertThat(toolAdapter.isCapabilityReady(AcademicCapability.SIMULATE_GRADES)).isFalse();
        }

        @Test
        @DisplayName("isCapabilityReady returns false when capability is null or facade returns null")
        void testIsCapabilityReadyEdgeCases() {
            assertThat(toolAdapter.isCapabilityReady(null)).isFalse();

            when(academicFacade.readyCapabilities()).thenReturn(null);
            assertThat(toolAdapter.isCapabilityReady(AcademicCapability.GET_ACADEMIC_STATUS)).isFalse();
            assertThat(toolAdapter.getReadyCapabilities()).isEmpty();
        }

        @Test
        @DisplayName("getReadyCapabilities returns unmodifiable set of ready capabilities")
        void testGetReadyCapabilities() {
            when(academicFacade.readyCapabilities()).thenReturn(Set.of(
                    AcademicCapability.VALIDATE_STUDY_PLAN,
                    AcademicCapability.RUN_GRADUATION_AUDIT
            ));

            Set<AcademicCapability> ready = toolAdapter.getReadyCapabilities();
            assertThat(ready).containsExactlyInAnyOrder(
                    AcademicCapability.VALIDATE_STUDY_PLAN,
                    AcademicCapability.RUN_GRADUATION_AUDIT
            );
            assertThatThrownBy(() -> ready.add(AcademicCapability.SIMULATE_GRADES))
                    .isInstanceOf(UnsupportedOperationException.class);
        }

        @Test
        @DisplayName("Strict readiness mode throws ToolNotReadyException when capability is not ready")
        void testStrictReadinessThrows() {
            when(academicFacade.readyCapabilities()).thenReturn(Set.of());
            ToolAdapter strictAdapter = new DefaultToolAdapter(academicFacade, true);

            assertThatThrownBy(() -> strictAdapter.getAcademicStatus(trustedContext))
                    .isInstanceOf(ToolNotReadyException.class)
                    .satisfies(ex -> {
                        ToolNotReadyException tnre = (ToolNotReadyException) ex;
                        assertThat(tnre.getCapability()).isEqualTo(AcademicCapability.GET_ACADEMIC_STATUS);
                    });
        }

        @Test
        @DisplayName("Non-strict mode logs warning and proceeds with delegation even when not ready")
        void testNonStrictReadinessProceeds() {
            when(academicFacade.readyCapabilities()).thenReturn(Set.of());
            AcademicStatusResponse mockResponse = new AcademicStatusResponse(
                    "STU-2021600123", new BigDecimal("3.0"), new BigDecimal("3.0"), 50, 145,
                    AcademicRiskLevel.NORMAL, List.of(), "REV-1"
            );
            when(academicFacade.getAcademicStatus(any())).thenReturn(mockResponse);

            // Default adapter is non-strict
            AcademicStatusResponse response = toolAdapter.getAcademicStatus(trustedContext);
            assertThat(response).isSameAs(mockResponse);
        }
    }

    // =========================================================================
    // 4. Trusted studentId enforcement tests
    // =========================================================================

    @Nested
    @DisplayName("Trusted Student Context Enforcement Tests")
    class TrustedContextEnforcementTests {

        @Test
        @DisplayName("ToolAdapter rejects null context or null studentId")
        void testNullContextValidation() {
            assertThatThrownBy(() -> toolAdapter.getAcademicStatus(null))
                    .isInstanceOf(NullPointerException.class);

            TrustedStudentContext invalidContext = new TrustedStudentContext();
            assertThatThrownBy(() -> toolAdapter.getAcademicStatus(invalidContext))
                    .isInstanceOf(NullPointerException.class);
        }

        @Test
        @DisplayName("validateStudyPlan strictly overwrites client studentId and dataRevision with trusted values")
        void testValidateStudyPlanEnforcesTrustedValues() {
            ValidateStudyPlanRequest untrustedRequest = new ValidateStudyPlanRequest(
                    "PLAN-999",
                    "ATTACKER_STUDENT_ID",
                    List.of(),
                    1,
                    "TAMPERED_REVISION"
            );
            when(academicFacade.validateStudyPlan(any())).thenReturn(new ValidateStudyPlanResponse());

            toolAdapter.validateStudyPlan(trustedContext, untrustedRequest);

            ArgumentCaptor<ValidateStudyPlanRequest> captor = ArgumentCaptor.forClass(ValidateStudyPlanRequest.class);
            verify(academicFacade).validateStudyPlan(captor.capture());

            ValidateStudyPlanRequest captured = captor.getValue();
            assertThat(captured.getStudentId()).isEqualTo("STU-2021600123");
            assertThat(captured.getDataRevision()).isEqualTo("REV-2024-V1");
        }
    }
}
