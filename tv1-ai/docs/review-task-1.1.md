# BÁO CÁO REVIEW VÀ KIỂM TRA TÀI LIỆU TASK 1.1 — TV1 (LEAD + AI)

**Dự án:** HaUI Advisor  
**Task:** 1.1 — Ghi solution và phạm vi vào repository  
**Vai trò:** TV1 — Tech Lead + AI Engineer  
**Ngày thực hiện:** 2026-09-25  
**Trạng thái tài liệu:** `READY_FOR_TV1_REVIEW`  
**Người nhận tiếp theo:** TV5 — Backend/DB/DevOps (cho task 1.2 sau khi TV1 phê duyệt và bàn giao)  

---

## 1. Nguồn tài liệu đã đọc và tình trạng tiếp cận

Toàn bộ các tài liệu nguồn, tài liệu hướng dẫn và đặc tả được yêu cầu cho task 1.1 đã được đọc và đối chiếu trực tiếp. Không có tài liệu nào bị bỏ qua hoặc giả định nội dung.

| Mã | Tên file / Đường dẫn | Thể loại | Tình trạng đọc | Ghi chú phương thức đọc & nội dung trích xuất |
|---|---|---|---|---|
| **S01** | `sources/Phan_cong_HaUI_Advisor(1).xlsx` | Bảng phân công gốc | **Đã đọc 100%** | Đọc qua OpenXML/ZIP bằng script tự động. Đã kiểm tra sheet "Phân công", ô A4:B8 xác nhận vai trò và phạm vi gốc của TV1–TV5. |
| **S02** | `sources/Page Brief - HAUI ADVISOR(1).docx` | Bản tóm tắt dự án | **Đã đọc 100%** | Đọc qua WordProcessingML (`word/document.xml`). Nắm bắt Problem Statement, Target Audience (duy nhất 1 actor Sinh viên), Solution (AI + RAG + Rule Engine), Unique Value Proposition. |
| **S03** | `sources/PRD-HAUI_ADVISOR(1).docx` | Yêu cầu sản phẩm (PRD) | **Đã đọc 100%** | Đọc qua WordProcessingML. Đã rà soát đủ 13 mục: Goals (G1–G9), Target Users (4 nhóm nhu cầu), Scope, User Stories (US-01–US-13), Functional Requirements (FR-01–FR-18), Workflow, NFRs, Data Model (§8), Business Rules (BR-01–BR-10), Acceptance Criteria (AC-01–AC-05), Phụ lục 13.1 (trọng số 40/25/20/15) và 13.2 (StudyPlan State Machine). |
| **S04** | `sources/HAUI_ADVISOR_UI_FLOW(1).md` | Thiết kế luồng giao diện | **Đã đọc 100%** | Đọc trực tiếp định dạng Markdown. Đối chiếu Màn 1 đến Màn 9, Luồng phụ A (nhập bảng điểm), Luồng phụ B (khám phá CTĐT) và Bảng xử lý ngoại lệ §5. |
| **S05** | `sources/1790235796751_2381482604274817039_g1449798126663679773_2948c429f4b6439145e44359aeb6a598(1).jpg` | Sơ đồ desktop nháp | **Đã kiểm tra** | File ảnh nhị phân (548.246 bytes). Xác định là bản vẽ nháp sơ đồ các luồng (Dashboard, Chat AI, Simulator, Graduation Audit). Coi là tài liệu tham khảo bố cục luồng, không coi là UI đã duyệt. |
| **S06** | `sources/HaUI_Advisor_Solution_va_Prompt_theo_Phase.md` | Solution & Prompt theo Phase | **Đã đọc 100%** | Đọc trực tiếp Markdown. Rà soát kỹ phần Solution (mục 8–72), Cấu trúc repository (mục 73–89), Prompt tiền tố (mục 91–104), Task 1.1 (mục 108–118), Task 1.2 (mục 120–129) và các mốc bàn giao. |
| **S07** | `sources/HaUI_Advisor_Phase_Thu_tu_Phu_thuoc.xlsx` | Thứ tự phụ thuộc & Kế hoạch | **Đã đọc 100%** | Đọc qua OpenXML/ZIP. Đã kiểm tra sheet 1 bảng nguyên tắc điều phối, quan hệ phụ thuộc các task và nguyên tắc khóa quyền sở hữu thư mục. |
| **—** | `source-manifest.json` | Manifest kiểm tra toàn vẹn | **Đã đọc 100%** | Chứa thông tin 7 file nguồn với SHA-256 và dung lượng byte để đối soát. |
| **—** | `prompt-task-1.1.md` | Nhiệm vụ chi tiết task 1.1 | **Đã đọc 100%** | Đã tuân thủ nghiêm ngặt mọi chỉ dẫn và điều kiện tiên quyết. |
| **—** | `README-task-1.1.md` | Hướng dẫn đưa gói vào repo | **Đã đọc 100%** | Đã nắm bắt quy ước bố trí đường dẫn `<repo>/tv1-ai/docs/`. |
| **—** | `solution-v1.md` | Tài liệu solution v1 | **Đã đọc & rà soát** | Rà soát toàn bộ 12 phần nội dung theo yêu cầu. |
| **—** | `AGENTS.md` | Hướng dẫn agent toàn repo | **Chưa tồn tại** | Đã kiểm tra ở root repo và các thư mục; xác nhận chưa có file này. Việc tạo AGENTS.md thuộc phạm vi task 1.2 của TV5. |

