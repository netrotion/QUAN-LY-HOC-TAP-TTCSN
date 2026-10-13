package vn.haui.advisor.platform.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import vn.haui.advisor.academic.service.DefaultAcademicFacade;
import vn.haui.advisor.contracts.ports.AcademicFacade;
import vn.haui.advisor.platform.transcript.importing.DisabledOcrEngine;
import vn.haui.advisor.platform.transcript.importing.OcrEngine;
import vn.haui.advisor.platform.transcript.importing.TesseractCliOcrEngine;

/**
 * Composition root của platform: nối implementation của các module thư viện vào port contracts.
 * AcademicFacade = engine học vụ của TV4, nguồn sự thật duy nhất cho luật học vụ (CD-02).
 */
@Configuration
@EnableConfigurationProperties({ImportProperties.class, SeedProperties.class})
public class PlatformModulesConfig {

    @Bean
    public AcademicFacade academicFacade() {
        return new DefaultAcademicFacade();
    }

    /** OCR cho ảnh/PDF scan: tắt mặc định (chuyển nhập tay); bật bằng haui.import.ocr.engine=tesseract. */
    @Bean
    public OcrEngine ocrEngine(ImportProperties properties) {
        ImportProperties.Ocr ocr = properties.getOcr();
        if ("tesseract".equalsIgnoreCase(ocr.getEngine())) {
            return new TesseractCliOcrEngine(ocr.getCommand(), ocr.getLanguages(), ocr.getTimeout());
        }
        return new DisabledOcrEngine();
    }
}
