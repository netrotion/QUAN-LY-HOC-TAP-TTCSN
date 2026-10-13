package vn.haui.advisor.ai.rag.embedding;

import java.text.Normalizer;
import java.util.*;

/**
 * Triển khai embedding giả lập nhưng xác định (deterministic pseudo-semantic embedding)
 * cho văn bản tiếng Việt và thuật ngữ học vụ HaUI.
 *
 * <p>Đặc tính kỹ thuật:
 * <ul>
 *   <li>Ánh xạ token (1-gram, 2-gram, n-gram) và từ khóa ngữ nghĩa sang vector số thực cố định chiều.</li>
 *   <li>Chuẩn hóa độ dài vector L2 về 1.0 (unit L2 norm) để tích vô hướng chính là cosine similarity.</li>
 *   <li>Tính tất định (deterministic): cùng chuỗi đầu vào luôn cho ra đúng vector tương tự.</li>
 *   <li>Ngữ nghĩa tương đồng: các câu chứa chung từ khóa học vụ (tín chỉ, đăng ký, gpa, cpa, cải thiện, cảnh báo, tốt nghiệp)
 *       sẽ có cosine similarity vượt trội (> 0.5) so với các câu không liên quan (< 0.25).</li>
 * </ul>
 */
public class DeterministicFakeEmbeddingProvider implements EmbeddingProvider {

    public static final int DEFAULT_DIMENSION = 384;
    private static final String DEFAULT_MODEL_NAME = "deterministic-fake-vietnamese-v1";

    private static final Set<String> KEY_ACADEMIC_TERMS = Set.of(
            "tín chỉ", "tin chi", "đăng ký", "dang ky",
            "học phần", "hoc phan", "gpa", "cpa",
            "cải thiện", "cai thien", "cảnh báo", "canh bao",
            "tốt nghiệp", "tot nghiep", "học kỳ", "hoc ky",
            "điểm", "diem", "rút học phần", "rut hoc phan",
            "học lại", "hoc lai", "chuẩn đầu ra", "chuan dau ra",
            "xét tốt nghiệp", "xet tot nghiep", "học bổng", "hoc bong",
            "học phí", "hoc phi", "chương trình đào tạo", "chuong trinh dao tao",
            "thời khóa biểu", "thoi khoa bieu", "khảo thí", "khao thi",
            "bảo lưu", "bao luu", "buộc thôi học", "buoc thoi hoc",
            "kết quả học tập", "ket qua hoc tap",
            "dự thi", "du thi", "kết thúc môn", "ket thuc mon", "kết thúc học phần", "ket thuc hoc phan",
            "chuyên cần", "chuyen can", "thời lượng", "thoi luong",
            "nợ môn", "no mon", "môn nợ", "mon no", "tiên quyết", "tien quyet", "học trước", "hoc truoc",
            "hạ mức", "ha muc", "hạ bậc", "ha bac", "hạ hạng", "ha hang", "5%",
            "bằng giỏi", "bang gioi", "phân loại học lực", "phan loai hoc luc",
            "công thức", "cong thuc", "gia quyền", "gia quyen", "thang điểm", "thang diem",
            "cảnh báo học vụ", "canh bao hoc vu", "năm thứ hai", "nam thu hai", "ngưỡng cảnh báo", "nguong canh bao"
    );

    private static final Set<String> STOP_WORDS = Set.of(
            "và", "va", "của", "cua", "các", "cac", "là", "la",
            "những", "nhung", "cho", "trong", "để", "de", "về", "ve",
            "có", "co", "được", "duoc", "khi", "ở", "o", "tại", "tai",
            "với", "voi", "một", "mot", "như", "nhu"
    );

    private final int dimension;
    private final String modelName;

    public DeterministicFakeEmbeddingProvider() {
        this(DEFAULT_DIMENSION, DEFAULT_MODEL_NAME);
    }

