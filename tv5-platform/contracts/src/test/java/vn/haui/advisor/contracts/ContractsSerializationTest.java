package vn.haui.advisor.contracts;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.contracts.dto.*;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Kiểm tra ngữ nghĩa của từng fixture contracts-v1 sau khi đọc vào DTO, và tính nhất quán
 * giữa các fixture (cùng sinh viên, cùng revision, tổng tín chỉ khớp chi tiết, lịch sử khớp chi tiết).
 */
class ContractsSerializationTest {

    private final ObjectMapper mapper = ContractTestSupport.mapper();

    private <T> T read(String file, Class<T> type) throws IOException {
        return mapper.readValue(ContractTestSupport.examplesDir().resolve(file).toFile(), type);
    }

    @Test
    @DisplayName("Academic status: dữ liệu thật và trường hợp thiếu dữ liệu (null = UNKNOWN)")
    void academicStatus() throws Exception {
        AcademicStatusResponse res = read("academic-status-response.sample.json", AcademicStatusResponse.class);
        assertThat(res.getStudentId()).isEqualTo("2024604757");
        assertThat(res.getCpa()).isEqualByComparingTo("3.18");
        assertThat(res.getAccumulatedCredits()).isEqualTo(61);
        assertThat(res.getRiskLevel()).isEqualTo(AcademicRiskLevel.NORMAL);
        assertThat(res.getWarnings()).hasSize(1);

        AcademicStatusResponse missing = read("academic-status-missing-data-response.sample.json", AcademicStatusResponse.class);
        assertThat(missing.getGpa()).isNull();
        assertThat(missing.getCpa()).isNull();
        assertThat(missing.getAccumulatedCredits()).isNull();
    }

    @Test
    @DisplayName("Eligibility: môn học trước chưa học → eligible=false kèm mã môn thiếu")
    void courseEligibility() throws Exception {
        CourseEligibilityRequest req = read("course-eligibility-request.sample.json", CourseEligibilityRequest.class);
        assertThat(req.getCourseCode()).isEqualTo("IT6083");
        assertThat(req.getTargetSemester()).isEqualTo("2026_1");

        CourseEligibilityResponse res = read("course-eligibility-response.sample.json", CourseEligibilityResponse.class);
        assertThat(res.isEligible()).isFalse();
        assertThat(res.getMissingPrerequisites()).first().asString().startsWith("IT6203");
    }

    @Test
    @DisplayName("Generate: phương án xem trước chỉ có proposalId, luôn DRAFT")
    void generateStudyPlan() throws Exception {
        GenerateStudyPlanRequest req = read("generate-study-plan-request.sample.json", GenerateStudyPlanRequest.class);
        assertThat(req.getSelectedRetakeCourseCodes()).containsExactly("LP6010");

        GenerateStudyPlanResponse res = read("generate-study-plan-response.sample.json", GenerateStudyPlanResponse.class);
        assertThat(res.getProposalId()).startsWith("proposal-");
        assertThat(res.getStatus()).isEqualTo(StudyPlanStatus.DRAFT);
        assertThat(res.getSemesters()).hasSize(2);
        assertThat(res.getTotalCredits()).isEqualTo(28);
    }

    @Test
    @DisplayName("Validate: vi phạm tín chỉ tối thiểu giữ DRAFT")
    void validateStudyPlan() throws Exception {
        ValidateStudyPlanRequest req = read("validate-study-plan-request.sample.json", ValidateStudyPlanRequest.class);
        assertThat(req.getPlanId()).isNull();
        assertThat(req.getSemesters().get(0).getTotalCredits()).isEqualTo(5);

        ValidateStudyPlanResponse res = read("validate-study-plan-response.sample.json", ValidateStudyPlanResponse.class);
        assertThat(res.isValid()).isFalse();
        assertThat(res.getStatus()).isEqualTo(StudyPlanStatus.DRAFT);
        assertThat(res.getViolations()).isNotEmpty();
    }

