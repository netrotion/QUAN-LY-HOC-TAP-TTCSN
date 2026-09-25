# TÀI LIỆU THIẾT KẾ UI FLOW – DỰ ÁN HAUI ADVISOR
## HỆ THỐNG TRỢ LÝ ẢO TƯ VẤN LỘ TRÌNH VÀ TỐI ƯU HÓA KẾT QUẢ HỌC TẬP
**Trường Đại học Công nghiệp Hà Nội (HaUI)**
*Dành riêng cho Actor duy nhất: Sinh viên (Student)*

---

## 1. TỔNG QUAN KIẾN TRÚC UI FLOW
Hệ thống HAUI ADVISOR được thiết kế theo triết lý **Student-Centric (Lấy Sinh viên làm trung tâm)**. Toàn bộ trải nghiệm người dùng xoay quanh việc giúp sinh viên chủ động quản lý học vụ, tháo gỡ khó khăn về môn tiên quyết, mô phỏng điểm số và kiến tạo lộ trình học tập tối ưu.

### 1.1. Chú thích quy ước sơ đồ (Legend)
- `[ Màn hình ]`: Màn hình giao diện chính (Blue Border / Solid Box).
- `( Hành động / Tương tác )`: Nút bấm, lựa chọn, nhập liệu của sinh viên.
- `< Quyết định / AI Xử lý >`: Điểm rẽ nhánh logic hoặc bước AI phân tích (Orange Border / Diamond).
- `===>`: Luồng chính (Primary Flow / Happy Path).
- `--->`: Luồng phụ / Luồng thay thế (Alternate / Fallback Flow).

---

## 2. SƠ ĐỒ TOÀN CẢNH UI FLOW (OVERVIEW DIAGRAM)

```
[ ĐĂNG NHẬP / KHỞI TẠO ]
       │
       ▼
[ MÀN 1: DASHBOARD SINH VIÊN ] ◄──────────────────────────────────────────────┐
  - Tiến độ CTĐT (Visual Progress)                                           │
  - Chỉ số học vụ: GPA, CPA, Tín chỉ tích lũy                               │
  - Widget Cảnh báo rủi ro / Môn tiên quyết                                  │
  - Lối tắt: Chat AI, Mô phỏng điểm, Xem Lộ trình                            │
       │                                                                      │
       ├───────────────────────────────┬───────────────────────────┐          │
       ▼                               ▼                           ▼          │
[ LUỒNG CHÍNH 1: TƯ VẤN AI ]    [ LUỒNG CHÍNH 2: WHAT-IF ]   [ LUỒNG CHÍNH 3 ]│
       │                               │                           │          │
       ▼                               ▼                           ▼          │
[ MÀN 2: AI ADVISOR CHAT ]      [ MÀN 6: GIẢ LẬP ĐIỂM ]      [ MÀN 9: AUDIT ] │
  - Nhập yêu cầu tự nhiên         - Nhập điểm dự kiến          - Rà soát tốt  │
  - Gợi ý Prompt nhanh            - Tính biến động CPA           nghiệp 100%  │
       │                               │                       - Cảnh báo     │
       ▼                               ▼                         học vụ       │
[ MÀN 3: KẾT QUẢ ĐỀ XUẤT ]      [ MÀN 7: TỐI ƯU CẢI THIỆN]         │          │
  - Lộ trình kỳ tới               - Xếp hạng môn kéo CPA           │          │
  - Phân bổ tải tín chỉ           - Ma trận ROI điểm số            │          │
  - Điểm mục tiêu                      │                           │          │
       │                               ▼                           │          │
       ▼                        [ MÀN 8: TÍNH ĐIỂM NGƯỢC ]         │          │
[ MÀN 4: CHI TIẾT & SƠ ĐỒ CÂY ]   - Nhập CPA mục tiêu              │          │
  - Dependency Tree trực quan     - Phân bổ điểm từng môn          │          │
  - Rà soát môn tiên quyết             │                           │          │
       │                               │                           │          │
       ▼                               │                           │          │
[ MÀN 5: XÁC NHẬN KẾ HOẠCH ] ◄─────────┴───────────────────────────┘          │
  - Tùy chỉnh môn học                                                         │
  - Kiểm tra hợp lệ thời gian thực                                            │
  - Lưu vào "Lộ trình mục tiêu" ──────────────────────────────────────────────┘
```

