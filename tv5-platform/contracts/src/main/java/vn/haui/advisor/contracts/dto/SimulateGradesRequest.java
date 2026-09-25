package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.util.List;

public class SimulateGradesRequest implements Serializable {
    private String studentId;
    private List<SimulatedCourseGrade> courses;
    private String dataRevision;

    public SimulateGradesRequest() {
    }

    public SimulateGradesRequest(String studentId, List<SimulatedCourseGrade> courses, String dataRevision) {
        this.studentId = studentId;
        this.courses = courses;
        this.dataRevision = dataRevision;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public List<SimulatedCourseGrade> getCourses() {
        return courses;
    }

    public void setCourses(List<SimulatedCourseGrade> courses) {
        this.courses = courses;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }
}
