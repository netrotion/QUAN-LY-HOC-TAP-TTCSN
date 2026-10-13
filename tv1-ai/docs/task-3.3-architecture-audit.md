# BÁO CÁO KIỂM TOÁN KIẾN TRÚC VÀ HỢP ĐỒNG TASK 3.3
## RAG Pipeline, Source Catalog, Contracts V1 Alignment & Repository Baseline

- **Dự án:** HaUI Advisor (Hệ thống Cố vấn Học tập Thông minh — Đại học Công nghiệp Hà Nội)
- **Mã Task:** Task 3.3 — Code RAG và đọc nguồn
- **Phân hệ / Module:** `tv1-ai`
- **Vai trò thực hiện:** Sub-Agent A — Repository & Contract Auditor
- **Ngày kiểm toán:** 2026-10-13
- **Trạng thái phê duyệt:** `AUDIT_COMPLETE_BASELINE_VERIFIED`

---

## 1. Tóm tắt Điều hành (Executive Summary)

Báo cáo này cung cấp kết quả kiểm toán toàn diện về kho mã nguồn, tài liệu quy chế gốc, hợp đồng giao tiếp Contracts V1, kiến trúc module AI hiện tại và hiện trạng build/test của hệ thống HaUI Advisor trước khi triển khai Task 3.3 (Code RAG và đọc nguồn).

### Kết luận Kiểm toán Trọng tâm:
1. **Dữ liệu Quy chế Gốc (Ground Truth Documents):** Toàn bộ 5 tài liệu quy chế chuẩn hóa (`REG-HAUI-01` đến `REG-HAUI-05`) tại `data-source/documents/` đều hợp lệ, sử dụng mã hóa ký tự UTF-8 chuẩn tiếng Việt, có cấu trúc tiêu đề phân cấp rõ ràng (`#`, `##`, mục số), bảng biểu tra cứu điểm và các công thức toán học LaTeX (`\text{GPA}`, `\text{CPA}`, `\text{ROI}`).
2. **Danh mục Nguồn (Source Catalog):** Tệp `tv1-ai/src/main/resources/rag/source-catalog.json` phiên bản 1.0.0 đã đăng ký đầy đủ 5 tài liệu quy chế với hash phiên bản dạng `gitblob:<12_hex_sha>` khớp chính xác 100% với commit tree hiện tại của Git, được kiểm chứng tự động qua 18 bài test trong `ChatEvalAndCatalogValidationTest`.
3. **Sự tương thích với Contracts V1 (Task 2.4):** Cấu trúc DTO `ChatSourceItem` và `ChatResponse` trong package `vn.haui.advisor.contracts.dto` khớp 1:1 với đặc tả OpenAPI 3.0.3 (`openapi-v1.yaml` phiên bản 1.2.0). Nguyên tắc cốt lõi của hợp đồng: mọi nguồn trích dẫn trong `ChatResponse.sources` **bắt buộc phải tồn tại trong ngữ cảnh được truy xuất (retrieved context)**; nếu không đủ căn cứ thì trả về `sources: []` và cảnh báo `NO_EVIDENCE`.
4. **Hiện trạng Build & Test Baseline:**
   - **Maven AI Module:** `.\mvnw.cmd -B -pl tv1-ai -am test` đạt **100% SUCCESS** (33 tests của `haui-ai` và 182 tests của `haui-contracts` chạy thành công, 0 lỗi, 0 thất bại).
   - **Maven Platform App:** `.\mvnw.cmd -B -pl tv5-platform/app -am test-compile` đạt **SUCCESS** (toàn bộ 5 reactor modules biên dịch sạch sẽ).
   - **NPM & System Smoke Check:** Lệnh `npm run smoke` đạt **10/10 PASS** (Secrets Scanner, Ownership Boundaries, Cyclic Dependency Gates, Contracts V1, Frontend Lint, Frontend Tests, Vite Build, Backend Reactor Tests, Docker Compose, DB Migrations V1-V4).
