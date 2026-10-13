package vn.haui.advisor.contracts;

import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.introspect.BeanPropertyDefinition;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.contracts.dto.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Ngữ nghĩa contracts 1.1.0 (Task 3.2): tài khoản, hồ sơ, CTĐT, bảng điểm, nhập bảng điểm, chứng chỉ.
 */
@DisplayName("contracts 1.1.0: tài khoản, dữ liệu và nhập bảng điểm")
class ContractAccountDataSemanticsTest {

    private final ObjectMapper mapper = ContractTestSupport.mapper();

    private <T> T read(String file, Class<T> type) throws IOException {
        return mapper.readValue(ContractTestSupport.examplesDir().resolve(file).toFile(), type);
    }

    @Test
    @DisplayName("Không DTO nào mang GPA/CPA trong hồ sơ, bảng điểm hay dữ liệu gửi cho AcademicFacade")
    void academicInputsCarryNoComputedOrReportedScores() {
        for (Class<?> dto : List.of(StudentProfileResponse.class, TranscriptResponse.class, TranscriptAttemptItem.class,
                StudentAcademicRecord.class, CertificateStatusItem.class)) {
            JavaType type = mapper.constructType(dto);
            List<String> names = mapper.getSerializationConfig().introspect(type).findProperties().stream()
                    .map(BeanPropertyDefinition::getName).toList();
            assertThat(names).as(dto.getSimpleName())
                    .doesNotContain("gpa", "cpa", "projectedCpa", "reportedCpa", "reportedAccumulatedCredits",
                            "accumulatedCredits", "gradePoint4", "score4", "passed");
        }
    }

    @Test
    @DisplayName("Số liệu in trên tài liệu chỉ nằm trong documentSummary của phiên nhập, không đi vào bảng điểm xác nhận")
    void reportedCpaStaysInImportSessionOnly() throws Exception {
        TranscriptImportResponse upload = read("transcript-import-upload-response.sample.json", TranscriptImportResponse.class);
        assertThat(upload.getDocumentSummary().getReportedCpa()).isEqualByComparingTo("3.18");
        assertThat(upload.getWarnings()).anyMatch(w -> w.contains("chỉ để đối chiếu"));

        String confirmed = mapper.writeValueAsString(read("transcript-import-confirm-response.sample.json", TranscriptResponse.class));
        assertThat(confirmed).doesNotContain("reportedCpa", "documentSummary");
    }

    @Test
    @DisplayName("Xem lại trước khi xác nhận: dòng chặn được đếm, sửa xong mới xác nhận và revision tăng")
    void reviewBeforeConfirm() throws Exception {
        TranscriptImportResponse upload = read("transcript-import-upload-response.sample.json", TranscriptImportResponse.class);
        assertThat(upload.getStatus()).isEqualTo(ImportSessionStatus.REVIEW_REQUIRED);
        assertThat(upload.getBlockingIssueCount()).isEqualTo(countBlocking(upload));
        assertThat(upload.getBlockingIssueCount()).isPositive();

        TranscriptImportResponse fixed = read("transcript-import-rows-response.sample.json", TranscriptImportResponse.class);
        assertThat(fixed.getBlockingIssueCount()).isZero().isEqualTo(countBlocking(fixed));
        assertThat(fixed.getSessionVersion()).isEqualTo(upload.getSessionVersion() + 1);

        ConfirmTranscriptImportRequest confirm = read("transcript-import-confirm-request.sample.json", ConfirmTranscriptImportRequest.class);
        assertThat(confirm.getSessionVersion()).isEqualTo(fixed.getSessionVersion());
        TranscriptResponse transcript = read("transcript-import-confirm-response.sample.json", TranscriptResponse.class);
        assertThat(transcript.getImportSessionId()).isEqualTo(upload.getImportSessionId());
        assertThat(transcript.getDataRevision()).isNotEqualTo(confirm.getDataRevision());
        assertThat(transcript.getAttempts()).hasSize((int) fixed.getRows().stream().filter(r -> Boolean.TRUE.equals(r.getIncluded())).count());

        TranscriptImportResponse cancelled = read("transcript-import-cancel-response.sample.json", TranscriptImportResponse.class);
        assertThat(cancelled.getStatus()).isEqualTo(ImportSessionStatus.CANCELLED);
    }

