package vn.haui.advisor.contracts.dto;

/**
 * Vấn đề phát hiện trên một dòng nhập bảng điểm; trường blocking quyết định có chặn xác nhận hay không.
 */
public enum ImportIssueCode {
    /** Mã học phần không có trong CTĐT (chặn) */
    UNKNOWN_COURSE_CODE,
    /** Dòng có dấu hiệu là học phần nhưng không đọc đủ (chặn) */
    UNREADABLE_ROW,
    /** Thiếu hoặc sai mã học kỳ (chặn) */
    INVALID_SEMESTER,
    /** Điểm hệ 10 hoặc điểm chữ không hợp lệ (chặn) */
    INVALID_SCORE,
    /** Trùng học phần trong cùng học kỳ (chặn) */
    DUPLICATE_ROW,
    /** Chưa có điểm, coi là đang học */
    MISSING_GRADE,
    /** Tên trên tài liệu khác tên trong CTĐT */
    COURSE_NAME_DIFFERS,
    /** Số tín chỉ trên tài liệu khác CTĐT */
    CREDITS_DIFFER,
    /** OCR không chắc chắn, cần đối chiếu */
    LOW_CONFIDENCE
}
