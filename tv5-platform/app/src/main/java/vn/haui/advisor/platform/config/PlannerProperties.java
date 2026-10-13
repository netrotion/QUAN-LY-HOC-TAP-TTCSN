package vn.haui.advisor.platform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Giới hạn kích thước kế hoạch client gửi (haui.planner.*).
 */
@ConfigurationProperties(prefix = "haui.planner")
public class PlannerProperties {

    private int maxPlansPerStudent = 50;
    private int maxSemesters = 20;
    private int maxCoursesPerSemester = 30;
    private int maxActions = 50;

    public int getMaxPlansPerStudent() {
        return maxPlansPerStudent;
    }

    public void setMaxPlansPerStudent(int maxPlansPerStudent) {
        this.maxPlansPerStudent = maxPlansPerStudent;
    }

    public int getMaxSemesters() {
        return maxSemesters;
    }

    public void setMaxSemesters(int maxSemesters) {
        this.maxSemesters = maxSemesters;
    }

    public int getMaxCoursesPerSemester() {
        return maxCoursesPerSemester;
    }

    public void setMaxCoursesPerSemester(int maxCoursesPerSemester) {
        this.maxCoursesPerSemester = maxCoursesPerSemester;
    }

    public int getMaxActions() {
        return maxActions;
    }

    public void setMaxActions(int maxActions) {
        this.maxActions = maxActions;
    }
}
