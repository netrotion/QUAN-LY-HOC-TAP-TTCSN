package vn.haui.advisor.ai.rag.search;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.rag.model.RagChunk;
import vn.haui.advisor.ai.rag.vector.VectorSearchResult;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ReciprocalRankFusionTest {

    private ReciprocalRankFusion rrf;
    private ContextualReRanker reRanker;

    private RagChunk chunk1;
    private RagChunk chunk2;
    private RagChunk chunk3;
    private Map<String, RagChunk> chunkLookup;

    @BeforeEach
    void setUp() {
        rrf = new ReciprocalRankFusion(60);
        reRanker = new ContextualReRanker();

        chunk1 = new RagChunk(
                "REG-01-CH-014",
                "REG-01",
                "Quy chế Đào tạo",
                "Điều 14. Đăng ký học phần",
                "v2024",
                "https://haui.edu.vn",
                "Khoản 2. Sinh viên đăng ký học cải thiện điểm D để nâng cao CPA tích lũy.",
                14,
                30
        );

        chunk2 = new RagChunk(
                "REG-01-CH-015",
                "REG-01",
                "Quy chế Đào tạo",
                "Điều 15. Rút học phần",
                "v2024",
                "https://haui.edu.vn",
                "Khoản 1. Thời hạn rút học phần trong 2 tuần đầu kỳ.",
                15,
                25
        );

        chunk3 = new RagChunk(
                "REG-02-CH-008",
                "REG-02",
                "Quy chế Đánh giá",
                "Điều 8. Cảnh báo học tập",
                "v2024",
                "https://haui.edu.vn",
                "Sinh viên bị cảnh báo học tập nếu CPA dưới 1.20.",
                8,
                20
        );

        chunkLookup = Map.of(
                chunk1.getChunkId(), chunk1,
                chunk2.getChunkId(), chunk2,
                chunk3.getChunkId(), chunk3
        );
    }

    @Test
    void fuse_chunkInBothLists_ranksFirst() {
        // chunk2 is #1 in dense, not in lexical
        // chunk1 is #2 in dense, but #1 in lexical
        List<VectorSearchResult> denseResults = List.of(
                new VectorSearchResult(chunk2, 0.88),
                new VectorSearchResult(chunk1, 0.85)
        );

        List<LexicalHit> lexicalResults = List.of(
                new LexicalHit(chunk1.getChunkId(), 4.2, chunk1.getSection(), chunk1.getTitle(), chunk1.getContent()),
                new LexicalHit(chunk3.getChunkId(), 2.1, chunk3.getSection(), chunk3.getTitle(), chunk3.getContent())
        );

        List<FusedCandidate> fused = rrf.fuse(denseResults, lexicalResults, chunkLookup, 5);

        assertThat(fused).isNotEmpty();
        // chunk1 has 1/(60+2) + 1/(60+1) = 0.016129 + 0.016393 = 0.032522
        // chunk2 has 1/(60+1) = 0.016393
        // So chunk1 must rank #1
        assertThat(fused.getFirst().chunk().getChunkId()).isEqualTo("REG-01-CH-014");
        assertThat(fused.getFirst().denseRank()).isEqualTo(2);
        assertThat(fused.getFirst().lexicalRank()).isEqualTo(1);
    }

    @Test
    void reRank_exactSectionQuery_boostsMatchingArticle() {
        List<VectorSearchResult> denseResults = List.of(
                new VectorSearchResult(chunk2, 0.80),
                new VectorSearchResult(chunk1, 0.75)
        );
        List<LexicalHit> lexicalResults = List.of(
                new LexicalHit(chunk1.getChunkId(), 5.0, chunk1.getSection(), chunk1.getTitle(), chunk1.getContent())
        );

        List<FusedCandidate> fused = rrf.fuse(denseResults, lexicalResults, chunkLookup, 5);

        List<ReRankedResult> reRanked = reRanker.reRank("Điều 14 Khoản 2", fused, 3, 0.50);

        assertThat(reRanked).isNotEmpty();
        assertThat(reRanked.getFirst().chunk().getChunkId()).isEqualTo("REG-01-CH-014");
        assertThat(reRanked.getFirst().score()).isGreaterThanOrEqualTo(0.50);
    }

    @Test
    void reRank_filtersBelowThreshold() {
        List<VectorSearchResult> denseResults = List.of(
                new VectorSearchResult(chunk3, 0.30)
        );
        List<LexicalHit> lexicalResults = List.of();

        List<FusedCandidate> fused = rrf.fuse(denseResults, lexicalResults, chunkLookup, 5);

        // Min score threshold 0.60 should filter out chunk3
        List<ReRankedResult> reRanked = reRanker.reRank("Đăng ký tốt nghiệp", fused, 3, 0.60);

        assertThat(reRanked).isEmpty();
    }
}
