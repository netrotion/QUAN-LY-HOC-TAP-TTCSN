package vn.haui.advisor.ai.rag.vector;

/**
 * Ngoại lệ xảy ra trong các thao tác lưu trữ, truy vấn hoặc quản trị Vector Store.
 */
public class VectorStoreException extends RuntimeException {

    public VectorStoreException(String message) {
        super(message);
    }

    public VectorStoreException(String message, Throwable cause) {
        super(message, cause);
    }
}