    @Test
    @DisplayName("Vòng đời kế hoạch: lưu nháp DRAFT, kích hoạt lưu trữ bản ACTIVE cũ, restore tạo DRAFT mới")
    void planLifecycle() throws Exception {
        StudyPlanListResponse list = read("study-plan-list-response.sample.json", StudyPlanListResponse.class);
        assertThat(list.getPlans()).filteredOn(p -> p.getStatus() == StudyPlanStatus.ACTIVE).hasSize(1);

        SaveStudyPlanResponse saved = read("study-plan-save-response.sample.json", SaveStudyPlanResponse.class);
        assertThat(saved.getStatus()).isEqualTo(StudyPlanStatus.DRAFT);
        assertThat(saved.getPlanVersion()).isEqualTo(2);

        ActivateStudyPlanRequest activateReq = read("study-plan-activate-request.sample.json", ActivateStudyPlanRequest.class);
        assertThat(activateReq.getPlanVersion()).isEqualTo(saved.getPlanVersion());

        ActivateStudyPlanResponse activated = read("study-plan-activate-response.sample.json", ActivateStudyPlanResponse.class);
        assertThat(activated.getPlanId()).isEqualTo(saved.getPlanId());
        assertThat(activated.getStatus()).isEqualTo(StudyPlanStatus.ACTIVE);
        assertThat(activated.getArchivedPlanIds()).containsExactly("plan-2024604757-0002");

        StudyPlanDetailResponse restored = read("study-plan-restore-response.sample.json", StudyPlanDetailResponse.class);
        assertThat(restored.getStatus()).isEqualTo(StudyPlanStatus.DRAFT);
        assertThat(restored.getPlanVersion()).isEqualTo(1);
        assertThat(restored.getSourcePlanId()).isEqualTo("plan-2024604757-0001");
    }

    @Test
    @DisplayName("Lịch sử kế hoạch khớp chi tiết của cùng planId")
    void summaryMatchesDetail() throws Exception {
        StudyPlanListResponse list = read("study-plan-list-response.sample.json", StudyPlanListResponse.class);
        StudyPlanDetailResponse active = read("study-plan-read-response.sample.json", StudyPlanDetailResponse.class);
        StudyPlanDetailResponse restored = read("study-plan-restore-response.sample.json", StudyPlanDetailResponse.class);

        StudyPlanSummaryItem activeSummary = list.getPlans().stream()
                .filter(p -> p.getPlanId().equals(active.getPlanId())).findFirst().orElseThrow();
        assertThat(activeSummary.getStatus()).isEqualTo(active.getStatus());
        assertThat(activeSummary.getPlanVersion()).isEqualTo(active.getPlanVersion());
        assertThat(activeSummary.getTotalCredits()).isEqualTo(active.getTotalCredits());
        assertThat(activeSummary.getProjectedCpa()).isEqualByComparingTo(active.getProjectedCpa());
        assertThat(activeSummary.getUpdatedAt()).isEqualTo(active.getUpdatedAt());

        StudyPlanSummaryItem origin = list.getPlans().stream()
                .filter(p -> p.getPlanId().equals(restored.getSourcePlanId())).findFirst().orElseThrow();
        assertThat(origin.getStatus()).isEqualTo(StudyPlanStatus.ARCHIVED);
        assertThat(origin.getTotalCredits()).isEqualTo(restored.getTotalCredits());
    }

    @Test
    @DisplayName("Simulation, retake, target grades dùng cùng tên số liệu dự kiến")
    void simulationFamily() throws Exception {
        SimulateGradesResponse sim = read("simulate-grades-response.sample.json", SimulateGradesResponse.class);
        assertThat(sim.getProjectedCpa().subtract(sim.getCurrentCpa())).isEqualByComparingTo(sim.getCpaDelta());

        RankRetakeCoursesResponse rank = read("rank-retake-response.sample.json", RankRetakeCoursesResponse.class);
        assertThat(rank.getRecommendations()).extracting(RetakeCourseRecommendation::getRank).containsExactly(1, 2);
        assertThat(rank.getRecommendations().get(0).getCpaDelta()).isEqualByComparingTo("0.08");

        CalculateTargetGradesResponse target = read("calculate-target-grades-response.sample.json", CalculateTargetGradesResponse.class);
        assertThat(target.getRemainingCredits()).isEqualTo(150 - 61);
        assertThat(target.getWarnings()).isNotEmpty();
    }

    @Test
    @DisplayName("Audit và chat")
    void auditAndChat() throws Exception {
        GraduationAuditResponse audit = read("graduation-audit-response.sample.json", GraduationAuditResponse.class);
        assertThat(audit.isEligibleForGraduation()).isFalse();
        assertThat(audit.getAccumulatedCredits()).isEqualTo(61);
        assertThat(audit.getPendingActions()).extracting(AuditCertificateAction::getCertificateType).containsExactly("MOS");

        ChatResponse chat = read("chat-response.sample.json", ChatResponse.class);
        assertThat(chat.getSources()).extracting(ChatSourceItem::getSourceId).containsExactly("REG-HAUI-01");
        assertThat(chat.getPlanProposal().getSemesters()).hasSize(2);
        GenerateStudyPlanResponse generated = read("generate-study-plan-response.sample.json", GenerateStudyPlanResponse.class);
        assertThat(chat.getPlanProposal().getProposalId()).isEqualTo(generated.getProposalId());
    }

