package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

/**
 * Trạng thái một công cụ học vụ trong BootstrapInfoResponse.academicTools.
 */
public class AcademicToolReadinessItem implements Serializable {
    private AcademicCapability capability;
    private AcademicToolStatus status;

    public AcademicToolReadinessItem() {
    }

    public AcademicToolReadinessItem(AcademicCapability capability, AcademicToolStatus status) {
        this.capability = capability;
        this.status = status;
    }

    public AcademicCapability getCapability() {
        return capability;
    }

    public void setCapability(AcademicCapability capability) {
        this.capability = capability;
    }

    public AcademicToolStatus getStatus() {
        return status;
    }

    public void setStatus(AcademicToolStatus status) {
        this.status = status;
    }
}
