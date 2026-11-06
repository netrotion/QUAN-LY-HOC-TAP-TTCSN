# HƯỚNG DẪN THAO TÁC: LƯU, HỦY VÀ MỞ LẠI KẾ HOẠCH HỌC TẬP (TV3)
**Hệ thống Cố vấn Học tập Thông minh — HaUI Advisor**  
**Phân hệ phụ trách:** TV3 — FE Kế hoạch & AI (Planner UI)  
**Tài khoản thực nghiệm:** Sinh viên Phạm Hữu Duy (`2024604760` / Khóa K19)  
**URL áp dụng:** `https://projection-grow-phillips-organised.trycloudflare.com`

---

## 1. TỔNG QUAN VỀ VÒNG ĐỜI KẾ HOẠCH HỌC TẬP (PLAN LIFECYCLE)

Theo Quy chế đào tạo tín chỉ Đại học Công nghiệp Hà Nội và Đặc tả hợp đồng OpenAPI V1 (`contracts-v1` 1.5.0), kế hoạch học tập của sinh viên tuân thủ nghiêm ngặt cỗ máy trạng thái (State Machine):

```text
[ Chưa lưu / Đề xuất ]
        │
        ▼ (Bấm "Lưu bản nháp" -> POST /planner/plans)
    [ DRAFT ] ◄─────────────────────────────────────────────┐
        │                                                   │
        ▼ (Bấm "Kiểm tra điều kiện" -> POST /planner/validate)│ Sửa bản ACTIVE
   [ VALIDATED ] (Đủ điều kiện, không vi phạm quy chế)       │ tạo bản DRAFT
        │                                                   │ mới kế thừa
        ▼ (Bấm "Bắt đầu theo dõi" -> POST .../activate)     │
    [ ACTIVE ] ─────────────────────────────────────────────┘
        │ (Khi có một bản ACTIVE mới được kích hoạt)
        ▼
   [ ARCHIVED ] (Lưu trữ lịch sử, không thể chỉnh sửa trực tiếp)
```

### Nguyên tắc an toàn dữ liệu học vụ:
1. **Bất biến đối với bản đang áp dụng (`ACTIVE`):** Mọi thao tác chỉnh sửa, thử nghiệm trên bản `ACTIVE` **không bao giờ** làm thay đổi trực tiếp bản `ACTIVE`. Hệ thống luôn tự động nhân bản thành một bản nháp mới (`DRAFT`) kế thừa.
2. **Không ghi đè âm thầm:** Bất kỳ thao tác hủy hay thoát đều hoàn tác sạch về mốc `baseline` đã cam kết gần nhất.
3. **Chốt chặn quy chế:** Không thể kích hoạt (`ACTIVE`) một kế hoạch nếu chưa qua bước thẩm định (`VALIDATED`) và còn vi phạm các quy định (như sàn 10 TC, trần 24 TC, thiếu môn tiên quyết).

---

## 2. QUY TRÌNH THAO TÁC: LƯU KẾ HOẠCH (SAVE)

### Trường hợp 2.1: Lưu bản nháp mới tạo hoặc sinh từ Chat / What-if
1. **Bước 1:** Tại màn hình **Study Planner** (`/planner`), sau khi:
   - Nhận phương án đề xuất từ Chat Advisor (bấm *"Chấp nhận phương án"*).
   - Hoặc nhận đề xuất từ What-if Simulator (bấm *"Áp dụng vào Kế hoạch"*).
   - Hoặc bấm nút *"Tạo phương án đề xuất"* trực tiếp trên thanh công cụ Planner (`POST /planner/generate`).
2. **Bước 2:** Xem xét danh sách học kỳ và các học phần. Sinh viên có thể tùy biến:
   - Bấm **"+" (Thêm môn)** vào học kỳ mong muốn.
   - Bấm biểu tượng thùng rác để **Bỏ môn** khỏi học kỳ.
   - Bấm **Chuyển kỳ** để dời môn sang học kỳ khác.
