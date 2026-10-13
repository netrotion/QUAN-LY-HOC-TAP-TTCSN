package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.util.List;

/**
 * CTĐT mà sinh viên đang theo ({@code GET /academic/curriculum}).
 */
public class CurriculumResponse implements Serializable {
    private String curriculumId;
    private String curriculumName;
    private String majorCode;
    private String majorName;
    private String faculty;
    private Integer totalCreditsRequired;
    private String status;
    private String source;
    private List<CurriculumCourseItem> courses;

    public CurriculumResponse() {
    }

    public String getCurriculumId() {
        return curriculumId;
    }

    public void setCurriculumId(String curriculumId) {
        this.curriculumId = curriculumId;
    }

    public String getCurriculumName() {
        return curriculumName;
    }

    public void setCurriculumName(String curriculumName) {
        this.curriculumName = curriculumName;
    }

    public String getMajorCode() {
        return majorCode;
    }

    public void setMajorCode(String majorCode) {
        this.majorCode = majorCode;
    }

    public String getMajorName() {
        return majorName;
    }

    public void setMajorName(String majorName) {
        this.majorName = majorName;
    }

    public String getFaculty() {
        return faculty;
    }

    public void setFaculty(String faculty) {
        this.faculty = faculty;
    }

    public Integer getTotalCreditsRequired() {
        return totalCreditsRequired;
    }

    public void setTotalCreditsRequired(Integer totalCreditsRequired) {
        this.totalCreditsRequired = totalCreditsRequired;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public List<CurriculumCourseItem> getCourses() {
        return courses;
    }

    public void setCourses(List<CurriculumCourseItem> courses) {
        this.courses = courses;
    }
}
