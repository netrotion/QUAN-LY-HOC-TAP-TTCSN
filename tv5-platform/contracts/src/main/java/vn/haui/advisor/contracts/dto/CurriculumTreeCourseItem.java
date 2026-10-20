package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

/**
 * Một nút trên cây CTĐT: dữ liệu học phần như {@link CurriculumCourseItem} kèm trạng thái của sinh viên.
 * eligible/missingPrerequisites/warnings là kết quả nguyên văn của AcademicFacade#checkCourseEligibility.
 */
public class CurriculumTreeCourseItem implements Serializable {
    private String courseCode;
    private String courseName;
    private BigDecimal credits;
    private String knowledgeBlock;
    private Integer suggestedSemester;
    private Boolean mandatory;
    private List<String> prerequisiteCourseCodes;
    private List<String> priorCourseCodes;
    private List<String> corequisiteCourseCodes;
    private CourseProgressStatus status;
    private String letterGrade;
    private String semesterCode;
    private boolean eligible;
    private List<String> missingPrerequisites;
    private List<String> warnings;

    public CurriculumTreeCourseItem() {
    }

    public String getCourseCode() {
        return courseCode;
    }

    public void setCourseCode(String courseCode) {
        this.courseCode = courseCode;
    }

    public String getCourseName() {
        return courseName;
    }

    public void setCourseName(String courseName) {
        this.courseName = courseName;
    }

    public BigDecimal getCredits() {
        return credits;
    }

    public void setCredits(BigDecimal credits) {
        this.credits = credits;
    }

    public String getKnowledgeBlock() {
        return knowledgeBlock;
    }

    public void setKnowledgeBlock(String knowledgeBlock) {
        this.knowledgeBlock = knowledgeBlock;
    }

    public Integer getSuggestedSemester() {
        return suggestedSemester;
    }

    public void setSuggestedSemester(Integer suggestedSemester) {
        this.suggestedSemester = suggestedSemester;
    }

    public Boolean getMandatory() {
        return mandatory;
    }

    public void setMandatory(Boolean mandatory) {
        this.mandatory = mandatory;
    }

    public List<String> getPrerequisiteCourseCodes() {
        return prerequisiteCourseCodes;
    }

    public void setPrerequisiteCourseCodes(List<String> prerequisiteCourseCodes) {
        this.prerequisiteCourseCodes = prerequisiteCourseCodes;
    }

    public List<String> getPriorCourseCodes() {
        return priorCourseCodes;
    }

    public void setPriorCourseCodes(List<String> priorCourseCodes) {
        this.priorCourseCodes = priorCourseCodes;
    }

    public List<String> getCorequisiteCourseCodes() {
        return corequisiteCourseCodes;
    }

    public void setCorequisiteCourseCodes(List<String> corequisiteCourseCodes) {
        this.corequisiteCourseCodes = corequisiteCourseCodes;
    }

    public CourseProgressStatus getStatus() {
        return status;
    }

    public void setStatus(CourseProgressStatus status) {
        this.status = status;
    }

    public String getLetterGrade() {
        return letterGrade;
    }

    public void setLetterGrade(String letterGrade) {
        this.letterGrade = letterGrade;
    }

    public String getSemesterCode() {
        return semesterCode;
    }

    public void setSemesterCode(String semesterCode) {
        this.semesterCode = semesterCode;
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
}