---

## 2. Các nội dung đã kiểm tra, hoàn thiện và căn cứ triển khai

Tài liệu `solution-v1.md` đã được rà soát tỉ mỉ từng điều khoản và đối chiếu chặt chẽ với các nguồn gốc S01–S07 cùng kế hoạch S06:

### 2.1. Quyền người dùng duy nhất (Single Role)
- **Kiểm tra:** Hệ thống chỉ có duy nhất một role `STUDENT`.
- **Căn cứ:** S02 (Target Audience chỉ phục vụ 1 Actor duy nhất là Sinh viên), S03 (§2, FR-01), S06 (Phạm vi).
- **Làm rõ:** Bốn nhóm sinh viên (năm nhất, có nguy cơ học vụ, học vượt, gần tốt nghiệp) là các phân nhóm nhu cầu học vụ, không phải các cấp phân quyền khác nhau. Các khu vực Portal, Simulator, Audit là các phân hệ chức năng trong cùng tài khoản. Tuyệt đối không tạo role `ADVISOR` hay `ADMIN` trong ứng dụng người dùng. Công việc vận hành và seed dữ liệu do TV5 quản lý bằng công cụ triển khai.

### 2.2. Đầy đủ các luồng chức năng cốt lõi
- **Kiểm tra:** Đã mô tả chi tiết 8 luồng sử dụng (F01–F08):
  - `F01`: Hồ sơ và bảng điểm $\rightarrow$ Dashboard (hỗ trợ nhập tay, chọn mẫu demo, upload PDF/ảnh, review & confirm trước khi lưu).
  - `F02`: Dashboard $\rightarrow$ Khung CTĐT / Sơ đồ cây môn học (hỗ trợ lọc, xem quan hệ tiên quyết/song hành, chọn thêm môn vào Planner).
  - `F03`: Chat hỏi đáp học vụ với AI Advisor (RAG trích dẫn nguồn, câu hỏi quy chế kết thúc tại Chat mà không ép sang Planner).
  - `F04`: Chat $\rightarrow$ Đề xuất phương án $\rightarrow$ Chuyển sang Planner (xem lại, chỉnh sửa hoặc yêu cầu phương án khác).
  - `F05`: Mở Planner trực tiếp (không bắt buộc thông qua hội thoại AI; hỗ trợ kế hoạch chuẩn, học vượt, kỳ hè).
  - `F06`: What-if Simulation / Học cải thiện (ROI) / Mục tiêu ngược (thử nghiệm điểm số không sửa bảng điểm thật, áp dụng chuyển sang Planner).
  - `F07`: Graduation Audit $\rightarrow$ Phương án bù đắp $\rightarrow$ Planner (rà soát điều kiện, chứng chỉ phi tín chỉ được thể hiện là action cần hoàn thành).
  - `F08`: Mở lại và theo dõi qua từng học kỳ (đối chiếu kết quả thực tế với kế hoạch mục tiêu theo đúng yêu cầu US-13 của PRD, tạo bản nháp điều chỉnh kỳ tiếp theo).
- **Căn cứ:** S03 (US-01–US-13, FR-01–FR-18), S04 (Màn 1–9, Luồng A, B), S06 (Các luồng chính và F08).

