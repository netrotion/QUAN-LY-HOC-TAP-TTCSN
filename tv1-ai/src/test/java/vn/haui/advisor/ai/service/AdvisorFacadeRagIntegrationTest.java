package vn.haui.advisor.ai.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import vn.haui.advisor.ai.config.AiAutoConfiguration;
import vn.haui.advisor.ai.rag.service.RagAdvisorService;
import vn.haui.advisor.contracts.dto.ChatRequest;
import vn.haui.advisor.contracts.dto.ChatResponse;
import vn.haui.advisor.contracts.dto.ChatSourceItem;
import vn.haui.advisor.contracts.dto.TrustedStudentContext;
import vn.haui.advisor.contracts.ports.AdvisorFacade;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AdvisorFacadeRagIntegrationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(AiAutoConfiguration.class));

    private TrustedStudentContext trustedContext;

    @BeforeEach
    void setUp() {
        trustedContext = new TrustedStudentContext(
                "STU-2021600123",
                "2021600123",
                "Nguyễn Văn A",
                "IT_K16",
                "K16",
                "REV-2024-V1"
        );
    }

    @Test
    @DisplayName("RAG Integration: AutoConfiguration registers all RAG beans successfully")
    void testRagBeansRegisteredInContext() {
        contextRunner.run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context).hasSingleBean(RagAdvisorService.class);
            assertThat(context).hasSingleBean(AdvisorFacade.class);
        });
    }

    @Test
    @DisplayName("RAG Grounding: Credit limits question retrieves and cites REG-HAUI-01")
    void testCreditLimitsRetrievesReg01() {
        contextRunner.run(context -> {
            AdvisorFacade facade = context.getBean(AdvisorFacade.class);
            ChatRequest request = new ChatRequest("CONV-01", "Học kỳ chính được đăng ký tối đa bao nhiêu tín chỉ?", "2026-10-13T10:00:00Z");
            ChatResponse response = facade.chat(request, trustedContext);

            assertThat(response).isNotNull();
            assertThat(response.getSources()).isNotEmpty();

            ChatSourceItem source = response.getSources().getFirst();
            assertThat(source.getSourceId()).isEqualTo("REG-HAUI-01");
            assertThat(source.getVersion()).isEqualTo("gitblob:cab439dd3364");
            assertThat(source.getReferenceUrl()).contains("sv.haui.edu.vn");
            assertThat(response.getAnswer()).contains("REG-HAUI-01");
        });
    }

    @Test
    @DisplayName("RAG Grounding: GPA and CPA question retrieves and cites REG-HAUI-02")
    void testGpaCpaRetrievesReg02() {
        contextRunner.run(context -> {
            AdvisorFacade facade = context.getBean(AdvisorFacade.class);
            ChatRequest request = new ChatRequest("CONV-02", "GPA và CPA khác nhau thế nào?", "2026-10-13T10:00:00Z");
            ChatResponse response = facade.chat(request, trustedContext);

            assertThat(response).isNotNull();
            assertThat(response.getSources()).isNotEmpty();

            ChatSourceItem source = response.getSources().getFirst();
            assertThat(source.getSourceId()).isEqualTo("REG-HAUI-02");
            assertThat(source.getVersion()).isEqualTo("gitblob:0a22d0023279");
        });
    }

    @Test
    @DisplayName("RAG Grounding: Retake and improvement question retrieves and cites REG-HAUI-03")
    void testRetakeImprovementRetrievesReg03() {
        contextRunner.run(context -> {
            AdvisorFacade facade = context.getBean(AdvisorFacade.class);
            ChatRequest request = new ChatRequest("CONV-03", "Điểm B có được học cải thiện không?", "2026-10-13T10:00:00Z");
            ChatResponse response = facade.chat(request, trustedContext);

            assertThat(response).isNotNull();
            assertThat(response.getSources()).isNotEmpty();

            ChatSourceItem source = response.getSources().getFirst();
            assertThat(source.getSourceId()).isEqualTo("REG-HAUI-03");
            assertThat(source.getVersion()).isEqualTo("gitblob:b7e379af2bf7");
        });
    }

    @Test
    @DisplayName("RAG Grounding: Academic warning question retrieves and cites REG-HAUI-04")
    void testAcademicWarningRetrievesReg04() {
        contextRunner.run(context -> {
            AdvisorFacade facade = context.getBean(AdvisorFacade.class);
            ChatRequest request = new ChatRequest("CONV-04", "Ngưỡng cảnh báo học vụ năm thứ hai?", "2026-10-13T10:00:00Z");
            ChatResponse response = facade.chat(request, trustedContext);

            assertThat(response).isNotNull();
            assertThat(response.getSources()).isNotEmpty();

            ChatSourceItem source = response.getSources().getFirst();
            assertThat(source.getSourceId()).isEqualTo("REG-HAUI-04");
            assertThat(source.getVersion()).isEqualTo("gitblob:f5f1503d4179");
        });
    }

    @Test
    @DisplayName("RAG Grounding: Graduation requirements question retrieves and cites REG-HAUI-05")
    void testGraduationRetrievesReg05() {
        contextRunner.run(context -> {
            AdvisorFacade facade = context.getBean(AdvisorFacade.class);
            ChatRequest request = new ChatRequest("CONV-05", "Điều kiện tốt nghiệp là gì?", "2026-10-13T10:00:00Z");
            ChatResponse response = facade.chat(request, trustedContext);

            assertThat(response).isNotNull();
            assertThat(response.getSources()).isNotEmpty();

            ChatSourceItem source = response.getSources().getFirst();
            assertThat(source.getSourceId()).isEqualTo("REG-HAUI-05");
            assertThat(source.getVersion()).isEqualTo("gitblob:f45ea177a03d");
        });
    }

    @Test
    @DisplayName("RAG Grounding: Out-of-scope query returns empty citations and no hallucinated sources")
    void testOutOfScopeQueryReturnsEmptySources() {
        contextRunner.run(context -> {
            AdvisorFacade facade = context.getBean(AdvisorFacade.class);
            ChatRequest request = new ChatRequest("CONV-06", "Thời tiết Hà Nội hôm nay có mưa không?", "2026-10-13T10:00:00Z");
            ChatResponse response = facade.chat(request, trustedContext);

            assertThat(response).isNotNull();
            assertThat(response.getSources()).isEmpty();
            assertThat(response.getSources()).noneMatch(s -> s.getSourceId().contains("MOCK"));
        });
    }

    @Test
    @DisplayName("Invariant: No citations ever contain legacy mock or fixture IDs")
    void testNoMockSourceIdsInResponses() {
        contextRunner.run(context -> {
            AdvisorFacade facade = context.getBean(AdvisorFacade.class);
            List<String> questions = List.of(
                    "Đăng ký tín chỉ",
                    "Tính điểm CPA",
                    "Học lại môn F",
                    "Cảnh báo học vụ",
                    "Chuẩn đầu ra tốt nghiệp"
            );

            for (String q : questions) {
                ChatRequest request = new ChatRequest("CONV-INV", q, "2026-10-13T10:00:00Z");
                ChatResponse response = facade.chat(request, trustedContext);
                for (ChatSourceItem item : response.getSources()) {
                    assertThat(item.getSourceId()).startsWith("REG-HAUI-");
                    assertThat(item.getSourceId()).doesNotContain("MOCK");
                    assertThat(item.getSourceId()).doesNotContain("FIXTURE");
                }
            }
        });
    }
}
