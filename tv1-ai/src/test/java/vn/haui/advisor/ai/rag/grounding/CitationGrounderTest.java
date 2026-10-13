package vn.haui.advisor.ai.rag.grounding;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.rag.model.RagChunk;
import vn.haui.advisor.ai.rag.vector.VectorSearchResult;
import vn.haui.advisor.contracts.dto.ChatSourceItem;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CitationGrounder Invariants Tests")
class CitationGrounderTest {

    private CitationGrounder grounder;

    @BeforeEach
    void setUp() {
        grounder = new CitationGrounder();
    }

    @Test
    @DisplayName("Invariant 1 & 2: Maps retrieved chunks to ChatSourceItem with catalog metadata")
    void testGroundCitationsValidMapping() {
        RagChunk chunk = new RagChunk(
                "REG-HAUI-01#002",
                "REG-HAUI-01",
                "Quy chế đào tạo theo hệ thống tín chỉ — Trường Đại học Công nghiệp Hà Nội (HaUI)",
                "1. Tổ chức Đào tạo và Kế hoạch Học tập > 2. Giới hạn Đăng ký Tín chỉ (Credit Limits)",
                "gitblob:cab439dd3364",
                "https://sv.haui.edu.vn/quy-che/reg-haui-01",
                "Học kỳ chính sinh viên được đăng ký tối đa 24 tín chỉ.",
                2,
                120
        );
        VectorSearchResult item = new VectorSearchResult(chunk, 0.72);

        List<ChatSourceItem> citations = grounder.groundCitations(List.of(item), true, 0.45);

        assertThat(citations).hasSize(1);
        ChatSourceItem c = citations.get(0);
        assertThat(c.getSourceId()).isEqualTo("REG-HAUI-01");
        assertThat(c.getTitle()).isEqualTo("Quy chế đào tạo theo hệ thống tín chỉ — Trường Đại học Công nghiệp Hà Nội (HaUI)");
        assertThat(c.getSection()).isEqualTo("1. Tổ chức Đào tạo và Kế hoạch Học tập > 2. Giới hạn Đăng ký Tín chỉ (Credit Limits)");
        assertThat(c.getVersion()).isEqualTo("gitblob:cab439dd3364");
        assertThat(c.getReferenceUrl()).isEqualTo("https://sv.haui.edu.vn/quy-che/reg-haui-01");
    }

    @Test
    @DisplayName("Invariant 3: If hasEvidence is false, citations MUST be empty list")
    void testInvariant3_NoEvidenceYieldsEmptyCitations() {
        RagChunk chunk = new RagChunk(
                "REG-HAUI-01#001",
                "REG-HAUI-01",
                "Quy chế",
                "Section 1",
                "gitblob:cab439dd3364",
                "https://sv.haui.edu.vn/quy-che/reg-haui-01",
                "Content",
                1,
                50
        );
        VectorSearchResult item = new VectorSearchResult(chunk, 0.80);

        List<ChatSourceItem> citations = grounder.groundCitations(List.of(item), false, 0.45);
        assertThat(citations).isEmpty();

        List<ChatSourceItem> citationsEmptyItems = grounder.groundCitations(List.of(), true, 0.45);
        assertThat(citationsEmptyItems).isEmpty();
    }

    @Test
    @DisplayName("Invariant 4: Never use legacy mock IDs (SRC-MOCK-*, 2024-FIXTURE)")
    void testInvariant4_NeverUseLegacyMockIds() {
        RagChunk mockChunk = new RagChunk(
                "SRC-MOCK-POLICY#001",
                "SRC-MOCK-POLICY",
                "Mock Title",
                "Mock Section",
                "2024-FIXTURE",
                "https://mock.url",
                "Mock Content",
                1,
                50
        );
        VectorSearchResult mockItem = new VectorSearchResult(mockChunk, 0.90);

        List<ChatSourceItem> citations = grounder.groundCitations(List.of(mockItem), true, 0.45);
        assertThat(citations).isEmpty();
    }

    @Test
    @DisplayName("Invariant 5: Deduplicates citations sharing the same (sourceId, section)")
    void testInvariant5_DeduplicateSameSection() {
        RagChunk chunk1 = new RagChunk(
                "REG-HAUI-02#001",
                "REG-HAUI-02",
                "Thang điểm và cách tính GPA / CPA",
                "2. Công thức Tính Điểm Trung bình",
                "gitblob:0a22d0023279",
                "https://sv.haui.edu.vn/quy-che/reg-haui-02",
                "Chunk 1 content",
                1,
                60
        );
        RagChunk chunk2 = new RagChunk(
                "REG-HAUI-02#002",
                "REG-HAUI-02",
                "Thang điểm và cách tính GPA / CPA",
                "2. Công thức Tính Điểm Trung bình",
                "gitblob:0a22d0023279",
                "https://sv.haui.edu.vn/quy-che/reg-haui-02",
                "Chunk 2 content",
                2,
                70
        );

        VectorSearchResult item1 = new VectorSearchResult(chunk1, 0.85);
        VectorSearchResult item2 = new VectorSearchResult(chunk2, 0.80);

        List<ChatSourceItem> citations = grounder.groundCitations(List.of(item1, item2), true, 0.45);
        assertThat(citations).hasSize(1);
        assertThat(citations.get(0).getSourceId()).isEqualTo("REG-HAUI-02");
        assertThat(citations.get(0).getSection()).isEqualTo("2. Công thức Tính Điểm Trung bình");
    }

    @Test
    @DisplayName("Filters out chunks whose score is strictly below similarity threshold")
    void testFiltersBelowThreshold() {
        RagChunk chunk = new RagChunk(
                "REG-HAUI-03#001",
                "REG-HAUI-03",
                "Quy định học lại",
                "Section 1",
                "gitblob:b7e379af2bf7",
                "https://sv.haui.edu.vn/quy-che/reg-haui-03",
                "Content",
                1,
                50
        );
        VectorSearchResult item = new VectorSearchResult(chunk, 0.35); // below 0.45

        List<ChatSourceItem> citations = grounder.groundCitations(List.of(item), true, 0.45);
        assertThat(citations).isEmpty();
    }
}
