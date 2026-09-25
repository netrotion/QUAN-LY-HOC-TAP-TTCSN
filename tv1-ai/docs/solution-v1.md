# HAUI ADVISOR — SOLUTION V1

**Task:** 1.1 — Ghi solution và phạm vi vào repository  
**Owner:** TV1 — Lead + AI  
**Người nhận tiếp theo:** TV5 — Backend/DB/DevOps, task 1.2  
**Phiên bản tài liệu:** 1.0 — 2026-09-25  
**Trạng thái:** `READY_FOR_TV1_REVIEW` — tài liệu triển khai đã hoàn tất rà soát ở task 1.1, sẵn sàng để TV1 review và bàn giao cho TV5; không phải biên bản nghiệm thu sản phẩm.

## 0. Giới hạn của task hiện tại

Task 1.1 chỉ đưa solution, phạm vi, luồng sử dụng, ownership và tiêu chí kiểm tra vào tài liệu. Chỉ tạo/sửa nội dung trong `tv1-ai/docs/`; giữ nguyên các tệp nguồn tại `tv1-ai/docs/sources/`.

Không tạo ứng dụng React, Spring Boot, module Java, database, API, dữ liệu seed, cấu hình Docker hoặc khóa API tại task này. Không tạo root `pom.xml`, `package.json`, lockfile, `.github/` hoặc `AGENTS.md`. Các file nền tảng thuộc task 1.2 của TV5.

Tình trạng nguồn và kiểm thử phải được phân biệt:

| Nội dung | Tình trạng tại thời điểm soạn tài liệu |
|---|---|
| Một role người dùng `STUDENT` | Đã được TV1 chốt trong trao đổi của nhóm. |
| Brief, PRD, UI Flow và ảnh gốc | Bản nguồn/nháp; chưa được coi là đã duyệt toàn bộ. |
| Kiến trúc và hành vi triển khai trong solution | Chép và diễn giải từ kế hoạch triển khai [S06]; không gán ngược thành yêu cầu gốc của PRD. |
| Prototype tương tác | Chưa có bằng chứng bấm thử trong task 1.1. |
| Ứng dụng, API, công cụ và AI | Không triển khai hoặc kiểm thử trong task 1.1. |
| Quy chế HaUI chính thức | Chưa được đối chiếu/kiểm chứng bằng task này. |
| Các con số mục tiêu trong PRD | Yêu cầu/giả định của nguồn, không phải kết quả đo đã đạt. |

Chỉ đổi trạng thái tài liệu sau khi TV1 thực sự review. Duyệt tài liệu task 1.1 không đồng nghĩa nghiệm thu prototype, công cụ học vụ hoặc toàn bộ sản phẩm.

## 1. Nguồn và cách sử dụng

Các mã nguồn dưới đây dùng xuyên suốt tài liệu. Tên file và nội dung gốc được giữ nguyên. Đường dẫn tính từ thư mục chứa `solution-v1.md`.

| Mã | File trong `sources/` | Dùng để đối chiếu |
|---|---|---|
| S01 | `Phan_cong_HaUI_Advisor(1).xlsx` | Sheet Phân công, A4:B8: vai trò và công việc gốc của TV1–TV5. |
| S02 | `Page Brief - HAUI ADVISOR(1).docx` | Target Audience, Solution và giá trị sản phẩm. |
| S03 | `PRD-HAUI_ADVISOR(1).docx` | Product Scope; US-01–13; FR-01–18; mô hình, quy tắc và phụ lục. |
| S04 | `HAUI_ADVISOR_UI_FLOW(1).md` | Màn 1–9; các luồng A/B; nhánh thay thế và trạng thái lỗi. |
| S05 | `1790235796751_2381482604274817039_g1449798126663679773_2948c429f4b6439145e44359aeb6a598(1).jpg` | Sơ đồ desktop nháp, gồm ba luồng chính và các luồng bổ trợ. |
| S06 | `HaUI_Advisor_Solution_va_Prompt_theo_Phase.md` | Solution triển khai, ownership, phụ thuộc và task 1.1/1.2. |
| S07 | `HaUI_Advisor_Phase_Thu_tu_Phu_thuoc.xlsx` | Kế hoạch task, thứ tự bàn giao và các vùng phụ trách. |

`source-manifest.json` ghi SHA-256 và kích thước từng file. Đây là kiểm tra bảo toàn bản nguồn, không phải xác nhận nội dung nguồn đúng.

**Quy ước đọc:** “Từ nguồn” nghĩa là tài liệu đính kèm có nội dung đó. “Solution [S06]” nghĩa là cách triển khai đã được viết trong kế hoạch, có thể cụ thể hơn hoặc khác cách diễn đạt trong bản nháp. Các khác biệt được ghi rõ tại mục 9, không sửa âm thầm file gốc.

