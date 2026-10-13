package vn.haui.advisor.contracts.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

/**
 * Phương án lộ trình do AcademicFacade sinh ra ({@code POST /planner/generate}).
 * Đây là bản xem trước chưa lưu: chỉ có proposalId, không có planId/planVersion.
 * Muốn giữ lại thì gửi semesters sang {@code POST /planner/plans} để tạo DRAFT.
 */
public class GenerateStudyPlanResponse implements Serializable {
    private String proposalId;
    private String studentId;
    private String planName;
    private StudyPlanStatus status;
    private BigDecimal targetCpa;
    private Integer totalCredits;
    private BigDecimal projectedCpa;
    private List<PlannedSemesterItem> semesters;
    private List<ChatActionItem> actions;
    private List<String> warnings;
    private String dataRevision;

    public GenerateStudyPlanResponse() {
    }

    public GenerateStudyPlanResponse(String proposalId, String studentId, StudyPlanStatus status,
                                    List<PlannedSemesterItem> semesters, BigDecimal projectedCpa,
                                    List<String> warnings, String dataRevision) {
        this.proposalId = proposalId;
        this.studentId = studentId;
        this.status = status;
        this.semesters = semesters;
        this.projectedCpa = projectedCpa;
        this.warnings = warnings;
        this.dataRevision = dataRevision;
    }

    /**
     * Constructor chuyển tiếp từ V0. Phương án đề xuất chưa được lưu nên không có phiên bản:
     * tham số planVersion bị bỏ qua.
     *
     * @deprecated dùng constructor không có planVersion.
     */
    @Deprecated(since = "1.0.0", forRemoval = true)
    public GenerateStudyPlanResponse(String proposalId, String studentId, StudyPlanStatus status,
                                    List<PlannedSemesterItem> semesters, BigDecimal projectedCpa,
                                    List<String> warnings, Integer planVersion, String dataRevision) {
        this(proposalId, studentId, status, semesters, projectedCpa, warnings, dataRevision);
    }

    public String getProposalId() {
        return proposalId;
    }

    public void setProposalId(String proposalId) {
        this.proposalId = proposalId;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getPlanName() {
        return planName;
    }

    public void setPlanName(String planName) {
        this.planName = planName;
    }

    public StudyPlanStatus getStatus() {
        return status;
    }

    public void setStatus(StudyPlanStatus status) {
        this.status = status;
    }

    public BigDecimal getTargetCpa() {
        return targetCpa;
    }

    public void setTargetCpa(BigDecimal targetCpa) {
        this.targetCpa = targetCpa;
    }

    public Integer getTotalCredits() {
        return totalCredits;
    }

    public void setTotalCredits(Integer totalCredits) {
        this.totalCredits = totalCredits;
    }

    public BigDecimal getProjectedCpa() {
        return projectedCpa;
    }

    public void setProjectedCpa(BigDecimal projectedCpa) {
        this.projectedCpa = projectedCpa;
    }

    public List<PlannedSemesterItem> getSemesters() {
        return semesters;
    }

    public void setSemesters(List<PlannedSemesterItem> semesters) {
        this.semesters = semesters;
    }

    public List<ChatActionItem> getActions() {
        return actions;
    }

    public void setActions(List<ChatActionItem> actions) {
        this.actions = actions;
    }

    public List<String> getWarnings() {
        return warnings;
    }

    public void setWarnings(List<String> warnings) {
        this.warnings = warnings;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }

    /**
     * Accessor chuyển tiếp cho mã nguồn dùng tên V0; JSON chỉ có trường {@code proposalId}.
     *
     * @deprecated dùng {@link #getProposalId()}.
     */
    @Deprecated(since = "1.0.0", forRemoval = true)
    @JsonIgnore
    public String getPlanId() {
        return getProposalId();
    }
}
