# TASK 3.2 — TÀI KHOẢN, DỮ LIỆU VÀ NHẬP BẢNG ĐIỂM (`data-api-ready`)

> **Người thực hiện:** TV5 — Backend/DB/DevOps
> **Phạm vi:** `tv5-platform/` (contracts 1.1.0, app, infra, docs) và root files (`pom.xml`, `package.json`, `package-lock.json`, `scripts/`, `.env.example`, `README.md`)
> **Chờ:** 2.4 (`contracts-v1`)
> **Tiêu chí nghiệm thu:** Hai tài khoản không đọc chéo; import review trước commit; upload có giới hạn; điểm parser không phải nguồn tính CPA.

---

## 1. Tóm tắt

| Hạng mục | Kết quả |
|---|---|
| Bảo mật | Spring Security session cookie (`JSESSIONID`, HttpOnly, SameSite=Lax) + CSRF cookie `XSRF-TOKEN`/header `X-XSRF-TOKEN` cho mọi request ghi, kể cả đăng nhập. Chỉ vai trò `STUDENT`. Đăng nhập đổi session id (chống fixation) và cấp CSRF token mới. Mật khẩu BCrypt. |
| Truy vấn theo principal | `DbStudentContextProvider` lấy sinh viên theo principal của phiên. Bỏ bản in-memory cũ, vốn trả sinh viên demo khi chưa đăng nhập. Mọi repository lọc theo `student_id` của context. |
| Tài khoản | `/auth/csrf`, `/auth/session`, `/auth/login`, `/auth/register`, `/auth/logout`. Không đăng nhập hay crawl cổng e-HaUI. |
| Hồ sơ, CTĐT, bảng điểm, chứng chỉ | `GET/PUT /students/me`, `GET /academic/curriculum`, `GET /academic/transcript`, `GET /academic/certificates`, `PUT /academic/certificates/{code}` (tự khai báo, `SELF_DECLARED`). |
| Nhập bảng điểm | PDF có lớp chữ → parser; ảnh/PDF scan → OCR (Tesseract CLI, cấu hình được); parser/OCR lỗi → nhập tay. Luồng tải lên/nhập tay → xem lại/sửa → xác nhận. |
| Seed | CTĐT 120 học phần, tên chuẩn đầu ra, tài khoản demo lấy từ fixture TV4 (cùng nguồn với engine học vụ). |
| Contracts | Phát hành **1.1.0** theo quy trình §6 của Task 2.4: 18 operation, 28 DTO/enum, port `StudentAcademicRecordProvider`, 30 file mẫu mới. |
| DB | Migration `V3__accounts_transcript_import.sql`; Flyway là nguồn schema duy nhất (script init Docker chỉ còn bật extension). |

Ranh giới với task khác: lưu kế hoạch/chat vào DB thuộc **3.7**; nối tính trạng thái học vụ/CPA, cây môn, audit với AcademicFacade thuộc **4.1**. Các endpoint đó vẫn trả `501` cho tới khi được nối.

---

## 2. Tiêu chí nghiệm thu và bằng chứng

