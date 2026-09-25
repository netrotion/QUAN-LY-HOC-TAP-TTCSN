package vn.haui.advisor.ai.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import vn.haui.advisor.ai.mock.MockAcademicFacade;
import vn.haui.advisor.ai.model.AdvisorModel;
import vn.haui.advisor.ai.model.LiveAdvisorModel;
import vn.haui.advisor.ai.model.MockAdvisorModel;
import vn.haui.advisor.ai.tools.ToolAdapter;
import vn.haui.advisor.contracts.ports.AcademicFacade;
import vn.haui.advisor.contracts.ports.AdvisorFacade;

import static org.assertj.core.api.Assertions.assertThat;

class AiModeConfigurationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(AiAutoConfiguration.class));

    @Test
    @DisplayName("Mock mode: default or explicit ai.mode=mock registers MockAdvisorModel and MockAcademicFacade")
    void testMockModeBeansRegistered() {
        contextRunner
                .withPropertyValues("ai.mode=mock")
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).hasSingleBean(AdvisorModel.class);
                    assertThat(context).getBean(AdvisorModel.class).isInstanceOf(MockAdvisorModel.class);
                    assertThat(context).hasSingleBean(AcademicFacade.class);
                    assertThat(context).getBean(AcademicFacade.class).isInstanceOf(MockAcademicFacade.class);
                    assertThat(context).hasSingleBean(ToolAdapter.class);
                    assertThat(context).hasSingleBean(AdvisorFacade.class);
                    assertThat(context).doesNotHaveBean(LiveAdvisorModel.class);
                });
    }

    @Test
    @DisplayName("Mock mode: default without property should also default to mock mode safely")
    void testDefaultModeIsMock() {
        contextRunner.run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context).hasSingleBean(AdvisorModel.class);
            assertThat(context).getBean(AdvisorModel.class).isInstanceOf(MockAdvisorModel.class);
            assertThat(context).hasSingleBean(AcademicFacade.class);
            assertThat(context).getBean(AcademicFacade.class).isInstanceOf(MockAcademicFacade.class);
        });
    }

    @Test
    @DisplayName("Live mode: Without real AcademicFacade, fails explicitly and does not fall back to mock")
    void testLiveModeFailsWithoutRealAcademicFacade() {
        contextRunner
                .withPropertyValues("ai.mode=live")
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure().getMessage())
                            .contains("No qualifying bean of type 'vn.haui.advisor.contracts.ports.AcademicFacade' available");
                });
    }

    @Test
    @DisplayName("Live mode: When AcademicFacade is supplied, MockAdvisorModel and MockAcademicFacade are NOT registered")
    void testLiveModeWithAcademicFacadeHasNoMocks() {
        contextRunner
                .withPropertyValues("ai.mode=live")
                .withBean(AcademicFacade.class, () -> org.mockito.Mockito.mock(AcademicFacade.class))
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).doesNotHaveBean(MockAdvisorModel.class);
                    assertThat(context).doesNotHaveBean(MockAcademicFacade.class);
                    assertThat(context).hasSingleBean(AdvisorModel.class);
                    assertThat(context.getBean(AdvisorModel.class)).isInstanceOf(LiveAdvisorModel.class);
                });
    }

    @Test
    @DisplayName("Invalid ai.mode: configuration must fail clearly, no silent fallback")
    void testInvalidAiModeFails() {
        contextRunner
                .withPropertyValues("ai.mode=invalid_mode")
                .run(context -> {
                    assertThat(context).hasFailed();
                });
    }
}
