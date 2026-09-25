# HAUI ADVISOR — SOLUTION VÀ THỨ TỰ GIAO AGENT

Đây là kế hoạch triển khai mới dựa trên các tệp đính kèm, không phải xác nhận code hay ảnh đã được duyệt. Giữ phạm vi/role từ tài liệu; kiến trúc folder, dependencies và các hành vi bổ sung dưới đây là solution của kế hoạch này.

## Quy tắc đọc
Chỉ chờ các mã trong dòng 'Chờ'. Cùng đợt/các task không có quan hệ phụ thuộc có thể chạy song song nếu khác owner/folder. Một role chỉ có một agent ghi code trong folder ở một thời điểm. Khi role có nhiều task đủ điều kiện, hoàn thành task đang làm trước. Phase 4 được nối từng nhánh đã sẵn sàng; không chờ cả Phase 3 xong. 'Bàn giao' nghĩa là PR/artifact đã merge, test chạy và có hướng dẫn gọi.

## Solution
### Phạm vi
Giữ 1 role STUDENT; hồ sơ/bảng điểm, Dashboard, CTĐT/tree, Chat, Planner chuẩn/học vượt, What-if/ROI/mục tiêu ngược, Audit và theo dõi từng kỳ.
Nguồn/phạm vi: PRD §3, US-01–13; Brief Target Audience. Loại: Từ tài liệu.

### Công nghệ
ReactJS + Vite + React Router; Java Spring Boot + Spring AI/Gemini; PostgreSQL + pgvector; Spring Security session cookie/CSRF; Docker Compose. Khóa version tương thích tại 1.2.
Nguồn/phạm vi: Ngôn ngữ từ yêu cầu; lựa chọn thư viện của solution này. Loại: Bổ sung triển khai.

### Một runtime
Một web host, một ứng dụng Spring Boot, một database. AI và Academic là thư viện Java, không phải microservice. Thư mục theo người không tương đương service triển khai.
Nguồn/phạm vi: Maven multi-module; solution. Loại: Bổ sung triển khai.

### Frontend không vòng phụ thuộc
TV3 export createStudentRoutes({api, ui}); TV2 mount routes và truyền API client/component. TV3 không import web host, không viết layout/auth/client thứ hai; mỗi gói có test riêng.
Nguồn/phạm vi: Solution. Loại: Bổ sung triển khai.

### Backend không vòng phụ thuộc
Contracts chứa DTO và interface. TV1/TV4 chỉ phụ thuộc contracts. Boot của TV5 phụ thuộc AI/Academic/contracts và implement StudentContextProvider/ConversationStore. TV1 không import repository/controller của TV5.
Nguồn/phạm vi: Solution. Loại: Bổ sung triển khai.

### Contract gốc
TV5 sở hữu tv5-platform/contracts gồm Java DTO/ports + OpenAPI V1 + fixture JSON. AcademicFacade: academic status, eligibility, generate/validate plan, simulate, retake, target, audit, reconcile. Mọi đổi schema qua PR; các bên dùng đọc, không cùng sửa.
Nguồn/phạm vi: PRD FR-03–18; solution. Loại: Bổ sung triển khai.

### Công cụ học vụ
TV4 viết hàm Java nhận context + policy + mục tiêu; dùng BigDecimal, không DB/HTTP/LLM. Giữ scoring 40/25/20/15 từ PRD; hard constraints lọc trước scoring; greedy theo đồ thị có kiểm tra cuối. NO_PLAN_FOUND không phải chứng minh bài toán vô nghiệm.
Nguồn/phạm vi: PRD §9, §13.1. Loại: Từ tài liệu + lựa chọn thuật toán.

### Quy tắc demo
Các ngưỡng/rule trong PRD được cấu hình và gắn DEMO_UNVERIFIED; không xem tên môn/số trong ảnh là dữ kiện sản xuất. Tài liệu cung cấp chưa chứng minh đó là quy chế HaUI chính thức. Missing data trả UNKNOWN. Audit không tự xác nhận tốt nghiệp thay trường.
Nguồn/phạm vi: File nguồn chưa được duyệt; yêu cầu của người dùng. Loại: Giới hạn nguồn.

### Dữ liệu
TV5 giữ hồ sơ/CTĐT/version/course/relation/offering/enrollment attempts, import session, audit requirements/actions, kế hoạch và chat. TV4 giữ fixture gốc cho test; TV5 seed DB từ cùng fixture, không tạo một bộ logic/fixture mâu thuẫn.
Nguồn/phạm vi: PRD §8 là nền; bổ sung version, attempt, auth, import, audit evidence, chat. Loại: Từ tài liệu + bổ sung.

### Nhập bảng điểm
PDF có text: parser. Ảnh/PDF scan: OCR adapter. Chỉ lưu sau màn review/confirm; lỗi cho nhập tay. Cần bảo toàn tên/mã môn không chắc chắn thành mục cần sửa. Không đăng nhập hoặc crawl e-HaUI.
Nguồn/phạm vi: UI Flow luồng A; PRD FR-02/out of scope. Loại: Từ tài liệu + cơ chế xử lý.

### Kế hoạch
Giữ DRAFT→VALIDATED→ACTIVE→COMPLETED/ARCHIVED. Cho lưu bản nháp chưa hợp lệ về học vụ; sửa nội dung hủy validation; ACTIVE revalidate trên revision hiện tại. Một ACTIVE/sinh viên; sửa ACTIVE tạo DRAFT kế thừa; áp dụng mới archive bản cũ trong transaction.
Nguồn/phạm vi: PRD §13.2 giữ tên; hành vi lưu nháp/version/1 ACTIVE do solution này bổ sung. Loại: Điểm thay đổi cần biết.

### What-if và Audit
Xem thử không sửa bảng điểm/ACTIVE. Áp dụng→Planner→xem lại→lưu. Chứng chỉ/chuẩn đầu ra là action trong kế hoạch, không biến thành môn có tín chỉ. Không có thông tin trả UNKNOWN; trạng thái tương lai có nhãn dự kiến.
Nguồn/phạm vi: UI Flow màn 5–9 + solution. Loại: Từ tài liệu + hành vi cụ thể.

