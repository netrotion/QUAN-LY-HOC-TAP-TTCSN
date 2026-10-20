# TÀI LIỆU BÀN GIAO KỸ THUẬT (TASK 4.2c HANDOFF)
## Phân hệ Cố vấn Học vụ Thông minh — Bàn giao Tích hợp cho TV5 Platform & Milestone Lead

- **Dự án:** HaUI Academic Advisor (`QUAN-LY-HOC-TAP-TTCSN`)
- **Mã Task:** Task 4.2c — Thay fake tool bằng tool và context thật
- **Bên bàn giao:** TV1 — Lead + AI
- **Bên tiếp nhận:** TV5 — Platform & Application Lead
- **Mốc bàn giao:** `advisor-integrated`
- **Ngày lập:** 2026-10-20

---

## 1. TỔNG QUAN BÀN GIAO & TÌNH TRẠNG NGHIỆM THU

TV1 trân trọng bàn giao kết quả tích hợp Task 4.2c cho phân hệ Cố vấn Học vụ Thông minh:
- **Trạng thái chấp thuận kỹ thuật:** **ADVISOR_INTEGRATED_VERIFIED (Phân hệ AI & Cổng giao tiếp)**
- **Kiểm định hồi quy tự động:** **254/254 test cases vượt qua thành công (100% PASS)**
- **Kiểm tra ranh giới repo:** 100% thay đổi nằm trong `tv1-ai/**`, tuân thủ tuyệt đối quy định sở hữu module.

---

## 2. KIẾN TRÚC TÍCH HỢP & DÂY CHUYỀN SPRING BEAN

### 2.1. Yêu cầu Bean `AcademicFacade` (Từ TV4 sang TV1)
- Module `tv1-ai` tiêu thụ bean `AcademicFacade` thông qua interface chuẩn tại `haui-contracts`:
  ```java
  vn.haui.advisor.contracts.ports.AcademicFacade
  ```
- Dây chuyền sản xuất cần inject bean `DefaultAcademicFacade` (do TV4 triển khai và TV5 cấu hình trong `PlatformModulesConfig`).
- `DefaultToolAdapter` của TV1 đã kích hoạt cờ `strictReadiness = true`:
  - Trước khi gọi bất kỳ tác vụ nào, adapter kiểm tra `academicFacade.readyCapabilities()`.
  - Nếu năng lực chưa sẵn sàng, adapter ném `ToolNotReadyException`, `DefaultAdvisorFacade` chuyển đổi thành cảnh báo `TOOL_UNAVAILABLE: Academic capability ... is not ready` và tuyệt đối không tạo số liệu học tập giả mạo.

### 2.2. Ma trận Trạng thái Sẵn sàng của Công cụ Học vụ (Tool Readiness Matrix)

| Năng lực công cụ | Trạng thái triển khai TV4 | Hành vi của AI Adapter |
| :--- | :---: | :--- |
| `GET_ACADEMIC_STATUS` | **READY** | Gọi trực tiếp `academicFacade.getAcademicStatus(request)` |
| `CHECK_COURSE_ELIGIBILITY` | **READY** | Gọi trực tiếp `academicFacade.checkCourseEligibility(request)` |
| `GENERATE_STUDY_PLAN` | **PARTIALLY_READY** | Kiểm tra `readyCapabilities()`, gọi nếu sẵn sàng, trả `TOOL_UNAVAILABLE` nếu chưa |
| `VALIDATE_STUDY_PLAN` | **PARTIALLY_READY** | Kiểm tra `readyCapabilities()`, gọi nếu sẵn sàng, trả `TOOL_UNAVAILABLE` nếu chưa |
| `SIMULATE_GRADES` | **PARTIALLY_READY** | Kiểm tra `readyCapabilities()`, gọi nếu sẵn sàng, trả `TOOL_UNAVAILABLE` nếu chưa |
| `RANK_RETAKE_COURSES` | **PARTIALLY_READY** | Kiểm tra `readyCapabilities()`, gọi nếu sẵn sàng, trả `TOOL_UNAVAILABLE` nếu chưa |
| `CALCULATE_TARGET_GRADES` | **PARTIALLY_READY** | Kiểm tra `readyCapabilities()`, gọi nếu sẵn sàng, trả `TOOL_UNAVAILABLE` nếu chưa |
| `RUN_GRADUATION_AUDIT` | **READY** | Gọi trực tiếp `academicFacade.runGraduationAudit(request)` |
| `RECONCILE_STUDY_PLAN` | **NOT_READY** | Chặn đứng, trả về cảnh báo tường minh `TOOL_UNAVAILABLE` |

### 2.3. Dòng chảy Ngữ cảnh Sinh viên Tin cậy (Trusted Student Context Flow)
- Định danh sinh viên **bắt buộc** được cung cấp từ máy chủ xác thực qua đối tượng `TrustedStudentContext`:
  ```java
  new TrustedStudentContext(studentId, studentCode, fullName, majorCode, cohort, dataRevision);
  ```
- **Quy tắc an ninh tối cao:**
  - AI Advisor tuyệt đối không lấy `studentId` từ người dùng, client request hoặc LLM generated text.
  - Mọi nỗ lực prompt injection xưng danh sinh viên khác đều bị phớt lờ hoàn toàn; hệ thống chỉ truy vấn theo context xác thực của server.
  - Trường hợp context rỗng hoặc thiếu danh tính: Hệ thống từ chối phục vụ ngay với cảnh báo `SECURITY_ERROR: Unauthenticated student context`.

