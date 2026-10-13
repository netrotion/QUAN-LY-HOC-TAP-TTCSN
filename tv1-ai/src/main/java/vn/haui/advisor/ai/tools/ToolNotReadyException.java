package vn.haui.advisor.ai.tools;

import vn.haui.advisor.contracts.dto.AcademicCapability;

/**
 * Ngoại lệ ném ra khi một capability học vụ chưa sẵn sàng từ AcademicFacade.
 */
public class ToolNotReadyException extends IllegalStateException {

    private final AcademicCapability capability;

    public ToolNotReadyException(AcademicCapability capability) {
        super("Academic capability " + capability + " is not ready in AcademicFacade");
        this.capability = capability;
    }

    public ToolNotReadyException(AcademicCapability capability, String message) {
        super(message);
        this.capability = capability;
    }

    public AcademicCapability getCapability() {
        return capability;
    }
}
