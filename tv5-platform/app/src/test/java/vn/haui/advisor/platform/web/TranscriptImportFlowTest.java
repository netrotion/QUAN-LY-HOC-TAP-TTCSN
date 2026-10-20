package vn.haui.advisor.platform.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import vn.haui.advisor.contracts.ContractTestSupport;
import vn.haui.advisor.contracts.OpenApiSchemaValidator;
import vn.haui.advisor.contracts.dto.AcademicStatusRequest;
import vn.haui.advisor.contracts.dto.ConfirmTranscriptImportRequest;
import vn.haui.advisor.contracts.ports.AcademicFacade;
import vn.haui.advisor.contracts.ports.StudentAcademicRecordProvider;
import vn.haui.advisor.platform.support.TestAccounts;
import vn.haui.advisor.platform.support.TranscriptFiles;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/**
 * Task 3.2: nhập bảng điểm review → confirm; upload có giới hạn; điểm parser không phải nguồn tính CPA.
 * Mọi response được kiểm theo schema OpenAPI contracts 1.1.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Nhập bảng điểm: xem lại trước khi ghi, giới hạn upload, CPA không lấy từ tài liệu")
class TranscriptImportFlowTest {

    private static final List<String> TRANSCRIPT = List.of(
            "TRUONG DAI HOC CONG NGHIEP HA NOI - BANG DIEM CA NHAN",
            "Ho va ten: Sinh vien thu nghiem   Ma sinh vien: %s",
            "Hoc ky 1 nam hoc 2024-2025",
            "STT Ma HP Ten hoc phan TC Diem 10 Diem chu Diem 4",
            "1 IT6015 Ky thuat lap trinh 3 9.3 A 4.0",
            "2 BS6001 Dai so tuyen tinh 3 7.0 B 3.0",
            "Hoc ky 2 nam hoc 2024-2025",
            "3 IT6O35 Toan roi rac 3 6.6 C+ 2.5",
            "4 LP6004 Tu tuong Ho Chi Minh 2 3.0 F 0.0",
            "Hoc ky 1 nam hoc 2025-2026",
            "5 LP6004 Tu tuong Ho Chi Minh 2 7.5 B 3.0",
            "6 IT6126 He thong co so du lieu 4",
            "Diem trung binh tich luy (CPA): 3.99",
            "So tin chi tich luy: 120");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TestAccounts accounts;

    @Autowired
    private JdbcClient jdbc;

    @Autowired
    private StudentAcademicRecordProvider recordProvider;

    @Autowired
    private AcademicFacade academicFacade;

    @Test
    @DisplayName("Xem lại trước khi xác nhận: tải lên/sửa không đổi bảng điểm và revision; chỉ xác nhận mới ghi")
    void reviewBeforeCommit() throws Exception {
        String sv = "sv-import-review";
        String revision = accounts.ensure(sv);

        JsonNode session = call(multipartUpload(sv, pdf(sv)), sv, 200, "TranscriptImportResponse");
        String id = session.get("importSessionId").asText();
        assertThat(session.get("status").asText()).isEqualTo("REVIEW_REQUIRED");
        assertThat(session.get("sourceType").asText()).isEqualTo("PDF_TEXT");
        assertThat(session.get("rows")).hasSize(6);
        assertThat(session.get("blockingIssueCount").asInt()).isEqualTo(1);
        assertThat(issueCodes(session.get("rows").get(2))).contains("UNKNOWN_COURSE_CODE");
        assertThat(issueCodes(session.get("rows").get(5))).contains("MISSING_GRADE");
        assertTranscriptUntouched(sv, revision);

        // Xác nhận khi còn dòng chặn → 422, vẫn chưa ghi gì
        JsonNode blocked = call(post(base(id) + "/confirm"), sv, 422, "ApiErrorResponse",
                new ConfirmTranscriptImportRequest(1, revision));
        assertThat(blocked.get("code").asText()).isEqualTo("IMPORT_HAS_BLOCKING_ISSUES");
        assertTranscriptUntouched(sv, revision);

        // Sửa mã đọc sai rồi lưu dòng: phiên lên version 2, bảng điểm vẫn chưa đổi
        ArrayNode rows = (ArrayNode) session.get("rows").deepCopy();
        ((ObjectNode) rows.get(2)).put("courseCode", "IT6035");
        ObjectNode update = objectMapper.createObjectNode().put("sessionVersion", 1);
        update.set("rows", rows);
        JsonNode fixed = call(put(base(id) + "/rows"), sv, 200, "TranscriptImportResponse", update);
        assertThat(fixed.get("sessionVersion").asInt()).isEqualTo(2);
        assertThat(fixed.get("blockingIssueCount").asInt()).isZero();
        assertTranscriptUntouched(sv, revision);

        // Version cũ → 409; revision cũ → 409
        assertThat(call(put(base(id) + "/rows"), sv, 409, "ApiErrorResponse", update).get("code").asText())
                .isEqualTo("IMPORT_VERSION_CONFLICT");
        assertThat(call(post(base(id) + "/confirm"), sv, 409, "ApiErrorResponse",
                new ConfirmTranscriptImportRequest(2, "REV-" + sv + "-000")).get("code").asText()).isEqualTo("DATA_REVISION_STALE");

        JsonNode transcript = call(post(base(id) + "/confirm"), sv, 200, "TranscriptResponse",
                new ConfirmTranscriptImportRequest(2, revision));
        assertThat(transcript.get("transcriptStatus").asText()).isEqualTo("CONFIRMED");
        assertThat(transcript.get("importSessionId").asText()).isEqualTo(id);
        assertThat(transcript.get("dataRevision").asText()).isNotEqualTo(revision);
        assertThat(transcript.get("attempts")).hasSize(6);
        // Học lại LP6004: lần 2 ở kỳ sau
        assertThat(transcript.get("attempts").findValues("attemptNumber").stream().mapToInt(JsonNode::asInt).max().orElse(0)).isEqualTo(2);
        // Tên/tín chỉ lấy theo CTĐT, không theo chữ không dấu trên tài liệu
        assertThat(transcript.toString()).contains("Kỹ thuật lập trình").doesNotContain("Ky thuat lap trinh");

        assertThat(call(post(base(id) + "/confirm"), sv, 409, "ApiErrorResponse",
                new ConfirmTranscriptImportRequest(3, transcript.get("dataRevision").asText())).get("code").asText())
                .isEqualTo("IMPORT_SESSION_CLOSED");
    }

    @Test
    @DisplayName("Điểm/CPA đọc từ tài liệu không phải nguồn tính CPA: chỉ ở documentSummary, không vào DB hay dữ liệu cho AcademicFacade")
    void parserFiguresAreNeverTheCpaSource() throws Exception {
        String sv = "sv-import-cpa";
        String revision = accounts.ensure(sv);
        JsonNode session = call(multipartUpload(sv, pdf(sv)), sv, 200, "TranscriptImportResponse");
        assertThat(session.get("documentSummary").get("reportedCpa").decimalValue()).isEqualByComparingTo("3.99");
        assertThat(session.get("documentSummary").get("reportedAccumulatedCredits").decimalValue()).isEqualByComparingTo("120");
        assertThat(session.get("warnings").toString()).contains("chỉ để đối chiếu");

        ArrayNode rows = (ArrayNode) session.get("rows").deepCopy();
        ((ObjectNode) rows.get(2)).put("included", false);
        ObjectNode update = objectMapper.createObjectNode().put("sessionVersion", 1);
        update.set("rows", rows);
        call(put(base(session.get("importSessionId").asText()) + "/rows"), sv, 200, "TranscriptImportResponse", update);
        call(post(base(session.get("importSessionId").asText()) + "/confirm"), sv, 200, "TranscriptResponse",
                new ConfirmTranscriptImportRequest(2, revision));

        // Không có số liệu đọc từ tài liệu trong hồ sơ, bảng điểm, hay input của AcademicFacade
        String profile = call(get("/api/v1/students/me"), sv, 200, "StudentProfileResponse").toString();
        String transcript = call(get("/api/v1/academic/transcript"), sv, 200, "TranscriptResponse").toString();
        String record = objectMapper.writeValueAsString(recordProvider.getAcademicRecord(sv));
        for (String json : List.of(profile, transcript, record)) {
            assertThat(json).doesNotContain("3.99", "reportedCpa", "\"cpa\"", "\"gpa\"");
        }
        // Điểm hệ 4 in trên tài liệu (cột cuối) không được ghi; DB hồ sơ không còn cột GPA/CPA
        assertThat(jdbc.sql("SELECT count(*) FROM enrollment_attempts WHERE student_id = :sv AND score_4 IS NOT NULL")
                .param("sv", sv).query(Integer.class).single()).isZero();
        assertThat(jdbc.sql("SELECT count(*) FROM information_schema.columns WHERE table_name = 'student_records' AND column_name IN ('cpa', 'gpa')")
                .query(Integer.class).single()).isZero();
        // CPA chỉ do AcademicFacade tính trên bảng điểm đã xác nhận (Task 4.1), không lấy số in trên tài liệu
        JsonNode status = call(get("/api/v1/academic/status"), sv, 200, "AcademicStatusResponse");
        assertThat(status.get("cpa").decimalValue()).isEqualByComparingTo(
                academicFacade.getAcademicStatus(new AcademicStatusRequest(sv, accounts.revision(sv))).getCpa());
        assertThat(status.get("cpa").decimalValue()).isNotEqualByComparingTo("3.99");
        // IT6015 (3) + BS6001 (3) + LP6004 học lại đạt (2); IT6126 chưa có điểm, IT6035 bị bỏ khi xem lại
        assertThat(status.get("accumulatedCredits").asInt()).isEqualTo(8);
    }

    @Test
    @DisplayName("Giới hạn upload: rỗng 400, quá dung lượng 413, quá số trang 413, sai loại theo nội dung 415, quá số phiên 429")
    void uploadLimits() throws Exception {
        String sv = "sv-import-limits";
        accounts.ensure(sv);

        call(multipartUpload(sv, new byte[0]), sv, 400, "ApiErrorResponse");
        byte[] huge = new byte[5 * 1024 * 1024 + 1];
        System.arraycopy("%PDF-".getBytes(StandardCharsets.US_ASCII), 0, huge, 0, 5);
        assertThat(call(multipartUpload(sv, huge), sv, 413, "ApiErrorResponse").get("code").asText()).isEqualTo("UPLOAD_TOO_LARGE");
        call(multipartUpload(sv, TranscriptFiles.blankPdf(11)), sv, 413, "ApiErrorResponse");
        assertThat(call(multipartUpload(sv, "MZ day la file exe doi duoi .pdf".getBytes(StandardCharsets.UTF_8)), sv, 415,
                "ApiErrorResponse").get("code").asText()).isEqualTo("UNSUPPORTED_FILE_TYPE");

        String first = call(post("/api/v1/academic/transcript/imports/manual"), sv, 200, "TranscriptImportResponse")
                .get("importSessionId").asText();
        call(post("/api/v1/academic/transcript/imports/manual"), sv, 200, "TranscriptImportResponse");
        call(post("/api/v1/academic/transcript/imports/manual"), sv, 200, "TranscriptImportResponse");
        assertThat(call(multipartUpload(sv, pdf(sv)), sv, 429, "ApiErrorResponse").get("code").asText()).isEqualTo("IMPORT_LIMIT_REACHED");
        call(post(base(first) + "/cancel"), sv, 200, "TranscriptImportResponse");
        call(multipartUpload(sv, pdf(sv)), sv, 200, "TranscriptImportResponse");

        String hash = jdbc.sql("SELECT file_sha256 FROM import_sessions WHERE student_id = :sv AND file_sha256 IS NOT NULL")
                .param("sv", sv).query(String.class).list().get(0);
        assertThat(hash).hasSize(64);
    }

    @Test
    @DisplayName("Parser/OCR không đọc được → nhập tay: PDF scan, tài liệu của người khác, rồi nhập tay và xác nhận")
    void fallbackToManualEntry() throws Exception {
        String sv = "sv-import-manual";
        String revision = accounts.ensure(sv);

        JsonNode scanned = call(multipartUpload(sv, TranscriptFiles.scannedPdf()), sv, 200, "TranscriptImportResponse");
        assertThat(scanned.get("status").asText()).isEqualTo("MANUAL_ENTRY_REQUIRED");
        assertThat(scanned.get("sourceType").asText()).isEqualTo("PDF_SCANNED");
        assertThat(scanned.get("warnings").toString()).contains("OCR");

        JsonNode someoneElse = call(multipartUpload(sv, pdf("2099000001")), sv, 200, "TranscriptImportResponse");
        assertThat(someoneElse.get("status").asText()).isEqualTo("MANUAL_ENTRY_REQUIRED");
        assertThat(someoneElse.get("rows")).isEmpty();
        assertThat(someoneElse.get("warnings").toString()).contains("2099000001");
        call(post(base(someoneElse.get("importSessionId").asText()) + "/cancel"), sv, 200, "TranscriptImportResponse");

        String id = scanned.get("importSessionId").asText();
        ObjectNode update = objectMapper.createObjectNode().put("sessionVersion", 1);
        ArrayNode rows = update.putArray("rows");
        rows.addObject().put("courseCode", "it6015").put("semesterCode", "2024_1").put("score10", 8.5).put("letterGrade", "a");
        rows.addObject().put("courseCode", "DC6006").put("semesterCode", "2024_1").put("score10", 8.7).put("letterGrade", "A");
        JsonNode manual = call(put(base(id) + "/rows"), sv, 200, "TranscriptImportResponse", update);
        assertThat(manual.get("status").asText()).isEqualTo("REVIEW_REQUIRED");
        assertThat(manual.get("rows").get(0).get("courseCode").asText()).isEqualTo("IT6015");
        assertThat(manual.get("rows").get(1).get("credits").decimalValue()).isEqualByComparingTo("1.5");

        JsonNode transcript = call(post(base(id) + "/confirm"), sv, 200, "TranscriptResponse",
                new ConfirmTranscriptImportRequest(2, revision));
        assertThat(transcript.get("sourceType").asText()).as("dòng do sinh viên tự nhập").isEqualTo("MANUAL");
        assertThat(transcript.get("attempts")).hasSize(2);
    }

    @Test
    @DisplayName("Hủy phiên không ghi gì; phiên đã hủy không sửa được")
    void cancelWritesNothing() throws Exception {
        String sv = "sv-import-cancel";
        String revision = accounts.ensure(sv);
        String id = call(multipartUpload(sv, pdf(sv)), sv, 200, "TranscriptImportResponse").get("importSessionId").asText();
        assertThat(call(post(base(id) + "/cancel"), sv, 200, "TranscriptImportResponse").get("status").asText()).isEqualTo("CANCELLED");
        assertTranscriptUntouched(sv, revision);
        call(post(base(id) + "/cancel"), sv, 409, "ApiErrorResponse");
        assertThat(call(get("/api/v1/academic/transcript/imports"), sv, 200, "TranscriptImportListResponse").get("sessions")).hasSize(1);
    }

    // ---------------------------------------------------------------------------------------------

    private void assertTranscriptUntouched(String sv, String revision) throws Exception {
        JsonNode transcript = call(get("/api/v1/academic/transcript"), sv, 200, "TranscriptResponse");
        assertThat(transcript.get("transcriptStatus").asText()).isEqualTo("NONE");
        assertThat(transcript.get("attempts")).isEmpty();
        assertThat(transcript.get("dataRevision").asText()).isEqualTo(revision);
        assertThat(jdbc.sql("SELECT count(*) FROM enrollment_attempts WHERE student_id = :sv").param("sv", sv)
                .query(Integer.class).single()).isZero();
    }

    private static byte[] pdf(String studentIdOnDocument) {
        return TranscriptFiles.textPdf(TRANSCRIPT.stream().map(line -> line.formatted(studentIdOnDocument)).toList());
    }

    private static String base(String importSessionId) {
        return "/api/v1/academic/transcript/imports/" + importSessionId;
    }

    private static MockHttpServletRequestBuilder multipartUpload(String sv, byte[] content) {
        return multipart("/api/v1/academic/transcript/imports")
                .file(new MockMultipartFile("file", "bang-diem.pdf", "application/pdf", content));
    }

    private static RequestPostProcessor student(String sv) {
        return user(sv).roles("STUDENT");
    }

    private JsonNode call(MockHttpServletRequestBuilder request, String sv, int status, String schema) throws Exception {
        return call(request, sv, status, schema, null);
    }

    private JsonNode call(MockHttpServletRequestBuilder request, String sv, int status, String schema, Object body) throws Exception {
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body));
        }
        MvcResult result = mockMvc.perform(request.with(student(sv)).with(csrf())).andReturn();
        String content = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(result.getResponse().getStatus()).as("%s → %s", request, content).isEqualTo(status);
        JsonNode json = objectMapper.readTree(content);
        assertThat(new OpenApiSchemaValidator(ContractTestSupport.openApiSchemas()).validate(json, schema))
                .as("Schema %s: %s", schema, content).isEmpty();
        return json;
    }

    private static List<String> issueCodes(JsonNode row) {
        return row.get("issues").findValuesAsText("code");
    }
}
