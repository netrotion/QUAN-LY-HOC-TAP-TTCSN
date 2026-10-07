# HaUI Advisor — Mốc Bàn Giao `flow-approved-v1` (Task 2.2a)
**Phân hệ:** TV2 - Frontend Platform & Academic Engineer  
**Phiên bản bàn giao:** `flow-approved-v1`  
**Ngày hoàn thiện:** 2026-10-07  
**Phạm vi sở hữu:** Duy nhất thư mục `tv2-web/`  

---

## 1. Mục tiêu & Ranh giới (Scope & Boundaries)
- **Mục tiêu:** Xây dựng hoàn chỉnh bộ prototype tương tác của phân hệ Học vụ (Academic Subsystem) tích hợp vào UI Shell và hệ thống design tokens `design-base-v1` để đạt mốc phê duyệt luồng người dùng **`flow-approved-v1`**.
- **Tuân thủ quy chế AGENTS.md:**
  - 100% mã nguồn nằm trong `tv2-web/`.
  - Không gọi trực tiếp LLM SDK hay database thật; quản lý dữ liệu hoàn toàn qua Reactive Frontend State / Mock Fixtures (`FIXTURE_ONLY`, `DEMO_UNVERIFIED`).
  - Bảo toàn dữ liệu khuyết (`null` thay vì 0 cho GPA).
  - Không gửi `studentId` từ client làm định danh tin cậy.

---

## 2. Danh mục Màn hình & Luồng Nghiệp vụ Hoàn thiện

### A. Màn hình Xác thực & Đăng nhập Sinh viên (`/login`) — `LoginPage.jsx`
1. **Form Đăng nhập:** Cho phép sinh viên nhập Mã SV và Mật khẩu trường e-HaUI.
2. **Preset Chọn Nhanh 3 Phân khúc Tài khoản:**
   - **Sinh viên bình thường (`normal`):** Nguyễn Văn An &bull; KTPM K17 &bull; Tiến độ chuẩn, 102/135 TC, không nợ môn, CPA 3.20 (Giỏi).
   - **Sinh viên có nguy cơ học vụ (`at-risk`):** Trần Thị Bình &bull; KTPM K17 &bull; CPA 1.85 (< 2.00), nợ môn tiên quyết Toán rời rạc (`MATH1002` - Điểm F), cảnh báo học vụ Mức 1.
   - **Sinh viên chưa có bảng điểm (`empty`):** Lê Hoàng Nam &bull; Tân sinh viên CNTT K19 &bull; Tài khoản trắng (0 tín chỉ, CPA `null`, chưa tải bảng điểm từ portal).
3. **Chuyển hướng:** Đăng nhập thành công điều hướng tự động sang `/dashboard`.
4. **Đăng xuất:** Nút "Đăng xuất" đặt tại Header Topbar điều hướng về `/login`.

---

### B. Luồng Nhập & Bóc Tách Bảng Điểm 3 Bước (`/transcript` / `/academic/import`) — `TranscriptImportPage.jsx`
1. **Bước 1 - Nạp dữ liệu (Data Ingestion):**
   - **Tải file:** Vùng kéo thả file PDF hoặc Ảnh bảng điểm từ portal e-HaUI (`.pdf`, `.png`, `.jpg`).
   - **Phím tắt Demo:** Nút *"⚡ Dùng File Demo Mẫu (e-HaUI PDF)"* nạp ngay dữ liệu mẫu K17 để thẩm định nhanh.
   - **Xử lý lỗi định dạng sai:** Nút *"⚠️ Mô phỏng File Sai Định Dạng (.docx)"* kích hoạt thông báo lỗi đỏ 422 và cho phép thử lại.
   - **Nhánh Nhập tay (Manual Entry):** Bảng thêm từng môn học (Mã HP, Tên HP, Số TC, Điểm 10, Điểm chữ tự quy đổi thang 4).
   - **Hướng dẫn Empty State:** Khi chưa có bảng điểm, hiển thị hướng dẫn 3 bước trực quan cách lấy file PDF từ `portal.haui.edu.vn`.
