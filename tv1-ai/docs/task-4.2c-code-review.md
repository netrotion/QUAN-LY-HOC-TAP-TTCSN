# BÁO CÁO ĐÁNH GIÁ AN NINH & KIẾN TRÚC ĐỘC LẬP (TASK 4.2c CODE REVIEW)
## Phân hệ Cố vấn Học vụ Thông minh — Kiểm tra Độc lập Ranh giới An ninh & Tính Toàn vẹn Kiến trúc

- **Dự án:** HaUI Academic Advisor (`QUAN-LY-HOC-TAP-TTCSN`)
- **Mã Task:** Task 4.2c — Thay fake tool bằng tool và context thật
- **Người thực hiện:** Agent F — Independent Security & Architecture Reviewer
- **Ngày đánh giá:** 2026-10-20
- **Phạm vi thẩm định:** Toàn bộ mã nguồn, cấu hình Spring Boot và ca kiểm thử trong `tv1-ai/**`.

---

## 1. TỔNG QUAN PHÁN QUYẾT AN NINH & KIẾN TRÚC

Sau khi tiến hành kiểm toán mã nguồn chi tiết theo phương pháp tĩnh và động độc lập, Agent F đưa ra phán quyết:

**PHÁN QUYẾT: CHẤP THUẬN AN NINH & KIẾN TRÚC (APPROVED — NO BLOCKING DEFECTS REMAINING)**

Toàn bộ các yêu cầu an ninh phi thương lượng (Non-Negotiable Rules) và các ranh giới kiến trúc đã được thẩm định nghiêm ngặt:

| Tiêu chí an ninh & kiến trúc | Kết quả kiểm toán | Đánh giá |
| :--- | :---: | :--- |
| **1. Ranh giới sở hữu repo (Ownership Boundaries)** | **TUÂN THỦ 100%** | Chỉ chỉnh sửa mã nguồn trong `tv1-ai/**`. Không xâm phạm `tv4-academic` hay `tv5-platform`. |
| **2. Không tạo Engine học vụ trùng lặp trong AI** | **TUÂN THỦ 100%** | Không có phép tính học vụ hay quy tắc đào tạo nào viết lại trong AI; 100% ủy nhiệm qua port `AcademicFacade`. |
| **3. Không fallback giả lập âm thầm (No Silent Fallback)** | **TUÂN THỦ 100%** | Đã xử lý triệt để: Fail-Fast với `PGVECTOR` thiếu CSDL, Fail-Fast với persistent store thiếu bean, `strictReadiness` chặn công cụ chưa sẵn sàng. |
| **4. Bất biến định danh sinh viên (Identity Invariance)** | **TUÂN THỦ 100%** | `studentId` lấy 100% từ `TrustedStudentContext` của server. Không cho phép client hay prompt LLM ghi đè `studentId`. |
| **5. Cô lập đa người dùng (Cross-User Data Isolation)** | **TUÂN THỦ 100%** | Dữ liệu học tập và hội thoại của Sinh viên A và B hoàn toàn tách biệt. Ngăn chặn nỗ lực đọc/ghi chéo hội thoại. |
| **6. An toàn truy vấn CSDL (SQL Injection Safety)** | **TUÂN THỦ 100%** | 100% câu lệnh SQL trong `PgVectorStoreAdapter` sử dụng Parameterized Statements với dấu `?` và `PGvector`. |
| **7. Bảo vệ dữ liệu cá nhân trong RAG (RAG Privacy Boundary)** | **TUÂN THỦ 100%** | Chỉ lập chỉ mục tài liệu quy chế HaUI dùng chung; tuyệt đối không lập chỉ mục bảng điểm cá nhân vào vector store. |
| **8. Bảo mật thông tin xác thực (Credential & Secret Safety)** | **TUÂN THỦ 100%** | Không hardcode API key, không ghi log bí mật, kiểm tra script `check-secrets.mjs` đạt kết quả xanh. |

---

