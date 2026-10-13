package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.math.BigDecimal;

/**
 * Thông tin in trên tài liệu, chỉ để đối chiếu khi xem lại.
 * reportedCpa/reportedAccumulatedCredits KHÔNG được lưu làm số liệu học vụ: CPA luôn do AcademicFacade tính từ bảng điểm đã xác nhận.
 */
public class TranscriptDocumentSummary implements Serializable {
    private String studentIdOnDocument;
    private String fullNameOnDocument;
    private BigDecimal reportedCpa;
    private BigDecimal reportedAccumulatedCredits;

    public TranscriptDocumentSummary() {
    }

    public String getStudentIdOnDocument() {
        return studentIdOnDocument;
    }

    public void setStudentIdOnDocument(String studentIdOnDocument) {
        this.studentIdOnDocument = studentIdOnDocument;
    }

    public String getFullNameOnDocument() {
        return fullNameOnDocument;
    }

    public void setFullNameOnDocument(String fullNameOnDocument) {
        this.fullNameOnDocument = fullNameOnDocument;
    }

    public BigDecimal getReportedCpa() {
        return reportedCpa;
    }

    public void setReportedCpa(BigDecimal reportedCpa) {
        this.reportedCpa = reportedCpa;
    }

    public BigDecimal getReportedAccumulatedCredits() {
        return reportedAccumulatedCredits;
    }

    public void setReportedAccumulatedCredits(BigDecimal reportedAccumulatedCredits) {
        this.reportedAccumulatedCredits = reportedAccumulatedCredits;
    }
}
