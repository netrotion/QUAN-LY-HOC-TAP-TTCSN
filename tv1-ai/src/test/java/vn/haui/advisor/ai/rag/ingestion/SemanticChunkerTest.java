package vn.haui.advisor.ai.rag.ingestion;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.rag.model.CatalogSourceEntry;
import vn.haui.advisor.ai.rag.model.RagChunk;
import vn.haui.advisor.ai.rag.model.RagDocument;

import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("SemanticChunker Tests")
class SemanticChunkerTest {

    private RagCatalogReader catalogReader;
    private MarkdownDocumentReader documentReader;
    private SemanticChunker chunker;

    @BeforeEach
    void setUp() {
        catalogReader = new RagCatalogReader();
        documentReader = new MarkdownDocumentReader();
        chunker = new SemanticChunker(800, 100);
    }

    @Test
    @DisplayName("Should preserve section hierarchy (Level 2 > Subsection) correctly for REG-HAUI-01")
    void chunk_shouldPreserveHeadingHierarchy_forRegHaui01() {
        CatalogSourceEntry entry = catalogReader.getSourceById("REG-HAUI-01");
        Path path = catalogReader.resolveDocumentPath(entry);
        RagDocument doc = documentReader.readDocument(entry, path).orElseThrow();

        List<RagChunk> chunks = chunker.chunk(doc);

        assertThat(chunks).isNotEmpty();
        List<String> sections = chunks.stream().map(RagChunk::getSection).distinct().toList();

        assertThat(sections).contains(
                "1. Tổ chức Đào tạo và Kế hoạch Học tập > 1. Năm học và Học kỳ",
                "1. Tổ chức Đào tạo và Kế hoạch Học tập > 2. Giới hạn Đăng ký Tín chỉ (Credit Limits)",
                "2. Quy trình Đăng ký Học phần và Lớp học phần > 1. Khảo sát và Đăng ký trước",
                "2. Quy trình Đăng ký Học phần và Lớp học phần > 2. Rút và Hủy Học phần",
                "3. Điều kiện Dự thi Kết thúc Học phần"
        );
    }

    @Test
    @DisplayName("Should preserve Markdown table intact without breaking across chunks in REG-HAUI-02")
    void chunk_shouldPreserveMarkdownTableIntact_forRegHaui02() {
        CatalogSourceEntry entry = catalogReader.getSourceById("REG-HAUI-02");
        Path path = catalogReader.resolveDocumentPath(entry);
        RagDocument doc = documentReader.readDocument(entry, path).orElseThrow();

        // Sử dụng chunker với kích thước nhỏ hơn để kiểm tra tính toàn vẹn của bảng
        SemanticChunker smallChunker = new SemanticChunker(400, 50);
        List<RagChunk> chunks = smallChunker.chunk(doc);

        // Tìm chunk chứa bảng thang điểm
        List<RagChunk> tableChunks = chunks.stream()
                .filter(c -> c.getContent().contains("| Điểm học phần (Thang 10) |"))
                .toList();

        assertThat(tableChunks)
                .withFailMessage("Table must be present in exactly one chunk intact")
                .hasSize(1);

        RagChunk tableChunk = tableChunks.get(0);
        // Kiểm tra tất cả các hàng từ A đến F đều nằm trọn vẹn trong chunk đó
        assertThat(tableChunk.getContent()).contains("| **8.5 — 10.0** | **A** |");
        assertThat(tableChunk.getContent()).contains("| **8.0 — 8.4** | **B+** |");
        assertThat(tableChunk.getContent()).contains("| **7.0 — 7.9** | **B** |");
        assertThat(tableChunk.getContent()).contains("| **6.5 — 6.9** | **C+** |");
        assertThat(tableChunk.getContent()).contains("| **5.5 — 6.4** | **C** |");
        assertThat(tableChunk.getContent()).contains("| **5.0 — 5.4** | **D+** |");
        assertThat(tableChunk.getContent()).contains("| **4.0 — 4.9** | **D** |");
        assertThat(tableChunk.getContent()).contains("| **< 4.0** | **F** |");
    }