---

## 3. CHI TIẾT CÁC LUỒNG GIAO DIỆN CHÍNH (PRIMARY FLOWS)

### 3.1. Luồng chính 1: Tư vấn Lộ trình học tập thông minh qua AI (AI-Powered Academic Roadmap Flow)

#### Màn hình 1: Trang chủ Dashboard Sinh viên (Student Academic Dashboard)
- **Mục tiêu:** Cung cấp bức tranh toàn cảnh về tình trạng học tập, phát hiện nhanh rủi ro và điều hướng sang các công cụ thông minh.
- **Thành phần giao diện:**
  - *Header:* Tên sinh viên, MSSV, Ngành học (VD: Kỹ thuật phần mềm), Khóa (VD: K17), Avatar.
  - *Thẻ chỉ số KPI học tập:*
    - **CPA Tích lũy:** 2.45 / 4.0 (Kèm nhãn: Trung bình - Cách ngưỡng Khá 0.05).
    - **Số tín chỉ tích lũy:** 68 / 135 tín chỉ (Thanh tiến độ: 50.4%).
    - **Tình trạng học vụ:** Bình thường (Xanh lá) hoặc Cảnh báo mức 1 (Đỏ cam).
  - *Widget Cảnh báo rủi ro học vụ (Alert Box):* "Bạn đang nợ môn Toán rời rạc (3 TC) – Đây là môn tiên quyết của Cấu trúc dữ liệu & Giải thuật kỳ tới!"
  - *Thanh tiến độ Chương trình đào tạo (Degree Progress Bar):* Phân rã theo Khối kiến thức: Đại cương (Hoàn thành 85%), Cơ sở ngành (50%), Chuyên ngành (10%), Tự chọn (20%), Tốt nghiệp (0%).
  - *Nút CTA nổi bật:* `[ Nhờ AI tư vấn kỳ mới ]`, `[ Mô phỏng điểm CPA ]`, `[ Xem lộ trình học tập ]`.

#### Màn hình 2: Trợ lý ảo AI Chatbot (AI Advisor Chat Interface)
- **Mục tiêu:** Tiếp nhận câu hỏi học vụ bằng ngôn ngữ tự nhiên từ sinh viên và gợi ý thông minh.
- **Thành phần giao diện:**
  - *Khung hội thoại:* Hiển thị tin nhắn dạng dòng thời gian hai chiều (Sinh viên - AI).
  - *Khối gợi ý câu hỏi thông minh (Quick Prompt Pills):*
    - "Tư vấn lộ trình kỳ tới để kéo CPA lên $\ge 2.50$ (bằng Khá)."
    - "Tôi vừa trượt môn Giải tích 2, kỳ sau bị ảnh hưởng thế nào?"
    - "Lên lộ trình học vượt 3.5 năm ngành CNTT."
    - "Kỳ này nên học cải thiện môn nào tốt nhất?"
  - *Ô nhập tin nhắn (Input Bar):* Hỗ trợ gõ văn bản, nút đính kèm bảng điểm mới (PDF/Ảnh), nút gửi câu hỏi.
  - *Chỉ báo trạng thái:* "AI đang đối chiếu khung CTĐT và bảng điểm cá nhân..." (Typing / Reasoning indicator).

