# Đặc Tả Điều Chỉnh Hợp Đồng Cho TV5 (Task 2.3 Contract Delta for Task 2.4)

> **Người lập:** TV1 — Lead + AI Architect  
> **Dự án:** HaUI Advisor (`netrotion/QUAN-LY-HOC-TAP-TTCSN`)  
> **Người tiếp nhận:** TV5 — Backend / DB / DevOps  
> **Mục tiêu:** Tổng hợp các yêu cầu điều chỉnh và làm rõ ngữ nghĩa hợp đồng giao tiếp (REST API, DTOs, Validation, Concurrency) phát sinh từ kết quả review prototype Phase 2 (Task 2.3), chuẩn bị cho công tác cài đặt backend hoàn chỉnh ở Task 2.4.  
> **Nguyên tắc ranh giới:** TV1 chỉ lập tài liệu khuyến nghị và đặc tả; tuyệt đối không tự ý chỉnh sửa mã nguồn trong `tv5-platform/contracts` hay `tv5-platform/app`.

---

## 1. Bảng Tổng Hợp Phân Loại Contract Delta

Mỗi đề xuất thay đổi được phân loại theo 4 cấp độ:
- **`REQUIRED`**: Bắt buộc phải có để đảm bảo tính toàn vẹn dữ liệu, quy tắc học vụ và chặn các lỗi nghiêm trọng (F23-002, F23-005).
- **`RECOMMENDED`**: Khuyến nghị kiến trúc để tăng tính tiện dụng và tối ưu trải nghiệm (hỗ trợ F23-003).
- **`UI_ONLY`**: Chỉ xử lý ở tầng giao diện người dùng (TV2/TV3), không yêu cầu thay đổi schema/API backend.
- **`NO_CONTRACT_CHANGE`**: Khẳng định các hợp đồng đã được TV5 thiết kế chuẩn ở Task 2.2d, cần giữ nguyên tính ổn định.

| Mã Delta | Phân Loại | Thao Tác / Endpoint Ảnh Hưởng | Đối Tượng Schema / DTO Liên Quan | Tóm Tắt Ngữ Nghĩa Cần Thiết |
|---|:---:|---|---|---|
| **CD-01** | **REQUIRED** | `ACTIVATE` (`POST /api/v1/planner/plans/{planId}/activate`) | `ActivateStudyPlanRequest`, `ActivateStudyPlanResponse` | Chặn kích hoạt nếu chưa `VALIDATED`; kiểm soát xung đột phiên bản qua `dataRevision` và đảm bảo nguyên tử hóa chuyển đổi `ACTIVE` -> `ARCHIVED`. |
| **CD-02** | **REQUIRED** | `VALIDATE` (`POST /api/v1/planner/validate`) | `ValidateStudyPlanRequest`, `ValidateStudyPlanResponse` | Backend `AcademicFacade` là single source of truth cho luật học vụ; trả về rõ ràng vi phạm (`violations`) và cảnh báo (`warnings`). |
| **CD-03** | **REQUIRED** | `SAVE` (`POST /api/v1/planner/plans`) | `SaveStudyPlanRequest`, `SaveStudyPlanResponse` | Phân biệt tuyệt đối Lưu nháp (`status = DRAFT`) với Kích hoạt (`status = ACTIVE`). Hỗ trợ lưu nháp kể cả khi còn cảnh báo học vụ. |
| **CD-04** | **RECOMMENDED** | `RESTORE` (`POST /api/v1/planner/plans/{planId}/restore` hoặc `/clone`) | `RestoreStudyPlanRequest`, `StudyPlanDetailResponse` | Khôi phục bản lưu trữ `ARCHIVED` thành một bản `DRAFT` mới kế thừa trọn vẹn danh sách môn và học kỳ thực tế. |
| **CD-05** | **RECOMMENDED** | `READ` (`GET /api/v1/planner/plans`) | `StudyPlanSummaryItem`, `StudyPlanListResponse` | API truy xuất danh sách lịch sử phiên bản kế hoạch của sinh viên kèm trạng thái (`ACTIVE`, `DRAFT`, `ARCHIVED`). |
| **CD-06** | **UI_ONLY** | Frontend Display & Interaction | N/A | Nhãn "Dự kiến" (`Projected`) bắt buộc cho CPA, GPA, học kỳ tốt nghiệp; Cancel hoàn tác về snapshot ACTIVE trong FE Store. |
| **CD-07** | **NO_CONTRACT_CHANGE** | Concurrency & Isolation | `StudentDataVersion`, `StudentContextProvider` | Giữ nguyên cơ chế cô lập ngữ cảnh sinh viên và tracking phiên bản dữ liệu nền tảng đã bàn giao ở Task 2.2d. |

