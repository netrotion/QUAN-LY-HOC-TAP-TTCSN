package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

public class CourseEligibilityRequest implements Serializable {
    private String studentId;
    private String courseCode;
    private String targetSemester;
    private String dataRevision;

    public CourseEligibilityRequest() {
    }

    public CourseEligibilityRequest(String studentId, String courseCode, String targetSemester, String dataRevision) {
        this.studentId = studentId;
        this.courseCode = courseCode;
        this.targetSemester = targetSemester;
        this.dataRevision = dataRevision;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getCourseCode() {
        return courseCode;
    }

    public void setCourseCode(String courseCode) {
        this.courseCode = courseCode;
    }

    public String getTargetSemester() {
        return targetSemester;
    }

    public void setTargetSemester(String targetSemester) {
        this.targetSemester = targetSemester;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }
}