### AI
TV1: RAG→công cụ học vụ→giải thích có nguồn/action/proposal. StudentContext lấy từ server, không tin student_id LLM/client. Không expose tool ghi điểm/activate. RAG dùng tài liệu dùng chung; không đưa bảng điểm vào vector store chung. JSON chat trước; không buộc làm WebSocket.
Nguồn/phạm vi: Brief Solution; PRD FR-05–07; Spring AI docs. Loại: Từ tài liệu + lựa chọn triển khai.

### Ngoài luồng chính
Báo cáo cá nhân dùng print CSS/in PDF theo ảnh Audit; không bổ sung ký số/diễn đàn đánh giá hai chiều/voice/đăng ký môn trên e-HaUI. Thông tin giảng viên/đánh giá trong tra cứu chỉ hiển thị nếu có dữ liệu, không tạo hệ thống cộng đồng mới.
Nguồn/phạm vi: Ảnh luồng Audit; UI Flow B; PRD out of scope và future enhancements. Loại: Phân tách phạm vi bản này.

### Bàn giao
Một task xong = code/artifact đã merge + test thuộc phạm vi chạy + input/output/cách chạy rõ. Xong mock không bằng đã tích hợp. Thiếu key/tài liệu chính thức/test live ghi chưa kiểm thử, không dựng số PASS.
Nguồn/phạm vi: Solution quy trình. Loại: Quy trình.

### Không đụng code
Một role một folder. Root files/lockfile/migration/contracts chỉ TV5 ghi; TV5 chỉ được scaffold folder khác tại 1.2 trước handoff. Sau đó sửa đúng folder, các thay đổi liên quan phải được consumer review và integration test.
Nguồn/phạm vi: Solution quy trình. Loại: Quy trình.

## Cấu trúc repository
```text
haui-advisor/
  tv1-ai/           # Maven library: AI, RAG, tool adapter
  tv2-web/          # React host: shell, UI/client chung, học vụ
  tv3-planner-ui/   # React feature package: Planner/Chat/What-if
  tv4-academic/     # Maven library: công cụ học vụ
  tv5-platform/
    contracts/     # Java DTO/ports + OpenAPI + fixture
    app/           # Spring Boot runtime + adapters + persistence
    infra/         # Docker/deploy
  pom.xml           # TV5
  package.json      # TV5
  package-lock.json # TV5
  .github/          # TV5
  AGENTS.md         # TV5 cập nhật từ solution TV1
```

## Prompt tiền tố cho mỗi task
```text
Đọc AGENTS.md, solution-v1.md và contract version được ghi trong task.
Chỉ triển khai TASK_ID được giao trong folder của OWNER.
Đọc repository trước khi sửa; không tạo lại dự án khi khung đã có.
Kiểm tra các task 'Chờ' đã được bàn giao đúng revision. Nếu chưa, dừng phần phụ thuộc và báo mã bị chặn.
Không thay schema/root/lockfile/migration/folder người khác để làm task mình chạy được.
Thực hiện code/test trực tiếp; không chỉ trả plan.
Dùng fake/mock chỉ cho dev/test có nhãn. Không âm thầm fallback mock trong live.
Không tự bịa quy chế; dùng policy demo và gắn phiên bản.
Không push main, chạy lệnh phá dữ liệu, đưa secrets vào source hoặc log.
Chạy build/test phù hợp, review diff. Báo file sửa, lệnh chạy, kết quả thực, phần còn mock/chưa kiểm thử.
Bàn giao PR/commit và input/output để người nhận gọi được.
```

## Phase 1 — Khởi tạo nền tảng chung

### 1.1 — TV1 Lead + AI — Ghi solution và phạm vi vào repository
**Đợt:** A. **Folder:** `tv1-ai/`.
**Chờ:** Không; bắt đầu đầu tiên.

```text
Tạo tv1-ai/docs/solution-v1.md bằng solution trong kế hoạch này. Ghi một role STUDENT; các luồng từ hồ sơ đến Chat, Planner, What-if, Audit và theo dõi. Ghi hành vi lưu nháp/áp dụng/hủy, ranh giới folder và tiêu chí bấm thử. Giữ file nguồn gốc, không biến ảnh nháp thành bản đã nghiệm thu.
```
**Bàn giao:** solution-v1 + danh sách luồng; TV5 dùng để dựng khung.
**Kiểm thử/nghiệm thu:** TV5 đọc và đối chiếu đủ 5 vùng ownership; không thiếu luồng US-13.
**Căn cứ:** Workbook Phân công!A4:B8; PRD §3, US-01–13; UI Flow §2–5.

### 1.2 — TV5 Backend/DB/DevOps — Tạo khung build và contract V0
**Đợt:** B. **Folder:** `tv5-platform/`.
**Chờ:** 1.1

```text
Tạo 5 folder; Maven multi-module cho contracts, AI, academic và ứng dụng Boot; npm workspace cho web host và gói UI của TV3. Tạo skeleton rỗng một lần, root build files, lockfiles, Compose, CI và AGENTS.md. Trong contracts tạo DTO/ports AcademicFacade, AdvisorFacade, StudentContextProvider, ConversationStore; OpenAPI V0 và JSON fixture. Khóa phiên bản tương thích sau khi build khung thành công.
```
**Bàn giao:** bootstrap-v0 đã merge; build scripts, contract V0 và mock fixture.
**Kiểm thử/nghiệm thu:** Build Java và FE skeleton; không có dependency vòng. Live chưa triển khai trả lỗi rõ; mock chỉ bật trong dev/test.
**Căn cứ:** Solution triển khai bổ sung.

### 1.3a — TV2 FE nền tảng/học vụ — Code web host và bộ UI V0
**Đợt:** C · song song. **Folder:** `tv2-web/`.
**Chờ:** 1.2

```text
Code layout, sidebar, router và API client duy nhất. Tạo Button, Card, Table, Modal, Loading, Error và EmptyState; CSS variables dùng chung. Mount hàm createStudentRoutes({api, ui}) do gói TV3 export; dùng placeholder khi tính năng chưa có.
```
**Bàn giao:** ui-api-v0: thư viện UI, API client và giao tiếp route cho TV3.
**Kiểm thử/nghiệm thu:** App chạy; demo page dùng được UI + mock API; không gọi LLM từ trình duyệt.
**Căn cứ:** Solution triển khai bổ sung.

