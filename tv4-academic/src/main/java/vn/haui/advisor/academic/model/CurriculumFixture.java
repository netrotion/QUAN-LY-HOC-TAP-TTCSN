package vn.haui.advisor.academic.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class CurriculumFixture implements Serializable {
    private String curriculumId;
    private String curriculumName;
    private String majorCode;
    private Integer totalCredits;
    private String status;
    private List<KnowledgeBlockItem> knowledgeBlocks = new ArrayList<>();
    private List<CourseDefinitionItem> courses = new ArrayList<>();

    public CurriculumFixture() {}

    public String getCurriculumId() { return curriculumId; }
    public void setCurriculumId(String curriculumId) { this.curriculumId = curriculumId; }

    public String getCurriculumName() { return curriculumName; }
    public void setCurriculumName(String curriculumName) { this.curriculumName = curriculumName; }

    public String getMajorCode() { return majorCode; }
    public void setMajorCode(String majorCode) { this.majorCode = majorCode; }

    public Integer getTotalCredits() { return totalCredits; }
    public void setTotalCredits(Integer totalCredits) { this.totalCredits = totalCredits; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public List<KnowledgeBlockItem> getKnowledgeBlocks() { return knowledgeBlocks; }
    public void setKnowledgeBlocks(List<KnowledgeBlockItem> knowledgeBlocks) { this.knowledgeBlocks = knowledgeBlocks; }

    public List<CourseDefinitionItem> getCourses() { return courses; }
    public void setCourses(List<CourseDefinitionItem> courses) { this.courses = courses; }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class KnowledgeBlockItem implements Serializable {
        private String blockId;
        private String blockName;
        private Integer requiredCredits;

        public KnowledgeBlockItem() {}

        public String getBlockId() { return blockId; }
        public void setBlockId(String blockId) { this.blockId = blockId; }

        public String getBlockName() { return blockName; }
        public void setBlockName(String blockName) { this.blockName = blockName; }

        public Integer getRequiredCredits() { return requiredCredits; }
        public void setRequiredCredits(Integer requiredCredits) { this.requiredCredits = requiredCredits; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CourseDefinitionItem implements Serializable {
        private String courseCode;
        private String courseName;
        private Double credits;
        private String knowledgeBlock;
        private boolean isMandatory;
        private Integer suggestedSemester;
        private List<String> prerequisites = new ArrayList<>();
        private List<String> priorCourses = new ArrayList<>();
        private List<String> corequisites = new ArrayList<>();
        private Integer minCreditsRequiredToEnroll;

        public CourseDefinitionItem() {}

        public String getCourseCode() { return courseCode; }
        public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

        public String getCourseName() { return courseName; }
        public void setCourseName(String courseName) { this.courseName = courseName; }

        public Integer getCredits() { return credits != null ? (int) Math.round(credits) : null; }
        public Double getCreditsRaw() { return credits; }
        public void setCredits(Double credits) { this.credits = credits; }

        public String getKnowledgeBlock() { return knowledgeBlock; }
        public void setKnowledgeBlock(String knowledgeBlock) { this.knowledgeBlock = knowledgeBlock; }

        public boolean isMandatory() { return isMandatory; }
        public void setMandatory(boolean mandatory) { isMandatory = mandatory; }

        public Integer getSuggestedSemester() { return suggestedSemester; }
        public void setSuggestedSemester(Integer suggestedSemester) { this.suggestedSemester = suggestedSemester; }

        public List<String> getPrerequisites() { return prerequisites; }
        public void setPrerequisites(List<String> prerequisites) { this.prerequisites = prerequisites; }

        public List<String> getPriorCourses() { return priorCourses; }
        public void setPriorCourses(List<String> priorCourses) { this.priorCourses = priorCourses; }

        public List<String> getCorequisites() { return corequisites; }
        public void setCorequisites(List<String> corequisites) { this.corequisites = corequisites; }

        public Integer getMinCreditsRequiredToEnroll() { return minCreditsRequiredToEnroll; }
        public void setMinCreditsRequiredToEnroll(Integer minCreditsRequiredToEnroll) { this.minCreditsRequiredToEnroll = minCreditsRequiredToEnroll; }
    }
}