Bản phân công [S01] không phải bản mô tả chi tiết UI. Phần Audit UI cho TV2, What-if UI cho TV3, folder và interfaces là phân chi tiết trong [S06].

## 2. Mục tiêu và phạm vi sản phẩm

### 2.1. Mục tiêu

Xây dựng hệ thống phần mềm thông minh hỗ trợ sinh viên HaUI theo dõi, quản lý tiến độ và kết quả học tập cá nhân; sử dụng thuật toán/công cụ gợi ý để tư vấn lộ trình học vụ, mô phỏng và tối ưu hóa mục tiêu điểm số, lập kế hoạch phù hợp theo từng kỳ.

Theo cách dùng thuật ngữ của [S03]: **GPA** là điểm trung bình học kỳ; **CPA** là điểm trung bình tích lũy. “Tối ưu” trong bản triển khai không phải lời bảo đảm đạt điểm hoặc tốt nghiệp; công cụ đưa phương án theo dữ liệu và ràng buộc đang có.

### 2.2. Người dùng

Chỉ có role `STUDENT`. Sinh viên năm nhất, có nguy cơ học vụ, muốn học vượt và gần tốt nghiệp là các nhóm nhu cầu, không phải các cấp quyền khác nhau. Portal, Simulator và Audit trên ảnh là các khu vực chức năng của cùng tài khoản. [S02 Target Audience; S03 §2, FR-01]

Sinh viên truy cập hồ sơ, bảng điểm, hội thoại và kế hoạch của chính mình. Không tạo role ADVISOR hoặc ADMIN trong MVP này. Phần vận hành/seed do TV5 thực hiện bằng công cụ triển khai, không biến thành một cổng quản trị mới. [S03 NFR-03; S06]

### 2.3. Chức năng cần triển khai ở các task sau

| Nhóm chức năng | Phạm vi | Owner thực hiện | Căn cứ |
|---|---|---|---|
| Đăng nhập và hồ sơ | Tài khoản sinh viên/demo; hồ sơ cá nhân; dữ liệu theo ngành/khóa. | TV5 API; TV2 Login; TV3 Profile | S03 §3, FR-01; S01; S06 |
| Bảng điểm | Tải PDF/ảnh, nhập tay hoặc chọn mẫu demo; xem lại/chỉnh thông tin trích xuất rồi xác nhận lưu. | TV5 nhập/lưu; TV2 UI; TV4 tính học vụ | S03 FR-02–04; S04 luồng A |
| Dashboard và CTĐT | GPA/CPA, tín chỉ, tiến độ, cảnh báo; tra cứu và sơ đồ quan hệ học phần. | TV2 UI; TV4 logic; TV5 API | S03 G2/G4, FR-03/04/08/18; S04 màn 1/4, luồng B |
| AI Advisor | Chat tiếng Việt, hỏi quy chế, gỡ nợ môn, lập/đổi lộ trình, hỏi bổ sung, nguồn và hành động mở Planner. | TV1 AI; TV3 UI; TV5 API/lưu Chat | S03 FR-05–07; S04 màn 2/3 |
| Study Planner | Lộ trình theo nhiều kỳ; chuẩn/học vượt/kỳ hè; thêm/bớt/đổi môn; kiểm tra, lưu và mở lại. | TV3 UI; TV4 công cụ; TV5 lưu/API | S03 US-04/06/10/13, FR-09–13 |
| What-if / ROI / mục tiêu ngược | Thử điểm, xếp ưu tiên học cải thiện, tính mục tiêu các kỳ còn lại; áp dụng kết quả qua Planner. | TV3 UI; TV4 công cụ; TV5 API | S03 FR-14–16; S04 màn 6–8 |
| Audit và theo dõi | Checklist điều kiện, cảnh báo, phương án bù đắp; cập nhật kết quả và đối chiếu kế hoạch qua học kỳ. | TV2 Audit/tiến độ; TV3 chỉnh kế hoạch; TV4/TV5 xử lý | S03 FR-17/18, G9, US-13; S04 màn 9 |
| Báo cáo cá nhân | Lựa chọn in/lưu PDF nội dung đang xem; không có ký số hoặc xác nhận chính thức của trường. | TV2 UI; TV5 dữ liệu | S05; giới hạn triển khai trong S06 |

### 2.4. Ngoài phạm vi

Không đăng nhập/crawl hoặc đăng ký môn thay sinh viên trên e-HaUI. Không ghi/sửa điểm tại hệ thống của trường. Không thanh toán học phí, phúc khảo, ký số, voice, ghép nhóm học tập hoặc tạo nền tảng đánh giá môn học hai chiều. Không thêm runtime Python, microservice riêng cho từng thành viên, Kafka hoặc Kubernetes. [S03 §3, §11; S06]

