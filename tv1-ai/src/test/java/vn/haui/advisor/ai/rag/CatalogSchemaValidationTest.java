package vn.haui.advisor.ai.rag;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.InputStream;

import static org.assertj.core.api.Assertions.assertThat;

public class CatalogSchemaValidationTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Test
    @DisplayName("Verify source-catalog.schema.json exists and conforms to Draft-07 format")
    void testSchemaFileExistsAndValid() throws Exception {
        InputStream stream = getClass().getResourceAsStream("/rag/source-catalog.schema.json");
        assertThat(stream)
                .withFailMessage("Resource /rag/source-catalog.schema.json must exist")
                .isNotNull();

        JsonNode schema = MAPPER.readTree(stream);
        assertThat(schema.path("$schema").asText()).contains("draft-07");
        assertThat(schema.path("required").isArray()).isTrue();
        assertThat(schema.path("properties").has("sources")).isTrue();
        assertThat(schema.path("properties").has("catalog_version")).isTrue();
    }
}
