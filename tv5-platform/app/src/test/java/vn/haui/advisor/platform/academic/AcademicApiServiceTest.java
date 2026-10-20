package vn.haui.advisor.platform.academic;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.mock.env.MockEnvironment;
import vn.haui.advisor.academic.fixture.AcademicFixtures;
import vn.haui.advisor.academic.service.DefaultAcademicFacade;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.platform.transcript.DbStudentAcademicRecordProvider;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("AcademicApiService: hồ sơ server nạp, lỗi không bị che, kết quả lệch sinh viên bị chặn")
class AcademicApiServiceTest {

    private static final String SV = "sv-unit";
    private static final String REVISION = "REV-sv-unit-002";

    @Test
    @DisplayName("Lỗi đọc hồ sơ từ DB trả lỗi cho client, không gọi facade và không thành kết quả rỗng")
    void loadFailureIsNotMasked() {
        StubRecords records = new StubRecords(id -> {
            throw new DataAccessResourceFailureException("DB không phản hồi");
        });
        RecordingFacade facade = new RecordingFacade(request -> new AcademicStatusResponse(SV, null, null, 0, 150,
                AcademicRiskLevel.NORMAL, List.of(), REVISION));
        AcademicApiService service = service(facade, records);

        assertThatThrownBy(() -> service.status(context())).isInstanceOf(DataAccessResourceFailureException.class);
        assertThat(facade.seen).isEmpty();
    }

    @Test
    @DisplayName("Facade nhận đúng hồ sơ đã nạp (studentId, dataRevision); hồ sơ chỉ gắn trong lúc gọi")
    void facadeSeesPinnedRecord() {
        StudentAcademicRecord loaded = record(SV, REVISION);
        StubRecords records = new StubRecords(id -> loaded);
        List<StudentAcademicRecord> seenByFacade = new ArrayList<>();
        RecordingFacade facade = new RecordingFacade(request -> {
            seenByFacade.add(records.getAcademicRecord(request.getStudentId()));
            return new AcademicStatusResponse(request.getStudentId(), null, new BigDecimal("3.10"), 3, 150,
                    AcademicRiskLevel.NORMAL, List.of(), request.getDataRevision());
        });
        AcademicApiService service = service(facade, records);

        AcademicStatusResponse result = service.status(context());
        assertThat(facade.seen).singleElement().satisfies(request -> {
            assertThat(request.getStudentId()).isEqualTo(SV);
            assertThat(request.getDataRevision()).isEqualTo(REVISION);
        });
        assertThat(seenByFacade).singleElement().isSameAs(loaded);
        assertThat(records.loads).as("nạp một lần mỗi yêu cầu").isEqualTo(1);
        assertThat(result.getPolicyVersion()).isEqualTo("policy-test@1");
        assertThat(result.getDataRevision()).isEqualTo(REVISION);

        // Ngoài lượt gọi, provider đọc lại từ DB
        records.getAcademicRecord(SV);
        assertThat(records.loads).isEqualTo(2);
    }

