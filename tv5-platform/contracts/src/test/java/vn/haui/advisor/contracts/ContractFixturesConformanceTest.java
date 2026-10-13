package vn.haui.advisor.contracts;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Contract test V1: mỗi JSON mẫu trong manifest phải
 * (1) hợp lệ theo schema OpenAPI cùng tên,
 * (2) đọc được vào DTO cùng tên mà không có trường lạ,
 * (3) ghi ngược từ DTO ra JSON không sinh thêm trường nào có giá trị (không có tên thứ hai cho cùng dữ liệu).
 */
@DisplayName("contracts-v1: JSON fixtures ↔ OpenAPI ↔ Java DTO")
class ContractFixturesConformanceTest {

    private final ObjectMapper mapper = ContractTestSupport.mapper();

    static Stream<ContractTestSupport.SampleRef> samples() throws IOException {
        return ContractTestSupport.manifestSamples().stream();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("samples")
    @DisplayName("Fixture hợp lệ theo schema OpenAPI V1")
    void fixtureMatchesOpenApiSchema(ContractTestSupport.SampleRef sample) throws Exception {
        JsonNode json = ContractTestSupport.readExample(sample.file());
        OpenApiSchemaValidator validator = new OpenApiSchemaValidator(ContractTestSupport.openApiSchemas());

        assertThat(validator.validate(json, sample.schema()))
                .as("Lỗi schema của %s", sample)
                .isEmpty();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("samples")
    @DisplayName("Fixture round-trip qua DTO không mất và không nhân đôi trường")
    void fixtureRoundTripsThroughDto(ContractTestSupport.SampleRef sample) throws Exception {
        Class<?> dto = ContractTestSupport.dtoClass(sample.schema());
        assertThat(dto).as("Không có DTO Java cho schema %s", sample.schema()).isNotNull();

        JsonNode original = ContractTestSupport.readExample(sample.file());
        Object value = mapper.treeToValue(original, dto);
        JsonNode written = mapper.valueToTree(value);

        List<String> problems = new ArrayList<>();
        compare(original, written, "$", problems);
        assertThat(problems).as("Round-trip lệch tại %s", sample).isEmpty();
    }

    @Test
    @DisplayName("Manifest khai báo đủ file, không có file mẫu mồ côi")
    void manifestCoversEveryExampleFile() throws Exception {
        Set<String> declared = new HashSet<>();
        for (ContractTestSupport.SampleRef sample : ContractTestSupport.manifestSamples()) {
            declared.add(sample.file());
            assertThat(ContractTestSupport.examplesDir().resolve(sample.file()))
                    .as("File mẫu %s", sample)
                    .exists();
        }

        try (Stream<Path> files = Files.list(ContractTestSupport.examplesDir())) {
            List<String> orphans = files.map(p -> p.getFileName().toString())
                    .filter(name -> name.endsWith(".json"))
                    .filter(name -> !name.equals("fixture-manifest.json"))
                    .filter(name -> !declared.contains(name))
                    .toList();
            assertThat(orphans).as("File mẫu chưa đăng ký trong fixture-manifest.json").isEmpty();
        }
    }

    @Test
    @DisplayName("Mỗi fixture trỏ tới operation có thật trong OpenAPI với đúng method/path/schema")
    @SuppressWarnings("unchecked")
    void manifestOperationsExistInOpenApi() throws Exception {
        Map<String, Object> paths = (Map<String, Object>) ContractTestSupport.openApi().get("paths");
        for (JsonNode fixture : ContractTestSupport.manifest().get("fixtures")) {
            if (!fixture.hasNonNull("operationId")) {
                continue;
            }
            String id = fixture.get("id").asText();
            String path = fixture.get("path").asText();
            String method = fixture.get("method").asText().toLowerCase();

            Map<String, Object> pathItem = (Map<String, Object>) paths.get(path);
            assertThat(pathItem).as("%s: path %s không có trong OpenAPI", id, path).isNotNull();
            Map<String, Object> operation = (Map<String, Object>) pathItem.get(method);
            assertThat(operation).as("%s: %s %s không có trong OpenAPI", id, method, path).isNotNull();
            assertThat(operation.get("operationId"))
                    .as("%s: operationId", id)
                    .isEqualTo(fixture.get("operationId").asText());

            String status = fixture.get("httpStatus").asText();
            Map<String, Object> responses = (Map<String, Object>) operation.get("responses");
            assertThat(responses).as("%s: response %s chưa khai báo", id, status).containsKey(status);
            assertThat(referencedSchema(responses.get(status)))
                    .as("%s: schema của response %s", id, status)
                    .isEqualTo(fixture.get("responseSchema").asText());
        }
    }

    @SuppressWarnings("unchecked")
    private static String referencedSchema(Object response) throws IOException {
        Map<String, Object> responseMap = (Map<String, Object>) response;
        if (responseMap.containsKey("$ref")) {
            String ref = (String) responseMap.get("$ref");
            Map<String, Object> components = (Map<String, Object>) ContractTestSupport.openApi().get("components");
            Map<String, Object> shared = (Map<String, Object>) components.get("responses");
            responseMap = (Map<String, Object>) shared.get(ref.substring(ref.lastIndexOf('/') + 1));
        }
        Map<String, Object> content = (Map<String, Object>) responseMap.get("content");
        Map<String, Object> json = (Map<String, Object>) content.get("application/json");
        Map<String, Object> schema = (Map<String, Object>) json.get("schema");
        String ref = (String) schema.get("$ref");
        return ref.substring(ref.lastIndexOf('/') + 1);
    }

    /**
     * So sánh JSON gốc với JSON ghi lại từ DTO: mọi trường gốc phải giữ nguyên giá trị;
     * trường chỉ xuất hiện ở bản ghi lại phải là null (DTO có nhưng fixture bỏ trống).
     */
    private static void compare(JsonNode original, JsonNode written, String path, List<String> problems) {
        if (original.isObject()) {
            if (!written.isObject()) {
                problems.add(path + ": DTO ghi ra không phải object");
                return;
            }
            Iterator<Map.Entry<String, JsonNode>> fields = original.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> field = fields.next();
                JsonNode counterpart = written.get(field.getKey());
                if (counterpart == null) {
                    problems.add(path + "." + field.getKey() + ": DTO không ghi lại trường này");
                } else {
                    compare(field.getValue(), counterpart, path + "." + field.getKey(), problems);
                }
            }
            Iterator<Map.Entry<String, JsonNode>> extra = written.fields();
            while (extra.hasNext()) {
                Map.Entry<String, JsonNode> field = extra.next();
                if (!original.has(field.getKey()) && !field.getValue().isNull()) {
                    problems.add(path + "." + field.getKey()
                            + ": DTO sinh thêm trường có giá trị (tên thứ hai cho cùng dữ liệu?)");
                }
            }
            return;
        }
        if (original.isArray()) {
            if (!written.isArray() || written.size() != original.size()) {
                problems.add(path + ": số phần tử array lệch");
                return;
            }
            for (int i = 0; i < original.size(); i++) {
                compare(original.get(i), written.get(i), path + "[" + i + "]", problems);
            }
            return;
        }
        if (original.isNumber() && written.isNumber()) {
            if (original.decimalValue().compareTo(written.decimalValue()) != 0) {
                problems.add(path + ": số " + original + " thành " + written);
            }
            return;
        }
        if (!original.equals(written)) {
            problems.add(path + ": " + original + " thành " + written);
        }
    }
}
