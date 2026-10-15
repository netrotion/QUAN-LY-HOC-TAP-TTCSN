# BÁO CÁO NGHIỆM THU KỸ THUẬT TASK 3.10
## CODE WHAT-IF, ROI VÀ MỤC TIÊU NGƯỢC (`simulation-ui-ready`)

- **Mã nhiệm vụ:** Task 3.10 (Phase 3 — Đợt B)
- **Thành viên phụ trách:** TV3 — FE Kế hoạch & AI (Planner UI)
- **Mốc bàn giao:** `simulation-ui-ready`: Bộ 3 công cụ What-if, ROI và mục tiêu ngược.
- **Thư mục làm việc:** `tv3-planner-ui/`
- **Ngày hoàn thành:** 15/10/2026

---

## 1. Yêu cầu & Căn cứ Nghiệm thu

Căn cứ bản phân công nhiệm vụ Phase 3 (`HaUI_Advisor_Solution_va_Prompt_theo_Phase.md` dòng 376–386):

```text
Code 3 công cụ tại cùng nhóm What-if, vào trực tiếp từng công cụ; chọn điểm/nhận kết quả mock, chọn môn cải thiện. Áp dụng tạo thay đổi cho Planner để xem lại; chỉ thử/thoát không sửa bảng điểm hoặc ACTIVE. Debounce request, bỏ response cũ đến muộn.
```

- **Tiêu chí nghiệm thu:** UI test nhập liên tiếp/response muộn/hủy/áp dụng; không gọi AI để kéo slider.
- **Căn cứ:** PRD FR-14–16; UI Flow màn 6/7/8 + solution.

---

## 2. Kết quả Triển khai Chi tiết

### 2.1. Nhóm 3 Công cụ What-if & Vào Trực tiếp Từng Công cụ
- **3 Công cụ cốt lõi tích hợp thống nhất tại màn hình `/what-if`:**
  1. **Màn 6: Giả lập điểm kỳ tới (`grades`):** Chọn điểm dự kiến từng môn học của học kỳ tới (Kỳ 7) để dự phóng GPA học kỳ, CPA tích lũy mới, chênh lệch CPA và biến chuyển xếp loại bằng tốt nghiệp.
  2. **Màn 7: Xếp hạng tối ưu học cải thiện ROI (`retake`):** Liệt kê các môn điểm thấp (D, D+, C, F); phân tích độ nhạy tăng CPA trên mỗi tín chỉ (`cpaDelta / credits`), xếp hạng theo ROI và gắn nhãn badge khuyên dùng (Khuyên dùng số 1, số 2 gỡ nút thắt tiên quyết).
  3. **Màn 8: Tính điểm mục tiêu ngược (`target`):** Nhập mức CPA mục tiêu tốt nghiệp (2.80 Khá, 3.20 Giỏi, 3.60 Xuất sắc); hệ thống tính toán tổng số tín chỉ còn lại và phân bổ GPA trung bình tối thiểu cần đạt ở các kỳ còn lại.
  *(Tùy chọn bổ trợ: Kịch bản học vượt 3.5 năm).*
- **Vào trực tiếp từng công cụ:**
  - Hỗ trợ URL Query Parameter: `/what-if?tool=grades`, `/what-if?tool=retake`, `/what-if?tool=target`.
  - Hỗ trợ prop điều khiển: `<WhatIfSimulatorPage initialTool="retake" />` hoặc `<WhatIfSimulatorPage tool="target" />`.
  - Thanh Tab Selector trực quan 1-click chuyển đổi tức thời giữa 3 công cụ.

### 2.2. Chọn điểm / Nhận kết quả mock, Chọn môn cải thiện
- **Giả lập điểm kỳ tới:**
  - Selector điểm chuẩn thang chữ HaUI: `A (4.0)`, `B+ (3.5)`, `B (3.0)`, `C+ (2.5)`, `C (2.0)`, `D+ (1.5)`, `D (1.0)`, `F (0.0)`.
  - Nhận kết quả: CPA hiện tại (2.45), GPA kỳ tới dự phóng, CPA tích lũy mới (2.58), chênh lệch (+0.13), chuyển biến xếp loại bằng.
- **ROI học cải thiện:**
  - Checkbox cho phép sinh viên chủ động chọn/bỏ chọn từng môn muốn cải thiện.
  - Tùy chọn điểm mục tiêu từng môn (ví dụ từ D+ lên A).
  - Tự động tổng hợp số môn chọn, tổng tín chỉ học lại và tổng CPA tăng thêm thời gian thực.