### 2.3. Lựa chọn công nghệ & Nguyên tắc kiến trúc
- **Kiểm tra:**
  - Frontend: ReactJS + Vite + React Router.
  - Backend: Java Spring Boot.
  - AI Module: Spring AI + Google Gemini (API key và cấu hình nằm ở server trong module TV1).
  - Học vụ: Module Java thuần của TV4, độc lập hoàn toàn với HTTP, Database, LLM; sử dụng `BigDecimal` để đảm bảo độ chính xác tính toán điểm số.
  - Dữ liệu: PostgreSQL kết hợp tiện ích `pgvector` cho kho tri thức RAG.
  - Xác thực & Bảo mật: Spring Security với session cookie và bảo vệ CSRF; định danh sinh viên được server trích xuất từ phiên xác thực, không tin cậy `student_id` do client hoặc AI tự gửi.
  - Môi trường & Build: Maven multi-module, npm workspace, Docker Compose cho web, API và database.
- **Căn cứ:** S06 (Công nghệ, Một runtime).
- **Lưu ý:** Ghi rõ trong tài liệu đây là định hướng kiến trúc từ kế hoạch, không phải các dependency đã được cài đặt hay kiểm chứng trong task 1.1. TV5 sẽ là người scaffold và khóa phiên bản tương thích tại task 1.2.
- **Mô hình runtime:** Duy nhất 1 web host, 1 ứng dụng Spring Boot chạy chính, 1 PostgreSQL. TV1 (AI) và TV4 (Academic) là các module thư viện Java đóng gói chung trong ứng dụng Boot, không phải các microservice phân tán hay dịch vụ triển khai riêng biệt.

### 2.4. Ranh giới và quyền sở hữu năm folder (Ownership)
- **Kiểm tra:** Đã làm rõ trách nhiệm và ranh giới bất khả xâm phạm giữa 5 thành viên:
  - `tv1-ai/`: TV1 phụ trách thư viện AI, RAG, ToolAdapter, tài liệu AI. Không import repository hoặc controller của TV5.
  - `tv2-web/`: TV2 phụ trách web host, layout/sidebar, UI component dùng chung, API client chung, màn hình học vụ và Audit UI.
  - `tv3-planner-ui/`: TV3 phụ trách tính năng Study Planner, Chat UI, What-if UI, Profile. Export hàm `createStudentRoutes({ api, ui })`. Không dựng layout/auth riêng, không import ngược web host TV2.
  - `tv4-academic/`: TV4 phụ trách thư viện logic học vụ `AcademicFacade`, fixture mẫu và test harness. Không phụ thuộc DB, HTTP hay LLM.
  - `tv5-platform/`: TV5 phụ trách ứng dụng Spring Boot (`app/`), hợp đồng giao tiếp (`contracts/`), cơ sở hạ tầng Docker/CI (`infra/`), root build files (`pom.xml`, `package.json`, lockfiles, `AGENTS.md`).
- **Ngoại lệ khởi tạo:** TV5 được phép scaffold cấu trúc 5 thư mục một lần duy nhất tại task 1.2 mà không làm mất nội dung `tv1-ai/docs/`. Sau task 1.2, các thành viên chỉ sửa đổi trong thư mục của mình.

### 2.5. Vòng đời và hành vi quản lý Kế hoạch học tập (StudyPlan Lifecycle)
- **Kiểm tra:** Thể hiện đầy đủ State Machine từ PRD §13.2: `DRAFT` $\rightarrow$ `VALIDATED` $\rightarrow$ `ACTIVE` $\rightarrow$ `COMPLETED` / `ARCHIVED`.
- **Hành vi bổ sung từ kế hoạch [S06]:**
  - *Lưu nháp:* Cho phép sinh viên lưu kế hoạch ở trạng thái `DRAFT` ngay cả khi còn cảnh báo vi phạm học vụ (đáp ứng trải nghiệm người dùng thực tế đang soạn dở).
  - *Kiểm tra:* Khi gọi kiểm tra, nếu thỏa mãn điều kiện theo chính sách hiện hành thì chuyển thành `VALIDATED`; nếu không, giữ nguyên `DRAFT` và báo lỗi chi tiết.
  - *Sửa đổi:* Mọi thao tác chỉnh sửa trên bản đã kiểm tra đều làm mất hiệu lực kết quả kiểm tra cũ, đưa kế hoạch trở về `DRAFT`.
  - *Kích hoạt:* Để chuyển sang `ACTIVE`, hệ thống bắt buộc kiểm tra lại toàn bộ ràng buộc trên revision hiện tại. Mỗi sinh viên chỉ có tối đa 1 kế hoạch `ACTIVE` tại một thời điểm.
  - *Chỉnh sửa kế hoạch đang chạy:* Khi muốn chỉnh sửa bản `ACTIVE`, hệ thống tạo ra một bản `DRAFT` kế thừa để sinh viên thử nghiệm, bảo toàn nguyên vẹn bản `ACTIVE` đang theo dõi.
  - *Áp dụng:* Thao tác áp dụng kế hoạch mới phải qua bước xem lại trong Planner; việc lưu và thay thế `ACTIVE` cũ bằng bản mới được thực hiện trong một transaction duy nhất (archive bản cũ, activate bản mới).
  - *Hủy bỏ:* Hủy phương án hoặc thoát màn hình không làm thay đổi bản ghi đã lưu hay bản `ACTIVE` đang chạy.