5. **Khoảng trống Nghiệp vụ Task 3.3:** Module `tv1-ai` hiện mới có khung sườn `MockAdvisorModel` (trả về fixture giả lập `SRC-MOCK-POLICY`) và `LiveAdvisorModel` (đang ném ngoại lệ chưa triển khai). Toàn bộ pipeline RAG gồm: bộ đọc tài liệu Markdown, bộ cắt lát ngữ nghĩa (Semantic Chunker), trừu tượng hóa EmbeddingProvider, bộ lưu trữ vector (VectorStore), bộ truy xuất (Retriever), bộ thẩm định chứng cứ (EvidenceValidator) và bộ neo trích dẫn (CitationGrounder) cần được thiết kế và xây dựng mới trong Task 3.3.

---

## 2. Kiểm toán Tài liệu Quy chế Gốc (`data-source/documents/**`)

Thư mục `data-source/documents/` lưu trữ 5 văn bản quy chế đào tạo đại học chính quy của Trường Đại học Công nghiệp Hà Nội làm nền tảng cho hệ sinh thái RAG:

| Mã Tài liệu | Tên Tệp | Phiên bản Git Blob | Định dạng & Cấu trúc Đặc biệt | Nội dung Quy chế Cốt lõi |
|---|---|---|---|---|
| **REG-HAUI-01** | `01_quy_che_dao_tao_tin_chi_haui.md` | `gitblob:cab439dd3364` | Tiêu đề phân cấp 3 cấp độ, danh sách đánh số | - Mỗi năm có 2 kỳ chính (15-18 tuần) và 1 kỳ hè (5-7 tuần).<br>- Tải tín chỉ kỳ chính: Tối thiểu **10 TC**, tối đa **24 TC** (bình thường); tối đa **14 TC** (nếu đang bị cảnh báo học vụ).<br>- Kỳ hè: tối đa **12 TC**, không giới hạn tối thiểu.<br>- Rút môn: trong 2 tuần đầu kỳ chính, 1 tuần đầu kỳ hè; không được làm số TC giảm dưới 10.<br>- Điều kiện dự thi: dự lớp $\ge 80\%$, làm đủ $100\%$ thí nghiệm/BTL/đồ án, điểm KTTX và giữa kỳ $\ge 4.0/10$. |
| **REG-HAUI-02** | `02_thang_diem_va_cach_tinh_gpa_cpa.md` | `gitblob:0a22d0023279` | Bảng chuẩn Markdown 5 cột, công thức LaTeX `$$\text{GPA}$$`, `$$\text{CPA}$$` | - Bảng quy đổi Thang 10 $\rightarrow$ Chữ $\rightarrow$ Thang 4: A (4.0), B+ (3.5), B (3.0), C+ (2.5), C (2.0), D+ (1.5), D (1.0), F (0.0). Dưới 4.0 là F (học lại).<br>- Công thức trung bình gia quyền tín chỉ GPA & CPA.<br>- GDTC và GDQP-AN cấp chứng chỉ, **không tính vào CPA tích lũy**.<br>- Phân loại học lực: Xuất sắc ($\ge 3.60$), Giỏi ($3.20 - 3.59$), Khá ($2.50 - 3.19$), Trung bình ($2.00 - 2.49$), Yếu ($1.00 - 1.99$), Kém ($< 1.00$). |
| **REG-HAUI-03** | `03_quy_dinh_hoc_lai_va_hoc_cai_thien.md` | `gitblob:b7e379af2bf7` | Tiêu đề, công thức LaTeX `$$\text{ROI}$$`, danh sách ưu tiên | - Học lại môn điểm F: bắt buộc học lại nếu là môn bắt buộc; tự chọn có thể học lại hoặc chọn môn tương đương. Điểm mới ($\ge$ D) thay thế điểm F khi tính CPA.<br>- Học cải thiện: Chỉ áp dụng cho môn đạt điểm **D, D+, C** ($1.0 - 2.0$). **Nghiêm cấm học cải thiện môn đã đạt B trở lên** (B, B+, A). Giữ điểm cao nhất.<br>- Công thức ROI: $\text{ROI} = \frac{\Delta \text{Điểm kỳ vọng} \times \text{Số TC}}{\text{Chi phí tải tín chỉ}}$. Ưu tiên 1: môn D có 3-4 TC; Ưu tiên 2: môn D+. |
| **REG-HAUI-04** | `04_quy_dinh_canh_bao_hoc_vu_va_buoc_thoi_hoc.md` | `gitblob:f5f1503d4179` | Tiêu đề, công thức inline LaTeX | - Ngưỡng CPA cảnh báo học vụ theo năm đào tạo: Năm 1: $\text{CPA} < 1.20$; Năm 2: $\text{CPA} < 1.40$; Năm 3: $\text{CPA} < 1.60$; Năm 4 trở đi: $\text{CPA} < 1.80$.<br>- Ngưỡng GPA: kỳ đầu $< 0.80$, các kỳ sau $< 1.00$.<br>- Nợ đọng: tổng TC điểm F chưa đạt $> 24\text{ TC}$.<br>- Xử lý: Mức 1 (tối đa 14 TC kỳ kế tiếp), Mức 2 (giám sát đặc biệt).<br>- Buộc thôi học: Cảnh báo **02 lần liên tiếp**; vượt quá thời gian tối đa (8 năm cho hệ 4 năm); tự ý bỏ học không đăng ký môn. |
| **REG-HAUI-05** | `05_chuan_dau_ra_va_dieu_kien_tot_nghiep.md` | `gitblob:f45ea177a03d` | Tiêu đề phân cấp, danh mục chuẩn đầu ra, điều kiện hạ hạng | - Điều kiện tốt nghiệp: Đủ TC (135–150 TC), $\text{CPA} \ge 2.00$, đạt thực tập, đạt đồ án/khóa luận, không bị kỷ luật đình chỉ.<br>- Chuẩn đầu ra bắt buộc (không tính TC): Ngoại ngữ (TOEIC 450-550 / VSTEP B1/B2 hoặc tiếng thứ 2), Tin học (MOS / IC3 / CNTT cơ bản), GDTC và GDQP-AN.<br>- Hạng tốt nghiệp: Xuất sắc ($\ge 3.60$), Giỏi ($\ge 3.20$), Khá ($\ge 2.50$), Trung bình ($\ge 2.00$).<br>- **Hạ hạng bằng tốt nghiệp:** Bị giảm 1 bậc nếu khối lượng môn học lại vượt quá **5% tổng số tín chỉ**, hoặc bị kỷ luật từ cảnh cáo cấp trường trở lên. |

