package vn.haui.advisor.academic;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.academic.engine.GradeCalculator;
import vn.haui.advisor.academic.service.DefaultAcademicFacade;
import vn.haui.advisor.contracts.dto.AcademicStatusRequest;
import vn.haui.advisor.contracts.dto.AcademicStatusResponse;
import vn.haui.advisor.contracts.dto.CourseEligibilityRequest;
import vn.haui.advisor.contracts.dto.CourseEligibilityResponse;
import vn.haui.advisor.contracts.ports.AcademicFacade;

import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Task 1.3b: Kiểm thử tính nghiêm ngặt với dữ liệu thiếu hoặc không rõ ràng (Missing/Unknown Data)")
public class MissingDataStrictnessTest {

    private AcademicFacade academicFacade;

    @BeforeEach
    void setUp() {
        academicFacade = new DefaultAcademicFacade();
    }

    @Test
    @DisplayName("GPA bị thiếu hoặc chưa có điểm kết chuyển: Bắt buộc trả null, KHÔNG ĐƯỢC mặc định = 0.0")
    void testMissingGpaMustBeNullNotZero() {
        // Sinh viên std-2026-001 đang ở đầu kỳ 3, chưa có điểm GPA kỳ hiện tại
        AcademicStatusRequest req = new AcademicStatusRequest("std-2026-001", "rev-1001");
        AcademicStatusResponse res = academicFacade.getAcademicStatus(req);

        assertThat(res.getGpa())
                .as("RÀNG BUỘC: GPA chưa kết chuyển phải là null, không được gán 0.0")
                .isNull();
    }

    @Test
    @DisplayName("Hồ sơ sinh viên chưa có bất kỳ điểm nào (std-2026-missing): CPA/GPA phải là null, KHÔNG ĐƯỢC thành 0.0")
    void testMissingCpaAndGpaMustBeNullNotZero() {
        AcademicStatusRequest req = new AcademicStatusRequest("std-2026-missing", "rev-missing-001");
        AcademicStatusResponse res = academicFacade.getAcademicStatus(req);

        assertThat(res.getCpa())
                .as("CPA chưa có dữ liệu phải trả về null")
                .isNull();
        assertThat(res.getGpa())
                .as("GPA chưa có dữ liệu phải trả về null")
                .isNull();
    }

    @Test
    @DisplayName("Môn tiên quyết có điểm 'UNKNOWN' hoặc null: TUYỆT ĐỐI KHÔNG ĐƯỢC mặc định đánh giá là 'Đã đạt'")
    void testUnknownPrerequisiteMustNotDefaultToPassed() {
        // IT6001 yêu cầu môn tiên quyết MATH1002.
        // Với sinh viên std-2026-missing, MATH1002 có điểm là "UNKNOWN".
        CourseEligibilityRequest req = new CourseEligibilityRequest(
                "std-2026-missing", "IT6001", "2026_1", "rev-missing-001"
        );
        CourseEligibilityResponse res = academicFacade.checkCourseEligibility(req);

        assertThat(res.isEligible())
                .as("Môn tiên quyết chưa rõ kết quả thì sinh viên KHÔNG ĐƯỢC coi là đủ điều kiện")
                .isFalse();

        assertThat(res.getMissingPrerequisites())
                .as("Danh sách thiếu phải thể hiện rõ trạng thái UNKNOWN")
                .anyMatch(msg -> msg.contains("UNKNOWN") || msg.contains("chưa xác định"));

        assertThat(res.getWarnings())
                .as("Hệ thống phải cảnh báo rõ ràng về dữ liệu chưa xác định")
                .anyMatch(msg -> msg.contains("chưa có kết quả kết chuyển"));
    }

    @Test
    @DisplayName("GradeCalculator: Kiểm tra triệt để hàm chuyển đổi điểm với null và UNKNOWN")
    void testGradeCalculatorStrictNullSafety() {
        // Điểm chữ null hoặc UNKNOWN không được thành 0.0 (F mới là 0.0)
        assertThat(GradeCalculator.toGradePoint4(null)).isNull();
        assertThat(GradeCalculator.toGradePoint4("")).isNull();
        assertThat(GradeCalculator.toGradePoint4("   ")).isNull();
        assertThat(GradeCalculator.toGradePoint4("UNKNOWN")).isNull();
        assertThat(GradeCalculator.toGradePoint4("unknown")).isNull();
        assertThat(GradeCalculator.toGradePoint4("INVALID_GRADE")).isNull();

        // Kiểm tra đạt: null hoặc UNKNOWN trả null (chưa xác định), không được trả true
        assertThat(GradeCalculator.isPassed(null)).isNull();
        assertThat(GradeCalculator.isPassed("UNKNOWN")).isNull();
        assertThat(GradeCalculator.isPassed("")).isNull();

        // Điểm F là false (không đạt)
        assertThat(GradeCalculator.isPassed("F")).isFalse();

        // Điểm từ D trở lên mới là true
        assertThat(GradeCalculator.isPassed("D")).isTrue();
        assertThat(GradeCalculator.isPassed("A")).isTrue();

        // Danh sách rỗng hoặc không có điểm hợp lệ trả null
        assertThat(GradeCalculator.calculateGpa(Collections.emptyList())).isNull();
        assertThat(GradeCalculator.calculateCpa(Collections.emptyList())).isNull();
    }
}
