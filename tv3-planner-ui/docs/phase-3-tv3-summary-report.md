# BÁO CÁO TỔNG KẾT PHASE 3 — MODULE TV3 (PLANNER / AI / WHAT-IF UI)
## HAUI ADVISOR — TRỢ LÝ HỌC VỤ THÔNG MINH

- **Module phụ trách:** `tv3-planner-ui/` (`@haui/planner-ui`)
- **Vai trò thành viên:** TV3 — FE Kế hoạch & AI UI
- **Giai đoạn:** Phase 3 — Code độc lập, bàn giao từng phần
- **Ngày hoàn thành tổng kết:** 15/10/2026
- **Trạng thái:** ✅ Hoàn thành 100% (3/3 tasks: Task 3.5, Task 3.10, Task 3.12)

---

## 1. Tổng quan Trách nhiệm & Ranh giới Module TV3

Module `tv3-planner-ui` đảm nhận toàn bộ giao diện phía sinh viên liên quan đến kế hoạch học tập, tư vấn lộ trình và mô phỏng điểm số:
1. **Màn hình 5:** Tùy chỉnh & Xác nhận Kế hoạch học tập (`/planner` - Task 3.5).
2. **Màn hình 6, 7, 8:** Bộ 3 công cụ What-if Mô phỏng điểm số, Tối ưu ROI học cải thiện và Tính điểm mục tiêu ngược (`/what-if` - Task 3.10).
3. **Màn hình 2:** Trợ lý ảo AI Chatbot Cố vấn Học vụ (`/chat` - Task 3.12).
4. **Hồ sơ sinh viên:** Quản lý thông tin học vụ, tùy chọn cá nhân và trạng thái chưa có hồ sơ (`/profile` - Task 3.12).

### Ranh giới Kiến trúc & Hợp đồng Tích hợp:
- **Dependency Injection `ui-api-v0`:** Nhận `{ api, ui }` từ Web Host TV2 thông qua hàm export duy nhất `createStudentRoutes({ api, ui })`.
- **Acyclic Dependency:** Tuyệt đối không import ngược bất kỳ mã nguồn nào từ `@haui/web` (`tv2-web`).
- **Phân định trách nhiệm dữ liệu:**
  - Luồng nhập bảng điểm (Upload / OCR / Parser) do TV2 quản trị tại `/transcript`. TV3 chỉ cung cấp nút liên kết mở luồng này, không tự viết form upload thứ hai.
  - Bộ tính toán quy chế, RAG và Simulation do TV4/TV1/TV5 cung cấp qua API contracts-v1. TV3 không kéo thêm thư viện WebSocket hay LLM vào phía client.

---

## 2. Chi tiết Kết quả Từng Nhiệm vụ Phase 3

### 2.1. Task 3.5 — Code Planner bằng Contract Mock (`planner-ui-ready`)
- **Mã bàn giao:** `planner-ui-ready` (Commit `45f3942`).
- **Nội dung thực hiện:**
  - Quản lý kế hoạch nhiều học kỳ (Kỳ 7, Kỳ 8, Kỳ hè) và tiếp nhận phương án đề xuất từ AI Advisor Chat / What-if.
  - Các thao tác học phần: Thêm môn từ danh mục, bớt môn, và chuyển môn (`moveCourse`) tức thời giữa các học kỳ.
  - Thẩm định quy chế đào tạo tín chỉ HaUI thời gian thực: Giới hạn 10–24 TC học kỳ chính (BR-03, BR-04), tối đa 8 TC kỳ hè, cảnh báo tải học vụ cao >= 20 TC.
  - Máy trạng thái kế hoạch nghiêm ngặt: `DRAFT → VALIDATED → ACTIVE`. Lưu DRAFT linh hoạt ngay cả khi đang lập dở; chỉ kích hoạt khi đã qua thẩm định hợp lệ 100%.
  - Cơ chế sửa kế hoạch ACTIVE: tự động tách sang bản DRAFT kế thừa, giữ nguyên bản ACTIVE và lịch sử bất biến; nút Hủy thay đổi hoàn tác sạch sẽ về mốc baseline.
  - Lưu lỗi mạng không mất nội dung chỉnh sửa.

### 2.2. Task 3.10 — Code What-if, ROI và Mục tiêu Ngược (`simulation-ui-ready`)
- **Mã bàn giao:** `simulation-ui-ready` (Commit `012018e`).
- **Nội dung thực hiện:**
  - Tích hợp 3 công cụ What-if cốt lõi trong cùng nhóm `/what-if`, hỗ trợ vào trực tiếp từng công cụ qua query parameter `?tool=grades|retake|target` hoặc prop `initialTool`:
    - **Màn 6 (Grades):** Giả lập điểm số học kỳ tới theo thang điểm chữ HaUI (A, B+, B, C+, C, D+, D, F) để dự phóng biến thiên CPA và xếp loại tốt nghiệp.
    - **Màn 7 (Retake ROI):** Bảng xếp hạng tối ưu môn học cải thiện điểm D/D+/C theo tỷ số ROI tăng CPA trên mỗi tín chỉ (`cpaDelta / credits`), kèm checkbox chọn môn và huy hiệu khuyên dùng.
    - **Màn 8 (Target):** Tính điểm mục tiêu ngược dựa trên CPA mong muốn (2.80, 3.20, 3.60), phân bổ GPA tối thiểu cần đạt ở các kỳ còn lại.
  - Cơ chế Debounce 300ms chống spam request và Sequence Tracking tự động loại bỏ response cũ đến muộn (out-of-order drop).
  - Thao tác "Áp dụng vào kế hoạch" chỉ tạo proposal DRAFT cho Planner xem lại; thao tác "Thoát / Hủy" tuyệt đối không sửa đổi bảng điểm gốc hay bản ACTIVE.
  - Tuân thủ ranh giới kiến trúc: Không gọi AI để kéo slider hoặc tính toán điểm.

