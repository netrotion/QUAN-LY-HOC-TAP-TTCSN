# BÁO CÁO TRIỂN KHAI KỸ THUẬT (TASK 4.2c IMPLEMENTATION REPORT)
## Phân hệ Cố vấn Học vụ Thông minh — Tích hợp Công cụ Thật, Ngữ cảnh Tin cậy & PostgreSQL/pgvector

- **Dự án:** HaUI Academic Advisor (`QUAN-LY-HOC-TAP-TTCSN`)
- **Mã Task:** Task 4.2c — Thay fake tool bằng tool và context thật
- **Trách nhiệm triển khai:** TV1 — Lead + AI
- **Ranh giới tác động:** `tv1-ai/**` (Tuyệt đối không sửa đổi mã nguồn TV4 và TV5)
- **Mốc hoàn thành:** `advisor-integrated`
- **Ngày lập báo cáo:** 2026-10-20

---

## 1. MỤC TIÊU & NHIỆM VỤ THỰC HIỆN

Nhiệm vụ trọng tâm của Task 4.2c là kết nối AI Advisor hiện có với:
1. **Công cụ học vụ thật:** Tích hợp với `AcademicFacade` thông qua port `haui-contracts`, thay thế các dữ liệu giả lập bằng kết quả tính toán có thẩm quyền của Academic Engine, quản lý nghiêm ngặt tính sẵn sàng của công cụ (`strictReadiness`), và bảo toàn ngữ nghĩa phiên bản dữ liệu (`dataRevision`).
2. **Ngữ cảnh sinh viên tin cậy:** Trích xuất định danh sinh viên từ `TrustedStudentContext` được máy chủ xác thực, ngăn chặn tuyệt đối việc người dùng ghi đè mã sinh viên qua prompt injection.
3. **Lưu vết hội thoại bền vững:** Kết nối với port `ConversationStore` (PostgreSQL `JdbcConversationStore`), xử lý ranh giới sở hữu hội thoại giữa các tài khoản, cô lập đa người dùng và kiểm soát lỗi lưu trữ rõ ràng.
4. **Truy xuất RAG với PostgreSQL/pgvector:** Hoàn thiện `LiveEmbeddingProvider`, loại bỏ hoàn toàn cơ chế âm thầm fallback về `InMemoryVectorStore` trong chế độ pgvector, xác thực tương thích schema và chỉ mục HNSW trên CSDL PostgreSQL container thật (cổng 5433).

---

## 2. DANH MỤC CÁC TỆP NGUỒN ĐÃ TẠO MỚI & ĐIỀU CHỈNH

Toàn bộ các thay đổi được kiểm soát chặt chẽ trong thư mục `tv1-ai/**`:

### 2.1. Cấu hình & Dây chuyền Spring Boot
- **`tv1-ai/src/main/java/vn/haui/advisor/ai/config/AiProperties.java`**:
  - Bổ sung `AdvisorProperties` chứa `strictReadiness` (mặc định `true`), `toolTimeoutMs` (mặc định 1500ms), `requirePersistentStore` (mặc định `false` trong mock/dev, `true` trong production).
  - Bổ sung cấu hình chi tiết cho `RagProperties.EmbeddingProperties`: `endpoint`, `model`, `apiKey`, `timeoutMs`.
- **`tv1-ai/src/main/java/vn/haui/advisor/ai/config/AiAutoConfiguration.java`**:
  - Bổ sung kiểm tra **Fail-Fast** tại bean `vectorStore`: Ném `IllegalStateException` khi `storeType == StoreType.PGVECTOR` mà không tìm thấy bean `JdbcTemplate`.
  - Bổ sung kiểm tra **Fail-Fast** tại bean `conversationHistoryManager`: Ném `IllegalStateException` khi `requirePersistentStore == true` mà thiếu bean `ConversationStore` hoặc sử dụng `InMemoryConversationStore`.
  - Truyền `strictReadiness` vào `DefaultToolAdapter` để kích hoạt cơ chế chặn đứng công cụ chưa sẵn sàng trong môi trường production.
  - Cấu hình endpoint, model, apiKey và timeout cho `LiveEmbeddingProvider`.