2. **Bước 2 - Xem lại & Điều chỉnh (Review State):**
   - Bảng dữ liệu hiển thị toàn bộ các môn bóc tách được (Mã môn, Tên môn, Số TC, Điểm 10, Điểm chữ, Điểm 4, Tình trạng: Đạt/Nợ/Đang học).
   - **Inline Edit:** Cho phép sinh viên tự chỉnh sửa trực tiếp số tín chỉ, điểm 10 hoặc điểm chữ ngay trên từng hàng.
   - Banner cảnh báo các môn nợ (Điểm F) và môn điểm thấp (D, D+) cần học cải thiện.
   - Nút *"Quay lại"* để chọn tệp khác và nút *"Thêm học phần mới"*.
3. **Bước 3 - Xác nhận & Cập nhật kết quả (Confirm State):**
   - Thẻ tổng kết số liệu mới: CPA dự kiến, Tín chỉ tích lũy mới, Tổng số môn, Trạng thái học vụ.
   - Nút *"✓ Xác nhận & Cập nhật kết quả ngay"*: Ghi nhận vào `academicStore`, đồng bộ Singleton API Client và chuyển hướng về Dashboard với dữ liệu mới.

---

### C. Màn hình Dashboard Học tập (`/dashboard` & `/`) — `DashboardPage.jsx`
1. **Liên kết Dữ liệu Động:** Phản ánh chính xác kết quả từ Bảng điểm vừa xác nhận hoặc Persona đang chọn.
2. **4 Thẻ Chỉ số Cốt lõi (Metric Cards):**
   - CPA Tích lũy (kèm nhãn xếp loại: Xuất sắc, Giỏi, Khá, Trung bình, Yếu/Cảnh báo).
   - GPA Học kỳ gần nhất (bảo toàn `null / UNKNOWN` nếu chưa khóa sổ).
   - Tín chỉ tích lũy (kèm Progress Bar tỷ lệ hoàn thành trên 135 TC).
   - Trạng thái học vụ (Bình thường / Cảnh báo học vụ Mức 1).
3. **Cảnh báo Học vụ & Empty State Nổi bật:**
   - Nếu là tài khoản trắng (`empty`): Hiển thị Banner mời nạp bảng điểm kèm CTA *"Nạp Bảng Điểm Ngay &rarr;"*.
   - Nếu là sinh viên nguy cơ (`at-risk`): Hiển thị Early Warning Alert Box chi tiết về nút thắt `MATH1002` và giải pháp kéo CPA.
4. **Khối Môn Nợ & Môn Tiên Quyết Cần Gỡ Gấp:** Nêu bật `MATH1002` kèm phân tích tắc nghẽn chuỗi môn sau và nút đưa vào kế hoạch.
5. **Cụm Hành Động Nhanh:** Kết nối trực tiếp sang `/transcript`, `/curriculum`, `/audit`, `/planner`, `/chat`, `/what-if`.

---

### D. Màn hình CTĐT & Cây Môn Học (`/curriculum` & `/curriculum/tree`) — `CurriculumTreePage.jsx`
1. **Danh mục Khối Kiến thức:** Đại cương, Cơ sở ngành, Chuyên ngành, Tự chọn, Tốt nghiệp.
2. **Sơ đồ Cây Phụ thuộc Môn học (Interactive Node Graph) với 4 Trạng thái Màu:**
   - 🟢 **Đã đạt (Passed - Green):** Các môn sinh viên đã thi qua (Điểm A, B+, B, C+, C, D).
   - 🟡 **Đang học / AI Đề xuất (In Progress - Yellow):** Môn đang học hoặc AI khuyến nghị học cải thiện kỳ tới (ví dụ: `IT2001`, `IT6002`).
   - ⚪ **Chưa học (Not Taken - Gray):** Môn chưa học, đủ điều kiện mở lớp đăng ký.
   - 🔴 **Bị chặn / Trượt môn (Blocked / Failed - Red):** Môn bị điểm F (`MATH1002`) và các môn sau bị chặn dây chuyền do nợ tiên quyết (`IT6001`, `IT6005`, `IT7001`, `IT7008`).
