package vn.haui.advisor.platform.support;

import vn.haui.advisor.contracts.dto.PlannedCourseItem;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Học phần thật của CTĐT seed (curriculum-ktpm-v1.json) để dựng kế hoạch test qua được thẩm định của TV4 (môn phải thuộc
 * CTĐT, đủ học phần học trước/tiên quyết/song hành, không xếp trùng, không học cải thiện môn đã đạt từ B). Chỉ gồm môn
 * không có học phần học trước/tiên quyết/song hành và không phải môn các test nhập vào bảng điểm (LP6010, LP6011, BS6001,
 * BS6002, BS6018, FL6287, IT6015, DC6006), nên hợp lệ với mọi bảng điểm test. Mỗi học kỳ một nhóm môn riêng để kế hoạch
 * nhiều học kỳ không xếp trùng môn.
 */
public final class PlanCourses {

    private record Course(String code, String name, int credits) {
    }

    private static final Map<String, List<Course>> THREE_CREDITS = Map.of(
            "2026_1", List.of(new Course("IT6016", "Kỹ thuật số", 3),
                    new Course("IT6095", "Tối ưu hóa", 3),
                    new Course("IT6123", "Tương tác người máy", 3),
                    new Course("IT6033", "Quản lý dự án công nghệ thông tin", 3),
                    new Course("IT6085", "Đảm bảo chất lượng phần mềm", 3),
                    new Course("IT6004", "Công nghệ đa phương tiện", 3)),
            "2026_2", List.of(new Course("IT6061", "Hệ quản trị doanh nghiệp điện tử", 3),
                    new Course("IT6024", "Một số công nghệ phát triển phần mềm", 3),
                    new Course("IT6127", "Quản trị mạng trên hệ điều hành mã nguồn mở", 3),
                    new Course("IT6040", "Thực tập cơ sở ngành", 3),
                    new Course("DC6004", "Đường lối QP&AN của ĐCS Việt Nam", 3)));

    private static final Map<String, List<Course>> TWO_CREDITS = Map.of(
            "2026_1", List.of(new Course("BS6021", "Con người và môi trường", 2),
                    new Course("BS6019", "Nhập môn nghiên cứu khoa học", 2)),
            "2026_2", List.of(new Course("BS6020", "Quan hệ lao động và việc làm", 2),
                    new Course("BM6091", "Quản lý dự án", 2),
                    new Course("AA6040", "Đổi mới sáng tạo và tư duy khởi nghiệp", 2),
                    new Course("BS6022", "Âm nhạc đại cương", 2)));

    private PlanCourses() {
    }

    /** Học phần của học kỳ {@code semesterCode} có tổng đúng {@code credits} tín chỉ: các môn 3 TC, bù môn 2 TC khi cần. */
    public static List<PlannedCourseItem> forSemester(String semesterCode, int credits, String rationale) {
        List<Course> threes = THREE_CREDITS.get(semesterCode);
        List<Course> twos = TWO_CREDITS.get(semesterCode);
        if (threes == null) {
            throw new IllegalArgumentException("Chưa có nhóm học phần test cho học kỳ " + semesterCode);
        }
        for (int twoCount = 0; twoCount <= twos.size() && 2 * twoCount <= credits; twoCount++) {
            int rest = credits - 2 * twoCount;
            if (rest % 3 == 0 && rest / 3 <= threes.size()) {
                List<PlannedCourseItem> courses = new ArrayList<>();
                for (Course course : threes.subList(0, rest / 3)) {
                    courses.add(new PlannedCourseItem(course.code(), course.name(), course.credits(), "B", rationale));
                }
                for (Course course : twos.subList(0, twoCount)) {
                    courses.add(new PlannedCourseItem(course.code(), course.name(), course.credits(), "B", rationale));
                }
                return courses;
            }
        }
        throw new IllegalArgumentException("Không ghép được " + credits + " TC cho học kỳ " + semesterCode);
    }
}
