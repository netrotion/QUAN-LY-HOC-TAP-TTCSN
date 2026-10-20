package vn.haui.advisor.platform.academic;

import org.springframework.stereotype.Component;

/**
 * Phiên bản quy chế lấy từ fixture quy chế của TV4 (policyId@version) mà engine học vụ đang dùng.
 */
@Component
public class FixturePolicyVersionSource implements PolicyVersionSource {

    private final String policyVersion;

    public FixturePolicyVersionSource(AcademicEngineSources sources) {
        this.policyVersion = sources.policyVersion();
    }

    @Override
    public String currentPolicyVersion() {
        return policyVersion;
    }
}
