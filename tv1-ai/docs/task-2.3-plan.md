# Kế hoạch Thực hiện Task 2.3: Phase 2 Flow Approval & Quality Gate Review

> **Vai trò:** TV1 — Lead + AI  
> **Repository:** `netrotion/QUAN-LY-HOC-TAP-TTCSN`  
> **Phương pháp:** Subagent-Driven Development / Quality Gate Review  
> **Mục tiêu:** Thực hiện review chính thức prototype của Phase 2, chỉ chốt `flow-approved-v1` khi có đủ bằng chứng thực tế. Không tạo false approval.  
> **Tài liệu bàn giao (Chỉ nằm trong `tv1-ai/**`):**  
> 1. `tv1-ai/docs/task-2.3-review.md`  
> 2. `tv1-ai/docs/task-2.3-owner-fixes.md`  
> 3. `tv1-ai/docs/task-2.3-contract-delta.md`  
> 4. `tv1-ai/docs/solution-v1.md` (cập nhật bảng P01–P13)  
> 5. (Điều kiện chặt chẽ) `tv1-ai/docs/flow-approved-v1.md` (Chỉ tạo khi 100% blocker được giải quyết).  

---

## 1. Ranh giới Sở hữu & Nguyên tắc Bắt buộc (Global Constraints)
1. **Ownership Lock:** TV1 chỉ được thao tác trong `tv1-ai/**`.
2. **Tuyệt đối không can thiệp:** `tv2-web/**`, `tv3-planner-ui/**`, `tv4-academic/**`, `tv5-platform/**`, root build files (`package.json`, `pom.xml`), lockfile, contracts, migrations.
3. **Không sửa hộ lỗi của owner khác:** Khi phát hiện lỗi ở phân hệ khác:
   - Ghi mã lỗi `F23-XXX`.
   - Chỉ rõ owner (TV2, TV3, TV4, TV5).
   - Chỉ rõ file/function liên quan.
   - Ghi expected behavior vs actual behavior.
   - Ghi mức độ: BLOCKER / MAJOR / MINOR.
   - Đề xuất sửa cụ thể để owner thực hiện.
4. **Trung thực về chất lượng (Quality Gate Honesty):**
   - Không biến test tĩnh/unit test thành interactive PASS.
   - Khi frontend build bị lỗi không thể tương tác trực quan: ghi nhận `INTERACTIVE_VERIFICATION_BLOCKED`.
   - Nếu còn lỗi BLOCKER/MAJOR, trạng thái cuối bắt buộc là `TASK_2_3_READY_FOR_OWNER_FIX`, tuyệt đối không phê duyệt `TASK_2_3_APPROVED`.
5. **Bảo tồn tài liệu nguồn:** Không sửa đổi các file trong `tv1-ai/docs/sources/`.

---

## 2. Các Trọng tâm Kiểm chứng (Review Focus & Suspicious Points)
- **Điểm A (Major - TV3):** `tv3-planner-ui/src/components/PlanHistoryModal.js:51` — `handleActivate(planId)` gọi `plannerStore.activatePlan()` mà không truyền `planId`. Kích hoạt nhầm `this.plan` thay vì bản được chọn trong lịch sử.
- **Điểm B (Major - TV3):** `tv3-planner-ui/src/services/plannerStore.js:463` — `restorePlan(planId)` nạp cứng `INITIAL_MULTI_SEMESTER_PLAN` thay vì nhân bản dữ liệu thật của bản ghi lịch sử tương ứng.
- **Điểm C (Major - TV3):** `tv3-planner-ui/src/pages/StudyPlannerPage.js:174` — `handleDiscardChanges()` gọi `plannerStore.resetToDefault()`, xóa trắng toàn bộ dữ liệu phiên làm việc về fixture bootstrap thay vì phục hồi snapshot bản `ACTIVE`.
- **Điểm D (Major - TV3):** `tv3-planner-ui/src/pages/StudyPlannerPage.js:307, 777` — Cho phép kích hoạt trực tiếp từ `DRAFT` sang `ACTIVE` mà không chặn bắt buộc qua trạng thái `VALIDATED`.
- **Điểm E (Architecture/Contract):** Frontend không phải nguồn sự thật của quy tắc học vụ. Validation bắt buộc phải qua Backend `AcademicFacade` (`POST /api/v1/planner/validate`).
- **Điểm F (Milestone Ownership):** Bác bỏ việc commit Task 2.2a của TV2 tự xưng milestone `flow-approved-v1`. TV1 là bên sở hữu duy nhất quyền phê duyệt mốc này tại Task 2.3.
- **Lỗi Cú pháp Build (Blocker - TV2):** `tv2-web/src/pages/AcademicProgressPage.jsx:439:6` thiếu đóng thẻ `<Modal>` làm `npm run build` (`vite build`) thất bại trong smoke check.