Mục đánh giá độ khó/giảng viên trong luồng tra cứu [S04 §4.2] chỉ hiển thị khi có thông tin; solution [S06] không mở thêm chức năng cộng đồng. Thiếu thông tin thì hiển thị thiếu, không sinh nội dung giả.

## 3. Kiến trúc triển khai theo kế hoạch [S06]

Đây là các lựa chọn triển khai của kế hoạch, không phải kiểm chứng khả năng tương thích phiên bản thư viện. TV5 khóa phiên bản sau khi dựng và build khung tại task 1.2; task 1.1 không cài dependency.

| Thành phần | Solution |
|---|---|
| Prototype | Stitch, hai FE dùng chung một khung thiết kế. |
| Frontend | ReactJS + Vite + React Router; một web host, một layout và một API client dùng chung. |
| Backend | Java Spring Boot; một ứng dụng chạy chính, chia module để phân công. |
| AI | Spring AI + Gemini trong module Java của TV1; cấu hình và API key phía server. |
| Học vụ | Module Java của TV4, công cụ độc lập với HTTP/DB/LLM. |
| Dữ liệu | PostgreSQL; pgvector cho tìm kiếm tài liệu RAG. |
| Đăng nhập | Spring Security, session cookie và CSRF; giới hạn dữ liệu theo tài khoản trên server. |
| Build/chạy | Maven multi-module; npm workspace; Docker Compose cho web, Backend và database. |

Luồng gọi thông thường:

```text
Sinh viên
  → Web host TV2 + các trang TV3
  → API / xác thực / context của TV5
      → AcademicFacade của TV4 khi dùng công cụ trực tiếp
      → AdvisorFacade của TV1 khi Chat
          → RAG và/hoặc ToolAdapter → AcademicFacade
  → Kết quả có cấu trúc
  → UI hiển thị; sinh viên quyết định áp dụng và lưu
```

Một phép tính học vụ chỉ có một implementation chính tại TV4. API và AI cùng sử dụng công cụ đó. Frontend không có bản công thức riêng; LLM không được thay công cụ bằng câu trả lời tự tính.

### 3.1. Điểm nối Frontend

TV3 export `createStudentRoutes({ api, ui })`. TV2 mount routes và truyền component/API client vào. TV3 không import ngược web host, không dựng layout, auth client hoặc ứng dụng React thứ hai. [S06]

### 3.2. Điểm nối Backend

`tv5-platform/contracts/` chứa Java DTO/ports, OpenAPI và JSON mẫu. TV1/TV4 chỉ phụ thuộc contracts; ứng dụng Boot TV5 phụ thuộc và ghép các module AI, Academic, contracts. TV5 implement `StudentContextProvider` và `ConversationStore`; TV1 không import repository/controller của TV5. [S06]

Bề mặt chức năng cần được TV5 tạo interface tại task 1.2:

- `AcademicFacade`: trạng thái học vụ, điều kiện môn, tạo/kiểm tra kế hoạch, mô phỏng, học cải thiện, mục tiêu ngược, Audit và đối chiếu.
- `AdvisorFacade`: xử lý hội thoại và trả answer, sources, actions, planProposal, warnings theo contract.
- `StudentContextProvider`: cung cấp hồ sơ đúng tài khoản đã xác thực.
- `ConversationStore`: đọc/ghi hội thoại thuộc người dùng được phép.

Danh sách này là giao tiếp logic để TV5 scaffold, không phải code/API V1 đã tồn tại. Không tạo DTO hoặc chốt chữ ký HTTP chi tiết trong task 1.1.

## 4. Folder và quyền sửa

Cây dưới đây là cấu trúc đích do TV5 tạo tại task 1.2. Trong task 1.1 chỉ có `tv1-ai/docs/` và tài liệu/nguồn bên trong.

```text
haui-advisor/
├── tv1-ai/                # TV1: AI library, RAG, tool adapter, docs
├── tv2-web/               # TV2: web host, UI/API client chung, học vụ
├── tv3-planner-ui/        # TV3: Planner, Chat, What-if, Profile
├── tv4-academic/          # TV4: công cụ Java, fixture và test học vụ
├── tv5-platform/
│   ├── contracts/        # DTO/ports, OpenAPI, JSON mẫu
│   ├── app/              # Boot runtime, API, auth, DB adapters
│   ├── infra/            # Docker/deploy
│   └── docs/
├── pom.xml               # TV5
├── package.json          # TV5
├── package-lock.json     # TV5
├── .github/              # TV5
└── AGENTS.md             # TV5 tạo từ solution này
```

