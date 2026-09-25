package vn.haui.advisor.contracts;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.contracts.dto.*;

import java.io.File;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.assertj.core.api.Assertions.assertThat;

public class ContractsSerializationTest {

    private ObjectMapper objectMapper;
    private Path examplesDir;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        // Tìm đường dẫn tới folder examples
        Path current = Paths.get("").toAbsolutePath();
        if (current.endsWith("contracts")) {
            examplesDir = current.resolve("examples");
        } else {
            examplesDir = current.resolve("tv5-platform/contracts/examples");
        }
    }

    @Test
    void testAcademicStatusSerialization() throws Exception {
        File reqFile = examplesDir.resolve("academic-status-request.sample.json").toFile();
        AcademicStatusRequest req = objectMapper.readValue(reqFile, AcademicStatusRequest.class);
        assertThat(req.getStudentId()).isEqualTo("std-2026-001");
        assertThat(req.getDataRevision()).isEqualTo("rev-1001");

        File resFile = examplesDir.resolve("academic-status-response.sample.json").toFile();
        AcademicStatusResponse res = objectMapper.readValue(resFile, AcademicStatusResponse.class);
        assertThat(res.getStudentId()).isEqualTo("std-2026-001");
        assertThat(res.getGpa()).isNull(); // Thiếu dữ liệu thể hiện null
        assertThat(res.getCpa()).isEqualByComparingTo(new BigDecimal("2.45"));
        assertThat(res.getRiskLevel()).isEqualTo(AcademicRiskLevel.WARNING_LEVEL_1);
    }

    @Test
    void testCourseEligibilitySerialization() throws Exception {
        File reqFile = examplesDir.resolve("course-eligibility-request.sample.json").toFile();
        CourseEligibilityRequest req = objectMapper.readValue(reqFile, CourseEligibilityRequest.class);
        assertThat(req.getCourseCode()).isEqualTo("IT6001");

        File resFile = examplesDir.resolve("course-eligibility-response.sample.json").toFile();
        CourseEligibilityResponse res = objectMapper.readValue(resFile, CourseEligibilityResponse.class);
        assertThat(res.isEligible()).isFalse();
        assertThat(res.getMissingPrerequisites()).isNotEmpty();
    }

    @Test
    void testGenerateStudyPlanSerialization() throws Exception {
        File reqFile = examplesDir.resolve("generate-study-plan-request.sample.json").toFile();
        GenerateStudyPlanRequest req = objectMapper.readValue(reqFile, GenerateStudyPlanRequest.class);
        assertThat(req.getTargetCpa()).isEqualByComparingTo(new BigDecimal("3.20"));

        File resFile = examplesDir.resolve("generate-study-plan-response.sample.json").toFile();
        GenerateStudyPlanResponse res = objectMapper.readValue(resFile, GenerateStudyPlanResponse.class);
        assertThat(res.getStatus()).isEqualTo(StudyPlanStatus.DRAFT);
        assertThat(res.getSemesters()).hasSize(1);
    }

    @Test
    void testValidateStudyPlanSerialization() throws Exception {
        File reqFile = examplesDir.resolve("validate-study-plan-request.sample.json").toFile();
        ValidateStudyPlanRequest req = objectMapper.readValue(reqFile, ValidateStudyPlanRequest.class);
        assertThat(req.getPlanId()).isEqualTo("plan-2026-9001");

        File resFile = examplesDir.resolve("validate-study-plan-response.sample.json").toFile();
        ValidateStudyPlanResponse res = objectMapper.readValue(resFile, ValidateStudyPlanResponse.class);
        assertThat(res.isValid()).isFalse();
        assertThat(res.getStatus()).isEqualTo(StudyPlanStatus.DRAFT);
        assertThat(res.getViolations()).isNotEmpty();
    }

    @Test
    void testSimulateGradesSerialization() throws Exception {
        File reqFile = examplesDir.resolve("simulate-grades-request.sample.json").toFile();
        SimulateGradesRequest req = objectMapper.readValue(reqFile, SimulateGradesRequest.class);
        assertThat(req.getCourses()).hasSize(2);

        File resFile = examplesDir.resolve("simulate-grades-response.sample.json").toFile();
        SimulateGradesResponse res = objectMapper.readValue(resFile, SimulateGradesResponse.class);
        assertThat(res.getCurrentCpa()).isEqualByComparingTo(new BigDecimal("2.45"));
        assertThat(res.getProjectedNewCpa()).isEqualByComparingTo(new BigDecimal("2.56"));
    }

    @Test
    void testRankRetakeSerialization() throws Exception {
        File resFile = examplesDir.resolve("rank-retake-response.sample.json").toFile();
        RankRetakeCoursesResponse res = objectMapper.readValue(resFile, RankRetakeCoursesResponse.class);
        assertThat(res.getRecommendations()).hasSize(2);
        assertThat(res.getRecommendations().get(0).getPotentialCpaGain()).isEqualByComparingTo(new BigDecimal("0.16"));
    }

    @Test
    void testCalculateTargetGradesSerialization() throws Exception {
        File resFile = examplesDir.resolve("calculate-target-grades-response.sample.json").toFile();
        CalculateTargetGradesResponse res = objectMapper.readValue(resFile, CalculateTargetGradesResponse.class);
        assertThat(res.getRequiredAverageGpa()).isEqualByComparingTo(new BigDecimal("3.42"));
    }

    @Test
    void testGraduationAuditSerialization() throws Exception {
        File resFile = examplesDir.resolve("graduation-audit-response.sample.json").toFile();
        GraduationAuditResponse res = objectMapper.readValue(resFile, GraduationAuditResponse.class);
        assertThat(res.isEligibleForGraduation()).isFalse();
        assertThat(res.getCompletedPercentage()).isEqualTo(82);
        assertThat(res.getPendingActions()).hasSize(1);
    }

    @Test
    void testReconcileStudyPlanSerialization() throws Exception {
        File resFile = examplesDir.resolve("reconcile-study-plan-response.sample.json").toFile();
        ReconcileStudyPlanResponse res = objectMapper.readValue(resFile, ReconcileStudyPlanResponse.class);
        assertThat(res.isOnTrack()).isTrue();
    }

    @Test
    void testChatSerialization() throws Exception {
        File reqFile = examplesDir.resolve("chat-request.sample.json").toFile();
        ChatRequest req = objectMapper.readValue(reqFile, ChatRequest.class);
        assertThat(req.getMessage()).contains("Toán rời rạc");

        File resFile = examplesDir.resolve("chat-response.sample.json").toFile();
        ChatResponse res = objectMapper.readValue(resFile, ChatResponse.class);
        assertThat(res.getAnswer()).isNotEmpty();
        assertThat(res.getSources()).hasSize(1);
        assertThat(res.getActions()).hasSize(1);
    }

    @Test
    void testApiErrorSerialization() throws Exception {
        File resFile = examplesDir.resolve("api-error.sample.json").toFile();
        ApiErrorResponse err = objectMapper.readValue(resFile, ApiErrorResponse.class);
        assertThat(err.getCode()).isEqualTo("NOT_IMPLEMENTED");
        assertThat(err.getRequestId()).isEqualTo("req-9999-sample");
    }
}
