# BÁO CÁO NGHIỆM THU KỸ THUẬT TASK 3.9
## PHÂN HỆ KIỂM TOÁN TỐT NGHIỆP, TIẾN ĐỘ DASHBOARD, NÚT KẾ HOẠCH CŨ & BÁO CÁO IN HỌC VỤ

- **Mã nhiệm vụ:** Task 3.9 (Phase 3 — Đợt B)
- **Thành viên phụ trách:** TV2 — Frontend Platform & Academic Engineer
- **Mốc bàn giao:** `audit-ui-ready + báo cáo phần TV2`
- **Thư mục làm việc:** `tv2-web/`
- **Ngày hoàn thành:** 13/10/2026

---

## 1. Mục tiêu & Ranh giới Phạm vi (Scope & Strict Boundaries)

Căn cứ theo bản phân công nhiệm vụ Phase 3 (`HaUI_Advisor_Solution_va_Prompt_theo_Phase.md` dòng 365–375), TV2 đảm nhiệm việc xây dựng trọn vẹn phân hệ Kiểm toán tốt nghiệp (Graduation Degree Audit), khối tiến độ và nút mở kế hoạch cũ trên Dashboard, cùng hệ thống xuất báo cáo chuẩn in ấn A4 (`@media print`):

```text
Code Audit checklist/warning/đường bù đắp, tiến độ Dashboard và nút mở kế hoạch cũ. Code report với print CSS để sinh viên in/lưu PDF, ghi rõ báo cáo hiện tại hay dự kiến. Viết phần báo cáo FE học vụ tại tv2-web/docs/report; chưa gom file của người khác.
```

### Ranh giới nghiêm ngặt đã tuân thủ:
1. **Phạm vi thư mục:** Chỉ tạo và chỉnh sửa tệp trong `tv2-web/`. Không chạm vào `tv1-ai/`, `tv3-planner-ui/`, `tv4-academic/` hoặc `tv5-platform/`. Chưa gom file báo cáo của các vai trò khác theo đúng quy định.
2. **Nguyên tắc tính toán học vụ:** TUYỆT ĐỐI KHÔNG tự tính điểm CPA/GPA hay tự suy luận điều kiện tiên quyết bằng logic JavaScript ở Frontend. Mọi số liệu tính toán, trạng thái học phần và thẩm định checklist đều do Mock Academic Service Adapter cung cấp theo chuẩn Contract V1.
3. **An toàn AI:** Không import thư viện LLM hoặc gọi API trí tuệ nhân tạo trực tiếp từ trình duyệt Frontend.

---

## 2. Kiến trúc & Chi tiết Triển khai Phân hệ Kiểm toán Tốt nghiệp (Màn hình 9)

### 2.1. Bảng Kiểm toán 100% Tiêu chí (Audit Checklist & 3 Trạng thái)
Tại trang `/audit` (và alias `/progress`), hệ thống đối soát toàn diện 7 hạng mục điều kiện tốt nghiệp của sinh viên Đại học Công nghiệp Hà Nội (Màn hình 9 UI Flow & FR-17):

1. **Tổng số tín chỉ tích lũy toàn khóa (BR-10):** Đạt 112 / 135 tín chỉ (còn thiếu 23 tín chỉ).
2. **Khối kiến thức giáo dục đại cương & bắt buộc ngành:** Hoàn thành 94 / 94 tín chỉ (100%).
3. **Khối kiến thức tự chọn chuyên ngành:** Đã tích lũy 6 / 12 tín chỉ (Cảnh báo: Cần bổ sung thêm 2 môn tự chọn trong danh mục).
4. **Chứng chỉ Chuẩn đầu ra Ngoại ngữ:** Đã nộp chứng chỉ TOEIC 550 (Hợp lệ — Tích xanh, nhãn `DEMO_UNVERIFIED`).
5. **Chứng chỉ Chuẩn đầu ra Tin học quốc tế (MOS/IC3):** Chưa nộp (Cảnh báo đỏ AC-05: Hạn chót trước đợt xét tốt nghiệp 3 tháng — `2027-03-31`).
6. **Giáo dục thể chất & Giáo dục Quốc phòng - An ninh:** Đã hoàn thành đầy đủ chứng chỉ.
7. **Điểm rèn luyện tích lũy toàn khóa:** Đạt 78 điểm (Loại Khá — Đạt yêu cầu).

#### Ma trận 3 Trạng thái Kiểm toán:
| Trạng thái | Mã dữ liệu | Huy hiệu hiển thị (UI Badge) | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- |
| **ĐẠT** | `completed: true` | `✓ ĐẠT (Hợp lệ)` (Xanh lá) | Sinh viên đã hoàn thành đủ khối lượng/chứng chỉ theo chuẩn |
| **THIẾU** | `completed: false` | `⚠️ CÒN THIẾU` hoặc `🚨 CẢNH BÁO ĐỎ` (Cam / Đỏ) | Chưa đạt; cảnh báo đỏ nếu là chứng chỉ sắp quá hạn (MOS) hoặc môn nợ tiên quyết |
| **CHƯA BIẾT / CHỜ DUYỆT** | `completed: null` / `undefined` / `UNKNOWN` | `○ CHƯA XÁC ĐỊNH / CHỜ DUYỆT` (Xám) | Hồ sơ chuyển điểm, chứng chỉ ngoại khóa đang chờ phòng Đào tạo đối soát |

