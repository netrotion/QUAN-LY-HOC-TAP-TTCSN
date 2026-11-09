package vn.haui.advisor.ai.rag.search;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.rag.model.RagChunk;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class LuceneLexicalSearcherTest {

    private LuceneLexicalSearcher searcher;

    @BeforeEach
    void setUp() {
        searcher = new LuceneLexicalSearcher();

        RagChunk chunk1 = new RagChunk(
                "REG-HAUI-01-CH-014",
                "REG-HAUI-01",
                "Quy chế Đào tạo HaUI 2024",
                "Điều 14. Đăng ký học phần",
                "v2024",
                "https://haui.edu.vn/bylaws/reg-01",
                "Khoản 1. Sinh viên phải đăng ký học phần qua cổng thông tin. Khoản 2. Sinh viên đăng ký học cải thiện đối với các học phần điểm D để nâng cao CPA tích lũy. Học phí tính theo tín chỉ đăng ký.",
                14,
                45
        );

        RagChunk chunk2 = new RagChunk(
                "REG-HAUI-01-CH-015",
                "REG-HAUI-01",
                "Quy chế Đào tạo HaUI 2024",
                "Điều 15. Rút học phần",
                "v2024",
                "https://haui.edu.vn/bylaws/reg-01",
                "Khoản 1. Thời hạn rút học phần là trong 2 tuần đầu kỳ học chính. Học phí học phần đã rút không được hoàn trả.",
                15,
                30
        );

        RagChunk chunk3 = new RagChunk(
                "REG-HAUI-02-CH-008",
                "REG-HAUI-02",
                "Quy định Đánh giá kết quả học tập",
                "Điều 8. Cảnh báo học tập và Buộc thôi học",
                "v2024",
                "https://haui.edu.vn/bylaws/reg-02",
                "Sinh viên bị cảnh báo học tập nếu CPA dưới 1.20 ở năm nhất hoặc nợ quá 24 tín chỉ. Mã quyết định F23-006.",
                8,
                35
        );

        searcher.indexChunks(List.of(chunk1, chunk2, chunk3));
    }

    @Test
    void search_exactSectionAndArticle_returnsRankOne() {
        List<LexicalHit> hits = searcher.search("Khoản 2 Điều 14", 5);

        assertThat(hits).isNotEmpty();
        assertThat(hits.getFirst().chunkId()).isEqualTo("REG-HAUI-01-CH-014");
        assertThat(hits.getFirst().score()).isGreaterThan(0.0);
    }

    @Test
    void search_diacriticFolding_matchesAccentedContent() {
        List<LexicalHit> hits = searcher.search("dieu 14 hoc cai thien", 5);

        assertThat(hits).isNotEmpty();
        assertThat(hits.getFirst().chunkId()).isEqualTo("REG-HAUI-01-CH-014");
    }

    @Test
    void search_entityCode_matchesExactToken() {
        List<LexicalHit> hits = searcher.search("F23-006", 5);

        assertThat(hits).isNotEmpty();
        assertThat(hits.getFirst().chunkId()).isEqualTo("REG-HAUI-02-CH-008");
    }

    @Test
    void search_blankOrNullQuery_returnsEmpty() {
        assertThat(searcher.search("", 5)).isEmpty();
        assertThat(searcher.search("   ", 5)).isEmpty();
        assertThat(searcher.search(null, 5)).isEmpty();
    }
}

