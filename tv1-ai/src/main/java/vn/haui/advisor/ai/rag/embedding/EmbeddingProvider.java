package vn.haui.advisor.ai.rag.embedding;

import java.util.ArrayList;
import java.util.List;

/**
 * Cung cấp dịch vụ trích xuất vector nhúng (vector embedding) cho văn bản.
 */
public interface EmbeddingProvider {

    /**
     * Chuyển đổi một đoạn văn bản thành vector embedding số thực float[].
     *
     * @param text văn bản cần tạo vector nhúng (không được null hoặc blank)
     * @return mảng float[] biểu diễn vector nhúng
     */
    float[] embed(String text);

    /**
     * Chuyển đổi danh sách văn bản thành danh sách vector embedding tương ứng.
     *
     * @param texts danh sách các chuỗi văn bản cần tạo vector nhúng
     * @return danh sách các mảng float[] cùng thứ tự
     */
    default List<float[]> embedAll(List<String> texts) {
        if (texts == null) {
            throw new IllegalArgumentException("texts must not be null");
        }
        List<float[]> results = new ArrayList<>(texts.size());
        for (String text : texts) {
            results.add(embed(text));
        }
        return results;
    }

    /**
     * Kích thước chiều không gian của vector nhúng (ví dụ: 128, 384, 1536).
     */
    int getDimension();

    /**
     * Tên mô hình embedding đang được sử dụng (ví dụ: "deterministic-fake-vietnamese-384").
     */
    String getModelName();
}
