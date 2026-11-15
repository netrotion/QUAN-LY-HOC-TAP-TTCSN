package vn.haui.advisor.ai.eval;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.intent.IntentClassifier;
import vn.haui.advisor.ai.intent.ParsedUserIntent;
import vn.haui.advisor.ai.service.ConversationTurnPlanner;
import vn.haui.advisor.contracts.dto.AcademicCapability;
import vn.haui.advisor.contracts.dto.TrustedStudentContext;

import java.io.InputStream;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

class AcademicGoldenEvalTest {

    public static class GoldenScenario {
        public String id;
        public String name;
        public String query;
        public String expectedIntent;
        public List<String> requiredTools;
        public List<String> expectedKeywords;
        public boolean mustNotHallucinate;
    }

    private ObjectMapper objectMapper;
    private IntentClassifier intentClassifier;
    private ConversationTurnPlanner turnPlanner;
    private TrustedStudentContext context;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        intentClassifier = new IntentClassifier();
        turnPlanner = new ConversationTurnPlanner(intentClassifier);
        context = new TrustedStudentContext("SV2021600001", "2021600001", "Trần Thị Mai", "KTPM", "K16", "rev-v1");
    }

    @Test
    @DisplayName("Run 10 Golden Academic Evaluation Scenarios and assert >=90% intent accuracy and 100% tool coverage")
    void testEvaluateGoldenAcademicScenarios() throws Exception {
        InputStream stream = getClass().getClassLoader().getResourceAsStream("eval/golden-academic-scenarios.json");
        assertThat(stream).as("golden-academic-scenarios.json must exist in test classpath").isNotNull();

        List<GoldenScenario> scenarios = objectMapper.readValue(stream, new TypeReference<List<GoldenScenario>>() {});
        assertThat(scenarios).hasSizeGreaterThanOrEqualTo(10);

        int correctIntentCount = 0;
        int toolCoverageCount = 0;
        Set<AcademicCapability> allReady = EnumSet.allOf(AcademicCapability.class);

        System.out.println("=== BẮT ĐẦU ĐÁNH GIÁ OFFLINE GOLDEN ACADEMIC SCENARIOS ===");

        for (GoldenScenario scenario : scenarios) {
            ParsedUserIntent intent = intentClassifier.classify(scenario.query);
            ConversationTurnPlanner.TurnDecision decision = turnPlanner.decide(
                    scenario.query,
                    List.of()
            );

            boolean intentMatch = scenario.expectedIntent.equalsIgnoreCase(intent.getCategory().name());
            if (intentMatch) {
                correctIntentCount++;
            }

            List<AcademicCapability> plannedTools = decision.capabilities() != null ? decision.capabilities() : List.of();
            boolean toolsSatisfied = true;
            if (scenario.requiredTools != null) {
                for (String req : scenario.requiredTools) {
                    AcademicCapability cap = AcademicCapability.valueOf(req);
                    if (!plannedTools.contains(cap)) {
                        toolsSatisfied = false;
                        break;
                    }
                }
            }
            if (toolsSatisfied) {
                toolCoverageCount++;
            }

            System.out.printf("[%s] %-40s -> Intent: %-20s (Match: %s) | Tools: %s (Covered: %s)%n",
                    scenario.id, scenario.name,
                    intent.getCategory(), intentMatch,
                    plannedTools, toolsSatisfied
            );
        }

        double intentAccuracy = (double) correctIntentCount / scenarios.size() * 100.0;
        double toolAccuracy = (double) toolCoverageCount / scenarios.size() * 100.0;

        System.out.printf("=== KẾT QUẢ ĐÁNH GIÁ: Intent Accuracy = %.1f%% | Tool Coverage = %.1f%% ===%n",
                intentAccuracy, toolAccuracy);

        assertThat(intentAccuracy).as("Intent classification accuracy must be >= 90%").isGreaterThanOrEqualTo(90.0);
        assertThat(toolAccuracy).as("Tool coverage accuracy must be 100%").isEqualTo(100.0);
    }
}
