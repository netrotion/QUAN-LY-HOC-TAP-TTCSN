package vn.haui.advisor.ai.rag.search;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.rag.service.GroundedContext;
import vn.haui.advisor.ai.rag.service.RagAdvisorService;
import vn.haui.advisor.contracts.dto.ChatSourceItem;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("HybridSearchIntegrationTest: BM25 + Vector + RRF + Re-ranking Pipeline")
class HybridSearchIntegrationTest {

    private RagAdvisorService ragAdvisorService;

    @BeforeEach
    void setUp() {
        ragAdvisorService = new RagAdvisorService();
        ragAdvisorService.initializeCatalogIndex();
    }

    @Test
    @DisplayName("Query for Credit Limits returns exact section with high confidence")
    void testExactSectionRetrieval_CreditLimits() {
        GroundedContext context = ragAdvisorService.retrieveAndGround("Giới hạn đăng ký tín chỉ trong kỳ chính là bao nhiêu?");

        assertThat(context.hasEvidence()).isTrue();
        assertThat(context.citations()).isNotEmpty();
        assertThat(context.evidenceChunks()).anyMatch(chunk ->
                chunk.getSection() != null && chunk.getSection().contains("Giới hạn Đăng ký Tín chỉ")
        );
        ChatSourceItem topCitation = context.citations().getFirst();
        assertThat(topCitation.getSourceId()).isEqualTo("REG-HAUI-01");
    }

    @Test
    @DisplayName("Query with no diacritics 'rut va huy hoc phan' matches exact regulation section")
    void testNoDiacriticsSectionRetrieval_RutHocPhan() {
        GroundedContext context = ragAdvisorService.retrieveAndGround("quy trinh rut va huy hoc phan quy dinh the nao");

        assertThat(context.hasEvidence()).isTrue();
        assertThat(context.citations()).isNotEmpty();
        assertThat(context.evidenceChunks()).anyMatch(chunk ->
                chunk.getSection() != null && chunk.getSection().contains("Rút và Hủy Học phần")
        );
    }

    @Test
    @DisplayName("Grounded prompt context includes official HaUI Ground Truth header and Markdown fences")
    void testGroundedPromptFormatting() {
        GroundedContext context = ragAdvisorService.retrieveAndGround("Cách tính điểm trung bình chung tích lũy CPA");

        assertThat(context.hasEvidence()).isTrue();
        assertThat(context.formattedPromptContext()).contains("HAUI GROUND TRUTH");
        assertThat(context.formattedPromptContext()).contains("```text");
    }
}
