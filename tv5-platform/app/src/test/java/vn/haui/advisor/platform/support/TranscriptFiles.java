package vn.haui.advisor.platform.support;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;

/**
 * Sinh file bảng điểm thật cho test: PDF có lớp chữ (font Helvetica, nội dung không dấu), PDF scan (chỉ có ảnh),
 * PDF nhiều trang và ảnh PNG.
 */
public final class TranscriptFiles {

    private TranscriptFiles() {
    }

    public static byte[] textPdf(List<String> lines) {
        try (PDDocument document = new PDDocument()) {
            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            int perPage = 45;
            for (int start = 0; start < lines.size(); start += perPage) {
                PDPage page = new PDPage(PDRectangle.A4);
                document.addPage(page);
                try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                    content.beginText();
                    content.setFont(font, 10);
                    content.setLeading(14);
                    content.newLineAtOffset(40, 800);
                    for (String line : lines.subList(start, Math.min(lines.size(), start + perPage))) {
                        content.showText(line);
                        content.newLine();
                    }
                    content.endText();
                }
            }
            return save(document);
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    public static byte[] blankPdf(int pages) {
        try (PDDocument document = new PDDocument()) {
            for (int i = 0; i < pages; i++) {
                document.addPage(new PDPage(PDRectangle.A4));
            }
            return save(document);
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    /** PDF chỉ có ảnh, không có lớp chữ (giống bản scan). */
    public static byte[] scannedPdf() {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            PDImageXObject image = LosslessFactory.createFromImage(document, image(400, 200));
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.drawImage(image, 40, 500, 400, 200);
            }
            return save(document);
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    public static byte[] png(int width, int height) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ImageIO.write(image(width, height), "png", out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    private static BufferedImage image(int width, int height) {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g = image.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, width, height);
        g.setColor(Color.BLACK);
        g.drawString("IT6015 Ky thuat lap trinh 3 9.3 A", 10, 30);
        g.dispose();
        return image;
    }

    private static byte[] save(PDDocument document) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        document.save(out);
        return out.toByteArray();
    }
}