## 2. KẾT QUẢ ĐÁNH GIÁ CHI TIẾT TỪNG THÀNH PHẦN

### 2.1. Đánh giá Cấu hình Spring Boot & Dây chuyền Dependency Injection (`AiAutoConfiguration.java`)
- **Kiểm toán Fail-Fast:**
  - Tại bean `vectorStore`: Khi `properties.getRag().getStoreType() == StoreType.PGVECTOR`, mã kiểm tra `if (jdbcTemplate == null)` và lập tức ném `IllegalStateException`. Loại bỏ hoàn toàn nguy cơ âm thầm trả về `InMemoryVectorStore` trong môi trường sản xuất.
  - Tại bean `conversationHistoryManager`: Khi `properties.getAdvisor().isRequirePersistentStore()` được bật, nếu `conversationStore == null` hoặc là `InMemoryConversationStore`, mã ném `IllegalStateException`.
  - Tại bean `toolAdapter`: Đã truyền `strictReadiness` từ cấu hình `properties.getAdvisor().isStrictReadiness()`, bảo đảm cơ chế chặn đứng hoạt động mặc định ở production.

### 2.2. Đánh giá Ranh giới Adapter Công cụ Học vụ (`DefaultToolAdapter.java`)
- **Kiểm toán Ranh giới ủy nhiệm:**
  - `DefaultToolAdapter` chỉ phụ thuộc vào `AcademicFacade` interface từ `haui-contracts`. Không có bất kỳ lệnh `import` nào tới các class triển khai của TV4 (ví dụ `DefaultAcademicFacade` hay `DbStudentAcademicRecordProvider`).
  - Mọi phương thức công cụ (`getAcademicStatus`, `checkCourseEligibility`, `generateStudyPlan`, v.v.) đều bắt buộc gọi `extractTrustedStudentId(context)` đầu tiên. Nếu `context` hoặc `studentId` rỗng/null, ném `IllegalArgumentException` ngay lập tức trước khi thực hiện bất kỳ tác vụ nào.
  - Tham số `dataRevision` được truyền trung thực từ `TrustedStudentContext` xuống `AcademicStatusRequest`, bảo toàn ngữ nghĩa phiên bản dữ liệu.
  - Phương thức `checkReadiness(capability)` kiểm tra `academicFacade.readyCapabilities()`. Khi `strictReadiness == true`, ném `ToolNotReadyException` nếu năng lực chưa sẵn sàng.

### 2.3. Đánh giá Quản lý Hội thoại & An ninh Đa tài khoản (`ConversationHistoryManager.java` & `DefaultAdvisorFacade.java`)
- **Kiểm toán Sở hữu Hội thoại:**
  - `loadHistory(conversationId, studentId, maxTurns)`: Kiểm tra `record.getStudentId()`. Nếu tồn tại và không khớp `studentId` của phiên đăng nhập, ném `SecurityException("Cross-account access denied...")`.
  - `saveTurn(conversationId, studentId, ...)`: Tương tự kiểm tra quyền sở hữu; nếu `conversationId` đã thuộc về sinh viên khác, từ chối ghi đè.
  - `DefaultAdvisorFacade`:
    - Đã bắt ngoại lệ `SecurityException` và `IllegalArgumentException` khi phát hiện xung đột sở hữu hội thoại giữa các tài khoản, lập tức phản hồi thông điệp bảo mật `SECURITY_ERROR: Access denied to conversation ...`.
    - Đã chuyển đổi các lỗi lưu trữ CSDL thành cảnh báo `PERSISTENCE_ERROR`, loại bỏ việc nuốt chửng ngoại lệ trong khối `catch (Exception ignored)`.
  - Giới hạn kích thước tin nhắn (`maxTotalChars`) được áp dụng trước khi lưu xuống CSDL, bảo đảm không làm quá tải hoặc vượt giới hạn 1MB của PostgreSQL `messages_json`.