    @Test
    @DisplayName("Should preserve LaTeX formulas intact ($$ ... $$ and $ ... $) in REG-HAUI-02 and REG-HAUI-03")
    void chunk_shouldPreserveLatexFormulasIntact() {
        CatalogSourceEntry entry02 = catalogReader.getSourceById("REG-HAUI-02");
        RagDocument doc02 = documentReader.readDocument(entry02, catalogReader.resolveDocumentPath(entry02)).orElseThrow();
        List<RagChunk> chunks02 = chunker.chunk(doc02);

        // Kiểm tra công thức GPA
        boolean hasGpaFormula = chunks02.stream()
                .anyMatch(c -> c.getContent().contains("$$\\text{GPA} = \\frac{\\sum_{i=1}^{n} (a_i \\times c_i)}{\\sum_{i=1}^{n} c_i}$$"));
        assertThat(hasGpaFormula)
                .withFailMessage("LaTeX GPA formula must be preserved intact")
                .isTrue();

        // Kiểm tra công thức CPA
        boolean hasCpaFormula = chunks02.stream()
                .anyMatch(c -> c.getContent().contains("$$\\text{CPA} = \\frac{\\sum_{j=1}^{m} (a_j \\times c_j)}{\\sum_{j=1}^{m} c_j}$$"));
        assertThat(hasCpaFormula)
                .withFailMessage("LaTeX CPA formula must be preserved intact")
                .isTrue();

        // Kiểm tra công thức ROI trong REG-HAUI-03
        CatalogSourceEntry entry03 = catalogReader.getSourceById("REG-HAUI-03");
        RagDocument doc03 = documentReader.readDocument(entry03, catalogReader.resolveDocumentPath(entry03)).orElseThrow();
        List<RagChunk> chunks03 = chunker.chunk(doc03);

        boolean hasRoiFormula = chunks03.stream()
                .anyMatch(c -> c.getContent().contains("$$\\text{ROI} = \\frac{\\Delta \\text{Điểm kỳ vọng} \\times \\text{Số tín chỉ học phần}}{\\text{Chi phí tải tín chỉ}}$$"));
        assertThat(hasRoiFormula)
                .withFailMessage("LaTeX ROI formula must be preserved intact")
                .isTrue();
    }

    @Test
    @DisplayName("Should preserve numbered rules without fragmenting bullets")
    void chunk_shouldPreserveNumberedRules() {
        CatalogSourceEntry entry = catalogReader.getSourceById("REG-HAUI-04");
        RagDocument doc = documentReader.readDocument(entry, catalogReader.resolveDocumentPath(entry)).orElseThrow();
        List<RagChunk> chunks = chunker.chunk(doc);

        // Section 2 có các quy tắc 1, 2, 3
        RagChunk sec2Chunk = chunks.stream()
                .filter(c -> c.getSection().contains("2. Các Tiêu chí và Ngưỡng Cảnh báo Học vụ"))
                .findFirst()
                .orElseThrow();

        assertThat(sec2Chunk.getContent()).contains("1. **Điểm trung bình chung tích lũy (CPA)");
        assertThat(sec2Chunk.getContent()).contains("2. **Điểm trung bình chung học kỳ (GPA):**");
        assertThat(sec2Chunk.getContent()).contains("3. **Tổng số tín chỉ nợ đọng (Chưa đạt):**");
    }

    @Test
    @DisplayName("Should generate stable, deterministic chunk IDs: {sourceId}#{sectionSlug}#{chunkIndex}")
    void chunk_shouldGenerateStableAndDeterministicChunkIds() {
        CatalogSourceEntry entry = catalogReader.getSourceById("REG-HAUI-01");
        RagDocument doc = documentReader.readDocument(entry, catalogReader.resolveDocumentPath(entry)).orElseThrow();

        List<RagChunk> chunksRun1 = chunker.chunk(doc);
        List<RagChunk> chunksRun2 = chunker.chunk(doc);

        assertThat(chunksRun1).hasSameSizeAs(chunksRun2);

        for (int i = 0; i < chunksRun1.size(); i++) {
            RagChunk c1 = chunksRun1.get(i);
            RagChunk c2 = chunksRun2.get(i);

            assertThat(c1.getChunkId()).isEqualTo(c2.getChunkId());
            assertThat(c1.getContent()).isEqualTo(c2.getContent());
            assertThat(c1.getChunkId()).startsWith("REG-HAUI-01#");
            assertThat(c1.getChunkId()).endsWith("#" + c1.getChunkIndex());
            assertThat(c1.getChunkIndex()).isEqualTo(i);
        }
    }

    @Test
    @DisplayName("Should produce no empty chunks and positive tokenEstimate for all chunks")
    void chunk_shouldProduceNoEmptyChunksAndValidTokenEstimates() {
        CatalogSourceEntry entry = catalogReader.getSourceById("REG-HAUI-05");
        RagDocument doc = documentReader.readDocument(entry, catalogReader.resolveDocumentPath(entry)).orElseThrow();

        List<RagChunk> chunks = chunker.chunk(doc);

        assertThat(chunks).isNotEmpty();
        for (RagChunk chunk : chunks) {
            assertThat(chunk.getContent()).isNotBlank();
            assertThat(chunk.getTokenEstimate()).isGreaterThan(0);
            assertThat(chunk.getTitle()).isEqualTo(entry.getTitle());
            assertThat(chunk.getVersion()).isEqualTo(entry.getVersion());
            assertThat(chunk.getReferenceUrl()).isEqualTo(entry.getReferenceUrl());
        }
    }
}
