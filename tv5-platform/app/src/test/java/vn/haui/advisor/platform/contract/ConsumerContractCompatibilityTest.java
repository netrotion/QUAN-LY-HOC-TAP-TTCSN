package vn.haui.advisor.platform.contract;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.academic.service.DefaultAcademicFacade;
import vn.haui.advisor.ai.model.MockAdvisorModel;
import vn.haui.advisor.ai.service.DefaultAdvisorFacade;
import vn.haui.advisor.ai.tools.DefaultToolAdapter;
import vn.haui.advisor.contracts.ContractTestSupport;
import vn.haui.advisor.contracts.OpenApiSchemaValidator;
import vn.haui.advisor.contracts.dto.ChatRequest;
import vn.haui.advisor.contracts.dto.ChatResponse;
import vn.haui.advisor.contracts.fake.FixedStudentContextProvider;
import vn.haui.advisor.contracts.fake.FixtureAcademicFacade;
import vn.haui.advisor.contracts.ports.AcademicFacade;
import vn.haui.advisor.contracts.ports.AdvisorFacade;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Kiểm tra phía sử dụng contracts-v1: chạy implementation thật của TV4 (AcademicFacade) với input fixtures
 * và TV1 (AdvisorFacade) với fake provider của contracts, rồi kiểm output theo schema OpenAPI V1.
 * Mọi thay đổi contract sau mốc contracts-v1 phải giữ test này xanh trong PR của TV5.
 */
@DisplayName("contracts-v1: kiểm tra phía sử dụng (TV4 academic, TV1 advisor)")
class ConsumerContractCompatibilityTest {

    private final ObjectMapper mapper = ContractTestSupport.mapper();

    @Test
    @DisplayName("TV4 DefaultAcademicFacade nhận mọi input fixture và trả output đúng schema")
    void academicFacadeOutputsMatchSchemas() throws Exception {
        AcademicFacade facade = new DefaultAcademicFacade();
        OpenApiSchemaValidator validator = new OpenApiSchemaValidator(ContractTestSupport.openApiSchemas());
        List<String> problems = new ArrayList<>();
        int checked = 0;

        for (JsonNode fixture : ContractTestSupport.manifest().get("fixtures")) {
            String facadeMethod = fixture.path("facadeMethod").asText("");
            if (!facadeMethod.startsWith("AcademicFacade#")) {
                continue;
            }
            String methodName = facadeMethod.substring("AcademicFacade#".length());
            Class<?> requestType = ContractTestSupport.dtoClass(fixture.get("requestSchema").asText());
            Object request = mapper.treeToValue(ContractTestSupport.readExample(fixture.get("requestSample").asText()), requestType);

            Method method = AcademicFacade.class.getMethod(methodName, requestType);
            Object response = method.invoke(facade, request);
            JsonNode json = mapper.valueToTree(response);
            List<String> errors = validator.validate(json, fixture.get("responseSchema").asText());
            if (!errors.isEmpty()) {
                problems.add(fixture.get("id").asText() + " → " + errors);
            }
            checked++;
        }

        assertThat(checked).as("Số capability AcademicFacade có fixture").isGreaterThanOrEqualTo(9);
        assertThat(problems).isEmpty();
    }

    @Test
    @DisplayName("TV1 DefaultAdvisorFacade chạy trên FixtureAcademicFacade và trả ChatResponse đúng schema")
    void advisorFacadeWithFakeProviderMatchesSchema() throws Exception {
        AdvisorFacade advisor = new DefaultAdvisorFacade(new MockAdvisorModel(),
                new DefaultToolAdapter(new FixtureAcademicFacade()));
        OpenApiSchemaValidator validator = new OpenApiSchemaValidator(ContractTestSupport.openApiSchemas());
        FixedStudentContextProvider contextProvider = new FixedStudentContextProvider();

        for (String question : List.of(
                "Kỳ tới em nên học những môn nào để vẫn tốt nghiệp đúng hạn? Lập lộ trình giúp em",
                "Tình trạng học tập và điểm CPA của em thế nào?",
                "Điều kiện cảnh báo học vụ mức 1 là gì?")) {
            ChatRequest request = mapper.treeToValue(ContractTestSupport.readExample("chat-request.sample.json"), ChatRequest.class);
            request.setMessage(question);
            ChatResponse response = advisor.chat(request, contextProvider.getAuthenticatedContext());

            assertThat(validator.validate(mapper.valueToTree(response), "ChatResponse"))
                    .as("ChatResponse cho câu hỏi: %s", question)
                    .isEmpty();
        }
    }
}
