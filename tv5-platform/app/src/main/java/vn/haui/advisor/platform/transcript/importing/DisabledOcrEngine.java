package vn.haui.advisor.platform.transcript.importing;

import java.awt.image.BufferedImage;
import java.util.List;

/**
 * Mặc định khi chưa cấu hình OCR: ảnh và PDF scan chuyển sang nhập tay, không đoán nội dung.
 */
public class DisabledOcrEngine implements OcrEngine {

    @Override
    public boolean isAvailable() {
        return false;
    }

    @Override
    public List<TextLine> recognize(List<BufferedImage> pages) {
        throw new OcrException("OCR chưa được cấu hình (haui.import.ocr.engine=disabled)", null);
    }
}