    public DeterministicFakeEmbeddingProvider(int dimension) {
        this(dimension, DEFAULT_MODEL_NAME + "-" + dimension);
    }

    public DeterministicFakeEmbeddingProvider(int dimension, String modelName) {
        if (dimension <= 0) {
            throw new IllegalArgumentException("Dimension must be positive: " + dimension);
        }
        this.dimension = dimension;
        this.modelName = modelName != null && !modelName.isBlank() ? modelName : DEFAULT_MODEL_NAME;
    }

    @Override
    public float[] embed(String text) {
        if (text == null || text.trim().isEmpty()) {
            throw new IllegalArgumentException("Text must not be null or blank");
        }

        String normalized = Normalizer.normalize(text.trim(), Normalizer.Form.NFC).toLowerCase(Locale.ROOT);
        String cleaned = normalized.replaceAll("[^\\p{L}\\p{Nd}]+", " ").trim();

        String[] tokens = cleaned.isEmpty() ? new String[]{normalized} : cleaned.split("\\s+");

        float[] accum = new float[dimension];

        // 1. Phân tích 1-gram
        for (String token : tokens) {
            if (token.isBlank()) continue;
            double weight = computeTokenWeight(token, 1.0);
            accumulateTokenVector(accum, token, weight);
        }

        // 2. Phân tích 2-gram (cụm từ 2 từ liền kề)
        for (int i = 0; i < tokens.length - 1; i++) {
            String bigram = tokens[i] + " " + tokens[i + 1];
            double weight = KEY_ACADEMIC_TERMS.contains(bigram) ? 8.0 : 0.5;
            accumulateTokenVector(accum, bigram, weight);
        }

        // 3. Phân tích 3-gram (cụm từ 3 từ liền kề)
        for (int i = 0; i < tokens.length - 2; i++) {
            String trigram = tokens[i] + " " + tokens[i + 1] + " " + tokens[i + 2];
            if (KEY_ACADEMIC_TERMS.contains(trigram)) {
                accumulateTokenVector(accum, trigram, 10.0);
            }
        }

        // 4. Phát hiện trực tiếp các thuật ngữ học vụ trọng tâm xuất hiện trong câu
        for (String keyTerm : KEY_ACADEMIC_TERMS) {
            if (normalized.contains(keyTerm)) {
                accumulateTokenVector(accum, keyTerm, 8.0);
            }
        }

        // 5. Chuẩn hóa L2 về unit norm
        return normalizeL2(accum);
    }

    private double computeTokenWeight(String term, double baseWeight) {
        if (KEY_ACADEMIC_TERMS.contains(term)) {
            return 7.0;
        }
        if (STOP_WORDS.contains(term)) {
            return 0.1;
        }
        return baseWeight;
    }

    private void accumulateTokenVector(float[] accum, String token, double weight) {
        long seed = hashToken(token);
        Random rng = new Random(seed);
        for (int i = 0; i < dimension; i++) {
            float val = (float) rng.nextGaussian();
            accum[i] += (float) (val * weight);
        }
    }

    private static long hashToken(String token) {
        long h = 1125899906842597L;
        int len = token.length();
        for (int i = 0; i < len; i++) {
            h = 31 * h + token.charAt(i);
        }
        return h;
    }

    private float[] normalizeL2(float[] vec) {
        double sumSq = 0.0;
        for (float v : vec) {
            sumSq += (double) v * v;
        }
        double norm = Math.sqrt(sumSq);
        float[] result = new float[vec.length];
        if (norm < 1e-12) {
            // Trường hợp hy hữu vector 0: gán giá trị đều đơn vị
            float uniformVal = (float) (1.0 / Math.sqrt(vec.length));
            Arrays.fill(result, uniformVal);
            return result;
        }
        for (int i = 0; i < vec.length; i++) {
            result[i] = (float) (vec[i] / norm);
        }
        return result;
    }

    @Override
    public int getDimension() {
        return dimension;
    }

    @Override
    public String getModelName() {
        return modelName;
    }
}
