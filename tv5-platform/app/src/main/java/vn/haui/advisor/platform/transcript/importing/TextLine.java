package vn.haui.advisor.platform.transcript.importing;

import java.math.BigDecimal;

/**
 * Một dòng chữ đọc từ tài liệu. confidence: độ tin cậy OCR 0..1, null với PDF có lớp chữ.
 */
public record TextLine(String text, BigDecimal confidence) {

    public static TextLine of(String text) {
        return new TextLine(text, null);
    }
}
