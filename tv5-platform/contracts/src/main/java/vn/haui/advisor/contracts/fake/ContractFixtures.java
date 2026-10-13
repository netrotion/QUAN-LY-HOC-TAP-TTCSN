package vn.haui.advisor.contracts.fake;

import com.fasterxml.jackson.databind.ObjectMapper;
import vn.haui.advisor.contracts.ContractsJson;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;

/**
 * Đọc JSON fixtures của contracts-v1 từ classpath (đóng gói trong jar haui-contracts tại
 * {@code contracts-v1/examples/}). Mỗi lần gọi trả về một bản sao mới để phía dùng tự do sửa.
 */
public final class ContractFixtures {

    /** Sinh viên demo dùng xuyên suốt mọi fixture; trùng hồ sơ trong tv4-academic/fixtures/student-profiles-v1.json. */
    public static final String DEMO_STUDENT_ID = "2024604757";
    /** dataRevision hiện hành của sinh viên demo trong mọi fixture. */
    public static final String DEMO_DATA_REVISION = "REV-2024604757-001";

    private static final String CLASSPATH_ROOT = "contracts-v1/examples/";
    private static final ObjectMapper MAPPER = ContractsJson.mapper();

    private ContractFixtures() {
    }

    public static <T> T load(String fileName, Class<T> type) {
        String resource = CLASSPATH_ROOT + fileName;
        try (InputStream in = ContractFixtures.class.getClassLoader().getResourceAsStream(resource)) {
            if (in == null) {
                throw new IllegalArgumentException("Không tìm thấy fixture trên classpath: " + resource);
            }
            return MAPPER.readValue(in, type);
        } catch (IOException e) {
            throw new UncheckedIOException("Không đọc được fixture " + resource, e);
        }
    }
}