| Owner | Viết chính | Không tự sửa |
|---|---|---|
| TV1 — Lead + AI | `tv1-ai/`; task 1.1 giới hạn ở `tv1-ai/docs/` | Folder TV2/TV3/TV4/TV5, root build, lockfile và contracts. |
| TV2 — FE nền tảng/học vụ | `tv2-web/`, UI/client chung, tài liệu/báo cáo phần TV2 | Gói TV3, logic học vụ, AI và root dependency/lockfile. |
| TV3 — FE kế hoạch/AI | `tv3-planner-ui/`, tài liệu/báo cáo phần TV3 | Web host, shared UI/API client và các module Java. |
| TV4 — Academic/Recommendation Tools | `tv4-academic/`, fixture, test và mô tả công cụ | Repository DB, controller, AI prompt và contracts do TV5 quản lý. |
| TV5 — Backend/DB/DevOps | `tv5-platform/`, root build/lockfile/CI/AGENTS | Code chức năng của owner khác sau khi bàn giao khung. |

**Ngoại lệ khởi tạo:** tại task 1.2, TV5 được scaffold các folder còn thiếu một lần. Phải giữ nguyên `tv1-ai/docs/` đã có; không xóa/tạo lại repository hoặc ghi đè nguồn. Sau scaffold, mỗi owner viết trong folder mình. Các quy tắc ownership được khóa khi gộp `base-v1` ở task 1.5. [S06 tasks 1.2, 1.5]

Thay đổi contract/dependency dùng chung do TV5 thực hiện qua PR có các consumer liên quan review. Folder riêng không cho phép thay đổi input/output mà không bàn giao. Một owner chỉ có một agent ghi vào cùng thư mục làm việc ở một thời điểm.

## 5. Dữ liệu, công cụ và AI

### 5.1. Dữ liệu và chính sách học vụ

TV5 lưu hồ sơ, CTĐT, môn/quan hệ, lịch sử các lần học, bản nhập tạm, điều kiện/chứng cứ Audit, kế hoạch, phiên bản và Chat. Các thực thể nền theo [S03 §8]; phần auth/import/version/chat/actions là bổ sung của [S06]. TV4 tạo fixture cho kiểm thử; TV5 dùng cùng fixture để seed, không tạo một bộ dữ liệu mẫu trái logic.

TV4 nhận context + policy + mục tiêu; dùng `BigDecimal` cho tính điểm theo solution. Các rule/giới hạn/trọng số trong PRD phải được giữ nguồn và phiên bản. Chưa có đối chiếu chính thức thì gắn `DEMO_UNVERIFIED`, không suy ra từ con số hoặc tên môn trên ảnh.

Thuật toán kế hoạch theo [S06]: lọc ràng buộc bắt buộc → xếp ưu tiên → phân bổ theo đồ thị/kỳ → kiểm tra lại phương án. Trọng số 40/25/20/15 đến từ [S03 §13.1], không phải xác suất AI trả lời đúng. Kết quả `NO_PLAN_FOUND` nghĩa là công cụ chưa tìm được phương án với đầu vào/ràng buộc hiện tại, không phải chứng minh mọi phương án đều bất khả thi.

### 5.2. Nhập và sử dụng bảng điểm

PDF có văn bản dùng parser; ảnh/PDF scan dùng OCR adapter ở phần triển khai TV5. Kết quả trích xuất là bản tạm; người dùng xem, sửa và xác nhận trước khi ghi dữ liệu. Trường không chắc chắn được đánh dấu cần sửa. Lỗi có nhánh thử lại/nhập tay. Task 1.1 không chạy OCR hoặc tạo dữ liệu học tập. [S04 luồng A; S06]

### 5.3. AI Advisor

TV1 triển khai Chat/RAG/tool calling; AI hỏi bổ sung khi cần, gọi công cụ để lấy kết quả và diễn giải có nguồn. Câu hỏi quy chế có thể kết thúc ngay trong Chat. Không ép mọi câu hỏi sinh ra Study Plan. [S03 FR-05–07; S06]

Danh tính người dùng lấy từ server, không tin `student_id` do LLM hoặc client tự yêu cầu. Không expose cho AI công cụ ghi điểm hoặc kích hoạt kế hoạch. Không đưa bảng điểm cá nhân vào kho vector tài liệu dùng chung. Tin nhắn Chat và phương án phải thuộc đúng tài khoản. [S06]

Mock/fake chỉ phục vụ phát triển và kiểm thử có nhãn. Chế độ live thiếu cấu hình hoặc lỗi phải báo rõ, không âm thầm chuyển sang câu trả lời giả. JSON Chat là điểm bắt đầu của solution; task này không thêm WebSocket hoặc framework AI khác. [S06]

## 6. Các luồng sử dụng cần dựng và code

Các luồng sau là đường đi của sản phẩm, không phải danh sách trang bắt buộc. Những ô “xử lý”, “xác nhận thành công” có thể là trạng thái trong cùng màn. Tên môn và điểm trong bản nháp là nội dung minh họa.

