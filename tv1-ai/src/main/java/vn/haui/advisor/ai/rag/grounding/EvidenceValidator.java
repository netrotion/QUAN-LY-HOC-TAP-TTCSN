package vn.haui.advisor.ai.rag.grounding;

import org.springframework.stereotype.Component;
import vn.haui.advisor.ai.rag.ingestion.RagCatalogReader;
import vn.haui.advisor.ai.rag.model.CatalogSourceEntry;
import vn.haui.advisor.ai.rag.model.RagChunk;
import vn.haui.advisor.ai.rag.vector.VectorSearchResult;

import java.util.*;
import java.util.regex.Pattern;

/**
 * Kiểm định tính hợp chuẩn của tài liệu chứng cứ và phòng vệ tấn công gián tiếp (Adversarial Prompt Injection):
 * 1. Đảm bảo nguồn tài liệu thuộc danh mục quy chế chính thức (REG-HAUI-*) trong Catalog.
 * 2. Ngăn chặn tuyệt đối các mã nguồn giả lập hoặc fixture cũ (SRC-MOCK-*, 2024-FIXTURE, DEMO_*).
 * 3. Kiểm tra ngưỡng tin cậy tương đồng (confidence threshold); nếu không đạt, xếp loại NO_EVIDENCE.
 * 4. Phát hiện các nỗ lực Prompt Injection trong câu hỏi hoặc nội dung văn bản nhằm đảm bảo
 *    dữ liệu RAG được xử lý hoàn toàn như dữ liệu tham chiếu thụ động (passive reference data),
 *    không bao giờ là lệnh thực thi đối với mô hình ngôn ngữ.
 */
@Component
public class EvidenceValidator {

    private static final List<String> FORBIDDEN_SOURCE_TERMS = List.of(
            "MOCK", "FAKE", "DEMO", "FIXTURE"
    );

    private static final List<Pattern> PROMPT_INJECTION_PATTERNS = List.of(
            Pattern.compile("(?i)ignore\\s+((all|previous|prior|system|above)\\s+)*(instructions|directives|prompts|rules)"),
            Pattern.compile("(?i)bỏ\\s+qua\\s+((các|tất\\s+cả|mọi)\\s+)*(hướng\\s+dẫn|chỉ\\s+thị|quy\\s+tắc|lệnh|câu\\s+lệnh)"),
            Pattern.compile("(?i)hãy\\s+quên\\s+((các|tất\\s+cả|mọi)\\s+)*(hướng\\s+dẫn|chỉ\\s+thị|quy\\s+tắc)"),
            Pattern.compile("(?i)quên\\s+hướng\\s+dẫn\\s+hệ\\s+thống"),
            Pattern.compile("(?i)bạn\\s+là\\s+(một\\s+)?(ai|trợ\\s+lý)\\s+(mới|không\\s+có\\s+giới\\s+hạn)"),
            Pattern.compile("(?i)you\\s+are\\s+now\\s+(an?\\s+)?(unfiltered|new|dan|system|jailbreak)"),
            Pattern.compile("(?i)act\\s+as\\s+(an?\\s+)?(unfiltered|dan|developer|system)"),
            Pattern.compile("(?i)(system\\s+prompt|developer\\s+mode|jailbreak|do\\s+anything\\s+now)")
    );

    private final Set<String> validCatalogSourceIds = new HashSet<>();

    public EvidenceValidator() {
        this(new RagCatalogReader());
    }

    public EvidenceValidator(RagCatalogReader catalogReader) {
        if (catalogReader != null) {
            try {
                for (CatalogSourceEntry entry : catalogReader.readActiveSources()) {
                    if (entry.getSourceId() != null) {
                        validCatalogSourceIds.add(entry.getSourceId());
                    }
                }
            } catch (Exception e) {
                // Fallback nạp danh mục mặc định nếu đọc file thất bại
                validCatalogSourceIds.addAll(List.of(
                        "REG-HAUI-01", "REG-HAUI-02", "REG-HAUI-03", "REG-HAUI-04", "REG-HAUI-05"
                ));
            }
        } else {
            validCatalogSourceIds.addAll(List.of(
                    "REG-HAUI-01", "REG-HAUI-02", "REG-HAUI-03", "REG-HAUI-04", "REG-HAUI-05"
            ));
        }
    }

