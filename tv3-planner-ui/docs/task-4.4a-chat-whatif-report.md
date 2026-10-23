# BÁO CÁO NGHIỆM THU KỸ THUẬT TASK 4.4a
## NỐI CHAT VÀ WHAT-IF VỀ PLANNER THẬT (`student-planning-e2e-ready`)

- **Mã nhiệm vụ:** Task 4.4a (Phase 4 — Đợt D)
- **Thành viên phụ trách:** TV3 — FE Kế hoạch & AI (Planner UI)
- **Mốc bàn giao:** `student-planning-e2e-ready`: Thay mock Chat/What-if; Chạy Chat → proposal → Planner; What-if/ROI/goal → review diff → save/cancel; Mở lại kế hoạch, cập nhật kết quả học kỳ và đối chiếu; Link file đính kèm dùng importer chung.
- **Thư mục làm việc:** `tv3-planner-ui/`
- **Ngày hoàn thành:** 23/10/2026

---

## 1. Yêu cầu & Căn cứ Nghiệm thu

Căn cứ bản phân công nhiệm vụ Phase 4 (`HaUI_Advisor_Solution_va_Prompt_theo_Phase.md` dòng 488–498):

```text
Thay mock Chat/What-if. Chạy Chat→proposal→Planner; What-if/ROI/goal→review diff→save/cancel. Mở lại kế hoạch, cập nhật kết quả học kỳ và đối chiếu. Link file đính kèm dùng importer chung.
```

- **Tiêu chí nghiệm thu:** E2E không mock nghiệp vụ; hủy không thay bản cũ, nguồn click đúng, Chat hỏi lại đúng ngữ cảnh.
- **Căn cứ:** OpenAPI V1 (tag Advisor, Simulation, Planner; contracts-v1 1.5.0), PRD US-06, US-13, solution §13.2, `task-4.3b-whatif-reconcile-chat.md`.

---

## 2. Kết quả Triển khai Chi tiết

### 2.1. Thay Mock Chat bằng API thật (`POST /advisor/chat`)
- Adapter `plannerApiService.js` kết nối trực tiếp `POST /advisor/chat`:
  - Client tự động sinh `conversationId` theo chuẩn UUID (`crypto.randomUUID()`) cho hội thoại mới.
  - Payload gửi lên: `{ conversationId, message, clientTimestamp }`.
  - Phản hồi chứa: `answer`, `sources` (trích dẫn quy chế thật kèm `sourceId`, `title`, `section`), `actions`, `warnings`, `planProposal`.
- **Xử lý an toàn lỗi 503 `AI_UNAVAILABLE`:**
  - Nhận diện mã lỗi 503, thuộc tính `retryable: true` và thời gian chờ từ header `Retry-After`.
  - Hiển thị thông báo rõ ràng cho sinh viên và nút **"Thử lại"** ngay cạnh tin nhắn.
  - **TUYỆT ĐỐI KHÔNG** hiển thị câu trả lời giả mạo hay bịa đặt khi mô hình AI chưa sẵn sàng.
  - Câu hỏi của sinh viên được giữ nguyên vẹn trong ô nhập liệu / lịch sử.
- **Xử lý lỗi 409 `CONVERSATION_BUSY`:**
  - Nhận diện xung đột ghi đồng thời, thông báo sinh viên gửi lại câu hỏi mà không làm mất nội dung.

### 2.2. Luồng Chat → proposal → Planner
- Khi sinh viên hỏi về lộ trình/kế hoạch, server trả về `planProposal` (không null).
- Giao diện Chat hiển thị **Plan Proposal Card** với:
  - Tóm tắt lộ trình đề xuất và danh sách học kỳ.
  - CPA dự kiến kèm nhãn rõ ràng **"(Dự kiến)"**.
  - 3 Nhánh hành động:
    1. **"Chấp nhận phương án"**: Nạp proposal vào `plannerStore` dưới dạng bản nháp `DRAFT` và tự động điều hướng sang `/planner`.
    2. **"Phương án khác"**: Tự động re-prompt AI để yêu cầu phương án nhẹ tải hơn.
    3. **"Hủy"**: Đóng card đề xuất, bảo toàn 100% bản kế hoạch hiện tại.

### 2.3. Thay Mock What-if bằng API thật (`POST /simulation/*`)
Kết nối đầy đủ 3 công cụ What-if cốt lõi với backend thật:
1. **Giả lập điểm kỳ tới (`POST /simulation/grades`):**
   - Chạy trên danh sách môn và điểm kỳ vọng: trả về `currentCpa`, `expectedGpa`, `projectedCpa`, `cpaDelta`, `policyVersion`, `dataRevision`.
   - Toàn bộ điểm số được gán nhãn **"Dự kiến"**.
   - An toàn tuyệt đối với sinh viên chưa có bảng điểm: `currentCpa` và `cpaDelta` nhận giá trị `null` mà không gây lỗi hoặc gán số 0 giả.