---

## 3. Phân rã Chi tiết 8 Công việc (Bite-Sized Task Breakdown)

### Task 1: Xác minh Dependency Gates & Baseline Revisions
- **Mục tiêu:** Kiểm tra sự hiện diện của 6 baseline commits và các file output vật lý trên đĩa.
- **Baseline Revisions:**
  - HEAD: `490d5cc31a3076062ebf21567098eebd11371b34`
  - TV2 Task 2.2a: `490d5cc31a3076062ebf21567098eebd11371b34`
  - TV3 Task 2.2b: `403f8f992de14ec3647705876b49d5cc42cddb82`
  - TV4 Task 2.2c: `0b82c363e8ae702f5c822eb0ecf90378466f1383`
  - TV5 Task 2.2d: `8dc807cf9ea6e7adf5bb9649e4921a4af07cab3c`
  - TV1 Task 2.2e: `565768af5b2abaf88a45f6329bcf191b49929316`
  - TV1 validation 2.2e: `f539379a8f62d2f1cdf3ca77efcb8bfe6f0e62ef`
- **Output:** Ghi nhận trạng thái PASS/FAIL cho từng phân hệ.

### Task 2: Chạy & Thu thập Bằng chứng Quality Gates Toàn diện
- **Mục tiêu:** Chạy tất cả test/check hiện có, ghi nhận exit code, test count, lỗi chi tiết.
- **Lệnh thực thi:**
  1. `node scripts/smoke-check.mjs` (Ghi nhận: Exit code 1, FAIL ở Check 7 Vite build do JSX syntax error tại `AcademicProgressPage.jsx:439:6`).
  2. `npm test` (Ghi nhận: 20/20 unit tests PASS, gồm 10 tests TV2, 10 tests TV3).
  3. `mvn test` (Ghi nhận: Backend multi-module tests PASS).
  4. `node scripts/check-ownership.mjs` (PASS).
  5. `node scripts/check-secrets.mjs` (PASS).
  6. `node scripts/check-architecture.mjs` (PASS).
  7. `node scripts/check-contracts.mjs` (PASS).
  8. `node scripts/check-lint.mjs` (PASS).

### Task 3: Thẩm định Chuyên sâu Ma trận P01–P13 & Điểm A–F
- **Mục tiêu:** Đối chiếu mã nguồn thực tế của TV2 và TV3 với 13 tiêu chí nghiệm thu:
  - **P01:** Điều hướng Dashboard ↔ Chat / Planner / What-if / Audit.
  - **P02:** Sinh viên chưa có bảng điểm (Empty Persona) → Hướng dẫn bổ sung hồ sơ, không sinh số giả.
  - **P03:** Nhập bảng điểm (Upload / Nhập tay / Review / Sửa / Hủy / Thử lại / Xác nhận) → Hủy không làm mất dữ liệu đã có.
  - **P04:** Chat hỏi quy chế → Trả lời có trích dẫn nguồn, không ép mở Planner.
  - **P05:** Chat tạo lộ trình → Proposal preview, phương án khác, không tự lưu.
  - **P06:** Proposal → Planner → Mở tree rồi quay lại không mất ngữ cảnh.
  - **P07:** Planner trực tiếp → Chỉnh sửa, Save Draft khác Activate.
  - **P08:** Chỉnh sửa bản ACTIVE → Chuyển sang DRAFT, Cancel giữ nguyên bản cũ, Activate có review & confirmation.
  - **P09:** What-if → Thử rồi thoát không đổi dữ liệu, Apply nạp sang Planner.
  - **P10:** ROI / Target reverse → Vào trực tiếp, không ép đi hết wizard.
  - **P11:** Audit → Chọn tiêu chí thiếu, tạo đề xuất bù đắp sang Planner, checklist không tự chuyển PASS.
  - **P12:** Reopen / Lịch sử → Mở lại kế hoạch cũ kế thừa dữ liệu thật, tạo bản nháp mới, lịch sử bất biến.
  - **P13:** Failure states → Lưu lỗi, API lỗi, rời màn chưa lưu có cảnh báo.

