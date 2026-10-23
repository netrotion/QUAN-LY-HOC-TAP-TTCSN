package vn.haui.advisor.platform.academic;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import vn.haui.advisor.academic.service.DefaultAcademicFacade;
import vn.haui.advisor.contracts.dto.AcademicCapability;
import vn.haui.advisor.contracts.dto.AcademicToolStatus;
import vn.haui.advisor.contracts.dto.ApiErrorCode;
import vn.haui.advisor.contracts.dto.ValidationMode;
import vn.haui.advisor.contracts.ports.AcademicFacade;
import vn.haui.advisor.platform.error.ApiException;

import java.util.EnumSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("AcademicToolGate: công cụ thật, MOCK chỉ ở dev/test, NOT_READY")
class AcademicToolGateTest {

    @Test
    @DisplayName("Bật mock ngoài profile dev/test làm ứng dụng không khởi động")
    void mockOnlyInDevOrTest() {
        assertThatThrownBy(() -> new AcademicToolGate(facade(Set.of()), environment(), true))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new AcademicToolGate(facade(Set.of()), environment("prod"), true))
                .isInstanceOf(IllegalStateException.class);
        assertThat(new AcademicToolGate(facade(Set.of()), environment("dev"), true)
                .status(AcademicCapability.VALIDATE_STUDY_PLAN)).isEqualTo(AcademicToolStatus.MOCK);
        assertThat(new AcademicToolGate(facade(Set.of()), environment(), false)
                .status(AcademicCapability.VALIDATE_STUDY_PLAN)).isEqualTo(AcademicToolStatus.NOT_READY);
    }

    @Test
    @DisplayName("Chưa có công cụ thật và mock tắt: 503 TOOL_NOT_READY; MOCK không đủ để kích hoạt")
    void notReadyAndMockCannotActivate() {
        AcademicToolGate off = new AcademicToolGate(facade(Set.of()), environment(), false);
        assertThatThrownBy(off::requireValidation).isInstanceOfSatisfying(ApiException.class,
                ex -> assertThat(ex.getCode()).isEqualTo(ApiErrorCode.TOOL_NOT_READY));

        AcademicToolGate mock = new AcademicToolGate(facade(Set.of()), environment("test"), true);
        assertThat(mock.requireValidation()).isEqualTo(ValidationMode.MOCK);
        assertThatThrownBy(mock::requireRealValidation).isInstanceOfSatisfying(ApiException.class,
                ex -> assertThat(ex.getCode()).isEqualTo(ApiErrorCode.TOOL_NOT_READY));
    }

    @Test
    @DisplayName("Công cụ khai báo sẵn sàng là REAL; capability chưa nối vào endpoint vẫn NOT_READY")
    void readyCapabilities() {
        AcademicToolGate gate = new AcademicToolGate(
                facade(EnumSet.of(AcademicCapability.VALIDATE_STUDY_PLAN, AcademicCapability.GET_ACADEMIC_STATUS,
                        AcademicCapability.GENERATE_STUDY_PLAN, AcademicCapability.SIMULATE_GRADES)),
                environment("dev"), true);
        assertThat(gate.requireValidation()).isEqualTo(ValidationMode.REAL);
        gate.requireRealValidation();
        gate.requireReal(AcademicCapability.GET_ACADEMIC_STATUS);
        gate.requireReal(AcademicCapability.GENERATE_STUDY_PLAN);
        assertThat(gate.status(AcademicCapability.VALIDATE_STUDY_PLAN)).isEqualTo(AcademicToolStatus.READY);
        assertThat(gate.status(AcademicCapability.GET_ACADEMIC_STATUS)).isEqualTo(AcademicToolStatus.READY);
        assertThat(gate.status(AcademicCapability.GENERATE_STUDY_PLAN)).isEqualTo(AcademicToolStatus.READY);
        assertThat(gate.status(AcademicCapability.SIMULATE_GRADES)).as("chưa nối endpoint").isEqualTo(AcademicToolStatus.NOT_READY);
        assertThat(gate.readiness()).hasSize(AcademicCapability.values().length);
    }

    @Test
    @DisplayName("Trạng thái/điều kiện/audit/sinh phương án không có chế độ MOCK: chưa khai báo thật → 503 kể cả khi bật mock ở test")
    void academicResultsHaveNoMockFallback() {
        AcademicToolGate gate = new AcademicToolGate(facade(Set.of()), environment("test"), true);
        assertThat(gate.status(AcademicCapability.VALIDATE_STUDY_PLAN)).isEqualTo(AcademicToolStatus.MOCK);
        for (AcademicCapability capability : EnumSet.of(AcademicCapability.GET_ACADEMIC_STATUS,
                AcademicCapability.CHECK_COURSE_ELIGIBILITY, AcademicCapability.RUN_GRADUATION_AUDIT,
                AcademicCapability.GENERATE_STUDY_PLAN)) {
            assertThat(gate.status(capability)).isEqualTo(AcademicToolStatus.NOT_READY);
            assertThatThrownBy(() -> gate.requireReal(capability)).isInstanceOfSatisfying(ApiException.class, ex -> {
                assertThat(ex.getCode()).isEqualTo(ApiErrorCode.TOOL_NOT_READY);
                assertThat(ex.getDetails()).containsExactly("capability: " + capability.name());
            });
        }
    }

    private static AcademicFacade facade(Set<AcademicCapability> ready) {
        return new DefaultAcademicFacade() {
            @Override
            public Set<AcademicCapability> readyCapabilities() {
                return ready;
            }
        };
    }

    private static MockEnvironment environment(String... profiles) {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles(profiles);
        return environment;
    }
}
