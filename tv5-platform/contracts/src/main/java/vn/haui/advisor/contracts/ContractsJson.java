package vn.haui.advisor.contracts;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

/**
 * Cấu hình Jackson chuẩn của contracts-v1: thời gian dạng ISO-8601, giữ nguyên giá trị null
 * (null = thiếu dữ liệu/UNKNOWN) và từ chối trường lạ để fixture không lệch khỏi DTO.
 * Dùng chung cho contract test, fake provider và phía sử dụng muốn đọc fixture.
 */
public final class ContractsJson {

    private ContractsJson() {
    }

    public static ObjectMapper mapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        mapper.enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
        return mapper;
    }
}
