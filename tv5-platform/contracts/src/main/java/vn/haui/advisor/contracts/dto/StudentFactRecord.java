package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/**
 * Bản ghi dữ kiện học vụ dài hạn đã xác thực của sinh viên (Cross-Session Fact Record).
 * Lưu trữ các mục tiêu dài hạn (CPA mục tiêu, định hướng chuyên ngành, giới hạn tín chỉ mong muốn)
 * để hỗ trợ AI cá nhân hoá tư vấn giữa các phiên hội thoại độc lập mà không bị nhiễm bẩn bộ nhớ.
 */
public class StudentFactRecord implements Serializable {

    private String studentId;
    private BigDecimal targetCpa;
    private String preferredCareerTrack;
    private Integer maxCreditsPerSemester;
    private Map<String, String> verifiedPreferences;
    private String updatedAt;

    public StudentFactRecord() {
        this.verifiedPreferences = new HashMap<>();
        this.updatedAt = Instant.now().toString();
    }

    public StudentFactRecord(String studentId, BigDecimal targetCpa, String preferredCareerTrack,
                             Integer maxCreditsPerSemester, Map<String, String> verifiedPreferences,
                             String updatedAt) {
        this.studentId = studentId;
        this.targetCpa = targetCpa;
        this.preferredCareerTrack = preferredCareerTrack;
        this.maxCreditsPerSemester = maxCreditsPerSemester;
        this.verifiedPreferences = verifiedPreferences != null ? new HashMap<>(verifiedPreferences) : new HashMap<>();
        this.updatedAt = updatedAt != null ? updatedAt : Instant.now().toString();
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public BigDecimal getTargetCpa() {
        return targetCpa;
    }

    public void setTargetCpa(BigDecimal targetCpa) {
        this.targetCpa = targetCpa;
    }

    public String getPreferredCareerTrack() {
        return preferredCareerTrack;
    }

    public void setPreferredCareerTrack(String preferredCareerTrack) {
        this.preferredCareerTrack = preferredCareerTrack;
    }

    public Integer getMaxCreditsPerSemester() {
        return maxCreditsPerSemester;
    }

    public void setMaxCreditsPerSemester(Integer maxCreditsPerSemester) {
        this.maxCreditsPerSemester = maxCreditsPerSemester;
    }

    public Map<String, String> getVerifiedPreferences() {
        return verifiedPreferences != null ? Collections.unmodifiableMap(verifiedPreferences) : Collections.emptyMap();
    }

    public void setVerifiedPreferences(Map<String, String> verifiedPreferences) {
        this.verifiedPreferences = verifiedPreferences != null ? new HashMap<>(verifiedPreferences) : new HashMap<>();
    }

    public void addPreference(String key, String value) {
        if (this.verifiedPreferences == null) {
            this.verifiedPreferences = new HashMap<>();
        }
        this.verifiedPreferences.put(key, value);
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }
}