### Task 4: Soạn thảo Báo cáo Thẩm định `tv1-ai/docs/task-2.3-review.md`
- **Mục tiêu:** Xuất bản báo cáo chính thức với cấu trúc:
  - Phần 1: Metadata phiên bản, Git HEAD commit, Dependency Gates.
  - Phần 2: Kết quả Quality Gates với bằng chứng exit codes và log lỗi.
  - Phần 3: Bảng ma trận P01–P13 chi tiết (Preconditions, Route, Steps, Expected, Actual, Result, Evidence, Owner).
  - Phần 4: Phân tích 6 điểm nghi ngờ A–F.
  - Phần 5: Kết luận về trạng thái sẵn sàng nghiệm thu luồng.

### Task 5: Lập Sổ tay Lỗi & Yêu cầu Khắc phục `tv1-ai/docs/task-2.3-owner-fixes.md`
- **Mục tiêu:** Định danh từng lỗi bằng mã `F23-XXX`:
  - `F23-001` (BLOCKER - TV2): JSX unclosed `<Modal>` tag trong `AcademicProgressPage.jsx:439:6`.
  - `F23-002` (MAJOR - TV3): Bỏ qua `planId` trong `PlanHistoryModal.js:51` khi gọi `activatePlan()`.
  - `F23-003` (MAJOR - TV3): Hàm `restorePlan()` trong `plannerStore.js:463` hardcode dữ liệu mặc định.
  - `F23-004` (MAJOR - TV3): `handleDiscardChanges()` gọi `resetToDefault()`, làm mất snapshot ACTIVE.
  - `F23-005` (MAJOR - TV3): Cho phép kích hoạt `ACTIVE` trực tiếp từ `DRAFT` mà không kiểm tra `VALIDATED`.
  - `F23-006` (MINOR - TV2/TV3): Modal bù đắp của Audit chưa dispatch payload vào `plannerStore`.
  - `F23-007` (MINOR - TV2): Sử dụng nhầm mốc `flow-approved-v1` trong commit message Task 2.2a.

### Task 6: Xây dựng Đặc tả Điều chỉnh Hợp đồng `tv1-ai/docs/task-2.3-contract-delta.md`
- **Mục tiêu:** Lập bảng yêu cầu hợp đồng (Contract Delta) cho TV5 Task 2.4:
  - Phân loại: REQUIRED, RECOMMENDED, UI_ONLY, NO_CONTRACT_CHANGE.
  - Quy định ngữ nghĩa: Save Draft vs Activate, Concurrency Control (`dataRevision`), Stale-data conflict, Single ACTIVE plan constraint.

### Task 7: Cập nhật Trạng thái P01–P13 trong `tv1-ai/docs/solution-v1.md`
- **Mục tiêu:** Đồng bộ cột "Trạng thái" trong Mục 10 của `solution-v1.md` từ `CHƯA BẤM THỬ` sang kết quả thực tế dựa trên bằng chứng đã kiểm tra.

### Task 8: Kiểm toán Ranh giới, Quét Bảo mật & Lập Báo cáo Tổng kết
- **Mục tiêu:**
  - Chạy `git status` và `git diff` để xác minh 100% thay đổi chỉ thuộc `tv1-ai/**`.
  - Quét an toàn thông tin với `node scripts/check-secrets.mjs`.
  - Xuất báo cáo kết thúc Task 2.3 gồm đủ 9 hạng mục tiêu chuẩn.