| Tiêu chí | Cơ chế | Kiểm chứng |
|---|---|---|
| **Hai tài khoản không đọc chéo** | Danh tính chỉ từ principal; truy vấn phiên nhập, bảng điểm, chứng chỉ, kế hoạch đều kèm `student_id` của context; tài nguyên của người khác trả 404 (không lộ là có tồn tại). | `AccountSecurityTest.twoAccountsCannotReadEachOther`: hai phiên đăng nhập thật; B không thấy hồ sơ, bảng điểm, phiên nhập (kể cả hủy hộ), chứng chỉ, kế hoạch của A. Chạy lại trên PostgreSQL thật: B mở phiên của A → `404 IMPORT_SESSION_NOT_FOUND`. |
| **Import review trước commit** | Tải lên/nhập tay chỉ tạo phiên (`REVIEW_REQUIRED`/`MANUAL_ENTRY_REQUIRED`); dòng lưu trong phiên. Chỉ `confirm` mới thay `enrollment_attempts` và tăng `dataRevision`, trong một giao dịch. Còn vấn đề chặn → `422`. Phiên đóng → `409`. | `TranscriptImportFlowTest.reviewBeforeCommit` và `cancelWritesNothing`: sau tải lên, sau sửa, sau xác nhận bị chặn, sau hủy, bảng điểm vẫn `NONE` và revision không đổi; chỉ sau xác nhận mới có 6 lần học và revision mới. |
| **Upload có giới hạn** | 5 MB (servlet multipart + kiểm tra lại ở service), 10 trang PDF, 40 triệu điểm ảnh, 300 dòng, tối đa 3 phiên đang mở, phiên hết hạn sau 24 giờ. Loại file xét theo magic bytes (PDF/PNG/JPEG), không theo đuôi. PDF có mật khẩu bị từ chối. Không lưu nội dung file, chỉ lưu SHA-256. | `TranscriptImportFlowTest.uploadLimits` (400 rỗng, 413 dung lượng, 413 số trang, 415 file `.pdf` giả, 429 quá số phiên), `TranscriptDocumentReaderTest` (ảnh quá lớn, PDF hỏng). |
| **Điểm parser không phải nguồn tính CPA** | (1) Bỏ cột `gpa/cpa/accumulated_credits/warning_level` khỏi `student_records`. (2) CPA, tín chỉ tích lũy in trên tài liệu chỉ nằm trong `documentSummary` của phiên, có cảnh báo "chỉ để đối chiếu". (3) Cột điểm hệ 4 trên tài liệu bị parser bỏ qua; `score_4` không bao giờ được ghi. (4) `StudentAcademicRecordProvider`, input của AcademicFacade, chỉ chứa bảng điểm đã xác nhận (điểm 10 + điểm chữ). (5) CTĐT là nguồn của tên/tín chỉ, không phải tài liệu. | `TranscriptImportFlowTest.parserFiguresAreNeverTheCpaSource`: tài liệu ghi CPA 3.99 và 120 TC; sau xác nhận, hồ sơ, bảng điểm và record cho AcademicFacade không chứa 3.99/`reportedCpa`/`cpa`; `score_4` NULL; `/academic/status` vẫn 501. `ContractAccountDataSemanticsTest`: không DTO đầu vào nào có GPA/CPA. Trên PostgreSQL: `score_4` trống. |

---

## 3. Contracts 1.1.0

Chi tiết trong [`contracts/CHANGELOG.md`](../contracts/CHANGELOG.md). Các điểm đáng chú ý cho người dùng contract:
- **401 thay cho 403** khi chưa đăng nhập. 403 (`ACCESS_DENIED`) chỉ còn cho thiếu CSRF hoặc sai vai trò, và nay có body.
- **`credits` là số thực** trên JSON (CTĐT có `DC6006` 1.5 TC). DTO cũ giữ `Integer` trong Java tới 2.0.0. Server trả 400 khi nhận số lẻ cho các trường này, thay vì làm tròn ngầm (`accept-float-as-int=false`).
- **Một tên cho một dữ liệu:** `importSessionId` dùng chung ở phiên nhập và bảng điểm; `transcriptStatus` dùng chung ở hồ sơ, bảng điểm và record. Phía dòng nhập, `documentCourseName`/`sourceText` (đúng như trên tài liệu) tách khỏi `courseName`/`credits` (theo CTĐT).
- **Port mới `StudentAcademicRecordProvider`** cho TV4: engine lấy bảng điểm đã xác nhận qua interface, không truy cập DB.

---

## 4. Thiết kế chính

### 4.1. Bảo mật
- `SecurityConfig`: `permitAll` cho `GET /system/*`, `GET /auth/csrf|session`, `POST /auth/login|register`; `/api/v1/**` cần `ROLE_STUDENT`; còn lại `denyAll`. JSON 401/403 qua `JsonSecurityErrorHandler`.
- CSRF: `CookieCsrfTokenRepository` (cookie đọc được bởi SPA) + `CsrfTokenRequestAttributeHandler` (giá trị cookie dùng thẳng làm header, khớp `apiClient` của TV2). `CsrfCookieFilter` buộc cookie luôn có trong response.
- Đăng nhập JSON (`AuthController`): `AuthenticationManager` (DaoAuthenticationProvider + BCrypt) → `ChangeSessionIdAuthenticationStrategy` + `CsrfAuthenticationStrategy` → lưu SecurityContext vào session. Sai mã sinh viên/mật khẩu, tài khoản bị khóa hay không phải STUDENT đều trả cùng `401 INVALID_CREDENTIALS`.
- Đăng ký: mã sinh viên `^[A-Za-z0-9._-]{4,50}$` (khai báo, không xác minh với trường), mật khẩu 8 ký tự–72 byte, CTĐT phải tồn tại.

