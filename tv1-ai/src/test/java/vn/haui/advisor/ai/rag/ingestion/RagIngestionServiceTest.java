package vn.haui.advisor.ai.rag.ingestion;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.rag.model.CatalogSourceEntry;
import vn.haui.advisor.ai.rag.model.RagChunk;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("RagIngestionService Tests")
class RagIngestionServiceTest {

    private RagCatalogReader catalogReader;
    private MarkdownDocumentReader documentReader;
    private SemanticChunker chunker;
    private RagIngestionService ingestionService;

    @BeforeEach
    void setUp() {
        catalogReader = new RagCatalogReader();
        documentReader = new MarkdownDocumentReader();
        chunker = new SemanticChunker(800, 100);
        ingestionService = new RagIngestionService(catalogReader, documentReader, chunker);
    }

    @Test
    @DisplayName("Should successfully ingest all 5 official active catalog documents and validate metadata match")
    void ingestAll_shouldIngestAllActiveCatalogDocuments() {
        List<RagChunk> chunks = ingestionService.ingestAll();

        assertThat(chunks).isNotEmpty();

        // 1. Kiểm tra bao phủ đủ cả 5 tài liệu
        Set<String> sourceIds = chunks.stream().map(RagChunk::getSourceId).collect(Collectors.toSet());
        assertThat(sourceIds).containsExactlyInAnyOrder(
                "REG-HAUI-01",
                "REG-HAUI-02",
                "REG-HAUI-03",
                "REG-HAUI-04",
                "REG-HAUI-05"
        );

        // 2. Kiểm tra chunkId là duy nhất trên toàn bộ tập dữ liệu
        Set<String> chunkIds = chunks.stream().map(RagChunk::getChunkId).collect(Collectors.toSet());
        assertThat(chunkIds).hasSameSizeAs(chunks);

        // 3. Khớp 100% metadata với Catalog
        Map<String, CatalogSourceEntry> catalogMap = catalogReader.readCatalog().stream()
                .collect(Collectors.toMap(CatalogSourceEntry::getSourceId, e -> e));

        for (RagChunk chunk : chunks) {
            CatalogSourceEntry catalogEntry = catalogMap.get(chunk.getSourceId());
            assertThat(catalogEntry).isNotNull();

            assertThat(chunk.getTitle()).isEqualTo(catalogEntry.getTitle());
            assertThat(chunk.getVersion()).isEqualTo(catalogEntry.getVersion());
            assertThat(chunk.getReferenceUrl()).isEqualTo(catalogEntry.getReferenceUrl());
            assertThat(chunk.getContent()).isNotBlank();
            assertThat(chunk.getTokenEstimate()).isGreaterThan(0);
        }

        // 4. Kiểm tra toàn bộ 21 sections trong catalog đều được phản ánh trong chunks
        List<String> allCatalogSections = catalogReader.readCatalog().stream()
                .flatMap(e -> e.getSections().stream())
                .toList();

        Set<String> chunkSections = chunks.stream().map(RagChunk::getSection).collect(Collectors.toSet());
        for (String catalogSection : allCatalogSections) {
            assertThat(chunkSections)
                    .withFailMessage("Section '%s' from catalog must be present in ingested chunks", catalogSection)
                    .contains(catalogSection);
        }
    }

    @Test
    @DisplayName("Should ingest single source by ID successfully")
    void ingestSource_shouldIngestSingleSourceById() {
        List<RagChunk> chunks = ingestionService.ingestSource("REG-HAUI-03");

        assertThat(chunks).isNotEmpty();
        assertThat(chunks).allMatch(c -> "REG-HAUI-03".equals(c.getSourceId()));
        assertThat(chunks).allMatch(c -> c.getVersion().equals("gitblob:b7e379af2bf7"));

        Set<String> sections = chunks.stream().map(RagChunk::getSection).collect(Collectors.toSet());
        assertThat(sections).contains(
                "1. Quy định Học lại (Môn bắt buộc bị điểm F) > 1. Đối tượng và Điều kiện",
                "1. Quy định Học lại (Môn bắt buộc bị điểm F) > 2. Cách tính điểm sau khi học lại",
                "2. Quy định Học cải thiện Điểm (Nâng hạng CPA) > 1. Điều kiện được học cải thiện",
                "2. Quy định Học cải thiện Điểm (Nâng hạng CPA) > 2. Nguyên tắc tính điểm CPA khi học cải thiện",
                "3. Chiến lược ROI Tối ưu hóa Lộ trình Học cải thiện (HaUI Advisor Strategy)"
        );
    }
}
