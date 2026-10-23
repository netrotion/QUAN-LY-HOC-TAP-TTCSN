# BÁO CÁO NGHIỆM THU KỸ THUẬT TASK 4.3a
## NỐI PLANNER VÀO API THẬT (`planner-ui-live`)

- **Mã nhiệm vụ:** Task 4.3a (Phase 4 — Đợt C)
- **Thành viên phụ trách:** TV3 — FE Kế hoạch & AI (Planner UI)
- **Mốc bàn giao:** `planner-ui-live`: Planner kết nối API thật, lưu nháp, sửa ACTIVE kế thừa, hủy, kích hoạt, mở lại sau reload, giữ nội dung khi lỗi.
- **Thư mục làm việc:** `tv3-planner-ui/`
- **Ngày hoàn thành:** 23/10/2026

---

## 1. Yêu cầu & Căn cứ Nghiệm thu

Căn cứ bản phân công nhiệm vụ Phase 4 (`HaUI_Advisor_Solution_va_Prompt_theo_Phase.md` dòng 455–465):

```text
Thay mock Planner bằng API thật. Test tạo phương án trực tiếp không cần Chat, lưu nháp, sửa bản ACTIVE qua bản kế thừa, hủy, kích hoạt và mở lại sau reload. Giữ nội dung khi API lỗi.
```

- **Tiêu chí nghiệm thu:** UI test end-to-end với live API / contract; chỉ ACTIVE sau server xác nhận; bảo toàn dữ liệu chỉnh sửa khi gặp sự cố mạng hoặc lỗi máy chủ.
- **Căn cứ:** OpenAPI V1 (tag Planner, contracts-v1 1.4.0), `task-4.2b-planner-api-live.md`, PRD US-06/13, solution §13.2.

---

## 2. Kết quả Triển khai Chi tiết

### 2.1. Thay Mock Planner bằng API thật (`plannerApiService.js`)
- Xây dựng tầng adapter `plannerApiService.js` kết nối trực tiếp các endpoint chuẩn hợp đồng OpenAPI V1:
  - `POST /planner/generate`: Sinh phương án lộ trình học tập đề xuất (xem trước, chưa lưu, luôn `DRAFT`).
  - `POST /planner/validate`: Thẩm định kế hoạch học tập theo quy chế HaUI trên `AcademicFacade`.
  - `GET /planner/plans`: Lấy danh sách lịch sử các phiên bản kế hoạch của sinh viên.
  - `GET /planner/plans/{planId}`: Lấy dữ liệu chi tiết một kế hoạch học tập.
  - `POST /planner/plans`: Lưu nháp kế hoạch học tập (luôn `DRAFT`, tăng version, không làm mất bản `ACTIVE`).
  - `DELETE /planner/plans/{planId}?planVersion=...`: Hủy bản nháp kế hoạch trên máy chủ.
  - `POST /planner/plans/{planId}/activate`: Kích hoạt kế hoạch đạt `VALIDATED` sang `ACTIVE`.
  - `POST /planner/plans/{planId}/restore`: Khôi phục/sao chép kế hoạch cũ thành bản `DRAFT` mới.

### 2.2. Tạo phương án trực tiếp không cần Chat
- Nút `⚡ Tạo phương án đề xuất` trên thanh công cụ gọi trực tiếp `POST /planner/generate`.
- Kế hoạch đề xuất được server nạp từ DB hồ sơ sinh viên:
  - Luôn ở trạng thái `DRAFT`, chưa lưu (`planId = null`, `planVersion = null`).
  - Hiển thị rõ nhãn **"Dự kiến"** trên thẻ chỉ số CPA (`projectedCpa`).
  - Hiển thị thông tin phiên bản quy chế áp dụng (`policyVersion`, ví dụ: `policy-haui-demo-2026@0.0.1-v0`).
  - Hiển thị đầy đủ danh sách cảnh báo học vụ (`warnings`) nếu có (chưa xác nhận bảng điểm, phân bổ học kỳ).

### 2.3. Lưu nháp qua API (Save Draft)
- Gọi `POST /planner/plans`:
  - Trạng thái trả về luôn là `DRAFT` (kể cả khi nội dung đã qua kiểm tra nhanh hợp lệ).
  - Phản hồi mang thông điệp rõ ràng: *"Bản nháp chưa được kiểm tra điều kiện"*.
  - `planVersion` được gán / tăng tự động theo cơ chế optimistic locking của server.
  - Trạng thái `isValidated` của store được giữ là `false`, ngăn chặn kích hoạt sớm khi chưa qua thẩm định chính thức.

### 2.4. Sửa bản ACTIVE qua bản kế thừa
- Khi người dùng chỉnh sửa trên bản kế hoạch đang theo dõi (`ACTIVE`), hệ thống đánh dấu bản ghi nháp kế thừa:
  - Thuộc tính `sourcePlanId` trỏ về `planId` của bản `ACTIVE` gốc.
  - Khi lưu nháp (`saveDraftAsync`), client gửi ID của bản ACTIVE; server tự động tạo một bản ghi `DRAFT` mới kế thừa với `planVersion = 1` và `sourcePlanId = activePlanId`.
  - Bản `ACTIVE` gốc trong lịch sử và trên server được **bảo toàn nguyên vẹn** (bất biến), không bị ghi đè.

