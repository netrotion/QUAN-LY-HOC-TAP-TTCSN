package vn.haui.advisor.ai.rag.retrieval;

import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.*;

/**
 * Chuẩn hóa câu hỏi tiếng Việt của sinh viên và phát hiện từ khóa ý định (Intent Keywords):
 * <ul>
 *   <li>Cắt tỉa khoảng trắng dư thừa, chuyển về chữ thường để phục vụ so khớp không phân biệt hoa thường.</li>
 *   <li>Chuẩn hóa mã ký tự Unicode theo dạng dựng sẵn NFC.</li>
 *   <li>Loại bỏ dấu câu gây nhiễu trong khi bảo toàn các dấu thanh tiếng Việt, chữ số, số thập phân (1.20, 1.40)
 *       và các ký hiệu thang điểm có dấu cộng (B+, D+, A+, C+) cũng như thuật ngữ GPA, CPA.</li>
 *   <li>Nhận diện các từ khóa học vụ trọng tâm phục vụ boosting và xếp hạng tìm kiếm.</li>
 * </ul>
 */
@Component
public class VietnameseQueryNormalizer {

    public static final Set<String> ACADEMIC_KEYWORDS = Set.of(
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
            "công thức", "cong thuc", "gia quyền", "gia quyen", "thang điểm", "thang diem"
    );

    /**
     * Chuẩn hóa chuỗi truy vấn tiếng Việt.
     *
     * @param query câu hỏi thô từ người dùng
     * @return chuỗi đã chuẩn hóa chữ thường, lọc sạch dấu câu nhiễu, bảo toàn dấu thanh và điểm số
     */
    public String normalize(String query) {
        if (query == null || query.isBlank()) {
            return "";
        }

        String nfc = Normalizer.normalize(query.trim(), Normalizer.Form.NFC).toLowerCase(Locale.ROOT);

        StringBuilder sb = new StringBuilder(nfc.length());
        for (int i = 0; i < nfc.length(); i++) {
            char c = nfc.charAt(i);
            if (Character.isLetterOrDigit(c) || Character.isWhitespace(c)) {
                sb.append(c);
            } else if (c == '+') {
                // Bảo toàn dấu cộng nếu đứng liền sau chữ cái hoặc số (ví dụ: b+, d+, a+, c+)
                if (i > 0 && Character.isLetterOrDigit(nfc.charAt(i - 1))) {
                    sb.append(c);
                } else {
                    sb.append(' ');
                }
            } else if (c == '.') {
                // Bảo toàn dấu chấm thập phân giữa các chữ số (ví dụ: 1.20, 3.18)
                if (i > 0 && Character.isDigit(nfc.charAt(i - 1))
                        && i + 1 < nfc.length() && Character.isDigit(nfc.charAt(i + 1))) {
                    sb.append(c);
                } else {
                    sb.append(' ');
                }
            } else {
                sb.append(' ');
            }
        }

        return sb.toString().replaceAll("\\s+", " ").trim();
    }

    /**
     * Mở rộng ngữ nghĩa truy vấn phục vụ tìm kiếm RAG tương đồng cao.
     */
    public String expandForSearch(String cleaned) {
        if (cleaned == null || cleaned.isBlank()) {
            return "";
        }
        String expanded = cleaned;
        if (expanded.contains("kết thúc môn")) {
            expanded += " kết thúc học phần dự thi";
        }
        if (expanded.contains("dự thi") && !expanded.contains("học phần")) {
            expanded += " điều kiện dự thi kết thúc học phần";
        }
        if (expanded.contains("cảnh báo học vụ") || expanded.contains("cảnh báo")) {
            expanded += " tiêu chí và ngưỡng cảnh báo học vụ các mức xử lý cảnh báo học vụ";
        }
        if (expanded.contains("năm 2") || expanded.contains("năm hai")) {
            expanded += " tiêu chí và ngưỡng cảnh báo học vụ sinh viên năm thứ hai 1.40";
        }
        if (expanded.contains("nợ môn")) {
            expanded += " học lại điểm f";
        }
        if (expanded.contains("đăng ký học môn") || (expanded.contains("đăng ký") && expanded.contains("được không"))) {
            expanded += " quy trình đăng ký học phần và lớp học phần";
        }
        if (expanded.contains("tăng lên bao nhiêu") || expanded.contains("đều đạt")) {
            expanded += " công thức tính điểm trung bình tích lũy cpa gpa";
        }
        return expanded.replaceAll("\\s+", " ").trim();
    }

    /**
     * Phát hiện tập hợp các từ khóa ý định học vụ có trong câu hỏi.
     *
     * @param query câu hỏi người dùng
     * @return tập hợp các từ khóa học vụ được nhận diện (không trùng lặp)
     */
    public Set<String> detectIntentKeywords(String query) {
        if (query == null || query.isBlank()) {
            return Collections.emptySet();
        }

        String normalized = normalize(query);
        Set<String> matched = new LinkedHashSet<>();
        for (String term : ACADEMIC_KEYWORDS) {
            if (normalized.contains(term)) {
                matched.add(term);
            }
        }
        return Collections.unmodifiableSet(matched);
    }

    /**
     * Kiểm tra xem câu hỏi có chứa ý định hoặc thuật ngữ học vụ HaUI hay không.
     */
    public boolean hasAcademicIntent(String query) {
        return !detectIntentKeywords(query).isEmpty();
    }
}
