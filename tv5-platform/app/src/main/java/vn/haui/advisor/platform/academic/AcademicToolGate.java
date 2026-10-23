package vn.haui.advisor.platform.academic;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import vn.haui.advisor.contracts.dto.AcademicCapability;
import vn.haui.advisor.contracts.dto.AcademicToolReadinessItem;
import vn.haui.advisor.contracts.dto.AcademicToolStatus;
import vn.haui.advisor.contracts.dto.ValidationMode;
import vn.haui.advisor.contracts.ports.AcademicFacade;
import vn.haui.advisor.platform.error.ApiException;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/**
 * Cổng công cụ học vụ: chỉ capability AcademicFacade khai báo trong readyCapabilities() mới là công cụ thật.
 * Chưa có công cụ thật thì giữ stub NOT_READY (503 TOOL_NOT_READY); kết quả thử (MOCK) chỉ có cho thẩm định kế hoạch,
 * chỉ bật được ở profile dev/test và không bao giờ dẫn tới thao tác có hậu quả như kích hoạt kế hoạch.
 */
@Component
public class AcademicToolGate {

    /** Capability platform đã nối vào endpoint; capability khác vẫn trả 501 NOT_IMPLEMENTED. */
    static final Set<AcademicCapability> WIRED = EnumSet.of(AcademicCapability.GET_ACADEMIC_STATUS,
            AcademicCapability.CHECK_COURSE_ELIGIBILITY, AcademicCapability.RUN_GRADUATION_AUDIT,
            AcademicCapability.GENERATE_STUDY_PLAN, AcademicCapability.VALIDATE_STUDY_PLAN);

    /** Capability có chế độ thử ở dev/test; capability khác chỉ chạy công cụ thật, không có kết quả thay thế. */
    static final Set<AcademicCapability> MOCKABLE = EnumSet.of(AcademicCapability.VALIDATE_STUDY_PLAN);

    private static final Set<String> MOCK_PROFILES = Set.of("dev", "test");

    private final AcademicFacade academicFacade;
    private final boolean mockEnabled;

    public AcademicToolGate(AcademicFacade academicFacade, Environment environment,
                            @Value("${haui.academic.mock-tools.enabled:false}") boolean mockEnabled) {
        if (mockEnabled && Arrays.stream(environment.getActiveProfiles()).noneMatch(MOCK_PROFILES::contains)) {
            throw new IllegalStateException(
                    "haui.academic.mock-tools.enabled=true chỉ dùng được với profile dev hoặc test (SPRING_PROFILES_ACTIVE)");
        }
        this.academicFacade = academicFacade;
        this.mockEnabled = mockEnabled;
    }

    public boolean isReal(AcademicCapability capability) {
        Set<AcademicCapability> ready = academicFacade.readyCapabilities();
        return ready != null && ready.contains(capability);
    }

    public AcademicToolStatus status(AcademicCapability capability) {
        if (!WIRED.contains(capability)) {
            return AcademicToolStatus.NOT_READY;
        }
        if (isReal(capability)) {
            return AcademicToolStatus.READY;
        }
        return mockEnabled && MOCKABLE.contains(capability) ? AcademicToolStatus.MOCK : AcademicToolStatus.NOT_READY;
    }

    /** Endpoint chỉ trả kết quả của công cụ thật; chưa sẵn sàng → 503 TOOL_NOT_READY. */
    public void requireReal(AcademicCapability capability) {
        if (status(capability) != AcademicToolStatus.READY) {
            throw ApiException.toolNotReady(capability.name(),
                    "Công cụ học vụ cho chức năng này chưa sẵn sàng nên chưa có kết quả. Vui lòng thử lại sau.");
        }
    }

    public List<AcademicToolReadinessItem> readiness() {
        return Arrays.stream(AcademicCapability.values())
                .map(c -> new AcademicToolReadinessItem(c, status(c)))
                .toList();
    }

    /** Chế độ thẩm định khả dụng: REAL, MOCK (dev/test) hoặc 503 TOOL_NOT_READY. */
    public ValidationMode requireValidation() {
        return switch (status(AcademicCapability.VALIDATE_STUDY_PLAN)) {
            case READY -> ValidationMode.REAL;
            case MOCK -> ValidationMode.MOCK;
            case NOT_READY -> throw ApiException.toolNotReady(AcademicCapability.VALIDATE_STUDY_PLAN.name(),
                    "Công cụ thẩm định kế hoạch chưa sẵn sàng. Kế hoạch được lưu nháp nhưng chưa thể kiểm tra điều kiện hay kích hoạt.");
        };
    }

    /** Thao tác có hậu quả (kích hoạt) chỉ chạy trên công cụ thật; MOCK không đủ. */
    public void requireRealValidation() {
        if (!isReal(AcademicCapability.VALIDATE_STUDY_PLAN)) {
            throw ApiException.toolNotReady(AcademicCapability.VALIDATE_STUDY_PLAN.name(),
                    "Chưa thể kích hoạt: công cụ thẩm định thật chưa sẵn sàng nên kế hoạch chưa được kiểm tra điều kiện.");
        }
    }
}