    /**
     * Xác thực tập hợp kết quả tìm kiếm với ngưỡng tin cậy tương đồng.
     *
     * @param query    câu hỏi người dùng
     * @param items    kết quả tìm kiếm từ VectorStore
     * @param minScore điểm tin cậy tối thiểu
     * @return {@link EvidenceValidationResult}
     */
    public EvidenceValidationResult validate(String query, List<VectorSearchResult> items, double minScore) {
        List<String> warnings = new ArrayList<>();
        boolean adversarial = false;

        // 1. Kiểm tra Prompt Injection trong câu hỏi người dùng
        if (isPotentialPromptInjection(query)) {
            adversarial = true;
            warnings.add("SUSPECTED_PROMPT_INJECTION: Phát hiện mẫu chỉ thị đáng ngờ trong câu hỏi người dùng");
        }

        if (items == null || items.isEmpty()) {
            return EvidenceValidationResult.noEvidence(warnings, adversarial);
        }

        // 2. Kiểm tra điểm số cao nhất có đạt ngưỡng tối thiểu hay không
        double maxScore = items.stream().mapToDouble(VectorSearchResult::getScore).max().orElse(0.0);
        if (maxScore < minScore) {
            return EvidenceValidationResult.noEvidence(warnings, adversarial);
        }

        // 3. Lọc và xác thực tính hợp lệ của từng nguồn tài liệu
        List<VectorSearchResult> validated = new ArrayList<>();
        for (VectorSearchResult result : items) {
            if (result.getScore() < minScore) {
                continue;
            }

            RagChunk chunk = result.chunk();
            String sourceId = chunk.getSourceId();

            // Kiểm tra các định danh giả lập bị cấm
            if (isForbiddenSourceId(sourceId)) {
                warnings.add("SECURITY_VIOLATION: Từ chối chứng cứ chứa sourceId giả lập bị cấm: " + sourceId);
                continue;
            }

            // Kiểm tra sourceId hợp lệ trong Catalog
            if (sourceId == null || !sourceId.startsWith("REG-HAUI-") || !validCatalogSourceIds.contains(sourceId)) {
                warnings.add("INVALID_SOURCE: SourceId không tồn tại trong danh mục quy chế chính thức: " + sourceId);
                continue;
            }

            // Kiểm tra nếu nội dung chunk chứa mã chỉ thị prompt injection
            if (isPotentialPromptInjection(chunk.getContent())) {
                warnings.add("DATA_POISONING_SUSPECT: Chunk " + chunk.getChunkId() + " chứa mẫu chỉ thị bất thường");
                continue;
            }

            validated.add(result);
        }

        boolean hasEvidence = !validated.isEmpty();
        return new EvidenceValidationResult(hasEvidence, validated, warnings, adversarial);
    }

    /**
     * Phát hiện dấu hiệu tấn công chỉ thị hoặc phá vỡ vai trò (Jailbreak / Prompt Injection).
     */
    public boolean isPotentialPromptInjection(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        for (Pattern p : PROMPT_INJECTION_PATTERNS) {
            if (p.matcher(text).find()) {
                return true;
            }
        }
        return false;
    }

    private boolean isForbiddenSourceId(String sourceId) {
        if (sourceId == null || sourceId.isBlank()) {
            return true;
        }
        String upper = sourceId.toUpperCase(Locale.ROOT);
        for (String forbidden : FORBIDDEN_SOURCE_TERMS) {
            if (upper.contains(forbidden)) {
                return true;
            }
        }
        return false;
    }

    public Set<String> getValidCatalogSourceIds() {
        return Collections.unmodifiableSet(validCatalogSourceIds);
    }
}