---

### 2.2. Cơ chế Đường Bù đắp Audit (Remediation Proposal — F23-006)
- **Vấn đề đã khắc phục:** Trước đây nút "Lập kế hoạch bù đắp các điều kiện còn thiếu" chỉ điều hướng rỗng sang `/planner` mà không gửi kèm dữ liệu đề xuất.
- **Giải pháp triển khai:**
  1. Khi sinh viên bấm `[ 🛠️ Lập kế hoạch bù đắp các điều kiện còn thiếu ]`, hệ thống mở Modal trực quan tóm tắt các điều kiện thiếu (nợ môn `MATH1002`, thiếu 6 TC tự chọn, nhắc thi MOS trước `2027-03-31`).
  2. Khi bấm `[ Chuyển sang Màn hình 5 (Xác nhận Kế hoạch) → ]`, hệ thống tự động:
     - Tạo payload `AUDIT_REMEDIATION_PROPOSAL` với cấu trúc lộ trình 2 học kỳ (Kỳ 7: 15 TC; Kỳ 8: 10 TC Đồ án; CPA dự kiến 3.25).
     - Nạp trực tiếp vào `plannerStore.setIncomingProposal(proposal)`.
     - Phát sự kiện `CustomEvent('haui:planner:proposal')` với `detail` đầy đủ.
     - Điều hướng an toàn sang `/planner` để màn hình kế hoạch hiển thị ngay banner đề xuất bù đắp.

---

### 2.3. Hệ thống Báo cáo Học vụ & Print Stylesheet (`@media print`)

Một trong những tiêu chí nghiệm thu khắt khe nhất của Task 3.9 là **"Bản in không lẫn dự kiến với thực tế"**. TV2 đã thiết kế giải pháp tách biệt hoàn toàn giữa hai chế độ:

#### A. Bộ chuyển đổi chế độ xem (Report Mode Switcher)
Giao diện cung cấp thanh chuyển đổi nhanh giữa:
- **`📋 Báo cáo Thực tế (Hiện tại)`:** Phản ánh dữ liệu chính thức ghi nhận trên cổng e-HaUI (82% tiến độ, 112/135 TC, CPA thực tế 2.45, 5/7 tiêu chí đạt, còn thiếu 2 điều kiện).
- **`🔮 Báo cáo Dự kiến (Kèm Lộ trình Bù đắp)`:** Phản ánh dữ liệu mô phỏng nếu sinh viên hoàn thành toàn bộ môn nợ, tín chỉ tự chọn và chứng chỉ MOS (100% tiến độ, 135/135 TC, CPA dự kiến 3.25 Loại Giỏi, 7/7 tiêu chí đạt).

#### B. Phân định rạch ròi trên Bản in Khổ A4 (`@media print`):
1. **Tiêu đề Báo cáo in ấn:**
   - Thực tế: `BÁO CÁO KIỂM TOÁN TỐT NGHIỆP — DỮ LIỆU THỰC TẾ (HIỆN TẠI)`
   - Dự kiến: `BÁO CÁO KIỂM TOÁN TỐT NGHIỆP — DỰ KIẾN (KÈM LỘ TRÌNH BÙ ĐẮP)`
2. **Huy hiệu / Watermark in ấn:**
   - Thực tế: `● BÁO CÁO THỰC TẾ — PHẢN ÁNH DỮ LIỆU CHÍNH THỨC e-HaUI`
   - Dự kiến: `⚠️ BÁO CÁO MÔ PHỎNG DỰ KIẾN (SIMULATION ONLY) — KHÔNG THAY THẾ BẢNG ĐIỂM CHÍNH THỨC`
3. **Cảnh báo Pháp lý Bắt buộc (Print Disclaimer):**
   - **Bản Dự kiến:** Hiển thị khung viền đỏ nổi bật với nội dung:
     > *"🚨 CẢNH BÁO BẢN IN DỰ KIẾN / MÔ PHỎNG: Báo cáo này được lập dựa trên kế hoạch bù đắp các học phần nợ và chứng chỉ còn thiếu. TUYỆT ĐỐI KHÔNG CÓ GIÁ TRỊ PHÁP LÝ XÉT TỐT NGHIỆP CHÍNH THỨC cho đến khi tất cả học phần và chứng chỉ được hoàn thành trên hệ thống điểm thực tế e-HaUI."*
   - **Bản Thực tế:** Hiển thị khung viền xanh xác nhận phản ánh trung thực kết quả ghi nhận từ cơ sở dữ liệu đào tạo.