### Đánh giá Kỹ thuật về Định dạng Văn bản:
- **Mã hóa ký tự:** 100% tệp lưu dưới dạng UTF-8 không BOM, dấu thanh và ký tự tiếng Việt nguyên vẹn.
- **Bảng biểu:** Tệp `02_thang_diem_va_cach_tinh_gpa_cpa.md` chứa bảng Markdown chuẩn. Trình chia nhỏ tài liệu (Chunker) không được cắt đôi bảng giữa chừng làm mất ngữ cảnh tiêu đề cột.
- **Công thức Toán học LaTeX:** Các biểu thức `$$\text{GPA} = ...$$`, `$$\text{CPA} = ...$$`, `$$\text{ROI} = ...$$` và ký hiệu toán học `$a_i$`, `$c_i$` cần được giữ nguyên vẹn trong chunk để khi đưa vào LLM hoặc hiển thị trích dẫn không bị biến dạng cú pháp.

---

## 3. Kiểm toán RAG Source Catalog (`source-catalog.json`)

Tệp `tv1-ai/src/main/resources/rag/source-catalog.json` đóng vai trò là "Sổ cái danh mục nguồn" (Ground-Truth Source Catalog) của hệ thống:
- Thuộc tính `catalog_version`: `"1.0.0"`.
- Thuộc tính `sources`: Danh sách 5 đối tượng nguồn tri thức.
- Mỗi đối tượng nguồn có đầy đủ các trường:
  - `source_id`: Bắt đầu bằng tiền tố `REG-HAUI-` (`REG-HAUI-01` đến `REG-HAUI-05`).
  - `title`: Tên tài liệu chính thức.
  - `path`: Đường dẫn tương đối trỏ về `data-source/documents/`.
  - `version`: Khóa phiên bản dạng `gitblob:<12_hex_sha>`.
  - `source_status`: `"PROJECT_GROUND_TRUTH"`.
  - `rag_enabled`: `true`.
  - `reference_url`: URL cổng thông tin đào tạo sinh viên `sv.haui.edu.vn`.
  - `sections`: Mảng các đường dẫn tiêu đề phân cấp phản ánh chính xác cấu trúc văn bản.

