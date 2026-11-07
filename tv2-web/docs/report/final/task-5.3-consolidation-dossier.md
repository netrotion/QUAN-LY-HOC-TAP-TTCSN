# HỒ SƠ RÀ SOÁT KỸ THUẬT, BẢNG PHÂN CÔNG ĐÓNG GÓP & TRA CỨU HỢP NHẤT HỆ THỐNG
## HaUI Academic Advisor — Milestone Task 5.3 (`consolidation-dossier`)

- **Dự án:** HaUI Academic Advisor (`QUAN-LY-HOC-TAP-TTCSN`)
- **Mã nhiệm vụ:** Task 5.3 — TV2 FE nền tảng/học vụ: Hợp nhất quyển báo cáo & Rà soát kỹ thuật (Phase 5: Triển khai & Nghiệm thu)
- **Thành viên chịu trách nhiệm:** TV2 — Frontend Platform & Academic Engineer
- **Thư mục phân quyền:** `tv2-web/docs/report/final/`
- **Tiền đề phụ thuộc:** Task 5.2a, Task 5.2b, Task 5.2c, Task 5.2d đã hoàn thành
- **Tình trạng:** **COMPLETED**
- **Căn cứ kỹ thuật:** PRD §3–10, `HaUI_Advisor_Solution_va_Prompt_theo_Phase.md` (dòng 578–588), Open Contract 1.5.0, AGENTS.md.

---

> [!NOTE]
> **Mục đích tài liệu:** Tài liệu này đóng vai trò là **Hồ sơ Rà soát Kỹ thuật và Bảng Phân Công Hợp Nhất (Consolidation Dossier & Technical Companion)**, cung cấp đầy đủ số liệu đo kiểm thực tế, ma trận đóng góp của 5 thành viên (TV1..TV5), bảng chuẩn hóa thuật ngữ học vụ HaUI, đối chiếu phiên bản hợp đồng và ma trận kiểm thử tự động phục vụ trực tiếp cho việc hoàn thiện Quyển báo cáo tổng kết bài tập lớn.

---

## 1. MA TRẬN PHÂN CÔNG NHIỆM VỤ & ĐÓNG GÓP THÀNH VIÊN (TV1 – TV5)

Căn cứ theo bản phân công nhiệm vụ gốc (`Phan_cong_HaUI_Advisor(1).xlsx` và `HaUI_Advisor_Solution_va_Prompt_theo_Phase.md`), 5 thành viên đảm nhiệm các vai trò chuyên trách với ranh giới sở hữu thư mục nghiêm ngặt:

| Thành viên | Vai trò chuyên môn | Thư mục sở hữu | Nhiệm vụ chính xuyên suốt Phase 1 &rarr; Phase 5 | Sản phẩm bàn giao cốt lõi |
| :---: | :--- | :---: | :--- | :--- |
| **TV1** | **Lead & AI Engineer** | `tv1-ai/` | - Trưởng nhóm điều phối kiến trúc toàn dự án.<br>- Thiết kế & hiện thực dây chuyền RAG trích xuất văn bản quy chế HaUI.<br>- Xây dựng Vector Store (InMemory & PgVector) và bộ chuẩn hóa truy vấn tiếng Việt.<br>- Xây dựng bộ điều phối công cụ học vụ `DefaultToolAdapter` kết nối TV4/TV5.<br>- Xây dựng bộ kiểm định căn cứ trích dẫn `ResponseGroundingValidator`.<br>- Nghiệm thu tích hợp phiên bản (Task 4.5) & chốt bàn giao commit (Task 5.4). | - Thư viện `tv1-ai` (Java library).<br>- Tài liệu kiến trúc AI: [`task-5.2d-ai-report.md`](file:///C:/Users/ADMIN/QUAN-LY-HOC-TAP-TTCSN/tv1-ai/docs/task-5.2d-ai-report.md).<br>- Kịch bản trình diễn: [`task-5.2d-demo-script.md`](file:///C:/Users/ADMIN/QUAN-LY-HOC-TAP-TTCSN/tv1-ai/docs/task-5.2d-demo-script.md).<br>- Đánh giá live RAG: `task-5.2d-evaluation-status.md`. |
| **TV2** | **Frontend Platform & Academic Core** | `tv2-web/` | - Phát triển Web App Shell, Design System đơn sắc *Clinical Blueprint*.<br>- Hiện thực kho trạng thái học vụ `academicStore` và singleton `apiClient`.<br>- Xây dựng trang Tổng quan học vụ (`/dashboard`) với biểu đồ CPA tích lũy.<br>- Xây dựng dây chuyền nhập & bóc tách bảng điểm 3 bước (`/transcript`).<br>- Xây dựng Sơ đồ Cây môn học 4 màu, truy vết tiên quyết & cuộn dọc (`/curriculum`).<br>- Xây dựng Phân hệ Kiểm toán tốt nghiệp 100% CĐR & xuất bản in A4 (`/audit`).<br>- Hợp nhất rà soát kỹ thuật Task 5.3. | - Ứng dụng web React `tv2-web`.<br>- Bộ smoke test suite: [`task-5.2a-smoke.test.mjs`](file:///C:/Users/ADMIN/QUAN-LY-HOC-TAP-TTCSN/tv2-web/test/task-5.2a-smoke.test.mjs).<br>- Báo cáo kỹ thuật FE học vụ: [`task-5.2a-academic-fe-report.md`](file:///C:/Users/ADMIN/QUAN-LY-HOC-TAP-TTCSN/tv2-web/docs/report/task-5.2a-academic-fe-report.md).<br>- Hướng dẫn sử dụng: [`task-5.2a-user-guide.md`](file:///C:/Users/ADMIN/QUAN-LY-HOC-TAP-TTCSN/tv2-web/docs/report/task-5.2a-user-guide.md).<br>- Hồ sơ hợp nhất: [`task-5.3-consolidation-dossier.md`](file:///C:/Users/ADMIN/QUAN-LY-HOC-TAP-TTCSN/tv2-web/docs/report/final/task-5.3-consolidation-dossier.md). |
| **TV3** | **Planner & Advisor UI Engineer** | `tv3-planner-ui/` | - Phát triển phân hệ Kế hoạch học tập đa kỳ (`/planner`).<br>- Xây dựng thao tác Thêm/Bớt/Chuyển môn giữa các kỳ và cảnh báo quy chế HaUI.<br>- Quản lý vòng đời kế hoạch: `DRAFT` &rarr; `ACTIVE` &rarr; `ARCHIVED`.<br>- Xây dựng giao diện Chatbot cố vấn AI đa lượt (`/advisor`) kèm citation & proposal card.<br>- Phát triển công cụ mô phỏng What-if & ROI điểm số học phần (`/what-if`).<br>- Xây dựng trang Hồ sơ sinh viên & mục tiêu học tập (`/profile`).<br>- Tiếp nhận đề xuất bù đắp Audit F23-006 qua `plannerStore`. | - Module micro-frontend `tv3-planner-ui`.<br>- Bộ kiểm thử TV3: 41 unit/integration tests.<br>- Báo cáo nghiệm thu TV3: [`BAO_CAO_SMOKE_TEST_TV3.md`](file:///C:/Users/ADMIN/QUAN-LY-HOC-TAP-TTCSN/tv3-planner-ui/docs/smoke-report/BAO_CAO_SMOKE_TEST_TV3.md).<br>- Hướng dẫn vận hành: [`HUONG_DAN_LUU_HUY_MO_LAI.md`](file:///C:/Users/ADMIN/QUAN-LY-HOC-TAP-TTCSN/tv3-planner-ui/docs/smoke-report/HUONG_DAN_LUU_HUY_MO_LAI.md). |
| **TV4** | **Academic Core & Rule Engine** | `tv4-academic/` | - Hiện thực động cơ tính toán học vụ có thẩm quyền (`AcademicRuleEngine`).<br>- Tính toán chính xác số học: CPA, GPA học kỳ, tín chỉ tích lũy theo thang điểm HaUI.<br>- Duyệt đồ thị có hướng kiểm tra điều kiện tiên quyết (Prerequisite DAG Traversal).<br>- Hiện thực thuật toán đề xuất học tập đa mục tiêu (Greedy Recommendation).<br>- Xây dựng bộ máy kiểm toán điều kiện tốt nghiệp (Graduation Audit Facade).<br>- Chuẩn hóa các bộ DTO hợp đồng `contracts-v1`. | - Module nghiệp vụ Java `tv4-academic`.<br>- Bộ fixtures học vụ: `academic-fixtures-v0.md`.<br>- Đặc tả nghiệp vụ học thuật: `academic-spec-v1.md`.<br>- Toàn bộ thuật toán tính điểm và đối soát CĐR. |
| **TV5** | **Platform, Database & DevOps** | `tv5-platform/` | - Thiết kế & bảo trì ứng dụng nền tảng Spring Boot 3 (`tv5-platform/app`).<br>- Thiết kế CSDL PostgreSQL 16 và tích hợp phần mở rộng vector `pgvector`.<br>- Quản lý các phiên bản migration Flyway (V1 &rarr; V4).<br>- Hiện thực REST Controllers cho Academic, Advisor, Planner, Auth, Simulation.<br>- Quản lý xác thực phiên cookie an toàn (`JSESSIONID`, `XSRF-TOKEN`).<br>- Cấu hình hạ tầng Docker Compose đa dịch vụ, Nginx reverse proxy.<br>- Triển khai bản ứng viên (Task 5.1) và tạo đường hầm demo chung. | - Nền tảng Spring Boot `tv5-platform`.<br>- Hệ thống migration: V1..V4 SQL scripts.<br>- Cấu hình Docker: `compose.yaml`.<br>- Báo cáo triển khai Task 5.1: [`task-5.1-deploy-report.md`](file:///C:/Users/ADMIN/QUAN-LY-HOC-TAP-TTCSN/tv5-platform/docs/task-5.1-deploy-report.md).<br>- Hạ tầng demo Cloudflare Tunnel. |

---

## 2. RÀ SOÁT & CHUẨN HÓA THUẬT NGỮ HỌC VỤ HAUI (TERMINOLOGY RECONCILIATION)

Nhằm đảm bảo tính thống nhất 100% giữa Đề cương môn học, Cơ sở dữ liệu backend, Hợp đồng OpenAPI, và Giao diện người dùng frontend, các thuật ngữ học vụ cốt lõi đã được rà soát và chuẩn hóa:

### 2.1. Bảng thuật ngữ chỉ số & Thang điểm
| Thuật ngữ viết tắt | Tên đầy đủ tiếng Việt | Tên trường trong API / DB | Định nghĩa & Thang đo tại HaUI | Quy tắc kiểm chứng |
| :--- | :--- | :--- | :--- | :--- |
| **CPA** | Điểm trung bình chung tích lũy | `cpa` / `cumulativeCpa` | Điểm tích lũy toàn khóa tính theo thang điểm 4 (từ $0.00 \rightarrow 4.00$). | Chỉ tính các học phần đạt từ D trở lên. Không tính các môn điều kiện (GDTC, GDQP). Backend TV4 tính toán độc quyền. |
| **GPA** | Điểm trung bình học kỳ | `gpa` / `semesterGpa` | Điểm trung bình của riêng học kỳ đó theo thang 4. | Phản ánh kết quả học tập trong 1 học kỳ cụ thể. |
| **ĐRL** | Điểm rèn luyện | `conductScore` | Điểm đánh giá ý thức rèn luyện của sinh viên theo thang điểm 100. | Điều kiện tốt nghiệp: ĐRL tích lũy toàn khóa $\ge 70$ điểm (Loại Khá trở lên). |
| **CTĐT** | Chương trình đào tạo | `curriculum` / `curriculumId` | Khung chương trình đào tạo của ngành/khóa học (ví dụ: KTPM K17: 135 TC; K19: 150 TC). | Khóa sinh viên được cố định, không được tự ý đổi CTĐT trên giao diện. |
| **CĐR** | Chuẩn đầu ra | `graduationCriteria` / `checklist` | Bộ tiêu chuẩn bắt buộc phải hoàn thành để được xét công nhận tốt nghiệp. | Gồm 7 tiêu chuẩn: Tín chỉ, Môn bắt buộc, Môn tự chọn, Ngoại ngữ, Tin học, GDTC/GDQP, ĐRL. |

### 2.2. Bảng quy đổi Thang điểm HaUI
| Điểm hệ 10 | Điểm chữ (Letter Grade) | Điểm thang 4 (Score 4) | Phân loại trạng thái | Ghi chú học vụ |
| :---: | :---: | :---: | :---: | :--- |
| $8.5 \rightarrow 10.0$ | **A** | $4.0$ | `PASSED` (Đạt) | Xuất sắc |
| $8.0 \rightarrow 8.4$ | **B+** | $3.5$ | `PASSED` (Đạt) | Giỏi |
| $7.0 \rightarrow 7.9$ | **B** | $3.0$ | `PASSED` (Đạt) | Khá |
| $6.5 \rightarrow 6.9$ | **C+** | $2.5$ | `PASSED` (Đạt) | Trung bình khá |
| $5.5 \rightarrow 6.4$ | **C** | $2.0$ | `PASSED` (Đạt) | Trung bình |
| $5.0 \rightarrow 5.4$ | **D+** | $1.5$ | `PASSED_LOW` (Đạt thấp) | Cảnh báo: nguy cơ kéo tụt CPA |
| $4.0 \rightarrow 4.9$ | **D** | $1.0$ | `PASSED_LOW` (Đạt thấp) | Cận dưới để được tính tích lũy tín chỉ |
| Dưới $4.0$ | **F** | $0.0$ | `FAILED` (Không đạt) | **Môn nợ:** Không tích lũy tín chỉ, phải đăng ký học lại |

### 2.3. Bảng trạng thái học phần trên Cây môn học (`CourseProgressStatus`)
| Mã trạng thái (Enum) | Huy hiệu hiển thị (UI Badge) | Màu sắc đại diện | Điều kiện kích hoạt |
| :--- | :--- | :---: | :--- |
| `PASSED` | `✓ Đạt: [Điểm chữ]` | Xanh lá | Đã học và có điểm chữ $\in \{A, B+, B, C+, C, D+, D\}$. |
| `IN_PROGRESS` | `Đang học` | Xanh dương | Đang trong danh sách đăng ký của học kỳ hiện tại (`letterGrade: null`). |
| `ELIGIBLE` | `Đủ điều kiện đăng ký` | Xám trung tính | Chưa học nhưng đã hoàn thành toàn bộ các môn tiên quyết. |
| `BLOCKED` | `Chưa đủ điều kiện (Nợ tiên quyết)` | Vàng cam / Đỏ | Chưa học và đang thiếu ít nhất 1 môn tiên quyết. |
| `FAILED` | `Môn nợ (Điểm F)` | Đỏ đậm | Đã học nhưng bị điểm F, bắt buộc học lại để mở khóa các môn sau. |
| `UNKNOWN` | `Chưa xác định` | Xám nhạt | Tài khoản chưa nạp bảng điểm (`transcriptStatus: 'NONE'`). |

### 2.4. Bảng trạng thái Kế hoạch học tập (`PlanStatus`)
| Mã trạng thái | Huy hiệu UI | Ý nghĩa nghiệp vụ | Quyền hạn sửa đổi |
| :--- | :--- | :--- | :--- |
| `DRAFT` | `Bản nháp` | Phương án đang được biên soạn hoặc mô phỏng, chưa thẩm định quy chế. | Được chỉnh sửa tự do, thêm/bớt/chuyển môn giữa các kỳ. |
| `ACTIVE` | `Đang áp dụng` | Kế hoạch chính thức đã vượt qua kiểm tra ràng buộc của Rule Engine HaUI. | Là kế hoạch duy nhất được dùng để đối soát tiến độ và dự báo tốt nghiệp. |
| `ARCHIVED` | `Đã lưu trữ` | Phiên bản kế hoạch cũ được lưu lại lịch sử khi kích hoạt bản mới. | Chỉ đọc (Read-only), có thể khôi phục lại khi cần. |

### 2.5. Bảng 7 Chuẩn đầu ra Xét Tốt nghiệp HaUI (Graduation Criteria Details)
| STT | Chuẩn đầu ra (CĐR) | Mã tiêu chí (Criteria ID) | Quy chuẩn đối soát tại HaUI | Trạng thái kiểm toán |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Tổng số tín chỉ tích lũy** | `CREDITS_TOTAL` | Tích lũy tối thiểu $\ge 135$ tín chỉ (K17) hoặc $\ge 150$ tín chỉ (K19). | `PASSED` khi đạt đủ số lượng tín chỉ yêu cầu. |
| **2** | **Kiến thức bắt buộc ngành** | `GENERAL_EDUCATION` | Hoàn thành 100% các môn giáo dục đại cương và cơ sở ngành bắt buộc. | Không nợ bất kỳ môn bắt buộc nào. |
| **3** | **Kiến thức tự chọn chuyên ngành** | `ELECTIVE_SPECIALIZED` | Tích lũy đủ số tín chỉ trong tổ hợp tự chọn chuyên ngành (tối thiểu 6–12 TC). | Đủ số tín chỉ theo định hướng chuyên sâu. |
| **4** | **Chuẩn đầu ra Ngoại ngữ** | `FOREIGN_LANGUAGE` | Nộp chứng chỉ tiếng Anh quốc tế TOEIC ($\ge 450$ hoặc $\ge 550$ tùy ngành) hoặc VSTEP B1. | Cần nộp chứng chỉ trước thời điểm xét tốt nghiệp. |
| **5** | **Chuẩn đầu ra Tin học quốc tế** | `INFORMATION_TECHNOLOGY` | Chứng chỉ Tin học văn phòng quốc tế MOS hoặc IC3 theo chuẩn trường. | Xử lý an toàn khi thời hạn chưa ấn định (`deadline: null`). |
| **6** | **Giáo dục thể chất & GDQP-AN** | `PHYSICAL_DEFENSE_EDUCATION` | Hoàn thành đầy đủ các học phần Thể chất và chứng chỉ Giáo dục Quốc phòng - An ninh. | Là chứng chỉ điều kiện, không tính vào CPA. |
| **7** | **Điểm rèn luyện tích lũy** | `CONDUCT_SCORE` | Điểm rèn luyện toàn khóa đạt từ 70 điểm trở lên (Loại Khá). | Đánh giá qua quá trình rèn luyện từng học kỳ. |

---

## 3. ĐỐI CHIẾU PHIÊN BẢN HỢP ĐỒNG & MÔI TRƯỜNG KỸ THUẬT (VERSIONS & CONFIGURATION)

| Hạng mục kỹ thuật | Phiên bản chuẩn hóa | Cấu hình triển khai | Ghi chú kiểm thử |
| :--- | :--- | :--- | :--- |
| **Open Contract Specification** | `contracts-v1 1.5.0` | 39 Operations, 55 Fixtures | Đã khóa cứng mã băm và kiểm chứng qua `scripts/check-contracts.mjs`. |
| **Hệ thống Chính sách Quy chế** | `policy-haui-demo-2026@0.0.1-v0` | `data-source/documents/` | Mọi API response đều bắt buộc mang `policyVersion`. |
| **Lược đồ Định danh Dữ liệu** | `dataRevision` | `REV-{studentId}-{sessionVersion}` | Đảm bảo tính nhất quán dữ liệu giữa các lần nạp bảng điểm. |
| **Backend Framework** | Java 21 LTS + Spring Boot 3.3.4 | Cổng HTTP nội bộ: `8080` | Độc lập nền tảng, quản lý qua Maven multi-module reactor. |
| **Cơ sở dữ liệu Quan hệ & Vector** | PostgreSQL 16 + `pgvector` 0.7+ | Port: `5432`, DB: `haui_advisor` | Quản lý bằng Flyway migrations V1 &rarr; V4. |
| **Frontend Framework (Host Shell)** | React 18 + Vite 5 + ES Modules | Port phát triển: `5173` | Phân hệ `tv2-web`, hỗ trợ SPA routing và Dynamic Route Injection. |
| **Micro-frontend Module (Planner)** | React 18 + ESM Library | Module: `@haui/planner-ui` | Phân hệ `tv3-planner-ui`, nhúng độc lập qua contract UI Shell. |
| **Môi trường Demo Trực tuyến** | Cloudflare Zero Trust Tunnel | HTTPS Public Edge | Do TV5 thiết lập tại Task 5.1, phục vụ kiểm thử khói nhóm. |

---

## 4. TỔNG HỢP MA TRẬN KIỂM THỬ TOÀN HỆ THỐNG (TESTING & VERIFICATION MATRIX)

### 4.1. Ma trận kiểm thử Frontend (135/135 PASS)
Toàn bộ 135 ca kiểm thử tự động của cả hai phân hệ Frontend đều đạt tỷ lệ thành công 100%:

```
✔ Task 3.4   (tv2): Contract V1 DTOs Schema Compliance & 3 Personas (7/7 tests)          -> PASS
✔ Task Live  (tv2): API Client Singleton, CSRF Header, No Fallback (11/11 tests)         -> PASS
✔ Task 3.9   (tv2): Audit Checklist, Thực tế vs Dự kiến, Print CSS (6/6 tests)            -> PASS
✔ Task 4.2a  (tv2): Curriculum Tree Live API, 503 Handling, Tracer (8/8 tests)           -> PASS
✔ Task 4.4b  (tv2): Audit -> Proposal -> Planner E2E Flow (7/7 tests)                     -> PASS
✔ Task 3.12  (tv3): Chatbot UI, Citations, Multi-turn, Proposal Card (14/14 tests)        -> PASS
✔ Task 3.5   (tv3): Multi-semester Planner, moveCourse, Validation (9/9 tests)           -> PASS
✔ Task 4.3a  (tv3): Planner Live API, Draft/Active/Archived Lifecycle (8/8 tests)         -> PASS
✔ Task 4.4a  (tv3): Chat AI Live, What-if ROI, Reconcile Plan (8/8 tests)                -> PASS
✔ Task 5.2a  (tv2): Academic Smoke Suite (5 Sub-flows + Boundary) (6/6 tests)             -> PASS
--------------------------------------------------------------------------------------------------
TỔNG CỘNG: 135 PASS / 0 FAIL / 0 SKIPPED (Thời gian chạy: ~2.4 giây)
```

### 4.2. Các kiểm tra Cổng bảo vệ Hệ thống (Automated Quality Gates)
- **Kiểm tra Ranh giới Sở hữu (`scripts/check-ownership.mjs`):** ✅ **PASS** (100% tệp sửa đổi nằm trong thư mục của từng role tương ứng).
- **Kiểm tra Khóa Hợp đồng (`scripts/check-contracts.mjs`):** ✅ **PASS** (Khớp toàn bộ 39 endpoints và 55 fixtures mẫu).
- **Kiểm tra Quét Thông tin Bí mật (`scripts/check-secrets.mjs`):** ✅ **PASS** (Zero hardcoded API keys, certificates hoặc secrets).
- **Kiểm tra Phụ thuộc Vòng lặp Kiến trúc (`scripts/check-architecture.mjs`):** ✅ **PASS** (Cấu trúc phân tầng một chiều, không cyclic dependencies).

---

## 5. HƯỚNG DẪN TRA CỨU ĐỐI SOÁT CHO BÁO CÁO TỔNG KẾT

Khi trình bày trong Quyển báo cáo tổng kết bài tập lớn, tác giả có thể trích dẫn trực tiếp các số liệu và bằng chứng thực tế sau:

1. **Về Khả năng Chống Ảo giác của AI (Grounding):**
   - Trích dẫn cơ chế `ResponseGroundingValidator` trong `tv1-ai`, bắt buộc trích dẫn Số điều, Khoản, Tên văn bản quy chế HaUI lưu tại `data-source/documents/`. Nếu điểm tương đồng $< 0.65$, hệ thống từ chối bịa câu trả lời.
2. **Về Tính Toàn vẹn Học vụ (Academic Integrity):**
   - Trích dẫn nguyên tắc cô lập: Client Frontend và Chatbot AI không có quyền tính điểm CPA hay suy đoán môn tiên quyết. 100% số liệu phải do TV4 `AcademicFacade` trả về.
3. **Về Trải nghiệm Người dùng Tối giản (Minimalist UX):**
   - Trích dẫn giao diện *Clinical Blueprint on Frosted Paper* trên `tv2-web`: Bỏ các thành phần gây nhiễu trên Dashboard, biểu đồ CPA 1 đường kẻ mềm mại kết hợp volume bar, thanh cuộn Cây môn học 6px với header cố định `sticky` giúp quan sát tiến độ dễ dàng.
4. **Về Phân định Pháp lý Kiểm toán:**
   - Trích dẫn rõ ràng rằng hệ thống chỉ đóng vai trò hỗ trợ sinh viên tự kiểm toán và định hướng lộ trình học tập, luôn đi kèm khuyến cáo: *Ứng dụng đánh giá tự động, không thay thế Quyết định công nhận tốt nghiệp chính thức của Trường Đại học Công nghiệp Hà Nội.*