### 2.6. Phân biệt nội dung nguồn gốc và nội dung bổ sung triển khai
- **Kiểm tra:** Đã đối chiếu và trình bày minh bạch tại Mục 9 của `solution-v1.md`:
  - UI Flow [S04 §5] chặn lưu kế hoạch khi vi phạm tín chỉ $\leftrightarrow$ Solution [S06] cho phép lưu `DRAFT` nhưng chặn kích hoạt `ACTIVE`.
  - PRD [S03 §13.2] chỉ nêu tên trạng thái $\leftrightarrow$ Solution [S06] bổ sung cơ chế versioning, DRAFT kế thừa và ràng buộc 1 ACTIVE trong transaction.
  - Ảnh nháp [S05] chứa số điểm, tên môn và giao diện desktop mẫu $\leftrightarrow$ Solution coi đây là tư liệu tham khảo luồng tương tác, gắn nhãn chưa nghiệm thu.
  - PRD [S03 §9] ghi BR-01–10 $\leftrightarrow$ Solution gắn cờ `DEMO_UNVERIFIED` cho đến khi có văn bản quy chế chính thức của HaUI.
  - PRD [S03 NFR-01] ghi What-if $\le$ 1s trong khi AC-04 ghi $\le$ 500ms $\leftrightarrow$ Solution giữ nguyên cả hai mức chỉ tiêu từ nguồn và ghi nhận chưa kiểm chứng.

### 2.7. Giữ nguyên trạng thái tiêu chí bấm thử P01–P13
- **Kiểm tra:** Bảng kịch bản kiểm thử tương tác gồm 13 ca (P01 đến P13) tại Mục 10 của `solution-v1.md` đều được gắn trạng thái rõ ràng là `CHƯA BẤM THỬ`.
- **Ràng buộc:** Không tự ý đánh dấu PASS cho bất kỳ ca kiểm thử nào khi chưa có prototype tương tác thực tế và chưa được bấm thử nghiệm thu.

---

## 3. Danh sách tệp đã tạo / chỉnh sửa

Trong phạm vi thực hiện task 1.1, chỉ có đúng hai tệp tài liệu được phép thao tác:

1. **`tv1-ai/docs/solution-v1.md`** *(Chỉnh sửa)*
   - Cập nhật dòng trạng thái tài liệu từ `DRAFT_FOR_TV1_REVIEW` thành `READY_FOR_TV1_REVIEW`.
   - Rà soát, xác nhận toàn bộ 12 mục nội dung chuẩn hóa theo đúng yêu cầu phân công của Tech Lead TV1.
2. **`tv1-ai/docs/review-task-1.1.md`** *(Tạo mới)*
   - Báo cáo tổng kết toàn bộ quá trình rà soát, đối chiếu nguồn, kiểm tra mã hash và bàn giao kết quả của task 1.1.

> [!IMPORTANT]
> **Xác nhận phạm vi:** Không có bất kỳ tệp nguồn nào trong `sources/` bị thay đổi, xóa bỏ hay ghi đè. Tệp `source-manifest.json` được giữ nguyên vẹn. Không tạo bất kỳ tệp mã nguồn ứng dụng (Java/React), không scaffold các thư mục `tv2-web/`, `tv3-planner-ui/`, `tv4-academic/`, `tv5-platform/`, không tạo file cấu hình root (`pom.xml`, `package.json`, `.github/`, `AGENTS.md`).

---

## 4. Kết quả kiểm tra Hash, đường dẫn và tính toàn vẹn tài liệu

### 4.1. Bảng kiểm tra SHA-256 và kích thước file nguồn
Kiểm tra thực tế bằng thuật toán mã hóa SHA-256 trên toàn bộ 7 file nguồn trong thư mục `sources/` đối chiếu trực tiếp với `source-manifest.json`:

| Mã | Tên file nguồn | Kích thước thực tế | Kích thước kỳ vọng | SHA-256 thực tế | SHA-256 kỳ vọng (Manifest) | Kết quả |
|---|---|---|---|---|---|:---:|
| **S01** | `Phan_cong_HaUI_Advisor(1).xlsx` | 8.687 bytes | 8.687 bytes | `621af15bd8af089f76f9055ed30441791c83f8f11dd80714baa093eefb73af87` | `621af15bd8af089f76f9055ed30441791c83f8f11dd80714baa093eefb73af87` | **KHỚP 100%** |
| **S02** | `Page Brief - HAUI ADVISOR(1).docx` | 38.432 bytes | 38.432 bytes | `9301749d3e59bce3509d0c2a0977d0efa84b85203290080157797e07b01a654f` | `9301749d3e59bce3509d0c2a0977d0efa84b85203290080157797e07b01a654f` | **KHỚP 100%** |
| **S03** | `PRD-HAUI_ADVISOR(1).docx` | 45.705 bytes | 45.705 bytes | `0caad115240e4d9ae50b13c525a4557140d34eff621488857b6eacb01d7a6ef4` | `0caad115240e4d9ae50b13c525a4557140d34eff621488857b6eacb01d7a6ef4` | **KHỚP 100%** |
| **S04** | `HAUI_ADVISOR_UI_FLOW(1).md` | 17.814 bytes | 17.814 bytes | `6e19d0ec5b0ad61b2876ee6c526226a7162d9c6e4ef8a6a78dc5dfce22dc3479` | `6e19d0ec5b0ad61b2876ee6c526226a7162d9c6e4ef8a6a78dc5dfce22dc3479` | **KHỚP 100%** |
| **S05** | `1790235796751_...jpg` | 548.246 bytes | 548.246 bytes | `5afe22a47c2412073441554d797057b0ac75605dfbdfb0df291475392d197ddc` | `5afe22a47c2412073441554d797057b0ac75605dfbdfb0df291475392d197ddc` | **KHỚP 100%** |
| **S06** | `HaUI_Advisor_Solution_va_Prompt_theo_Phase.md` | 42.497 bytes | 42.497 bytes | `8166c99427a4ad79cd42214e2c469a60fe988390897969e1a37dd11b9e5957d0` | `8166c99427a4ad79cd42214e2c469a60fe988390897969e1a37dd11b9e5957d0` | **KHỚP 100%** |
| **S07** | `HaUI_Advisor_Phase_Thu_tu_Phu_thuoc.xlsx` | 37.265 bytes | 37.265 bytes | `93f9f8d985d551788814b8106c9ff985b1416465bc4b02776a6168f442e0b4d0` | `93f9f8d985d551788814b8106c9ff985b1416465bc4b02776a6168f442e0b4d0` | **KHỚP 100%** |

*Kết luận kiểm tra hash:* Toàn bộ 7/7 file nguồn đều nguyên vẹn 100% từng byte, không xảy ra sai lệch hay sửa đổi ngầm.

### 4.2. Kiểm tra đường dẫn và cấu trúc thư mục thực tế
- **Đường dẫn nội bộ:** Các liên kết tương đối từ `solution-v1.md` đến các file trong `sources/` và `source-manifest.json` hoạt động chính xác theo quy định của manifest (`path_base: directory containing source-manifest.json`).
- **Định dạng:** Các file `.md` và `.json` đều tuân thủ bảng mã UTF-8 chuẩn, không bị lỗi font hay ký tự tiếng Việt.
- **Tình trạng môi trường Git và Thư mục:**
  - Remote repository: Đã kết nối với `https://github.com/netrotion/QUAN-LY-HOC-TAP-TTCSN` (nhánh `main`).
  - Cấu trúc thư mục tại root repository đã được chuẩn hóa đúng quy ước `<repo>/tv1-ai/docs/`:
    ```text
    <repo>/
    ├── .git/
    ├── README.md
    └── tv1-ai/
        └── docs/
            ├── prompt-task-1.1.md
            ├── README-task-1.1.md
            ├── solution-v1.md
            ├── review-task-1.1.md
            ├── source-manifest.json
            └── sources/
                ├── Phan_cong_HaUI_Advisor(1).xlsx
                ├── Page Brief - HAUI ADVISOR(1).docx
                ├── PRD-HAUI_ADVISOR(1).docx
                ├── HAUI_ADVISOR_UI_FLOW(1).md
                ├── 1790235796751_2381482604274817039_g1449798126663679773_2948c429f4b6439145e44359aeb6a598(1).jpg
                ├── HaUI_Advisor_Solution_va_Prompt_theo_Phase.md
                └── HaUI_Advisor_Phase_Thu_tu_Phu_thuoc.xlsx
    ```
  - Cấu trúc thư mục hoàn toàn sẵn sàng và chuẩn xác theo đúng quy định để TV5 tiến hành task 1.2.