### 2.2. Adapter Công cụ Học vụ & Điều phối Cố vấn
- **`tv1-ai/src/main/java/vn/haui/advisor/ai/tools/DefaultToolAdapter.java`**:
  - Thêm phương thức kiểm tra định danh `extractTrustedStudentId(context)` bảo đảm `studentId` không bao giờ rỗng.
  - Cung cấp getter `getAcademicFacade()` phục vụ giám sát và kiểm thử.
  - Cập nhật phương thức `checkReadiness(capability)`: Khi `strictReadiness` được bật và năng lực chưa có trong `academicFacade.readyCapabilities()`, lập tức ném `ToolNotReadyException`.
- **`tv1-ai/src/main/java/vn/haui/advisor/ai/service/DefaultAdvisorFacade.java`**:
  - Bắt cụ thể `ToolNotReadyException` trong hàm `executeWithTimeout`, ghi nhận cảnh báo tường minh `TOOL_UNAVAILABLE: Academic capability ... is not ready` và không sinh dữ liệu giả mạo.
  - Cập nhật khối lưu vết hội thoại: Bắt `SecurityException` và `IllegalArgumentException` khi phát hiện xung đột sở hữu hội thoại giữa các tài khoản, lập tức phản hồi thông điệp `SECURITY_ERROR: Access denied to conversation ...`.
  - Ghi nhận cảnh báo `PERSISTENCE_ERROR` khi gặp lỗi CSDL, không nuốt chửng ngoại lệ trong `catch (Exception ignored)`.

### 2.3. Quản lý Hội thoại & Ngữ cảnh
- **`tv1-ai/src/main/java/vn/haui/advisor/ai/conversation/ConversationHistoryManager.java`**:
  - Bổ sung constructor nhận cờ `requirePersistent`: Thực hiện fail-fast nếu yêu cầu lưu trữ bền vững mà truyền store null.
  - Cung cấp các phương thức `isPersistentStore()` và `getConversationStore()`.

### 2.4. Trình Nhúng Vector & Lưu trữ pgvector
- **`tv1-ai/src/main/java/vn/haui/advisor/ai/rag/embedding/LiveEmbeddingProvider.java`**:
  - Hoàn thiện HTTP client bằng `java.net.http.HttpClient` chuẩn của JDK 21, loại bỏ ngoại lệ `UnsupportedOperationException`.
  - Hỗ trợ gọi API Google Gemini `text-embedding-004` hoặc REST vector endpoints chuẩn với timeout và xử lý mã lỗi HTTP.
  - Bổ sung `customEmbedder` hỗ trợ kiểm thử tích hợp nội bộ không cần mạng internet.
  - Sửa logic `isConfigured()` để kiểm tra chính xác trạng thái sẵn sàng của provider.
- **`tv1-ai/src/main/java/vn/haui/advisor/ai/rag/vector/PgVectorStoreAdapter.java`**:
  - Bảo toàn 100% Parameterized SQL Statements với toán tử cosine distance `(1.0 - (embedding <=> ?::vector))`.
  - Tạo sẵn phương thức sinh mã Flyway migration DDL `generateDDL(dimension)`.

### 2.5. Bộ Kiểm thử Tích hợp & Nghiệm thu Thực tế
- **`tv1-ai/src/test/java/vn/haui/advisor/ai/eval/Task42cIntegrationAcceptanceTest.java`**:
  - Xây dựng trọn bộ 15 ca kiểm thử bao quát các Nhóm A, B, C, D, F, G.
  - Kiểm tra độc lập việc ủy nhiệm `AcademicFacade`, cô lập 2 tài khoản, cô lập 2 cuộc hội thoại, giả lập lỗi công cụ, kiểm tra fail-fast và ranh giới prompt injection.