#### Màn hình 3: Kết quả phân tích & Đề xuất Lộ trình học tập (Roadmap Recommendation View)
- **Mục tiêu:** Trình bày phương án lộ trình học tập được AI tối ưu hóa riêng cho sinh viên.
- **Thành phần giao diện:**
  - *Tóm tắt đề xuất (Executive Summary):*
    - Kỳ đề xuất: Học kỳ 1 – Năm học 2026-2027.
    - Tổng tín chỉ đề xuất: **18 tín chỉ** (Tải học tập: Cân bằng).
    - CPA dự kiến đạt được: **2.54** (Chính thức đạt xếp loại Khá).
  - *Bảng danh sách môn học đề xuất:*
    - Cột 1: Mã môn học & Tên môn học.
    - Cột 2: Số tín chỉ.
    - Cột 3: Loại môn (Bắt buộc / Tự chọn / Học lại / Học cải thiện).
    - Cột 4: Điểm mục tiêu cần đạt (VD: Điểm B - 3.0).
    - Cột 5: Lý do AI đề xuất (VD: "Gỡ môn tiên quyết sống còn", "Kéo CPA nhanh nhất").
  - *Phân tích rủi ro & Lời khuyên của AI:* "Nếu không học lại môn Toán rời rạc kỳ này, bạn sẽ bị hoãn ít nhất 3 môn chuyên ngành ở kỳ tiếp theo."
  - *Cụm nút hành động:*
    - `[ Xem Sơ đồ cây môn học ]` $\rightarrow$ Chuyển Màn hình 4.
    - `[ Tùy chỉnh môn học ]` $\rightarrow$ Chuyển Màn hình 5.
    - `[ Nhờ AI đề xuất phương án khác ]` $\rightarrow$ Sinh viên nhập thêm tiêu chí.
    - `[ Chấp nhận & Lưu lộ trình ]` $\rightarrow$ Chuyển Màn hình 5 để chốt kế hoạch.

#### Màn hình 4: Chi tiết & Sơ đồ Cây quan hệ môn học (Course Dependency Tree Layout)
- **Mục tiêu:** Trực quan hóa cấu trúc môn học, chỉ rõ môn tiên quyết, môn song hành và chuỗi ảnh hưởng.
- **Thành phần giao diện:**
  - *Bộ lọc:* Lọc theo kỳ, theo chuyên ngành hẹp, theo khối kiến thức.
  - *Sơ đồ cây tương tác (Interactive Node Graph):*
    - **Node Xanh lá (Đã hoàn thành):** Hiển thị điểm số đạt được (A, B, C...).
    - **Node Đỏ (Trượt / Nợ môn):** Rung cảnh báo, kèm mũi tên trỏ đến các môn bị chặn.
    - **Node Vàng viền đậm (Được AI đề xuất kỳ tới):** Đang được highlight để sinh viên đăng ký.
    - **Node Xám (Chưa đủ điều kiện học):** Khóa (Locked Icon).
  - *Panel Chi tiết học phần (khi click vào 1 môn):* Tên môn, số tín chỉ, mô tả học phần, danh sách môn tiên quyết, danh sách môn cần môn này làm tiên quyết.
  - *Nút điều hướng:* `[ Quay lại đề xuất ]`, `[ Thêm môn này vào kế hoạch ]`.

#### Màn hình 5: Tùy chỉnh & Xác nhận Kế hoạch học tập (Plan Finalization & Validation)
- **Mục tiêu:** Cho phép sinh viên chủ động thêm/bớt môn học nhưng được hệ thống kiểm tra ràng buộc thời gian thực.
- **Thành phần giao diện:**
  - *Danh sách môn dự kiến đăng ký:* Sinh viên có thể bấm `[ + Thêm môn ]` hoặc `[ Xóa môn ]`.
  - *Trình thẩm định quy chế tức thời (Real-time Rule Validator):*
    - **Tổng số tín chỉ:** $18/24$ tín chỉ $\rightarrow$ Hợp lệ (Tối thiểu 10, tối đa 24 theo quy chế HaUI).
    - **Ràng buộc tiên quyết:** 100% môn thỏa mãn điều kiện tiên quyết.
    - **Cảnh báo xung đột (nếu có):** "Cảnh báo: Bạn đang chọn 2 môn đồ án lớn trong cùng một kỳ, có thể gây quá tải."
  - *Công tắc xác nhận cam kết mục tiêu:* `[ Tôi đồng ý với kế hoạch học tập này ]`.
  - *Nút hoàn tất:* `[ Lưu vào Kế hoạch mục tiêu ]` $\rightarrow$ Chuyển sang màn hình theo dõi tiến độ.

---

### 3.2. Luồng chính 2: Mô phỏng & Tối ưu hóa điểm số What-if (What-if Simulation & Retake Optimizer Flow)

