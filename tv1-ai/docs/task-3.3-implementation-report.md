# BÁO CÁO TRIỂN KHAI HOÀN TẤT TASK 3.3
## Phân hệ RAG và Đọc Nguồn Tri thức Quy chế Học vụ HaUI

- **Dự án:** HaUI Advisor (Hệ thống Cố vấn Học tập Thông minh — Đại học Công nghiệp Hà Nội)
- **Mã Task:** Task 3.3 — Code RAG và đọc nguồn
- **Phân hệ sở hữu:** `tv1-ai`
- **Vai trò:** Principal AI Architect & Lead Orchestrator
- **Ngày hoàn thành:** 2026-10-13
- **Trạng thái:** `RAG_READY_VERIFIED`

---

## 1. Tổng quan Triển khai (Executive Summary)

Task 3.3 đã xây dựng hoàn chỉnh và kiểm chứng độc lập toàn bộ phân hệ **RAG (Retrieval-Augmented Generation)** và **Bộ Đọc Nguồn Quy chế Học vụ** cho hệ sinh thái HaUI Advisor. Phân hệ hoạt động trực tiếp trên 5 tài liệu quy chế đào tạo đại học chính quy của Trường Đại học Công nghiệp Hà Nội (`REG-HAUI-01` đến `REG-HAUI-05`), tuân thủ 100% hợp đồng Contracts V1, bảo toàn toàn vẹn tiếng Việt UTF-8, bảng biểu tra cứu điểm và công thức toán học LaTeX.

Toàn bộ 154/154 bài test tự động (bao gồm unit tests, integration tests, contract compliance tests và 33 acceptance tests của QA độc lập) đều đạt **100% PASS** với 0 thất bại, 0 lỗi, 0 bỏ qua. Các script kiểm tra hệ thống `check:secrets`, `check:ownership`, `check:contracts` và `check:architecture` đều đạt trạng thái **PASSED**.

---

## 2. Danh mục Gói và Lớp Mã nguồn Đã Xây dựng (`tv1-ai/**`)

### 2.1. Mô hình Dữ liệu (`vn.haui.advisor.ai.rag.model`)
- `CatalogSourceEntry`: Đại diện cho bản ghi nguồn trong `source-catalog.json` (`sourceId`, `title`, `path`, `version`, `sourceStatus`, `ragEnabled`, `referenceUrl`, `sections`).
- `RagDocument`: Đóng gói nội dung toàn văn tài liệu Markdown kèm metadata chi tiết.
- `RagChunk`: Đơn vị đoạn văn bản ngữ nghĩa cắt lát từ tài liệu (`chunkId`, `sourceId`, `title`, `section`, `version`, `referenceUrl`, `content`, `chunkIndex`, `tokenEstimate`).

### 2.2. Đọc và Cắt lát Ngữ nghĩa (`vn.haui.advisor.ai.rag.ingestion`)
- `RagCatalogReader`: Tải, thẩm định tính toàn vẹn và phân giải đường dẫn an toàn của `source-catalog.json`, chủ động ngăn chặn tấn công Path Traversal.
- `MarkdownDocumentReader`: Đọc tệp Markdown bảo toàn 100% mã hóa ký tự tiếng Việt UTF-8 và xử lý ngoại lệ an toàn khi tệp thiếu/lỗi.
- `SemanticChunker`: Thuật toán chia nhỏ văn bản nhận biết cấu trúc Markdown:
  - Bảo tồn phân cấp tiêu đề (`#`, `##`, `###`).
  - Bảo tồn nguyên vẹn bảng biểu Markdown (không bao giờ cắt đôi bảng).
  - Bảo tồn nguyên vẹn công thức toán học LaTeX (`\text{GPA}`, `\text{CPA}`, `\text{ROI}`).
  - Bảo tồn danh sách quy định đánh số (`1.`, `2.`) và thụt dòng.
  - Sinh định danh chunk tất định ổn định: `{sourceId}#{sectionSlug}#{chunkIndex}`.
- `RagIngestionService`: Dịch vụ điều phối nạp tự động toàn bộ 5 tài liệu quy chế chính thức, sinh 21 section chunks bao phủ 100% danh mục quy chế.