    @Test
    @DisplayName("Bảng điểm demo khớp hồ sơ TV4: 23 lần học, giữ tín chỉ lẻ (DC6006 = 1.5)")
    void transcriptMatchesTv4Profile() throws Exception {
        TranscriptResponse transcript = read("transcript-response.sample.json", TranscriptResponse.class);
        assertThat(transcript.getTranscriptStatus()).isEqualTo(TranscriptStatus.CONFIRMED);
        assertThat(transcript.getSourceType()).isEqualTo(TranscriptSourceType.DEMO_SEED);
        assertThat(transcript.getAttempts()).hasSize(23);
        assertThat(transcript.getAttempts()).filteredOn(a -> a.getCourseCode().equals("DC6006"))
                .singleElement().satisfies(a -> assertThat(a.getCredits()).isEqualByComparingTo("1.5"));
    }

    @Test
    @DisplayName("Tên chuẩn đầu ra giống nhau giữa danh sách chứng chỉ và checklist audit")
    void certificateNamesMatchAuditChecklist() throws Exception {
        CertificateListResponse certificates = read("certificates-response.sample.json", CertificateListResponse.class);
        GraduationAuditResponse audit = read("graduation-audit-response.sample.json", GraduationAuditResponse.class);
        Map<String, String> auditNameByCategory = audit.getChecklist().stream()
                .collect(Collectors.toMap(AuditChecklistItem::getCategory, AuditChecklistItem::getName));

        for (CertificateStatusItem item : certificates.getCertificates()) {
            assertThat(auditNameByCategory.get(item.getCategory())).as(item.getRequirementCode()).isEqualTo(item.getName());
        }
        CertificateStatusItem declared = read("certificate-declare-response.sample.json", CertificateStatusItem.class);
        assertThat(declared.getVerification()).isEqualTo(CertificateVerification.SELF_DECLARED);
    }

    @Test
    @DisplayName("Phiên đăng nhập: không bao giờ trả mật khẩu; hồ sơ khớp phiên")
    void authAndProfile() throws Exception {
        AuthSessionResponse session = read("auth-session-response.sample.json", AuthSessionResponse.class);
        StudentProfileResponse profile = read("student-profile-response.sample.json", StudentProfileResponse.class);
        assertThat(session.isAuthenticated()).isTrue();
        assertThat(session.getRole()).isEqualTo(AccountRole.STUDENT);
        assertThat(profile.getStudentId()).isEqualTo(session.getStudentId());
        assertThat(profile.getFullName()).isEqualTo(session.getFullName());
        assertThat(mapper.writeValueAsString(session)).doesNotContain("password");

        AuthSessionResponse anonymous = read("auth-session-anonymous-response.sample.json", AuthSessionResponse.class);
        assertThat(anonymous.isAuthenticated()).isFalse();
        assertThat(anonymous.getStudentId()).isNull();
    }

    @Test
    @DisplayName("CTĐT giữ nguyên mã học phần điều kiện, kể cả mã chưa có trong danh mục")
    void curriculumKeepsRelationCodes() throws Exception {
        CurriculumResponse curriculum = read("curriculum-response.sample.json", CurriculumResponse.class);
        Map<String, CurriculumCourseItem> byCode = curriculum.getCourses().stream()
                .collect(Collectors.toMap(CurriculumCourseItem::getCourseCode, Function.identity()));
        assertThat(byCode.get("IT6083").getPriorCourseCodes()).contains("IT6203");
        assertThat(curriculum.getTotalCreditsRequired()).isEqualTo(150);
    }

    private static int countBlocking(TranscriptImportResponse session) {
        return (int) session.getRows().stream()
                .filter(r -> Boolean.TRUE.equals(r.getIncluded()))
                .flatMap(r -> r.getIssues().stream())
                .filter(ImportRowIssueItem::isBlocking)
                .count();
    }
}
