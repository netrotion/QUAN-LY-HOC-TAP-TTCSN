package vn.haui.advisor.ai.rag.search;

import org.springframework.stereotype.Component;
import vn.haui.advisor.ai.rag.model.RagChunk;
import vn.haui.advisor.ai.rag.vector.VectorSearchResult;

import java.util.*;

/**
 * Thuật toán Reciprocal Rank Fusion (RRF) kết hợp danh sách xếp hạng từ Dense Vector và Lexical BM25.
 * Công thức: RRF(d) = sum(1 / (k + r_m(d))) với k mặc định = 60.
 */
@Component
public class ReciprocalRankFusion {

    public static final int DEFAULT_K = 60;
    private final int k;

    public ReciprocalRankFusion() {
        this(DEFAULT_K);
    }

    public ReciprocalRankFusion(int k) {
        this.k = Math.max(1, k);
    }

    /**
     * Hợp nhất kết quả tìm kiếm dense và lexical theo thứ hạng nghịch đảo.
     *
     * @param denseResults   danh sách kết quả từ VectorStore
     * @param lexicalResults danh sách kết quả từ Lucene BM25
     * @param chunkLookup    bản đồ tra cứu chunk theo chunkId
     * @param topN           số lượng ứng viên tối đa trả về
     * @return danh sách FusedCandidate sắp xếp theo rrfScore giảm dần
     */
    public List<FusedCandidate> fuse(
            List<VectorSearchResult> denseResults,
            List<LexicalHit> lexicalResults,
            Map<String, RagChunk> chunkLookup,
            int topN
    ) {
        if ((denseResults == null || denseResults.isEmpty()) && (lexicalResults == null || lexicalResults.isEmpty())) {
            return Collections.emptyList();
        }

        Map<String, Double> rrfScores = new HashMap<>();
        Map<String, Double> denseScores = new HashMap<>();
        Map<String, Double> lexicalScores = new HashMap<>();
        Map<String, Integer> denseRanks = new HashMap<>();
        Map<String, Integer> lexicalRanks = new HashMap<>();

        if (denseResults != null) {
            for (int i = 0; i < denseResults.size(); i++) {
                VectorSearchResult vsr = denseResults.get(i);
                String cid = vsr.chunk().getChunkId();
                int rank = i + 1;
                denseRanks.put(cid, rank);
                denseScores.put(cid, vsr.score());
                rrfScores.merge(cid, 1.0 / (k + rank), Double::sum);
            }
        }

        if (lexicalResults != null) {
            for (int i = 0; i < lexicalResults.size(); i++) {
                LexicalHit hit = lexicalResults.get(i);
                String cid = hit.chunkId();
                int rank = i + 1;
                lexicalRanks.put(cid, rank);
                lexicalScores.put(cid, hit.score());
                rrfScores.merge(cid, 1.0 / (k + rank), Double::sum);
            }
        }

        List<Map.Entry<String, Double>> sorted = new ArrayList<>(rrfScores.entrySet());
        sorted.sort((a, b) -> Double.compare(b.getValue(), a.getValue()));

        List<FusedCandidate> candidates = new ArrayList<>();
        int limit = topN > 0 ? Math.min(topN, sorted.size()) : sorted.size();

        for (int i = 0; i < limit; i++) {
            Map.Entry<String, Double> entry = sorted.get(i);
            String cid = entry.getKey();
            RagChunk chunk = chunkLookup != null ? chunkLookup.get(cid) : null;
            if (chunk == null && denseResults != null) {
                chunk = denseResults.stream()
                        .filter(v -> v.chunk().getChunkId().equals(cid))
                        .map(VectorSearchResult::chunk)
                        .findFirst()
                        .orElse(null);
            }
            if (chunk == null) {
                continue;
            }

            candidates.add(new FusedCandidate(
                    chunk,
                    entry.getValue(),
                    denseScores.getOrDefault(cid, 0.0),
                    lexicalScores.getOrDefault(cid, 0.0),
                    denseRanks.getOrDefault(cid, -1),
                    lexicalRanks.getOrDefault(cid, -1)
            ));
        }

        return Collections.unmodifiableList(candidates);
    }
}

