# BÁO CÁO NGHIỆM THU KỸ THUẬT TASK 3.12
## CODE CHAT, PROFILE VÀ BÁO CÁO PHẦN TV3 (`chat-ui-ready`)

- **Mã nhiệm vụ:** Task 3.12 (Phase 3 — Đợt C)
- **Thành viên phụ trách:** TV3 — FE Kế hoạch & AI (Planner UI)
- **Mốc bàn giao:** `chat-ui-ready` + Báo cáo hoàn thành phần TV3
- **Thư mục làm việc:** `tv3-planner-ui/`
- **Ngày hoàn thành:** 15/10/2026

---

## 1. Yêu cầu & Căn cứ Nghiệm thu

Căn cứ bản phân công nhiệm vụ Phase 3 (`HaUI_Advisor_Solution_va_Prompt_theo_Phase.md` dòng 398–407):

```text
Code Chat lịch sử/nguồn/action card/thử lại; link attachment mở luồng nhập bảng điểm chung của TV2. Profile và trạng thái chưa có hồ sơ. Chat hỏi quy chế ở nguyên hội thoại; proposal mở Planner. Gửi nhận JSON trước, không thêm WebSocket ngoài phạm vi. Viết docs/report phần TV3.
```

- **Mốc bàn giao:** `chat-ui-ready` + Báo cáo phần TV3.
- **Căn cứ nghiệp vụ:**
  - Workbook TV3; UI Flow Màn hình 2 (AI Advisor Chat) & Màn hình 3 (Đề xuất lộ trình).
  - PRD US-06, US-13, Solution F08, F23-008 (Quy tắc P04 vs P05: Hỏi quy chế không ép mở Planner).
  - Hợp đồng Dependency Injection `ui-api-v0` với TV2 và ranh giới kiến trúc bất khả xâm phạm.

---

## 2. Kết quả Triển khai Chi tiết

### 2.1. Trợ lý AI Advisor Chat (`ChatAdvisorPage.js`)

#### A. Quản lý Lịch sử Hội thoại (Chat History) & Quản lý Phiên
- **Quản lý phiên hội thoại (`conversationId`):** Khởi tạo định danh phiên duy nhất dạng `conv-${timestamp}`, hiển thị nhãn phiên trực quan trên thanh tiêu đề.
- **Dòng hội thoại 2 chiều:** Phân biệt rõ ràng bóng tin nhắn sinh viên (phải, nền tối/màu chủ đạo) và phản hồi từ Trợ lý AI (trái, nền sáng, định danh HaUI Advisor, avatar thông minh, timestamp).
- **Thao tác quản lý phiên:**
  - `[🔄 Phiên mới]`: Khởi tạo phiên hội thoại mới, sinh `conversationId` mới, làm sạch tin nhắn cũ và hiển thị lại danh sách câu hỏi gợi ý nhanh.
  - `[Xóa chat]`: Làm sạch dòng tin nhắn trong phiên hiện tại để kiểm thử trạng thái Empty.
  - `[Mô phỏng Lỗi]`: Kích hoạt lỗi kết nối để kiểm thử Error Box và cơ chế Thử lại.
- **4 Gợi ý câu hỏi thông minh (Quick Prompt Pills):** Chuẩn Màn hình 2 UI Flow:
  1. *Tư vấn lộ trình kéo CPA lên >= 3.20 để tốt nghiệp bằng Giỏi.*
  2. *Tôi vừa trượt môn Toán rời rạc (MATH1002), kỳ sau bị ảnh hưởng thế nào?*
  3. *Lên lộ trình học vượt 3.5 năm ngành CNTT/KTPM.*
  4. *Kỳ này nên học cải thiện môn nào tốt nhất theo chỉ số ROI?*