2. **Xếp hạng tối ưu cải thiện ROI (`POST /simulation/retake-ranking`):**
   - Trả danh sách `recommendations` xếp hạng theo độ nhạy tăng CPA trên mỗi tín chỉ.
   - Hiển thị badge ROI, `cpaDelta`, lý do khuyến nghị cho từng môn học.
3. **Tính điểm mục tiêu ngược (`POST /simulation/target-grades`):**
   - Nhận `targetCpa`: tính toán `requiredAverageGpa` cần đạt trên số tín chỉ còn lại và danh mục `courseRequirements`.

### 2.4. What-if/ROI/goal → Review Diff → Save/Cancel
- Khi sinh viên bấm **"Áp dụng vào Kế hoạch"** từ bất kỳ công cụ What-if nào:
  - Hệ thống tạo một bản ghi đề xuất mang siêu dữ liệu so sánh (Diff Review):
    - `creditsDelta`: Chênh lệch số tín chỉ giữa kế hoạch hiện hành và đề xuất.
    - `cpaDelta`: Mức tăng/giảm CPA dự kiến.
    - `addedCourses`: Danh sách môn học mới được bổ sung.
  - Tự động chuyển màn hình sang `StudyPlannerPage`.
- Màn hình Study Planner hiển thị **Banner Review Diff** trực quan:
  - **Nhánh Save (Lưu bản nháp):** Bấm "Lưu bản nháp" gọi `POST /planner/plans` tạo bản ghi `DRAFT` mới trên server, tăng `planVersion`, **bảo toàn nguyên vẹn bản ACTIVE cũ**.
  - **Nhánh Cancel (Hủy thay đổi / Hủy đề xuất):** Bấm "Hủy" hoặc "↩️ Hủy thay đổi" hoàn tác sạch sẽ về mốc `baseline` đã cam kết (quay về đúng bản `ACTIVE` đang theo dõi), loại bỏ toàn bộ các môn vừa thử nghiệm.
  - Thao tác **"Hủy / Thoát"** từ chính What-if: Bảo toàn nguyên vẹn bảng điểm và bản ACTIVE.

### 2.5. Mở lại Kế hoạch, Cập nhật Kết quả Học kỳ và Đối chiếu (`POST /planner/reconcile`)
- **Mở lại kế hoạch sau reload:**
  - Client tự động gọi `GET /planner/plans` khi mount trang.
  - Nếu có tham số `?plan_id=...`: nạp đúng kế hoạch yêu cầu.
  - Nếu không: tự động nạp bản `ACTIVE` chính thức đang theo dõi.
- **Đối chiếu kế hoạch học kỳ (`reconcilePlanAsync`):**
  - Nút **"🔍 Đối chiếu học kỳ"** trên thanh công cụ mở Modal đối soát US-13.
  - Cho phép chọn học kỳ vừa có điểm (ví dụ: `2025_1`, `2025_2`, `2025_SUMMER`, `2026_1`).
  - Gọi `POST /planner/reconcile` với `{ planId, completedSemester, planVersion, dataRevision }`.
  - **Chốt chặn quy chế US-13:** Chỉ cho phép đối chiếu trên kế hoạch `ACTIVE`. Nếu gửi kế hoạch `DRAFT`, server trả lỗi `409 PLAN_NOT_ACTIVE`; client hiển thị cảnh báo nghiệp vụ rõ ràng: *"Chỉ có thể đối soát trên kế hoạch đang theo dõi (ACTIVE)"*.
  - Hiển thị kết quả:
    - Trạng thái: `✓ Kế hoạch ĐÚNG TIẾN ĐỘ` hoặc `⚠️ Cần điều chỉnh kế hoạch học tập`.
    - Danh sách môn đã hoàn thành (`completedCourses`).
    - Danh sách môn trượt / bỏ lỡ (`missedOrFailedCourses`).
    - Các điều chỉnh khuyến nghị (`adjustmentsRecommended`).
- **Tạo bản nháp điều chỉnh (`applyReconcileAdjustmentsAsDraft`):**
  - Nút **"⚡ Tạo bản nháp điều chỉnh (DRAFT)"** tự động tạo một bản nháp mới kế thừa bản `ACTIVE` gốc, đưa các môn trượt vào học kỳ tiếp theo để học lại.
  - Bản `ACTIVE` gốc trong lịch sử được giữ nguyên vẹn.

### 2.6. Link File Đính kèm Dùng Importer Chung
- Nút kẹp ghim (Attachment) trên thanh nhập Chat và các hành động gợi ý đính kèm bảng điểm điều hướng trực tiếp sang route `/transcript` (luồng nhập/bóc tách bảng điểm chung của TV2).
- Hỗ trợ gọi callback `onOpenTranscript` từ web host hoặc điều hướng trình duyệt an toàn.

