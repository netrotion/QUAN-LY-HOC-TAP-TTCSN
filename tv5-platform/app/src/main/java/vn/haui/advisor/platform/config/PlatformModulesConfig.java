package vn.haui.advisor.platform.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import vn.haui.advisor.academic.service.DefaultAcademicFacade;
import vn.haui.advisor.contracts.ports.AcademicFacade;

/**
 * Composition root của platform: nối implementation của các module thư viện vào port contracts.
 * AcademicFacade = engine học vụ của TV4, nguồn sự thật duy nhất cho luật học vụ (CD-02).
 */
@Configuration
public class PlatformModulesConfig {

    @Bean
    public AcademicFacade academicFacade() {
        return new DefaultAcademicFacade();
    }
}
