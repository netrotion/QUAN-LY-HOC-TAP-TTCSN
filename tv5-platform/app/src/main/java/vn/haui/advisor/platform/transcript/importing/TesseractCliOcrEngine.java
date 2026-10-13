package vn.haui.advisor.platform.transcript.importing;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

/**
 * OCR qua Tesseract CLI ({@code tesseract <ảnh> stdout -l vie+eng tsv}); độ tin cậy dòng = trung bình conf các từ.
 * Ảnh ghi ra file tạm và xóa ngay sau khi đọc; không gọi dịch vụ bên ngoài.
 */
public class TesseractCliOcrEngine implements OcrEngine {

    private final String command;
    private final String languages;
    private final Duration timeout;

    public TesseractCliOcrEngine(String command, String languages, Duration timeout) {
        this.command = command;
        this.languages = languages;
        this.timeout = timeout;
    }

    @Override
    public boolean isAvailable() {
        return true;
    }

    @Override
    public List<TextLine> recognize(List<BufferedImage> pages) {
        List<TextLine> lines = new ArrayList<>();
        for (BufferedImage page : pages) {
            lines.addAll(recognizePage(page));
        }
        return lines;
    }

    private List<TextLine> recognizePage(BufferedImage page) {
        Path image = null;
        try {
            image = Files.createTempFile("haui-ocr-", ".png");
            ImageIO.write(page, "png", image.toFile());
            Process process = new ProcessBuilder(command, image.toString(), "stdout", "-l", languages, "tsv").start();
            CompletableFuture<String> stdout = CompletableFuture.supplyAsync(() -> readAll(process.getInputStream()));
            CompletableFuture.runAsync(() -> readAll(process.getErrorStream()));
            if (!process.waitFor(timeout.toMillis(), TimeUnit.MILLISECONDS)) {
                process.destroyForcibly();
                throw new OcrException("OCR quá thời gian " + timeout.toSeconds() + " giây", null);
            }
            if (process.exitValue() != 0) {
                throw new OcrException("Tesseract kết thúc với mã " + process.exitValue(), null);
            }
            return parseTsv(stdout.get(5, TimeUnit.SECONDS));
        } catch (OcrException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new OcrException("Không chạy được OCR: " + ex.getMessage(), ex);
        } finally {
            if (image != null) {
                try {
                    Files.deleteIfExists(image);
                } catch (IOException ignored) {
                    // file tạm sẽ được hệ điều hành dọn
                }
            }
        }
    }

    /** Gom từ (level 5) theo dòng (page, block, par, line). */
    static List<TextLine> parseTsv(String tsv) {
        Map<String, StringBuilder> texts = new LinkedHashMap<>();
        Map<String, double[]> confidences = new LinkedHashMap<>();
        for (String row : tsv.split("\\R")) {
            String[] cols = row.split("\t", -1);
            if (cols.length < 12 || !"5".equals(cols[0]) || cols[11].isBlank()) {
                continue;
            }
            String key = cols[1] + "/" + cols[2] + "/" + cols[3] + "/" + cols[4];
            StringBuilder text = texts.computeIfAbsent(key, k -> new StringBuilder());
            if (!text.isEmpty()) {
                text.append(' ');
            }
            text.append(cols[11].trim());
            double conf = parseDouble(cols[10]);
            if (conf >= 0) {
                double[] acc = confidences.computeIfAbsent(key, k -> new double[2]);
                acc[0] += conf;
                acc[1] += 1;
            }
        }
        List<TextLine> lines = new ArrayList<>();
        texts.forEach((key, text) -> {
            double[] acc = confidences.get(key);
            BigDecimal confidence = acc == null || acc[1] == 0 ? null
                    : BigDecimal.valueOf(acc[0] / acc[1] / 100.0).setScale(2, RoundingMode.HALF_UP);
            lines.add(new TextLine(text.toString(), confidence));
        });
        return lines;
    }

    private static double parseDouble(String value) {
        try {
            return Double.parseDouble(value.trim());
        } catch (NumberFormatException ex) {
            return -1;
        }
    }

    private static String readAll(InputStream in) {
        try (in) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException ex) {
            return "";
        }
    }
}
