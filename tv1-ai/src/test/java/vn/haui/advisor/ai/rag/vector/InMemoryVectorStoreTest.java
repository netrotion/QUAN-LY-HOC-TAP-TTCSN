package vn.haui.advisor.ai.rag.vector;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.rag.embedding.DeterministicFakeEmbeddingProvider;
import vn.haui.advisor.ai.rag.model.RagChunk;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class InMemoryVectorStoreTest {

    private InMemoryVectorStore store;
    private DeterministicFakeEmbeddingProvider embeddingProvider;

    @BeforeEach
    void setUp() {
        store = new InMemoryVectorStore();
        embeddingProvider = new DeterministicFakeEmbeddingProvider();
    }

    private RagChunk createChunk(String chunkId, String sourceId, String version, String content) {
        return new RagChunk(
                chunkId,
                sourceId,
                "Quy chế đào tạo HaUI",
                "Điều 10: Học phần",
                version,
                "https://qldt.haui.edu.vn",
                content,
                0,
                50
        );
    }

    @Test
    @DisplayName("Upsert adds chunks and vectors, idempotently updates on same chunkId")
    void testUpsertAndIdempotency() {
        RagChunk chunk1 = createChunk("chunk-1", "src-1", "v1", "Nội dung quy định đăng ký tín chỉ");
        RagChunk chunk2 = createChunk("chunk-2", "src-2", "v1", "Nội dung xử lý cảnh báo học tập");

        float[] vec1 = embeddingProvider.embed(chunk1.getContent());
        float[] vec2 = embeddingProvider.embed(chunk2.getContent());

        store.upsert(List.of(chunk1, chunk2), List.of(vec1, vec2));
        assertThat(store.count()).isEqualTo(2);

        Optional<RagChunk> found1 = store.findById("chunk-1");
        assertThat(found1).isPresent();
        assertThat(found1.get().getContent()).isEqualTo("Nội dung quy định đăng ký tín chỉ");

        // Idempotent update: update chunk-1 with new content
        RagChunk updatedChunk1 = createChunk("chunk-1", "src-1", "v2", "Nội dung cập nhật đăng ký tín chỉ 2026");
        float[] updatedVec1 = embeddingProvider.embed(updatedChunk1.getContent());

        store.upsert(List.of(updatedChunk1), List.of(updatedVec1));
        assertThat(store.count()).isEqualTo(2); // Vẫn là 2, không bị trùng lặp

        Optional<RagChunk> foundUpdated = store.findById("chunk-1");
        assertThat(foundUpdated).isPresent();
        assertThat(foundUpdated.get().getVersion()).isEqualTo("v2");
        assertThat(foundUpdated.get().getContent()).isEqualTo("Nội dung cập nhật đăng ký tín chỉ 2026");
    }

    @Test
    @DisplayName("Upsert validates matching sizes of chunks and vectors")
    void testUpsertValidation() {
        RagChunk chunk = createChunk("c-1", "s-1", "v1", "Test");
        float[] vec = embeddingProvider.embed("Test");

        assertThatThrownBy(() -> store.upsert(List.of(chunk), List.of()))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> store.upsert(null, List.of(vec)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Search returns topK results ranked descending by score, filtered by minScore")
    void testSearchRankingAndMinScore() {
        RagChunk c1 = createChunk("c-1", "src-reg", "2024", "Quy định đăng ký tín chỉ và rút học phần sinh viên");
        RagChunk c2 = createChunk("c-2", "src-reg", "2024", "Quy trình xử lý học vụ cảnh báo học tập và thôi học");
        RagChunk c3 = createChunk("c-3", "src-news", "2024", "Lịch thi đấu giải thể thao bóng đá sinh viên");

        store.upsert(
                List.of(c1, c2, c3),
                List.of(
                        embeddingProvider.embed(c1.getContent()),
                        embeddingProvider.embed(c2.getContent()),
                        embeddingProvider.embed(c3.getContent())
                )
        );

        float[] queryVec = embeddingProvider.embed("Hướng dẫn đăng ký tín chỉ học phần");

        // Search topK=2 with minScore=0.3
        VectorSearchQuery query = VectorSearchQuery.builder()
                .queryVector(queryVec)
                .topK(2)
                .minScore(0.3)
                .build();

        List<VectorSearchResult> results = store.search(query);
        assertThat(results).isNotEmpty();
        assertThat(results.get(0).getChunk().getChunkId()).isEqualTo("c-1");
        assertThat(results.get(0).getScore()).isGreaterThan(0.5);

        // Đảm bảo thứ tự giảm dần
        for (int i = 0; i < results.size() - 1; i++) {
            assertThat(results.get(i).getScore()).isGreaterThanOrEqualTo(results.get(i + 1).getScore());
        }

        // Test minScore lọc bỏ kết quả không liên quan
        VectorSearchQuery highThresholdQuery = VectorSearchQuery.builder()
                .queryVector(queryVec)
                .topK(10)
                .minScore(0.999) // Ngưỡng rất cao mà không chunk nào đạt được
                .build();
        List<VectorSearchResult> emptyResults = store.search(highThresholdQuery);
        assertThat(emptyResults).isEmpty();
    }

    @Test
    @DisplayName("Search applies metadata filters (sourceIdFilter, versionFilter)")
    void testMetadataFiltering() {
        RagChunk c1 = createChunk("c-1", "source-A", "2024-v1", "Quy chế tín chỉ học phần");
        RagChunk c2 = createChunk("c-2", "source-B", "2024-v1", "Quy chế tín chỉ học phần");
        RagChunk c3 = createChunk("c-3", "source-A", "2025-v2", "Quy chế tín chỉ học phần mới");

        store.upsert(
                List.of(c1, c2, c3),
                List.of(
                        embeddingProvider.embed(c1.getContent()),
                        embeddingProvider.embed(c2.getContent()),
                        embeddingProvider.embed(c3.getContent())
                )
        );

        float[] queryVec = embeddingProvider.embed("tín chỉ");

        // Lọc sourceId = source-A
        VectorSearchQuery querySourceA = VectorSearchQuery.builder()
                .queryVector(queryVec)
                .topK(10)
                .sourceIdFilter("source-A")
                .build();

        List<VectorSearchResult> resA = store.search(querySourceA);
        assertThat(resA).hasSize(2);
        assertThat(resA).allMatch(r -> "source-A".equals(r.getChunk().getSourceId()));

        // Lọc version = 2025-v2
        VectorSearchQuery queryV2 = VectorSearchQuery.builder()
                .queryVector(queryVec)
                .topK(10)
                .versionFilter("2025-v2")
                .build();

        List<VectorSearchResult> resV2 = store.search(queryV2);
        assertThat(resV2).hasSize(1);
        assertThat(resV2.get(0).getChunk().getChunkId()).isEqualTo("c-3");

        // Lọc kết hợp source-A và 2024-v1
        VectorSearchQuery queryBoth = VectorSearchQuery.builder()
                .queryVector(queryVec)
                .topK(10)
                .sourceIdFilter("source-A")
                .versionFilter("2024-v1")
                .build();

        List<VectorSearchResult> resBoth = store.search(queryBoth);
        assertThat(resBoth).hasSize(1);
        assertThat(resBoth.get(0).getChunk().getChunkId()).isEqualTo("c-1");
    }

    @Test
    @DisplayName("deleteBySourceId removes all chunks for specified source")
    void testDeleteBySourceId() {
        RagChunk c1 = createChunk("c-1", "source-del", "v1", "Văn bản 1");
        RagChunk c2 = createChunk("c-2", "source-del", "v1", "Văn bản 2");
        RagChunk c3 = createChunk("c-3", "source-keep", "v1", "Văn bản 3");

        store.upsert(
                List.of(c1, c2, c3),
                List.of(
                        embeddingProvider.embed(c1.getContent()),
                        embeddingProvider.embed(c2.getContent()),
                        embeddingProvider.embed(c3.getContent())
                )
        );

        assertThat(store.count()).isEqualTo(3);

        store.deleteBySourceId("source-del");
        assertThat(store.count()).isEqualTo(1);
        assertThat(store.findById("c-1")).isEmpty();
        assertThat(store.findById("c-2")).isEmpty();
        assertThat(store.findById("c-3")).isPresent();
    }
}
