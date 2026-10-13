package vn.haui.advisor.platform.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import vn.haui.advisor.contracts.ContractTestSupport;
import vn.haui.advisor.contracts.OpenApiSchemaValidator;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

/**
 * Gọi API như một sinh viên đã đăng nhập (principal gắn theo từng request, dùng được từ nhiều luồng),
 * kiểm tra status và đối chiếu body với schema OpenAPI.
 */
public class StudentApi {

    private final MockMvc mockMvc;
    private final ObjectMapper objectMapper;
    private final OpenApiSchemaValidator validator;

    public StudentApi(MockMvc mockMvc, ObjectMapper objectMapper) {
        this.mockMvc = mockMvc;
        this.objectMapper = objectMapper;
        try {
            this.validator = new OpenApiSchemaValidator(ContractTestSupport.openApiSchemas());
        } catch (java.io.IOException ex) {
            throw new java.io.UncheckedIOException(ex);
        }
    }

    public JsonNode call(MockHttpServletRequestBuilder request, String studentId, int status, String schema) throws Exception {
        return call(request, studentId, status, schema, null);
    }

    public JsonNode call(MockHttpServletRequestBuilder request, String studentId, int status, String schema, Object body)
            throws Exception {
        MvcResult result = perform(request, studentId, body);
        String content = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(result.getResponse().getStatus()).as("%s → %s", request, content).isEqualTo(status);
        if (schema == null) {
            return null;
        }
        JsonNode json = objectMapper.readTree(content);
        assertThat(validator.validate(json, schema)).as("Schema %s: %s", schema, content).isEmpty();
        return json;
    }

    /** Gọi và trả kết quả thô (status chưa kiểm tra), dùng khi nhiều luồng chạy đồng thời. */
    public MvcResult perform(MockHttpServletRequestBuilder request, String studentId, Object body) throws Exception {
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body));
        }
        return mockMvc.perform(request.with(user(studentId).roles("STUDENT")).with(csrf())).andReturn();
    }

    public JsonNode read(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }
}