    @Test
    @DisplayName("Kết quả facade thuộc sinh viên khác hoặc revision khác không được trả cho client")
    void mismatchedResultIsRejected() {
        StubRecords records = new StubRecords(id -> record(SV, REVISION));
        AcademicApiService otherStudent = service(new RecordingFacade(request -> new AcademicStatusResponse("sv-khac", null, null,
                0, 150, AcademicRiskLevel.NORMAL, List.of(), REVISION)), records);
        assertThatThrownBy(() -> otherStudent.status(context())).isInstanceOf(IllegalStateException.class);

        AcademicApiService otherRevision = service(new RecordingFacade(request -> new AcademicStatusResponse(SV, null, null,
                0, 150, AcademicRiskLevel.NORMAL, List.of(), "rev-v0")), records);
        assertThatThrownBy(() -> otherRevision.status(context())).isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("Trạng thái nút cây: đạt/không đạt/đang học/đủ điều kiện/khóa; chưa có bảng điểm xác nhận → UNKNOWN")
    void progressStatus() {
        TranscriptStatus confirmed = TranscriptStatus.CONFIRMED;
        assertThat(AcademicApiService.progress(TranscriptStatus.NONE, List.of(), true)).isEqualTo(CourseProgressStatus.UNKNOWN);
        assertThat(AcademicApiService.progress(confirmed, List.of(), true)).isEqualTo(CourseProgressStatus.ELIGIBLE);
        assertThat(AcademicApiService.progress(confirmed, List.of(), false)).isEqualTo(CourseProgressStatus.BLOCKED);
        assertThat(AcademicApiService.progress(confirmed, List.of(attempt("D")), false)).isEqualTo(CourseProgressStatus.PASSED);
        assertThat(AcademicApiService.progress(confirmed, List.of(attempt("F")), true)).isEqualTo(CourseProgressStatus.FAILED);
        assertThat(AcademicApiService.progress(confirmed, List.of(attempt("F"), attempt("B")), true)).isEqualTo(CourseProgressStatus.PASSED);
        assertThat(AcademicApiService.progress(confirmed, List.of(attempt("F"), attempt(null)), true))
                .isEqualTo(CourseProgressStatus.IN_PROGRESS);
        assertThat(AcademicApiService.progress(confirmed, List.of(attempt("X")), true)).isEqualTo(CourseProgressStatus.UNKNOWN);
    }

    @Test
    @DisplayName("deadline của audit: giữ ngày yyyy-MM-dd, bỏ chữ không phải ngày, không đổi trường khác")
    void auditDeadlineMustBeADate() {
        AuditCertificateAction dated = new AuditCertificateAction("IT_SKILLS", "MOS", "Nộp MOS", "2028-03-31", "PENDING");
        AcademicApiService.dropNonDateDeadline(dated);
        assertThat(dated.getDeadline()).isEqualTo("2028-03-31");

        AuditCertificateAction text = new AuditCertificateAction("IT_SKILLS", "MOS", "Nộp MOS trước kỳ xét tốt nghiệp",
                "Trước kỳ tốt nghiệp", "Chưa nộp");
        AcademicApiService.dropNonDateDeadline(text);
        assertThat(text.getDeadline()).isNull();
        assertThat(text.getActionDescription()).isEqualTo("Nộp MOS trước kỳ xét tốt nghiệp");
        assertThat(text.getStatus()).isEqualTo("Chưa nộp");
    }

    // ---------------------------------------------------------------------------------------------

    private static AcademicApiService service(DefaultAcademicFacade facade, DbStudentAcademicRecordProvider records) {
        AcademicToolGate gate = new AcademicToolGate(facade, new MockEnvironment(), false);
        AcademicEngineSources engine = new AcademicEngineSources(AcademicFixtures.getPolicyDemo(), AcademicFixtures.getCurriculumV1());
        return new AcademicApiService(facade, gate, records, engine, () -> "policy-test@1", null);
    }

    private static TrustedStudentContext context() {
        return new TrustedStudentContext(SV, SV, "Sinh viên", "CT1085", "K19", REVISION);
    }

    private static StudentAcademicRecord record(String studentId, String revision) {
        StudentAcademicRecord record = new StudentAcademicRecord();
        record.setStudentId(studentId);
        record.setDataRevision(revision);
        record.setCurriculumId(AcademicFixtures.getCurriculumV1().getCurriculumId());
        record.setTranscriptStatus(TranscriptStatus.CONFIRMED);
        record.setAttempts(List.of());
        record.setCertificates(List.of());
        return record;
    }

    private static TranscriptAttemptItem attempt(String letterGrade) {
        TranscriptAttemptItem attempt = new TranscriptAttemptItem();
        attempt.setCourseCode("IT6015");
        attempt.setCredits(new BigDecimal("3"));
        attempt.setSemesterCode("2024_1");
        attempt.setLetterGrade(letterGrade);
        return attempt;
    }

    /** Provider không cần DB: load() trả theo hàm cho trước và đếm số lần nạp. */
    private static class StubRecords extends DbStudentAcademicRecordProvider {

        private final Function<String, StudentAcademicRecord> source;
        private int loads;

        StubRecords(Function<String, StudentAcademicRecord> source) {
            super(null, null, null, null);
            this.source = source;
        }

        @Override
        public StudentAcademicRecord load(String studentId) {
            loads++;
            return source.apply(studentId);
        }
    }

    /** Engine TV4 với kết quả trạng thái cho trước; ghi lại request nhận được. */
    private static class RecordingFacade extends DefaultAcademicFacade {

        private final Function<AcademicStatusRequest, AcademicStatusResponse> status;
        private final List<AcademicStatusRequest> seen = new ArrayList<>();

        RecordingFacade(Function<AcademicStatusRequest, AcademicStatusResponse> status) {
            this.status = status;
        }

        @Override
        public AcademicStatusResponse getAcademicStatus(AcademicStatusRequest request) {
            seen.add(request);
            return status.apply(request);
        }
    }
}