### F01 — Hồ sơ và bảng điểm → Dashboard

Đăng nhập → mở hồ sơ/bảng điểm → tải PDF/ảnh hoặc nhập tay/chọn mẫu demo → xử lý → xem lại/chỉnh dữ liệu → xác nhận lưu → Dashboard cập nhật → mở lại bảng điểm.

Hủy ở bước xem lại không ghi đè bảng điểm đã lưu. Lỗi tải/trích xuất có thử lại hoặc nhập tay. Sinh viên chưa có bảng điểm vẫn vào CTĐT và hỏi quy chế; các công cụ cần hồ sơ hiển thị bước bổ sung. [S03 §3, US-02; S04 luồng A; hành vi cụ thể S06]

### F02 — Dashboard → CTĐT / sơ đồ môn

Mở CTĐT → lọc/xem môn → xem chi tiết/quan hệ → quay lại. Khi đi từ một phương án kế hoạch, giữ ngữ cảnh phương án; chọn thêm môn đưa về Planner để xem và kiểm tra. Không mở một kế hoạch mới ngoài ý muốn. [S04 màn 4, luồng B; S06]

### F03 — Chat hỏi đáp học vụ

Mở Chat → gửi câu hỏi → AI hỏi lại nếu thiếu thông tin → truy xuất tài liệu và/hoặc công cụ → hiển thị câu trả lời, nguồn và hành động phù hợp → tiếp tục hội thoại.

Hỏi quy chế không bắt buộc mở Planner. Lỗi giữ câu hỏi và cho thử lại. Nội dung ngoài học vụ được phản hồi theo FR-06. Trạng thái xử lý chỉ mô tả tác vụ đang chạy, không trình bày như một kết quả đã hoàn thành. [S03 FR-05–07; S04 màn 2; S06]

### F04 — Chat → phương án → Planner

Hỏi lập lộ trình → bổ sung mục tiêu cần thiết → công cụ tạo phương án → xem đề xuất. Từ đây chọn: chấp nhận để xem lại tại Planner; chỉnh tiêu chí để nhận phương án khác; xem tree rồi quay lại; hoặc hủy/quay về Chat.

Planner cho chỉnh danh sách và mục tiêu → kiểm tra → lưu nháp hoặc bắt đầu theo dõi theo mục 7. AI không tự lưu/kích hoạt. Sơ đồ cây là lựa chọn, không phải cổng bắt buộc trước khi lưu. [S04 màn 3–5; S06]

### F05 — Mở Planner trực tiếp

Dashboard/menu → kế hoạch đã lưu hoặc tạo bản nháp → nhập mục tiêu chuẩn/học vượt, các kỳ và tải học → tạo/chỉnh phương án → kiểm tra → lưu → mở lại.

Luồng này chạy được bằng công cụ/API mà không cần cuộc hội thoại LLM. Chỉnh ACTIVE phải tạo bản nháp kế thừa. Học vượt/kỳ hè là tham số của cùng Planner, không phải một role hoặc app mới. [S03 FR-11/13, US-10/13; S06]

### F06 — What-if / học cải thiện / mục tiêu ngược

Dashboard/menu/kế hoạch → chọn công cụ cần dùng → thay đổi điểm hoặc mục tiêu → xem kết quả dự kiến. Có thể tiếp tục thử, chuyển sang công cụ khác hoặc thoát mà không áp dụng.

Khi chọn áp dụng: chọn/giữ kế hoạch đích → xem lại thay đổi trong Planner → kiểm tra → lưu hoặc hủy. Thử What-if không sửa bảng điểm; các công cụ không bắt sinh viên đi hết màn 6 → 7 → 8 như một chuỗi bắt buộc. [S04 màn 6–8; S06]

### F07 — Audit → phương án bù đắp → Planner

Dashboard/menu → xem checklist tiến độ → mở phần còn thiếu/chưa đủ thông tin → tạo phương án bù đắp → xem lại tại Planner → lưu/áp dụng hoặc hủy.

Điều kiện phi học phần như chứng chỉ được biểu diễn thành việc cần hoàn thành, không thành môn có tín chỉ. Chọn kế hoạch bù đắp không biến điều kiện thành đã hoàn thành. Thiếu thông tin trả `UNKNOWN`. Audit là hỗ trợ rà soát theo hồ sơ, không thay xác nhận tốt nghiệp của trường. [S03 FR-17/18; S04 màn 9; S06]

In/lưu PDF là một lựa chọn sau khi xem báo cáo, không phải bước bắt buộc để kết thúc luồng. [S05; S06]

### F08 — Mở lại và theo dõi qua học kỳ

