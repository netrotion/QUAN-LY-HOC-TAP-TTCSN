package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.util.List;

/**
 * [Port] Dữ liệu học vụ gốc của sinh viên do platform nạp từ DB cho AcademicFacade.
 * Chỉ gồm bảng điểm ĐÃ XÁC NHẬN và khai báo chứng chỉ; không có GPA/CPA hay số liệu đọc từ tài liệu.
 */
public class StudentAcademicRecord implements Serializable {
    private String studentId;
    private String dataRevision;
    private String curriculumId;
    private TranscriptStatus transcriptStatus;
    private List<TranscriptAttemptItem> attempts;
    private List<CertificateStatusItem> certificates;

    public StudentAcademicRecord() {
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }

    public String getCurriculumId() {
        return curriculumId;
    }

    public void setCurriculumId(String curriculumId) {
        this.curriculumId = curriculumId;
    }

    public TranscriptStatus getTranscriptStatus() {
        return transcriptStatus;
    }

    public void setTranscriptStatus(TranscriptStatus transcriptStatus) {
        this.transcriptStatus = transcriptStatus;
    }

    public List<TranscriptAttemptItem> getAttempts() {
        return attempts;
    }

    public void setAttempts(List<TranscriptAttemptItem> attempts) {
        this.attempts = attempts;
    }

    public List<CertificateStatusItem> getCertificates() {
        return certificates;
    }

    public void setCertificates(List<CertificateStatusItem> certificates) {
        this.certificates = certificates;
    }
}
