package vn.haui.advisor.contracts.dto;

import java.io.Serializable;

public class RankRetakeCoursesRequest implements Serializable {
    private String studentId;
    private Integer maxSuggestions;
    private String dataRevision;

    public RankRetakeCoursesRequest() {
    }

    public RankRetakeCoursesRequest(String studentId, Integer maxSuggestions, String dataRevision) {
        this.studentId = studentId;
        this.maxSuggestions = maxSuggestions;
        this.dataRevision = dataRevision;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public Integer getMaxSuggestions() {
        return maxSuggestions;
    }

    public void setMaxSuggestions(Integer maxSuggestions) {
        this.maxSuggestions = maxSuggestions;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }
}