### 1.3b — TV4 Academic/Recommendation Tools — Tạo fixture và test harness học vụ
**Đợt:** C · song song. **Folder:** `tv4-academic/`.
**Chờ:** 1.2

```text
Tạo bộ hồ sơ/CTĐT mẫu theo schema chung; policy-demo.json giữ quy tắc và trọng số từ PRD, gắn DEMO_UNVERIFIED. Tạo harness kiểm thử AcademicFacade với input/output rõ ràng. Không nối database hoặc LLM.
```
**Bàn giao:** fixture học vụ V0 + test harness để TV1/TV5 dùng.
**Kiểm thử/nghiệm thu:** Fixture qua schema; trường chưa biết không biến thành 0/đã đạt.
**Căn cứ:** PRD §8, §9, §13.1 + solution.

### 1.3c — TV1 Lead + AI — Code khung AI và fake tool
**Đợt:** C · song song. **Folder:** `tv1-ai/`.
**Chờ:** 1.2

```text
Implement khung AdvisorFacade, ToolAdapter, cấu hình ai.mode=mock/live và test bằng fake model/fake AcademicFacade. Result gồm answer, sources, actions, planProposal, warnings. Không cho fake model tự xuất hiện trong live.
```
**Bàn giao:** AI skeleton + hợp đồng Chat có thể test độc lập.
**Kiểm thử/nghiệm thu:** Mock response đúng schema; live thiếu cấu hình báo chưa sẵn sàng.
**Căn cứ:** Solution triển khai bổ sung.

### 1.4 — TV3 FE kế hoạch/AI — Code khung feature UI
**Đợt:** D. **Folder:** `tv3-planner-ui/`.
**Chờ:** 1.3a

```text
Tạo gói React export createStudentRoutes({api, ui}); dựng Planner, Chat, What-if, Profile rỗng với loading/error/empty. Dùng UI và API client được truyền từ TV2, không tạo app/layout/auth/client thứ hai.
```
**Bàn giao:** Gói feature mount được vào host TV2.
**Kiểm thử/nghiệm thu:** Mở được route của TV3; không có import ngược vào web host.
**Căn cứ:** Solution triển khai bổ sung.

### 1.5 — TV5 Backend/DB/DevOps — Gộp khung và khóa ownership
**Đợt:** E. **Folder:** `tv5-platform/`.
**Chờ:** 1.3a, 1.3b, 1.3c, 1.4

```text
Gộp các PR bootstrap, nối script build/test và smoke check. Từ mốc này không sửa folder người khác; TV5 chỉ giữ root files, contracts, migration và platform. Thêm kiểm tra đường dẫn thay đổi, luôn loại secrets khỏi source.
```
**Bàn giao:** base-v1 đã merge để cả nhóm bắt đầu Phase 2.
**Kiểm thử/nghiệm thu:** Fresh checkout chạy được hướng dẫn; tất cả module build; không cần AI key để chạy test mock.
**Căn cứ:** Solution triển khai bổ sung.

## Phase 2 — Prototype và contract V1

### 2.1 — TV2 FE nền tảng/học vụ — Dựng bộ giao diện mẫu trên Stitch
**Đợt:** A. **Folder:** `tv2-web/`.
**Chờ:** 1.5

```text
Dựng sidebar/header, Dashboard mẫu và token giao diện. Lưu link/ảnh/token trong tv2-web/design. Bàn giao bộ khung ngay khi dùng được, không đợi làm hết màn học vụ.
```
**Bàn giao:** design-base-v1 cho TV3 dựng cùng phong cách.
**Kiểm thử/nghiệm thu:** TV1 xem được mẫu; có menu, component và states để tái dùng.
**Căn cứ:** Solution triển khai bổ sung.

### 2.2c — TV4 Academic/Recommendation Tools — Viết đặc tả công cụ chạy được bằng test
**Đợt:** A · song song với 2.1. **Folder:** `tv4-academic/`.
**Chờ:** 1.5

```text
Viết bảng test/input/output cho 9 capability trong solution; giữ hard constraints tách khỏi scoring. Ghi điều kiện kỳ tương lai, tham số học vượt/kỳ hè và kết quả thiếu dữ kiện. Ghi đặc tả còn thiếu vào policy demo, không đoán quy chế chính thức.
```
**Bàn giao:** Academic spec V1, fixture và test cho TV5 khóa contract.
**Kiểm thử/nghiệm thu:** Input/output không mâu thuẫn giữa academic status, plan, simulation và audit.
**Căn cứ:** PRD FR-03/04/08–18, §9, §13.

### 2.2d — TV5 Backend/DB/DevOps — Tạo migration và API contract đầy đủ
**Đợt:** A · song song với 2.1. **Folder:** `tv5-platform/`.
**Chờ:** 1.5

```text
Tạo migration users, student, curriculum/version, course/relation/offering, enrollment_attempt, audit_requirement, import_session, study_plan/semester/course/action, chat và nguồn tri thức. Tạo OpenAPI/DTO cho các thao tác read/preview/validate/save/activate. Tạo port lấy StudentContext và version để phát hiện dữ liệu thay đổi.
```
**Bàn giao:** DB/schema/API candidate V1 và fixtures.
**Kiểm thử/nghiệm thu:** Migration chạy trên DB test; schema ví dụ đồng nhất; các request không tin student_id do client gửi.
**Căn cứ:** PRD §8 là dữ liệu gốc; session/auth/attempt/version/import/chat là bổ sung triển khai.

### 2.2e — TV1 Lead + AI — Tạo kịch bản Chat và nguồn RAG
**Đợt:** A · song song với 2.1. **Folder:** `tv1-ai/`.
**Chờ:** 1.5

```text
Tạo các ca hội thoại hỏi quy chế, nợ môn, lộ trình, học vượt, What-if, Audit, đổi mục tiêu và thiếu bảng điểm. Tạo metadata source_id, section, version cho tài liệu đưa vào RAG. Khi chưa có tài liệu quy chế gốc, dùng tài liệu demo có nhãn và ghi thiếu nguồn, không tuyên bố đã kiểm chứng.
```
**Bàn giao:** Chat spec và bộ eval input/expected tool/source; nội dung cho UI Chat.
**Kiểm thử/nghiệm thu:** Mỗi ca có trạng thái hỏi lại/lỗi/nguồn; không tạo nguồn giả.
**Căn cứ:** PRD FR-05–07; Brief Solution.