### 2.3. Task 3.12 — Code Chat, Profile và Báo cáo Phần TV3 (`chat-ui-ready`)
- **Mã bàn giao:** `chat-ui-ready` (Task hiện tại).
- **Nội dung thực hiện:**
  - **AI Advisor Chat (`ChatAdvisorPage.js`):**
    - Quản lý lịch sử hội thoại, định danh phiên (`conversationId`), nút làm mới phiên chat và xóa lịch sử.
    - 4 gợi ý câu hỏi thông minh chuẩn Màn hình 2 UI Flow.
    - Trích dẫn nguồn & Căn cứ quy chế đào tạo HaUI (Điều 14, 15, 16, REG-HAUI-01..05) với khối RAG Citations rõ ràng.
    - Thẻ đề xuất kế hoạch (Proposal Card) hỗ trợ 3 nhánh hành động: Chấp nhận (nạp Store & mở Planner), Phương án khác (re-prompt), Hủy (đóng thẻ, ở nguyên hội thoại).
    - Thẻ cảnh báo dữ liệu học tập kèm action điều hướng nhanh.
    - Cơ chế Thử lại (Retry) khi request chat gặp sự cố kết nối.
    - Nút đính kèm bảng điểm (`📎`) điều hướng mở luồng nhập bảng điểm chung `/transcript` của TV2, không viết upload trùng lặp.
    - Tuân thủ triệt để quy tắc F23-008: Hỏi quy chế (P04) ở nguyên hội thoại, không có proposal và không ép mở Planner; hỏi lộ trình (P05) mới gắn proposal.
    - Giao thức REST JSON thuần, không thêm WebSocket ngoài phạm vi.
  - **Hồ sơ sinh viên (`StudentProfilePage.js`):**
    - Thông tin định danh và chỉ số học vụ cá nhân (MSSV 2020601234, CPA 3.18, GPA 3.32, 108/145 TC, cảnh báo nợ môn MATH1002).
    - Tùy chọn mục tiêu cá nhân hóa (CPA 2.50/3.20/3.60, tiến độ 4 năm vs 3.5 năm, chuyên ngành hẹp).
    - Thẻ snapshot kế hoạch đang theo dõi từ `plannerStore`.
    - Trạng thái Chưa có hồ sơ (Empty State) với nút liên kết nhập bảng điểm TV2 và nút nạp hồ sơ mẫu K16 phục vụ khám phá.
    - Toolbar chuyển đổi trạng thái kiểm thử nhanh (Hồ sơ chuẩn, Chưa có hồ sơ, Mô phỏng Lỗi).

---

## 3. Bảng Tổng Hợp Kiểm Thử & Nghiệm Thu

| Nhóm Kiểm Thử | Số lượng test | Kết quả | Ghi chú |
| :--- | :---: | :---: | :--- |
| **State Machine & Planner Store** | 10 tests | ✅ PASS 100% | F23-002, F23-003, F23-004, F23-005, validation sàn/trần |
| **Routes & Component Contract** | 10 tests | ✅ PASS 100% | Dependency Injection TV2/TV3, P04 vs P05, Task 2.2b |
| **Task 3.5 (Planner Implementation)** | 9 tests | ✅ PASS 100% | Thêm/bớt/chuyển môn, DRAFT hợp lệ, sửa ACTIVE, lưu lỗi |
| **Task 3.10 (What-if & ROI Simulation)** | 8 tests | ✅ PASS 100% | 3 công cụ, debounce, out-of-order drop, bảo toàn bảng điểm |
| **Task 3.12 (Chat, Profile & UI Tests)** | 14 tests | ✅ PASS 100% | UI test gửi, hỏi tiếp, thử lại, nguồn, proposal, TV2 link, ranh giới host |
| **Tổng cộng module TV3** | **51 tests** | **✅ PASS 100%** | Thời gian chạy ~377ms |

---

## 4. Trạng Thái Sẵn Sàng Chuyển Giai Đoạn (Phase 4)

Module TV3 đã hoàn thành toàn bộ các mốc bàn giao của Phase 3:
- ✅ `planner-ui-ready`: Task 3.5 hoàn thành.
- ✅ `simulation-ui-ready`: Task 3.10 hoàn thành.
- ✅ `chat-ui-ready`: Task 3.12 hoàn thành.
- ✅ Toàn bộ 51 unit tests pass 100%; `npm test` toàn frontend (81 tests) và `npm run smoke` toàn hệ thống pass 100%.

TV3 đã sẵn sàng bước sang **Phase 4: Nối thật và kiểm thử luồng** (Task 4.3a: Nối Planner vào API thật; Task 4.4a: Nối Chat và What-if về Planner thật).
