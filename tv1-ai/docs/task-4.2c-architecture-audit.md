# BÁO CÁO KIẾN TRÚC & ĐÁNH GIÁ SẴN SÀNG TÍCH HỢP (TASK 4.2c ARCHITECTURE AUDIT)
## Phân hệ Cố vấn Học vụ Thông minh — Nối Công cụ Thật, Ngữ cảnh Tin cậy & CSDL pgvector

- **Dự án:** HaUI Academic Advisor (`QUAN-LY-HOC-TAP-TTCSN`)
- **Mã Task:** Task 4.2c — Thay fake tool bằng tool và context thật
- **Vai trò thực hiện:** Agent A — Architecture & Dependency Auditor (Lead Orchestrator / TV1)
- **Mốc mục tiêu:** `advisor-integrated`
- **Phạm vi ghi mã nguồn:** `tv1-ai/**`
- **Thời điểm kiểm định:** 2026-10-20

---

## 1. Bối cảnh và Mục tiêu Nhiệm vụ

Nhiệm vụ 4.2c yêu cầu phân hệ AI (`tv1-ai`) chuyển đổi từ tầng tích hợp giả lập / mock sang kết nối trực tiếp với:
1. **Công cụ học vụ Authoritative (`AcademicFacade`):** Tiếp nhận bean triển khai thực tế từ `tv4-academic` do `tv5-platform` cung cấp (`DefaultAcademicFacade` vận hành trên `DbStudentAcademicRecordProvider`), tuyệt đối không tự ý tính toán lại các số liệu toán học (CPA, GPA, tín chỉ tích lũy, điều kiện tiên quyết).
2. **Ngữ cảnh sinh viên tin cậy (`TrustedStudentContext`):** Bảo đảm toàn bộ luồng hội thoại và gọi công cụ luôn sử dụng định danh sinh viên được máy chủ xác thực từ phiên (`DbStudentContextProvider`), ngăn chặn triệt để tấn công giả mạo danh tính (Identity Spoofing) hoặc ghi đè mã sinh viên từ người dùng.
3. **Lưu trữ hội thoại bền vững (`ConversationStore`):** Kết nối với triển khai bền vững cơ sở dữ liệu (`JdbcConversationStore` trên bảng `conversations` của PostgreSQL), loại bỏ hoàn toàn việc âm thầm fallback về bộ nhớ tạm (`InMemoryConversationStore`) trong chế độ persistent.
4. **Hạ tầng RAG & CSDL Vector (`pgvector`):** Kết nối `PgVectorStoreAdapter` với PostgreSQL pgvector thực tế, giải quyết rủi ro không đồng bộ số chiều embedding, ngăn chặn silent in-memory fallback, và định nghĩa rõ ràng DDL migration cho bảng `rag_chunks`.

---

## 2. Ma trận Sẵn sàng Phụ thuộc (Dependency Readiness Matrix)

Dựa trên kết quả khảo sát trực tiếp mã nguồn tại thời điểm hiện tại:

| Thành phần phụ thuộc | Phân hệ sở hữu | Trạng thái sẵn sàng | Chi tiết đánh giá kỹ thuật |
| :--- | :---: | :---: | :--- |
| **`AcademicFacade` Port & DTO** | `tv5-platform/contracts` (1.3.0) | **READY** | Hợp đồng 1.3.0 đầy đủ DTO và 9 capability. |
| **`DefaultAcademicFacade` Engine** | `tv4-academic` | **READY** | Đã hoàn thành Task 3.11, công bố các năng lực `GET_ACADEMIC_STATUS`, `CHECK_COURSE_ELIGIBILITY`, `RUN_GRADUATION_AUDIT`, v.v. |
| **`DbStudentAcademicRecordProvider`** | `tv5-platform/app` | **READY** | Nạp dữ liệu học vụ sinh viên từ PostgreSQL với snapshot `REPEATABLE READ`, ghim revision chuẩn xác. |
| **`DbStudentContextProvider`** | `tv5-platform/app` | **READY** | Trích xuất `TrustedStudentContext` từ session principal, loại bỏ `studentId` không tin cậy. |
| **`JdbcConversationStore`** | `tv5-platform/app` | **READY** | Quản lý bảng `conversations` (PostgreSQL) theo Flyway V4. |
| **`DefaultToolAdapter`** | `tv1-ai` | **PARTIALLY_READY** | Đã triển khai ủy nhiệm đủ 9 capability nhưng chưa bật `strictReadiness` mặc định; cần đảm bảo công cụ `NOT_READY` trả lỗi tường minh, không sinh số liệu giả. |
| **`ConversationHistoryManager`** | `tv1-ai` | **PARTIALLY_READY** | Đã có sliding window và giới hạn dung lượng <1MB, nhưng constructor mặc định tự tạo `InMemoryConversationStore`; cần cờ fail-fast khi yêu cầu persistence. |
| **`LiveEmbeddingProvider`** | `tv1-ai` | **PARTIALLY_READY** | Chưa hoàn thiện logic gọi API HTTP (đang ném `UnsupportedOperationException`). Cần hỗ trợ REST API Gemini / OpenAI embedding chuẩn hóa. |
| **`PgVectorStoreAdapter`** | `tv1-ai` | **READY** | Đã dùng 100% Parameterized SQL với toán tử cosine `(1.0 - (embedding <=> ?::vector))`. |
| **`AiAutoConfiguration` VectorStore wiring** | `tv1-ai` | **PARTIALLY_READY** | Đang có rủi ro silent fallback: nếu `storeType == PGVECTOR` mà `jdbcTemplate == null`, hệ thống tự rơi về `InMemoryVectorStore`. Cần sửa thành Fail-Fast. |
| **Flyway Migration `rag_chunks`** | `tv5-platform` | **NOT_READY (BLOCKER cho Prod DB)** | Bảng `rag_chunks` chưa có trong Flyway migrations V1–V4 của `tv5-platform`. TV1 cung cấp DDL chuẩn và kiểm thử trên schema cách ly. |

