package vn.haui.advisor.contracts.dto;

/**
 * Mã lỗi nghiệp vụ dùng chung trong {@link ApiErrorResponse}.
 */
public enum ApiErrorCode {
    /** 400: body/tham số sai định dạng hoặc thiếu trường bắt buộc. */
    VALIDATION_ERROR,
    /** 404: không có kế hoạch thuộc sinh viên đang đăng nhập. */
    PLAN_NOT_FOUND,
    /** 409: dataRevision client gửi đã cũ so với dữ liệu học vụ hiện tại. */
    DATA_REVISION_STALE,
    /** 409: planVersion client gửi khác phiên bản đang lưu (optimistic lock). */
    PLAN_VERSION_CONFLICT,
    /** 409: kế hoạch ARCHIVED/COMPLETED không sửa trực tiếp; dùng restore. */
    PLAN_NOT_EDITABLE,
    /** 422: kích hoạt khi kế hoạch chưa ở trạng thái VALIDATED. */
    PLAN_NOT_VALIDATED,
    /** 422: thẩm định lại lúc kích hoạt phát hiện vi phạm; details chứa danh sách vi phạm. */
    PLAN_VALIDATION_FAILED,
    /** 501: capability chưa được triển khai ở runtime hiện tại. */
    NOT_IMPLEMENTED
}
