package vn.haui.advisor.platform.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import vn.haui.advisor.contracts.ContractTestSupport;
import vn.haui.advisor.contracts.OpenApiSchemaValidator;
import vn.haui.advisor.contracts.dto.CertificateStatus;
import vn.haui.advisor.contracts.dto.DeclareCertificateRequest;
import vn.haui.advisor.contracts.dto.StudentAcademicRecord;
import vn.haui.advisor.contracts.dto.TranscriptStatus;
import vn.haui.advisor.contracts.dto.UpdateStudentProfileRequest;
import vn.haui.advisor.contracts.ports.StudentAcademicRecordProvider;
import vn.haui.advisor.platform.support.TestAccounts;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

/**
 * Task 3.2: hồ sơ, CTĐT, bảng điểm, chứng chỉ tự khai báo/demo và seed từ fixture TV4.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Dữ liệu sinh viên: hồ sơ, CTĐT, chứng chỉ, seed demo")
class StudentDataTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TestAccounts accounts;

    @Autowired
    private StudentAcademicRecordProvider recordProvider;

    @Test
    @DisplayName("Seed demo từ fixture TV4: bảng điểm 23 lần học đã xác nhận, chứng chỉ DEMO_SEED, revision như contract")
    void demoStudentSeededFromTv4Fixtures() throws Exception {
        JsonNode transcript = call(get("/api/v1/academic/transcript"), "2024604757", 200, "TranscriptResponse", null);
        assertThat(transcript.get("transcriptStatus").asText()).isEqualTo("CONFIRMED");
        assertThat(transcript.get("sourceType").asText()).isEqualTo("DEMO_SEED");
        assertThat(transcript.get("attempts")).hasSize(23);

        JsonNode certificates = call(get("/api/v1/academic/certificates"), "2024604757", 200, "CertificateListResponse", null);
        assertThat(certificates.get("certificates")).hasSize(4);
        assertThat(certificates.get("certificates").findValuesAsText("verification")).containsOnly("DEMO_SEED");

        // Hồ sơ fixture có lần học ngoài CTĐT (IT6005, MA6002) → bỏ, không tạo học phần giả
        JsonNode warning = call(get("/api/v1/academic/transcript"), "std-warning-real", 200, "TranscriptResponse", null);
        assertThat(warning.get("attempts").findValuesAsText("courseCode")).doesNotContain("IT6005", "MA6002");
    }

    @Test
    @DisplayName("CTĐT đọc từ DB: 120 học phần, tín chỉ lẻ, mã điều kiện giữ nguyên như CTĐT")
    void curriculum() throws Exception {
        accounts.ensure("sv-curriculum");
        JsonNode curriculum = call(get("/api/v1/academic/curriculum"), "sv-curriculum", 200, "CurriculumResponse", null);
        assertThat(curriculum.get("majorCode").asText()).isEqualTo("CT1085");
        assertThat(curriculum.get("totalCreditsRequired").asInt()).isEqualTo(150);
        assertThat(curriculum.get("courses")).hasSize(120);
        JsonNode dc6006 = find(curriculum.get("courses"), "DC6006");
        assertThat(dc6006.get("credits").decimalValue()).isEqualByComparingTo("1.5");
        assertThat(find(curriculum.get("courses"), "IT6083").get("priorCourseCodes").toString()).contains("IT6203");
    }

    @Test
    @DisplayName("Cập nhật hồ sơ cần dataRevision hiện hành; email sai → 400; revision cũ → 409")
    void updateProfile() throws Exception {
        String sv = "sv-profile";
        String revision = accounts.ensure(sv);
        JsonNode profile = call(put("/api/v1/students/me"), sv, 200, "StudentProfileResponse",
                new UpdateStudentProfileRequest(null, "moi@example.com", "2024DHKTPM05", null, null, revision));
        assertThat(profile.get("email").asText()).isEqualTo("moi@example.com");
        assertThat(profile.get("className").asText()).isEqualTo("2024DHKTPM05");
        assertThat(profile.get("dataRevision").asText()).as("đổi thông tin liên hệ không đổi dữ liệu học vụ").isEqualTo(revision);

        call(put("/api/v1/students/me"), sv, 400, "ApiErrorResponse",
                new UpdateStudentProfileRequest(null, "khong-phai-email", null, null, null, revision));
        call(put("/api/v1/students/me"), sv, 409, "ApiErrorResponse",
                new UpdateStudentProfileRequest(null, null, null, null, null, "REV-" + sv + "-000"));
        call(put("/api/v1/students/me"), sv, 400, "ApiErrorResponse",
                new UpdateStudentProfileRequest(null, null, null, null, "ctdt-khong-co", revision));
    }

    @Test
    @DisplayName("Tự khai báo chứng chỉ: SELF_DECLARED, tăng revision, đi vào dữ liệu cho AcademicFacade")
    void declareCertificate() throws Exception {
        String sv = "sv-certificate";
        String revision = accounts.ensure(sv);
        JsonNode before = call(get("/api/v1/academic/certificates"), sv, 200, "CertificateListResponse", null);
        assertThat(before.get("certificates").findValuesAsText("status")).containsOnly("UNKNOWN");

        JsonNode declared = call(put("/api/v1/academic/certificates/IT_SKILLS"), sv, 200, "CertificateStatusItem",
                new DeclareCertificateRequest(CertificateStatus.ACHIEVED, "MOS Word, Excel", "2026-09-20", revision));
        assertThat(declared.get("status").asText()).isEqualTo("ACHIEVED");
        assertThat(declared.get("verification").asText()).isEqualTo("SELF_DECLARED");
        assertThat(declared.get("achievedOn").asText()).isEqualTo("2026-09-20");
        assertThat(accounts.revision(sv)).isNotEqualTo(revision);

        StudentAcademicRecord record = recordProvider.getAcademicRecord(sv);
        assertThat(record.getTranscriptStatus()).isEqualTo(TranscriptStatus.NONE);
        assertThat(record.getCertificates()).anySatisfy(item -> {
            assertThat(item.getRequirementCode()).isEqualTo("IT_SKILLS");
            assertThat(item.getStatus()).isEqualTo(CertificateStatus.ACHIEVED);
        });

        call(put("/api/v1/academic/certificates/TOEIC_900"), sv, 404, "ApiErrorResponse",
                new DeclareCertificateRequest(CertificateStatus.ACHIEVED, null, null, accounts.revision(sv)));
        call(put("/api/v1/academic/certificates/IT_SKILLS"), sv, 409, "ApiErrorResponse",
                new DeclareCertificateRequest(CertificateStatus.NOT_ACHIEVED, null, null, revision));
        call(put("/api/v1/academic/certificates/IT_SKILLS"), sv, 400, "ApiErrorResponse",
                new DeclareCertificateRequest(CertificateStatus.ACHIEVED, null, "20/09/2026", accounts.revision(sv)));
    }

    private JsonNode call(MockHttpServletRequestBuilder request, String sv, int status, String schema, Object body) throws Exception {
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body));
        }
        MvcResult result = mockMvc.perform(request.with(user(sv).roles("STUDENT")).with(csrf())).andReturn();
        String content = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(result.getResponse().getStatus()).as(content).isEqualTo(status);
        JsonNode json = objectMapper.readTree(content);
        assertThat(new OpenApiSchemaValidator(ContractTestSupport.openApiSchemas()).validate(json, schema)).as(content).isEmpty();
        return json;
    }

    private static JsonNode find(JsonNode courses, String code) {
        for (JsonNode course : courses) {
            if (course.get("courseCode").asText().equals(code)) {
                return course;
            }
        }
        throw new AssertionError("Không có học phần " + code);
    }
}
