package vn.haui.advisor.platform.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import vn.haui.advisor.academic.service.DefaultAcademicFacade;
import vn.haui.advisor.contracts.dto.AcademicCapability;
import vn.haui.advisor.contracts.dto.StudyPlanStatus;
import vn.haui.advisor.contracts.dto.ValidateStudyPlanRequest;
import vn.haui.advisor.contracts.dto.ValidateStudyPlanResponse;
import vn.haui.advisor.contracts.ports.StudentAcademicRecordProvider;
import vn.haui.advisor.platform.academic.AcademicEngineSources;
import vn.haui.advisor.platform.academic.PolicyVersionSource;
import vn.haui.advisor.platform.transcript.DbStudentAcademicRecordProvider;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Chỉ dùng trong test. Mô phỏng TV4 đã có công cụ thẩm định thật (khai báo thêm VALIDATE_STUDY_PLAN) để test luồng
 * VALIDATED → ACTIVE. Facade được dựng giống runtime (hồ sơ từ DB, quy chế/CTĐT cùng nguồn seed, không hồ sơ mẫu);
 * test có thể tắt mọi "công cụ thật", ép vi phạm hoặc đổi phiên bản quy chế.
 * Bean dùng chung trong context: test sửa trạng thái phải gọi {@link #reset}.
 */
@TestConfiguration
public class AcademicToolsTestConfig {

    public static final String POLICY_V1 = "policy-test@1";

    @Bean
    @Primary
    public ControllableAcademicFacade controllableAcademicFacade(DbStudentAcademicRecordProvider records,
                                                                 AcademicEngineSources sources) {
        return new ControllableAcademicFacade(records, sources);
    }

    @Bean
    @Primary
    public MutablePolicyVersion mutablePolicyVersion() {
        return new MutablePolicyVersion();
    }

    public static void reset(ControllableAcademicFacade facade, MutablePolicyVersion policy) {
        facade.reset();
        policy.set(POLICY_V1);
    }

    public static class ControllableAcademicFacade extends DefaultAcademicFacade {

        private volatile boolean ready = true;
        private volatile List<String> forcedViolations = List.of();

        public ControllableAcademicFacade(StudentAcademicRecordProvider records, AcademicEngineSources sources) {
            super(records, sources.policy(), sources.curriculum(), Map.of());
        }

        @Override
        public Set<AcademicCapability> readyCapabilities() {
            if (!ready) {
                return Set.of();
            }
            Set<AcademicCapability> capabilities = EnumSet.noneOf(AcademicCapability.class);
            capabilities.addAll(super.readyCapabilities());
            capabilities.add(AcademicCapability.VALIDATE_STUDY_PLAN);
            return capabilities;
        }

        @Override
        public ValidateStudyPlanResponse validateStudyPlan(ValidateStudyPlanRequest request) {
            ValidateStudyPlanResponse result = super.validateStudyPlan(request);
            if (!forcedViolations.isEmpty()) {
                List<String> violations = new ArrayList<>(result.getViolations());
                violations.addAll(forcedViolations);
                result.setViolations(violations);
                result.setValid(false);
                result.setStatus(StudyPlanStatus.DRAFT);
            }
            return result;
        }

        /** false: TV4 chưa khai báo công cụ thật nào (mọi capability NOT_READY). */
        public void setReady(boolean ready) {
            this.ready = ready;
        }

        public void forceViolations(String... violations) {
            this.forcedViolations = List.of(violations);
        }

        public void reset() {
            ready = true;
            forcedViolations = List.of();
        }
    }

    public static class MutablePolicyVersion implements PolicyVersionSource {

        private volatile String version = POLICY_V1;

        @Override
        public String currentPolicyVersion() {
            return version;
        }

        public void set(String version) {
            this.version = version;
        }
    }
}