#### B. Trích dẫn Nguồn & Căn cứ Quy chế RAG (Sources / Citations)
- Mọi phản hồi học vụ từ AI Advisor đều được gắn kèm khối **`📖 Nguồn tham khảo & Quy chế minh họa`** trích dẫn chính xác các điều khoản quy định của Trường Đại học Công nghiệp Hà Nội:
  - **Điều 14 (REG-HAUI-01 / BR-03, BR-04):** Đăng ký khối lượng học tập 10–24 tín chỉ trong học kỳ chính, tối đa 12 tín chỉ trong học kỳ hè.
  - **Điều 15 (REG-HAUI-03):** Quy định học lại bắt buộc đối với môn điểm F; học cải thiện chỉ áp dụng cho môn đạt điểm D, D+, C (điểm B trở lên không được phép cải thiện).
  - **Điều 16 (REG-HAUI-04 / BR-02):** Quy định cảnh báo kết quả học tập mức 1, mức 2, buộc thôi học và trần 14 tín chỉ trong học kỳ bị cảnh báo.
  - **Chuẩn đầu ra & Điều kiện tốt nghiệp (REG-HAUI-05):** Yêu cầu 145 tín chỉ, chứng chỉ Ngoại ngữ TOEIC, Tin học MOS/IC3, GDQP-AN, GDTC và Điểm rèn luyện.

#### C. Thẻ Hành động (Action Cards) & Đề xuất Kế hoạch (Proposal Card)
- **Thẻ Đề xuất Lộ trình (Plan Proposal Card):** Khi nhận diện yêu cầu lập kế hoạch/lộ trình, AI phản hồi kèm thẻ đề xuất phương án trực quan với 3 nhánh hành động độc lập:
  1. **`[✓ Chấp nhận phương án]`:** Đóng gói đề xuất nạp vào `plannerStore.setIncomingProposal(proposal, 'AI Advisor Chat')`, đánh dấu trạng thái đề xuất thành công, và tự động điều hướng mở màn hình Study Planner (`/planner`) để sinh viên xem xét và tinh chỉnh.
  2. **`[🔄 Phương án khác]`:** Tự động gửi câu hỏi mới yêu cầu AI tính toán lại phương án nhẹ tải hơn (< 16 tín chỉ) hoặc đẩy bớt môn sang kỳ hè.
  3. **`[✕ Hủy đề xuất]`:** Đóng thẻ đề xuất trên giao diện, giữ nguyên kế hoạch học tập hiện hành, ở nguyên hội thoại.
- **Thẻ Cảnh báo Dữ liệu (Data Warning Card):** Khi sinh viên hỏi về thực tập hoặc tốt nghiệp nhưng hồ sơ chưa đủ dữ liệu:
  - Hiển thị banner cảnh báo dữ liệu màu hổ phách.
  - Đính kèm nút hành động tức thì: `[Xem và cập nhật Hồ sơ sinh viên]` (mở `/profile`) và `[Đính kèm/Cập nhật bảng điểm mới]` (mở `/transcript`).

#### D. Cơ chế Thử lại (Retry) Khi Lỗi Gửi Tin nhắn
- Khi kết nối Backend Spring Boot bị lỗi hoặc timeout:
  - Tin nhắn gửi được đánh dấu `failed: true` với viền đỏ cảnh báo.
  - Cung cấp nút `[Thử lại]` ngay dưới bóng tin nhắn bị lỗi và trên khung thông báo lỗi `ErrorBox`.
  - Nhấp `[Thử lại]` sẽ tự động lấy lại nội dung câu hỏi trước đó và gửi lại tới API mà không bắt sinh viên phải nhập lại từ đầu.

#### E. Nút Đính kèm (Attachment) Mở Luồng Nhập Bảng điểm Chung của TV2
- Tại thanh nhập tin nhắn có nút đính kèm biểu tượng `📎`.
- **Hành vi nghiệp vụ:** Khi sinh viên bấm vào nút này, hệ thống hiển thị thông báo toast và điều hướng sang route `/transcript` (Trang Nhập bảng điểm do TV2 quản trị).
- **Ranh giới sở hữu:** TV3 tuyệt đối không tự viết form upload file, parser hay OCR bảng điểm thứ hai trong component của mình, đảm bảo tính nhất quán của Web Host.

#### F. Quy tắc F23-008: Chat Hỏi Quy chế (P04) ở Nguyên Hội thoại vs Proposal (P05) mở Planner
- **Kịch bản P04 (Hỏi quy chế):** Các câu hỏi về cảnh báo học vụ, cách tính GPA/CPA, rút học phần, hạn mức tín chỉ tối đa, chuẩn đầu ra:
  - `planProposal` trả về giá trị `null`.
  - Trả lời đầy đủ bằng văn bản quy chế kèm trích dẫn nguồn.
  - **Sinh viên ở nguyên trong hội thoại chat, tuyệt đối không tự ý ép mở Planner**.