### 2.5. Hủy thay đổi chưa lưu & Hủy bản nháp trên máy chủ
- **Hủy thay đổi chưa lưu (`discardDraftChanges`):** Hoàn tác sạch sẽ về mốc `baseline` đã cam kết gần nhất (quay lại đúng bản `ACTIVE` nếu đang sửa trên bản ACTIVE), loại bỏ các môn tạm vừa thêm/bớt.
- **Hủy bản nháp trên máy chủ (`deleteDraftAsync`):**
  - Gọi `DELETE /planner/plans/{planId}?planVersion=...`.
  - Bản nháp được xóa khỏi cơ sở dữ liệu server và danh sách lịch sử phía client.
  - Giao diện tự động chuyển về hiển thị bản `ACTIVE` đang theo dõi còn lại.

### 2.6. Thẩm định & Kích hoạt kế hoạch — Xử lý 503 TOOL_NOT_READY
- **Thẩm định (`validatePlanAsync`):**
  - Gọi `POST /planner/validate` với `{ planId, planVersion, dataRevision }`.
  - Xử lý mã lỗi `503 TOOL_NOT_READY` an toàn khi công cụ thẩm định thật chưa sẵn sàng: hiển thị thông báo lỗi rõ ràng, tắt nút "Kích hoạt", bảo toàn 100% nội dung kế hoạch.
  - Khi thẩm định thành công: kế hoạch chuyển sang `VALIDATED`.
- **Kích hoạt (`activatePlanAsync`):**
  - Chốt chặn client & server: Chỉ bản `VALIDATED` mới được kích hoạt, từ chối kích hoạt trực tiếp từ `DRAFT` (`422 PLAN_NOT_VALIDATED`).
  - Kích hoạt thành công: Kế hoạch chuyển sang `ACTIVE`, đồng thời bản `ACTIVE` cũ trong lịch sử tự động chuyển sang `ARCHIVED` trong cùng giao dịch.

### 2.7. Mở lại sau reload & Khôi phục từ ARCHIVED
- **Mở lại sau reload (`fetchPlansAsync`):**
  - Khi mount màn hình `StudyPlannerPage`, client tự động gọi `GET /planner/plans`.
  - Nếu URL có tham số `?plan_id=...`: nạp chi tiết đúng kế hoạch được chỉ định qua `GET /planner/plans/{planId}`.
  - Nếu không có tham số: tự động tìm và nạp bản kế hoạch `ACTIVE` đang theo dõi chính thức.
- **Khôi phục bản lưu trữ (`restorePlanAsync`):**
  - Gọi `POST /planner/plans/{planId}/restore`.
  - Server nhân bản nội dung sang một bản ghi `DRAFT` mới; bản `ARCHIVED` gốc trong lịch sử được giữ nguyên.

### 2.8. Giữ nguyên nội dung khi API gặp sự cố
- Khi bất kỳ API nào (`generate`, `saveDraft`, `validate`, `activate`, `delete`, `restore`, `fetchPlans`) gặp sự cố (mạng mất kết nối, timeout, HTTP 409 Conflict, HTTP 500 Server Crash, HTTP 503 Service Unavailable):
  - Bắt lỗi an toàn, hiển thị Toast cảnh báo hoặc thông báo lỗi cho người dùng.
  - **TUYỆT ĐỐI KHÔNG làm mất dữ liệu:** Toàn bộ học kỳ, danh sách môn học, tổng số tín chỉ và các thay đổi người dùng đang thao tác trong `plannerStore` được bảo toàn nguyên vẹn 100%.

---

## 3. Danh mục Tệp Triển khai & Cập nhật

1. `tv3-planner-ui/src/services/plannerApiService.js` (Tạo mới):
   - Adapter kết nối 8 operations API Planner của OpenAPI V1.
2. `tv3-planner-ui/src/services/plannerStore.js` (Cập nhật):
   - Bổ sung `loadPlanDetail`, `fetchPlansAsync`, `generatePlanAsync`, `saveDraftAsync`, `validatePlanAsync`, `activatePlanAsync`, `deleteDraftAsync`, `restorePlanAsync`.
   - Cơ chế bảo toàn nội dung khi API lỗi.
3. `tv3-planner-ui/src/pages/StudyPlannerPage.js` (Cập nhật):
   - Mount effect nạp kế hoạch từ server hoặc URL `plan_id`.
   - Nối nút Tạo phương án (`handleGeneratePlan`), Lưu nháp, Kiểm tra điều kiện, Kích hoạt với API thật.
   - Hiển thị nhãn `(Dự kiến)` cho CPA, badge `Quy chế`, badge `Kế thừa`.
4. `tv3-planner-ui/src/components/PlanHistoryModal.js` (Cập nhật):
   - Hỗ trợ gọi API xóa bản nháp (`handleDeleteDraft`), khôi phục (`handleRestore`), kích hoạt (`handleActivate`).
5. `tv3-planner-ui/src/index.js` (Cập nhật):
   - Export `plannerApi` và các hàm hợp đồng.
6. `tv3-planner-ui/test/task-4.3a-planner-live.test.mjs` (Tạo mới):
   - 8 ca kiểm thử tích hợp live API tự động xác thực toàn bộ tiêu chí nghiệm thu Task 4.3a (100% pass).
7. `tv3-planner-ui/docs/task-4.3a-planner-live-report.md` (Tạo mới):
   - Báo cáo kỹ thuật chi tiết mốc bàn giao `planner-ui-live`.
