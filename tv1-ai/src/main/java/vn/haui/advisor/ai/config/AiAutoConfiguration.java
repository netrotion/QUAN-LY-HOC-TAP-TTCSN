package vn.haui.advisor.ai.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import vn.haui.advisor.ai.mock.MockAcademicFacade;
import vn.haui.advisor.ai.model.AdvisorModel;
import vn.haui.advisor.ai.model.LiveAdvisorModel;
import vn.haui.advisor.ai.model.MockAdvisorModel;
import vn.haui.advisor.ai.service.DefaultAdvisorFacade;
import vn.haui.advisor.ai.tools.DefaultToolAdapter;
import vn.haui.advisor.ai.tools.ToolAdapter;
import vn.haui.advisor.contracts.ports.AcademicFacade;
import vn.haui.advisor.contracts.ports.AdvisorFacade;

/**
 * Spring Auto-configuration cho module AI (tv1-ai).
 * Quản lý vòng đời và điều kiện kích hoạt giữa MOCK mode và LIVE mode.
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(AiProperties.class)
public class AiAutoConfiguration {

    // ==========================================
    // 1. MOCK MODE BEANS (ai.mode=mock hoặc mặc định)
    // ==========================================

    @Bean
    @ConditionalOnProperty(prefix = "ai", name = "mode", havingValue = "mock", matchIfMissing = true)
    @ConditionalOnMissingBean(AdvisorModel.class)
    public AdvisorModel mockAdvisorModel() {
        return new MockAdvisorModel();
    }

    @Bean
    @ConditionalOnProperty(prefix = "ai", name = "mode", havingValue = "mock", matchIfMissing = true)
    @ConditionalOnMissingBean(AcademicFacade.class)
    public AcademicFacade mockAcademicFacade() {
        return new MockAcademicFacade();
    }

    // ==========================================
    // 2. LIVE MODE BEANS (ai.mode=live)
    // Tuyệt đối không fallback sang mock; không tạo MockAdvisorModel hay MockAcademicFacade
    // ==========================================

    @Bean
    @ConditionalOnProperty(prefix = "ai", name = "mode", havingValue = "live")
    @ConditionalOnMissingBean(AdvisorModel.class)
    public AdvisorModel liveAdvisorModel() {
        return new LiveAdvisorModel();
    }

    // ==========================================
    // 3. CORE ADVISOR BEANS
    // ==========================================

    @Bean
    @ConditionalOnMissingBean(ToolAdapter.class)
    public ToolAdapter toolAdapter(AcademicFacade academicFacade) {
        return new DefaultToolAdapter(academicFacade);
    }

    @Bean
    @ConditionalOnMissingBean(AdvisorFacade.class)
    public AdvisorFacade advisorFacade(AdvisorModel advisorModel, ToolAdapter toolAdapter) {
        return new DefaultAdvisorFacade(advisorModel, toolAdapter);
    }
}