### 2.4. Đánh giá An toàn CSDL & PostgreSQL/pgvector Adapter (`PgVectorStoreAdapter.java`)
- **Kiểm toán Chống SQL Injection:**
  - Toàn bộ phương thức `upsert`, `search`, `deleteBySourceId`, `findById`, `count` đều sử dụng câu lệnh SQL tĩnh với tham số `?` thông qua `JdbcTemplate.batchUpdate` hoặc `JdbcTemplate.query`.
  - Các tham số chuỗi (`sourceIdFilter`, `versionFilter`) đều được truyền qua mảng tham số của PreparedStatement, không bao giờ nối chuỗi thô.
  - Đã kiểm tra trực tiếp qua ca kiểm thử `PgVectorStoreAdapterTest.testSearchParameterizedAndSqlInjectionSafe`: Thử nghiệm chèn chuỗi độc hại `' OR '1'='1; DROP TABLE rag_chunks; --` hoàn toàn bị vô hiệu hóa an toàn.
- **Kiểm toán Toán tử pgvector:**
  - Sử dụng toán tử khoảng cách cosine của pgvector: `(1.0 - (embedding <=> ?::vector))`, chuẩn xác theo đặc tả của pgvector 0.8.x.
  - Cung cấp phương thức `generateDDL` tạo chỉ mục HNSW cosine `idx_rag_chunks_embedding_cosine ON rag_chunks USING hnsw (embedding vector_cosine_ops)`.

### 2.5. Đánh giá Bảo vệ Dữ liệu Cá nhân trong RAG (Privacy Boundary)
- **Kiểm toán Rò rỉ Dữ liệu:**
  - Pipeline RAG (`RagIngestionService`, `RagAdvisorService`) chỉ đọc các văn bản quy chế đào tạo từ nguồn tài liệu chuẩn mực (`REG-01: Quy chế đào tạo HaUI`, `REG-02: Quy chế xét tốt nghiệp HaUI`).
  - Kiểm tra toàn bộ mã nguồn `RagIngestionService` và `PgVectorStoreAdapter`: Tuyệt đối không có đoạn mã nào nạp bảng điểm sinh viên (`StudentAcademicRecord`) hay thông tin cá nhân vào RAG corpus hoặc vector store.
  - RAG index dùng chung hoàn toàn vô danh và chỉ phục vụ việc trích dẫn quy chế đào tạo HaUI.

### 2.6. Đánh giá Client Nhúng Vector Trực tiếp (`LiveEmbeddingProvider.java`)
- **Kiểm toán HTTP Client:**
  - Sử dụng `java.net.http.HttpClient` có sẵn của JDK 21, tuân thủ nguyên tắc không đưa thêm thư viện ngoài không cần thiết.
  - Cấu hình Timeout rõ ràng (`Duration.ofSeconds(10)`).
  - Khóa API (`apiKey`) chỉ được gắn vào Header hoặc Query param trong request ra bên ngoài, không bao giờ in ra nhật ký (log) hệ thống.
  - Khi chưa cấu hình, phương thức `isConfigured()` trả về `false`, và gọi `embed()` sẽ ném `IllegalStateException` fail-fast, ngăn chặn việc sinh vector rác ngẫu nhiên.

---

## 3. KẾT LUẬN & KHUYẾN NGHỊ BÀN GIAO CHO TV5

Agent F xác nhận:
1. Module `tv1-ai` đã đáp ứng 100% các tiêu chuẩn an ninh và ranh giới kiến trúc cho mốc tích hợp `advisor-integrated`.
2. Không còn bất kỳ khiếm khuyết an ninh (Security Vulnerability) hay vi phạm kiến trúc nào còn tồn đọng trong phạm vi mã nguồn TV1.
3. Đối với rào cản ngoại vi bảng CSDL `rag_chunks`: TV1 đã chuẩn bị sẵn file di trú `V5__rag_chunks_vector_table.sql` với chỉ mục HNSW tối ưu để bàn giao cho TV5 triển khai vào luồng Flyway production trong Task tiếp theo.