Đăng nhập lại → mở kế hoạch đang theo dõi → xem mục tiêu/tiến độ → cập nhật kết quả học kỳ bằng luồng F01 → đối chiếu kết quả và kế hoạch → xem phần chưa hoàn thành/ảnh hưởng → tạo bản nháp điều chỉnh các kỳ tiếp theo → kiểm tra → lưu/áp dụng.

Không cần hỏi AI lại từ đầu để tiếp tục kế hoạch. Không đổi tất cả môn dự kiến thành đã đạt khi bấm lưu. US-13 yêu cầu theo dõi và đối chiếu sau mỗi học kỳ; các bước thao tác cụ thể lấy từ solution [S06].

## 7. Hành vi lưu nháp, kiểm tra, áp dụng và hủy

Tên trạng thái lấy từ [S03 §13.2]: `DRAFT → VALIDATED → ACTIVE → COMPLETED / ARCHIVED`. Bảng dưới đây cụ thể hóa theo [S06], không tuyên bố UI Flow gốc đã mô tả hết các hành vi này.

| Thao tác | Hành vi triển khai |
|---|---|
| Lưu nháp | Lưu kế hoạch `DRAFT` đang làm dở dù còn cảnh báo học vụ. Dữ liệu sai kiểu/cấu trúc vẫn phải được xử lý; lưu nháp không xác nhận kế hoạch hợp lệ. |
| Kiểm tra kế hoạch | Gọi công cụ TV4. Đủ điều kiện theo policy hiện tại thì `VALIDATED`; nếu không, giữ nháp và hiển thị lý do cần sửa. |
| Sửa bản đã kiểm tra | Thay đổi nội dung làm mất hiệu lực kết quả kiểm tra; bản chỉnh sửa về `DRAFT`. |
| Bắt đầu theo dõi | Server đọc revision/context hiện tại, kiểm tra lại và chuyển `ACTIVE`. Đây không phải đăng ký môn hoặc xác nhận của e-HaUI. |
| Nhiều phương án | Cho nhiều DRAFT; tối đa một ACTIVE cho một sinh viên tại một thời điểm theo solution này. |
| Chỉnh ACTIVE | Tạo DRAFT kế thừa, giữ bản ACTIVE cũ trong lúc thử/chỉnh. |
| Áp dụng phương án mới | Xem lại trong Planner; xác nhận lưu là thao tác riêng với xem thử. Nếu thay ACTIVE, archive bản cũ và kích hoạt bản mới trong cùng giao dịch. |
| Hủy phương án/chỉnh sửa chưa lưu | Không sửa dữ liệu đã lưu hoặc ACTIVE cũ. Không tự xóa một DRAFT đã lưu chỉ vì người dùng đóng màn. |
| Thoát khi còn thay đổi chưa lưu | Có lựa chọn quay lại, lưu nháp hoặc bỏ các thay đổi chưa lưu. |
| Lưu thất bại hoặc revision cũ | Giữ nội dung đang chỉnh, báo lỗi và cho tải/đối chiếu lại; không ghi đè âm thầm hoặc hiện thành công giả. |
| Đối soát/lưu lịch sử | `COMPLETED` theo nghĩa “đã đối soát kết quả” của PRD; `ARCHIVED` là lưu lịch sử. Không dùng chúng để khẳng định sinh viên đã tốt nghiệp. |

Mô phỏng, kết quả đề xuất, kế hoạch đã lưu và kết quả học tập được nhập là các lớp trạng thái khác nhau. Kết quả tương lai phải mang nhãn dự kiến. Không lấy thao tác lưu kế hoạch làm bằng chứng điểm thật đã tăng.

## 8. Quy tắc kiểm tra và báo trạng thái

Frontend hiển thị phản hồi nhanh; công cụ TV4 và kiểm tra phía server là phần quyết định nghiệp vụ. Không dùng việc disable nút làm bằng chứng API đã an toàn. [S06]

Mỗi phần cần phân biệt: chưa có dữ liệu; đang xử lý; dữ liệu thiếu; cảnh báo; không hợp lệ; chưa tìm được phương án; lỗi dịch vụ; thành công thật. Không biến trường chưa biết thành 0 hoặc “đạt”.

Không dùng “đã nghiệm thu” cho một hình chụp, một nhánh mock hoặc agent báo code xong. Những bước ứng dụng cần được chạy thực tế ở phase sau. Task 1.1 chỉ kiểm tra tài liệu và bảo toàn nguồn.

## 9. Các điểm không được âm thầm hòa trộn nguồn