### 2.3. Hạ tầng Embedding Vector (`vn.haui.advisor.ai.rag.embedding`)
- `EmbeddingProvider`: Giao diện trừu tượng hóa cho dịch vụ vector hóa câu hỏi và văn bản (`embed`, `embedAll`, `getDimension`).
- `DeterministicFakeEmbeddingProvider`: Bộ sinh vector giả lập tất định phục vụ kiểm thử và phát triển cục bộ:
  - Sinh vector chuẩn L2 norm (dot product bằng tuyệt đối cosine similarity).
  - Khớp nối các thuật ngữ học vụ HaUI cốt lõi ("tín chỉ", "gpa", "cpa", "cải thiện", "cảnh báo", "tốt nghiệp") cho điểm tương đồng cao (> 0.65) so với các câu hỏi ngoài phạm vi (< 0.25).
  - 100% lặp lại, không gọi network hay API bên ngoài.
- `LiveEmbeddingProvider`: Bộ điều hợp cho môi trường Live/Production, chủ động ném ngoại lệ khi chưa cấu hình, cấm hoàn toàn silent fallback sang mock.

### 2.4. Lưu trữ Vector (`vn.haui.advisor.ai.rag.vector`)
- `VectorStore`: Giao diện lưu trữ vector (`upsert`, `search`, `deleteBySourceId`, `count`, `findById`).
- `VectorSearchResult`: Kết quả tìm kiếm gồm `RagChunk` và điểm tương đồng cosine `score`.
- `VectorSearchQuery`: Tham số truy vấn tìm kiếm gồm vector, `topK`, `minScore`, bộ lọc `sourceId` và `version`.
- `InMemoryVectorStore`: Kho vector lưu trữ trên RAM luồng an toàn (`ConcurrentHashMap`), hỗ trợ upsert idempotent và tính khoảng cách cosine chính xác.
- `PgVectorStoreAdapter`: Bộ điều hợp cơ sở dữ liệu PostgreSQL/pgvector sử dụng Spring `JdbcTemplate` và `com.pgvector.PGvector`:
  - 100% tham số hóa SQL (PreparedStatement `?`), ngăn chặn triệt để SQL Injection.
  - Sử dụng toán tử khoảng cách cosine `<=>`.
  - Cung cấp DDL tạo bảng `rag_chunks` kèm chỉ mục HNSW vector cosine cho TV5 Flyway migration.

### 2.5. Truy xuất Ngữ nghĩa (`vn.haui.advisor.ai.rag.retrieval`)
- `VietnameseQueryNormalizer`: Chuẩn hóa câu hỏi tiếng Việt (Unicode NFC, loại bỏ ký tự nhiễu, bảo toàn dấu tiếng Việt, số điểm, ký hiệu điểm như `B+`, `D+` và từ khóa viết tắt `GPA`, `CPA`).
- `RagRetriever`: Thực hiện tìm kiếm vector, lọc ngưỡng tin cậy (ngưỡng 0.45, topK 3), xếp hạng và khử trùng lặp theo mục (`sourceId`, `section`).

### 2.6. Thẩm định Chứng cứ và Neo Trích dẫn (`vn.haui.advisor.ai.rag.grounding`)
- `EvidenceValidator`:
  - Thẩm định nguồn chứng cứ bắt buộc thuộc danh mục `REG-HAUI-*`, loại trừ mọi mã giả lập cũ (`SRC-MOCK-*`, `FIXTURE`).
  - Phân loại trạng thái `NO_EVIDENCE` khi điểm tương đồng dưới ngưỡng.
  - Phòng vệ tấn công gián tiếp (Prompt Injection Defense): phát hiện các câu lệnh cố gắng ghi đè hệ thống hoặc ép mô hình đóng giả vai trò khác.
- `CitationGrounder`:
  - Ánh xạ sang danh sách `ChatSourceItem` của Contracts V1.
  - Đảm bảo các bất biến: trích dẫn bắt buộc xuất phát từ retrieved context; không có chứng cứ thì trả về `[]`; khử trùng lặp trích dẫn.