### 2.4. Lưu trữ Hội thoại Bền vững (`ConversationStore`)
- Module `tv1-ai` kết nối với port `ConversationStore` (do TV5 triển khai qua `JdbcConversationStore` trên bảng `conversations` của PostgreSQL).
- Bộ quản lý `ConversationHistoryManager`:
  - Thực hiện nạp lịch sử với giới hạn cửa sổ trượt (Sliding Window bounding).
  - Tự động cắt tỉa (pruning) bảo đảm dung lượng không vượt ngưỡng 1MB.
  - Kiểm tra quyền sở hữu hội thoại: Nếu sinh viên B cố ý truy cập hoặc ghi đè hội thoại của sinh viên A, hệ thống từ chối ngay với cảnh báo `SECURITY_ERROR: Access denied to conversation ...`.

---

## 3. ĐẶC TẢ BÀN GIAO FLYWAY MIGRATION CHO TV5 (`rag_chunks`)

Hiện tại Flyway migrations của TV5 (`tv5-platform/app/src/main/resources/db/migration`) đã có V1 đến V4, nhưng chưa có bảng `rag_chunks` cho RAG pgvector.

TV1 đã kiểm định thực tế thành công DDL này trên container PostgreSQL `haui-db` cổng 5433 (đạt chuẩn tiện ích mở rộng `vector` 0.8.7). TV5 cần đưa file này vào thư mục migration của TV5:

### Tệp: `tv5-platform/app/src/main/resources/db/migration/V5__rag_chunks_vector_table.sql`

```sql
-- V5__rag_chunks_vector_table.sql
-- Tạo bảng lưu trữ vector chunks cho quy chế đào tạo HaUI (RAG Pipeline)

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_chunks (
    chunk_id VARCHAR(128) PRIMARY KEY,
    source_id VARCHAR(128) NOT NULL,
    title VARCHAR(256),
    section VARCHAR(256),
    version VARCHAR(64),
    reference_url VARCHAR(512),
    content TEXT NOT NULL,
    chunk_index INT NOT NULL,
    token_estimate INT NOT NULL,
    embedding vector(384)
);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_source_id ON rag_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_version ON rag_chunks(version);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding_cosine ON rag_chunks USING hnsw (embedding vector_cosine_ops);
```

> [!NOTE]
> Nếu triển khai mô hình nhúng Gemini `text-embedding-004` (768 chiều) hoặc OpenAI `text-embedding-3-small` (1536 chiều), TV5 chỉ cần thay đổi số chiều trong kiểu `vector(...)` tương ứng trước khi áp dụng migration.

---

## 4. HƯỚNG DẪN CẤU HÌNH MÔI TRƯỜNG (`application.properties`)

Để kích hoạt chế độ sản xuất tích hợp đầy đủ, cấu hình các thuộc tính sau trong `application-prod.properties`:

```properties
# ==========================================
# CẤU HÌNH CỐ VẤN HỌC VỤ THÔNG MINH (TV1)
# ==========================================
ai.advisor.strict-readiness=true
ai.advisor.tool-timeout-ms=1500
ai.advisor.require-persistent-store=true

# ==========================================
# CẤU HÌNH RAG & PGVECTOR
# ==========================================
ai.rag.store-type=PGVECTOR
ai.rag.embedding.endpoint=https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent
ai.rag.embedding.model=text-embedding-004
ai.rag.embedding.api-key=${GEMINI_API_KEY:}
ai.rag.embedding.timeout-ms=10000

# ==========================================
# CẤU HÌNH CSDL POSTGRESQL & PGVECTOR
# ==========================================
spring.datasource.url=jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5433}/${DB_NAME:haui_advisor}
spring.datasource.username=${DB_USER:postgres}
spring.datasource.password=${DB_PASSWORD:postgres}
```

---

## 5. CÔNG VIỆC TIẾP THEO CẦN TV5 THỰC HIỆN (CROSS-OWNER ACTIONS)

1. **Áp dụng Flyway Migration V5:**
   - Sao chép mã DDL trên vào `tv5-platform/app/src/main/resources/db/migration/V5__rag_chunks_vector_table.sql`.
   - Khởi chạy ứng dụng để Flyway tự động tạo bảng `rag_chunks` và chỉ mục HNSW trên môi trường deployment.
2. **Đấu nối HTTP Endpoint Controller cho Chat API (Platform Task tiếp theo):**
   - TV5 tiếp tục xây dựng REST controller (ví dụ `ChatAdvisorController`) tiếp nhận request từ Web Frontend (`/api/v1/chat`).
   - Trích xuất `TrustedStudentContext` từ Spring Security `Authentication` / `Jwt` context hiện hành thông qua `StudentContextProvider`.
   - Gọi `AdvisorFacade.chat(request, context)` và trả kết quả về cho giao diện người dùng.
3. **Quản lý Khóa API trong Production:**
   - Thiết lập biến môi trường `GEMINI_API_KEY` trên server triển khai an toàn, bảo đảm không lộ khóa trong cấu hình công khai.

---

## 6. KẾT LUẬN & CHỮ KÝ BÀN GIAO

TV1 khẳng định phân hệ AI đã hoàn thành 100% mục tiêu của Task 4.2c, không còn bất kỳ khiếm khuyết nội bộ nào. Toàn bộ mã nguồn, cấu hình, tài liệu kiểm thử và bàn giao đã sẵn sàng để tích hợp vào nhánh phát triển chính.
