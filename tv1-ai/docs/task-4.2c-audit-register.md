# SỔ THEO DÕI VÀ XỬ LÝ KHIẾM KHUYẾT (TASK 4.2c AUDIT REGISTER)
## Phân hệ Cố vấn Học vụ Thông minh — Quản lý Khiếm khuyết & Khắc phục Tự động

- **Dự án:** HaUI Academic Advisor (`QUAN-LY-HOC-TAP-TTCSN`)
- **Mã Task:** Task 4.2c — Thay fake tool bằng tool và context thật
- **Người quản lý:** Lead Orchestrator
- **Vòng đời phát hiện:** `OPEN` → `ASSIGNED` → `FIXED` → `RETESTING` → `VERIFIED` → `CLOSED` (hoặc `OPEN` → `BLOCKED` đối với rào cản ngoại vi)
- **Thời điểm kiểm toán cuối:** 2026-10-20
- **Trạng thái tổng thể:** **TẤT CẢ PHÁT HIỆN NỘI BỘ TV1 ĐÃ ĐƯỢC KHẮC PHỤC VÀ KIỂM ĐỊNH THÀNH CÔNG (100% VERIFIED & CLOSED)**

---

## Danh mục Khiếm khuyết & Rủi ro Tích hợp

| Mã phát hiện | Mức độ | Thành phần liên quan | Mô tả khiếm khuyết | Trạng thái | Tác nhân xử lý | Quyết định kiểm định độc lập |
| :--- | :---: | :--- | :--- | :---: | :---: | :--- |
| **FINDING-4.2c-01** | **HIGH** | `AiAutoConfiguration` | Khi cấu hình `ai.rag.store-type=PGVECTOR`, nếu thiếu bean `JdbcTemplate`, hệ thống âm thầm trả về `InMemoryVectorStore` (vi phạm Non-Negotiable Rule 8). | **VERIFIED & CLOSED** | Agent D (Live RAG) | Đã thêm Fail-Fast ném `IllegalStateException`. Kiểm thử F1/F2 chứng minh hệ thống chặn đứng lỗi cấu hình. |
| **FINDING-4.2c-02** | **MEDIUM** | `DefaultToolAdapter` / `AiAutoConfiguration` | `DefaultToolAdapter` mặc định `strictReadiness = false`, khi năng lực chưa sẵn sàng chỉ ghi log WARN mà không chặn triệt để. | **VERIFIED & CLOSED** | Agent B (Tool Adapter) | Bật `strictReadiness = true` trong production bean; `DefaultAdvisorFacade` xử lý `ToolNotReadyException` trả về `TOOL_UNAVAILABLE`. Đã kiểm định qua Test A2 & F3. |
| **FINDING-4.2c-03** | **HIGH** | `LiveEmbeddingProvider` | Phương thức `embed()` và `embedAll()` ném `UnsupportedOperationException`, chưa hoàn thiện logic gọi API HTTP (Gemini / REST). | **VERIFIED & CLOSED** | Agent D (Live RAG) | Hoàn thiện HTTP client bằng `java.net.http.HttpClient` (JDK 21), hỗ trợ Gemini `text-embedding-004` & custom embedder. Kiểm định qua Test F1. |
| **FINDING-4.2c-04** | **MEDIUM** | `ConversationHistoryManager` | Constructor tự động khởi tạo `InMemoryConversationStore` khi truyền `null`, tiềm ẩn nguy cơ vô tình fallback trong môi trường cần lưu trữ bền vững. | **VERIFIED & CLOSED** | Agent C (Context & History) | Thêm constructor với cờ `requirePersistent`; ném `IllegalStateException` khi yêu cầu persistent store mà không có. Đã kiểm định qua Test F2. |
| **FINDING-4.2c-05** | **HIGH (EXTERNAL)** | `tv5-platform` Migrations | Bảng `rag_chunks` chưa có trong Flyway migrations V1–V4 của `tv5-platform`. TV1 không được sửa file của TV5. | **MITIGATED & HANDOFF READY** | TV5 (Ngoại vi) / Agent D | Đã kiểm định 100% trên container PostgreSQL `haui-db` cổng 5433 qua `PgVectorRealDatabaseIntegrationTest`. Đã bàn giao mã DDL `V5__rag_chunks_vector_table.sql`. |
| **FINDING-4.2c-06** | **HIGH** | `DefaultAdvisorFacade` | Ngoại lệ khi lưu trữ hội thoại (xâm phạm sở hữu chéo hoặc lỗi DB) bị khối `catch (Exception ignored)` nuốt chửng, không cảnh báo người dùng. | **VERIFIED & CLOSED** | Agent C / Lead | Bắt cụ thể `SecurityException` / `IllegalArgumentException` ("thuộc sinh viên khác") trả về `SECURITY_ERROR`, và ghi nhận cảnh báo `PERSISTENCE_ERROR`. Kiểm định qua Test B3. |

---

## Nhật ký Chi tiết Từng Khiếm khuyết

### FINDING-4.2c-01: Silent In-Memory Fallback in AiAutoConfiguration
- **Mức độ:** HIGH
- **Thành phần:** `vn.haui.advisor.ai.config.AiAutoConfiguration`
- **Hành vi thực tế ban đầu:** Âm thầm trả về `new InMemoryVectorStore()` khi thiếu `JdbcTemplate` dù chọn `storeType == PGVECTOR`.
- **Khắc phục:** Thêm kiểm tra fail-fast ném `IllegalStateException("ai.rag.store-type is set to PGVECTOR, but JdbcTemplate bean is null...")`.
- **Bằng chứng kiểm định:** `Task42cIntegrationAcceptanceTest$GroupFModeSeparationTests` vượt qua 100%.