| Nội dung trong nguồn | Cách ghi ở solution này | Phân loại |
|---|---|---|
| S04 §5 nói không cho lưu khi tải tín chỉ vi phạm. | S06 cho lưu DRAFT, nhưng chưa cho kích hoạt nếu không hợp lệ. | Bổ sung/thay đổi hành vi triển khai; giữ nguyên S04. |
| S03 §13.2 có tên trạng thái, chưa mô tả đầy đủ bản sao/version/một ACTIVE. | Dùng hành vi ở mục 7 từ S06. | Bổ sung triển khai, không gán là nguyên văn PRD. |
| S05 dùng các bước kích hoạt và câu chữ/nội dung môn/điểm mẫu. | Chỉ tham khảo bố cục/đường đi; tiêu chí bấm thử kiểm tra thao tác, không xác nhận số demo là thật. | Ảnh nháp chưa nghiệm thu. |
| S04 sơ đồ tổng quan nối nhiều màn liên tiếp; màn 3 lại có nhiều lựa chọn. | Giữ các nhánh lựa chọn, không ép đi qua tree/What-if/ROI nếu không có nhu cầu. | Diễn giải từ mô tả chi tiết và S06. |
| S03 G9/US-13 yêu cầu theo dõi qua kỳ; UI Flow chưa mô tả đầy đủ màn tiếp tục. | Luồng F08 làm rõ cách tiếp tục theo S06. | Bổ sung tương tác cho yêu cầu đã có. |
| S03 NFR-01 ghi What-if ≤ 1s; AC-04 dùng ≤ 500ms. | Giữ cả hai ở nguồn; task 1.1 không chọn lại ngưỡng, không ghi đã đạt. | Khác mức chỉ tiêu trong nguồn; không ảnh hưởng việc bàn giao tài liệu. |
| S03 ghi BR-01–10 là quy tắc HaUI. | Dẫn nguyên nguồn khi dùng; trạng thái DEMO_UNVERIFIED cho đến khi đối chiếu phù hợp. | Giới hạn bằng chứng, không tự đổi thành quy chế khác. |
| S04 có thông tin đánh giá cộng đồng; S05 có báo cáo. | Chỉ hiển thị thông tin có sẵn và in/lưu báo cáo theo giới hạn S06; không thêm hệ thống review/ký số. | Phạm vi solution, không sửa file gốc. |

Các số hiệu US/FR/BR/AC/NFR được giữ để truy vết về PRD. Không dùng solution này làm nguồn quy chế RAG chính thức; nó là tài liệu phát triển sản phẩm.

## 10. Tiêu chí bấm thử — dành cho phase prototype, CHƯA CHẠY

Bảng này là kịch bản tương lai. Dữ liệu và kết quả có thể là trạng thái dựng sẵn trong prototype, nhưng phải đi đúng nhánh. Qua prototype chỉ nghiệm thu tương tác; lưu thật, tính đúng, quyền truy cập và AI thật phải kiểm thử riêng lúc có code.

| Mã | Thao tác cần thử | Kết quả mong đợi | Căn cứ | Trạng thái |
|---|---|---|---|---|
| P01 | Từ Dashboard mở Chat, Planner, What-if, Audit rồi quay lại. | Có đường vào trực tiếp và đường quay lại; không bắt đi hết chuỗi demo. | S04 §2; S06 | CHƯA BẤM THỬ |
| P02 | Chưa có bảng điểm: mở CTĐT/Chat, thử chức năng cần hồ sơ. | Xem/hỏi chung được; phần cá nhân hóa hướng dẫn bổ sung hồ sơ. | S02; S06 | CHƯA BẤM THỬ |
| P03 | Nhập bảng điểm, xem lại, sửa, thử hủy rồi xác nhận ở lần khác. | Review trước khi lưu; hủy không thay bảng điểm đã có; lỗi có nhập tay/thử lại. | S04 luồng A; S06 | CHƯA BẤM THỬ |
| P04 | Trong Chat hỏi một câu quy chế. | Câu trả lời có chỗ xem nguồn; tiếp tục ở Chat, không buộc mở Planner. | S03 FR-05–07; S06 | CHƯA BẤM THỬ |
| P05 | Nhờ lập lộ trình rồi yêu cầu phương án khác. | Có hỏi bổ sung/đổi tiêu chí và xem phương án; chưa tự lưu. | S04 màn 2/3; S06 | CHƯA BẤM THỬ |
| P06 | Từ phương án đi thẳng Planner; lần khác mở tree rồi quay lại. | Cả hai đường hoạt động, giữ đúng ngữ cảnh phương án. | S04 màn 3–5 | CHƯA BẤM THỬ |
| P07 | Mở Planner trực tiếp, chỉnh, lưu nháp và mở lại mẫu. | Thực hiện được không qua Chat; phân biệt nháp với bắt đầu theo dõi. | S03 US-13; S06 | CHƯA BẤM THỬ |
| P08 | Chỉnh kế hoạch ACTIVE rồi hủy; lần khác áp dụng. | Hủy giữ bản cũ; áp dụng có màn xem lại và xác nhận. | S06 | CHƯA BẤM THỬ |
| P09 | Thử What-if rồi thoát; thử lại và chọn áp dụng. | Thoát không đổi kế hoạch; áp dụng đi về đúng Planner, không sửa bảng điểm. | S04 màn 6–8; S06 | CHƯA BẤM THỬ |
| P10 | Mở ROI hoặc mục tiêu ngược theo nhu cầu. | Không bắt đi qua toàn bộ công cụ; có quay lại/áp dụng/hủy. | S06 | CHƯA BẤM THỬ |
| P11 | Audit chọn phần còn thiếu và lập phương án bù đắp. | Đi về Planner để xem lại; không tự biến checklist thành đã hoàn thành. | S04 màn 9; S06 | CHƯA BẤM THỬ |
| P12 | Mở lại kế hoạch sau học kỳ, cập nhật kết quả mẫu và điều chỉnh. | Có luồng đối chiếu, biết phần cần sửa và lưu bản chỉnh; không phải tạo Chat mới. | S03 G9/US-13; S06 | CHƯA BẤM THỬ |
| P13 | Lưu lỗi, AI lỗi, rời màn khi chưa lưu. | Giữ nội dung, có thử lại hoặc quay về; không chuyển sang thành công giả. | S06 | CHƯA BẤM THỬ |