---

## 2. Chi Tiết Các Yêu Cầu Thay Đổi Bắt Buộc (REQUIRED Deltas)

### CD-01: Ngữ nghĩa Kích hoạt Kế hoạch & Chốt chặn Thẩm định (ACTIVATE Operation)
- **Hành vi / Schema hiện tại (Existing Behavior):**
  - TV5 đã có DTO `ActivateStudyPlanRequest` (chứa `planId`, `expectedVersion`, `dataRevision`) và `ActivateStudyPlanResponse`.
  - Tuy nhiên, prototype của TV3 đang cho phép kích hoạt trực tiếp từ `DRAFT` và bỏ qua `planId` khi kích hoạt từ lịch sử (`F23-002`, `F23-005`).
- **Vấn đề (Problem):**
  Nếu backend không kiểm tra tính hợp lệ học vụ tại thời điểm kích hoạt, client có thể gửi request kích hoạt một kế hoạch vi phạm quy chế (ví dụ: đăng ký dưới 10 tín chỉ trong học kỳ chính, vi phạm điều kiện tiên quyết).
- **Ngữ nghĩa bắt buộc (Required Semantic):**
  1. **Pre-condition Chặt chẽ:** Thao tác kích hoạt **chỉ được phép thành công** khi kế hoạch ở trạng thái `VALIDATED` và không có vi phạm (`violations.isEmpty()`). Nếu kế hoạch có vi phạm, API phải trả mã `HTTP 422 Unprocessable Entity` kèm danh sách vi phạm chi tiết.
  2. **Kiểm soát xung đột phiên bản (Optimistic Locking):** So sánh `dataRevision` (hoặc `expectedVersion`) gửi lên với revision hiện hành của sinh viên. Nếu hồ sơ bảng điểm hoặc CTĐT đã thay đổi (stale data), API trả `HTTP 409 Conflict`.
  3. **Quy tắc Duy nhất 1 Bản ACTIVE (Single ACTIVE Plan Constraint):** Trong cùng một Database Transaction:
     - Chuyển bản kế hoạch `planId` mục tiêu sang trạng thái `ACTIVE`.
     - Chuyển tất cả các bản kế hoạch đang `ACTIVE` trước đó của sinh viên đó sang trạng thái `ARCHIVED`.
     - Ghi nhận `archivedPlanIds` trong `ActivateStudyPlanResponse`.
- **Endpoint & DTO ảnh hưởng:**
  - Endpoint: `POST /api/v1/planner/plans/{planId}/activate`
  - DTO: `ActivateStudyPlanRequest`, `ActivateStudyPlanResponse`
- **Owner chịu trách nhiệm:** **TV5** (Backend implementation).
- **Mức độ tương thích (Compatibility Impact):** Hoàn toàn tương thích với schema contracts V0/V2 đã có, chỉ bổ sung logic kiểm tra nghiệp vụ và transactional update tại Controller/Service.

---

### CD-02: Backend AcademicFacade là Nguồn Sự Thật Duy Nhất (VALIDATE Operation)
- **Hành vi hiện tại:**
  - Prototype TV3 đang tự kiểm tra cứng (hardcoded logic) các điều kiện tín chỉ 10-24 TC trong `plannerStore.validatePlan()`.
- **Vấn đề:**
  Frontend không thể và không được phép trở thành một Rule Engine thứ hai độc lập. Khi quy chế đào tạo thay đổi, nếu FE và BE không đồng nhất sẽ dẫn đến sai lệch nghiêm trọng.