    @Test
    @DisplayName("Lỗi: mỗi mã lỗi nghiệp vụ có ví dụ đọc được")
    void errors() throws Exception {
        Map<String, ApiErrorCode> expected = Map.of(
                "error-data-revision-stale.sample.json", ApiErrorCode.DATA_REVISION_STALE,
                "error-plan-version-conflict.sample.json", ApiErrorCode.PLAN_VERSION_CONFLICT,
                "error-plan-not-validated.sample.json", ApiErrorCode.PLAN_NOT_VALIDATED,
                "error-plan-validation-failed.sample.json", ApiErrorCode.PLAN_VALIDATION_FAILED,
                "error-ai-unavailable.sample.json", ApiErrorCode.AI_UNAVAILABLE);
        for (Map.Entry<String, ApiErrorCode> entry : expected.entrySet()) {
            ApiErrorResponse error = read(entry.getKey(), ApiErrorResponse.class);
            assertThat(error.getCode()).as(entry.getKey()).isEqualTo(entry.getValue());
            assertThat(error.getTimestamp()).as(entry.getKey()).isNotNull();
        }
    }

    @Test
    @DisplayName("Tổng tín chỉ: học kỳ = tổng môn, kế hoạch = tổng học kỳ (một nguồn cho một số liệu)")
    void creditTotalsAreDerivedConsistently() throws Exception {
        List<String> problems = new ArrayList<>();
        for (ContractTestSupport.SampleRef sample : ContractTestSupport.manifestSamples()) {
            checkTotals(ContractTestSupport.readExample(sample.file()), sample.file(), problems);
        }
        assertThat(problems).isEmpty();
    }

    @Test
    @DisplayName("Mọi fixture dùng cùng sinh viên demo và dataRevision hợp lệ")
    void fixturesShareOneStudentWorld() throws Exception {
        JsonNode manifest = ContractTestSupport.manifest();
        Map<String, String> revisionByStudent = new HashMap<>();
        revisionByStudent.put(manifest.get("demoStudent").get("studentId").asText(),
                manifest.get("demoStudent").get("dataRevision").asText());
        for (JsonNode other : manifest.get("otherStudents")) {
            revisionByStudent.put(other.get("studentId").asText(), other.get("dataRevision").asText(null));
        }

        List<String> problems = new ArrayList<>();
        for (ContractTestSupport.SampleRef sample : ContractTestSupport.manifestSamples()) {
            JsonNode json = ContractTestSupport.readExample(sample.file());
            if (json.hasNonNull("studentId") && !revisionByStudent.containsKey(json.get("studentId").asText())) {
                problems.add(sample.file() + ": studentId lạ " + json.get("studentId").asText());
            }
            if (json.hasNonNull("dataRevision") && !json.get("dataRevision").asText().startsWith("REV-")) {
                problems.add(sample.file() + ": dataRevision không theo dạng REV-<studentId>-<nnn>");
            }
        }
        assertThat(problems).isEmpty();
    }

    private static void checkTotals(JsonNode node, String file, List<String> problems) {
        if (node.isObject()) {
            if (node.has("courses") && node.has("totalCredits") && node.get("courses").isArray()) {
                int sum = 0;
                for (JsonNode course : node.get("courses")) {
                    sum += course.path("credits").asInt();
                }
                if (sum != node.get("totalCredits").asInt()) {
                    problems.add(file + ": học kỳ " + node.path("semesterCode").asText()
                            + " totalCredits=" + node.get("totalCredits").asInt() + " nhưng tổng môn=" + sum);
                }
            }
            if (node.has("semesters") && node.hasNonNull("totalCredits") && node.get("semesters").isArray()) {
                int sum = 0;
                for (JsonNode semester : node.get("semesters")) {
                    sum += semester.path("totalCredits").asInt();
                }
                if (sum != node.get("totalCredits").asInt()) {
                    problems.add(file + ": totalCredits kế hoạch=" + node.get("totalCredits").asInt()
                            + " nhưng tổng học kỳ=" + sum);
                }
            }
            node.fields().forEachRemaining(field -> checkTotals(field.getValue(), file, problems));
        } else if (node.isArray()) {
            node.forEach(child -> checkTotals(child, file, problems));
        }
    }

    @Test
    @DisplayName("BigDecimal giữ nguyên giá trị số khi đọc fixture")
    void bigDecimalPrecision() throws Exception {
        CalculateTargetGradesResponse target = read("calculate-target-grades-response.sample.json", CalculateTargetGradesResponse.class);
        assertThat(target.getRequiredAverageGpa()).isEqualByComparingTo(new BigDecimal("3.55"));
    }
}
