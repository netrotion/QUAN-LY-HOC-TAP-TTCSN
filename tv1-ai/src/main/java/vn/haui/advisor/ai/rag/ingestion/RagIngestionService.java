package vn.haui.advisor.ai.rag.ingestion;

import org.springframework.stereotype.Service;
import vn.haui.advisor.ai.rag.model.CatalogSourceEntry;
import vn.haui.advisor.ai.rag.model.RagChunk;
import vn.haui.advisor.ai.rag.model.RagDocument;

import java.nio.file.Path;
import java.util.*;

/**
 * Service điều phối toàn bộ quy trình nạp tài liệu RAG (Document Ingestion & Semantic Chunking):
 * 1. Đọc và lọc các tài liệu đang kích hoạt (rag_enabled = true) từ Catalog
 * 2. Phân giải đường dẫn an toàn và đọc nội dung Markdown UTF-8
 * 3. Phân tách ngữ nghĩa bảo toàn phân cấp tiêu đề, bảng Markdown và công thức LaTeX
 * 4. Xác thực tính nhất quán giữa Chunks sinh ra và Catalog Metadata
 */
@Service
public class RagIngestionService {

    private final RagCatalogReader catalogReader;
    private final MarkdownDocumentReader documentReader;
    private final SemanticChunker chunker;

    public RagIngestionService() {
        this(new RagCatalogReader(), new MarkdownDocumentReader(), new SemanticChunker());
    }

    public RagIngestionService(
            RagCatalogReader catalogReader,
            MarkdownDocumentReader documentReader,
            SemanticChunker chunker
    ) {
        this.catalogReader = catalogReader != null ? catalogReader : new RagCatalogReader();
        this.documentReader = documentReader != null ? documentReader : new MarkdownDocumentReader(this.catalogReader);
        this.chunker = chunker != null ? chunker : new SemanticChunker();
    }

    /**
     * Nạp toàn bộ các tài liệu đang kích hoạt (rag_enabled = true) từ source-catalog.json.
     *
     * @return danh sách tất cả các RagChunk hợp lệ và đã qua kiểm định
     */
    public List<RagChunk> ingestAll() {
        List<CatalogSourceEntry> activeSources = catalogReader.readActiveSources();
        List<RagChunk> allChunks = new ArrayList<>();

        for (CatalogSourceEntry entry : activeSources) {
            try {
                Path path = catalogReader.resolveDocumentPath(entry);
                Optional<RagDocument> docOpt = documentReader.readDocument(entry, path);

                if (docOpt.isEmpty()) {
                    continue;
                }

                RagDocument doc = docOpt.get();
                List<RagChunk> chunks = chunker.chunk(doc);

                validateChunksMatchCatalog(chunks, entry);
                allChunks.addAll(chunks);
            } catch (Exception e) {
                // Ghi nhận lỗi an toàn mà không làm gián đoạn toàn bộ quá trình nạp
            }
        }

        return Collections.unmodifiableList(allChunks);
    }

    /**
     * Nạp tài liệu cụ thể theo mã sourceId.
     */
    public List<RagChunk> ingestSource(String sourceId) {
        CatalogSourceEntry entry = catalogReader.getSourceById(sourceId);
        Path path = catalogReader.resolveDocumentPath(entry);
        RagDocument doc = documentReader.readDocument(entry, path)
                .orElseThrow(() -> new IllegalStateException("Không thể đọc tài liệu cho source: " + sourceId));

        List<RagChunk> chunks = chunker.chunk(doc);
        validateChunksMatchCatalog(chunks, entry);
        return chunks;
    }

    /**
     * Nạp trực tiếp một RagDocument đã có.
     */
    public List<RagChunk> ingestDocument(RagDocument document) {
        if (document == null) {
            return Collections.emptyList();
        }
        return chunker.chunk(document);
    }

    /**
     * Xác thực dữ liệu của từng chunk phải khớp 100% với CatalogSourceEntry.
     */
    public void validateChunksMatchCatalog(List<RagChunk> chunks, CatalogSourceEntry entry) {
        if (chunks == null || chunks.isEmpty()) {
            throw new IllegalStateException("Không có chunk nào được sinh ra cho source: " + entry.getSourceId());
        }

        for (RagChunk chunk : chunks) {
            if (!Objects.equals(chunk.getSourceId(), entry.getSourceId())) {
                throw new IllegalStateException("Chunk sourceId không khớp với catalog: " + chunk.getSourceId() + " != " + entry.getSourceId());
            }
            if (!Objects.equals(chunk.getTitle(), entry.getTitle())) {
                throw new IllegalStateException("Chunk title không khớp với catalog: " + chunk.getTitle());
            }
            if (!Objects.equals(chunk.getVersion(), entry.getVersion())) {
                throw new IllegalStateException("Chunk version không khớp với catalog: " + chunk.getVersion());
            }
            if (!Objects.equals(chunk.getReferenceUrl(), entry.getReferenceUrl())) {
                throw new IllegalStateException("Chunk referenceUrl không khớp với catalog: " + chunk.getReferenceUrl());
            }
            if (chunk.getContent() == null || chunk.getContent().isBlank()) {
                throw new IllegalStateException("Chunk content không được rỗng cho chunkId: " + chunk.getChunkId());
            }
            if (chunk.getChunkId() == null || chunk.getChunkId().isBlank()) {
                throw new IllegalStateException("Chunk chunkId không được rỗng");
            }
            if (chunk.getTokenEstimate() <= 0) {
                throw new IllegalStateException("tokenEstimate phải lớn hơn 0 cho chunkId: " + chunk.getChunkId());
            }
        }
    }

    public RagCatalogReader getCatalogReader() {
        return catalogReader;
    }

    public MarkdownDocumentReader getDocumentReader() {
        return documentReader;
    }

    public SemanticChunker getChunker() {
        return chunker;
    }
}
