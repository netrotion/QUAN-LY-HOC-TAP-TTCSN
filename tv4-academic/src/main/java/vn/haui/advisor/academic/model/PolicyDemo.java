package vn.haui.advisor.academic.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class PolicyDemo implements Serializable {
    private String policyId;
    private String policyName;
    private String version;
    private String sourceReference;
    private String status;
    private String description;
    private GradingScaleConfig gradingScale;
    private CreditLimitsConfig creditLimits;
    private AcademicRiskThresholdsConfig academicRiskThresholds;
    private RetakeOptimizationRulesConfig retakeOptimizationRules;
    private CourseSchedulingWeightsConfig courseSchedulingWeights;
    private GraduationRequirementsConfig graduationRequirements;
    private MissingDataHandlingConfig missingDataHandlingPolicy;

    public PolicyDemo() {}

    public String getPolicyId() { return policyId; }
    public void setPolicyId(String policyId) { this.policyId = policyId; }

    public String getPolicyName() { return policyName; }
    public void setPolicyName(String policyName) { this.policyName = policyName; }

    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }

    public String getSourceReference() { return sourceReference; }
    public void setSourceReference(String sourceReference) { this.sourceReference = sourceReference; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public GradingScaleConfig getGradingScale() { return gradingScale; }
    public void setGradingScale(GradingScaleConfig gradingScale) { this.gradingScale = gradingScale; }

    public CreditLimitsConfig getCreditLimits() { return creditLimits; }
    public void setCreditLimits(CreditLimitsConfig creditLimits) { this.creditLimits = creditLimits; }

    public AcademicRiskThresholdsConfig getAcademicRiskThresholds() { return academicRiskThresholds; }
    public void setAcademicRiskThresholds(AcademicRiskThresholdsConfig academicRiskThresholds) { this.academicRiskThresholds = academicRiskThresholds; }

    public RetakeOptimizationRulesConfig getRetakeOptimizationRules() { return retakeOptimizationRules; }
    public void setRetakeOptimizationRules(RetakeOptimizationRulesConfig retakeOptimizationRules) { this.retakeOptimizationRules = retakeOptimizationRules; }

    public CourseSchedulingWeightsConfig getCourseSchedulingWeights() { return courseSchedulingWeights; }
    public void setCourseSchedulingWeights(CourseSchedulingWeightsConfig courseSchedulingWeights) { this.courseSchedulingWeights = courseSchedulingWeights; }

    public GraduationRequirementsConfig getGraduationRequirements() { return graduationRequirements; }
    public void setGraduationRequirements(GraduationRequirementsConfig graduationRequirements) { this.graduationRequirements = graduationRequirements; }

    public MissingDataHandlingConfig getMissingDataHandlingPolicy() { return missingDataHandlingPolicy; }
    public void setMissingDataHandlingPolicy(MissingDataHandlingConfig missingDataHandlingPolicy) { this.missingDataHandlingPolicy = missingDataHandlingPolicy; }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class GradingScaleConfig implements Serializable {
        private String status;
        private List<GradeEntry> grades;
        public GradingScaleConfig() {}
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public List<GradeEntry> getGrades() { return grades; }
        public void setGrades(List<GradeEntry> grades) { this.grades = grades; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class GradeEntry implements Serializable {
        private String letter;
        private Double minScore10;
        private Double maxScore10;
        private Double gradePoint4;
        private boolean passed;
        private String status;
        public GradeEntry() {}
        public String getLetter() { return letter; }
        public void setLetter(String letter) { this.letter = letter; }
        public Double getMinScore10() { return minScore10; }
        public void setMinScore10(Double minScore10) { this.minScore10 = minScore10; }
        public Double getMaxScore10() { return maxScore10; }
        public void setMaxScore10(Double maxScore10) { this.maxScore10 = maxScore10; }
        public Double getGradePoint4() { return gradePoint4; }
        public void setGradePoint4(Double gradePoint4) { this.gradePoint4 = gradePoint4; }
        public boolean isPassed() { return passed; }
        public void setPassed(boolean passed) { this.passed = passed; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CreditLimitsConfig implements Serializable {
        private String status;
        private Integer minCreditsMainSemester;
        private Integer maxCreditsMainSemester;
        private Integer maxCreditsSummerSemester;
        private Integer maxCreditsWarningSemester = 14;
        private Integer minCreditsGraduationSemester;
        private String rationale;
        public CreditLimitsConfig() {}
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public Integer getMinCreditsMainSemester() { return minCreditsMainSemester; }
        public void setMinCreditsMainSemester(Integer minCreditsMainSemester) { this.minCreditsMainSemester = minCreditsMainSemester; }
        public Integer getMaxCreditsMainSemester() { return maxCreditsMainSemester; }
        public void setMaxCreditsMainSemester(Integer maxCreditsMainSemester) { this.maxCreditsMainSemester = maxCreditsMainSemester; }
        public Integer getMaxCreditsSummerSemester() { return maxCreditsSummerSemester; }
        public void setMaxCreditsSummerSemester(Integer maxCreditsSummerSemester) { this.maxCreditsSummerSemester = maxCreditsSummerSemester; }
        public Integer getMaxCreditsWarningSemester() { return maxCreditsWarningSemester; }
        public void setMaxCreditsWarningSemester(Integer maxCreditsWarningSemester) { this.maxCreditsWarningSemester = maxCreditsWarningSemester; }
        public Integer getMinCreditsGraduationSemester() { return minCreditsGraduationSemester; }
        public void setMinCreditsGraduationSemester(Integer minCreditsGraduationSemester) { this.minCreditsGraduationSemester = minCreditsGraduationSemester; }
        public String getRationale() { return rationale; }
        public void setRationale(String rationale) { this.rationale = rationale; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AcademicRiskThresholdsConfig implements Serializable {
        private String status;
        private BigDecimal year1MinCpa;
        private BigDecimal year2MinCpa;
        private BigDecimal year3MinCpa;
        private BigDecimal year4PlusMinCpa = new BigDecimal("1.80");
        private Integer maxDebtCredits;
        private Integer consecutiveWarningsForCritical;
        private String rationale;
        public AcademicRiskThresholdsConfig() {}
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public BigDecimal getYear1MinCpa() { return year1MinCpa; }
        public void setYear1MinCpa(BigDecimal year1MinCpa) { this.year1MinCpa = year1MinCpa; }
        public BigDecimal getYear2MinCpa() { return year2MinCpa; }
        public void setYear2MinCpa(BigDecimal year2MinCpa) { this.year2MinCpa = year2MinCpa; }
        public BigDecimal getYear3MinCpa() { return year3MinCpa; }
        public void setYear3MinCpa(BigDecimal year3MinCpa) { this.year3MinCpa = year3MinCpa; }
        public BigDecimal getYear4PlusMinCpa() { return year4PlusMinCpa; }
        public void setYear4PlusMinCpa(BigDecimal year4PlusMinCpa) { this.year4PlusMinCpa = year4PlusMinCpa; }
        public Integer getMaxDebtCredits() { return maxDebtCredits; }
        public void setMaxDebtCredits(Integer maxDebtCredits) { this.maxDebtCredits = maxDebtCredits; }
        public Integer getConsecutiveWarningsForCritical() { return consecutiveWarningsForCritical; }
        public void setConsecutiveWarningsForCritical(Integer consecutiveWarningsForCritical) { this.consecutiveWarningsForCritical = consecutiveWarningsForCritical; }
        public String getRationale() { return rationale; }
        public void setRationale(String rationale) { this.rationale = rationale; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class RetakeOptimizationRulesConfig implements Serializable {
        private String status;
        private List<String> eligibleCurrentGrades;
        private List<String> ineligibleGrades;
        private boolean replaceOldGradeInCpa;
        private String rationale;
        public RetakeOptimizationRulesConfig() {}
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public List<String> getEligibleCurrentGrades() { return eligibleCurrentGrades; }
        public void setEligibleCurrentGrades(List<String> eligibleCurrentGrades) { this.eligibleCurrentGrades = eligibleCurrentGrades; }
        public List<String> getIneligibleGrades() { return ineligibleGrades; }
        public void setIneligibleGrades(List<String> ineligibleGrades) { this.ineligibleGrades = ineligibleGrades; }
        public boolean isReplaceOldGradeInCpa() { return replaceOldGradeInCpa; }
        public void setReplaceOldGradeInCpa(boolean replaceOldGradeInCpa) { this.replaceOldGradeInCpa = replaceOldGradeInCpa; }
        public String getRationale() { return rationale; }
        public void setRationale(String rationale) { this.rationale = rationale; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CourseSchedulingWeightsConfig implements Serializable {
        private String status;
        private WeightItem unblockPrerequisites;
        private WeightItem standardCurriculumProgression;
        private WeightItem retakeRoi;
        private WeightItem workloadBalance;

        public CourseSchedulingWeightsConfig() {}

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public WeightItem getUnblockPrerequisites() { return unblockPrerequisites; }
        public void setUnblockPrerequisites(WeightItem unblockPrerequisites) { this.unblockPrerequisites = unblockPrerequisites; }

        public WeightItem getStandardCurriculumProgression() { return standardCurriculumProgression; }
        public void setStandardCurriculumProgression(WeightItem standardCurriculumProgression) { this.standardCurriculumProgression = standardCurriculumProgression; }

        public WeightItem getRetakeRoi() { return retakeRoi; }
        public void setRetakeRoi(WeightItem retakeRoi) { this.retakeRoi = retakeRoi; }

        public WeightItem getWorkloadBalance() { return workloadBalance; }
        public void setWorkloadBalance(WeightItem workloadBalance) { this.workloadBalance = workloadBalance; }

        public List<WeightItem> allWeights() {
            return List.of(unblockPrerequisites, standardCurriculumProgression, retakeRoi, workloadBalance);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class WeightItem implements Serializable {
        private Double weight;
        private String description;
        private String status;
        public WeightItem() {}
        public Double getWeight() { return weight; }
        public void setWeight(Double weight) { this.weight = weight; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class GraduationRequirementsConfig implements Serializable {
        private String status;
        private BigDecimal minCpa;
        private Integer totalCredits;
        private Integer thesisEligibilityMinCreditPercent;
        private List<GraduationClassificationItem> classifications;
        private List<NonCreditItem> nonCreditRequirements;
        private String rationale;
        public GraduationRequirementsConfig() {}
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public BigDecimal getMinCpa() { return minCpa; }
        public void setMinCpa(BigDecimal minCpa) { this.minCpa = minCpa; }
        public Integer getTotalCredits() { return totalCredits; }
        public void setTotalCredits(Integer totalCredits) { this.totalCredits = totalCredits; }
        public Integer getThesisEligibilityMinCreditPercent() { return thesisEligibilityMinCreditPercent; }
        public void setThesisEligibilityMinCreditPercent(Integer thesisEligibilityMinCreditPercent) { this.thesisEligibilityMinCreditPercent = thesisEligibilityMinCreditPercent; }
        public List<GraduationClassificationItem> getClassifications() { return classifications; }
        public void setClassifications(List<GraduationClassificationItem> classifications) { this.classifications = classifications; }
        public List<NonCreditItem> getNonCreditRequirements() { return nonCreditRequirements; }
        public void setNonCreditRequirements(List<NonCreditItem> nonCreditRequirements) { this.nonCreditRequirements = nonCreditRequirements; }
        public String getRationale() { return rationale; }
        public void setRationale(String rationale) { this.rationale = rationale; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class GraduationClassificationItem implements Serializable {
        private String level;
        private String name;
        private BigDecimal minCpa;
        private Double maxRetakeCreditPercent;
        private String status;
        public GraduationClassificationItem() {}
        public String getLevel() { return level; }
        public void setLevel(String level) { this.level = level; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public BigDecimal getMinCpa() { return minCpa; }
        public void setMinCpa(BigDecimal minCpa) { this.minCpa = minCpa; }
        public Double getMaxRetakeCreditPercent() { return maxRetakeCreditPercent; }
        public void setMaxRetakeCreditPercent(Double maxRetakeCreditPercent) { this.maxRetakeCreditPercent = maxRetakeCreditPercent; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class NonCreditItem implements Serializable {
        private String category;
        private String name;
        private String status;
        public NonCreditItem() {}
        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class MissingDataHandlingConfig implements Serializable {
        private String status;
        private boolean allowDefaultZeroScore;
        private boolean allowDefaultPass;
        private String missingFieldRepresentation;
        private String unknownStatusLabel;
        private String rationale;
        public MissingDataHandlingConfig() {}
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public boolean isAllowDefaultZeroScore() { return allowDefaultZeroScore; }
        public void setAllowDefaultZeroScore(boolean allowDefaultZeroScore) { this.allowDefaultZeroScore = allowDefaultZeroScore; }
        public boolean isAllowDefaultPass() { return allowDefaultPass; }
        public void setAllowDefaultPass(boolean allowDefaultPass) { this.allowDefaultPass = allowDefaultPass; }
        public String getMissingFieldRepresentation() { return missingFieldRepresentation; }
        public void setMissingFieldRepresentation(String missingFieldRepresentation) { this.missingFieldRepresentation = missingFieldRepresentation; }
        public String getUnknownStatusLabel() { return unknownStatusLabel; }
        public void setUnknownStatusLabel(String unknownStatusLabel) { this.unknownStatusLabel = unknownStatusLabel; }
        public String getRationale() { return rationale; }
        public void setRationale(String rationale) { this.rationale = rationale; }
    }
}