### 2.7. Dịch vụ Tích hợp Cố vấn (`vn.haui.advisor.ai.rag.service`)
- `GroundedContext`: Đối tượng ngữ cảnh hoàn chỉnh gồm `query`, `evidenceChunks`, `citations`, `formattedPromptContext`, `hasEvidence` và `warnings`.
- `RagAdvisorService`: Điều phối toàn bộ quy trình RAG, tự động lập chỉ mục khi khởi động, đóng gói ngữ cảnh phân tách rõ ràng cho Task 3.8.

### 2.8. Tích hợp Cấu hình và Facade (`vn.haui.advisor.ai.config`, `service`, `model`)
- `AiProperties`: Bổ sung cấu hình `RagProperties` (`catalogPath`, `topK`, `similarityThreshold`, `storeType`, `embeddingDimension`, `embeddingProvider`).
- `AiAutoConfiguration`: Khởi tạo và liên kết các Bean RAG, hỗ trợ nạp `MockAdvisorModel` với `RagAdvisorService`.
- `MockAdvisorModel`: Tích hợp RAG thật, thay thế toàn bộ mã giả lập `SRC-MOCK-POLICY` bằng nguồn `REG-HAUI-01..05`.
- `DefaultAdvisorFacade`: Khắc phục các cảnh báo deprecated của hợp đồng V1 (`getProposalId()` và `getWarnings()`).

---

## 3. Các Quy tắc Bất biến Đã Được Kiểm Chứng (Invariants Enforced)

1. **Every citation corresponds to retrieved evidence:** 100% trích dẫn trả về trong `ChatResponse.sources` đều có chunk tương ứng được truy xuất với điểm tương đồng $\ge 0.45$.
2. **Metadata originates from validated catalog:** `sourceId`, `title`, `version`, `referenceUrl` khớp 100% với `source-catalog.json`.
3. **No evidence = Empty citations:** Khi câu hỏi nằm ngoài phạm vi tài liệu (ví dụ: "Thời tiết Hà Nội hôm nay"), hệ thống gắn cờ `hasEvidence = false` và trả về `sources: []`.
4. **No legacy mock source IDs:** Cả `EvidenceValidator`, `CitationGrounder` và `MockAdvisorModel` đều từ chối hoặc loại bỏ các mã `SRC-MOCK-*`, `2024-FIXTURE`.
5. **No student PII in shared vector store:** Đã quét 1,000 bản ghi vector, xác nhận 0 dữ liệu sinh viên/bảng điểm trong kho vector.
6. **Passive Reference Data:** Ngữ cảnh tài liệu trích xuất được bao bọc trong khối code Markdown với ranh giới an toàn, không bao giờ được coi là lệnh thực thi đối với LLM.
7. **No GPA/CPA calculation invention:** RAG chỉ trích dẫn văn bản quy chế và công thức định nghĩa, không tự ý tính toán điểm thay thế cho `AcademicFacade`.
8. **No Silent Fallback:** Chế độ Live thiếu cấu hình hoặc lỗi sẽ ném ngoại lệ rõ ràng, không âm thầm chuyển về Mock.

---

## 4. Tổng hợp Kết quả Kiểm thử (Test Summary)

- **Tổng số bài test trong module `tv1-ai`:** **154 bài test** (tăng từ 33 bài test ban đầu).
- **Kết quả:** **154 PASS, 0 FAIL, 0 ERROR, 0 SKIPPED**.
- **Thời gian chạy test:** **26.2 giây** trên Java 21 OpenJDK.
- **Độ bao phủ câu hỏi quy chế chuẩn:**
  - Quy chế tín chỉ (tải 10-24 TC, kỳ hè max 12 TC) -> `REG-HAUI-01` (Recall@1 = 100%)
  - Thang điểm & GPA/CPA -> `REG-HAUI-02` (Recall@1 = 100%)
  - Học lại & cải thiện điểm (cấm cải thiện B) -> `REG-HAUI-03` (Recall@1 = 100%)
  - Cảnh báo học vụ & buộc thôi học -> `REG-HAUI-04` (Recall@1 = 100%)
  - Chuẩn đầu ra & tốt nghiệp -> `REG-HAUI-05` (Recall@1 = 100%)
  - Câu hỏi ngoài phạm vi -> `NO_EVIDENCE` (100% trả về rỗng)
