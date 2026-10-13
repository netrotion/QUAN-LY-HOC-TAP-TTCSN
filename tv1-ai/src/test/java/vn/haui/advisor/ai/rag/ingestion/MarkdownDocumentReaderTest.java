package vn.haui.advisor.ai.rag.ingestion;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import vn.haui.advisor.ai.rag.model.CatalogSourceEntry;
import vn.haui.advisor.ai.rag.model.RagDocument;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("MarkdownDocumentReader Tests")
class MarkdownDocumentReaderTest {

    private RagCatalogReader catalogReader;
    private MarkdownDocumentReader documentReader;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        catalogReader = new RagCatalogReader();
        documentReader = new MarkdownDocumentReader();
    }

    @Test
    @DisplayName("Should read markdown file and preserve 100% Vietnamese UTF-8 diacritics")
    void readDocument_fromValidFile_shouldPreserveVietnameseDiacritics() {
        CatalogSourceEntry entry = catalogReader.getSourceById("REG-HAUI-01");
        Path filePath = catalogReader.resolveDocumentPath(entry);

        Optional<RagDocument> docOpt = documentReader.readDocument(entry, filePath);

        assertThat(docOpt).isPresent();
        RagDocument doc = docOpt.get();

        assertThat(doc.getSourceId()).isEqualTo("REG-HAUI-01");
        assertThat(doc.getTitle()).isEqualTo(entry.getTitle());
        assertThat(doc.getVersion()).isEqualTo("gitblob:cab439dd3364");
        assertThat(doc.getReferenceUrl()).isEqualTo("https://sv.haui.edu.vn/quy-che/reg-haui-01");

        // Kiểm tra bảo toàn 100% tiếng Việt có dấu
        String content = doc.getContent();
        assertThat(content).contains("QUY CHẾ ĐÀO TẠO THEO HỆ THỐNG TÍN CHỈ — TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP HÀ NỘI (HaUI)");
        assertThat(content).contains("Tổ chức Đào tạo và Kế hoạch Học tập");
        assertThat(content).contains("Giới hạn Đăng ký Tín chỉ (Credit Limits)");
        assertThat(content).contains("Khảo sát và Đăng ký trước");
        assertThat(content).contains("Điều kiện Dự thi Kết thúc Học phần");
    }

    @Test
    @DisplayName("Should detect missing file safely without crashing and return empty")
    void readDocument_withMissingFile_shouldReturnEmptySafely() {
        CatalogSourceEntry entry = catalogReader.getSourceById("REG-HAUI-01");
        Path nonExistent = tempDir.resolve("non_existent_file.md");

        Optional<RagDocument> docOpt = documentReader.readDocument(entry, nonExistent);

        assertThat(docOpt).isEmpty();
    }

    @Test
    @DisplayName("Should detect empty file safely without crashing and return empty")
    void readDocument_withEmptyFile_shouldReturnEmptySafely() throws IOException {
        CatalogSourceEntry entry = catalogReader.getSourceById("REG-HAUI-01");
        Path emptyFile = tempDir.resolve("empty.md");
        Files.createFile(emptyFile);

        Optional<RagDocument> docOpt = documentReader.readDocument(entry, emptyFile);

        assertThat(docOpt).isEmpty();
    }

    @Test
    @DisplayName("Should detect invalid path (directory instead of file) safely without crashing")
    void readDocument_withDirectoryPath_shouldReturnEmptySafely() {
        CatalogSourceEntry entry = catalogReader.getSourceById("REG-HAUI-01");

        Optional<RagDocument> docOpt = documentReader.readDocument(entry, tempDir);

        assertThat(docOpt).isEmpty();
    }
}