- **Ngữ nghĩa bắt buộc:**
  1. Hợp đồng `POST /api/v1/planner/validate` phải tiếp nhận cấu trúc các học kỳ và môn học dự kiến, sau đó ủy quyền kiểm tra trực tiếp cho `AcademicFacade` (TV4 rule engine).
  2. Kết quả trả về phải phân tách tường minh giữa:
     - `valid`: `boolean` (true nếu không có lỗi chặn).
     - `status`: `StudyPlanStatus` (`VALIDATED` nếu hợp lệ, `DRAFT` nếu còn vi phạm).
     - `violations`: `List<String>` (Các lỗi vi phạm quy chế bắt buộc — chặn kích hoạt).
     - `warnings`: `List<String>` (Các cảnh báo tải học tập — cho phép lưu nháp nhưng khuyến cáo người dùng).
- **Endpoint & DTO ảnh hưởng:**
  - Endpoint: `POST /api/v1/planner/validate`
  - Request: `ValidateStudyPlanRequest` (semesters, courses).
  - Response: `ValidateStudyPlanResponse` (`valid`, `status`, `violations`, `warnings`).
- **Owner chịu trách nhiệm:** **TV5** (Controller) & **TV4** (`AcademicFacade`).

---

### CD-03: Phân định Tuyệt đối giữa Lưu Nháp và Kích Hoạt (SAVE vs ACTIVATE)
- **Hành vi hiện tại:**
  - `SaveStudyPlanRequest` và `SaveStudyPlanResponse` đã được định nghĩa.
- **Vấn đề:**
  Cần làm rõ ranh giới để TV3 và TV5 không đồng nhất việc bấm "Lưu nháp" với việc áp dụng kế hoạch chính thức.
- **Ngữ nghĩa bắt buộc:**
  1. **Lưu Nháp (`POST /api/v1/planner/plans`):**
     - Luôn lưu kế hoạch với trạng thái `status = DRAFT`.
     - Cho phép lưu kể cả khi kế hoạch chưa hoàn thiện hoặc còn vi phạm/cảnh báo học vụ (phục vụ nhu cầu lưu tạm thời gian làm dở của sinh viên).
     - Hỗ trợ tạo mới (`planId == null`) hoặc cập nhật bản nháp đang có (`planId != null`, kiểm tra `planVersion`).
     - Không làm thay đổi bản kế hoạch `ACTIVE` hiện tại của sinh viên.
  2. **Kích Hoạt (`POST /api/v1/planner/plans/{planId}/activate`):**
     - Là hành động áp dụng chính thức độc lập với Lưu nháp.
     - Phải trải qua kiểm tra `VALIDATED` như mô tả tại CD-01.
- **Owner chịu trách nhiệm:** **TV5**.

---

## 3. Các Yêu Cầu Khuyến Nghị Kiến Trúc (RECOMMENDED Deltas)

### CD-04: API Khôi Phục Phiên Bản Lịch Sử Thành Bản Nháp Mới (RESTORE Operation)
- **Vấn đề thực tế:**
  Lỗi `F23-003` tại TV3 cho thấy khi khôi phục một bản lưu trữ `ARCHIVED`, việc FE tự khởi tạo dữ liệu dễ dẫn đến sai lệch hoặc hardcode fixture.
- **Đề xuất của TV1:**
  Bổ sung endpoint chuyên biệt: `POST /api/v1/planner/plans/{planId}/restore` (hoặc `POST /api/v1/planner/plans/{planId}/clone`):
  - Backend đọc bản kế hoạch gốc có ID `planId` từ CSDL.
  - Tạo một bản ghi mới với `planId` mới, trạng thái `DRAFT`, tên `Bản sao từ [Tên cũ]`, kế thừa toàn bộ danh sách môn và học kỳ của bản gốc.
  - Trả về `StudyPlanDetailResponse` của bản nháp mới sinh ra.
  - Bản gốc trong lịch sử được giữ nguyên tính bất biến (`immutable`).