### 2.2a — TV2 FE nền tảng/học vụ — Dựng prototype các màn học vụ
**Đợt:** B · song song. **Folder:** `tv2-web/`.
**Chờ:** 2.1

```text
Dựng Login, bảng điểm tải/nhập→xem lại→xác nhận, CTĐT, tree, Dashboard, Audit và đường sang kế hoạch. Thêm nhánh chưa có bảng điểm/lỗi tải/nhập tay/quay lại. Thể hiện báo cáo in/PDF như lựa chọn, không bước bắt buộc.
```
**Bàn giao:** Prototype học vụ nối vào khung chung.
**Kiểm thử/nghiệm thu:** Bấm được luồng nhập bảng điểm, tra cứu và Audit; không cần data/AI thật.
**Căn cứ:** UI Flow màn 1/4/9, luồng A/B; ảnh Audit + solution.

### 2.2b — TV3 FE kế hoạch/AI — Dựng prototype Planner/Chat/What-if
**Đợt:** B · song song. **Folder:** `tv3-planner-ui/`.
**Chờ:** 2.1

```text
Dựng Chat, phương án, kế hoạch nhiều kỳ, mô phỏng/ROI/mục tiêu ngược/học vượt và Profile. Có nhánh chấp nhận, phương án khác, hủy, lưu nháp, bắt đầu theo dõi, mở lại. AI/What-if/Audit cùng về một Planner; xem tree là tùy chọn.
```
**Bàn giao:** Prototype tương tác phần TV3 ghép với TV2.
**Kiểm thử/nghiệm thu:** Tự bấm Chat→đề xuất→sửa→lưu→mở lại; thử What-if rồi thoát không thay bản đang theo dõi.
**Căn cứ:** UI Flow màn 2/3/5/6/7/8; PRD US-10/13 + solution.

### 2.3 — TV1 Lead + AI — Review một prototype và ghi bản chốt luồng
**Đợt:** C. **Folder:** `tv1-ai/`.
**Chờ:** 2.2a, 2.2b, 2.2c, 2.2d, 2.2e

```text
Bấm các nhánh của prototype; yêu cầu owner sửa ngay lỗi điều hướng và trạng thái. Ghi flow-approved-v1 với thay đổi triển khai so với bản nháp: lưu nháp khác kích hoạt, dự kiến khác thực tế, áp dụng có xác nhận. Không soi tên môn/số demo để kết luận flow sai.
```
**Bàn giao:** flow-approved-v1 + danh sách thay đổi cho contract.
**Kiểm thử/nghiệm thu:** Các luồng vào trực tiếp/quay lại/hủy/mở lại chạy bằng kịch bản mẫu. Chưa đánh dấu hệ thống thật PASS.
**Căn cứ:** Solution triển khai bổ sung.

### 2.4 — TV5 Backend/DB/DevOps — Phát hành contract V1 để 5 người code
**Đợt:** D. **Folder:** `tv5-platform/`.
**Chờ:** 2.3

```text
Cập nhật OpenAPI, Java DTO/ports và JSON fixtures theo bản chốt. Chạy contract tests; phát hành contracts-v1. Cung cấp fixture cho FE, fake provider cho AI và input cho TV4; thay đổi sau mốc này phải có PR của owner và kiểm tra phía sử dụng.
```
**Bàn giao:** contracts-v1 đã merge; bản chốt đầu vào cho Phase 3.
**Kiểm thử/nghiệm thu:** Không có hai tên/trường khác nhau cho cùng dữ liệu; ví dụ và DTO qua test.
**Căn cứ:** Solution triển khai bổ sung.

## Phase 3 — Code độc lập, bàn giao từng phần

### 3.1 — TV4 Academic/Recommendation Tools — Code học vụ nền tảng và Audit
**Đợt:** A · song song. **Folder:** `tv4-academic/`.
**Chờ:** 2.4

```text
Implement GPA/CPA bằng BigDecimal, tín chỉ, trạng thái học phần và lịch sử học nhiều lần theo policy. Kiểm tra prerequisite/prior/corequisite, cảnh báo, checklist tốt nghiệp. Tách kết quả thực tế/dự kiến; thiếu thông tin trả UNKNOWN. Không HTTP/DB/LLM.
```
**Bàn giao:** academic-core-ready: công cụ lõi và test.
**Kiểm thử/nghiệm thu:** Test pass/fail/in-progress/retake/unknown/cycle; cùng input cho cùng output.
**Căn cứ:** PRD FR-03/04/08/09/17/18 + solution.

### 3.2 — TV5 Backend/DB/DevOps — Code tài khoản, dữ liệu và nhập bảng điểm
**Đợt:** A · song song. **Folder:** `tv5-platform/`.
**Chờ:** 2.4

```text
Code Spring Security session cookie + CSRF, chỉ STUDENT, truy vấn theo principal. Code hồ sơ, CTĐT, bảng điểm, trạng thái chứng chỉ tự khai báo/demo và seed fixtures. Với PDF có text dùng parser; ảnh/PDF scan qua bộ OCR, sau đó review→confirm; parser/OCR lỗi cho nhập tay. Không làm đăng nhập/crawl portal trường.
```
**Bàn giao:** data-api-ready: đăng nhập, lưu/đọc hồ sơ và nhập bảng điểm.
**Kiểm thử/nghiệm thu:** Hai tài khoản không đọc chéo; import review trước commit; upload có giới hạn; điểm parser không phải nguồn tính CPA.
**Căn cứ:** PRD FR-01/02, NFR-03; UI Flow luồng A + solution.

### 3.3 — TV1 Lead + AI — Code RAG và đọc nguồn
**Đợt:** A · song song. **Folder:** `tv1-ai/`.
**Chờ:** 2.4

```text
Code pipeline đọc tài liệu, chunk, metadata nguồn/version và pgvector adapter. Code retriever, câu trả lời có nguồn và tình huống không có căn cứ. Test bằng vector store/model giả lập; live dùng provider cấu hình server. Chỉ index tài liệu dùng chung, không index bảng điểm cá nhân vào kho chung.
```
**Bàn giao:** rag-ready: RAG module và bộ test.
**Kiểm thử/nghiệm thu:** Nguồn hiển thị phải tồn tại trong retrieved context; không nguồn thì nói thiếu thông tin.
**Căn cứ:** Brief Solution; PRD FR-07 + solution.