- **`tv1-ai/src/test/java/vn/haui/advisor/ai/rag/vector/PgVectorRealDatabaseIntegrationTest.java`**:
  - Kết nối trực tiếp container PostgreSQL `haui-db` (cổng 5433) có sẵn tiện ích mở rộng `vector` 0.8.7.
  - Tạo bảng cách ly `test_rag_chunks_42c` với chỉ mục HNSW vector cosine.
  - Thực hiện Upsert văn bản quy chế thật, kiểm tra tìm kiếm tương đồng cosine, kiểm tra tái lập chỉ mục lũy đẳng (idempotent reindexing) và xóa dữ liệu an toàn.

---

## 3. KIẾN TRÚC TÍCH HỢP ĐẠT ĐƯỢC (INTEGRATION ARCHITECTURE)

Sơ đồ dòng chảy dữ liệu sản xuất đã được kiểm chứng độc lập:

```text
[Authenticated Student (Session/JWT)]
                │
                ▼
      TrustedStudentContext (studentId, studentCode, cohort, dataRevision)
                │
                ▼
         AdvisorFacade (DefaultAdvisorFacade)
          │            │                      │
          │            │                      ▼
          │            │             ConversationStore (JdbcConversationStore)
          │            │             [PostgreSQL Database - Table: conversations]
          │            │
          │            ▼
          │      RAG Pipeline (RagAdvisorService)
          │       ├── LiveEmbeddingProvider (HttpClient / Gemini API text-embedding-004)
          │       └── PgVectorStoreAdapter (PostgreSQL pgvector / HNSW Cosine Index)
          │
          ▼
     ToolAdapter (DefaultToolAdapter)
          │ (strictReadiness check: readyCapabilities())
          ▼
    AcademicFacade (Port in haui-contracts)
          │
          ▼
   Academic Engine (tv4-academic / Deterministic Core)
          ├── StudentAcademicRecordProvider (Confirmed Student Transcripts)
          └── Deterministic Rules (CPA, Prerequisite, Graduation, Retake ROI)
```

---

## 4. BẰNG CHỨNG THỰC THI KIỂM THỬ

1. **Kiểm thử tích hợp & Hồi quy module haui-ai:**
   - Lệnh thực thi: `.\mvnw.cmd test -pl tv1-ai`
   - Kết quả: **Tests run: 254, Failures: 0, Errors: 0, Skipped: 0. BUILD SUCCESS.**
2. **Cổng chất lượng kiến trúc & ranh giới repo:**
   - `node scripts/check-architecture.mjs` → **PASSED**
   - `node scripts/check-contracts.mjs` → **PASSED**
   - `node scripts/check-ownership.mjs` → **PASSED**
   - `node scripts/check-secrets.mjs` → **PASSED**

---

## 5. TỰ ĐỘNG KHẮC PHỤC KHIẾM KHUYẾT (DEFECT REMEDIATION)

Trong quá trình thực thi vòng lặp kiểm định tự động, 6 khiếm khuyết đã được phát hiện, phân loại và xử lý triệt để:
- **FINDING-4.2c-01:** Fail-Fast khi thiếu `JdbcTemplate` trong chế độ `PGVECTOR` → **ĐÃ SỬA & VERIFIED**.
- **FINDING-4.2c-02:** `strictReadiness` chặn công cụ học vụ chưa sẵn sàng → **ĐÃ SỬA & VERIFIED**.
- **FINDING-4.2c-03:** Hoàn thiện HTTP client trong `LiveEmbeddingProvider` → **ĐÃ SỬA & VERIFIED**.
- **FINDING-4.2c-04:** Chặn âm thầm fallback trong `ConversationHistoryManager` → **ĐÃ SỬA & VERIFIED**.
- **FINDING-4.2c-05:** CSDL thiếu migration `rag_chunks` của TV5 → **ĐÃ KIỂM THỬ TRÊN CSDL THẬT & BÀN GIAO MIGRATION DDL**.
- **FINDING-4.2c-06:** Ngoại lệ lưu trữ hội thoại và chiếm dụng hội thoại bị nuốt chửng → **ĐÃ SỬA & VERIFIED**.

---

## 6. KẾT LUẬN

Module `tv1-ai` đã hoàn thành toàn diện việc thay thế dữ liệu và công cụ giả lập bằng công cụ và ngữ cảnh thật, sẵn sàng 100% cho mốc kiểm tra tích hợp `advisor-integrated`.