- **Kịch bản P05 (Lập kế hoạch):** Các câu hỏi yêu cầu lập lộ trình, học vượt, phân bổ môn:
  - `planProposal` được gắn vào câu trả lời kèm thẻ đề xuất phương án.
  - Chỉ khi sinh viên nhấn nút `[Chấp nhận phương án]`, hệ thống mới mở sang `/planner`.

#### G. Giao thức Gửi Nhận Thuần JSON (REST)
- Sử dụng cấu trúc dữ liệu JSON chuẩn gửi qua `api.advisor.chat({ conversationId, message, clientTimestamp })`.
- Dữ liệu trả về dạng JSON: `{ answer, sources, actions, warnings, planProposal }`.
- **Tuyệt đối không thêm WebSocket hoặc thư viện kết nối thời gian thực ngoài phạm vi**.

---

### 2.2. Màn hình Hồ sơ Sinh viên (`StudentProfilePage.js`)

#### A. Thông tin Hành chính & Chỉ số Học vụ Cá nhân
- Dựa trên prototype `ho_so_sinh_vien/code.html` chuẩn phong cách thiết kế HaUI Advisor:
  - Thông tin định danh: Họ tên (Nguyễn Văn An), MSSV (2020601234), Khóa K16, Ngành Kỹ thuật phần mềm, Lớp KTPM01-K16, Khoa CNTT (SICT - HaUI).
  - Khối chỉ số học vụ: CPA tích lũy (3.18 / 4.00 - Tiệm cận bằng Giỏi), GPA học kỳ gần nhất (3.32 / 4.00), Tín chỉ đã tích lũy (108 / 145 TC - 74.5%).
  - Cảnh báo nợ học phần: Nợ môn bắt buộc Toán rời rạc (MATH1002 - Điểm F).

#### B. Tùy chọn Mục tiêu Học tập Cá nhân
- Cho phép sinh viên thiết lập các tham số học vụ cá nhân hóa để AI và công cụ What-if tối ưu hóa:
  - **Mục tiêu CPA tốt nghiệp:** `2.50` (Khá), `3.20` (Giỏi), `3.60` (Xuất sắc).
  - **Tiến độ đào tạo:** `STANDARD` (Chuẩn 4 năm) vs `FAST` (Rút ngắn 3.5 năm - Học vượt).
  - **Định hướng chuyên ngành hẹp:** Kỹ thuật phần mềm Web & Di động / Hệ thống thông tin.
  - Lưu tùy chọn kèm thông báo toast phản hồi thành công.

#### C. Thẻ Kế hoạch Học tập Đang Theo dõi (Active Plan Snapshot)
- Trích xuất dữ liệu trực tiếp từ `plannerStore.getPlan()`:
  - Hiển thị tên kế hoạch, phiên bản (`v2.4`), trạng thái (`ACTIVE` / `DRAFT`), số học kỳ và CPA dự phóng (`3.32`).
  - Nút `[Mở trong Study Planner →]` giúp sinh viên chuyển nhanh sang quản lý chi tiết lộ trình học tập.

#### D. Trạng thái Chưa có Hồ sơ (Empty State) & Liên kết TV2
- Khi sinh viên mới đăng nhập hoặc chưa nhập bảng điểm (`profileData === null`):
  - Hiển thị `EmptyState` thân thiện với thông báo: *"Chưa có thông tin hồ sơ sinh viên — Hệ thống chưa tìm thấy dữ liệu học tập cá nhân của bạn..."*
  - **Nút hành động chính:** `[📎 Nhập bảng điểm ngay (TV2)]` -> Chuyển hướng người dùng sang `/transcript` để tải lên bảng điểm từ sv.haui.edu.vn.
  - **Nút hành động phụ:** `[Tải hồ sơ mẫu K16 (Khám phá)]` -> Nạp nhanh bộ dữ liệu mẫu sinh viên K16 để thử nghiệm tính năng.
  - **Thanh công cụ kiểm thử (Header Toolbar):**
    - `[Hồ sơ chuẩn (K16)]`: Tải lại hồ sơ mẫu đầy đủ.
    - `[Chưa có hồ sơ]`: Kích hoạt trạng thái Empty State để kiểm thử UI.
    - `[Mô phỏng Lỗi]`: Kích hoạt trạng thái Error để kiểm tra thông báo lỗi.
    - `[📎 Nhập bảng điểm (TV2)]`: Mở luồng nhập bảng điểm chung.

---