- **Tác động:** Giúp TV3 xử lý luồng Reopen/Restore một cách sạch sẽ, không cần lưu trữ toàn bộ payload nặng trong localStorage hay client store.

---

### CD-05: API Truy Xuất Lịch Sử Phiên Bản Kế Hoạch (READ History Operation)
- **Đề xuất của TV1:**
  Endpoint: `GET /api/v1/planner/plans` (hoặc `GET /api/v1/planner/history`):
  - Trả về danh sách tóm tắt tất cả các kế hoạch thuộc sinh viên hiện tại (`List<StudyPlanSummaryItem>`).
  - Mỗi mục tóm tắt bao gồm: `planId`, `planName`, `planVersion`, `status` (`ACTIVE`, `DRAFT`, `ARCHIVED`), `totalCredits`, `projectedCpa`, `updatedAt`.
  - Phục vụ trực tiếp cho `PlanHistoryModal` của TV3 hiển thị bảng so sánh và danh sách lọc.

---

## 4. Ghi Chú Phân Tầng Dữ Liệu & Giao Diện (UI_ONLY & NO_CONTRACT_CHANGE)

### CD-06: Nguyên Tắc "Projected != Actual" và "Preview != Persisted" (UI_ONLY)
- Toàn bộ các chỉ số tính toán trong Planner, Chat và What-if:
  - CPA dự phóng (`projectedCpa`)
  - GPA kỳ tới dự kiến (`expectedGpa`)
  - Học kỳ tốt nghiệp dự kiến (`expectedGraduationSemester`)
  - Điểm chữ mục tiêu (`targetGrade`)
  **phải được thể hiện rõ ràng bằng nhãn "Dự kiến" trên giao diện TV2/TV3**, không được hiển thị như kết quả học tập thực tế đã ghi nhận.
- Đề xuất lộ trình từ AI Advisor hoặc What-if Simulator chỉ là **Preview / Proposal tạm thời**, không được tự ý ghi đè bảng điểm chính thức, kế hoạch ACTIVE hay làm thay đổi tiến độ kiểm toán tốt nghiệp.

### CD-07: Bảo Toàn Kiến Trúc Nền Tảng Task 2.2d (NO_CONTRACT_CHANGE)
- Cấu trúc `StudentDataVersion` (gồm `transcriptVersion`, `curriculumVersion`, `policyVersion`, `lastUpdatedAt`) được thiết kế trong Task 2.2d hoàn toàn đáp ứng tốt việc kiểm soát xung đột dữ liệu học vụ.
- Cơ chế bảo mật và cô lập ngữ cảnh sinh viên thông qua `StudentContextProvider` (lấy danh tính từ token/session thay vì tin cậy `studentId` từ client) được giữ nguyên, đảm bảo an toàn tuyệt đối cho Phase 3.

---

## 5. Hướng Dẫn Triển Khai Cho TV5 Tại Task 2.4

1. **Tiếp nhận tài liệu:** TV5 đọc tài liệu này cùng với `tv1-ai/docs/task-2.3-owner-fixes.md` để nắm rõ bối cảnh các lỗi giao diện phát sinh từ phía TV3.
2. **Triển khai Controller & Service:**
   - Hoàn thiện nghiệp vụ cho `StudyPlanController.java`:
     - `POST /api/v1/planner/plans`: Xử lý lưu `DRAFT`.
     - `POST /api/v1/planner/plans/{planId}/activate`: Xử lý kiểm tra `VALIDATED`, transactional archive bản cũ, kích hoạt bản mới.
     - `POST /api/v1/planner/validate`: Kết nối với `DefaultAcademicFacade` của TV4.
3. **Kiểm thử tích hợp hợp đồng:**
   - Bổ sung integration test trong `tv5-platform/app/src/test/java/vn/haui/advisor/platform/web/StudyPlanSecurityAndVersionTest.java` kiểm chứng:
     - Kế hoạch chưa validate không thể activate (kỳ vọng 422).
     - Kích hoạt thành công chuyển bản cũ sang ARCHIVED và trả đúng `archivedPlanIds`.
     - Xung đột `dataRevision` trả về HTTP 409.