- **Tính điểm mục tiêu ngược:**
  - Input số hoặc preset nhanh (`2.80`, `3.20`, `3.60`).
  - Đánh giá khả thi (Achievable status) và chi tiết phân bổ điểm các môn chuyên ngành then chốt.

### 2.3. Cơ chế Debounce & Bỏ Response cũ đến muộn (Out-of-order Response Dropping)
- **Debounce 300ms:** Khi người dùng thay đổi điểm liên tiếp (chọn môn, đổi điểm chữ, gõ mục tiêu CPA), hệ thống debounce 300ms, không spam request bất đồng bộ liên tục.
- **Sequence Tracking & Out-of-order Drop:**
  - Mỗi request gán sequence ID tăng dần (`++requestIdRef.current`).
  - Khi một response bất đồng bộ trả về, hệ thống kiểm tra `requestId === requestIdRef.current`.
  - Nếu request trước đó về muộn hơn request mới nhất (do mạng delay hoặc timeout), response cũ **bị hủy bỏ (drop) an toàn**, giao diện tuyệt đối không bị giật hoặc hiển thị kết quả cũ đè lên dữ liệu mới.

### 2.4. Áp dụng tạo thay đổi cho Planner để xem lại — Bảo toàn Bảng điểm & Bản ACTIVE
- **Nút "Áp dụng vào Kế hoạch học tập (Xem lại tại Planner)":**
  - Đóng gói dữ liệu mô phỏng thành đối tượng `proposal` chuẩn.
  - Nạp vào `plannerStore.setIncomingProposal(proposal, sourceName)`.
  - **Tuyệt đối không tự ý kích hoạt kế hoạch thành ACTIVE**: Kế hoạch vẫn duy trì trạng thái hiện tại hoặc DRAFT khi nạp vào Planner để sinh viên tự xem lại diff và quyết định.
  - **Tuyệt đối không sửa bảng điểm gốc (`transcript`)**: Bảng điểm học vụ và dữ liệu lịch sử hoàn toàn được bảo toàn nguyên vẹn.
- **Nút "Thoát / Hủy thử nghiệm":**
  - Reset trạng thái mô phỏng What-if.
  - Hủy bỏ các proposal dở mà không tác động đến lịch sử kế hoạch, bản ACTIVE hay bảng điểm.

### 2.5. Ranh giới kiến trúc & Không gọi AI kéo slider
- Toàn bộ quá trình tính toán mô phỏng điểm chạy thông qua Mock/Calculation Engine thuần túy hoặc Simulation API (`api.simulation.*`).
- Tuyệt đối không import thư viện LLM, không gọi Spring AI / Gemini, và không gọi endpoint `advisor/chat`.

---

## 3. Danh mục Tệp Thay đổi

1. `tv3-planner-ui/src/pages/WhatIfSimulatorPage.js`:
   - Tái cấu trúc hỗ trợ 3 công cụ độc lập + vào trực tiếp qua URL query param / prop `initialTool`.
   - Triển khai cơ chế debounce 300ms và sequence tracking loại bỏ response cũ đến muộn.
   - Thêm checkbox chọn môn học cải thiện và tính toán động ROI thời gian thực.
   - Hoàn thiện luồng Áp dụng đề xuất sang Planner (không sửa ACTIVE/bảng điểm) và Thoát thử nghiệm.
2. `tv3-planner-ui/src/index.js`:
   - Export bổ sung `WHAT_IF_TOOLS` phục vụ các module bên ngoài gọi trực tiếp.
3. `tv3-planner-ui/test/task-3.10-whatif.test.mjs`:
   - 8 ca kiểm thử toàn diện xác thực 100% tiêu chí nghiệm thu Task 3.10.

---

## 4. Bằng chứng Kiểm thử (Test Evidence)

Chạy bộ kiểm thử tự động tại `tv3-planner-ui`:
```bash
npm test --prefix tv3-planner-ui
```

**Kết quả:**
- **Tổng số tests:** 38 tests (bao gồm 30 tests Phase 2 & Task 3.5 và 8 tests nghiệm thu Task 3.10).
- **Kết quả:** 38 passed, 0 failed (100% pass rate).
- **Thời gian chạy:** ~220ms.

Kiểm tra toàn hệ thống (Smoke check):
```bash
npm run smoke
```
- **10/10 tiêu chí:** 100% PASS (Secrets, Ownership, Architecture, Contracts V1, Lint, Workspaces Unit Tests, Build Vite/Rollup, Backend Reactor Tests).