### 3.4 — TV2 FE nền tảng/học vụ — Code FE học vụ bằng contract mock
**Đợt:** A · song song. **Folder:** `tv2-web/`.
**Chờ:** 2.4

```text
Code Login, Dashboard, nhập/xem bảng điểm, CTĐT và tree. Dùng một API client, một layout, một bộ component. Tree chuyển course_id/plan_id sang Planner qua route chung. Không tính GPA/eligibility riêng trong JS; mock đáp ứng schema V1.
```
**Bàn giao:** academic-ui-ready: màn học vụ và test mock.
**Kiểm thử/nghiệm thu:** Vitest/UI tests; loading/error/empty; xác nhận nhập, xem lại, quay lại hoạt động.
**Căn cứ:** Workbook TV2; UI Flow màn 1/4 và luồng A/B.

### 3.5 — TV3 FE kế hoạch/AI — Code Planner bằng contract mock
**Đợt:** A · song song. **Folder:** `tv3-planner-ui/`.
**Chờ:** 2.4

```text
Code danh sách/kế hoạch nhiều kỳ, phương án, thêm/bớt/chuyển môn, cảnh báo validation. DRAFT lưu được khi dữ liệu đúng định dạng; kích hoạt phải kiểm tra nghiệp vụ. Sửa ACTIVE tạo DRAFT kế thừa, hủy giữ bản cũ. Dùng injected api/ui từ TV2.
```
**Bàn giao:** planner-ui-ready: Planner, lưu/hủy/mở lại bằng mock.
**Kiểm thử/nghiệm thu:** UI test thêm/sửa/hủy; chấp nhận không bắt buộc xem tree; lưu lỗi không mất nội dung.
**Căn cứ:** Workbook TV3; PRD US-06/13, §13.2 + solution.

### 3.6 — TV4 Academic/Recommendation Tools — Code bộ tạo lộ trình
**Đợt:** B · theo hàng TV4. **Folder:** `tv4-academic/`.
**Chờ:** 3.1

```text
Implement eligibility→ranking→phân bổ theo kỳ→validate cuối. Tính score 40/25/20/15 theo phụ lục PRD, chuẩn hóa thành phần có dữ liệu. Lập đồ thị tiên quyết, gom song hành, kiểm tra mùa mở lớp, chế độ chuẩn/học vượt/kỳ hè. Nếu không tìm được phương án trả NO_PLAN_FOUND + lý do, không khẳng định vô nghiệm toàn cục. Lịch chưa có dữ liệu đánh dấu giả định.
```
**Bàn giao:** planner-tool-ready: generate/validate plan độc lập.
**Kiểm thử/nghiệm thu:** Không đưa môn vi phạm vào phương án hợp lệ; môn kỳ tương lai có giả định đạt môn trước; lỗi/cycle/thiếu offering có lý do.
**Căn cứ:** PRD FR-10–13, US-10, §13.1 + lựa chọn thuật toán greedy theo ràng buộc.

### 3.7 — TV5 Backend/DB/DevOps — Code lưu kế hoạch, hội thoại và theo dõi
**Đợt:** B · theo hàng TV5. **Folder:** `tv5-platform/`.
**Chờ:** 3.2

```text
Code plan CRUD, bản nháp kế thừa, trạng thái, optimistic version, chat history/import session/plan actions. Kích hoạt một kế hoạch bằng transaction và kiểm tra revision hồ sơ/policy/plan; một ACTIVE/sinh viên trong solution này. Code StudentContextProvider/ConversationStore. Chưa có tool thật thì giữ stub NOT_READY, chỉ mock trong dev/test.
```
**Bàn giao:** persistence-ready: plan/chat storage và context provider.
**Kiểm thử/nghiệm thu:** Lưu/mở lại/hủy/sửa đồng thời/import lặp; không chéo tài khoản; không ACTIVE khi validation chưa có thật.
**Căn cứ:** PRD G9/US-13, §13.2 + hành vi bổ sung.

### 3.8 — TV1 Lead + AI — Code hội thoại và tool calling
**Đợt:** B · theo hàng TV1. **Folder:** `tv1-ai/`.
**Chờ:** 3.3

```text
Implement AdvisorFacade bằng Spring AI/Gemini. ToolAdapter gọi AcademicFacade qua interface và lấy StudentContext từ port server; không expose student_id cho model lựa chọn. Gọi tool→kiểm schema→giải thích; giới hạn vòng/timeouts. Chỉ đọc/tính/tạo proposal, không cấp tool ghi điểm hoặc kích hoạt. Cấu trúc học phần/điểm lấy nguyên từ tool; model chỉ sinh lời giải thích.
```
**Bàn giao:** advisor-ready: AI với fake tool/provider và eval.
**Kiểm thử/nghiệm thu:** Đổi mục tiêu, thiếu input, tool lỗi, nguồn sai, timeout; mock/live tách rõ.
**Căn cứ:** Workbook TV1; PRD FR-05–07; Spring AI docs + solution.

### 3.9 — TV2 FE nền tảng/học vụ — Code Audit, tiến độ, báo cáo mẫu
**Đợt:** B · theo hàng TV2. **Folder:** `tv2-web/`.
**Chờ:** 3.4

```text
Code Audit checklist/warning/đường bù đắp, tiến độ Dashboard và nút mở kế hoạch cũ. Code report với print CSS để sinh viên in/lưu PDF, ghi rõ báo cáo hiện tại hay dự kiến. Viết phần báo cáo FE học vụ tại tv2-web/docs/report; chưa gom file của người khác.
```
**Bàn giao:** audit-ui-ready + báo cáo phần TV2.
**Kiểm thử/nghiệm thu:** UI test trạng thái đạt/thiếu/chưa biết; bản in không lẫn dự kiến với thực tế.
**Căn cứ:** UI Flow màn 9; ảnh luồng Audit bước 6–7; Workbook TV2.

### 3.10 — TV3 FE kế hoạch/AI — Code What-if, ROI và mục tiêu ngược
**Đợt:** B · theo hàng TV3. **Folder:** `tv3-planner-ui/`.
**Chờ:** 3.5

