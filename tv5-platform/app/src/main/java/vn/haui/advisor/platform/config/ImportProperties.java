package vn.haui.advisor.platform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * Giới hạn và cấu hình nhập bảng điểm ({@code haui.import.*}).
 */
@ConfigurationProperties(prefix = "haui.import")
public class ImportProperties {

    /** Dung lượng tối đa của file tải lên (byte). */
    private long maxFileBytes = 5L * 1024 * 1024;
    /** Số trang PDF tối đa. */
    private int maxPages = 10;
    /** Số điểm ảnh tối đa của một ảnh/trang render (chống ảnh nén quá lớn). */
    private long maxImagePixels = 40_000_000L;
    /** Số dòng tối đa của một phiên nhập. */
    private int maxRows = 300;
    /** Số phiên đang chờ xem lại/nhập tay tối đa của một sinh viên. */
    private int maxOpenSessions = 3;
    /** Thời gian giữ phiên chờ xem lại trước khi hết hạn. */
    private Duration sessionTtl = Duration.ofHours(24);
    private final Ocr ocr = new Ocr();

    public static class Ocr {
        /** disabled | tesseract. Mặc định tắt: ảnh/PDF scan chuyển sang nhập tay. */
        private String engine = "disabled";
        /** Lệnh tesseract (đường dẫn đầy đủ nếu không nằm trong PATH). */
        private String command = "tesseract";
        private String languages = "vie+eng";
        private Duration timeout = Duration.ofSeconds(60);
        /** Độ phân giải render trang PDF scan trước khi OCR. */
        private int renderDpi = 200;

        public String getEngine() {
            return engine;
        }

        public void setEngine(String engine) {
            this.engine = engine;
        }

        public String getCommand() {
            return command;
        }

        public void setCommand(String command) {
            this.command = command;
        }

        public String getLanguages() {
            return languages;
        }

        public void setLanguages(String languages) {
            this.languages = languages;
        }

        public Duration getTimeout() {
            return timeout;
        }

        public void setTimeout(Duration timeout) {
            this.timeout = timeout;
        }

        public int getRenderDpi() {
            return renderDpi;
        }

        public void setRenderDpi(int renderDpi) {
            this.renderDpi = renderDpi;
        }
    }

    public long getMaxFileBytes() {
        return maxFileBytes;
    }

    public void setMaxFileBytes(long maxFileBytes) {
        this.maxFileBytes = maxFileBytes;
    }

    public int getMaxPages() {
        return maxPages;
    }

    public void setMaxPages(int maxPages) {
        this.maxPages = maxPages;
    }

    public long getMaxImagePixels() {
        return maxImagePixels;
    }

    public void setMaxImagePixels(long maxImagePixels) {
        this.maxImagePixels = maxImagePixels;
    }

    public int getMaxRows() {
        return maxRows;
    }

    public void setMaxRows(int maxRows) {
        this.maxRows = maxRows;
    }

    public int getMaxOpenSessions() {
        return maxOpenSessions;
    }

    public void setMaxOpenSessions(int maxOpenSessions) {
        this.maxOpenSessions = maxOpenSessions;
    }

    public Duration getSessionTtl() {
        return sessionTtl;
    }

    public void setSessionTtl(Duration sessionTtl) {
        this.sessionTtl = sessionTtl;
    }

    public Ocr getOcr() {
        return ocr;
    }
}