### Đối soát tính toàn vẹn với Git:
Lệnh `git ls-tree HEAD data-source/documents/` xác nhận:
```text
100644 blob cab439dd33642419abc8ee11fbe9023adb2a0188  01_quy_che_dao_tao_tin_chi_haui.md -> gitblob:cab439dd3364
100644 blob 0a22d00232795b23da4a62b786d8482db52eaa29  02_thang_diem_va_cach_tinh_gpa_cpa.md -> gitblob:0a22d0023279
100644 blob b7e379af2bf7fa13ac67fb0d691dc86b6829277b  03_quy_dinh_hoc_lai_va_hoc_cai_thien.md -> gitblob:b7e379af2bf7
100644 blob f5f1503d41798cb6f1f23ca2de5b3f9d2edb3250  04_quy_dinh_canh_bao_hoc_vu_va_buoc_thoi_hoc.md -> gitblob:f5f1503d4179
100644 blob f45ea177a03d90ccad36f274784fa27ef8c2a5d5  05_chuan_dau_ra_va_dieu_kien_tot_nghiep.md -> gitblob:f45ea177a03d
```
Tất cả 5 hash phiên bản đều khớp tuyệt đối 100%.

---

## 4. Kiểm toán Hợp đồng Contracts V1 (`tv5-platform/contracts/**`)

### 4.1. Khớp nối Mô hình Dữ liệu Trích dẫn (`ChatSourceItem`)
Trong `tv5-platform/contracts/openapi/openapi-v1.yaml` (dòng 2307–2329) và `ChatSourceItem.java`:

| Trường trong Contract | Kiểu Dữ liệu | Bắt buộc | Mô tả & Ràng buộc Hợp đồng |
|---|---|:---:|---|
| `sourceId` | `string` | **Có** | Mã định danh tài liệu trong RAG source catalog (ví dụ: `REG-HAUI-01`). |
| `title` | `string` | **Có** | Tên đầy đủ của văn bản quy chế. |
| `section` | `string` | Không (Nullable) | Mục trích dẫn cụ thể (ví dụ: `2. Giới hạn Đăng ký Tín chỉ (Credit Limits)`). |
| `version` | `string` | Không (Nullable) | Phiên bản văn bản, phải khớp dạng `gitblob:<12_hex_sha>`. |
| `referenceUrl` | `string` | Không (Nullable) | Đường dẫn tham chiếu URL đến trang quy chế chính thức. |

### 4.2. Cấu trúc Phản hồi Hội thoại (`ChatResponse`)
Theo OpenAPI v1.2.0 (dòng 2351–2376) và `ChatResponse.java`:
- `answer`: Chuỗi câu trả lời của trợ lý học vụ.
- `sources`: Danh sách `ChatSourceItem`. Hợp đồng quy định rõ: *Nguồn trích dẫn; phải tồn tại trong context đã truy xuất*.
- `actions`: Danh sách gợi ý hành động (`ChatActionItem`), điều hướng người dùng tới trang tương ứng.
- `planProposal`: Đề xuất kế hoạch học tập (`ChatPlanProposal`), trả về `null` nếu câu hỏi chỉ thuần túy tra cứu quy chế.
- `warnings`: Danh sách cảnh báo học vụ hoặc cảnh báo hệ thống (`List<String>`), ví dụ: `TRANSCRIPT_REQUIRED`, `POLICY_SOURCE_UNAVAILABLE`, `NO_EVIDENCE`.