---

## 3. Phân tích Rủi ro Kỹ thuật & Biện pháp Khắc phục

### Rủi ro 1: Fallback âm thầm về In-Memory Store (Silent Fallback Defect)
- **Vấn đề:** Trong `AiAutoConfiguration.java`, khi `properties.getRag().getStoreType() == StoreType.PGVECTOR`, nếu không tìm thấy bean `JdbcTemplate`, code hiện tại trả về `new InMemoryVectorStore()` mà không báo lỗi.
- **Biện pháp khắc phục:** Bắt buộc ném `IllegalStateException` nếu người dùng hoặc hệ thống cấu hình `PGVECTOR` nhưng thiếu kết nối CSDL (Fail-Fast Rule).

### Rủi ro 2: Thiếu cờ cưỡng chế độ sẵn sàng công cụ (`strictReadiness`)
- **Vấn đề:** `DefaultToolAdapter` hiện nhận `strictReadiness` qua constructor nhưng mặc định là `false`. Khi một năng lực chưa sẵn sàng (ví dụ `RECONCILE_STUDY_PLAN` hoặc `VALIDATE_STUDY_PLAN`), nó chỉ ghi log WARN rồi vẫn gọi tiếp facade.
- **Biện pháp khắc phục:** Thiết lập `strictReadiness = true` trong cấu hình production/live, hoặc khi năng lực không thuộc `readyCapabilities()`, trả về cảnh báo tường minh `TOOL_UNAVAILABLE: Capability <NAME> is not ready in AcademicFacade` và không cố gắng suy diễn số liệu.

### Rủi ro 3: Trộn lẫn định danh sinh viên giữa các phiên (Cross-Account Leakage)
- **Vấn đề:** Nếu một sinh viên cố tình truyền `conversationId` của người khác hoặc gõ `studentId` của tài khoản khác trong câu chat.
- **Biện pháp khắc phục:** `ConversationHistoryManager` và `DefaultAdvisorFacade` đã có cơ chế kiểm tra `SecurityException` khi phát hiện `studentId` không khớp với bản ghi hội thoại. Cần bổ sung test case Group B & Group C chứng minh hai tài khoản A và B hoàn toàn biệt lập, dữ liệu không rò rỉ.

### Rủi ro 4: Bảng `rag_chunks` chưa có trong migration của TV5
- **Vấn đề:** TV5 sở hữu thư mục Flyway migrations (`tv5-platform/app/src/main/resources/db/migration`). TV1 không được sửa file ngoài phạm vi `tv1-ai/**`.
- **Biện pháp khắc phục:**
  1. Trong tài liệu bàn giao (`task-4.2c-handoff.md`), TV1 cung cấp bản đặc tả migration chi tiết `V5__rag_chunks_vector_table.sql` cho TV5.
  2. Trong phạm vi kiểm thử của TV1 (`tv1-ai/src/test/**`), TV1 thiết lập harness kiểm thử tích hợp thực tế kết nối trực tiếp với PostgreSQL pgvector container (`127.0.0.1:5433`), khởi tạo bảng kiểm thử cách ly, thực hiện upsert, similarity search và dọn dẹp an toàn.

---

## 4. Tiêu chí Nghiệm thu Tích hợp (Integration Acceptance Criteria)

- **Gate 1 (Tool Authoritativeness):** Mọi số liệu học vụ (CPA, GPA, tín chỉ, môn tiên quyết) chỉ lấy từ `AcademicFacade`. Năng lực `NOT_READY` không được phép sinh số liệu giả mạo.
- **Gate 2 (Identity Invariance):** `studentId` lấy 100% từ `TrustedStudentContext`. Lệnh prompt injection cố tình ghi đè `studentId` phải bị phớt lờ hoàn toàn.
- **Gate 3 (Context & History Isolation):** Sinh viên A không thể đọc/ghi hội thoại của Sinh viên B. Hai cuộc hội thoại độc lập của cùng một sinh viên không bị đè dữ liệu.
- **Gate 4 (Fail-Fast Persistence):** Không có silent fallback sang in-memory khi cấu hình yêu cầu CSDL thật (pgvector hoặc persistent conversation).
- **Gate 5 (Real pgvector Verification):** Thực thi test tích hợp thực tế với PostgreSQL pgvector trên cổng 5433, xác thực cosine search và khả năng tái lập chỉ mục (idempotent reindexing).
- **Gate 6 (Clean Boundaries):** Không sửa đổi bất kỳ tệp tin nào ngoài `tv1-ai/**`.
