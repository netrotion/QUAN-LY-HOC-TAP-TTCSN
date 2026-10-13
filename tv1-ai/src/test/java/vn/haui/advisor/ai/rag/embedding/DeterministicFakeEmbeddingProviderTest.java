package vn.haui.advisor.ai.rag.embedding;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DeterministicFakeEmbeddingProviderTest {

    private DeterministicFakeEmbeddingProvider provider;

    @BeforeEach
    void setUp() {
        provider = new DeterministicFakeEmbeddingProvider();
    }

    @Test
    @DisplayName("Throws IllegalArgumentException if input text is null or blank")
    void testInputValidation() {
        assertThatThrownBy(() -> provider.embed(null))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> provider.embed(""))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> provider.embed("   \t\n "))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> provider.embedAll(null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Returns correct dimension and non-blank model name")
    void testDimensionAndModelName() {
        assertThat(provider.getDimension()).isEqualTo(384);
        assertThat(provider.getModelName()).isNotBlank();

        DeterministicFakeEmbeddingProvider customProvider = new DeterministicFakeEmbeddingProvider(128);
        assertThat(customProvider.getDimension()).isEqualTo(128);
        float[] vec = customProvider.embed("Kiểm tra kích thước vector");
        assertThat(vec).hasSize(128);

        assertThatThrownBy(() -> new DeterministicFakeEmbeddingProvider(0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new DeterministicFakeEmbeddingProvider(-5))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Deterministic: same text always yields exact same vector")
    void testDeterminism() {
        String text = "Quy định về việc đăng ký tín chỉ và học cải thiện điểm HaUI";
        float[] vec1 = provider.embed(text);
        float[] vec2 = provider.embed(text);

        assertThat(vec1).hasSize(provider.getDimension());
        assertThat(vec2).hasSize(provider.getDimension());
        assertThat(vec1).containsExactly(vec2);

        List<float[]> batch = provider.embedAll(List.of(text, "Môn học đại cương"));
        assertThat(batch).hasSize(2);
        assertThat(batch.get(0)).containsExactly(vec1);
    }

    @Test
    @DisplayName("Vectors are normalized to unit L2 norm")
    void testUnitNormNormalization() {
        String text = "Sinh viên cần đạt CPA tối thiểu để tránh bị cảnh báo học tập";
        float[] vec = provider.embed(text);

        double normSq = 0.0;
        for (float v : vec) {
            normSq += (double) v * v;
        }
        double norm = Math.sqrt(normSq);
        assertThat(norm).isCloseTo(1.0, org.assertj.core.data.Offset.offset(1e-5));

        // Dot product with itself must be 1.0
        double dotSelf = dotProduct(vec, vec);
        assertThat(dotSelf).isCloseTo(1.0, org.assertj.core.data.Offset.offset(1e-5));
    }

    @Test
    @DisplayName("Texts sharing key Vietnamese academic terms yield cosine similarity > 0.5")
    void testSemanticSimilarityForVietnameseKeywords() {
        // Pair 1: đăng ký tín chỉ & cải thiện điểm
        String text1 = "Quy định về đăng ký tín chỉ và học cải thiện điểm";
        String text2 = "Sinh viên đăng ký tín chỉ để cải thiện điểm GPA và CPA";
        double sim1 = cosineSimilarity(provider.embed(text1), provider.embed(text2));
        assertThat(sim1).isGreaterThan(0.5);

        // Pair 2: cảnh báo học tập
        String text3 = "Mức xử lý cảnh báo kết quả học tập và buộc thôi học";
        String text4 = "Quy trình cảnh báo học tập sinh viên theo từng học kỳ";
        double sim2 = cosineSimilarity(provider.embed(text3), provider.embed(text4));
        assertThat(sim2).isGreaterThan(0.5);

        // Pair 3: tốt nghiệp
        String text5 = "Điều kiện công nhận và xét tốt nghiệp ra trường";
        String text6 = "Sinh viên hoàn thành chuẩn đầu ra để xét tốt nghiệp";
        double sim3 = cosineSimilarity(provider.embed(text5), provider.embed(text6));
        assertThat(sim3).isGreaterThan(0.5);

        // Unrelated texts yield significantly lower cosine similarity (< 0.25)
        String unrelated1 = "Thời tiết hôm nay tại thủ đô có nắng ráo và mát mẻ";
        String unrelated2 = "Bóng đá thế giới và lịch thi đấu giải vô địch châu Âu";
        double simUnrelated1 = cosineSimilarity(provider.embed(text1), provider.embed(unrelated1));
        double simUnrelated2 = cosineSimilarity(provider.embed(text3), provider.embed(unrelated2));

        assertThat(simUnrelated1).isLessThan(0.25);
        assertThat(simUnrelated2).isLessThan(0.25);
        assertThat(sim1).isGreaterThan(simUnrelated1 + 0.3);
    }

    private double dotProduct(float[] a, float[] b) {
        double dot = 0.0;
        for (int i = 0; i < a.length; i++) {
            dot += (double) a[i] * b[i];
        }
        return dot;
    }

    private double cosineSimilarity(float[] a, float[] b) {
        return dotProduct(a, b); // Since both are normalized to unit norm
    }
}
