package vn.haui.advisor.ai.intent;

import vn.haui.advisor.contracts.dto.SimulatedCourseGrade;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Kết quả bóc tách ý định người dùng từ câu hỏi và ngữ cảnh hội thoại.
 */
public class ParsedUserIntent implements Serializable {

    public enum ScenarioCategory {
        REGULATION,
        DEBT_COURSES,
        STUDY_PLAN,
        ACCELERATED_STUDY,
        WHAT_IF,
        RETAKE_IMPROVEMENT,
        GRADUATION_AUDIT,
        GOAL_CHANGE,
        GENERAL
    }

    private ScenarioCategory category;
    private BigDecimal targetCpa;
    private String targetSemester;
    private String courseCode;
    private Integer maxCredits;
    private Boolean includeSummer;
    private Integer retakeSuggestions;
    private List<SimulatedCourseGrade> simulatedGrades;
    private boolean clarificationNeeded;
    private String clarificationReason;
    private boolean isTranscriptMissing;

    public ParsedUserIntent() {
        this.category = ScenarioCategory.GENERAL;
        this.simulatedGrades = new ArrayList<>();
    }

    public ParsedUserIntent(ScenarioCategory category) {
        this.category = category;
        this.simulatedGrades = new ArrayList<>();
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private final ParsedUserIntent intent = new ParsedUserIntent();

        public Builder category(ScenarioCategory category) {
            intent.category = category;
            return this;
        }

        public Builder targetCpa(BigDecimal targetCpa) {
            intent.targetCpa = targetCpa;
            return this;
        }

        public Builder targetSemester(String targetSemester) {
            intent.targetSemester = targetSemester;
            return this;
        }

        public Builder courseCode(String courseCode) {
            intent.courseCode = courseCode;
            return this;
        }

        public Builder maxCredits(Integer maxCredits) {
            intent.maxCredits = maxCredits;
            return this;
        }

        public Builder includeSummer(Boolean includeSummer) {
            intent.includeSummer = includeSummer;
            return this;
        }

        public Builder retakeSuggestions(Integer retakeSuggestions) {
            intent.retakeSuggestions = retakeSuggestions;
            return this;
        }

        public Builder simulatedGrades(List<SimulatedCourseGrade> simulatedGrades) {
            intent.simulatedGrades = simulatedGrades != null ? new ArrayList<>(simulatedGrades) : new ArrayList<>();
            return this;
        }

        public Builder clarificationNeeded(boolean clarificationNeeded) {
            intent.clarificationNeeded = clarificationNeeded;
            return this;
        }

        public Builder clarificationReason(String clarificationReason) {
            intent.clarificationReason = clarificationReason;
            return this;
        }

        public Builder isTranscriptMissing(boolean isTranscriptMissing) {
            intent.isTranscriptMissing = isTranscriptMissing;
            return this;
        }

        public ParsedUserIntent build() {
            return intent;
        }
    }

    public ScenarioCategory getCategory() {
        return category;
    }

    public void setCategory(ScenarioCategory category) {
        this.category = category;
    }

    public BigDecimal getTargetCpa() {
        return targetCpa;
    }

    public void setTargetCpa(BigDecimal targetCpa) {
        this.targetCpa = targetCpa;
    }

    public String getTargetSemester() {
        return targetSemester;
    }

    public void setTargetSemester(String targetSemester) {
        this.targetSemester = targetSemester;
    }

    public String getCourseCode() {
        return courseCode;
    }

    public void setCourseCode(String courseCode) {
        this.courseCode = courseCode;
    }

    public Integer getMaxCredits() {
        return maxCredits;
    }

    public void setMaxCredits(Integer maxCredits) {
        this.maxCredits = maxCredits;
    }

    public Boolean getIncludeSummer() {
        return includeSummer;
    }

    public void setIncludeSummer(Boolean includeSummer) {
        this.includeSummer = includeSummer;
    }

    public Integer getRetakeSuggestions() {
        return retakeSuggestions;
    }

    public void setRetakeSuggestions(Integer retakeSuggestions) {
        this.retakeSuggestions = retakeSuggestions;
    }

    public List<SimulatedCourseGrade> getSimulatedGrades() {
        return simulatedGrades;
    }

    public void setSimulatedGrades(List<SimulatedCourseGrade> simulatedGrades) {
        this.simulatedGrades = simulatedGrades != null ? new ArrayList<>(simulatedGrades) : new ArrayList<>();
    }

    public boolean isClarificationNeeded() {
        return clarificationNeeded;
    }

    public void setClarificationNeeded(boolean clarificationNeeded) {
        this.clarificationNeeded = clarificationNeeded;
    }

    public String getClarificationReason() {
        return clarificationReason;
    }

    public void setClarificationReason(String clarificationReason) {
        this.clarificationReason = clarificationReason;
    }

    public boolean isTranscriptMissing() {
        return isTranscriptMissing;
    }

    public void setTranscriptMissing(boolean transcriptMissing) {
        isTranscriptMissing = transcriptMissing;
    }

    @Override
    public String toString() {
        return "ParsedUserIntent{" +
                "category=" + category +
                ", targetCpa=" + targetCpa +
                ", targetSemester='" + targetSemester + '\'' +
                ", courseCode='" + courseCode + '\'' +
                ", maxCredits=" + maxCredits +
                ", includeSummer=" + includeSummer +
                ", retakeSuggestions=" + retakeSuggestions +
                ", simulatedGrades=" + simulatedGrades +
                ", clarificationNeeded=" + clarificationNeeded +
                ", clarificationReason='" + clarificationReason + '\'' +
                ", isTranscriptMissing=" + isTranscriptMissing +
                '}';
    }
}
