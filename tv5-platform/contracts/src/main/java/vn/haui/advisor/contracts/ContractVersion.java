package vn.haui.advisor.contracts;

/**
 * Phiên bản hợp đồng đang phát hành. Mọi thay đổi schema sau mốc contracts-v1 phải tăng
 * phiên bản này, ghi CHANGELOG và cập nhật contracts-v1.lock.json trong PR của TV5.
 */
public final class ContractVersion {

    public static final String MILESTONE = "contracts-v1";
    public static final String CURRENT = "1.5.0";

    private ContractVersion() {
    }
}
