package vn.haui.advisor.ai.rag.grounding;

import vn.haui.advisor.ai.rag.vector.VectorSearchResult;

import java.io.Serializable;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Kết quả kiểm định tính hợp lệ và an toàn của chứng cứ truy xuất RAG.
 */
public class EvidenceValidationResult implements Serializable {

    private final boolean hasEvidence;
    private final List<VectorSearchResult> validatedItems;
    private final List<String> warnings;
    private final boolean adversarialDetected;

    public EvidenceValidationResult(
            boolean hasEvidence,
            List<VectorSearchResult> validatedItems,
            List<String> warnings,
            boolean adversarialDetected
    ) {
        this.hasEvidence = hasEvidence;
        this.validatedItems = validatedItems != null ? Collections.unmodifiableList(validatedItems) : Collections.emptyList();
        this.warnings = warnings != null ? Collections.unmodifiableList(warnings) : Collections.emptyList();
        this.adversarialDetected = adversarialDetected;
    }

    public static EvidenceValidationResult noEvidence(List<String> warnings, boolean adversarialDetected) {
        return new EvidenceValidationResult(false, Collections.emptyList(), warnings, adversarialDetected);
    }

    public boolean isHasEvidence() {
        return hasEvidence;
    }

    public boolean hasEvidence() {
        return hasEvidence;
    }

    public List<VectorSearchResult> getValidatedItems() {
        return validatedItems;
    }

    public List<VectorSearchResult> validatedItems() {
        return validatedItems;
    }

    public List<String> getWarnings() {
        return warnings;
    }

    public List<String> warnings() {
        return warnings;
    }

    public boolean isAdversarialDetected() {
        return adversarialDetected;
    }

    public boolean adversarialDetected() {
        return adversarialDetected;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        EvidenceValidationResult that = (EvidenceValidationResult) o;
        return hasEvidence == that.hasEvidence
                && adversarialDetected == that.adversarialDetected
                && Objects.equals(validatedItems, that.validatedItems)
                && Objects.equals(warnings, that.warnings);
    }

    @Override
    public int hashCode() {
        return Objects.hash(hasEvidence, validatedItems, warnings, adversarialDetected);
    }

    @Override
    public String toString() {
        return "EvidenceValidationResult{" +
                "hasEvidence=" + hasEvidence +
                ", validatedItemsCount=" + validatedItems.size() +
                ", warningsCount=" + warnings.size() +
                ", adversarialDetected=" + adversarialDetected +
                '}';
    }
}
