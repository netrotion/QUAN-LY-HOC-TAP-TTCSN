package vn.haui.advisor.ai.rag.retrieval;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.rag.embedding.DeterministicFakeEmbeddingProvider;
import vn.haui.advisor.ai.rag.embedding.EmbeddingProvider;
import vn.haui.advisor.ai.rag.ingestion.RagIngestionService;
import vn.haui.advisor.ai.rag.model.RagChunk;
import vn.haui.advisor.ai.rag.vector.InMemoryVectorStore;
import vn.haui.advisor.ai.rag.vector.VectorSearchResult;
import vn.haui.advisor.ai.rag.vector.VectorStore;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("RagRetriever Tests")
class RagRetrieverTest {

    private static EmbeddingProvider embeddingProvider;
    private static VectorStore vectorStore;
    private static RagRetriever retriever;

    @BeforeAll
    static void initCorpus() {
        embeddingProvider = new DeterministicFakeEmbeddingProvider();
        vectorStore = new InMemoryVectorStore();

        // Nạp và lập chỉ mục toàn bộ tài liệu chính thức từ data-source/documents
        RagIngestionService ingestionService = new RagIngestionService();
        List<RagChunk> chunks = ingestionService.ingestAll();
        List<float[]> vectors = embeddingProvider.embedAll(
                chunks.stream().map(RagChunk::getContent).toList()
        );
        vectorStore.upsert(chunks, vectors);

        retriever = new RagRetriever(embeddingProvider, vectorStore);
    }

    @Test
    @DisplayName("Canonical query 1: Credit limits query retrieves REG-HAUI-01 evidence")
    void testCanonicalQuery1_CreditLimits() {
        String query = "Học kỳ chính được đăng ký tối đa bao nhiêu tín chỉ?";
        RetrievalResult result = retriever.retrieve(query);

        assertThat(result.hasEvidence()).isTrue();
        assertThat(result.items()).isNotEmpty();

        VectorSearchResult topMatch = result.items().get(0);
        assertThat(topMatch.chunk().getSourceId()).isEqualTo("REG-HAUI-01");
        assertThat(topMatch.getScore()).isGreaterThanOrEqualTo(0.45);
        assertThat(topMatch.chunk().getContent()).containsAnyOf("24", "tín chỉ");
    }

    @Test
    @DisplayName("Canonical query 2: GPA and CPA difference retrieves REG-HAUI-02 evidence")
    void testCanonicalQuery2_GpaCpa() {
        String query = "GPA và CPA khác nhau thế nào?";
        RetrievalResult result = retriever.retrieve(query);

        assertThat(result.hasEvidence()).isTrue();
        assertThat(result.items()).isNotEmpty();

        VectorSearchResult topMatch = result.items().get(0);
        assertThat(topMatch.chunk().getSourceId()).isEqualTo("REG-HAUI-02");
        assertThat(topMatch.getScore()).isGreaterThanOrEqualTo(0.45);
        assertThat(topMatch.chunk().getContent()).containsAnyOf("GPA", "CPA");
    }

    @Test
    @DisplayName("Canonical query 3: Retake and grade improvement retrieves REG-HAUI-03 evidence")
    void testCanonicalQuery3_RetakeImprovement() {
        String query = "Điểm B có được học cải thiện không?";
        RetrievalResult result = retriever.retrieve(query);

        assertThat(result.hasEvidence()).isTrue();
        assertThat(result.items()).isNotEmpty();

        VectorSearchResult topMatch = result.items().get(0);
        assertThat(topMatch.chunk().getSourceId()).isEqualTo("REG-HAUI-03");
        assertThat(topMatch.getScore()).isGreaterThanOrEqualTo(0.45);
        assertThat(topMatch.chunk().getContent()).containsAnyOf("cải thiện", "học lại");
    }

    @Test
    @DisplayName("Canonical query 4: Academic warning thresholds retrieves REG-HAUI-04 evidence")
    void testCanonicalQuery4_AcademicWarning() {
        String query = "Ngưỡng cảnh báo học vụ năm thứ hai?";
        RetrievalResult result = retriever.retrieve(query);

        assertThat(result.hasEvidence()).isTrue();
        assertThat(result.items()).isNotEmpty();

        VectorSearchResult topMatch = result.items().get(0);
        assertThat(topMatch.chunk().getSourceId()).isEqualTo("REG-HAUI-04");
        assertThat(topMatch.getScore()).isGreaterThanOrEqualTo(0.45);
        assertThat(topMatch.chunk().getContent()).containsAnyOf("cảnh báo", "học vụ");
    }

    @Test
    @DisplayName("Canonical query 5: Graduation requirements retrieves REG-HAUI-05 evidence")
    void testCanonicalQuery5_GraduationRequirements() {
        String query = "Điều kiện tốt nghiệp là gì?";
        RetrievalResult result = retriever.retrieve(query);

        assertThat(result.hasEvidence()).isTrue();
        assertThat(result.items()).isNotEmpty();

        VectorSearchResult topMatch = result.items().get(0);
        assertThat(topMatch.chunk().getSourceId()).isEqualTo("REG-HAUI-05");
        assertThat(topMatch.getScore()).isGreaterThanOrEqualTo(0.45);
        assertThat(topMatch.chunk().getContent()).containsAnyOf("tốt nghiệp", "chuẩn đầu ra");
    }

    @Test
    @DisplayName("Canonical query 6: Out-of-scope query yields NO_EVIDENCE and empty items")
    void testCanonicalQuery6_OutOfScope() {
        String query = "Thời tiết Hà Nội ngày mai có mưa không?";
        RetrievalResult result = retriever.retrieve(query);

        assertThat(result.hasEvidence()).isFalse();
        assertThat(result.items()).isEmpty();
    }

    @Test
    @DisplayName("Blank query returns empty items and hasEvidence false")
    void testBlankQuery() {
        RetrievalResult result = retriever.retrieve("   ");
        assertThat(result.hasEvidence()).isFalse();
        assertThat(result.items()).isEmpty();
    }

    @Test
    @DisplayName("Deduplicates multiple chunks belonging to the same (sourceId, section)")
    void testDeduplicateSameSectionChunks() {
        // Query should return deduplicated section chunks
        String query = "Quy trình đăng ký học phần và rút học phần";
        RetrievalResult result = retriever.retrieve(query, 5, 0.40);

        long uniqueSections = result.items().stream()
                .map(r -> r.chunk().getSourceId() + "::" + r.chunk().getSection())
                .distinct()
                .count();

        assertThat(result.items().size()).isEqualTo((int) uniqueSections);
    }
}