---

## 5. Danh mục các hạng mục CHƯA kiểm thử

Để đảm bảo tính trung thực kỹ thuật và ranh giới nghiêm ngặt của task 1.1, các nội dung sau được xác nhận là **CHƯA ĐƯỢC KIỂM THỬ** trong phạm vi task này:

1. **Giao diện & Prototype tương tác:** Chưa dựng ứng dụng React, chưa dựng giao diện trên Stitch / Figma, 13 kịch bản bấm thử (P01–P13) giữ nguyên trạng thái `CHƯA BẤM THỬ`.
2. **Backend Runtime & API:** Chưa biên dịch Spring Boot, chưa tạo controller, chưa triển khai các DTO hay endpoints.
3. **Cơ sở dữ liệu & Lưu trữ:** Chưa kết nối PostgreSQL, chưa kích hoạt `pgvector`, chưa chạy migration hay tạo bảng dữ liệu thực tế.
4. **Công cụ học vụ TV4:** Chưa triển khai thuật toán tính điểm hay lập kế hoạch bằng code Java; fixture và test harness học vụ thuộc task 1.3b của TV4.
5. **AI Advisor & RAG Live:** Chưa gọi API bên ngoài (Gemini/Spring AI), chưa nạp vector embeddings thực tế, chưa kiểm thử live hội thoại.
6. **Quy chế đào tạo HaUI:** Các điều kiện môn học, thang điểm và quy tắc BR-01–BR-10 trong PRD là dữ liệu mô phỏng, tiếp tục mang trạng thái `DEMO_UNVERIFIED`.
7. **Hiệu năng & NFR:** Các con số thời gian phản hồi (What-if $\le$ 1s, Chat $\le$ 3s) là chỉ tiêu thiết kế, chưa được đo đạc bằng công cụ benchmark.

---

## 6. Trạng thái bàn giao task 1.1

> **TRẠNG THÁI:** `READY_FOR_TV1_REVIEW`

**Lý do:**
- Hoàn thành đầy đủ tất cả các yêu cầu rà soát, chuẩn hóa và bảo toàn tài liệu theo `prompt-task-1.1.md`.
- Bảo toàn 100% tính toàn vẹn của 7 file nguồn gốc (khớp byte và SHA-256).
- Tài liệu `solution-v1.md` đã được đối chiếu chặt chẽ, đầy đủ 8 luồng, đúng kiến trúc, đúng ownership 5 folder, phân biệt rõ nguồn gốc và bổ sung triển khai.
- Không vi phạm các giới hạn: Không tạo code ứng dụng, không sửa ngoài phạm vi cho phép.

---

## 7. Các bước tiếp theo

1. **TV1 Review:**
   - TV1 (Tech Lead) trực tiếp rà soát diff của hai file `tv1-ai/docs/solution-v1.md` và `tv1-ai/docs/review-task-1.1.md`.
   - Xác nhận sự đồng thuận về kiến trúc, ownership và phạm vi sản phẩm.
2. **Đưa tài liệu lên repository chung:**
   - TV1 khởi tạo/cập nhật repository của nhóm, đưa thư mục `tv1-ai/docs/` vào đúng vị trí gốc (`<repo>/tv1-ai/docs/`).
   - Tạo commit hoặc tag bàn giao mốc hoàn thành Task 1.1.
3. **Bàn giao cho TV5 thực hiện Task 1.2:**
   - Gửi tài liệu `solution-v1.md` cùng đường dẫn commit cho TV5.
   - TV5 bắt đầu thực hiện **Task 1.2 — Tạo khung build và contract V0** (scaffold 5 folder, Maven multi-module, npm workspace, contracts DTO/ports, OpenAPI V0, Compose, CI và `AGENTS.md`).
4. **Dừng thực hiện:**
   - AI/Agent dừng tại đây sau khi hoàn tất task 1.1. Tuyệt đối không tự động chuyển sang task 1.2 hoặc viết code AI.
