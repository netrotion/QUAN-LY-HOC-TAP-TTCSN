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
    NOT_IMPLEMENTED,
    /** 401: chưa đăng nhập hoặc phiên đã hết hạn. */
    UNAUTHENTICATED,
    /** 401: sai mã sinh viên hoặc mật khẩu. */
    INVALID_CREDENTIALS,
    /** 403: thiếu/sai CSRF token hoặc tài khoản không có vai trò STUDENT. */
    ACCESS_DENIED,
    /** 409: mã sinh viên đã có tài khoản. */
    ACCOUNT_ALREADY_EXISTS,
    /** 400: curriculumId không tồn tại. */
    CURRICULUM_NOT_FOUND,
    /** 404: không có chuẩn đầu ra với requirementCode này. */
    REQUIREMENT_NOT_FOUND,
    /** 404: không có phiên nhập thuộc sinh viên đang đăng nhập. */
    IMPORT_SESSION_NOT_FOUND,
    /** 409: phiên nhập đã xác nhận, hủy hoặc hết hạn. */
    IMPORT_SESSION_CLOSED,
    /** 409: sessionVersion client gửi khác phiên bản đang lưu. */
    IMPORT_VERSION_CONFLICT,
    /** 422: còn dòng có vấn đề chặn hoặc không có dòng nào để xác nhận; details liệt kê dòng. */
    IMPORT_HAS_BLOCKING_ISSUES,
    /** 429: đã có quá nhiều phiên nhập đang chờ xem lại. */
    IMPORT_LIMIT_REACHED,
    /** 413: file vượt giới hạn dung lượng hoặc số trang. */
    UPLOAD_TOO_LARGE,
    /** 415: file không phải PDF, PNG hoặc JPEG (kiểm tra theo nội dung, không theo đuôi file). */
    UNSUPPORTED_FILE_TYPE,
    /** 503: công cụ học vụ cần cho thao tác chưa là công cụ thật (stub NOT_READY); thử lại sau khi được nối. */
    TOOL_NOT_READY,
    /** 404: không có hội thoại thuộc sinh viên đang đăng nhập. */
    CONVERSATION_NOT_FOUND
}
