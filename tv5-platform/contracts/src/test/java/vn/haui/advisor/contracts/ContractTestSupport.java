package vn.haui.advisor.contracts;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;

import java.io.IOException;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Tiện ích dùng chung cho bộ contract test V1: định vị thư mục contracts,
 * đọc OpenAPI, manifest fixtures, glossary và ánh xạ tên schema sang lớp DTO.
 */
public final class ContractTestSupport {

    public static final String DTO_PACKAGE = "vn.haui.advisor.contracts.dto.";

    private ContractTestSupport() {
    }

    /** Thư mục tv5-platform/contracts, tìm ngược từ thư mục chạy test (module contracts, app hoặc root). */
    public static Path contractsDir() {
        for (Path dir = Paths.get("").toAbsolutePath(); dir != null; dir = dir.getParent()) {
            if (dir.endsWith(Paths.get("tv5-platform", "contracts"))) {
                return dir;
            }
            Path candidate = dir.resolve("tv5-platform/contracts");
            if (Files.isDirectory(candidate.resolve("openapi"))) {
                return candidate;
            }
        }
        throw new IllegalStateException("Không tìm thấy tv5-platform/contracts từ " + Paths.get("").toAbsolutePath());
    }

    public static Path examplesDir() {
        return contractsDir().resolve("examples");
    }

    public static ObjectMapper mapper() {
        return ContractsJson.mapper();
    }

    @SuppressWarnings("unchecked")
    public static Map<String, Object> openApi() throws IOException {
        LoaderOptions options = new LoaderOptions();
        options.setCodePointLimit(10 * 1024 * 1024);
        try (Reader reader = Files.newBufferedReader(
                contractsDir().resolve("openapi/openapi-v1.yaml"), StandardCharsets.UTF_8)) {
            return (Map<String, Object>) new Yaml(options).load(reader);
        }
    }

    @SuppressWarnings("unchecked")
    public static Map<String, Map<String, Object>> openApiSchemas() throws IOException {
        Map<String, Object> components = (Map<String, Object>) openApi().get("components");
        return (Map<String, Map<String, Object>>) components.get("schemas");
    }

    public static JsonNode manifest() throws IOException {
        return mapper().readTree(examplesDir().resolve("fixture-manifest.json").toFile());
    }

    public static JsonNode glossary() throws IOException {
        return mapper().readTree(contractsDir().resolve("glossary-v1.json").toFile());
    }

    public static JsonNode readExample(String fileName) throws IOException {
        return mapper().readTree(examplesDir().resolve(fileName).toFile());
    }

    public static Class<?> dtoClass(String schemaName) {
        try {
            return Class.forName(DTO_PACKAGE + schemaName);
        } catch (ClassNotFoundException e) {
            return null;
        }
    }

    /** Một mẫu JSON trong manifest kèm tên schema/DTO mà nó phải khớp. */
    public record SampleRef(String fixtureId, String file, String schema) {
        @Override
        public String toString() {
            return fixtureId + " -> " + file + " (" + schema + ")";
        }
    }

    public static List<SampleRef> manifestSamples() throws IOException {
        List<SampleRef> samples = new ArrayList<>();
        for (JsonNode fixture : manifest().get("fixtures")) {
            String id = fixture.get("id").asText();
            if (fixture.hasNonNull("requestSample")) {
                samples.add(new SampleRef(id, fixture.get("requestSample").asText(),
                        fixture.get("requestSchema").asText()));
            }
            if (fixture.hasNonNull("responseSample")) {
                samples.add(new SampleRef(id, fixture.get("responseSample").asText(),
                        fixture.get("responseSchema").asText()));
            }
        }
        return samples;
    }
}