```text
Code 3 công cụ tại cùng nhóm What-if, vào trực tiếp từng công cụ; chọn điểm/nhận kết quả mock, chọn môn cải thiện. Áp dụng tạo thay đổi cho Planner để xem lại; chỉ thử/thoát không sửa bảng điểm hoặc ACTIVE. Debounce request, bỏ response cũ đến muộn.
```
**Bàn giao:** simulation-ui-ready.
**Kiểm thử/nghiệm thu:** UI test nhập liên tiếp/response muộn/hủy/áp dụng; không gọi AI để kéo slider.
**Căn cứ:** PRD FR-14–16; UI Flow màn 6/7/8 + solution.

### 3.11 — TV4 Academic/Recommendation Tools — Code mô phỏng và đối chiếu tiến độ
**Đợt:** C · theo hàng TV4. **Folder:** `tv4-academic/`.
**Chờ:** 3.6

```text
Implement simulateGrades, rankRetakeCourses, calculateTargetGrades, reconcileStudyPlan. Dùng cùng cách tính GPA/CPA; ROI theo mỗi tín chỉ như PRD. Tính mục tiêu ngược từ tổng điểm có trọng số; ngưỡng cao hơn khả năng trả không đạt theo giả định, không bịa mức điểm. Audit tạo action cho chứng chỉ thay vì đổi chúng thành tín chỉ môn học.
```
**Bàn giao:** simulation-tools-ready + toàn bộ AcademicFacade.
**Kiểm thử/nghiệm thu:** Kết quả mô phỏng không đổi input; test retake/unknown/unattainable/no remaining credits/đối chiếu học kỳ.
**Căn cứ:** PRD FR-14–18, US-13; UI Flow màn 6–9 + solution.

### 3.12 — TV3 FE kế hoạch/AI — Code Chat, Profile và báo cáo phần TV3
**Đợt:** C · theo hàng TV3. **Folder:** `tv3-planner-ui/`.
**Chờ:** 3.10

```text
Code Chat lịch sử/nguồn/action card/thử lại; link attachment mở luồng nhập bảng điểm chung của TV2. Profile và trạng thái chưa có hồ sơ. Chat hỏi quy chế ở nguyên hội thoại; proposal mở Planner. Gửi nhận JSON trước, không thêm WebSocket ngoài phạm vi. Viết docs/report phần TV3.
```
**Bàn giao:** chat-ui-ready + báo cáo phần TV3.
**Kiểm thử/nghiệm thu:** UI test gửi/hỏi tiếp/thử lại/nguồn/link proposal; không import host ngược.
**Căn cứ:** Workbook TV3; UI Flow màn 2/3 + solution.

## Phase 4 — Nối thật và kiểm thử luồng

### 4.1 — TV5 Backend/DB/DevOps — Nối API dữ liệu với công cụ học vụ thật
**Đợt:** A. **Folder:** `tv5-platform/`.
**Chờ:** 3.1, 3.7

```text
Wire AcademicFacade thật, StudentContextProvider và API trạng thái/CTĐT/tree/audit. Dùng hồ sơ do server nạp, không tin dữ liệu ownership từ browser. Trả profileRevision và policyVersion. Giữ fake bindings chỉ ở test profile.
```
**Bàn giao:** academic-api-live: API học vụ đã nối tool và DB thật.
**Kiểm thử/nghiệm thu:** API integration test có hai tài khoản; so kết quả facade; không hidden fallback mock.
**Căn cứ:** Solution triển khai bổ sung.

### 4.2a — TV2 FE nền tảng/học vụ — Nối FE học vụ vào API thật
**Đợt:** B · nhánh học vụ. **Folder:** `tv2-web/`.
**Chờ:** 4.1, 3.9

```text
Thay mock trong Login/bảng điểm/Dashboard/CTĐT/tree bằng client thật. Kiểm tra nhập→review→confirm→Dashboard→mở lại; chỉnh hiển thị chỉ trong folder TV2. Audit sang Planner giữ plan_id.
```
**Bàn giao:** academic-ui-live.
**Kiểm thử/nghiệm thu:** Playwright chạy luồng import/lookup; không mock cho bài E2E.
**Căn cứ:** Solution triển khai bổ sung.

### 4.2b — TV5 Backend/DB/DevOps — Nối API tạo và kiểm tra kế hoạch
**Đợt:** B · nhánh kế hoạch. **Folder:** `tv5-platform/`.
**Chờ:** 4.1, 3.6

```text
Wire generate/validate tới Planner tool. Nối lưu/activate với validation revision; transaction đổi ACTIVE; lưu nháp không được báo đã qua nghiệp vụ. Revalidate khi transcript/policy thay đổi.
```
**Bàn giao:** planner-api-live.
**Kiểm thử/nghiệm thu:** Tạo→sửa→validate→save→activate→read; test version xung đột và quyền.
**Căn cứ:** Solution triển khai bổ sung.

### 4.2c — TV1 Lead + AI — Thay fake tool bằng tool và context thật
**Đợt:** B · nhánh AI. **Folder:** `tv1-ai/`.
**Chờ:** 4.1, 3.8, 3.11

```text
Nối ToolAdapter tới toàn bộ AcademicFacade thật và context/history ports. Nối live RAG vào pgvector đã tạo migration. Dùng học vụ thật trong integration tests và model giả lập có kiểm soát; live model eval chạy riêng.
```
**Bàn giao:** advisor-integrated: module AI dùng tool/context thật.
**Kiểm thử/nghiệm thu:** Hai tài khoản/hai chat không lẫn; tool lỗi không bị model biến thành thành công; thiếu key ghi chưa chạy live.
**Căn cứ:** Solution triển khai bổ sung.

### 4.3a — TV3 FE kế hoạch/AI — Nối Planner vào API thật
**Đợt:** C · Planner FE. **Folder:** `tv3-planner-ui/`.
**Chờ:** 4.2b, 3.12

```text
Thay mock Planner bằng API thật. Test tạo phương án trực tiếp không cần Chat, lưu nháp, sửa bản ACTIVE qua bản kế thừa, hủy, kích hoạt và mở lại sau reload. Giữ nội dung khi API lỗi.
```
**Bàn giao:** planner-ui-live.
**Kiểm thử/nghiệm thu:** Playwright end-to-end với DB; chỉ ACTIVE sau server xác nhận.
**Căn cứ:** Solution triển khai bổ sung.