### 4.2. Dữ liệu (V3)
- `student_records`: thêm `class_name`, `curriculum_id`, `transcript_status`, `transcript_source_type`, `transcript_import_session_id`, `transcript_confirmed_at`; bỏ số liệu học vụ lưu sẵn. `dataRevision = REV-{studentId}-{version}`, tăng bằng optimistic lock khi xác nhận bảng điểm, khai báo chứng chỉ hoặc đổi CTĐT.
- `curriculum_courses`: học phần theo chương trình, giữ nguyên mã học phần điều kiện như CTĐT (kể cả 16 mã chưa có trong danh mục, như `IT6203`), nên không đặt khóa ngoại cho các mã đó.
- `courses.credits` → `NUMERIC(4,1)`.
- `import_sessions`: metadata, SHA-256, `rows_json`/`document_summary_json`/`warnings_json` (TEXT, chạy được cả H2 lẫn PostgreSQL), `session_version`, `expires_at`.
- `enrollment_attempts`: thêm `source`, `import_session_id`; trạng thái chỉ `RECORDED`/`IN_PROGRESS` (đạt/không đạt do AcademicFacade suy ra).
- `audit_requirements`: 4 chuẩn đầu ra phi tín chỉ; `student_audit_checklists` thêm `verification`, `evidence_note`, `achieved_on`.

### 4.3. Nhập bảng điểm
```text
upload ─▶ TranscriptDocumentReader ─▶ TranscriptTextParser ─▶ ImportRowValidator ─▶ import_sessions (REVIEW_REQUIRED)
  │        (magic bytes, PDFBox,         (học kỳ, dòng HP,          (CTĐT: mã/tên/TC,            │
  │         render + OcrEngine)           summary tài liệu)          trùng, điểm, OCR)            ▼
  └─ không đọc được / tài liệu của người khác ─▶ MANUAL_ENTRY_REQUIRED ─▶ PUT rows ─▶ confirm ─▶ enrollment_attempts
```
- Parser đọc `[STT] MÃ Tên TC Điểm10 ĐiểmChữ [...]`; cột sau điểm chữ (điểm hệ 4, ghi chú) bị bỏ qua. Học kỳ lấy từ tiêu đề ("Học kỳ 1 năm học 2024-2025", "HK hè ...") hoặc mã ghi trên dòng (`2025_2`).
- Dòng có mã học phần nhưng không đọc đủ được giữ nguyên văn (`UNREADABLE_ROW`, chặn). Mã đọc sai (`IT6O35`) được giữ để sinh viên sửa (`UNKNOWN_COURSE_CODE`, chặn), thay vì bị bỏ âm thầm. Ở chế độ OCR, chữ lẫn vào phần số của mã được sửa về số.
- Mã sinh viên trên tài liệu khác tài khoản → bỏ toàn bộ dòng (không giữ điểm của người khác), chuyển nhập tay.
- Nguồn bảng điểm sau xác nhận: theo loại tài liệu; nếu mọi dòng do sinh viên tự gõ thì là `MANUAL`.
- OCR: `haui.import.ocr.engine=disabled` (mặc định) hoặc `tesseract` (`OCR_TESSERACT_COMMAND`, `OCR_LANGUAGES=vie+eng`). Engine chạy `tesseract <ảnh> stdout tsv`, lấy độ tin cậy theo dòng; dòng dưới 0.80 được đánh dấu `LOW_CONFIDENCE`.

### 4.4. Seed từ fixture TV4
`PlatformDataSeeder` đọc `classpath:fixtures/*.json` (jar `haui-academic`):
- CTĐT và tên chuẩn đầu ra luôn được đồng bộ.
- Tài khoản demo chỉ tạo khi `DEMO_ACCOUNTS_ENABLED=true` và có `DEMO_ACCOUNT_PASSWORD`; không ghi đè tài khoản đã có.

---

## 5. Việc cần các thành viên khác xử lý