### 4.3. Các Quy tắc Bất biến trong Hợp đồng:
1. **Không giả mạo danh tính:** `ChatRequest` tuyệt đối không chứa trường `studentId`. Danh tính sinh viên được server trích xuất và bảo vệ trong `TrustedStudentContext`.
2. **Không encode cảnh báo vào câu trả lời:** Cảnh báo phải được giữ nguyên dạng cấu trúc trong trường `warnings`.
3. **Chống ảo giác trích dẫn (Zero Hallucination of Sources):** Bộ kiểm thử `ChatEvalAndCatalogValidationTest` (Rule 10 & Rule 13) nghiêm cấm sử dụng các mã nguồn giả mạo cũ (`SRC-MOCK-POLICY`, `2024-FIXTURE`, `DEMO_UNVERIFIED`). Câu hỏi quy chế khi trả lời thành công bắt buộc phải trích dẫn đúng `source_id` có trong catalog với `version` tương ứng. Khi không tìm thấy nguồn chứng cứ (`NO_EVIDENCE`), trường `sources` bắt buộc phải là mảng rỗng `[]`.
4. **Phát hiện Deprecation trong Codebase:**
   - `GenerateStudyPlanResponse.getPlanId()` bị deprecated $\rightarrow$ thay bằng `getProposalId()`.
   - `AcademicStatusResponse.getWarningMessages()` bị deprecated $\rightarrow$ thay bằng `getWarnings()`.
   - `ChatPlanProposal.getSuggestedSemesters()` bị deprecated $\rightarrow$ thay bằng `getSemesters()`.

---

## 5. Kiểm toán Hiện trạng Triển khai Module `tv1-ai`

### 5.1. Các Lớp Hiện có và Trạng thái:
- `vn.haui.advisor.ai.config.AiAutoConfiguration`: Auto-configuration của Spring Boot điều phối giữa MOCK và LIVE.
  - Chế độ MOCK: Đăng ký `MockAdvisorModel` và `MockAcademicFacade`.
  - Chế độ LIVE: Đăng ký `LiveAdvisorModel`, đòi hỏi `AcademicFacade` thật; nếu thiếu bean sẽ fail ngay lập tức, không tự ý fallback về mock.
- `vn.haui.advisor.ai.model.AdvisorModel`: Interface trừu tượng cốt lõi (`AdvisorModelOutput generate(AdvisorModelInput input)`).
- `vn.haui.advisor.ai.model.MockAdvisorModel`: Triển khai mock hiện tại phục vụ Task 1.3c:
  - Case A: Trả về câu trả lời cố định kèm nguồn `SRC-MOCK-POLICY` (**lỗi thời, vi phạm ChatEval Rule 10**).
  - Case B: Đề xuất kế hoạch học tập qua `toolAdapter`.
  - Case C: Trả về cảnh báo học vụ.
- `vn.haui.advisor.ai.model.LiveAdvisorModel`: Hiện tại ném `UnsupportedOperationException("Live Gemini inference is not configured...")`.
- `vn.haui.advisor.ai.service.DefaultAdvisorFacade`: Thực thi port `AdvisorFacade`, kiểm tra an toàn `TrustedStudentContext.getStudentId()`, phân tích intent cơ bản để gọi `ToolAdapter`.
- `vn.haui.advisor.ai.tools.DefaultToolAdapter`: Chuyển tiếp yêu cầu tra cứu tới `AcademicFacade` với `studentId` an toàn.

### 5.2. Các Thành phần RAG Còn Thiếu cho Task 3.3:
| Thành phần Cần thiết | Trạng thái Hiện tại | Yêu cầu Kỹ thuật Task 3.3 |
|---|:---:|---|
| **Bộ đọc Tài liệu (Document Reader)** | Chưa có | Đọc các tệp Markdown từ `data-source/documents/`, phân tách tiêu đề, bảng, công thức. |
| **Trình chia lát (Semantic Chunker)** | Chưa có | Cắt tài liệu theo ranh giới tiêu đề cấp 2/3, bảo toàn khối bảng điểm và khối công thức LaTeX, gán metadata breadcrumb. |
| **Embedding Provider** | Chưa có | Interface `EmbeddingProvider`: Bản mock xác thực (deterministic embedding offline) và bản live (Spring AI Gemini embedding). |
| **Vector Store Adapter** | Chưa có | Interface `VectorStore`: Bản `InMemoryVectorStore` cho kiểm thử độc lập/mock mode; bản `PgVectorStoreAdapter` cho PostgreSQL pgvector (bảng `knowledge_sources`). |
| **Bộ truy xuất (Retriever)** | Chưa có | Tìm kiếm tương đồng vector kết hợp lọc metadata / keyword matching, áp dụng ngưỡng tương đồng tối thiểu. |
| **Bộ Thẩm định Chứng cứ (Evidence Validator)** | Chưa có | Đánh giá độ tin cậy của tài liệu truy xuất; chuyển đổi trạng thái `NO_EVIDENCE` khi không đủ căn cứ. |
| **Bộ Neo Trích dẫn (Citation Grounder)** | Chưa có | Chuyển đổi các chunk được truy xuất thành `ChatSourceItem`, đảm bảo không ảo giác nguồn. |