### 4.3b — TV5 Backend/DB/DevOps — Nối API What-if, đối soát và Chat
**Đợt:** C · platform. **Folder:** `tv5-platform/`.
**Chờ:** 4.2b, 4.2c, 3.11

```text
Wire tools mô phỏng/ROI/mục tiêu ngược/đối soát; cập nhật hồ sơ làm kế hoạch cần kiểm tra lại. Wire AdvisorFacade vào Chat endpoint và persistence; cấu hình deadline/lỗi/health readiness AI. Thiếu AI key không chặn hồ sơ/Planner/What-if.
```
**Bàn giao:** all-api-live: API bộ công cụ và Chat cùng runtime.
**Kiểm thử/nghiệm thu:** Contract + integration tests; live AI unavailable trả lỗi có thể thử lại, không fake answer.
**Căn cứ:** Solution triển khai bổ sung.

### 4.3c — TV4 Academic/Recommendation Tools — Chạy regression và sửa lỗi tool
**Đợt:** C · tools. **Folder:** `tv4-academic/`.
**Chờ:** 4.2b, 4.2c, 3.11

```text
Chạy lại bộ case được gọi từ API/AI; thêm regression test trước khi sửa bug. Giữ sửa code tại tv4-academic. Trả schema lỗi rõ cho backend/AI, không chữa lỗi bằng cách bỏ ràng buộc.
```
**Bàn giao:** academic-regression-ready.
**Kiểm thử/nghiệm thu:** Unit/regression tests đủ input sample đã thống nhất; đối chiếu không mutate dữ liệu.
**Căn cứ:** Solution triển khai bổ sung.

### 4.4a — TV3 FE kế hoạch/AI — Nối Chat và What-if về Planner thật
**Đợt:** D · FE kế hoạch/AI. **Folder:** `tv3-planner-ui/`.
**Chờ:** 4.3a, 4.3b

```text
Thay mock Chat/What-if. Chạy Chat→proposal→Planner; What-if/ROI/goal→review diff→save/cancel. Mở lại kế hoạch, cập nhật kết quả học kỳ và đối chiếu. Link file đính kèm dùng importer chung.
```
**Bàn giao:** student-planning-e2e-ready.
**Kiểm thử/nghiệm thu:** E2E không mock nghiệp vụ; hủy không thay bản cũ, nguồn click đúng, Chat hỏi lại đúng ngữ cảnh.
**Căn cứ:** Solution triển khai bổ sung.

### 4.4b — TV2 FE nền tảng/học vụ — Nối Audit, theo dõi và báo cáo thật
**Đợt:** D · FE học vụ. **Folder:** `tv2-web/`.
**Chờ:** 4.2a, 4.3a, 4.3b

```text
Chạy Audit→bù đắp→Planner→lưu; cập nhật bảng điểm→Dashboard/tiến độ mới→mở đúng kế hoạch. In báo cáo từ snapshot đang xem. Hiển thị trạng thái app đánh giá, không xác nhận tốt nghiệp thay trường.
```
**Bàn giao:** student-academic-e2e-ready.
**Kiểm thử/nghiệm thu:** E2E Audit/tiến độ/export; không đánh dấu đạt điều kiện thực tế khi chỉ thêm kế hoạch.
**Căn cứ:** Solution triển khai bổ sung.

### 4.5 — TV1 Lead + AI — Nghiệm thu tích hợp một phiên bản
**Đợt:** E. **Folder:** `tv1-ai/`.
**Chờ:** 4.4a, 4.4b, 4.3c

```text
Chạy bộ acceptance từ PRD cùng các nhánh hủy/lỗi/mở lại. Đo latency Chat/What-if/tree trên môi trường ghi rõ cấu hình; ghi kết quả thực đo, không tuyên bố target đã đạt khi chưa chạy. Gửi lỗi về owner, chờ PR sửa/test rồi rerun. Không code thay module người khác.
```
**Bàn giao:** release-candidate commit + ma trận kết quả test + giới hạn còn lại.
**Kiểm thử/nghiệm thu:** Không lỗi chặn luồng; tests thực chạy có log; live AI không chạy ghi UNTESTED.
**Căn cứ:** PRD §7, §10, US-13 + solution.

## Phase 5 — Triển khai, báo cáo và bàn giao

### 5.1 — TV5 Backend/DB/DevOps — Deploy bản ứng viên
**Đợt:** A. **Folder:** `tv5-platform/`.
**Chờ:** 4.5

```text
Build từ đúng release-candidate commit; Compose web/Boot/DB, reverse proxy HTTPS, cookie/secrets cấu hình server, backup/restore và volume riêng. Tạo môi trường demo chung, README và phần báo cáo Backend. Không dùng demo credentials trong cấu hình công khai ngoài chủ đích.
```
**Bàn giao:** URL demo + build commit + hướng dẫn vận hành + phần báo cáo TV5.
**Kiểm thử/nghiệm thu:** Fresh start, health, backup/restore thử trên DB test; secrets không xuất hiện trong bundle/log.
**Căn cứ:** Solution triển khai bổ sung.

### 5.2a — TV2 FE nền tảng/học vụ — Smoke học vụ và viết báo cáo
**Đợt:** B · song song. **Folder:** `tv2-web/`.
**Chờ:** 5.1

```text
Bấm Login/import/Dashboard/CTĐT/Audit trên URL chung; sửa lỗi trong folder TV2 rồi gửi PR, không sửa trực tiếp server. Chụp ảnh đúng build, hoàn thiện hướng dẫn và báo cáo FE học vụ.
```
**Bàn giao:** Báo cáo/ảnh phần TV2 + smoke result.
**Kiểm thử/nghiệm thu:** Các bước lặp lại được; ảnh khớp commit demo.
**Căn cứ:** Solution triển khai bổ sung.

### 5.2b — TV3 FE kế hoạch/AI — Smoke kế hoạch/Chat và viết báo cáo
**Đợt:** B · song song. **Folder:** `tv3-planner-ui/`.
**Chờ:** 5.1