Đo hiệu năng và tính đúng toán học, xác thực quyền trên API, persistence thực tế, build và AI live không được đánh dấu PASS từ các ca bấm thử này.

## 11. Checklist tài liệu cho task 1.1

Các ô dưới đây để người review repo đích đánh dấu sau khi kiểm tra; không tự tick chỉ vì file đã được sinh ra.

- [ ] Có `tv1-ai/docs/solution-v1.md`, đọc được tiếng Việt và Markdown.
- [ ] Có đủ bảy file nguồn, SHA-256 khớp `source-manifest.json`.
- [ ] Chỉ một role người dùng STUDENT; đủ năm owner và vùng sửa tương ứng.
- [ ] Có hồ sơ/Chat/Planner/What-if/Audit và F08 theo dõi qua từng kỳ.
- [ ] Phân biệt lưu nháp, kiểm tra, áp dụng, hủy và dữ liệu dự kiến/thực tế.
- [ ] Phân biệt yêu cầu nguồn với bổ sung triển khai; giữ rõ tình trạng nháp/chưa duyệt.
- [ ] Tiêu chí P01–P13 vẫn ghi CHƯA BẤM THỬ khi chưa có bằng chứng.
- [ ] Không tạo source code ứng dụng, scaffold root hoặc folder của TV2–TV5.
- [ ] Không có khóa API, mật khẩu, `.env` thật hoặc dữ liệu sinh viên thực mới được đưa vào.
- [ ] Có diff/commit hoặc cách bàn giao tài liệu để TV5 đọc đúng phiên bản.

Review tài liệu và kiểm tra hash là các kiểm tra thực hiện được lúc này. Build FE/Backend, unit test học vụ, bấm prototype và AI live: **KHÔNG THỰC HIỆN TRONG TASK 1.1**.

## 12. Bàn giao cho TV5 — task 1.2

Sau khi TV1 review và đưa bộ tài liệu lên nhánh chung, TV5 đọc file này cùng [S06 task 1.2] để tạo khung build và contract V0.

TV5 tạo Maven multi-module cho contracts/AI/Academic/Boot, npm workspace cho web host/gói TV3, skeleton tối thiểu, root build/lockfile/CI/Compose và AGENTS.md. Giữ nguyên thư mục tài liệu đã có. Tạo AcademicFacade, AdvisorFacade, StudentContextProvider, ConversationStore và JSON/OpenAPI V0 theo solution; khóa phiên bản tương thích sau khi build khung được. Đây là việc của task 1.2, không phải task TV1 đang thực hiện.

Các mốc tiếp theo giữ nguyên kế hoạch:

```text
1.1 TV1: tài liệu này + nguồn → TV1 review và bàn giao
  ↓
1.2 TV5: scaffold + contracts V0 + build kiểm tra
  ↓
1.3a TV2: UI/client dùng chung
1.3b TV4: fixture và test công cụ      (các nhánh đủ đầu vào chạy song song)
1.3c TV1: khung AI/fake tools
  ↓ khi 1.3a sẵn sàng
1.4 TV3: feature package
  ↓
1.5 TV5: gộp khung base-v1
```

**Task 1.1 kết thúc ở tài liệu đã review/bàn giao. TV1 chưa chuyển sang code AI task 1.3c cho đến khi TV5 bàn giao task 1.2.** Trong lúc chờ, không tự tạo một Backend khác.
