package vn.haui.advisor.platform.academic;

import vn.haui.advisor.contracts.dto.PlannedSemesterItem;

import java.util.List;
import java.util.Optional;

/**
 * Nội dung kế hoạch đã lưu của sinh viên (học kỳ, học phần), để engine đối chiếu kết quả học kỳ với đúng kế hoạch đó.
 * Không có kế hoạch thuộc sinh viên này thì trả rỗng.
 */
@FunctionalInterface
public interface StoredPlanSource {

    Optional<List<PlannedSemesterItem>> semesters(String studentId, String planId);
}
