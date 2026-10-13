package vn.haui.advisor.contracts.dto;

/**
 * Nguồn kết quả thẩm định kế hoạch.
 */
public enum ValidationMode {
    /** Công cụ thẩm định thật đã khai báo sẵn sàng; kết quả hợp lệ chuyển kế hoạch sang VALIDATED */
    REAL,
    /** Thẩm định thử (chỉ ở dev/test) khi công cụ thật chưa sẵn sàng; không bao giờ đưa kế hoạch tới VALIDATED/ACTIVE */
    MOCK
}
