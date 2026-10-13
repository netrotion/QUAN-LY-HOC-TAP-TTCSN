package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

/**
 * Một học phần trong CTĐT. Mã học phần điều kiện giữ nguyên như CTĐT, kể cả mã chưa có trong danh mục.
 */
public class CurriculumCourseItem implements Serializable {
    private String courseCode;
    private String courseName;
    private BigDecimal credits;
    private String knowledgeBlock;
    private Integer suggestedSemester;
    private Boolean mandatory;
    private List<String> prerequisiteCourseCodes;
    private List<String> priorCourseCodes;
    private List<String> corequisiteCourseCodes;

    public CurriculumCourseItem() {
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
}
