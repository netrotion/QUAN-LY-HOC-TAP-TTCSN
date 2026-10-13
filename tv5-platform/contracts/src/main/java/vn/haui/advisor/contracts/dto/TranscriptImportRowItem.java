package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

/**
 * Một dòng trong phiên nhập bảng điểm, chờ sinh viên xem lại.
 * courseName/credits lấy theo CTĐT; documentCourseName/sourceText giữ nguyên như đọc từ tài liệu để đối chiếu.
 * Khi gửi lên (PUT rows) server chỉ nhận rowId, courseCode, semesterCode, score10, letterGrade, included; các trường còn lại do server tính.
 */
public class TranscriptImportRowItem implements Serializable {
    private String rowId;
    private String sourceText;
    private String courseCode;
    private String courseName;
    private String documentCourseName;
    private BigDecimal credits;
    private String semesterCode;
    private BigDecimal score10;
    private String letterGrade;
    private Boolean included;
    private BigDecimal confidence;
    private List<ImportRowIssueItem> issues;

    public TranscriptImportRowItem() {
    }

    public String getRowId() {
        return rowId;
    }

    public void setRowId(String rowId) {
        this.rowId = rowId;
    }

    public String getSourceText() {
        return sourceText;
    }

    public void setSourceText(String sourceText) {
        this.sourceText = sourceText;
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

    public String getDocumentCourseName() {
        return documentCourseName;
    }

    public void setDocumentCourseName(String documentCourseName) {
        this.documentCourseName = documentCourseName;
    }

    public BigDecimal getCredits() {
        return credits;
    }

    public void setCredits(BigDecimal credits) {
        this.credits = credits;
    }

    public String getSemesterCode() {
        return semesterCode;
    }

    public void setSemesterCode(String semesterCode) {
        this.semesterCode = semesterCode;
    }

    public BigDecimal getScore10() {
        return score10;
    }

    public void setScore10(BigDecimal score10) {
        this.score10 = score10;
    }

    public String getLetterGrade() {
        return letterGrade;
    }

    public void setLetterGrade(String letterGrade) {
        this.letterGrade = letterGrade;
    }

    public Boolean getIncluded() {
        return included;
    }

    public void setIncluded(Boolean included) {
        this.included = included;
    }

    public BigDecimal getConfidence() {
        return confidence;
    }

    public void setConfidence(BigDecimal confidence) {
        this.confidence = confidence;
    }

    public List<ImportRowIssueItem> getIssues() {
        return issues;
    }

    public void setIssues(List<ImportRowIssueItem> issues) {
        this.issues = issues;
    }
}
