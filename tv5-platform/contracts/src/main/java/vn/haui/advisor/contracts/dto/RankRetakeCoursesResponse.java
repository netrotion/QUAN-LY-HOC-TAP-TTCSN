package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.util.List;

public class RankRetakeCoursesResponse implements Serializable {
    private String studentId;
    private List<RetakeCourseRecommendation> recommendations;
    private String dataRevision;

    public RankRetakeCoursesResponse() {
    }

    public RankRetakeCoursesResponse(String studentId, List<RetakeCourseRecommendation> recommendations, String dataRevision) {
        this.studentId = studentId;
        this.recommendations = recommendations;
        this.dataRevision = dataRevision;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public List<RetakeCourseRecommendation> getRecommendations() {
        return recommendations;
    }

    public void setRecommendations(List<RetakeCourseRecommendation> recommendations) {
        this.recommendations = recommendations;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }
}
