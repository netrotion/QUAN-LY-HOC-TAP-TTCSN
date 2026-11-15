package vn.haui.advisor.ai.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.tools.ToolAdapter;
import vn.haui.advisor.contracts.dto.CourseEligibilityResponse;
import vn.haui.advisor.contracts.dto.TranscriptResponse;
import vn.haui.advisor.contracts.dto.TrustedStudentContext;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class GeminiAcademicToolsSecurityTest {

    private ToolAdapter toolAdapter;
    private TrustedStudentContext context;
    private Map<String, Object> toolResults;
    private List<String> warnings;

    @BeforeEach
    void setUp() {
        context = new TrustedStudentContext("SV001", "2021600001", "Lê Việt Hùng", "KTPM", "K16", "rev-v1");
        toolResults = new HashMap<>();
        warnings = new ArrayList<>();
        toolAdapter = mock(ToolAdapter.class);

        when(toolAdapter.getTranscript(any())).thenReturn(new TranscriptResponse());
        when(toolAdapter.checkCourseEligibility(any(), any(), any())).thenReturn(new CourseEligibilityResponse());
    }

    @Test
    @DisplayName("Should reject tool execution when TrustedStudentContext is null or studentId is blank")
    void testRejectNullOrBlankContext() {
        assertThatThrownBy(() -> GeminiAcademicTools.execute(toolAdapter, null, "get_academic_status", Map.of(), toolResults, warnings))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("Mã sinh viên xác thực không hợp lệ");

        TrustedStudentContext blankContext = new TrustedStudentContext("", "", "", "", "", "");
        assertThatThrownBy(() -> GeminiAcademicTools.execute(toolAdapter, blankContext, "get_academic_status", Map.of(), toolResults, warnings))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("Mã sinh viên xác thực không hợp lệ");
    }

    @Test
    @DisplayName("Should detect parameter tampering when tool args specify a different studentId")
    void testDetectAndSanitizeParameterTampering() {
        Map<String, Object> args = new HashMap<>();
        args.put("student_id", "SV002_ATTACKER");
        args.put("filter", "ALL");

        GeminiAcademicTools.execute(toolAdapter, context, "get_transcript", args, toolResults, warnings);

        // Tool should still execute for authenticated context SV001, but record security warning
        assertThat(warnings).anyMatch(w -> w.contains("Parameter Tampering") || w.contains("SV002_ATTACKER"));
        assertThat(toolResults).containsKey("get_transcript");
    }

    @Test
    @DisplayName("Should sanitize course code with invalid special characters or SQL injection attempts")
    void testSanitizeCourseCodeInjection() {
        Map<String, Object> args = new HashMap<>();
        args.put("course_code", "IT6001'; DROP TABLE students; --");
        args.put("semester", "1");

        GeminiAcademicTools.execute(toolAdapter, context, "check_course_eligibility", args, toolResults, warnings);

        assertThat(warnings).anyMatch(w -> w.contains("Mã học phần không hợp lệ"));
        assertThat(toolResults).doesNotContainKey("check_course_eligibility");
    }
}
