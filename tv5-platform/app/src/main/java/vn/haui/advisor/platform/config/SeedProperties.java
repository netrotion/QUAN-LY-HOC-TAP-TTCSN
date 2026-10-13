package vn.haui.advisor.platform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Seed dữ liệu từ fixture của TV4 ({@code haui.seed.*}).
 * Dữ liệu tham chiếu (CTĐT, tên chuẩn đầu ra) luôn được đồng bộ; tài khoản demo chỉ tạo khi bật và có mật khẩu.
 */
@ConfigurationProperties(prefix = "haui.seed")
public class SeedProperties {

    private String curriculumResource = "classpath:fixtures/curriculum-ktpm-v1.json";
    private String policyResource = "classpath:fixtures/policy-demo.json";
    private String studentProfilesResource = "classpath:fixtures/student-profiles-v1.json";
    private final DemoAccounts demoAccounts = new DemoAccounts();

    public static class DemoAccounts {
        private boolean enabled = false;
        /** Mật khẩu chung của tài khoản demo; để trống thì không tạo tài khoản demo. */
        private String password = "";

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }

    public String getCurriculumResource() {
        return curriculumResource;
    }

    public void setCurriculumResource(String curriculumResource) {
        this.curriculumResource = curriculumResource;
    }

    public String getPolicyResource() {
        return policyResource;
    }

    public void setPolicyResource(String policyResource) {
        this.policyResource = policyResource;
    }

    public String getStudentProfilesResource() {
        return studentProfilesResource;
    }

    public void setStudentProfilesResource(String studentProfilesResource) {
        this.studentProfilesResource = studentProfilesResource;
    }

    public DemoAccounts getDemoAccounts() {
        return demoAccounts;
    }
}
