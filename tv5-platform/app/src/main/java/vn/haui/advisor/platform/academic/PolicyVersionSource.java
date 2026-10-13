package vn.haui.advisor.platform.academic;

/**
 * Phiên bản quy chế học vụ đang áp dụng. Ghi kèm mỗi lần thẩm định thật; đổi quy chế thì kế hoạch phải được
 * thẩm định lại trên quy chế mới trước khi kích hoạt.
 */
public interface PolicyVersionSource {

    String currentPolicyVersion();
}
