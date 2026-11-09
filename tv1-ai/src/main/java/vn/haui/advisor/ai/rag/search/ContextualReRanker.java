package vn.haui.advisor.ai.rag.search;

import org.springframework.stereotype.Component;
import vn.haui.advisor.ai.rag.model.RagChunk;

import java.text.Normalizer;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Tầng tái xếp hạng ngữ cảnh (Contextual Re-Ranker) đánh giá các ứng viên sau khi dung hợp RRF:
 * <ul>
 *   <li>Tối ưu độ chính xác cho thực thể số hiệu văn bản ("Điều X", "Khoản Y", mã quy chế).</li>
 *   <li>Chuẩn hóa dấu tiếng Việt có xử lý ký tự 'đ'/'Đ' sang ASCII 'd'.</li>
 *   <li>Khử trùng lặp theo mục quy chế và bảo vệ điểm tương đồng ngữ nghĩa.</li>
 * </ul>
 */
@Component
public class ContextualReRanker {

    private static final Pattern ARTICLE_PATTERN = Pattern.compile("dieu\\s+(\\d+)");
    private static final Pattern CLAUSE_PATTERN = Pattern.compile("khoan\\s+(\\d+)");

    private static final Set<String> STOPWORDS = Set.of(
            "và", "va", "hoặc", "hoac", "của", "cua", "cho", "với", "voi",
            "được", "duoc", "có", "co", "không", "khong", "các", "cac", "những", "nhung",
            "trong", "ngày", "ngay", "mai", "hôm", "hom", "là", "la", "thì", "thi",
            "ở", "o", "tại", "tai", "nào", "nao", "gì", "gi", "sao", "thế", "the",
            "này", "nay", "đó", "do", "ra", "vào", "vao", "lại", "lai", "đi", "di",
            "đến", "den", "như", "nhu", "về", "ve", "hỏi", "hoi"
    );

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

        Matcher qArticleMatcher = ARTICLE_PATTERN.matcher(normalizedQuery);
        String queriedArticle = qArticleMatcher.find() ? qArticleMatcher.group(1) : null;

        Matcher qClauseMatcher = CLAUSE_PATTERN.matcher(normalizedQuery);
        String queriedClause = qClauseMatcher.find() ? qClauseMatcher.group(1) : null;

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

            // 2. Độ phủ từ vựng có ý nghĩa (bỏ stopwords)
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

            if (entityScore > 0.0) {
                finalScore = Math.min(1.0, 0.40 * Math.max(denseScore, 0.50) + 0.50 * entityScore + 0.10);
            } else if (denseScore > 0.0) {
                finalScore = denseScore;
            } else {
                double lexScore = Math.min(1.0, candidate.lexicalScore() / 5.0);
                if (overlapRatio >= 0.40) {
                    finalScore = (0.50 * lexScore) + (0.50 * overlapRatio);
                } else {
                    finalScore = 0.0;
                }
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

        results.sort((a, b) -> {
            double aEntity = a.explanation().contains("entity=1.") ? 1.0 : (a.explanation().contains("entity=0.6") ? 0.6 : (a.explanation().contains("entity=0.4") ? 0.4 : 0.0));
            double bEntity = b.explanation().contains("entity=1.") ? 1.0 : (b.explanation().contains("entity=0.6") ? 0.6 : (b.explanation().contains("entity=0.4") ? 0.4 : 0.0));
            if (Double.compare(aEntity, bEntity) != 0) {
                return Double.compare(bEntity, aEntity);
            }
            int rrfCmp = Double.compare(b.rrfScore(), a.rrfScore());
            if (rrfCmp != 0) return rrfCmp;
            return Double.compare(b.score(), a.score());
        });

        // Khử trùng lặp và đa dạng hóa nguồn: tối đa 1 chunk cùng (sourceId, section), tối đa 2 chunk cùng sourceId
        Set<String> seenSections = new HashSet<>();
        Map<String, Integer> sourceCounts = new HashMap<>();
        List<ReRankedResult> deduped = new ArrayList<>();

        for (ReRankedResult res : results) {
            String sid = res.chunk().getSourceId();
            String secKey = sid + "::" + (res.chunk().getSection() != null ? res.chunk().getSection().trim() : "");

            if (sourceCounts.getOrDefault(sid, 0) >= 2) {
                continue;
            }
            if (seenSections.add(secKey)) {
                sourceCounts.merge(sid, 1, Integer::sum);
                deduped.add(res);
                if (deduped.size() >= topK) {
                    break;
                }
            }
        }

        return Collections.unmodifiableList(deduped);
    }

    private String normalizeForMatching(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        String replaced = text.toLowerCase(Locale.ROOT).replace('đ', 'd').replace('Đ', 'd');
        String nfd = Normalizer.normalize(replaced, Normalizer.Form.NFD);
        return nfd.replaceAll("\\p{M}", "").replaceAll("[^a-z0-9\\s]", " ").replaceAll("\\s+", " ").trim();
    }

    private List<String> extractSignificantTokens(String text) {
        if (text == null || text.isBlank()) {
            return Collections.emptyList();
        }
        String[] parts = text.split("\\s+");
        List<String> tokens = new ArrayList<>();
        for (String p : parts) {
            if (p.length() >= 2 && !STOPWORDS.contains(p)) {
                tokens.add(p);
            }
        }
        return tokens;
    }
}