3. **Bước 3:** Bấm nút **"💾 Lưu bản nháp"** trên thanh công cụ.
4. **Hệ thống xử lý:**
   - Client kiểm tra định dạng dữ liệu (`validatePlanFormat`).
   - Gửi yêu cầu `POST /api/v1/planner/plans` lên máy chủ kèm danh sách học phần và chỉ số dự kiến.
   - Server sinh mã kế hoạch mới (ví dụ `plan-2024604760-0003`) với trạng thái `DRAFT`, `planVersion: 1`.
   - Hiển thị Toast thông báo: *"Đã lưu nháp kế hoạch mới. Bản nháp chưa được kiểm tra điều kiện; hãy bấm 'Kiểm tra điều kiện' trước khi kích hoạt."*

### Trường hợp 2.2: Thẩm định và Kích hoạt thành Kế hoạch chính thức (`ACTIVE`)
1. **Bước 1:** Mở bản nháp `DRAFT` cần kích hoạt.
2. **Bước 2:** Bấm nút **"Kiểm tra điều kiện"** (`POST /planner/validate`).
   - Hệ thống đối soát với Cây tiên quyết, sàn 10 TC, trần 24 TC và hạn mức tín chỉ.
   - Nếu đạt chuẩn: Trạng thái chuyển thành `VALIDATED`.
   - *Lưu ý khi chạy Live:* Nếu máy chủ trả `503 TOOL_NOT_READY` ("Công cụ thẩm định kế hoạch chưa sẵn sàng"), giao diện hiển thị cảnh báo nghiệp vụ an toàn và giữ nguyên nội dung bản nháp, không làm mất dữ liệu.
3. **Bước 3:** Khi kế hoạch ở trạng thái `VALIDATED`, nút **"🚀 Bắt đầu theo dõi (Kích hoạt)"** sẽ sáng lên.
4. **Bước 4:** Xác nhận trong hộp thoại kích hoạt. Server gọi `POST /planner/plans/{planId}/activate`:
   - Kế hoạch chuyển thành `ACTIVE`.
   - Bản `ACTIVE` trước đó (nếu có) được tự động chuyển thành `ARCHIVED` trong lịch sử.

---

## 3. QUY TRÌNH THAO TÁC: HỦY KẾ HOẠCH & HOÀN TÁC (CANCEL / DISCARD)

Hệ thống hỗ trợ 3 cấp độ hủy thao tác an toàn:

### Cấp độ 3.1: Hủy đề xuất từ Chat Advisor hoặc What-if Simulator
- **Trong Chat Advisor (`/chat`):**
  - Khi AI Advisor hiển thị thẻ *Plan Proposal Card*, nếu sinh viên không ưng ý, bấm **"Hủy đề xuất"** (hoặc bấm *"Phương án khác"* để yêu cầu AI lập lại).
  - Kết quả: Thẻ đề xuất đóng lại, toàn bộ kế hoạch đang theo dõi trong `plannerStore` giữ nguyên 100%.
- **Trong What-if Simulator (`/what-if`):**
  - Trong quá trình kéo slider, chọn điểm, thử nghiệm kịch bản:
  - Nếu muốn thoát mà không áp dụng: Bấm nút **"Thoát thử nghiệm"** hoặc **"↩️ Hủy / Thoát"**.
  - Kết quả: Toàn bộ bảng điểm thực tế và kế hoạch `ACTIVE` được bảo toàn nguyên vẹn, không có bất kỳ thay đổi nào được ghi vào cơ sở dữ liệu.

### Cấp độ 3.2: Hủy thay đổi chưa lưu trên màn hình Study Planner
- Khi sinh viên đang thêm, bớt, chuyển môn học thử nghiệm trên giao diện nhưng chưa bấm *"Lưu bản nháp"*:
- Bấm nút **"↩️ Hủy thay đổi"** trên thanh tiêu đề Planner.
- **Hệ thống xử lý (`discardDraftChanges`):**
  - Hoàn tác sạch sẽ toàn bộ các môn vừa thao tác về đúng mốc `baseline` đã cam kết (quay về nguyên trạng bản `ACTIVE` hoặc bản nháp ban đầu).
  - Lịch sử phiên bản trong `PlanHistoryModal` được giữ nguyên.
  - Hiển thị Toast: *"Đã hoàn tác các thay đổi chưa lưu, quay về kế hoạch ban đầu."*

