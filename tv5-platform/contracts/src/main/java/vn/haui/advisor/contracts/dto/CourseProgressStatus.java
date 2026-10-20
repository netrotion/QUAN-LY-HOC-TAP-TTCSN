package vn.haui.advisor.contracts.dto;

/**
 * Trạng thái một học phần trên cây CTĐT của sinh viên ({@code GET /academic/curriculum/tree}).
 * Kết quả học phần theo quy tắc điểm của công cụ học vụ (TV4); điều kiện đăng ký do AcademicFacade tính.
 */
public enum CourseProgressStatus {
    /** Đã đạt ít nhất một lần học */
    PASSED,
    /** Đã học, chưa đạt lần nào; lần gần nhất không đạt */
    FAILED,
    /** Lần học gần nhất chưa có điểm (đang học) */
    IN_PROGRESS,
    /** Chưa học, AcademicFacade xác nhận đủ điều kiện đăng ký */
    ELIGIBLE,
    /** Chưa học, còn thiếu điều kiện (missingPrerequisites) */
    BLOCKED,
    /** Không xác định: chưa có bảng điểm đã xác nhận hoặc điểm không đọc được theo quy tắc */
    UNKNOWN
}
