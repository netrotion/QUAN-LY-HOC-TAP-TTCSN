package vn.haui.advisor.platform.academic;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.core.io.ResourceLoader;
import vn.haui.advisor.academic.model.CurriculumFixture;
import vn.haui.advisor.academic.model.PolicyDemo;
import vn.haui.advisor.platform.config.SeedProperties;

import java.io.IOException;
import java.io.InputStream;

/**
 * Quy chế và CTĐT nạp vào engine học vụ TV4, đọc từ đúng file fixture dùng để seed DB (haui.seed.*): CTĐT engine dùng
 * trùng CTĐT trong DB và policyVersion trả cho client là quy chế engine thực sự áp dụng. Thiếu file hoặc thiếu
 * policyId/version thì ứng dụng không khởi động, không chạy với quy chế "không rõ".
 */
public record AcademicEngineSources(PolicyDemo policy, CurriculumFixture curriculum) {

    // Cùng cấu hình ObjectMapper với AcademicFixtureLoader của TV4 để model đọc giống hệt
    private static final ObjectMapper MAPPER = new ObjectMapper().registerModule(new JavaTimeModule());

    public AcademicEngineSources {
        if (isBlank(policy.getPolicyId()) || isBlank(policy.getVersion())) {
            throw new IllegalStateException("Fixture quy chế thiếu policyId/version: không xác định được policyVersion");
        }
        if (isBlank(curriculum.getCurriculumId()) || curriculum.getCourses() == null || curriculum.getCourses().isEmpty()) {
            throw new IllegalStateException("Fixture CTĐT thiếu curriculumId hoặc học phần");
        }
    }

    public static AcademicEngineSources load(SeedProperties properties, ResourceLoader resourceLoader) {
        return new AcademicEngineSources(
                read(properties.getPolicyResource(), resourceLoader, PolicyDemo.class),
                read(properties.getCurriculumResource(), resourceLoader, CurriculumFixture.class));
    }

    /** policyId@version, ghi kèm mọi kết quả học vụ và mỗi lần thẩm định kế hoạch. */
    public String policyVersion() {
        return policy.getPolicyId() + "@" + policy.getVersion();
    }

    public String curriculumId() {
        return curriculum.getCurriculumId();
    }

    private static <T> T read(String location, ResourceLoader resourceLoader, Class<T> type) {
        try (InputStream in = resourceLoader.getResource(location).getInputStream()) {
            return MAPPER.readValue(in, type);
        } catch (IOException ex) {
            throw new IllegalStateException("Không đọc được fixture học vụ " + location, ex);
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