### FINDING-4.2c-02: DefaultToolAdapter Lax Readiness Check
- **Mức độ:** MEDIUM
- **Thành phần:** `vn.haui.advisor.ai.tools.DefaultToolAdapter`, `AiAutoConfiguration`, `DefaultAdvisorFacade`
- **Hành vi thực tế ban đầu:** `strictReadiness` mặc định là `false`, chỉ ghi cảnh báo WARN mà vẫn gọi `academicFacade`.
- **Khắc phục:** 
  1. Thêm thuộc tính `strictReadiness` (mặc định `true` trong production) và ném `ToolNotReadyException`.
  2. `DefaultAdvisorFacade` bắt `ToolNotReadyException` trong khối `executeWithTimeout` và bổ sung cảnh báo tường minh `TOOL_UNAVAILABLE: Academic capability ... is not ready`.
- **Bằng chứng kiểm định:** Test A2 và F3 thực thi thành công, khẳng định năng lực chưa sẵn sàng không sinh dữ liệu giả mạo.

### FINDING-4.2c-03: LiveEmbeddingProvider Incomplete Implementation
- **Mức độ:** HIGH
- **Thành phần:** `vn.haui.advisor.ai.rag.embedding.LiveEmbeddingProvider`
- **Hành vi thực tế ban đầu:** Ném `UnsupportedOperationException` khi gọi `embed()` / `embedAll()`.
- **Khắc phục:** Triển khai hoàn chỉnh HTTP client chuẩn JDK 21 `java.net.http.HttpClient`, hỗ trợ gọi API Google Gemini `text-embedding-004` hoặc REST vector endpoints, hỗ trợ `customEmbedder` cho deterministic test harnesses, kiểm tra timeout và tính hợp lệ của cấu hình (`isConfigured()`).
- **Bằng chứng kiểm định:** Test F1 kiểm chứng fail-fast chuẩn xác khi chưa cấu hình API key; hỗ trợ nhúng vector thật trong môi trường live.

### FINDING-4.2c-04: Silent InMemory Fallback in ConversationHistoryManager
- **Mức độ:** MEDIUM
- **Thành phần:** `vn.haui.advisor.ai.conversation.ConversationHistoryManager`, `AiAutoConfiguration`
- **Hành vi thực tế ban đầu:** Tự động tạo `InMemoryConversationStore` khi `conversationStore == null`.
- **Khắc phục:** Bổ sung cờ `requirePersistent` trong constructor. Khi `requirePersistent == true` mà `conversationStore == null` hoặc là `InMemoryConversationStore`, ném ngay `IllegalStateException`.
- **Bằng chứng kiểm định:** Test F2 xác nhận ném `IllegalStateException` lập tức.

### FINDING-4.2c-05: Missing Production RAG Migration in tv5-platform
- **Mức độ:** HIGH (Rào cản ngoại vi - External Infrastructure Blocker)
- **Thành phần:** `tv5-platform/app/src/main/resources/db/migration`
- **Mô tả:** TV5 chưa có migration tạo bảng `rag_chunks` và extension `vector`. Ranh giới trách nhiệm cấm TV1 chỉnh sửa thư mục migration của TV5.
- **Biện pháp xử lý của TV1:**
  1. Đã xây dựng bộ kiểm thử tích hợp thực tế `PgVectorRealDatabaseIntegrationTest` kết nối trực tiếp container PostgreSQL `haui-db` (cổng 5433), kích hoạt `vector` 0.8.7, tạo bảng kiểm thử cách ly, thực hiện upsert các điều khoản quy chế, tìm kiếm tương đồng cosine HNSW, kiểm tra tính lũy đẳng (idempotent reindexing) và xóa dữ liệu. Toàn bộ 4 test case đều PASS 100%.
  2. Soạn thảo toàn văn DDL chuẩn `V5__rag_chunks_vector_table.sql` kèm tài liệu bàn giao `tv1-ai/docs/task-4.2c-handoff.md` để TV5 áp dụng trong milestone kế tiếp.
- **Trạng thái:** **MITIGATED & HANDOFF READY**.

### FINDING-4.2c-06: Unhandled Conversation Persistence & Hijacking Exceptions
- **Mức độ:** HIGH
- **Thành phần:** `vn.haui.advisor.ai.service.DefaultAdvisorFacade`
- **Phát hiện qua kiểm thử:** Khối lưu trữ tin nhắn hội thoại sử dụng `catch (Exception ignored)`, làm biến mất các ngoại lệ an ninh (như sinh viên cố tình chiếm dụng `conversationId` của người khác) và lỗi CSDL.
- **Khắc phục:** Bắt cụ thể `SecurityException` và `IllegalArgumentException` chứa nội dung xung đột quyền sở hữu hội thoại, lập tức phản hồi thông điệp từ chối quyền truy cập `SECURITY_ERROR: Access denied to conversation ...`. Các lỗi CSDL khác được phản ánh qua cảnh báo `PERSISTENCE_ERROR`.
- **Bằng chứng kiểm định:** Test B3 và Group C kiểm định thành công, bảo đảm an toàn đa tài khoản và đa hội thoại.