```
[ DASHBOARD / MENU ] ───> [ MÀN 6: GIẢ LẬP ĐIỂM SỐ KỲ TỚI ]
                                 │
                                 ├── (Thay đổi điểm dự kiến) ──> [ Cập nhật CPA thời gian thực ]
                                 │
                                 ├── (Bấm "Tối ưu học cải thiện")
                                 ▼
                          [ MÀN 7: BỘ TÍNH TOÁN CẢI THIỆN ĐIỂM ]
                            - Danh sách môn điểm D, D+, C
                            - Xếp hạng ROI tăng CPA
                            - Đề xuất: Học môn X kéo +0.12 CPA với 3 TC
                                 │
                                 ├── (Bấm "Tính điểm mục tiêu ngược")
                                 ▼
                          [ MÀN 8: BỘ TÍNH ĐIỂM MỤC TIÊU NGƯỢC ]
                            - Nhập CPA mong muốn: 3.20
                            - AI tính phân bổ điểm cần đạt:
                              + Môn A: Điểm A (8.5)
                              + Môn B: Điểm B+ (8.0)
```

#### Màn hình 6: Giả lập điểm số học kỳ tới (What-if Semester Simulator)
- Sinh viên chọn danh sách môn dự kiến học kỳ tới.
- Cho phép kéo thanh trượt điểm số (hoặc chọn điểm chữ A, B+, B, C+, C, D+, D, F) cho từng môn.
- Hệ thống tính toán tức thì:
  - **GPA học kỳ dự kiến:** (VD: 3.22)
  - **CPA tích lũy mới:** (VD: Từ 2.45 $\rightarrow$ Tăng lên 2.58 - Đạt ngưỡng Khá).
  - So sánh trực quan dạng biểu đồ đường trước và sau khi giả lập.

#### Màn hình 7: Bộ tính toán tối ưu học cải thiện (Retake ROI Optimizer)
- Tự động liệt kê toàn bộ các môn sinh viên đã học có điểm D, D+, C.
- Bảng phân tích hiệu quả cải thiện (CPA Sensitivity Matrix):
  - *Môn Triết học Mác - Lênin (3 TC - Điểm D):* Nếu học cải thiện lên B $\rightarrow$ CPA tăng **+0.09 điểm** (Chi phí: 3 TC).
  - *Môn Lập trình Hướng đối tượng (4 TC - Điểm D+):* Nếu học cải thiện lên A $\rightarrow$ CPA tăng **+0.16 điểm** (Chi phí: 4 TC - **Khuyên dùng số 1**).
- Nút bấm: `[ Đưa môn này vào lộ trình học kỳ tới ]`.

#### Màn hình 8: Tính điểm mục tiêu ngược (Goal-Backward Calculator)
- Sinh viên nhập mục tiêu: "Muốn tốt nghiệp loại Giỏi (CPA $\ge 3.20$) khi hoàn thành 135 tín chỉ".
- Hệ thống phân tích số tín chỉ còn lại và đưa ra bài toán phân bổ điểm số:
  - Cần tích lũy thêm: 67 tín chỉ.
  - Mức GPA trung bình các kỳ còn lại phải đạt: **$\ge 3.42$**.
  - Phân bổ chỉ tiêu: Tối thiểu 60% môn đạt điểm A, 40% môn đạt điểm B+, không có môn nào dưới B.

---

### 3.3. Luồng chính 3: Rà soát Điều kiện Tốt nghiệp & Cảnh báo Sớm (Graduation Audit & Early Warning Flow)