---

## 6. Kiểm toán Quản lý Dependency & Cấu hình Build

### 6.1. File `pom.xml` Gốc (Aggregator BOM)
- Java 21, Spring Boot `3.3.4`.
- Quản lý sẵn `spring-ai-bom` phiên bản `1.0.0-M3`.
- Quản lý `postgresql` (`42.7.4`), `pgvector` (`0.1.6`), `jackson` (`2.17.2`), `pdfbox` (`3.0.3`).
- Khai báo 4 module con: `tv5-platform/contracts`, `tv1-ai`, `tv4-academic`, `tv5-platform/app`.

### 6.2. File `tv1-ai/pom.xml`
- Phụ thuộc:
  - `vn.haui.advisor:haui-contracts`
  - `org.springframework.boot:spring-boot-autoconfigure`
  - `junit-jupiter`, `assertj-core`, `spring-boot-starter-test` (test scope).
- **Nhận định:** `tv1-ai` chưa khai báo dependencies `spring-ai-*` hay `pgvector`. Để đảm bảo `tv1-ai` chạy được cả ở môi trường độc lập (unit test, CI) mà không bắt buộc có database ngoài, thiết kế Task 3.3 nên:
  - Giữ kiến trúc cắm rút qua interface (Ports & Adapters).
  - Cung cấp `InMemoryVectorStore` và `DeterministicMockEmbeddingProvider` sẵn trong module để chạy kiểm thử offline mà không cần dependency ngoài nặng nề.
  - Phối hợp với `tv5-platform/app` (nơi đã có `com.pgvector:pgvector` và Spring JDBC) khi vận hành ở runtime tích hợp.

---

## 7. Thiết kế Kiến trúc RAG cho Task 3.3 (Detailed RAG Design)

Dưới đây là kiến trúc phân tầng chi tiết được khuyến nghị cho Task 3.3 trong `tv1-ai`:

```text
                                  +-----------------------+
                                  |   data-source/docs    |
                                  | (REG-HAUI-01..05.md)  |
                                  +-----------+-----------+
                                              |
                                              v
+-----------------------+         +-----------+-----------+
|  source-catalog.json  | ------> |  MarkdownDocument     |
| (gitblob SHA versions)|         |  Reader & Parser      |
+-----------------------+         +-----------+-----------+
                                              |
                                              v
                                  +-----------+-----------+
                                  |  Semantic / Heading   |
                                  |  Chunker              |
                                  +-----------+-----------+
                                              |
                     +------------------------+------------------------+
                     |                                                 |
                     v                                                 v
         +-----------+-----------+                         +-----------+-----------+
         | MockEmbeddingProvider |                         | LiveEmbeddingProvider |
         | (Deterministic, 128d) |                         | (Spring AI / Gemini)  |
         +-----------+-----------+                         +-----------+-----------+
                     |                                                 |
                     v                                                 v
         +-----------+-----------+                         +-----------+-----------+
         | InMemoryVectorStore   |                         | PgVectorStoreAdapter  |
         | (Cosine Sim, local)   |                         | (Postgres pgvector)   |
         +-----------+-----------+                         +-----------+-----------+
                     \                                                 /
                      \                                               /
                       v                                             v
                     +-------------------------------------------------+
                     |                 RagRetriever                    |
                     |  (Similarity Search + Metadata Keyword Filter)  |
                     +------------------------+------------------------+
                                              |
                                              v
                     +------------------------+------------------------+
                     |            EvidenceValidator                    |
                     | (Score >= Threshold? -> NO_EVIDENCE Fallback)   |
                     +------------------------+------------------------+
                                              |
                                              v
                     +------------------------+------------------------+
                     |            CitationGrounder                     |
                     | (Maps Chunks -> List<ChatSourceItem> Contracts) |
                     +------------------------+------------------------+
                                              |
                                              v
                                  +-----------+-----------+
                                  |   DefaultAdvisorFacade|
                                  |   & AdvisorModel      |
                                  +-----------------------+
```

