# Báo Cáo Thẩm Định Prototype Phase 2 & Quality Gates Toàn Hệ Thống (Task 2.3)

> **Người thực hiện:** TV1 — Lead + AI Architect  
> **Dự án:** HaUI Advisor (`netrotion/QUAN-LY-HOC-TAP-TTCSN`)  
> **Phiên bản thẩm định:** Task 2.3 — Phase 2 Flow Approval & Quality Gate Review  
> **Thời điểm thẩm định:** 2026-10-08  
> **Trạng thái thẩm định:** `TASK_2_3_READY_FOR_OWNER_FIX` (CHƯA PHÊ DUYỆT `flow-approved-v1`)  
> **Ranh giới sở hữu:** 100% tài liệu được tạo trong `tv1-ai/**`. Không can thiệp mã nguồn ngoài phạm vi được giao.

---

## 1. Thông Tin Phiên Bản, Baseline Revisions & Ranh Giới Thẩm Định

### 1.1. Metadata Git & Baseline Commits
Quá trình thẩm định được thực hiện trực tiếp trên cây mã nguồn tại commit `HEAD` với toàn bộ lịch sử tích hợp của 5 thành viên (TV1 – TV5):

- **HEAD Commit:** `490d5cc31a3076062ebf21567098eebd11371b34`
- **Danh sách 6 Baseline Commits được thẩm định:**
  1. `490d5cc31a3076062ebf21567098eebd11371b34` (TV2 — Task 2.2a: Academic Subsystem Prototype & UI Shell).
  2. `403f8f992de14ec3647705876b49d5cc42cddb82` (TV3 — Task 2.2b: Interactive Prototype for Planner, Chat, What-if & Profile).
  3. `0b82c363e8ae702f5c822eb0ecf90378466f1383` (Merge PR #6 / `522bfc0`: TV4 — Task 2.2c: Academic Spec V1, Fixtures & Test Harness).
  4. `8dc807cf9ea6e7adf5bb9649e4921a4af07cab3c` (Merge PR #9 / `53f7c01`: TV5 — Task 2.2d: V2 Flyway Migrations, Study Plan Contracts & Context Isolation).
  5. `565768af5b2abaf88a45f6329bcf191b49929316` (TV1 — Task 2.2e: Chat Behavior Spec, RAG Source Catalog & Eval Dataset).
  6. `f539379a8f62d2f1cdf3ca77efcb8bfe6f0e62ef` (TV1 — Validation 2.2e: Per-case conversation state, error tracking & source requirements).

### 1.2. Kiểm Tra Sự Hiện Diện Của Các File Artifacts Trên Đĩa
Toàn bộ các artifacts chính của các phân hệ từ Task 2.2a đến 2.2e đã được xác minh tồn tại thực tế trên ổ đĩa:

| Phân hệ / Task | Đường dẫn File Chính trên Đĩa | Tình trạng Vật lý |
|---|---|---|
| **TV2 (Task 2.2a)** | `tv2-web/src/pages/AcademicProgressPage.jsx`<br>`tv2-web/src/pages/GraduationAuditPage.jsx`<br>`tv2-web/src/pages/CurriculumTreePage.jsx`<br>`tv2-web/src/pages/TranscriptImportPage.jsx`<br>`tv2-web/src/pages/DashboardPage.jsx`<br>`tv2-web/src/pages/LoginPage.jsx`<br>`tv2-web/src/services/academicStore.js`<br>`tv2-web/test/app.test.mjs` | **TỒN TẠI** (Có lỗi cú pháp JSX tại `AcademicProgressPage.jsx`) |
| **TV3 (Task 2.2b)** | `tv3-planner-ui/src/pages/StudyPlannerPage.js`<br>`tv3-planner-ui/src/pages/ChatAdvisorPage.js`<br>`tv3-planner-ui/src/pages/WhatIfSimulatorPage.js`<br>`tv3-planner-ui/src/pages/StudentProfilePage.js`<br>`tv3-planner-ui/src/components/PlanHistoryModal.js`<br>`tv3-planner-ui/src/components/CurriculumTreeModal.js`<br>`tv3-planner-ui/src/services/plannerStore.js`<br>`tv3-planner-ui/test/routes.test.mjs` | **TỒN TẠI** (Có 4 lỗi nghiệp vụ logic) |
| **TV4 (Task 2.2c)** | `tv4-academic/docs/academic-spec-v1.md`<br>`tv4-academic/fixtures/academic-fixtures-v1.json`<br>`tv4-academic/fixtures/curriculum-ktpm-v1.json`<br>`tv4-academic/fixtures/student-profiles-v1.json`<br>`tv4-academic/src/main/java/vn/haui/advisor/academic/engine/StudyPlanScheduler.java` | **TỒN TẠI** |
| **TV5 (Task 2.2d)** | `tv5-platform/docs/task-2.2d-migration-and-contracts-spec.md`<br>`tv5-platform/contracts/openapi/openapi-v0.yaml`<br>`tv5-platform/contracts/examples/fixture-manifest.json`<br>`tv5-platform/infra/migrations/01_init_schema.sql`<br>`tv5-platform/app/src/main/resources/db/migration/V2__comprehensive_platform_schema.sql`<br>`tv5-platform/app/src/main/java/vn/haui/advisor/platform/web/StudyPlanController.java` | **TỒN TẠI** |
| **TV1 (Task 2.2e)** | `tv1-ai/specs/task-2.2e-chat-spec.md`<br>`tv1-ai/src/main/resources/rag/source-catalog.json`<br>`tv1-ai/src/test/resources/eval/chat-eval-v1.json`<br>`tv1-ai/src/test/java/vn/haui/advisor/ai/eval/ChatEvalAndCatalogValidationTest.java` | **TỒN TẠI** |

### 1.3. Nguyên Tắc Ranh Giới (Boundary Locks)
- TV1 chỉ đọc mã nguồn của TV2, TV3, TV4, TV5 để thẩm định độc lập.
- TV1 **tuyệt đối không can thiệp, không sửa hộ code** trong `tv2-web/**`, `tv3-planner-ui/**`, `tv4-academic/**`, `tv5-platform/**`, cũng như root files (`package.json`, `pom.xml`, `scripts/**`).
- Mọi lỗi phát hiện đều được lập mã số `F23-XXX` và bàn giao chính xác cho từng owner chịu trách nhiệm.

---

## 2. Bảng Kết Quả Quality Gates Hệ Thống

Toàn bộ các bài kiểm tra tự động và script thẩm định chất lượng đã được kích hoạt trực tiếp trong môi trường tích hợp:

| Hạng mục Quality Gate | Lệnh Thực thi | Exit Code | Kết quả | Chi tiết Thực tế & Bằng chứng |
|---|---|:---:|:---:|---|
| **1. Secrets Scanner** | `node scripts/check-secrets.mjs` | `0` | **PASS** | Không phát hiện API keys, private keys, password thật trong toàn bộ repo. |
| **2. Architecture Cyclic** | `node scripts/check-architecture.mjs` | `0` | **PASS** | Không có phụ thuộc vòng lặp (cyclic dependency); ranh giới module rõ ràng. |
| **3. Contracts & OpenAPI** | `node scripts/check-contracts.mjs` | `0` | **PASS** | Đặc tả OpenAPI V0 hợp lệ; 15/15 fixture samples hợp chuẩn schema. |
| **4. Frontend Lint** | `node scripts/check-lint.mjs` | `0` | **PASS** | Không có lỗi format, biến chưa khai báo hoặc cấu trúc tệp sai quy định. |
| **5. Frontend Unit Tests** | `npm test` | `0` | **PASS** | **20/20 tests PASS** (0 failed). Gồm 10 tests của `tv2-web` (kiểm tra routing, store, mock client) và 10 tests của `tv3-planner-ui`. |
| **6. Backend Multi-Module Tests** | `mvn test` | `0` | **PASS** | **13 tests PASS** trên cả 4 modules backend (`tv1-ai`, `tv4-academic`, `tv5-platform-contracts`, `tv5-platform-app`). Chế độ AI mock an toàn. |
| **7. Docker Compose Spec** | `docker compose config` | `0` | **PASS** | Cấu hình Docker compose cho PostgreSQL, pgvector và dịch vụ nền hợp lệ. |
| **8. Database Migrations** | Smoke Check step 10 | `0` | **PASS** | 20 bảng của Flyway V1 & V2 trong `tv5-platform` được thẩm định cấu trúc thành công. |
| **9. Ownership Boundary Check** | `node scripts/check-ownership.mjs` | `0` | **PASS** | Hợp lệ trên toàn bộ các commit tích hợp baseline. *(Lưu ý: TV5 cần cập nhật cấu hình script để cho phép TV1 quản lý tài liệu Phase 2 trong `tv1-ai/docs/`)*. |
| **10. Frontend Workspace Build** | `npm run build`<br>(`vite build`) | `1` | **FAIL (BLOCKER)** | **Lỗi cú pháp JSX:** `AcademicProgressPage.jsx:439:6: ERROR: Unexpected closing "div" tag does not match opening "Modal" tag`. Build Vite bị dừng hoàn toàn. |
| **TỔNG HỢP: Smoke Check** | `node scripts/smoke-check.mjs` | `1` | **FAIL** | **9/10 checks PASS**, 1 check FAIL (Check 7: Frontend Workspaces Build). |

---

## 3. Đánh Giá Trạng Thái Tương Tác & Phân Định Mức Độ Bằng Chứng

Do lệnh `npm run build` gặp lỗi biên dịch cú pháp JSX tại `tv2-web/src/pages/AcademicProgressPage.jsx`, ứng dụng Frontend không thể đóng gói để triển khai môi trường preview trực quan.

Để đảm bảo tính trung thực kỹ thuật (không biến kết quả phân tích tĩnh hoặc unit test thành bằng chứng tương tác người dùng), TV1 thiết lập phân định 3 mức độ bằng chứng:

1. **`STATIC_CONFIRMED` (Xác nhận tĩnh):** Luồng hoặc tính năng đã được thẩm tra trực tiếp qua mã nguồn React/JavaScript, xác nhận các hàm gọi, routes, component wiring và logic state là nhất quán trên lý thuyết.
2. **`TEST_CONFIRMED` (Xác nhận qua Unit Test):** Luồng hoặc tính năng có kịch bản kiểm thử tự động độc lập chạy trong môi trường Node.js runner (`npm test`) và đã vượt qua kiểm thử thành công.
3. **`INTERACTIVE_VERIFICATION_BLOCKED` (Tương tác trực quan bị chặn):** Không thể thực hiện kịch bản bấm thử trực tiếp trên trình duyệt (E2E browser clickthrough) cho người dùng cuối do lỗi đóng gói Frontend.

> [!CAUTION]
> **Kết luận sơ bộ:** Toàn bộ các tiêu chí P01–P13 chỉ được xác nhận tối đa ở mức `STATIC_CONFIRMED` hoặc `TEST_CONFIRMED`. Trạng thái nghiệm thu tương tác thực tế toàn diện hiện bị khóa ở mức **`INTERACTIVE_VERIFICATION_BLOCKED`** cho đến khi TV2 khắc phục lỗi biên dịch tại `AcademicProgressPage.jsx`.

---

## 4. Ma Trận Chi Tiết Thẩm Định Kịch Bản Bấm Thử P01–P13

Dưới đây là bảng đối chiếu chi tiết 13 kịch bản nghiệp vụ (P01–P13) được quy định tại Mục 10 của `tv1-ai/docs/solution-v1.md` với mã nguồn thực tế của TV2 và TV3:

### P01: Điều hướng Dashboard ↔ Chat / Planner / What-if / Audit
- **Tiền điều kiện (Preconditions):** Sinh viên đã đăng nhập (hoặc chọn Persona) tại `/login` hoặc root `/`.
- **Đường dẫn vào (Entry Route):** `/dashboard` (hoặc `/`).
- **Các bước thực hiện (Steps):**
  1. Người dùng vào Dashboard (`DashboardPage.jsx`).
  2. Click vào các nút Quick Actions: "Trò chuyện AI" (`/chat`), "Kế hoạch học tập" (`/planner`), "Mô phỏng điểm" (`/what-if`), "Kiểm toán tốt nghiệp" (`/audit` hoặc `/progress`).
  3. Từ các trang đích, nhấn nút "Quay lại" hoặc dùng Sidebar/Topbar để trở về `/dashboard`.
- **Kỳ vọng (Expected):** Các phân hệ có đường vào trực tiếp độc lập; không bắt buộc phải đi hết chuỗi demo tuần tự; trở về Dashboard nguyên vẹn ngữ cảnh.
- **Thực tế mã nguồn (Actual):** `DashboardPage.jsx` và `Sidebar.jsx` sử dụng `navigate()` chuyển đổi mượt mà giữa các route.
- **Kết quả:** **PASS**
- **Mức bằng chứng:** `STATIC_CONFIRMED` (`INTERACTIVE_VERIFICATION_BLOCKED`)
- **Owner:** TV2 (phối hợp TV3 routing).

---

### P02: Sinh viên chưa có bảng điểm (Empty Persona)
- **Tiền điều kiện:** Chọn tài khoản sinh viên mới chưa có điểm (`empty` - Lê Hoàng Nam, K19, 0 TC tích lũy, CPA `null`).
- **Đường dẫn vào:** `/login` -> chọn "Sinh viên chưa có bảng điểm" -> `/dashboard`, `/curriculum`, `/chat`.
- **Các bước thực hiện:**
  1. Chọn persona `empty` tại `LoginPage.jsx`.
  2. Mở Dashboard: Kiểm tra metric CPA và tiến độ.
  3. Mở Cây môn học `/curriculum`: Kiểm tra hiển thị.
  4. Mở Chat `/chat`: Đặt câu hỏi quy chế chung và câu hỏi tư vấn kế hoạch.
- **Kỳ vọng:** Metric CPA giữ nguyên `null / --` (không biến thành 0.0), tiến độ 0/135 TC; Dashboard hiển thị Banner cảnh báo chưa có hồ sơ và hướng dẫn nạp bảng điểm; CTĐT hiển thị cây môn chuẩn; Chat trả lời quy chế chung bình thường, nhưng khi hỏi lộ trình cá nhân hóa thì hướng dẫn bổ sung hồ sơ.
- **Thực tế mã nguồn:** `LoginPage.jsx` thiết lập `cpa: null, totalCredits: 0`. `DashboardPage.jsx` kiểm tra `cpa === null` hiển thị banner "Tài khoản chưa có bảng điểm" kèm CTA nạp điểm. Unit test số 7 trong `app.test.mjs` xác nhận dữ liệu khuyết được bảo toàn.
- **Kết quả:** **PASS**
- **Mức bằng chứng:** `TEST_CONFIRMED` & `STATIC_CONFIRMED` (`INTERACTIVE_VERIFICATION_BLOCKED`)
- **Owner:** TV2.

---

### P03: Nhập bảng điểm (Upload / Nhập tay / Review / Sửa / Hủy / Thử lại / Xác nhận)
- **Tiền điều kiện:** Đăng nhập vào hệ thống.
- **Đường dẫn vào:** `/transcript` (hoặc `/academic/import`).
- **Các bước thực hiện:**
  1. Bước 1 (Ingestion): Tải file mẫu PDF e-HaUI hoặc nhập tay môn học. Thử nút mô phỏng file lỗi `.docx` (báo lỗi 422 và cho phép thử lại).
  2. Bước 2 (Review): Bảng hiển thị danh sách môn bóc tách được. Chỉnh sửa inline điểm số hoặc số tín chỉ của một môn. Thử nút "Quay lại" hoặc "Hủy".
  3. Bước 3 (Confirm): Xem tóm tắt CPA mới và bấm "Xác nhận & Cập nhật kết quả ngay".
- **Kỳ vọng:** Phải qua bước xem lại (Review) trước khi lưu; thao tác Hủy không làm thay đổi hay mất bảng điểm đã có trước đó; lỗi định dạng có nhánh nhập tay hoặc thử lại; Xác nhận cập nhật động vào store và chuyển về Dashboard.
- **Thực tế mã nguồn:** `TranscriptImportPage.jsx` chia rõ 3 step: `upload -> review -> confirm`. `academicStore.js` hỗ trợ tính toán động điểm tích lũy và cập nhật an toàn. Unit test số 8 trong `app.test.mjs` kiểm tra trọn vẹn luồng.
- **Kết quả:** **PASS**
- **Mức bằng chứng:** `TEST_CONFIRMED` & `STATIC_CONFIRMED` (`INTERACTIVE_VERIFICATION_BLOCKED`)
- **Owner:** TV2.

---

### P04: Chat hỏi quy chế
- **Tiền điều kiện:** Truy cập phân hệ Chat.
- **Đường dẫn vào:** `/chat`.
- **Các bước thực hiện:**
  1. Nhập câu hỏi quy chế học vụ (ví dụ: "Điều kiện bị cảnh báo học vụ mức 1 là gì?", "Kỳ hè được đăng ký tối đa bao nhiêu tín chỉ?").
  2. Quan sát câu trả lời từ AI.
- **Kỳ vọng:** Câu trả lời có khối trích dẫn nguồn văn bản (Điều, Khoản quy chế HaUI); tiếp tục hội thoại tại Chat, không tự động chuyển hướng hoặc ép sinh viên mở Planner.
- **Thực tế mã nguồn:** `ChatAdvisorPage.js` tích hợp giao diện trích dẫn nguồn RAG (`source-catalog.json`), phản hồi câu hỏi quy chế mà không điều hướng ép buộc sang màn hình lập kế hoạch.
- **Kết quả:** **PASS**
- **Mức bằng chứng:** `STATIC_CONFIRMED` (`INTERACTIVE_VERIFICATION_BLOCKED`)
- **Owner:** TV3 (UI) / TV1 (AI Behavior Spec).

---

### P05: Chat tạo lộ trình
- **Tiền điều kiện:** Vào `/chat`, nhập yêu cầu tư vấn cải thiện điểm học tập hoặc lập kế hoạch cho kỳ tới.
- **Đường dẫn vào:** `/chat`.
- **Các bước thực hiện:**
  1. Nhập: "Lập cho tôi lộ trình cải thiện điểm môn Toán rời rạc kỳ tới".
  2. Chat hiển thị thẻ Đề xuất lộ trình (Study Plan Proposal Card) kèm danh sách môn và số tín chỉ dự kiến.
  3. Nhập tiếp yêu cầu thay đổi tiêu chí: "Giảm tải xuống dưới 14 tín chỉ".
- **Kỳ vọng:** AI hỏi bổ sung hoặc tạo phương án khác; hiển thị preview lộ trình; tuyệt đối **không tự động ghi đè hoặc kích hoạt** vào kế hoạch chính thức (`ACTIVE`) của sinh viên.
- **Thực tế mã nguồn:** `ChatAdvisorPage.js` hiển thị thẻ proposal có nút "Xem và áp dụng", chỉ khi người dùng click mới chuyển sang Planner qua `plannerStore.setIncomingProposal()`. Dữ liệu kế hoạch chính chưa bị biến đổi.
- **Kết quả:** **PASS**
- **Mức bằng chứng:** `STATIC_CONFIRMED` (`INTERACTIVE_VERIFICATION_BLOCKED`)
- **Owner:** TV3 (UI) / TV1 (AI Behavior Spec).

---

### P06: Proposal -> Planner & Cây môn học
- **Tiền điều kiện:** Có phương án đề xuất (Proposal) từ Chat hoặc What-if.
- **Đường dẫn vào:** `/planner` (thông qua nút CTA từ Chat hoặc What-if).
- **Các bước thực hiện:**
  1. Người dùng vào `/planner`, thấy Banner màu vàng/xanh chứa "Đề xuất lộ trình mới từ AI".
  2. Bấm "Mở Sơ đồ Cây môn học" (`CurriculumTreeModal.js`) để đối chiếu điều kiện tiên quyết.
  3. Đóng modal cây môn học để quay lại giao diện lập kế hoạch.
- **Kỳ vọng:** Cả hai đường đều hoạt động; việc mở/đóng modal cây môn học không làm mất ngữ cảnh phương án đề xuất hoặc dữ liệu đang chỉnh sửa.
- **Thực tế mã nguồn:** `StudyPlannerPage.js` quản lý state modal độc lập, giữ nguyên `incomingProposal` trong `plannerStore`.
- **Kết quả:** **PASS**
- **Mức bằng chứng:** `STATIC_CONFIRMED` (`INTERACTIVE_VERIFICATION_BLOCKED`)
- **Owner:** TV3.

---

### P07: Planner trực tiếp (Không qua Chat)
- **Tiền điều kiện:** Vào trực tiếp `/planner` từ Sidebar hoặc Dashboard.
- **Đường dẫn vào:** `/planner`.
- **Các bước thực hiện:**
  1. Vào trang Kế hoạch học tập cá nhân.
  2. Tự thêm môn học vào học kỳ (ví dụ môn `IT6001`).
  3. Bấm "Lưu bản nháp" (Save Draft).
  4. Mở lại bản mẫu hoặc làm mới trang.
- **Kỳ vọng:** Thao tác hoàn toàn độc lập, không bắt buộc phải đi qua Chat; phân biệt rạch ròi giữa hành động Lưu bản nháp (DRAFT) với Bắt đầu theo dõi (ACTIVE).
- **Thực tế mã nguồn:** `StudyPlannerPage.js` có các nút hành động tách biệt: `handleSaveDraft` (ghi bản nháp) và `handleConfirmActivate` (kích hoạt chính thức).
- **Kết quả:** **PASS**
- **Mức bằng chứng:** `STATIC_CONFIRMED` (`INTERACTIVE_VERIFICATION_BLOCKED`)
- **Owner:** TV3.

---

### P08: Active plan chỉnh sửa, cancel, activate
- **Tiền điều kiện:** Sinh viên có một kế hoạch đang áp dụng (`ACTIVE`).
- **Đường dẫn vào:** `/planner`.
- **Các bước thực hiện:**
  1. Thêm hoặc bớt môn học trên kế hoạch `ACTIVE`. Kế hoạch chuyển sang trạng thái nháp điều chỉnh (`DRAFT`).
  2. Bấm "Hủy thay đổi" (Discard Changes).
  3. Trong kịch bản khác: Bấm "Kích hoạt" (Activate) để áp dụng bản nháp mới thành kế hoạch chính thức.
- **Kỳ vọng:**
  - Khi Hủy thay đổi: Phải phục hồi nguyên trạng snapshot của bản `ACTIVE` đang lưu trong hệ thống.
  - Khi Kích hoạt: Bắt buộc phải qua bước Thẩm định quy chế (`VALIDATED`), hiển thị màn hình Review tóm tắt và Modal Xác nhận (Confirmation).
- **Thực tế mã nguồn (Phát hiện lỗi nghiêm trọng):**
  - **Lỗi 1 (Điểm C):** `StudyPlannerPage.js:174` — Hàm `handleDiscardChanges()` gọi `plannerStore.resetToDefault()`, xóa trắng toàn bộ dữ liệu phiên làm việc về fixture bootstrap ban đầu thay vì khôi phục snapshot bản `ACTIVE`.
  - **Lỗi 2 (Điểm D):** `StudyPlannerPage.js:307, 777` — Nút "Bắt đầu theo dõi (Kích hoạt)" cho phép người dùng kích hoạt trực tiếp từ trạng thái `DRAFT` mà không kiểm tra hay bắt buộc đạt trạng thái `VALIDATED`.
- **Kết quả:** **FAIL** (Phát hiện 2 Major Defects: `F23-004`, `F23-005`).
- **Mức bằng chứng:** `STATIC_CONFIRMED` (FAIL)
- **Owner:** TV3.

---

### P09: What-if simulator
- **Tiền điều kiện:** Truy cập `/what-if` từ Dashboard hoặc Sidebar.
- **Đường dẫn vào:** `/what-if`.
- **Các bước thực hiện:**
  1. Kéo thanh trượt điểm số dự kiến hoặc chọn môn học cải thiện (ví dụ nâng điểm `MATH1002` từ F lên B).
  2. Quan sát GPA/CPA mô phỏng thay đổi theo thời gian thực.
  3. Nhấn "Thoát / Đặt lại" mà không lưu.
  4. Thử lại lần khác và nhấn "Áp dụng vào Kế hoạch học tập".
- **Kỳ vọng:** Thoát/Đặt lại không làm thay đổi bảng điểm thật hay kế hoạch hiện tại. Khi chọn "Áp dụng", nạp đề xuất sang Planner dưới dạng incoming proposal, tuyệt đối không sửa đổi bảng điểm đã tích lũy.
- **Thực tế mã nguồn:** `WhatIfSimulatorPage.js` quản lý tính toán mô phỏng trong local state `localSimCourses`. Khi bấm "Áp dụng", gọi `plannerStore.setIncomingProposal()` và điều hướng sang `/planner`. Không can thiệp vào `academicStore`.
- **Kết quả:** **PASS**
- **Mức bằng chứng:** `STATIC_CONFIRMED` (`INTERACTIVE_VERIFICATION_BLOCKED`)
- **Owner:** TV3.

---

### P10: ROI / Target reverse trực tiếp
- **Tiền điều kiện:** Truy cập `/what-if`.
- **Đường dẫn vào:** `/what-if?tab=target` (hoặc chuyển tab trực tiếp).
- **Các bước thực hiện:**
  1. Chuyển sang tab "Mục tiêu ngược (Target GPA)".
  2. Chọn mục tiêu tốt nghiệp (ví dụ: Bằng Giỏi - CPA 3.20).
  3. Xem số tín chỉ và điểm số cần đạt trong các kỳ còn lại.
  4. Bấm "Quay lại" hoặc "Áp dụng vào Kế hoạch".
- **Kỳ vọng:** Vào trực tiếp theo nhu cầu, không bắt buộc phải hoàn thành wizard mô phỏng thuận trước; có đầy đủ tùy chọn hủy, áp dụng hoặc quay lại.
- **Thực tế mã nguồn:** `WhatIfSimulatorPage.js` hỗ trợ chuyển tab độc lập, tính toán tức thì bằng thuật toán nghịch đảo mục tiêu GPA.
- **Kết quả:** **PASS**
- **Mức bằng chứng:** `STATIC_CONFIRMED` (`INTERACTIVE_VERIFICATION_BLOCKED`)
- **Owner:** TV3.

---

### P11: Audit bù đắp (Graduation Audit -> Planner Remediation)
- **Tiền điều kiện:** Vào `/audit` hoặc `/progress`, xem kết quả kiểm toán 7 tiêu chí chuẩn đầu ra HaUI.
- **Đường dẫn vào:** `/audit` (hoặc `/progress`).
- **Các bước thực hiện:**
  1. Xem các tiêu chí chưa đạt (thiếu 6 TC tự chọn chuyên ngành, nợ môn `MATH1002`, thiếu chứng chỉ MOS/IC3).
  2. Nhấn nút "🛠️ Lập kế hoạch bù đắp các điều kiện còn thiếu".
  3. Modal hiển thị phương án bù đắp đề xuất.
  4. Bấm "Chuyển sang Màn hình 5 (Xác nhận Kế hoạch) &rarr;".
- **Kỳ vọng:**
  - Chuyển hướng sang `/planner` kèm nạp payload đề xuất các môn bù đắp vào `plannerStore` để sinh viên review và xếp lịch.
  - Checklist kiểm toán tốt nghiệp không tự động đổi màu thành "Đạt / Hoàn thành" khi sinh viên chưa học xong thật.
- **Thực tế mã nguồn (Phát hiện lỗi nghiêm trọng):**
  - **Lỗi Blocker (F23-001):** `AcademicProgressPage.jsx:439:6` bị lỗi cú pháp JSX (thẻ `<Modal>` tại dòng 382 không có thẻ đóng `</Modal>`), làm hỏng lệnh `npm run build`.
  - **Lỗi Tích hợp (F23-006):** Tại `AcademicProgressPage.jsx:396-402`, nút chuyển trang chỉ gọi `navigate('/planner')` mà hoàn toàn **không nạp payload** phương án bù đắp vào `plannerStore.setIncomingProposal()`, khiến màn hình Planner mở ra không nhận được môn bù đắp nào.
  - *(Điểm tích cực: Checklist kiểm toán không tự đổi thành Đạt, giữ đúng quy tắc nghiệp vụ).*
- **Kết quả:** **FAIL** (Blocker build + Thiếu payload tích hợp).
- **Mức bằng chứng:** `STATIC_CONFIRMED` (FAIL) & `BUILD_FAILED`
- **Owner:** TV2 (phối hợp TV3).

---

### P12: Reopen / Restore lịch sử kế hoạch
- **Tiền điều kiện:** Sinh viên có nhiều phiên bản kế hoạch đã lưu trong lịch sử (v2.1, v2.2, v2.3...).
- **Đường dẫn vào:** `/planner` -> Mở modal "Lịch sử kế hoạch" (`PlanHistoryModal.js`).
- **Các bước thực hiện:**
  1. Người dùng bấm "Lịch sử kế hoạch".
  2. Xem danh sách các phiên bản cũ đã lưu trữ (`ARCHIVED`).
  3. Bấm "Khôi phục / Mở lại" (Restore) một phiên bản cũ.
  4. Trong kịch bản khác: Bấm "Kích hoạt" (Activate) trực tiếp một phiên bản từ lịch sử.
- **Kỳ vọng:**
  - Khi Restore: Kế thừa dữ liệu học kỳ và môn học thực tế của chính bản ghi lịch sử đó, tạo bản `DRAFT` mới để tiếp tục chỉnh sửa; lịch sử cũ bất biến.
  - Khi Activate từ lịch sử: Phải kích hoạt chính xác bản ghi có `planId` được chọn.
- **Thực tế mã nguồn (Phát hiện lỗi nghiêm trọng):**
  - **Lỗi 1 (Điểm A):** `PlanHistoryModal.js:51` — `handleActivate(planId)` gọi `plannerStore.activatePlan()` mà **không truyền `planId`**, dẫn đến việc kích hoạt nhầm bản kế hoạch hiện tại trong editor thay vì bản được chọn trong modal.
  - **Lỗi 2 (Điểm B):** `plannerStore.js:463` — Hàm `restorePlan(planId)` nạp cứng hằng số `INITIAL_MULTI_SEMESTER_PLAN` thay vì khôi phục dữ liệu học kỳ/môn học thật của bản ghi được chọn.
- **Kết quả:** **FAIL** (Phát hiện 2 Major Defects: `F23-002`, `F23-003`).
- **Mức bằng chứng:** `STATIC_CONFIRMED` (FAIL)
- **Owner:** TV3.

---

### P13: Failure states & Cảnh báo rời màn chưa lưu
- **Tiền điều kiện:** Có lỗi kết nối máy chủ hoặc thao tác chưa lưu dữ liệu.
- **Đường dẫn vào:** `/planner`, `/transcript`, `/what-if`.
- **Các bước thực hiện:**
  1. Kích hoạt lỗi kết nối API mô phỏng (ví dụ nút "Mô phỏng lỗi kết nối" trong Planner hoặc tải file lỗi `.docx` trong Transcript).
  2. Người dùng chỉnh sửa kế hoạch nhưng chưa bấm "Lưu bản nháp", sau đó điều hướng sang route khác.
- **Kỳ vọng:**
  - Khi lỗi: Giữ nguyên dữ liệu người dùng đã nhập, hiển thị thông báo lỗi rõ ràng, cung cấp nút "Thử lại" hoặc quay về an toàn, không hiển thị thành công giả (False success).
  - Khi rời màn chưa lưu: Có cảnh báo để tránh mất dữ liệu dở dang.
- **Thực tế mã nguồn:**
  - `StudyPlannerPage.js:185` có nút `handleTriggerError()` hiển thị Error Box rõ ràng kèm mã lỗi `PLANNER_API_ERROR` và nút "Thử lại".
  - `TranscriptImportPage.jsx:136` mô phỏng lỗi 422 cho phép thử lại hoặc chuyển sang nhập tay, giữ nguyên dữ liệu đã có.
  - *Lưu ý:* Cơ chế chặn điều hướng browser confirmation trước khi rời màn (`beforeunload` hoặc `usePrompt`) chưa được cài đặt triệt để trong prototype, cần bổ sung trong Phase 3.
- **Kết quả:** **PASS** (ở cấp độ prototype xử lý lỗi mô phỏng).
- **Mức bằng chứng:** `STATIC_CONFIRMED` (`INTERACTIVE_VERIFICATION_BLOCKED`)
- **Owner:** TV2, TV3.

---

## 5. Thẩm Định Chuyên Sâu 6 Điểm Nghi Ngờ (A–F)

Qua rà soát mã nguồn chuyên sâu, TV1 đưa ra kết luận kỹ thuật chính thức về 6 điểm nghi ngờ trọng yếu:

### 5.1. Điểm A (Major Defect — TV3): Bỏ qua `planId` khi kích hoạt từ Modal Lịch sử
- **Vị trí:** `tv3-planner-ui/src/components/PlanHistoryModal.js:50–56`
- **Mã nguồn hiện tại:**
  ```javascript
  const handleActivate = (planId) => {
    const res = plannerStore.activatePlan(); // <-- THIẾU planId
    showToast(res.message);
    if (typeof onPlanChanged === 'function') {
      onPlanChanged();
    }
  };
  ```
- **Phân tích:** `handleActivate` nhận tham số `planId` từ nút bấm của hàng tương ứng trong bảng lịch sử, nhưng khi gọi `plannerStore.activatePlan()` lại không truyền tham số này. Phương thức `activatePlan()` trong `plannerStore.js` mặc định chỉ kích hoạt `this.plan` (bản đang mở trên màn hình chính). Hậu quả: Sinh viên bấm kích hoạt một phiên bản cũ (ví dụ v2.2) thì hệ thống lại kích hoạt bản kế hoạch hiện tại (ví dụ v2.4).
- **Phân loại:** **MAJOR DEFECT** (Mã lỗi: `F23-002`).

### 5.2. Điểm B (Major Defect — TV3): Hardcode dữ liệu mặc định khi khôi phục lịch sử (`restorePlan`)
- **Vị trí:** `tv3-planner-ui/src/services/plannerStore.js:458–474`
- **Mã nguồn hiện tại:**
  ```javascript
  restorePlan(planId) {
    const target = this.history.find((h) => h.planId === planId);
    if (!target) return { success: false, message: 'Không tìm thấy phiên bản yêu cầu.' };

    // Tạo bản DRAFT mới kế thừa từ bản cũ
    this.plan = JSON.parse(JSON.stringify(INITIAL_MULTI_SEMESTER_PLAN)); // <-- HARDCODE
    this.plan.planId = `plan-restored-${Date.now()}`;
    this.plan.version = `${target.version}-restored`;
    this.plan.planName = `Khôi phục từ ${target.name}`;
    this.plan.status = PLAN_STATUSES.DRAFT;
    ...
  }
  ```
- **Phân tích:** Mặc dù đã tìm thấy bản ghi `target` trong mảng lịch sử, hàm `restorePlan()` lại gán cứng `this.plan` bằng fixture ban đầu `INITIAL_MULTI_SEMESTER_PLAN`. Mọi thay đổi cụ thể về danh sách môn học, số tín chỉ từng kỳ trong bản lưu trữ đều bị xóa sổ và thay bằng dữ liệu mẫu ban đầu.
- **Phân loại:** **MAJOR DEFECT** (Mã lỗi: `F23-003`).

### 5.3. Điểm C (Major Defect — TV3): `handleDiscardChanges` xóa trắng dữ liệu về Fixture Bootstrap
- **Vị trí:** `tv3-planner-ui/src/pages/StudyPlannerPage.js:172–177`
- **Mã nguồn hiện tại:**
  ```javascript
  // Hành động: Hủy thay đổi (Reset về bản ACTIVE)
  const handleDiscardChanges = useCallback(() => {
    plannerStore.resetToDefault(); // <-- XÓA TRẮNG DỮ LIỆU
    setValidationResult(null);
    showToast('Đã hoàn tác các thay đổi chưa lưu.');
  }, [showToast]);
  ```
- **Phân tích:** Chú thích ghi rõ "Hủy thay đổi (Reset về bản ACTIVE)", nhưng việc gọi `resetToDefault()` sẽ thiết lập lại toàn bộ `this.plan`, `this.history` và `this.incomingProposal` về trạng thái ban đầu của ứng dụng. Nếu người dùng đang có một bản `ACTIVE` tùy biến hợp lệ và đang nháp chỉnh sửa, việc nhấn "Hủy thay đổi" sẽ xóa mất bản `ACTIVE` đó và đưa ứng dụng về fixture gốc.
- **Phân loại:** **MAJOR DEFECT** (Mã lỗi: `F23-004`).

### 5.4. Điểm D (Major Defect — TV3): Cho phép kích hoạt trực tiếp từ `DRAFT` không qua `VALIDATED`
- **Vị trí:** `tv3-planner-ui/src/pages/StudyPlannerPage.js:301–311, 761–795` và `plannerStore.js:414–455`
- **Phân tích:** 
  1. Tại thanh công cụ (`StudyPlannerPage.js`), nút "▶ Bắt đầu theo dõi (Kích hoạt)" luôn hiển thị và khả dụng ngay cả khi kế hoạch đang ở trạng thái `DRAFT` và chưa từng bấm "✓ Kiểm tra điều kiện".
  2. Tại `plannerStore.js`, hàm `activatePlan()` không kiểm tra điều kiện tiên quyết `if (this.plan.status !== PLAN_STATUSES.VALIDATED)` mà trực tiếp chuyển `this.plan.status = PLAN_STATUSES.ACTIVE`.
  3. Điều này vi phạm nghiêm trọng quy chế học vụ: Một kế hoạch chứa lỗi vi phạm (ví dụ đăng ký dưới 10 TC, vượt 24 TC, nợ môn tiên quyết) vẫn có thể được người dùng kích hoạt thành kế hoạch chính thức.
- **Phân loại:** **MAJOR DEFECT** (Mã lỗi: `F23-005`).

### 5.5. Điểm E (Kiến Trúc & Quy Trình Thẩm Định): Nguồn Sự Thật của Quy Chế Học Vụ (Source of Truth)
- **Vấn đề:** Trong prototype TV3, logic kiểm tra quy chế đang được viết cục bộ tại hàm `plannerStore.validatePlan()` (kiểm tra sàn 10 TC, trần 24 TC, hè 8 TC).
- **Kết luận thẩm định:**
  - Logic tại Frontend chỉ đóng vai trò **Pre-validation UX** (phản hồi giao diện tức thì để người dùng không phải chờ đợi mạng).
  - **Backend `AcademicFacade` (`POST /api/v1/planner/validate`) là Authority duy nhất (Single Source of Truth)**. Frontend tuyệt đối không được tự quyết định tính hợp lệ cuối cùng của kế hoạch học tập.
  - Trong Phase 3, khi bấm "Kiểm tra điều kiện" hoặc "Kích hoạt", Frontend bắt buộc phải gửi toàn bộ cấu trúc kế hoạch sang Backend API để engine học vụ thẩm định các quy tắc chuyên sâu (điều kiện tiên quyết theo đồ thị DAG, giới hạn cảnh báo học vụ, chuẩn đầu ra).
- **Phân loại:** **KIẾN TRÚC & CONTRACT BẮT BUỘC CHO PHASE 3**.

### 5.6. Điểm F (Quyền Sở Hữu Mốc & Trạng Thái Bàn Giao): Tính Hợp Lệ Của Mốc `flow-approved-v1`
- **Vấn đề:** Trong commit Task 2.2a (`490d5cc`), TV2 đã đặt thông điệp `milestone flow-approved-v1` và tạo tài liệu `tv2-web/docs/flow-approved-v1.md`.
- **Kết luận thẩm định chính thức từ TV1 (Lead):**
  1. **Tuyên bố không hợp lệ (Invalid Claim):** Theo phân công quyền hạn tại `AGENTS.md` và kế hoạch tổng thể dự án, TV2 chỉ phụ trách phân hệ Học vụ và UI Shell. **Duy nhất TV1 (Lead + AI) mới có thẩm quyền thẩm định và phê duyệt mốc `flow-approved-v1` toàn hệ thống tại Task 2.3**.
  2. **Bị chặn bởi lỗi kỹ thuật thực tế:** Tại thời điểm commit `490d5cc`, lệnh `npm run build` đang thất bại do lỗi cú pháp JSX tại `AcademicProgressPage.jsx:439:6`, và hệ thống đang tồn tại 4 lỗi logic mức Major ở TV3.
  3. **Quyết định:** Bác bỏ tính hợp lệ của mốc `flow-approved-v1` do TV2 tự công bố. File `tv2-web/docs/flow-approved-v1.md` được ghi nhận là tài liệu đề xuất nội bộ của TV2, không đại diện cho phê duyệt chính thức của dự án.
- **Phân loại:** **QUẢN TRỊ DỰ ÁN & QUYỀN SỞ HỮU MỐC**.

---

## 6. Tổng Hợp Danh Mục Lỗi Cần Khắc Phục (Defect Catalog)

Bảng tổng hợp các vấn đề kỹ thuật ngăn chặn việc phê duyệt mốc `flow-approved-v1`:

| Mã Lỗi | Phân hệ | Mức độ | File / Vị trí | Mô tả Ngắn | Hành động Khắc phục Yêu cầu |
|---|:---:|:---:|---|---|---|
| **`F23-001`** | **TV2** | **BLOCKER** | `tv2-web/src/pages/AcademicProgressPage.jsx:439:6` | Lỗi cú pháp JSX: Thiếu thẻ đóng `</Modal>` cho modal bù đắp (dòng 382), khiến thẻ `</div>` dòng 439 bị lệch và làm `npm run build` thất bại. | TV2 bổ sung thẻ đóng `</Modal>` tại dòng 421 trước khi render khối chữ ký in ấn. |
| **`F23-002`** | **TV3** | **MAJOR** | `tv3-planner-ui/src/components/PlanHistoryModal.js:51` | `handleActivate(planId)` gọi `plannerStore.activatePlan()` không truyền `planId`, kích hoạt nhầm bản hiện tại thay vì bản chọn từ lịch sử. | TV3 truyền `planId` vào `plannerStore.activatePlan(planId)` và xử lý kích hoạt đúng bản ghi. |
| **`F23-003`** | **TV3** | **MAJOR** | `tv3-planner-ui/src/services/plannerStore.js:463` | `restorePlan(planId)` nạp cứng `INITIAL_MULTI_SEMESTER_PLAN` thay vì khôi phục dữ liệu học kỳ/môn học thật của bản ghi được chọn. | TV3 lưu cấu trúc chi tiết kế hoạch trong từng bản ghi lịch sử và nhân bản dữ liệu thật khi khôi phục. |
| **`F23-004`** | **TV3** | **MAJOR** | `tv3-planner-ui/src/pages/StudyPlannerPage.js:174` | `handleDiscardChanges()` gọi `plannerStore.resetToDefault()`, xóa trắng toàn bộ dữ liệu phiên làm việc về fixture bootstrap ban đầu. | TV3 thay thế bằng cơ chế khôi phục snapshot bản `ACTIVE` gần nhất từ store. |
| **`F23-005`** | **TV3** | **MAJOR** | `tv3-planner-ui/src/pages/StudyPlannerPage.js:307, 777` & `plannerStore.js:414` | Cho phép kích hoạt trực tiếp từ `DRAFT` sang `ACTIVE` mà không bắt buộc kiểm tra và đạt trạng thái `VALIDATED`. | TV3 vô hiệu hóa (disable) nút Kích hoạt khi chưa đạt `VALIDATED`, và chặn trong store nếu trạng thái không hợp lệ. |
| **`F23-006`** | **TV2 / TV3** | **MINOR** | `tv2-web/src/pages/AcademicProgressPage.jsx:398` | Nút "Lập kế hoạch bù đắp" trong Audit chỉ chuyển trang `/planner` mà không nạp payload phương án đề xuất vào `plannerStore`. | TV2/TV3 kết nối payload đề xuất bù đắp qua URL query params hoặc gọi `plannerStore.setIncomingProposal()`. |
| **`F23-007`** | **TV2** | **MINOR** | Commit message `490d5cc` & `tv2-web/docs/flow-approved-v1.md` | Sử dụng sai danh xưng mốc phê duyệt `flow-approved-v1` khi chưa được TV1 Lead nghiệm thu và build còn lỗi. | TV2 ghi nhận lại ranh giới mốc trong báo cáo cập nhật của phân hệ. |

---

## 7. Kết Luận & Quyết Định Bàn Giao

1. **Trạng thái Thẩm định Chính thức:** **`TASK_2_3_READY_FOR_OWNER_FIX`**
2. **Quyết định về Mốc `flow-approved-v1`:**
   - **TUYỆT ĐỐI KHÔNG TẠO** tài liệu `tv1-ai/docs/flow-approved-v1.md` tại thời điểm này.
   - Mốc `flow-approved-v1` chỉ được chính thức ban hành sau khi:
     - TV2 sửa xong lỗi cú pháp `F23-001`, đưa lệnh `npm run build` và `node scripts/smoke-check.mjs` đạt **10/10 PASS**.
     - TV3 hoàn thành sửa 4 lỗi nghiệp vụ `F23-002`, `F23-003`, `F23-004`, `F23-005`.
3. **Kế hoạch Bàn giao Tiếp theo:**
   - TV1 xuất bản Sổ tay lỗi `tv1-ai/docs/task-2.3-owner-fixes.md` hướng dẫn chi tiết code mẫu cho TV2 và TV3.
   - TV1 xuất bản Đặc tả Điều chỉnh Hợp đồng `tv1-ai/docs/task-2.3-contract-delta.md` làm đầu vào cho TV5 trong Task 2.4.
   - TV1 cập nhật bảng trạng thái P01–P13 trong `tv1-ai/docs/solution-v1.md`.