### 2.7. Giữ Nguyên Nội dung khi API Lỗi
- Toàn bộ các API mới (`chatAdvisor`, `simulateGrades`, `rankRetakeCourses`, `calculateTargetGrades`, `reconcileStudyPlan`):
  - Khi gặp sự cố mạng, HTTP 409, 500 hay 503: Bắt lỗi an toàn, hiển thị Toast/ErrorBox.
  - **Bảo toàn 100% dữ liệu:** Câu hỏi chat, các tham số giả lập What-if, môn học và số tín chỉ trong `plannerStore` không bao giờ bị mất hoặc bị ghi đè dữ liệu rác.

---

## 3. Danh mục Tệp Triển khai & Cập nhật

1. **`tv3-planner-ui/src/services/plannerApiService.js`**:
   - Bổ sung 5 adapter API V1: `reconcileStudyPlan`, `chatAdvisor`, `simulateGrades`, `rankRetakeCourses`, `calculateTargetGrades`.
2. **`tv3-planner-ui/src/services/plannerStore.js`**:
   - Bổ sung `reconcileResult`, `getReconcileResult()`, `clearReconcileResult()`.
   - Bổ sung `reconcilePlanAsync(api, completedSemester)` và `applyReconcileAdjustmentsAsDraft()`.
   - Bổ sung cơ chế tính toán Diff Review (`diff`) trong `setIncomingProposal`.
3. **`tv3-planner-ui/src/pages/ChatAdvisorPage.js`**:
   - Nối API thật `plannerApi.chatAdvisor(api, ...)`.
   - Khởi tạo `conversationId` UUID chuẩn OpenAPI.
   - Xử lý lỗi 503 `AI_UNAVAILABLE` (retryable, Retry-After) và 409 `CONVERSATION_BUSY` không hiển thị câu trả lời giả mạo.
   - Điều hướng đính kèm về `/transcript`.
   - Render Plan Proposal Card linh hoạt với nhãn CPA dự kiến.
4. **`tv3-planner-ui/src/pages/WhatIfSimulatorPage.js`**:
   - Nối 3 API thật `simulateGrades`, `rankRetakeCourses`, `calculateTargetGrades`.
   - Gán nhãn `(Dự kiến)` cho các chỉ số CPA/GPA, xử lý an toàn giá trị `null`.
   - Tích hợp Diff Review khi áp dụng vào Planner.
5. **`tv3-planner-ui/src/pages/StudyPlannerPage.js`**:
   - Nút và Modal Đối chiếu kế hoạch học kỳ (`reconcileModal`).
   - Hiển thị Banner Review Diff chi tiết cho đề xuất từ Chat / What-if.
   - Hỗ trợ tạo bản nháp điều chỉnh lộ trình sau đối soát.
6. **`tv3-planner-ui/test/task-4.4a-chat-whatif-live.test.mjs`**:
   - 8 ca kiểm thử tích hợp tự động xác thực toàn bộ tiêu chí Task 4.4a (100% pass).
7. **`tv3-planner-ui/docs/task-4.4a-chat-whatif-report.md`**:
   - Báo cáo kỹ thuật chi tiết mốc bàn giao `student-planning-e2e-ready`.

---

## 4. Bằng chứng Kiểm thử Nghiệm thu

```text
✔ Task 4.4a - 1: Thay mock Chat bằng API thật (POST /advisor/chat) & Xử lý 503 AI_UNAVAILABLE an toàn
✔ Task 4.4a - 2: Luồng Chat → proposal → Planner (Chấp nhận đề xuất mở Study Planner)
✔ Task 4.4a - 3: Thay mock What-if/ROI/goal bằng API thật (POST /simulation/*)
✔ Task 4.4a - 4: What-if/ROI/goal → review diff → save/cancel (Bảo toàn bản ACTIVE khi hủy)
✔ Task 4.4a - 5: Mở lại kế hoạch, cập nhật kết quả học kỳ và đối chiếu (POST /planner/reconcile)
✔ Task 4.4a - 6: Link file đính kèm dùng importer chung của TV2 (/transcript)
✔ Task 4.4a - 7: Giữ nguyên nội dung khi API lỗi (Chat, Simulation, Reconcile)
✔ Task 4.4a - 8: Ranh giới Kiến trúc & Sở hữu của TV3

ℹ tests 108 | suites 0 | pass 108 | fail 0 | cancelled 0 | duration_ms 604ms
```

Toàn bộ 108 bài kiểm thử của dự án đã vượt qua thành công, hoàn thành trọn vẹn mốc bàn giao `student-planning-e2e-ready`.
