package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.util.List;

public class CourseEligibilityResponse implements Serializable {
    private String courseCode;
    private boolean eligible;
    private List<String> missingPrerequisites;
    private List<String> warnings;
    private String dataRevision;

    public CourseEligibilityResponse() {
    }

    public CourseEligibilityResponse(String courseCode, boolean eligible, List<String> missingPrerequisites,
                                     List<String> warnings, String dataRevision) {
        this.courseCode = courseCode;
        this.eligible = eligible;
        this.missingPrerequisites = missingPrerequisites;
        this.warnings = warnings;
        this.dataRevision = dataRevision;
    }

    public String getCourseCode() {
        return courseCode;
    }

    public void setCourseCode(String courseCode) {
        this.courseCode = courseCode;
    }

    public boolean isEligible() {
        return eligible;
    }

    public void setEligible(boolean eligible) {
        this.eligible = eligible;
    }

    public List<String> getMissingPrerequisites() {
        return missingPrerequisites;
    }

    public void setMissingPrerequisites(List<String> missingPrerequisites) {
        this.missingPrerequisites = missingPrerequisites;
    }

    public List<String> getWarnings() {
        return warnings;
    }

    public void setWarnings(List<String> warnings) {
        this.warnings = warnings;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }
}
