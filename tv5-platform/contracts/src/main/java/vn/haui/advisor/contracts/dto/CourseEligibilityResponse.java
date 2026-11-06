package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.util.List;

public class CourseEligibilityResponse implements Serializable {
    private String courseCode;
    private String courseName;
    private List<String> prerequisiteCourseCodes;
    private List<String> priorCourseCodes;
    private List<String> corequisiteCourseCodes;
    private boolean eligible;
    private List<String> missingPrerequisites;
    private List<String> warnings;
    private String dataRevision;
    private String policyVersion;

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

    public String getCourseName() { return courseName; }
    public void setCourseName(String courseName) { this.courseName = courseName; }

    public List<String> getPrerequisiteCourseCodes() { return prerequisiteCourseCodes; }
    public void setPrerequisiteCourseCodes(List<String> codes) { this.prerequisiteCourseCodes = codes; }

    public List<String> getPriorCourseCodes() { return priorCourseCodes; }
    public void setPriorCourseCodes(List<String> codes) { this.priorCourseCodes = codes; }

    public List<String> getCorequisiteCourseCodes() { return corequisiteCourseCodes; }
    public void setCorequisiteCourseCodes(List<String> codes) { this.corequisiteCourseCodes = codes; }

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

    public String getPolicyVersion() {
        return policyVersion;
    }

    public void setPolicyVersion(String policyVersion) {
        this.policyVersion = policyVersion;
    }
}
