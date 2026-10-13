package vn.haui.advisor.platform.transcript.importing;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Component;
import vn.haui.advisor.contracts.dto.TranscriptSourceType;
import vn.haui.advisor.platform.config.ImportProperties;
import vn.haui.advisor.platform.error.ApiException;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;

/**
 * Đọc chữ từ file bảng điểm: PDF có lớp chữ → PDFBox; PDF scan/ảnh → render rồi OCR.
 * Kiểm tra loại file theo nội dung (magic bytes), số trang và kích thước ảnh trước khi xử lý.
 */
@Component
public class TranscriptDocumentReader {

    /** PDF có ít hơn ngần này ký tự chữ/số coi như PDF scan. */
    private static final int MIN_TEXT_LAYER_CHARS = 40;

    private final ImportProperties properties;
    private final OcrEngine ocrEngine;

    public TranscriptDocumentReader(ImportProperties properties, OcrEngine ocrEngine) {
        this.properties = properties;
        this.ocrEngine = ocrEngine;
    }

    public enum FileKind { PDF, PNG, JPEG }

    /**
     * @param lines        dòng chữ đọc được (rỗng nếu cần nhập tay)
     * @param manualReason lý do chuyển nhập tay (null nếu đọc được)
     */
    public record ReadResult(TranscriptSourceType sourceType, String contentType, int pageCount, List<TextLine> lines,
                             String manualReason) {
    }

    public static FileKind detect(byte[] bytes) {
        if (startsWith(bytes, new byte[]{'%', 'P', 'D', 'F', '-'})) {
            return FileKind.PDF;
        }
        if (startsWith(bytes, new byte[]{(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A})) {
            return FileKind.PNG;
        }
        if (startsWith(bytes, new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF})) {
            return FileKind.JPEG;
        }
        throw ApiException.unsupportedFile("Nội dung file không phải PDF, PNG hoặc JPEG");
    }

    public ReadResult read(byte[] bytes) {
        FileKind kind = detect(bytes);
        return kind == FileKind.PDF ? readPdf(bytes) : readImage(bytes, kind);
    }

    private ReadResult readPdf(byte[] bytes) {
        try (PDDocument document = Loader.loadPDF(bytes)) {
            int pages = document.getNumberOfPages();
            if (pages > properties.getMaxPages()) {
                throw ApiException.uploadTooLarge("PDF có " + pages + " trang, tối đa " + properties.getMaxPages());
            }
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            String text = stripper.getText(document);
            if (hasTextLayer(text)) {
                List<TextLine> lines = Arrays.stream(text.split("\\R")).map(TextLine::of).toList();
                return new ReadResult(TranscriptSourceType.PDF_TEXT, "application/pdf", pages, lines, null);
            }
            if (!ocrEngine.isAvailable()) {
                return new ReadResult(TranscriptSourceType.PDF_SCANNED, "application/pdf", pages, List.of(),
                        "PDF không có lớp chữ (bản scan) và OCR chưa được cấu hình trên máy chủ.");
            }
            PDFRenderer renderer = new PDFRenderer(document);
            List<BufferedImage> images = new ArrayList<>();
            for (int i = 0; i < pages; i++) {
                checkPixels(document.getPage(i), properties.getOcr().getRenderDpi());
                images.add(renderer.renderImageWithDPI(i, properties.getOcr().getRenderDpi(), ImageType.GRAY));
            }
            return ocr(TranscriptSourceType.PDF_SCANNED, "application/pdf", pages, images);
        } catch (InvalidPasswordException ex) {
            throw ApiException.unsupportedFile("PDF được đặt mật khẩu");
        } catch (IOException ex) {
            throw ApiException.unsupportedFile("PDF hỏng hoặc không đọc được");
        }
    }

    private ReadResult readImage(byte[] bytes, FileKind kind) {
        String contentType = kind == FileKind.PNG ? "image/png" : "image/jpeg";
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                throw ApiException.unsupportedFile("Ảnh không đọc được");
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(input);
                long pixels = (long) reader.getWidth(0) * reader.getHeight(0);
                if (pixels > properties.getMaxImagePixels()) {
                    throw ApiException.uploadTooLarge("Ảnh " + reader.getWidth(0) + "x" + reader.getHeight(0) + " vượt giới hạn điểm ảnh");
                }
                if (!ocrEngine.isAvailable()) {
                    return new ReadResult(TranscriptSourceType.IMAGE, contentType, 1, List.of(),
                            "Ảnh bảng điểm cần OCR nhưng OCR chưa được cấu hình trên máy chủ.");
                }
                return ocr(TranscriptSourceType.IMAGE, contentType, 1, List.of(reader.read(0)));
            } finally {
                reader.dispose();
            }
        } catch (IOException ex) {
            throw ApiException.unsupportedFile("Ảnh hỏng hoặc không đọc được");
        }
    }

    private ReadResult ocr(TranscriptSourceType sourceType, String contentType, int pages, List<BufferedImage> images) {
        try {
            return new ReadResult(sourceType, contentType, pages, ocrEngine.recognize(images), null);
        } catch (OcrEngine.OcrException ex) {
            return new ReadResult(sourceType, contentType, pages, List.of(), "OCR không đọc được tài liệu: " + ex.getMessage());
        }
    }

    private void checkPixels(PDPage page, int dpi) {
        PDRectangle box = page.getMediaBox();
        long pixels = (long) (box.getWidth() / 72f * dpi) * (long) (box.getHeight() / 72f * dpi);
        if (pixels > properties.getMaxImagePixels()) {
            throw ApiException.uploadTooLarge("Trang PDF quá lớn để OCR");
        }
    }

    private static boolean hasTextLayer(String text) {
        long meaningful = text.chars().filter(Character::isLetterOrDigit).count();
        return meaningful >= MIN_TEXT_LAYER_CHARS;
    }

    private static boolean startsWith(byte[] bytes, byte[] prefix) {
        if (bytes.length < prefix.length) {
            return false;
        }
        for (int i = 0; i < prefix.length; i++) {
            if (bytes[i] != prefix[i]) {
                return false;
            }
        }
        return true;
    }
}
