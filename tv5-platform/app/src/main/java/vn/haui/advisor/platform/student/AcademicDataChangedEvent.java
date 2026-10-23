package vn.haui.advisor.platform.student;

/**
 * Dữ liệu học vụ của sinh viên vừa đổi phiên bản (xác nhận bảng điểm, khai báo chứng chỉ, đổi CTĐT).
 * Phát trong giao dịch tăng dataRevision; người nhận xử lý sau khi giao dịch commit.
 */
public record AcademicDataChangedEvent(String studentId, String dataRevision) {
}
