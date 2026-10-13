package vn.haui.advisor.contracts.dto;

/**
 * Trạng thái runtime của một công cụ học vụ mà platform đã nối vào endpoint.
 */
public enum AcademicToolStatus {
    /** Công cụ thật: implementation khai báo trong AcademicFacade.readyCapabilities() */
    READY,
    /** Chưa có công cụ thật; dev/test đang bật kết quả thử (không bao giờ dẫn tới thao tác có hậu quả) */
    MOCK,
    /** Chưa có công cụ thật; endpoint trả 503 TOOL_NOT_READY hoặc 501 NOT_IMPLEMENTED */
    NOT_READY
}
