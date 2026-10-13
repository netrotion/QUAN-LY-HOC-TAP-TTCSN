package vn.haui.advisor.ai.rag.vector;

import vn.haui.advisor.ai.rag.model.RagChunk;

import java.util.List;
import java.util.Optional;

/**
 * Giao diện định nghĩa các thao tác lưu trữ, cập nhật, xóa và truy vấn tương đồng ngữ nghĩa Vector.
 */
public interface VectorStore {

    /**
     * Chèn mới hoặc cập nhật các chunks kèm vector embedding tương ứng (idempotent).
     *
     * @param chunks  danh sách các {@link RagChunk}
     * @param vectors danh sách các vector float[] tương ứng cùng độ dài
     */
    void upsert(List<RagChunk> chunks, List<float[]> vectors);

    /**
     * Tìm kiếm top-K các chunk có cosine similarity gần nhất với vector truy vấn,
     * hỗ trợ lọc theo minScore, sourceId và version.
     *
     * @param query đối tượng {@link VectorSearchQuery}
     * @return danh sách kết quả {@link VectorSearchResult} sắp xếp giảm dần theo điểm tương đồng
     */
    List<VectorSearchResult> search(VectorSearchQuery query);

    /**
     * Xóa toàn bộ các chunks thuộc nguồn tài liệu chỉ định.
     *
     * @param sourceId định danh nguồn (ví dụ: "ha-ui-academic-regulations")
     */
    void deleteBySourceId(String sourceId);

    /**
     * Tổng số lượng chunks hiện đang được lưu trữ.
     */
    long count();

    /**
     * Tìm kiếm chi tiết một chunk theo mã chunkId.
     *
     * @param chunkId mã định danh duy nhất của chunk
     * @return {@link Optional} chứa chunk nếu tồn tại
     */
    Optional<RagChunk> findById(String chunkId);
}