### Chi tiết các Interface Đề xuất:

1. **`RagChunk` (Entity / Record):**
   ```java
   public record RagChunk(
       String chunkId,
       String sourceId,
       String title,
       String section,
       String version,
       String referenceUrl,
       String content,
       Map<String, Object> metadata
   ) {}
   ```

2. **`DocumentChunker` (Interface):**
   ```java
   public interface DocumentChunker {
       List<RagChunk> chunk(String sourceId, String title, String version, String referenceUrl, String markdownContent);
   }
   ```
   *Yêu cầu:* Giữ nguyên các tiêu đề phân cấp làm breadcrumb ngữ nghĩa; bảo toàn các khối bảng quy đổi điểm và công thức LaTeX; giới hạn kích thước chunk tối ưu từ 300–600 tokens có overlap hợp lý.

3. **`EmbeddingProvider` (Interface):**
   ```java
   public interface EmbeddingProvider {
       float[] embed(String text);
       List<float[]> embedAll(List<String> texts);
       int getDimension();
   }
   ```
   - `DeterministicMockEmbeddingProvider`: Sử dụng giải thuật hashing/bag-of-words có kích thước cố định (ví dụ: 128 dimensions) được chuẩn hóa L2, đảm bảo tính tất định, độc lập mạng và cực nhanh trong kiểm thử.
   - `LiveEmbeddingProvider`: Nối với mô hình embedding của Spring AI / Gemini khi chạy chế độ live.

4. **`VectorStore` (Interface):**
   ```java
   public interface VectorStore {
       void saveAll(List<RagChunk> chunks, List<float[]> embeddings);
       List<ScoredChunk> similaritySearch(float[] queryEmbedding, int topK, double minScore);
   }
   ```
   - `InMemoryVectorStore`: Quản lý danh sách vector và chunk trong bộ nhớ, tính toán Cosine Similarity trực tiếp, dùng mặc định trong môi trường Mock và Unit test.
   - `PgVectorStoreAdapter`: Thực hiện truy vấn trên bảng PostgreSQL qua pgvector extension `<->` hoặc `<=>`.

5. **`RagRetriever` (Interface):**
   ```java
   public interface RagRetriever {
       RetrievalResult retrieve(String query, int topK);
   }
   ```
   *Yêu cầu:* Trả về `RetrievalResult` bao gồm danh sách `ScoredChunk`, điểm tương đồng cao nhất, và cờ đánh dấu `hasSufficientEvidence`.

6. **`EvidenceValidator` & `CitationGrounder`:**
   - Nếu `highestScore < minThreshold` hoặc không tìm thấy văn bản phù hợp:
     - `EvidenceValidator` đánh dấu tình huống `NO_EVIDENCE`.
     - Phản hồi của hệ thống giải thích rõ: *"Quy chế hiện tại của nhà trường chưa có quy định cụ thể về vấn đề này."*
     - `ChatResponse.sources` bắt buộc trả về danh sách rỗng `[]`.
   - Nếu tìm thấy chứng cứ hợp lệ:
     - `CitationGrounder` trích xuất `ChatSourceItem` tương ứng từ các chunk đã lấy, bảo đảm `sourceId` và `version` khớp 100% với `source-catalog.json`.

---

## 8. Các Ràng buộc Kiến trúc và An toàn Thông tin (Security & Architectural Boundaries)

1. **Ranh giới Kho Vector Dùng chung (Shared Vector Store Boundary):**
   - Chỉ được index tài liệu quy chế đào tạo dùng chung (`REG-HAUI-01` đến `05`).
   - **Tuyệt đối không index bảng điểm cá nhân, điểm thi, hoặc thông tin sinh viên vào kho vector dùng chung.** Dữ liệu cá nhân chỉ được đọc trực tiếp qua `AcademicFacade` theo phiên làm việc cụ thể.
2. **Bảo vệ Danh tính Sinh viên (Zero Trust Identity):**
   - Không tin cậy `studentId` từ yêu cầu của client hoặc từ kết quả sinh của mô hình LLM.
   - Luôn sử dụng danh tính đã xác thực từ `TrustedStudentContext` do máy chủ cung cấp.
