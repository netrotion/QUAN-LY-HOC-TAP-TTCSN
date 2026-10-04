package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

/**
 * Request xem trước Kế hoạch học tập (thao tác preview).
 */
public class PreviewStudyPlanRequest implements Serializable {
    private String targetGraduationSemester;
    private BigDecimal targetCpa;
    private Integer maxCreditsPerSemester;
    private Boolean includeSummerSemesters;
    private List<String> selectedRetakeCourseCodes;
    private String dataRevision;

    public PreviewStudyPlanRequest() {
    }

    public PreviewStudyPlanRequest(String targetGraduationSemester, BigDecimal targetCpa,
                                  Integer maxCreditsPerSemester, Boolean includeSummerSemesters,
                                  List<String> selectedRetakeCourseCodes, String dataRevision) {
        this.targetGraduationSemester = targetGraduationSemester;
        this.targetCpa = targetCpa;
        this.maxCreditsPerSemester = maxCreditsPerSemester;
        this.includeSummerSemesters = includeSummerSemesters;
        this.selectedRetakeCourseCodes = selectedRetakeCourseCodes;
        this.dataRevision = dataRevision;
    }

    public String getTargetGraduationSemester() {
        return targetGraduationSemester;
    }

    public void setTargetGraduationSemester(String targetGraduationSemester) {
        this.targetGraduationSemester = targetGraduationSemester;
    }

    public BigDecimal getTargetCpa() {
        return targetCpa;
    }

    public void setTargetCpa(BigDecimal targetCpa) {
        this.targetCpa = targetCpa;
    }

    public Integer getMaxCreditsPerSemester() {
        return maxCreditsPerSemester;
    }

    public void setMaxCreditsPerSemester(Integer maxCreditsPerSemester) {
        this.maxCreditsPerSemester = maxCreditsPerSemester;
    }

    public Boolean getIncludeSummerSemesters() {
        return includeSummerSemesters;
    }

    public void setIncludeSummerSemesters(Boolean includeSummerSemesters) {
        this.includeSummerSemesters = includeSummerSemesters;
    }

    public List<String> getSelectedRetakeCourseCodes() {
        return selectedRetakeCourseCodes;
    }

    public void setSelectedRetakeCourseCodes(List<String> selectedRetakeCourseCodes) {
        this.selectedRetakeCourseCodes = selectedRetakeCourseCodes;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }
}