```text
Bấm Planner/Chat/What-if/Profile trên URL chung. Viết hướng dẫn lưu/hủy/mở lại và báo cáo phần TV3 trong folder riêng. Gửi PR sửa nếu có lỗi.
```
**Bàn giao:** Báo cáo/ảnh phần TV3 + smoke result.
**Kiểm thử/nghiệm thu:** Test đúng bản triển khai; không dùng mock thay live mà không ghi nhãn.
**Căn cứ:** Solution triển khai bổ sung.

### 5.2c — TV4 Academic/Recommendation Tools — Bàn giao thuật toán và kiểm thử
**Đợt:** B · song song. **Folder:** `tv4-academic/`.
**Chờ:** 5.1

```text
Chạy regression trên cấu hình release; viết mô tả tools, policy version, thuật toán, giả định và giới hạn. Giữ dữ liệu PRD demo là chưa được kiểm chứng quy chế trường. Không gọi greedy là nghiệm tối ưu toàn cục.
```
**Bàn giao:** Báo cáo tools + kết quả test + dữ liệu demo có nhãn.
**Kiểm thử/nghiệm thu:** Các con số báo cáo truy ngược được fixture/test; không bịa metric cải thiện GPA thực tế.
**Căn cứ:** Solution triển khai bổ sung.

### 5.2d — TV1 Lead + AI — Smoke AI và báo cáo kiến trúc
**Đợt:** B · song song. **Folder:** `tv1-ai/`.
**Chờ:** 5.1

```text
Chạy live AI có nguồn khi được cấp key; kiểm tra RAG/tool call trên URL chung. Viết phần AI/kiến trúc/evaluation/demo script và giới hạn. Thiếu key/nguồn ghi rõ chưa kiểm thử, không coi mock pass là live pass.
```
**Bàn giao:** Báo cáo AI + demo script + live evaluation status.
**Kiểm thử/nghiệm thu:** Nguồn/tin nhắn không lẫn tài khoản; mọi metric có kết quả chạy.
**Căn cứ:** Solution triển khai bổ sung.

### 5.3 — TV2 FE nền tảng/học vụ — Hợp nhất quyển báo cáo
**Đợt:** C. **Folder:** `tv2-web/`.
**Chờ:** 5.2a, 5.2b, 5.2c, 5.2d

```text
Nhận nội dung của TV1/TV3/TV4/TV5 qua bản đã bàn giao. Hợp nhất quyển tại tv2-web/docs/report/final, rà thuật ngữ/hình/phiên bản. TV3 tiếp tục sở hữu phần riêng, không mở sửa cùng file bản cuối.
```
**Bàn giao:** Quyển báo cáo hợp nhất + mục phân công từng người.
**Kiểm thử/nghiệm thu:** Nội dung phản ánh code hiện có; không thiếu tác giả hay phần kỹ thuật.
**Căn cứ:** Solution triển khai bổ sung.

### 5.4 — TV1 Lead + AI — Chốt bàn giao theo commit
**Đợt:** D. **Folder:** `tv1-ai/`.
**Chờ:** 5.3

```text
Chạy demo toàn nhóm trên build cuối; đối chiếu báo cáo/test với commit. Nếu có sửa runtime sau smoke, yêu cầu TV5 deploy lại và owner chạy lại test bị ảnh hưởng trước khi chấp nhận. Ghi release checklist.
```
**Bàn giao:** Release acceptance + commit/hash được duyệt.
**Kiểm thử/nghiệm thu:** Không nghiệm thu khi còn lỗi chặn hoặc chưa rõ phần mock/live.
**Căn cứ:** Solution triển khai bổ sung.

### 5.5 — TV5 Backend/DB/DevOps — Gắn tag và bàn giao bản cuối
**Đợt:** E. **Folder:** `tv5-platform/`.
**Chờ:** 5.4

```text
Gắn tag cho commit được duyệt, build/deploy cùng artifact đã kiểm thử, kiểm tra health/login. Bàn giao source, cấu hình mẫu không secrets, hướng dẫn chạy và khôi phục.
```
**Bàn giao:** Release tag + URL + gói bàn giao.
**Kiểm thử/nghiệm thu:** Tag, deployed commit và báo cáo trùng phiên bản.
**Căn cứ:** Solution triển khai bổ sung.

## Nguồn

S1 — Phân công gốc: Phan_cong_HaUI_Advisor(1).xlsx. Phần: Sheet Phân công!A4:B8. TV1–TV5; TV2/TV3 có nhiệm vụ viết quyển báo cáo.
S2 — Brief: Page Brief - HAUI ADVISOR(1).docx. Phần: Target Audience; Solution. Một Student, AI + RAG + Rule Engine, lưu và theo dõi.
S3 — PRD: PRD-HAUI_ADVISOR(1).docx. Phần: §3–10; §13. Scope, US/FR, model, policy demo, scoring, state machine.
S4 — UI Flow: HAUI_ADVISOR_UI_FLOW(1).md. Phần: Màn 1–9, luồng A/B, xử lý lỗi. Đường đi, input bảng điểm, What-if/Audit→Planner.
S5 — Ảnh UI Flow: 1790235796751_2381482604274817039_g1449798126663679773_2948c429f4b6439145e44359aeb6a598(1).jpg. Phần: 3 luồng chính; A–D. Ảnh nháp; nội dung ví dụ không là dữ liệu production.
S6 — Spring AI Tools: https://docs.spring.io/spring-ai/reference/api/tools.html. Phần: Tool calling/ToolContext. Cơ sở kỹ thuật cho adapter; không nguồn nghiệp vụ HaUI.
S7 — Spring AI Gemini: https://docs.spring.io/spring-ai/reference/api/chat/google-genai-chat.html. Phần: Google GenAI Chat. Provider cho solution Java AI.
S8 — Spring AI pgvector: https://docs.spring.io/spring-ai/reference/api/vectordbs/pgvector.html. Phần: PgVectorStore. Kho tìm kiếm tài liệu.
S9 — Maven modules: https://maven.apache.org/guides/mini/guide-multiple-modules.html. Phần: Reactor. Build nhiều module, một Boot runtime.
S10 — npm workspaces: https://docs.npmjs.com/cli/v11/using-npm/workspaces/. Phần: Workspaces. Web host + feature package trong repo chung.
S11 — Git worktree: https://git-scm.com/docs/git-worktree. Phần: Multiple working trees. Một working tree/branch riêng cho mỗi agent đang ghi code.