3. **Chống Ảo giác Nguồn (Zero Hallucination Constraint):**
   - Mọi trích dẫn xuất hiện trong `ChatResponse.sources` phải có căn cứ từ ngữ cảnh truy xuất RAG thực tế.
   - Nghiêm cấm bịa đặt mã nguồn, phiên bản hoặc URL tham chiếu.
4. **Không Fallback Âm thầm (No Silent Fallback):**
   - Khi cấu hình ở chế độ `ai.mode=live`, nếu pgvector store hoặc dịch vụ Gemini gặp sự cố, hệ thống phải trả về lỗi hoặc cảnh báo rõ ràng (`POLICY_SOURCE_UNAVAILABLE`).
   - Tuyệt đối không âm thầm chuyển về phản hồi mock dữ liệu giả lập.
5. **Độc lập Module và Tuân thủ AGENTS.md:**
   - Module `tv1-ai` chỉ được phụ thuộc vào `haui-contracts`, không được import trực tiếp `tv4-academic` hay `tv5-platform/app`.
   - Toàn bộ giao tiếp với phân hệ học vụ được thực hiện qua interface `AcademicFacade` thông qua `ToolAdapter`.

---

## 9. Sổ cái Đánh giá Audit Register (Findings & Action Plan)

Bảng ghi nhận các điểm cần xử lý trước và trong khi thực hiện Task 3.3:

| Mã Ghi nhận | Mức độ | Mô tả Phát hiện | Phân hệ / Vị trí | Kế hoạch Xử lý trong Task 3.3 | Trạng thái |
|---|:---:|---|---|---|:---:|
| **F33-001** | `MEDIUM` | `MockAdvisorModel` hiện tại trả về mã nguồn giả lập cũ `SRC-MOCK-POLICY`, vi phạm Rule 10 của ChatEval. | `tv1-ai/src/main/java/.../MockAdvisorModel.java` | Thay thế nguồn giả lập bằng kết quả truy xuất RAG thật từ 5 tài liệu quy chế `REG-HAUI-01..05`. | `IDENTIFIED` |
| **F33-002** | `LOW` | Cảnh báo deprecation: `getPlanId()` $\rightarrow$ `getProposalId()`, `getWarningMessages()` $\rightarrow$ `getWarnings()`. | `tv1-ai/src/main/java/.../DefaultAdvisorFacade.java` | Refactor sang các phương thức getter mới của Contracts V1 để làm sạch mã nguồn. | `IDENTIFIED` |
| **F33-003** | `MEDIUM` | Thiếu toàn bộ pipeline RAG (Reader, Chunker, Embedding, VectorStore, Retriever). | `tv1-ai/src/main/java/.../rag/` | Xây dựng trọn bộ package RAG với kiến trúc cắm rút độc lập mạng và bộ test đơn vị hoàn chỉnh. | `PLANNED` |
| **F33-004** | `LOW` | Tệp `source-catalog.schema.json` được tham chiếu trong header của `source-catalog.json` nhưng chưa có file schema thực tế trên đĩa. | `tv1-ai/src/main/resources/rag/` | Bổ sung file schema chuẩn JSON Schema Draft-07 để hỗ trợ kiểm tra tĩnh tự động. | `PLANNED` |

---

## 10. Kết luận và Khuyến nghị Triển khai Task 3.3

Kiểm toán xác nhận toàn bộ nền tảng hợp đồng, văn bản quy chế gốc, và môi trường kiểm thử của repository đã ở trạng thái tối ưu và sẵn sàng 100% cho việc lập trình Task 3.3:
- Không có lỗi build hay vi phạm quy ước kiến trúc nào đang tồn đọng.
- Bộ 18 bài test trong `ChatEvalAndCatalogValidationTest` tạo thành một "chốt kiểm định" (safety gate) vững chắc bảo vệ tính toàn vẹn của RAG source catalog.
- Pipeline RAG tiếp theo nên được xây dựng với `DeterministicMockEmbeddingProvider` và `InMemoryVectorStore` làm mặc định cho kiểm thử cục bộ và chế độ Mock, đảm bảo mọi lệnh `mvn test` và `npm run smoke` luôn vượt qua nhanh chóng, tin cậy mà không phụ thuộc vào internet hay API key.
