package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.util.List;

public class ValidateStudyPlanResponse implements Serializable {
    private boolean valid;
    private StudyPlanStatus status;
    private List<String> violations;
    private List<String> warnings;
    private Integer planVersion;
    private String dataRevision;

    public ValidateStudyPlanResponse() {
    }

    public ValidateStudyPlanResponse(boolean valid, StudyPlanStatus status, List<String> violations,
                                    List<String> warnings, Integer planVersion, String dataRevision) {
        this.valid = valid;
        this.status = status;
        this.violations = violations;
        this.warnings = warnings;
        this.planVersion = planVersion;
        this.dataRevision = dataRevision;
    }

    public boolean isValid() {
        return valid;
    }

    public void setValid(boolean valid) {
        this.valid = valid;
    }

    public StudyPlanStatus getStatus() {
        return status;
    }

    public void setStatus(StudyPlanStatus status) {
        this.status = status;
    }

    public List<String> getViolations() {
        return violations;
    }

    public void setViolations(List<String> violations) {
        this.violations = violations;
    }

    public List<String> getWarnings() {
        return warnings;
    }

    public void setWarnings(List<String> warnings) {
        this.warnings = warnings;
    }

    public Integer getPlanVersion() {
        return planVersion;
    }

    public void setPlanVersion(Integer planVersion) {
        this.planVersion = planVersion;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }
}
