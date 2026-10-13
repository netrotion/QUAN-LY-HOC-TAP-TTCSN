package vn.haui.advisor.contracts.dto;

/**
 * Nguồn của trạng thái chứng chỉ. Hệ thống không xác minh với trường.
 */
public enum CertificateVerification {
    /** Sinh viên tự khai báo */
    SELF_DECLARED,
    /** Dữ liệu demo seed từ fixture TV4 */
    DEMO_SEED,
    /** Chưa có khai báo */
    NOT_DECLARED
}