#### Màn hình 9: Bảng kiểm toán tốt nghiệp 100% (Graduation Degree Audit)
- **Thành phần giao diện:**
  - *Vòng tròn tiến độ tổng thể:* 82% Điều kiện tốt nghiệp hoàn thành.
  - *Danh mục điều kiện kiểm tra (Audit Checklist):*
    1. **Tổng số tín chỉ tích lũy:** Đạt 112 / 135 tín chỉ (Còn thiếu 23 tín chỉ).
    2. **Khối kiến thức bắt buộc:** Hoàn thành 100%.
    3. **Khối kiến thức tự chọn chuyên ngành:** Đã tích lũy 6 / 12 tín chỉ (Cảnh báo: Cần đăng ký thêm 2 môn tự chọn trong danh mục).
    4. **Chứng chỉ Chuẩn đầu ra Ngoại ngữ:** Đã nộp chứng chỉ TOEIC 550 (Hợp lệ - Tích xanh).
    5. **Chuẩn Tin học (MOS/IC3):** Chưa nộp (Cảnh báo đỏ: Hạn chót trước đợt xét tốt nghiệp 3 tháng).
    6. **Giáo dục thể chất & GDQP-AN:** Đã hoàn thành đầy đủ.
    7. **Điểm rèn luyện tích lũy:** 78 điểm (Loại Khá - Đạt yêu cầu).
  - *Nút hành động:* `[ Lập kế hoạch bù đắp các điều kiện còn thiếu ]` $\rightarrow$ AI tự động đưa các môn và chứng chỉ còn thiếu vào lộ trình học tập kỳ cuối.

---

## 4. CÁC LUỒNG PHỤ & THAO TÁC BỔ TRỢ (SECONDARY FLOWS)

### 4.1. Luồng A: Nhập & Đồng bộ Bảng điểm (Academic Record Ingestion)
- **Bước A1:** Tại Dashboard, sinh viên chọn `[ Cập nhật Bảng điểm ]`.
- **Bước A2:** Sinh viên tải lên file Bảng điểm xuất từ e-HaUI (File PDF hoặc Ảnh chụp bảng điểm cá nhân) hoặc nhập trực tiếp MSSV để trích xuất dữ liệu giả lập.
- **Bước A3:** Hệ thống OCR / Parser đọc tự động danh sách môn học, số tín chỉ, điểm chữ, điểm số và tính lại GPA/CPA.
- **Bước A4:** Hiển thị màn hình xem lại (Review & Confirm): Sinh viên kiểm tra tính chính xác, chỉnh sửa nếu có sai sót và bấm `[ Xác nhận lưu dữ liệu ]`.

### 4.2. Luồng B: Khám phá Khung CTĐT & Tra cứu Môn học (Curriculum Explorer)
- Sinh viên có thể tra cứu toàn bộ danh mục môn học thuộc ngành của mình.
- Xem chi tiết từng môn: Số tiết lý thuyết/thực hành, học phần tiên quyết, tài liệu tham khảo, giảng viên giảng dạy và đánh giá độ khó môn học từ cộng đồng sinh viên khóa trước.

---

## 5. THIẾT KẾ TRẠNG THÁI HỆ THỐNG & XỬ LÝ LỖI (EDGE CASES & ERROR FLOWS)

| Tình huống ngoại lệ / Rủi ro | Luồng xử lý giao diện (UI Handling) | Phản hồi của hệ thống |
| :--- | :--- | :--- |
| **Sinh viên vi phạm môn tiên quyết khi tự chọn môn** | Hiển thị Popup cảnh báo màu đỏ kèm sơ đồ minh họa môn bị chặn. | Nút `[ Thêm môn ]` bị vô hiệu hóa; AI gợi ý: *"Bạn cần học trước môn X trước khi đăng ký môn này."* |
| **Đăng ký vượt trần tín chỉ (> 24 TC) hoặc dưới sàn (< 10 TC)** | Thanh tải tín chỉ chuyển sang màu đỏ, hiển thị nhãn `[ Vi phạm quy chế HaUI ]`. | Không cho bấm `[ Lưu kế hoạch ]`; hiển thị gợi ý thêm/bớt môn cụ thể. |
| **AI không tìm được phương án thỏa mãn 100% yêu cầu sinh viên** | Hiển thị màn hình đề xuất phương án thỏa hiệp (Trade-off Screen). | *"Không thể ra trường sau 3 năm với CPA $\ge 3.6$ nếu không học kỳ hè. Đề xuất: Thêm 2 kỳ hè (mỗi kỳ 6 TC) hoặc kéo dài sang 3.5 năm."* |
| **Không tải được bảng điểm do lỗi định dạng file** | Hiển thị thông báo lỗi thân thiện tại ô tải file kèm file mẫu chuẩn. | Nút `[ Tải lại file ]` hoặc `[ Nhập điểm thủ công từng môn ]`. |
