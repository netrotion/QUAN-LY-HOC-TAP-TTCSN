package vn.haui.advisor.ai.rag.search;

import org.springframework.stereotype.Component;
import vn.haui.advisor.ai.rag.model.RagChunk;

import java.text.Normalizer;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Tầng tái xếp hạng ngữ cảnh (Contextual Re-Ranker) đánh giá Top-K ứng viên sau khi dung hợp RRF:
 * <ul>
 *   <li>Tính toán mức độ trùng khớp thực thể điều khoản ("Điều X", "Khoản Y", mã quyết định).</li>
 *   <li>Tính toán độ phủ từ khóa ngữ nghĩa giữa câu hỏi và nội dung văn bản.</li>
 *   <li>Áp dụng ngưỡng lọc tối thiểu (minScoreThreshold) để loại bỏ các đoạn gây nhiễu trước khi nạp vào Prompt.</li>
 * </ul>
 */
@Component
public class ContextualReRanker {

    private static final Pattern ARTICLE_PATTERN = Pattern.compile("(?i)(điều|dieu)\\s+(\\d+)");
    private static final Pattern CLAUSE_PATTERN = Pattern.compile("(?i)(khoản|khoan)\\s+(\\d+)");

    /**
     * Tái xếp hạng danh sách ứng viên FusedCandidate.
     *
     * @param query              câu hỏi của sinh viên
     * @param candidates         danh sách ứng viên đã dung hợp RRF
     * @param topK               số lượng đoạn quy chế cần lấy cho LLM Context
     * @param minScoreThreshold  ngưỡng điểm tương đồng tối thiểu
     * @return danh sách ReRankedResult đã lọc và sắp xếp
     */
    public List<ReRankedResult> reRank(
            String query,
            List<FusedCandidate> candidates,
            int topK,
            double minScoreThreshold
    ) {
        if (query == null || query.isBlank() || candidates == null || candidates.isEmpty() || topK <= 0) {
            return Collections.emptyList();
        }

        String normalizedQuery = normalizeForMatching(query);
        List<String> queryTokens = extractSignificantTokens(normalizedQuery);

        Matcher qArticleMatcher = ARTICLE_PATTERN.matcher(query);
        String queriedArticle = qArticleMatcher.find() ? qArticleMatcher.group(2) : null;

        Matcher qClauseMatcher = CLAUSE_PATTERN.matcher(query);
        String queriedClause = qClauseMatcher.find() ? qClauseMatcher.group(2) : null;

        List<ReRankedResult> results = new ArrayList<>();

        for (FusedCandidate candidate : candidates) {
            RagChunk chunk = candidate.chunk();
            String normSection = normalizeForMatching(chunk.getSection());
            String normContent = normalizeForMatching(chunk.getContent());
            String normTitle = normalizeForMatching(chunk.getTitle());

            // 1. Khớp thực thể số hiệu (Điều, Khoản)
            double entityScore = 0.0;
            if (queriedArticle != null) {
                if (normSection.contains("dieu " + queriedArticle) || normContent.contains("dieu " + queriedArticle)) {
                    entityScore += 0.60;
                }
            }
            if (queriedClause != null) {
                if (normContent.contains("khoan " + queriedClause) || normSection.contains("khoan " + queriedClause)) {
                    entityScore += 0.40;
                }
            }

            // 2. Độ phủ từ vựng (Token Overlap)
            double overlapRatio = 0.0;
            if (!queryTokens.isEmpty()) {
                int matched = 0;
                for (String token : queryTokens) {
                    if (normSection.contains(token) || normContent.contains(token) || normTitle.contains(token)) {
                        matched++;
                    }
                }
                overlapRatio = (double) matched / queryTokens.size();
            }

            // 3. Kết hợp điểm số
            double denseScore = candidate.denseScore();
            double finalScore;

            if (denseScore > 0.0) {
                finalScore = (0.40 * denseScore) + (0.35 * entityScore) + (0.25 * overlapRatio);
            } else {
                double lexScore = Math.min(1.0, candidate.lexicalScore() / 5.0);
                finalScore = (0.35 * lexScore) + (0.40 * entityScore) + (0.25 * overlapRatio);
            }

            finalScore = Math.min(1.0, Math.max(0.0, finalScore));

            if (finalScore >= minScoreThreshold) {
                String explanation = String.format(
                        Locale.ROOT,
                        "entity=%.2f, overlap=%.2f, dense=%.2f, rrf=%.4f",
                        entityScore, overlapRatio, denseScore, candidate.rrfScore()
                );
                results.add(new ReRankedResult(chunk, finalScore, candidate.rrfScore(), overlapRatio, explanation));
            }
        }

        results.sort((a, b) -> Double.compare(b.score(), a.score()));

        int limit = Math.min(topK, results.size());
        return Collections.unmodifiableList(results.subList(0, limit));
    }

    private String normalizeForMatching(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        String nfc = Normalizer.normalize(text.toLowerCase(Locale.ROOT), Normalizer.Form.NFD);
        return nfc.replaceAll("\\p{M}", "").replaceAll("[^a-z0-9\\s]", " ").replaceAll("\\s+", " ").trim();
    }

    private List<String> extractSignificantTokens(String text) {
        if (text == null || text.isBlank()) {
            return Collections.emptyList();
        }
        String[] parts = text.split("\\s+");
        List<String> tokens = new ArrayList<>();
        for (String p : parts) {
            if (p.length() >= 2) {
                tokens.add(p);
            }
        }
        return tokens;
    }
}