| Owner | Việc |
|---|---|
| **TV4** | (1) `tv4-academic/fixtures/student-profiles-v1.json`: hồ sơ `2024604757` bị lỗi mã hóa (UTF-8 bị đọc thành Windows-1252), ví dụ `"LÃª Viá»‡t HÃ¹ng"`, `"NGOáº I NGá»®"`. Seeder đang tự sửa và ghi cảnh báo; cần sửa file gốc. (2) Hồ sơ `std-warning-real`, `std-missing-unknown-v1` có học phần `IT6005`, `MA6002` không thuộc CTĐT KTPM, nên bị bỏ khi seed. (3) CTĐT tham chiếu 16 mã học phần điều kiện chưa có trong danh mục (`IT6203`, `IT6043`, `ME6042`, ...). (4) Tên chuẩn ngoại ngữ trong policy (TOEIC 550) khác hồ sơ (TOEIC 500+). (5) Task 3.1: có thể dùng `StudentAcademicRecordProvider` (fake: `FixtureStudentAcademicRecordProvider`) để tính GPA/CPA từ bảng điểm đã xác nhận, không đọc fixture hồ sơ. |
| **TV2** | Chuyển mock `POST /academic/transcript-ingest` sang `POST /academic/transcript/imports` + rows/confirm; `GET /academic/curriculum` đã có contract. Lấy CSRF qua `GET /auth/csrf`; xử lý 401 bằng điều hướng về đăng nhập. Báo cáo chi tiết: `npm run check:contract-consumers -- --owner tv2`. |
| **TV3** | Hồ sơ (`/students/me`) không có CPA; số liệu dự kiến vẫn lấy từ planner/what-if. Xử lý 401. |
| **TV1** | Lịch sử chat theo tài khoản sẽ có ở 3.7. Context đã lấy từ principal thật. |

---

## 6. Cấu hình

| Biến môi trường | Mặc định | Ý nghĩa |
|---|---|---|
| `DEMO_ACCOUNTS_ENABLED` / `DEMO_ACCOUNT_PASSWORD` | `false` / trống | Tạo tài khoản demo từ fixture TV4 |
| `OCR_ENGINE`, `OCR_TESSERACT_COMMAND`, `OCR_LANGUAGES` | `disabled`, `tesseract`, `vie+eng` | OCR ảnh/PDF scan |
| `IMPORT_MAX_FILE_SIZE`, `IMPORT_MAX_REQUEST_SIZE` | `5MB`, `6MB` | Giới hạn multipart (`haui.import.*` cho trang, điểm ảnh, dòng, số phiên, TTL) |
| `SESSION_TIMEOUT`, `SESSION_COOKIE_SECURE` | `30m`, `false` | Phiên đăng nhập; bật `secure` khi chạy sau HTTPS |
| `FLYWAY_PGVECTOR_INIT` | `CREATE EXTENSION IF NOT EXISTS vector;` | Đặt `SELECT 1;` khi PostgreSQL không có pgvector |

---

## 7. Kết quả kiểm thử

| Lệnh | Kết quả |
|---|---|
| `./mvnw verify` | 296 test pass: contracts 170, tv1-ai 33, tv4-academic 45, platform app 48 (H2 chế độ PostgreSQL) |
| `npm run smoke` | 9/10 PASS; bước Docker SKIPPED vì máy không có Docker CLI |
| `npm run check:contracts` | PASS: 1.1.0, 48 ví dụ, 35 operation, lock khớp, không có chuỗi lỗi mã hóa |
| PostgreSQL 16 thật (cluster tạm) | Flyway V1–V3 OK; seed 120 học phần + 3 tài khoản demo; luồng đăng nhập → upload PDF → sửa dòng → xác nhận → kiểm tra không đọc chéo → đăng xuất bằng curl (cookie + CSRF): kết quả đúng như trên |

---

## 8. Giới hạn còn lại
- **OCR thật chưa chạy:** máy không cài Tesseract. Đường OCR được kiểm bằng OCR giả lập (unit + end-to-end) và test phân tích TSV; cần chạy thử với `tesseract` + gói `vie` trước khi bật.
- **Parser** viết theo bố cục bảng điểm phổ biến (mã, tên, TC, điểm 10, điểm chữ); chưa có mẫu PDF thật từ e-HaUI để hiệu chỉnh. Dòng lạ được chuyển cho sinh viên sửa, không đoán.
- **Chưa giới hạn tần suất đăng nhập sai** (brute force); đề xuất bổ sung khi triển khai thật.
- **Session lưu trong bộ nhớ của tiến trình** (một runtime theo solution); chạy nhiều instance cần Spring Session JDBC/Redis.
- **Kế hoạch học tập vẫn lưu trong bộ nhớ** (Task 3.7); trạng thái học vụ/CPA trả 501 tới Task 4.1.
- **Docker image chưa được build lại** trên máy này.
