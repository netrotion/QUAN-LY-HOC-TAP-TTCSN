package vn.haui.advisor.platform.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ResourceLoader;
import vn.haui.advisor.academic.service.DefaultAcademicFacade;
import vn.haui.advisor.contracts.ports.AcademicFacade;
import vn.haui.advisor.platform.academic.AcademicEngineSources;
import vn.haui.advisor.platform.transcript.DbStudentAcademicRecordProvider;
import vn.haui.advisor.platform.transcript.importing.DisabledOcrEngine;
import vn.haui.advisor.platform.transcript.importing.OcrEngine;
import vn.haui.advisor.platform.transcript.importing.TesseractCliOcrEngine;

import java.util.Map;

/**
 * Composition root của platform: nối implementation của các module thư viện vào port contracts.
 * AcademicFacade = engine học vụ của TV4, nguồn sự thật duy nhất cho luật học vụ (CD-02).
 */
@Configuration
@EnableConfigurationProperties({ImportProperties.class, SeedProperties.class, PlannerProperties.class})
public class PlatformModulesConfig {

    @Bean
    public AcademicEngineSources academicEngineSources(SeedProperties properties, ResourceLoader resourceLoader) {
        return AcademicEngineSources.load(properties, resourceLoader);
    }

    /**
     * Engine TV4 đọc hồ sơ học vụ từ DB (bảng điểm đã xác nhận, chứng chỉ) và dùng quy chế/CTĐT cùng nguồn seed.
     * Không nạp hồ sơ sinh viên mẫu của TV4 (Map rỗng): tài khoản thật trùng mã với hồ sơ mẫu vẫn chỉ được tính từ DB.
     */
    @Bean
    public AcademicFacade academicFacade(DbStudentAcademicRecordProvider records, AcademicEngineSources sources) {
        return new DefaultAcademicFacade(records, sources.policy(), sources.curriculum(), Map.of());
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
