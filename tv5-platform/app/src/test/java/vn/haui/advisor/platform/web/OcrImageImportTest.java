package vn.haui.advisor.platform.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import vn.haui.advisor.contracts.ContractTestSupport;
import vn.haui.advisor.contracts.OpenApiSchemaValidator;
import vn.haui.advisor.contracts.dto.ConfirmTranscriptImportRequest;
import vn.haui.advisor.platform.support.TestAccounts;
import vn.haui.advisor.platform.support.TranscriptFiles;
import vn.haui.advisor.platform.transcript.importing.OcrEngine;
import vn.haui.advisor.platform.transcript.importing.TextLine;

import java.awt.image.BufferedImage;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Ảnh bảng điểm → OCR (giả lập) → xem lại → xác nhận. Dòng OCR độ tin cậy thấp được đánh dấu để đối chiếu.
 */
@SpringBootTest(properties = "haui.test.context=ocr-image")
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Nhập bảng điểm từ ảnh qua OCR")
class OcrImageImportTest {

    @TestConfiguration
    static class FakeOcrConfig {
        @Bean
        @Primary
        OcrEngine fakeOcrEngine() {
            return new OcrEngine() {
                @Override
                public boolean isAvailable() {
                    return true;
                }

                @Override
                public List<TextLine> recognize(List<BufferedImage> pages) {
                    return List.of(
                            new TextLine("Mã sinh viên: sv-ocr-image", new BigDecimal("0.96")),
                            new TextLine("Học kỳ 1 năm học 2024-2025", new BigDecimal("0.95")),
                            new TextLine("IT6O15 Kỹ thuật lập trình 3 9.3 A", new BigDecimal("0.64")),
                            new TextLine("BS6001 Đại số tuyến tính 3 7.0 B", new BigDecimal("0.93")));
                }
            };
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TestAccounts accounts;

    @Test
    @DisplayName("OCR sửa mã đọc sai, đánh dấu dòng độ tin cậy thấp; xác nhận ghi nguồn IMAGE")
    void imageGoesThroughOcrReviewAndConfirm() throws Exception {
        String sv = "sv-ocr-image";
        String revision = accounts.ensure(sv);
        MockMultipartFile file = new MockMultipartFile("file", "anh-bang-diem.png", "image/png", TranscriptFiles.png(600, 300));

        JsonNode session = perform(multipart("/api/v1/academic/transcript/imports").file(file), sv, "TranscriptImportResponse");
        assertThat(session.get("sourceType").asText()).isEqualTo("IMAGE");
        assertThat(session.get("status").asText()).isEqualTo("REVIEW_REQUIRED");
        JsonNode first = session.get("rows").get(0);
        assertThat(first.get("courseCode").asText()).isEqualTo("IT6015");
        assertThat(first.get("confidence").decimalValue()).isEqualByComparingTo("0.64");
        assertThat(first.get("issues").findValuesAsText("code")).contains("LOW_CONFIDENCE");
        assertThat(session.get("rows").get(1).get("issues").findValuesAsText("code")).doesNotContain("LOW_CONFIDENCE");
        assertThat(session.get("blockingIssueCount").asInt()).isZero();

        JsonNode transcript = perform(post("/api/v1/academic/transcript/imports/" + session.get("importSessionId").asText() + "/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ConfirmTranscriptImportRequest(1, revision))),
                sv, "TranscriptResponse");
        assertThat(transcript.get("sourceType").asText()).isEqualTo("IMAGE");
        assertThat(transcript.get("attempts")).hasSize(2);
    }

    private JsonNode perform(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request, String sv,
                             String schema) throws Exception {
        MvcResult result = mockMvc.perform(request.with(user(sv).roles("STUDENT")).with(csrf())).andReturn();
        String content = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(result.getResponse().getStatus()).as(content).isEqualTo(200);
        JsonNode json = objectMapper.readTree(content);
        assertThat(new OpenApiSchemaValidator(ContractTestSupport.openApiSchemas()).validate(json, schema)).as(content).isEmpty();
        return json;
    }
}
