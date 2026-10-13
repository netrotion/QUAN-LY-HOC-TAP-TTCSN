package vn.haui.advisor.ai.rag.ingestion;

import vn.haui.advisor.ai.rag.model.CatalogSourceEntry;
import vn.haui.advisor.ai.rag.model.RagDocument;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Đọc tài liệu Markdown bảo toàn 100% tiếng Việt UTF-8 và xử lý ngoại lệ an toàn khi gặp file thiếu, rỗng hoặc đường dẫn không hợp lệ.
 */
public class MarkdownDocumentReader {

    private final RagCatalogReader catalogReader;

    public MarkdownDocumentReader() {
        this(new RagCatalogReader());
    }

    public MarkdownDocumentReader(RagCatalogReader catalogReader) {
        this.catalogReader = catalogReader;
    }

    /**
     * Đọc tài liệu từ CatalogSourceEntry bằng cách tự động phân giải đường dẫn qua RagCatalogReader.
     */
    public Optional<RagDocument> readDocument(CatalogSourceEntry entry) {
        if (entry == null) {
            return Optional.empty();
        }
        try {
            Path path = catalogReader.resolveDocumentPath(entry);
            return readDocument(entry, path);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    /**
     * Đọc tài liệu Markdown từ file cụ thể, bảo toàn 100% tiếng Việt UTF-8.
     * Xử lý an toàn không gây crash nếu file bị thiếu, rỗng, là thư mục hoặc lỗi I/O.
     */
    public Optional<RagDocument> readDocument(CatalogSourceEntry entry, Path filePath) {
        if (entry == null || filePath == null) {
            return Optional.empty();
        }

        try {
            if (!Files.exists(filePath) || !Files.isRegularFile(filePath)) {
                return Optional.empty();
            }

            if (Files.size(filePath) == 0) {
                return Optional.empty();
            }

            // Đọc nội dung với StandardCharsets.UTF_8 để bảo toàn dấu tiếng Việt
            String content = Files.readString(filePath, StandardCharsets.UTF_8);
            if (content.isBlank()) {
                return Optional.empty();
            }

            Map<String, Object> metadata = new HashMap<>();
            metadata.put("sections", entry.getSections());
            metadata.put("source_status", entry.getSourceStatus());
            metadata.put("rag_enabled", entry.isRagEnabled());
            metadata.put("char_count", content.length());
            metadata.put("file_name", filePath.getFileName().toString());

            RagDocument doc = new RagDocument(
                    entry.getSourceId(),
                    entry.getTitle(),
                    entry.getPath(),
                    entry.getVersion(),
                    content,
                    entry.getReferenceUrl(),
                    metadata
            );

            return Optional.of(doc);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    /**
     * Đọc nội dung chuỗi văn bản UTF-8 an toàn từ Path.
     */
    public Optional<String> readContent(Path filePath) {
        if (filePath == null || !Files.exists(filePath) || !Files.isRegularFile(filePath)) {
            return Optional.empty();
        }
        try {
            String content = Files.readString(filePath, StandardCharsets.UTF_8);
            return content.isBlank() ? Optional.empty() : Optional.of(content);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    /**
     * Đọc nội dung chuỗi văn bản UTF-8 an toàn từ InputStream.
     */
    public Optional<String> readContent(InputStream inputStream) {
        if (inputStream == null) {
            return Optional.empty();
        }
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
            String content = sb.toString().trim();
            return content.isBlank() ? Optional.empty() : Optional.of(content);
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}
