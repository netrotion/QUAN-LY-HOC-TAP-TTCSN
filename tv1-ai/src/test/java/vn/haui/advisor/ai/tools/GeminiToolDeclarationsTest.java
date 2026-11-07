package vn.haui.advisor.ai.tools;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

import static org.assertj.core.api.Assertions.assertThat;

class GeminiToolDeclarationsTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void shouldDeclareAllSevenToolsForGeminiApi() {
        List<Map<String, Object>> tools = GeminiToolDeclarations.getToolDeclarations();
        assertThat(tools).isNotNull().hasSize(1);

        JsonNode root = objectMapper.valueToTree(tools.get(0));
        assertThat(root.has("functionDeclarations")).isTrue();

        JsonNode declarations = root.get("functionDeclarations");
        assertThat(declarations.isArray()).isTrue();
        assertThat(declarations).hasSize(7);

        Set<String> names = StreamSupport.stream(declarations.spliterator(), false)
                .map(node -> node.get("name").asText())
                .collect(Collectors.toSet());

        assertThat(names).containsExactlyInAnyOrder(
                "run_graduation_audit",
                "get_academic_status",
                "check_course_eligibility",
                "rank_retake_courses",
                "simulate_grades",
                "generate_study_plan",
                "search_regulations"
        );
    }

    @Test
    void shouldDefineCorrectRequiredParameters() {
        List<Map<String, Object>> tools = GeminiToolDeclarations.getToolDeclarations();
        JsonNode root = objectMapper.valueToTree(tools.get(0));
        JsonNode declarations = root.get("functionDeclarations");

        JsonNode searchReg = StreamSupport.stream(declarations.spliterator(), false)
                .filter(node -> "search_regulations".equals(node.get("name").asText()))
                .findFirst().orElseThrow();
        assertThat(searchReg.get("description").asText()).contains("quy chế");
        assertThat(searchReg.get("parameters").get("required").get(0).asText()).isEqualTo("query");

        JsonNode checkEligibility = StreamSupport.stream(declarations.spliterator(), false)
                .filter(node -> "check_course_eligibility".equals(node.get("name").asText()))
                .findFirst().orElseThrow();
        assertThat(checkEligibility.get("parameters").get("required").get(0).asText()).isEqualTo("course_code");

        JsonNode simulateGrades = StreamSupport.stream(declarations.spliterator(), false)
                .filter(node -> "simulate_grades".equals(node.get("name").asText()))
                .findFirst().orElseThrow();
        assertThat(simulateGrades.get("parameters").get("required").get(0).asText()).isEqualTo("simulations");
    }
}
