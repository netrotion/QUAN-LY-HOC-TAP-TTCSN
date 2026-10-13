package vn.haui.advisor.platform.transcript.importing;

import java.awt.image.BufferedImage;
import java.util.List;

/**
 * Bộ OCR cho ảnh và PDF scan. Khi không khả dụng hoặc lỗi, phiên nhập chuyển sang nhập tay.
 */
public interface OcrEngine {

    boolean isAvailable();

    /**
     * @param pages ảnh từng trang, theo thứ tự
     * @return các dòng chữ đọc được kèm độ tin cậy
     * @throws OcrException khi OCR lỗi hoặc quá thời gian
     */
    List<TextLine> recognize(List<BufferedImage> pages);

    class OcrException extends RuntimeException {
        public OcrException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
