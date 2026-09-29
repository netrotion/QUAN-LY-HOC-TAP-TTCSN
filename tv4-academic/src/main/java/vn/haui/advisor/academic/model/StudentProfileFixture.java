package vn.haui.advisor.academic.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import vn.haui.advisor.contracts.dto.AcademicRiskLevel;
import vn.haui.advisor.contracts.dto.AuditCertificateAction;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class StudentProfileFixture implements Serializable {
    private String studentId;
    private String fullName;
    private String majorCode;
    private Integer cohort;
    private Integer currentSemester;
    private BigDecimal cpa;
    private BigDecimal gpa;
    private Integer accumulatedCredits;
    private Integer totalCreditsRequired;
    private AcademicRiskLevel riskLevel;
    private List<String> warningMessages;
    private List<CourseAttempt> courseAttempts;
    private List<CertificateItem> certificates;
    private List<AuditCertificateAction> pendingActions;
    private String dataRevision;

    public StudentProfileFixture() {}

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getMajorCode() { return majorCode; }
    public void setMajorCode(String majorCode) { this.majorCode = majorCode; }

    public Integer getCohort() { return cohort; }
    public void setCohort(Integer cohort) { this.cohort = cohort; }

    public Integer getCurrentSemester() { return currentSemester; }
    public void setCurrentSemester(Integer currentSemester) { this.currentSemester = currentSemester; }

    public BigDecimal getCpa() { return cpa; }
    public void setCpa(BigDecimal cpa) { this.cpa = cpa; }

    public BigDecimal getGpa() { return gpa; }
    public void setGpa(BigDecimal gpa) { this.gpa = gpa; }

    public Integer getAccumulatedCredits() { return accumulatedCredits; }
    public void setAccumulatedCredits(Integer accumulatedCredits) { this.accumulatedCredits = accumulatedCredits; }

    public Integer getTotalCreditsRequired() { return totalCreditsRequired; }
    public void setTotalCreditsRequired(Integer totalCreditsRequired) { this.totalCreditsRequired = totalCreditsRequired; }

    public AcademicRiskLevel getRiskLevel() { return riskLevel; }
    public void setRiskLevel(AcademicRiskLevel riskLevel) { this.riskLevel = riskLevel; }

    public List<String> getWarningMessages() { return warningMessages; }
    public void setWarningMessages(List<String> warningMessages) { this.warningMessages = warningMessages; }

    public List<CourseAttempt> getCourseAttempts() { return courseAttempts; }
    public void setCourseAttempts(List<CourseAttempt> courseAttempts) { this.courseAttempts = courseAttempts; }

    public List<CertificateItem> getCertificates() { return certificates; }
    public void setCertificates(List<CertificateItem> certificates) { this.certificates = certificates; }

    public List<AuditCertificateAction> getPendingActions() { return pendingActions; }
    public void setPendingActions(List<AuditCertificateAction> pendingActions) { this.pendingActions = pendingActions; }

    public String getDataRevision() { return dataRevision; }
    public void setDataRevision(String dataRevision) { this.dataRevision = dataRevision; }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CourseAttempt implements Serializable {
        private String courseCode;
        private String courseName;
        private Integer credits;
        private String semesterCode;
        private String letterGrade;
        private Double gradePoint4;
        private Double score10;
        private Boolean passed;

        public CourseAttempt() {}

        public String getCourseCode() { return courseCode; }
        public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

        public String getCourseName() { return courseName; }
        public void setCourseName(String courseName) { this.courseName = courseName; }

        public Integer getCredits() { return credits; }
        public void setCredits(Integer credits) { this.credits = credits; }

        public String getSemesterCode() { return semesterCode; }
        public void setSemesterCode(String semesterCode) { this.semesterCode = semesterCode; }

        public String getLetterGrade() { return letterGrade; }
        public void setLetterGrade(String letterGrade) { this.letterGrade = letterGrade; }

        public Double getGradePoint4() { return gradePoint4; }
        public void setGradePoint4(Double gradePoint4) { this.gradePoint4 = gradePoint4; }

        public Double getScore10() { return score10; }
        public void setScore10(Double score10) { this.score10 = score10; }

        public Boolean getPassed() { return passed; }
        public void setPassed(Boolean passed) { this.passed = passed; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CertificateItem implements Serializable {
        private String category;
        private String name;
        private boolean completed;
        private String statusMessage;

        public CertificateItem() {}

        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public boolean isCompleted() { return completed; }
        public void setCompleted(boolean completed) { this.completed = completed; }

        public String getStatusMessage() { return statusMessage; }
        public void setStatusMessage(String statusMessage) { this.statusMessage = statusMessage; }
    }
}
