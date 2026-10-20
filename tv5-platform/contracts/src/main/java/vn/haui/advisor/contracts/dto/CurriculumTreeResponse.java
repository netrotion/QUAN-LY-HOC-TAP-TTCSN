package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.util.List;

/**
 * Cây CTĐT của sinh viên đang đăng nhập ({@code GET /academic/curriculum/tree}): mọi học phần của CTĐT kèm trạng thái
 * học tập và điều kiện đăng ký, tính trên hồ sơ server nạp (dataRevision) và quy chế (policyVersion).
 */
public class CurriculumTreeResponse implements Serializable {
    private String studentId;
    private String curriculumId;
    private String curriculumName;
    private String majorCode;
    private Integer totalCreditsRequired;
    private TranscriptStatus transcriptStatus;
    private List<CurriculumTreeCourseItem> courses;
    private String dataRevision;
    private String policyVersion;

    public CurriculumTreeResponse() {
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
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

    public Integer getTotalCreditsRequired() {
        return totalCreditsRequired;
    }

    public void setTotalCreditsRequired(Integer totalCreditsRequired) {
        this.totalCreditsRequired = totalCreditsRequired;
    }

    public TranscriptStatus getTranscriptStatus() {
        return transcriptStatus;
    }

    public void setTranscriptStatus(TranscriptStatus transcriptStatus) {
        this.transcriptStatus = transcriptStatus;
    }

    public List<CurriculumTreeCourseItem> getCourses() {
        return courses;
    }

    public void setCourses(List<CurriculumTreeCourseItem> courses) {
        this.courses = courses;
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
