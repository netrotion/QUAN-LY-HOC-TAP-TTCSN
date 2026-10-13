package vn.haui.advisor.platform.transcript.importing;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.contracts.dto.TranscriptSourceType;
import vn.haui.advisor.platform.config.ImportProperties;
import vn.haui.advisor.platform.error.ApiException;
import vn.haui.advisor.platform.support.TranscriptFiles;

import java.awt.image.BufferedImage;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Đọc file bảng điểm: loại file theo nội dung, PDF text/scan, ảnh, OCR, giới hạn")
class TranscriptDocumentReaderTest {

    /** OCR giả: trả một dòng điểm cho mỗi trang, ghi lại số trang đã nhận. */
    static class RecordingOcr implements OcrEngine {
        final List<Integer> pages = new ArrayList<>();

        @Override
        public boolean isAvailable() {
            return true;
        }

        @Override
        public List<TextLine> recognize(List<BufferedImage> images) {
            pages.add(images.size());
            return List.of(new TextLine("Học kỳ 1 năm học 2024-2025", new BigDecimal("0.97")),
                    new TextLine("IT6015 Kỹ thuật lập trình 3 9.3 A", new BigDecimal("0.62")));
        }
    }

    private final ImportProperties properties = new ImportProperties();

    @Test
    @DisplayName("PDF có lớp chữ đọc bằng parser, không gọi OCR")
    void textPdfUsesTextLayer() {
        RecordingOcr ocr = new RecordingOcr();
        var result = new TranscriptDocumentReader(properties, ocr)
                .read(TranscriptFiles.textPdf(List.of("Hoc ky 1 nam hoc 2024-2025", "IT6015 Ky thuat lap trinh 3 9.3 A")));

        assertThat(result.sourceType()).isEqualTo(TranscriptSourceType.PDF_TEXT);
        assertThat(result.lines()).anyMatch(line -> line.text().contains("IT6015"));
        assertThat(ocr.pages).isEmpty();
    }

    @Test
    @DisplayName("PDF scan và ảnh đi qua OCR khi được cấu hình")
    void scannedPdfAndImageUseOcr() {
        RecordingOcr ocr = new RecordingOcr();
        TranscriptDocumentReader reader = new TranscriptDocumentReader(properties, ocr);

        var scanned = reader.read(TranscriptFiles.scannedPdf());
        assertThat(scanned.sourceType()).isEqualTo(TranscriptSourceType.PDF_SCANNED);
        assertThat(scanned.lines()).hasSize(2);

        var image = reader.read(TranscriptFiles.png(300, 120));
        assertThat(image.sourceType()).isEqualTo(TranscriptSourceType.IMAGE);
        assertThat(image.manualReason()).isNull();
        assertThat(ocr.pages).containsExactly(1, 1);
    }

    @Test
    @DisplayName("OCR chưa cấu hình: chuyển nhập tay, không đoán nội dung")
    void disabledOcrFallsBackToManualEntry() {
        TranscriptDocumentReader reader = new TranscriptDocumentReader(properties, new DisabledOcrEngine());
        var result = reader.read(TranscriptFiles.png(300, 120));
        assertThat(result.lines()).isEmpty();
        assertThat(result.manualReason()).contains("OCR chưa được cấu hình");
    }

    @Test
    @DisplayName("Loại file theo magic bytes: đổi đuôi .pdf không qua được; PDF quá số trang và ảnh quá lớn bị chặn")
    void rejectsByContentAndLimits() {
        TranscriptDocumentReader reader = new TranscriptDocumentReader(properties, new RecordingOcr());

        assertThatThrownBy(() -> reader.read("MZ fake executable".getBytes(StandardCharsets.UTF_8)))
                .isInstanceOfSatisfying(ApiException.class, ex -> assertThat(ex.getStatus().value()).isEqualTo(415));
        assertThatThrownBy(() -> reader.read("%PDF-1.7 hỏng".getBytes(StandardCharsets.UTF_8)))
                .isInstanceOfSatisfying(ApiException.class, ex -> assertThat(ex.getStatus().value()).isEqualTo(415));
        assertThatThrownBy(() -> reader.read(TranscriptFiles.blankPdf(properties.getMaxPages() + 1)))
                .isInstanceOfSatisfying(ApiException.class, ex -> assertThat(ex.getStatus().value()).isEqualTo(413));

        properties.setMaxImagePixels(10_000);
        assertThatThrownBy(() -> reader.read(TranscriptFiles.png(200, 200)))
                .isInstanceOfSatisfying(ApiException.class, ex -> assertThat(ex.getStatus().value()).isEqualTo(413));
    }

    @Test
    @DisplayName("Kết quả TSV của Tesseract được gom theo dòng với độ tin cậy trung bình")
    void parsesTesseractTsv() {
        String tsv = String.join("\n",
                "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext",
                "5\t1\t1\t1\t1\t1\t0\t0\t10\t10\t90\tIT6015",
                "5\t1\t1\t1\t1\t2\t0\t0\t10\t10\t70\tKy",
                "4\t1\t1\t1\t2\t0\t0\t0\t10\t10\t-1\t",
                "5\t1\t1\t1\t2\t1\t0\t0\t10\t10\t95\tCPA:");
        List<TextLine> lines = TesseractCliOcrEngine.parseTsv(tsv);
        assertThat(lines).extracting(TextLine::text).containsExactly("IT6015 Ky", "CPA:");
        assertThat(lines.get(0).confidence()).isEqualByComparingTo("0.80");
    }
}
