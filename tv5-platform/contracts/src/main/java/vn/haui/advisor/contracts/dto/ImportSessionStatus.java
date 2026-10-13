package vn.haui.advisor.contracts.dto;

/**
 * Vòng đời phiên nhập bảng điểm: chỉ CONFIRMED mới ghi vào bảng điểm chính thức.
 */
public enum ImportSessionStatus {
    /** Đã đọc được dòng điểm, chờ sinh viên xem lại */
    REVIEW_REQUIRED,
    /** Parser/OCR không đọc được, chờ nhập tay */
    MANUAL_ENTRY_REQUIRED,
    /** Sinh viên đã xác nhận, bảng điểm chính thức đã được thay */
    CONFIRMED,
    /** Sinh viên hủy, không ghi gì */
    CANCELLED,
    /** Quá hạn xem lại, không ghi gì */
    EXPIRED
}
