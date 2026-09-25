package vn.haui.advisor.ai.tools;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.AcademicFacade;

import java.math.BigDecimal;
import java.util.List;

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

    @Test
    @DisplayName("getAcademicStatus delegates to AcademicFacade with studentId from trusted context")
    void testGetAcademicStatusDelegation() {
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

        AcademicStatusRequest capturedRequest = captor.getValue();
        assertThat(capturedRequest.getStudentId()).isEqualTo("STU-2021600123");
        assertThat(capturedRequest.getDataRevision()).isEqualTo("REV-2024-V1");
        assertThat(result).isSameAs(mockResponse);
    }

    @Test
    @DisplayName("generateStudyPlan delegates to AcademicFacade and preserves parameters and studentId")
    void testGenerateStudyPlanDelegation() {
        GenerateStudyPlanResponse mockPlanResponse = new GenerateStudyPlanResponse(
                "PLAN-001",
                "STU-2021600123",
                StudyPlanStatus.DRAFT,
                List.of(),
                new BigDecimal("3.20"),
                List.of(),
                1,
                "REV-2024-V1"
        );
        when(academicFacade.generateStudyPlan(any())).thenReturn(mockPlanResponse);

        GenerateStudyPlanResponse result = toolAdapter.generateStudyPlan(
                trustedContext,
                "2024_2025_HK2",
                new BigDecimal("3.50"),
                20,
                true
        );

        ArgumentCaptor<GenerateStudyPlanRequest> captor = ArgumentCaptor.forClass(GenerateStudyPlanRequest.class);
        verify(academicFacade).generateStudyPlan(captor.capture());

        GenerateStudyPlanRequest capturedRequest = captor.getValue();
        assertThat(capturedRequest.getStudentId()).isEqualTo("STU-2021600123");
        assertThat(capturedRequest.getTargetGraduationSemester()).isEqualTo("2024_2025_HK2");
        assertThat(capturedRequest.getTargetCpa()).isEqualByComparingTo("3.50");
        assertThat(capturedRequest.getMaxCreditsPerSemester()).isEqualTo(20);
        assertThat(capturedRequest.getIncludeSummerSemesters()).isTrue();
        assertThat(capturedRequest.getDataRevision()).isEqualTo("REV-2024-V1");
        assertThat(result).isSameAs(mockPlanResponse);
    }

    @Test
    @DisplayName("validateStudyPlan enforces studentId from trustedContext onto the request")
    void testValidateStudyPlanEnforcesTrustedStudentId() {
        ValidateStudyPlanRequest untrustedRequest = new ValidateStudyPlanRequest(
                "PLAN-001",
                "UNTRUSTED_STUDENT_ID",
                List.of(),
                1,
                "REV-2024-V1"
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

        toolAdapter.validateStudyPlan(trustedContext, untrustedRequest);

        ArgumentCaptor<ValidateStudyPlanRequest> captor = ArgumentCaptor.forClass(ValidateStudyPlanRequest.class);
        verify(academicFacade).validateStudyPlan(captor.capture());

        // studentId must be overwritten with trusted studentId
        assertThat(captor.getValue().getStudentId()).isEqualTo("STU-2021600123");
    }

    @Test
    @DisplayName("ToolAdapter rejects null context or null studentId")
    void testNullContextValidation() {
        assertThatThrownBy(() -> toolAdapter.getAcademicStatus(null))
                .isInstanceOf(NullPointerException.class);

        TrustedStudentContext invalidContext = new TrustedStudentContext();
        assertThatThrownBy(() -> toolAdapter.getAcademicStatus(invalidContext))
                .isInstanceOf(NullPointerException.class);
    }
}