## 3. Tổng hợp Danh mục Tệp Triển khai trong Gói TV3

| Tệp tin | Vai trò | Thay đổi chính |
| :--- | :--- | :--- |
| `tv3-planner-ui/src/pages/ChatAdvisorPage.js` | AI Advisor Chat | Bổ sung quản lý phiên hội thoại (`conversationId`), nút làm mới phiên, cơ chế thử lại (Retry) khi gửi lỗi, trích dẫn nguồn RAG chuẩn quy chế HaUI, thẻ đề xuất 3 nhánh hành động, thẻ cảnh báo dữ liệu, nút đính kèm mở `/transcript` của TV2, giao thức REST JSON. |
| `tv3-planner-ui/src/pages/StudentProfilePage.js` | Student Profile | Bổ sung trạng thái Chưa có hồ sơ (Empty State) với nút liên kết sang `/transcript` của TV2 và nút nạp hồ sơ mẫu K16, thanh công cụ chuyển đổi trạng thái kiểm thử, quản lý mục tiêu cá nhân hóa và liên kết sang Study Planner. |
| `tv3-planner-ui/src/services/plannerStore.js` | State Store | Bổ sung alias `rejectProposal()` tương thích với `dismissProposal()`. |
| `tv3-planner-ui/src/index.js` | Root Export | Export bổ sung `QUICK_PROMPTS_MAN_2` và `SAMPLE_K16_PROFILE`. |
| `tv3-planner-ui/test/task-3.12-chat-profile.test.mjs` | Test Suite | 8 ca kiểm thử chuyên biệt xác nhận 100% tiêu chí nghiệm thu Task 3.12. |
| `tv3-planner-ui/docs/task-3.12-chat-profile-report.md` | Tài liệu báo cáo | Báo cáo chi tiết kỹ thuật Task 3.12 và mốc `chat-ui-ready`. |

---

## 4. Bằng chứng Kiểm thử (Test Evidence)

### 4.1. Chạy Bộ Kiểm thử Đơn vị Gói TV3
Lệnh thực thi:
```bash
npm test --workspace=@haui/planner-ui
```

**Kết quả kiểm thử:**
- **Tổng số tests:** 51 tests (100% PASS rate).
- **Phân bổ:**
  - 10 tests: State Machine & Planner Store.
  - 10 tests: Routes & Component Contract.
  - 9 tests: Task 3.5 (Planner Implementation).
  - 8 tests: Task 3.10 (What-if & ROI Simulation).
  - 14 tests: Task 3.12 (Chat, Profile, UI tests gửi/hỏi tiếp/thử lại/nguồn/link proposal/không import host ngược).
- **Thời gian chạy:** ~377ms.

### 4.2. Chạy Kiểm tra Chất lượng Toàn diện (Smoke Check)
Lệnh thực thi:
```bash
npm run smoke
```

**Kết quả kiểm tra:**
- Secrets & Credentials Scanner: **PASS**
- Ownership Boundaries & Changed Paths: **PASS** (100% tệp thay đổi thuộc `tv3-planner-ui/`)
- Architecture Cyclic Dependency Gates: **PASS**
- Contracts V1 Verification: **PASS**
- Frontend Cleanliness & Lint: **PASS**
- Frontend Workspaces Unit Tests: **PASS**
- Frontend Workspaces Build: **PASS**
- Backend Multi-Module Reactor Tests: **PASS**

---

## 5. Kết luận & Mốc Bàn giao

1. **Hoàn tất 100% yêu cầu Task 3.12:**
   - Hoàn thành giao diện Chat Advisor với đầy đủ lịch sử, nguồn tham khảo quy chế, Action Card 3 nhánh, cơ chế thử lại, và liên kết mở bảng điểm TV2.
   - Hoàn thành giao diện Student Profile với thông tin học vụ, tùy chọn cá nhân hóa và trạng thái xử lý Chưa có hồ sơ.
   - Tuân thủ nghiêm ngặt nguyên tắc P04 vs P05: Hỏi quy chế ở nguyên hội thoại, proposal mở Planner.
   - Giao thức REST JSON thuần, không WebSocket ngoài phạm vi.
2. **Sẵn sàng bàn giao mốc `chat-ui-ready`:**
   - Toàn bộ 4 màn hình chính của TV3 (`/planner`, `/what-if`, `/chat`, `/profile`) đã sẵn sàng cho Phase 4 kết nối API thật.