4. **Khối Chữ ký Hai bên:**
   - Phân biệt rõ ngữ cảnh: `Xác nhận Kế hoạch Học tập Bù đắp Dự kiến` (cam kết của sinh viên) đối chiếu với `Xác nhận Báo cáo Kết quả Học tập và Rà soát Điều kiện Tốt nghiệp Thực tế`.
5. **CSS Ẩn tương tác:**
   - Ẩn 100% Sidebar, Topbar, bộ nút bấm, thanh Switcher, Modal backdrop khi gọi lệnh in `window.print()`.

---

## 3. Hoàn thiện Tiến độ Dashboard & Nút Mở Kế hoạch Cũ (`/`)

Trên giao diện Dashboard (`DashboardPage.jsx`), TV2 đã bổ sung:
1. **Nút lối tắt mở kế hoạch học tập cũ:**
   - `[ 📂 Mở Kế hoạch Học tập Đã lưu (Kế hoạch cũ) ]` điều hướng sang `/planner?plan_id=plan-2026-9001` (kế hoạch `ACTIVE` gần nhất).
   - Nút `[ 🎓 Kiểm toán Tốt nghiệp & Báo cáo in ]` mở nhanh sang `/audit`.
2. **Khối "Tiến độ Học vụ & Kế hoạch Học tập Đã lưu":**
   - Hiển thị card trạng thái kế hoạch: `plan-2026-9001` (Học kỳ 1 2026–2027, 18 TC, trạng thái `ACTIVE`).
   - Hiển thị card tiến độ kiểm toán tốt nghiệp: `82% Hoàn thành` (5/7 Đạt, 2 điều kiện cần bù đắp).
   - Card liên kết xuất báo cáo học vụ in ấn PDF A4.

---

## 4. Ma trận Kiểm thử & Nghiệm thu (Test Matrix)

Bộ kiểm thử của `tv2-web` bao gồm **24 tests** tự động, chạy qua runner Node.js tích hợp sẵn của Antigravity (`node --test`), đảm bảo kiểm tra toàn diện:

| Test Suite | Số lượng test | Trạng thái | Nội dung kiểm tra |
| :--- | :---: | :---: | :--- |
| `audit-mock.test.mjs` | **6 tests** | **PASS** | - Bảng Kiểm toán tốt nghiệp đủ 7 tiêu chí & 3 trạng thái (Đạt, Thiếu, Chưa biết).<br>- Phân định rạch ròi Thực tế vs Dự kiến.<br>- Bản in `@media print` tuyệt đối không để lẫn lộn.<br>- Đường bù đắp Audit (F23-006) và phát CustomEvent sang TV3 Planner.<br>- Tiến độ Dashboard & Nút mở kế hoạch cũ (`/planner?plan_id=...`).<br>- Ranh giới kiến trúc và không import LLM. |
| `app.test.mjs` | **11 tests** | **PASS** | - Singleton API client (Mock interceptor, CSRF header, lọc studentId).<br>- Kịch bản UI Flow AC-01..AC-05, BR-01..BR-10.<br>- Route mounting TV3, design tokens, login personas, transcript 3 bước, sơ đồ cây môn học. |
| `academic-mock.test.mjs` | **7 tests** | **PASS** | - Contract V1 Schema DTOs compliance.<br>- 3 Personas mẫu (normal, at-risk, empty).<br>- Dashboard summary, transcript import/confirm, rule engine eligibility, ranh giới client không tự tính GPA/CPA. |
| **Tổng cộng** | **24 tests** | **100% PASS** | **Thời gian chạy: ~0.6s** |

---

## 5. Kết quả Kiểm định CI Gates Toàn Dự án

Các script kiểm tra tự động của CI Gates đều phản hồi đạt 100%:
- `scripts/check-ownership.mjs --role tv2`: **PASSED** — Mọi tệp sửa đổi đều nằm trọn vẹn trong `tv2-web/`.
- `scripts/check-contract-consumers.mjs --owner tv2`: **PASSED** — Không vi phạm schema contracts-v1.
- `scripts/check-architecture.mjs`: **PASSED** — Không có cyclic dependency hoặc vi phạm phân tầng.
- `scripts/check-contracts.mjs`: **PASSED** — Khớp 100% contracts-v1 1.2.0.
- `scripts/check-lint.mjs`: **PASSED** — Mã nguồn sạch sẽ, không có console log hay lỗi cú pháp.
- `scripts/check-secrets.mjs`: **PASSED** — Không có hardcoded secrets.

---

## 6. Kết luận & Mốc Bàn giao

Phân hệ Frontend Học vụ do TV2 đảm nhiệm đã đạt mốc **`audit-ui-ready + báo cáo phần TV2`**, sẵn sàng tích hợp với phân hệ Kế hoạch học tập / AI của TV3 và Backend Spring Boot của TV4.
