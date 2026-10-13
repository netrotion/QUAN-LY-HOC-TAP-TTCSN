package vn.haui.advisor.ai.rag.retrieval;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("VietnameseQueryNormalizer Tests")
class VietnameseQueryNormalizerTest {

    private VietnameseQueryNormalizer normalizer;

    @BeforeEach
    void setUp() {
        normalizer = new VietnameseQueryNormalizer();
    }

    @Test
    @DisplayName("Normalizes whitespace, casing, and removes noisy punctuation")
    void testNormalizePunctuationAndWhitespace() {
        String raw = "  Học kỳ chính được đăng ký tối đa bao nhiêu tín chỉ???  ";
        String normalized = normalizer.normalize(raw);
        assertThat(normalized).isEqualTo("học kỳ chính được đăng ký tối đa bao nhiêu tín chỉ");
    }

    @Test
    @DisplayName("Preserves Vietnamese accents and tone marks in NFC")
    void testPreservesVietnameseAccents() {
        String raw = "Quy định cảnh báo học vụ và buộc thôi học của trường";
        String normalized = normalizer.normalize(raw);
        assertThat(normalized).isEqualTo("quy định cảnh báo học vụ và buộc thôi học của trường");
    }

    @Test
    @DisplayName("Preserves numbers in query text")
    void testPreservesNumbers() {
        String raw = "Ngưỡng cảnh báo học vụ năm thứ 2 là 1.20 hay 1.40?";
        String normalized = normalizer.normalize(raw);
        assertThat(normalized).isEqualTo("ngưỡng cảnh báo học vụ năm thứ 2 là 1.20 hay 1.40");
    }

    @Test
    @DisplayName("Preserves academic grade letter symbols with plus sign such as B+, D+, A+, C+")
    void testPreservesGradePlusSymbols() {
        String raw = "Điểm B+ có được học cải thiện không?! Hay chỉ D+ và F?";
        String normalized = normalizer.normalize(raw);
        assertThat(normalized).isEqualTo("điểm b+ có được học cải thiện không hay chỉ d+ và f");
    }

    @Test
    @DisplayName("Preserves acronyms such as GPA and CPA in lowercase normalized form")
    void testPreservesAcronymsGpaCpa() {
        String raw = "CPA, GPA khác nhau thế nào trong quy chế?";
        String normalized = normalizer.normalize(raw);
        assertThat(normalized).isEqualTo("cpa gpa khác nhau thế nào trong quy chế");
    }

    @Test
    @DisplayName("Returns empty string for null, empty or blank query")
    void testHandlesBlankOrNull() {
        assertThat(normalizer.normalize(null)).isEmpty();
        assertThat(normalizer.normalize("")).isEmpty();
        assertThat(normalizer.normalize("   \t\n  ")).isEmpty();
    }

    @Test
    @DisplayName("Detects academic intent keywords for credit limits query")
    void testDetectIntentKeywordsForCreditLimits() {
        String query = "Học kỳ chính được đăng ký tối đa bao nhiêu tín chỉ?";
        Set<String> keywords = normalizer.detectIntentKeywords(query);
        assertThat(keywords).contains("tín chỉ", "đăng ký", "học kỳ");
    }

    @Test
    @DisplayName("Detects academic intent keywords for GPA/CPA query")
    void testDetectIntentKeywordsForGpaCpa() {
        String query = "GPA và CPA khác nhau thế nào?";
        Set<String> keywords = normalizer.detectIntentKeywords(query);
        assertThat(keywords).contains("gpa", "cpa");
    }

    @Test
    @DisplayName("Detects academic intent keywords for retake/improvement query")
    void testDetectIntentKeywordsForRetakeImprovement() {
        String query = "Điểm B có được học cải thiện không?";
        Set<String> keywords = normalizer.detectIntentKeywords(query);
        assertThat(keywords).contains("cải thiện", "điểm");
    }

    @Test
    @DisplayName("Detects academic intent keywords for academic warning query")
    void testDetectIntentKeywordsForAcademicWarning() {
        String query = "Ngưỡng cảnh báo học vụ năm thứ hai?";
        Set<String> keywords = normalizer.detectIntentKeywords(query);
        assertThat(keywords).contains("cảnh báo");
    }

    @Test
    @DisplayName("Detects academic intent keywords for graduation query")
    void testDetectIntentKeywordsForGraduation() {
        String query = "Điều kiện tốt nghiệp là gì?";
        Set<String> keywords = normalizer.detectIntentKeywords(query);
        assertThat(keywords).contains("tốt nghiệp");
    }

    @Test
    @DisplayName("Returns empty intent keywords for out-of-scope query")
    void testOutOfScopeQueryReturnsEmptyKeywords() {
        String query = "Thời tiết Hà Nội ngày mai có mưa không?";
        Set<String> keywords = normalizer.detectIntentKeywords(query);
        assertThat(keywords).isEmpty();
        assertThat(normalizer.hasAcademicIntent(query)).isFalse();
    }
}