3. **Panel Chi tiết & Modal Thẩm định Tiên quyết:**
   - Bấm vào bất kỳ node môn học nào mở Drawer chi tiết hiển thị: Thông tin môn, Tín chỉ, Môn tiên quyết, và **Chuỗi môn bị ảnh hưởng (Downstream courses)**.
   - Gọi Rule Engine kiểm tra điều kiện đăng ký (`/api/v1/academic/eligibility`).
   - Nút *"+ Thêm môn vào Kế hoạch học tập (TV3 Planner) &rarr;"* chuyển sang route TV3: `/planner?course_id=...`.

---

### E. Màn hình Kiểm toán Tốt nghiệp & Bản In (`/audit` & `/progress`) — `GraduationAuditPage.jsx` & `AcademicProgressPage.jsx`
1. **Bảng Đối soát 100% Tiêu chí Chuẩn đầu ra HaUI (7 Hạng mục Checklist):**
   - 1. Tín chỉ tích lũy toàn khóa (112/135 TC hoặc theo bảng điểm).
   - 2. Khối kiến thức bắt buộc (94/94 TC).
   - 3. Khối tự chọn chuyên ngành (6/12 TC - Cảnh báo cần thêm 2 môn).
   - 4. Chuẩn đầu ra Ngoại ngữ (TOEIC 550 / VSTEP - gắn nhãn `DEMO_UNVERIFIED`).
   - 5. Chuẩn Tin học quốc tế (MOS/IC3 - gắn nhãn `DEMO_UNVERIFIED` kèm cảnh báo đỏ AC-05 hạn chót trước 3 tháng).
   - 6. Chứng chỉ GDQP-AN và GDTC.
   - 7. Điểm rèn luyện toàn khóa (&ge; 65/100).
2. **Nút "Lập kế hoạch bù đắp các điều kiện còn thiếu":** Mở modal AI đề xuất lộ trình và chuyển hướng sang `/planner`.
3. **Chế độ In Báo Cáo / Xuất PDF (`@media print`):**
   - Nút *"🖨️ In Báo Cáo / Xuất PDF"* kích hoạt `window.print()`.
   - CSS Print chuẩn A4 portrait: Tự động ẩn Sidebar, Topbar, State Switcher, nút bấm.
   - Hiển thị tiêu đề trang trọng của Trường Đại học Công nghiệp Hà Nội, bảng thông tin sinh viên, bảng checklist chi tiết, và khối chữ ký xác nhận của Sinh viên và Cố vấn học tập.

---

## 3. Kiến trúc Quản lý Trạng thái (`academicStore.js`)
- **Tập trung:** Quản lý toàn bộ danh tính sinh viên, hồ sơ bảng điểm và tính toán động số liệu học vụ.
- **Tương thích hai chiều:** Tự động đồng bộ với Singleton `api` client qua `setDynamicProvider` và `setSessionStudent`, giúp Topbar, Dashboard và tất cả các màn hình luôn hiển thị dữ liệu đồng nhất.
- **Hỗ trợ kiểm thử:** Giữ nguyên các giá trị mock mặc định khi chạy isolated tests để không ảnh hưởng đến các bài kiểm tra hợp đồng OpenAPI V0 và contract TV3.

---

## 4. Kết quả Nghiệm thu (Verification & Quality Gates)
- **Ownership Check:** `node scripts/check-ownership.mjs --role tv2` &rarr; **PASSED (100% file trong tv2-web/)**.
- **Architecture Check:** `node scripts/check-architecture.mjs` &rarr; **PASSED (Không có cyclic dependency)**.
- **Contracts Check:** `node scripts/check-contracts.mjs` &rarr; **PASSED (15 fixtures & OpenAPI V0 valid)**.
- **Lint Check:** `node scripts/check-lint.mjs` &rarr; **PASSED**.
- **Secrets Scan:** `node scripts/check-secrets.mjs` &rarr; **PASSED (Không có credentials/keys lộ)**.
- **Unit Test Suite:**
  - `tv3-planner-ui`: **10 passed, 0 failed**.
  - `tv2-web`: **10 passed, 0 failed** (gồm 4 test cases kiểm thử sâu Task 2.2a).
  - Tổng cộng: **20/20 unit tests passed**.