### Cấp độ 3.3: Hủy / Xóa hẳn một bản nháp trên máy chủ (`DELETE`)
- Dành cho các bản nháp `DRAFT` không còn nhu cầu sử dụng:
- Gọi API `DELETE /api/v1/planner/plans/{planId}?planVersion={version}`.
- Máy chủ xóa bản nháp khỏi cơ sở dữ liệu. Bản `ACTIVE` và các bản `ARCHIVED` khác không bị ảnh hưởng.

---

## 4. QUY TRÌNH THAO TÁC: MỞ LẠI KẾ HOẠCH (REOPEN / RESTORE)

### Trường hợp 4.1: Tự động mở lại sau khi Tải lại trang (Page Reload)
- Khi sinh viên reload trình duyệt (F5) hoặc mở route `/planner`:
- Client tự động gọi `GET /api/v1/planner/plans` lấy danh sách các kế hoạch của sinh viên.
- **Quy tắc ưu tiên mở:**
  1. Nếu trên URL có tham số `?plan_id=...`: Nạp chi tiết đúng kế hoạch đó (`GET /planner/plans/{planId}`).
  2. Nếu không có tham số: Hệ thống tự động tìm và nạp bản có trạng thái `ACTIVE` đang theo dõi.
  3. Nếu chưa có bản `ACTIVE`: Nạp bản kế hoạch gần nhất hoặc hiển thị khung sẵn sàng lập kế hoạch.
- Đảm bảo sinh viên luôn tiếp tục công việc tại mốc dữ liệu chính thức của mình.

### Trường hợp 4.2: Mở lại từ Lịch sử phiên bản (Plan History Modal)
1. **Bước 1:** Trên thanh công cụ Planner, bấm nút **"📜 Lịch sử & Mở lại"**.
2. **Bước 2:** Hộp thoại lịch sử hiển thị toàn bộ các phiên bản kế hoạch được sắp xếp theo thời gian:
   - Bản đang áp dụng (`ACTIVE`) — có nhãn nổi bật.
   - Các bản nháp (`DRAFT`).
   - Các bản lưu trữ cũ (`ARCHIVED`).
3. **Bước 3:** Đối với từng loại kế hoạch:
   - **Với bản DRAFT:** Bấm **"Mở bản nháp"** để tiếp tục chỉnh sửa.
   - **Với bản ARCHIVED:** Bấm **"Khôi phục thành bản nháp mới"** (`restorePlan`). Hệ thống nhân bản toàn bộ cấu trúc học kỳ và môn học của phiên bản lưu trữ thành một bản nháp mới (`DRAFT`), giữ nguyên bản gốc trong lịch sử.

### Trường hợp 4.3: Mở lại kế hoạch sau khi có điểm thi để Đối chiếu (`Reconcile`)
1. **Bước 1:** Sau khi kết thúc học kỳ và có điểm mới, tại màn hình Planner, bấm nút **"🔍 Đối chiếu học kỳ"**.
2. **Bước 2:** Chọn học kỳ vừa hoàn thành (ví dụ: `2025_1`, `2025_2`, `2025_SUMMER`).
3. **Bước 3:** Bấm **"Bắt đầu đối soát"** (`POST /planner/reconcile`):
   - Hệ thống so sánh giữa các môn dự kiến trong kế hoạch `ACTIVE` với bảng điểm thực tế e-HaUI.
   - Nếu có môn bị rớt (F) hoặc chưa đạt: Bấm **"⚡ Tạo bản nháp điều chỉnh (DRAFT)"** để tự động đưa các môn này vào học kỳ kế tiếp để học lại/học cải thiện.
   - Bản `ACTIVE` cũ vẫn được lưu giữ an toàn làm mốc đối chứng.
