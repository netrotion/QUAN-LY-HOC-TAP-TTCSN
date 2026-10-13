package vn.haui.advisor.contracts.dto;

/**
 * Trạng thái chứng chỉ/chuẩn đầu ra do sinh viên tự khai báo (không phải xác nhận của trường).
 */
public enum CertificateStatus {
    /** Đã đạt */
    ACHIEVED,
    /** Chưa đạt */
    NOT_ACHIEVED,
    /** Chưa khai báo / không rõ */
    UNKNOWN
}
