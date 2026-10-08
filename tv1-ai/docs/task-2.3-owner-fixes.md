# Sổ Tay Lỗi & Yêu Cầu Khắc Phục Cho Các Phân Hệ (Task 2.3 Owner Fix Ledger)

> **Người lập:** TV1 — Lead + AI Architect  
> **Dự án:** HaUI Advisor (`netrotion/QUAN-LY-HOC-TAP-TTCSN`)  
> **Tài liệu căn cứ:** `tv1-ai/docs/task-2.3-review.md`  
> **Ngày lập:** 2026-10-08  
> **Mục đích:** Bàn giao danh mục khiếm khuyết kỹ thuật và nghiệp vụ được phát hiện trong đợt kiểm thử prototype Phase 2. TV1 không sửa hộ code của các owner khác; từng owner có trách nhiệm tiếp nhận, sửa đổi trên branch của mình và yêu cầu re-review.

---

## Bảng Tổng Hợp Khiếm Khuyết (Defect Summary)

| Mã Lỗi | Mức Độ (Severity) | Phân Hệ (Owner) | Kịch Bản Liên Quan | Tuyến / Màn Hình | Tóm Tắt Lỗi |
|---|:---:|:---:|:---:|---|---|
| **F23-001** | **BLOCKER** | **TV2** | P11, Smoke Check | `/progress`, `/audit` | Lỗi cú pháp JSX thiếu đóng thẻ `<Modal>` làm hỏng build Vite |
| **F23-002** | **MAJOR** | **TV3** | P08, P12 | `/planner` (History Modal) | Kích hoạt kế hoạch từ Lịch sử bỏ qua `planId`, kích hoạt nhầm bản hiện hành |
| **F23-003** | **MAJOR** | **TV3** | P12 | `/planner` (`plannerStore`) | Mở lại phiên bản cũ (`restorePlan`) hardcode nạp fixture mặc định |
| **F23-004** | **MAJOR** | **TV3** | P08 | `/planner` (`StudyPlannerPage`) | "Hủy thay đổi" (`handleDiscardChanges`) reset toàn bộ store về fixture bootstrap |
| **F23-005** | **MAJOR** | **TV3** | P07, P08 | `/planner` (`StudyPlannerPage`) | Cho phép kích hoạt `ACTIVE` trực tiếp từ `DRAFT` mà không kiểm tra `VALIDATED` |
| **F23-006** | **MINOR** | **TV2 / TV3** | P11 | `/audit` -> `/planner` | Nút lập kế hoạch bù đắp từ Audit điều hướng sang Planner nhưng không gửi payload |
| **F23-007** | **MINOR** | **TV2** | Milestone Governance | Documentation / Commit | Tự công bố milestone `flow-approved-v1` tại commit Task 2.2a |
| **F23-008** | **MINOR** | **TV3** | P04, P05 | `/chat` (`ChatAdvisorPage`) | Fallback mock của Chat tự động gắn card đề xuất kế hoạch cho cả câu hỏi quy chế |
| **F23-009** | **MINOR** | **TV5** | Ownership / CI | `scripts/check-ownership.mjs` | Script kiểm tra quyền khóa cứng cả thư mục `tv1-ai/docs/`, cản trở tài liệu Phase 2 của TV1 |

---

## Chi Tiết Từng Khiếm Khuyết & Yêu Cầu Sửa Đổi

### F23-001: Lỗi cú pháp JSX unclosed tag tại `AcademicProgressPage.jsx` gây hỏng build Vite
- **Mức độ:** **BLOCKER**
- **Owner chịu trách nhiệm:** **TV2** (`tv2-web`)
- **Kịch bản liên quan:** P11, Check 7 của `smoke-check.mjs`.
- **Tuyến đường dẫn (Route):** `/progress`, `/audit`.
- **Tệp tin & Dòng lệnh:** `tv2-web/src/pages/AcademicProgressPage.jsx:439:6` (liên đới thẻ mở dòng 382).
- **Các bước tái hiện (Steps to Reproduce):**
  1. Mở terminal tại thư mục gốc của repository.
  2. Chạy lệnh: `npm run build` (hoặc `npm run --workspace=@haui/web build`).
- **Hiện tượng thực tế (Actual Behavior):**
  Lệnh build thất bại với mã lỗi 1. Esbuild báo lỗi:
  ```text
  [vite:esbuild] Transform failed with 2 errors:
  E:/thuctapcosonganh/tv2-web/src/pages/AcademicProgressPage.jsx:439:6: ERROR: Unexpected closing "div" tag does not match opening "Modal" tag
  E:/thuctapcosonganh/tv2-web/src/pages/AcademicProgressPage.jsx:444:0: ERROR: Unexpected end of file before a closing "div" tag
  ```
- **Kỳ vọng (Expected Behavior):**
  Mã JSX của component `AcademicProgressPage` phải đóng mở đúng chuẩn. Lệnh `npm run build` phải biên dịch thành công (exit code 0), tạo thư mục `dist/` cho `@haui/web`.
- **Đề xuất khắc phục (Proposed Correction):**
  Tại `tv2-web/src/pages/AcademicProgressPage.jsx`:
  Thêm thẻ đóng `</Modal>` vào ngay sau danh sách gợi ý tại dòng 421, trước khối chữ ký in ấn `<div className="haui-print-signatures">`:
  ```jsx
          </ul>
        </div>
      </Modal>

      {/* Khối Chữ ký dành riêng cho Chế độ in ấn (@media print) */}
      <div className="haui-print-signatures">
  ```
- **Tác động Hợp đồng (Contract Impact):** Không có (lỗi cú pháp giao diện).
- **Điều kiện nghiệm thu (Verification Required):**
  Chạy `npm run build` và `node scripts/smoke-check.mjs` thành công với Check 7 PASS.

---

### F23-002: Kích hoạt kế hoạch từ Lịch sử bỏ qua `planId` của bản được chọn
- **Mức độ:** **MAJOR**
- **Owner chịu trách nhiệm:** **TV3** (`tv3-planner-ui`)
- **Kịch bản liên quan:** P08, P12 (Lịch sử & Kích hoạt bản nháp cũ).
- **Tuyến đường dẫn (Route):** `/planner`.
- **Tệp tin & Dòng lệnh:**
  - `tv3-planner-ui/src/components/PlanHistoryModal.js:50-56`
  - `tv3-planner-ui/src/services/plannerStore.js:414-455`
- **Các bước tái hiện (Steps to Reproduce):**
  1. Truy cập `/planner`.
  2. Bấm nút "📜 Lịch sử & Mở lại" để mở `PlanHistoryModal`.
  3. Trong tab "Bản nháp (DRAFT)", chọn một bản nháp khác (ví dụ `plan-haui-2026-v2.4`) và bấm "Kích hoạt áp dụng".
- **Hiện tượng thực tế (Actual Behavior):**
  Trong `PlanHistoryModal.js`:
  ```javascript
  const handleActivate = (planId) => {
    const res = plannerStore.activatePlan(); // <-- Tham số planId bị bỏ qua hoàn toàn!
    ...
  };
  ```
  Hàm `plannerStore.activatePlan()` không nhận `planId` và kích hoạt ngầm bản kế hoạch hiện đang nạp trong `this.plan`, thay vì kích hoạt chính bản nháp mà người dùng vừa chọn trong danh sách lịch sử.
- **Kỳ vọng (Expected Behavior):**
  Hệ thống phải kích hoạt chính bản kế hoạch có mã `planId` được chọn (hoặc mở bản đó lên màn hình Planner kèm cảnh báo để người dùng thẩm định và xác nhận trước khi kích hoạt).
- **Đề xuất khắc phục (Proposed Correction):**
  1. Tại `plannerStore.js`: Cập nhật hàm `activatePlan(targetPlanId)`:
     - Nếu có `targetPlanId`, tìm bản ghi trong `this.history`.
     - Chuyển dữ liệu của bản ghi đó thành bản hiện hành `this.plan`.
     - Chuyển trạng thái bản `ACTIVE` cũ thành `ARCHIVED`.
     - Gán `this.plan.status = PLAN_STATUSES.ACTIVE`.
  2. Tại `PlanHistoryModal.js`: Sửa dòng 51 thành:
     ```javascript
     const res = plannerStore.activatePlan(planId);
     ```
- **Tác động Hợp đồng (Contract Impact):**
  Đồng bộ với API backend TV5 Task 2.4: `POST /api/v1/planner/plans/{planId}/activate`.
- **Điều kiện nghiệm thu:**
  Unit test kiểm tra khi có 2 bản DRAFT trong history, gọi `activatePlan(draftId2)` thì đúng `draftId2` được chuyển thành `ACTIVE`.

---

### F23-003: Mở lại bản kế hoạch cũ (`restorePlan`) nạp đè dữ liệu mặc định ban đầu
- **Mức độ:** **MAJOR**
- **Owner chịu trách nhiệm:** **TV3** (`tv3-planner-ui`)
- **Kịch bản liên quan:** P12 (Reopen / Restore kế hoạch lưu trữ).
- **Tuyến đường dẫn (Route):** `/planner`.
- **Tệp tin & Dòng lệnh:** `tv3-planner-ui/src/services/plannerStore.js:458-474`.
- **Các bước tái hiện (Steps to Reproduce):**
  1. Mở `PlanHistoryModal` tại `/planner`.
  2. Chọn bản ghi `plan-haui-2026-v2.2` (Phương án học vượt 3.5 năm) và bấm "Mở lại / Chỉnh sửa".
- **Hiện tượng thực tế (Actual Behavior):**
  Tại `plannerStore.js`:
  ```javascript
  restorePlan(planId) {
    const target = this.history.find((h) => h.planId === planId);
    if (!target) return { success: false, message: 'Không tìm thấy phiên bản yêu cầu.' };

    // Tạo bản DRAFT mới kế thừa từ bản cũ
    this.plan = JSON.parse(JSON.stringify(INITIAL_MULTI_SEMESTER_PLAN)); // <-- Dữ liệu bị gán đè về fixture khởi tạo!
    this.plan.planId = `plan-restored-${Date.now()}`;
    this.plan.version = `${target.version}-restored`;
    this.plan.planName = `Khôi phục từ ${target.name}`;
    this.plan.status = PLAN_STATUSES.DRAFT;
    ...
  }
  ```
  Toàn bộ môn học và phân bổ kỳ của bản `target` bị bỏ rơi; store nạp cứng `INITIAL_MULTI_SEMESTER_PLAN` (kế hoạch 4 năm bình thường) và chỉ đổi tên version.
- **Kỳ vọng (Expected Behavior):**
  Bản nháp mới được khôi phục phải kế thừa toàn bộ danh sách môn học và cấu trúc các học kỳ của chính bản `target` đã chọn, chỉ đổi ID và version để bắt đầu vòng đời nháp mới mà không làm thay đổi bản ghi bất biến trong lịch sử.
- **Đề xuất khắc phục (Proposed Correction):**
  Đảm bảo mỗi bản ghi trong `this.history` lưu trữ đầy đủ thuộc tính `semesters`, `targetCpa`, `projectedCpa`. Trong `restorePlan(planId)`:
  ```javascript
  restorePlan(planId) {
    const target = this.history.find((h) => h.planId === planId);
    if (!target) return { success: false, message: 'Không tìm thấy phiên bản yêu cầu.' };

    this.plan = {
      ...JSON.parse(JSON.stringify(target)),
      planId: `plan-restored-${Date.now()}`,
      version: `${target.version}-restored`,
      planName: `Khôi phục từ ${target.name}`,
      status: PLAN_STATUSES.DRAFT
    };
    this.notify();
    return { success: true, message: `Đã mở lại phiên bản ${target.version} dưới dạng bản nháp mới!` };
  }
  ```
- **Tác động Hợp đồng (Contract Impact):**
  Đồng bộ với endpoint khôi phục của TV5: `POST /api/v1/planner/plans/{planId}/restore` hoặc `POST /api/v1/planner/plans` với `sourcePlanId`.
- **Điều kiện nghiệm thu:**
  Khôi phục một bản lưu trữ có kỳ hè thì bản nháp mới sinh ra phải có kỳ hè và các môn học tương ứng.

---

### F23-004: "Hủy thay đổi" (`handleDiscardChanges`) xóa sạch dữ liệu phiên làm việc
- **Mức độ:** **MAJOR**
- **Owner chịu trách nhiệm:** **TV3** (`tv3-planner-ui`)
- **Kịch bản liên quan:** P08 (Chỉnh sửa bản ACTIVE rồi hủy).
- **Tuyến đường dẫn (Route):** `/planner`.
- **Tệp tin & Dòng lệnh:**
  - `tv3-planner-ui/src/pages/StudyPlannerPage.js:173-177`
  - `tv3-planner-ui/src/services/plannerStore.js:477-482`
- **Các bước tái hiện (Steps to Reproduce):**
  1. Người dùng đang có một bản kế hoạch chính thức `ACTIVE` đã được chỉnh sửa.
  2. Thêm hoặc bớt một vài môn học thử nghiệm.
  3. Bấm "Hủy thay đổi" trên thanh công cụ.
- **Hiện tượng thực tế (Actual Behavior):**
  `handleDiscardChanges()` gọi `plannerStore.resetToDefault()`. Hàm này gán đè:
  ```javascript
  resetToDefault() {
    this.plan = JSON.parse(JSON.stringify(INITIAL_MULTI_SEMESTER_PLAN));
    this.history = JSON.parse(JSON.stringify(INITIAL_PLAN_HISTORY));
    this.incomingProposal = null;
    this.notify();
  }
  ```
  Toàn bộ lịch sử và bản ACTIVE hiện tại bị xóa sạch, đưa hệ thống về trạng thái ban sơ khi chưa có tương tác.
- **Kỳ vọng (Expected Behavior):**
  Khi người dùng hủy các thay đổi chưa lưu trên một kế hoạch đang theo dõi (`ACTIVE`), hệ thống chỉ hoàn tác bản nháp đang sửa về đúng snapshot của bản `ACTIVE` gần nhất, giữ nguyên lịch sử kế hoạch.
- **Đề xuất khắc phục (Proposed Correction):**
  1. Trong `plannerStore.js`, bổ sung hàm `discardDraftChanges()`:
     - Tìm bản ghi có `status === PLAN_STATUSES.ACTIVE` trong `this.history`.
     - Khôi phục `this.plan` từ bản ghi `ACTIVE` đó.
     - Giữ nguyên `this.history`.
  2. Trong `StudyPlannerPage.js`, thay thế lệnh gọi `resetToDefault()` bằng `discardDraftChanges()`.
- **Tác động Hợp đồng:** Không có (xử lý state phía client).
- **Điều kiện nghiệm thu:**
  Sau khi kích hoạt bản v2.5, sửa thêm môn rồi bấm "Hủy thay đổi", kế hoạch quay về đúng v2.5, không bị reset về v2.4/v2.3 ban đầu.

---

### F23-005: Cho phép kích hoạt `ACTIVE` trực tiếp từ `DRAFT` mà không bắt buộc kiểm tra `VALIDATED`
- **Mức độ:** **MAJOR**
- **Owner chịu trách nhiệm:** **TV3** (`tv3-planner-ui`)
- **Kịch bản liên quan:** P07, P08 (Save Draft != Activate).
- **Tuyến đường dẫn (Route):** `/planner`.
- **Tệp tin & Dòng lệnh:** `tv3-planner-ui/src/pages/StudyPlannerPage.js:307, 760-779`.
- **Các bước tái hiện (Steps to Reproduce):**
  1. Người dùng vào `/planner`, xóa bớt môn khiến tổng tín chỉ Kỳ 7 chỉ còn 6 TC (vi phạm sàn 10 TC theo BR-03).
  2. Kế hoạch hiện ở trạng thái `DRAFT` vi phạm.
  3. Người dùng bấm ngay nút "▶ Bắt đầu theo dõi (Kích hoạt)".
  4. Modal hiện ra, bấm "Đồng ý Kích hoạt".
- **Hiện tượng thực tế (Actual Behavior):**
  Hệ thống chuyển thẳng trạng thái kế hoạch thành `ACTIVE` thành công, lưu vào lịch sử dù kế hoạch đang vi phạm nghiêm trọng quy chế đào tạo tín chỉ HaUI.
- **Kỳ vọng (Expected Behavior):**
  Quy trình kích hoạt bắt buộc phải tuân thủ nghiêm ngặt State Machine:
  $$\text{DRAFT} \xrightarrow{\text{Kiểm tra}} \text{VALIDATED} \xrightarrow{\text{Xác nhận Explicit}} \text{ACTIVE}$$
  Nếu kế hoạch chưa được thẩm định hoặc có vi phạm học vụ (`violations.length > 0`), nút kích hoạt phải bị vô hiệu hóa hoặc modal phải từ chối kích hoạt kèm thông báo lỗi rõ ràng. Mọi chỉnh sửa sau khi thẩm định phải tự động đưa trạng thái về `DRAFT` và yêu cầu thẩm định lại.
- **Đề xuất khắc phục (Proposed Correction):**
  Tại `StudyPlannerPage.js`:
  1. Trong `handleConfirmActivate()`:
     ```javascript
     const validation = plannerStore.validatePlan();
     if (!validation.valid) {
       showToast(`Không thể kích hoạt: Kế hoạch vi phạm quy chế (${validation.violations.join(', ')})`);
       setIsActivateModalOpen(false);
       return;
     }
     ```
  2. Vô hiệu hóa nút "▶ Bắt đầu theo dõi (Kích hoạt)" nếu `plan.status !== PLAN_STATUSES.VALIDATED`.
- **Tác động Hợp đồng:**
  Đồng bộ với endpoint `POST /api/v1/planner/plans/{planId}/activate` của TV5: Backend từ chối kích hoạt và trả mã `422 UNPROCESSABLE_ENTITY` nếu kế hoạch có vi phạm.
- **Điều kiện nghiệm thu:**
  Kế hoạch có vi phạm quy chế 10-24 TC không thể kích hoạt thành công.

---

### F23-006: Nút lập kế hoạch bù đắp từ Audit không truyền payload proposal vào `plannerStore`
- **Mức độ:** **MINOR**
- **Owner chịu trách nhiệm:** **TV2 & TV3** (`tv2-web`, `tv3-planner-ui`)
- **Kịch bản liên quan:** P11 (Graduation Audit -> Proposal bù đắp -> Planner).
- **Tuyến đường dẫn (Route):** `/audit` -> `/planner`.
- **Tệp tin & Dòng lệnh:** `tv2-web/src/pages/AcademicProgressPage.jsx:393-402`.
- **Các bước tái hiện (Steps to Reproduce):**
  1. Vào `/audit` hoặc `/progress`.
  2. Bấm "Lập kế hoạch bù đắp các điều kiện còn thiếu" để mở modal.
  3. Bấm "Chuyển sang Màn hình 5 (Xác nhận Kế hoạch) ->".
- **Hiện tượng thực tế (Actual Behavior):**
  Người dùng được điều hướng sang `/planner`, nhưng trên màn hình Planner không hiển thị banner đề xuất phương án bù đắp nào.
- **Kỳ vọng (Expected Behavior):**
  Phương án bù đắp (các môn còn nợ, môn tự chọn còn thiếu, lộ trình thi MOS) phải được đóng gói thành một `proposal` và gửi vào `plannerStore.setIncomingProposal(proposal, 'Graduation Audit')`.
- **Đề xuất khắc phục (Proposed Correction):**
  Trong `AcademicProgressPage.jsx`, trước khi gọi `navigate('/planner')`, phát sự kiện hoặc nạp dữ liệu:
  ```javascript
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(
      new CustomEvent('haui:planner:proposal', {
        detail: {
          sourceName: 'Graduation Audit (Kiểm toán tốt nghiệp)',
          projectedCpa: 3.25,
          semesters: [ /* danh sách kỳ bù đắp */ ]
        }
      })
    );
  }
  ```
- **Tác động Hợp đồng:** Không có (Custom Event / Shared State nội bộ Frontend).
- **Điều kiện nghiệm thu:**
  Chuyển từ Audit sang Planner hiển thị đúng banner màu xanh dương: "Có phương án lộ trình đề xuất từ: Graduation Audit".

---

### F23-007: TV2 tự công bố milestone `flow-approved-v1` tại commit Task 2.2a
- **Mức độ:** **MINOR (Governance)**
- **Owner chịu trách nhiệm:** **TV2** (`tv2-web`)
- **Kịch bản liên quan:** Milestone Governance & Ownership.
- **Tệp tin:** Commit message `490d5cc` và `tv2-web/docs/flow-approved-v1.md`.
- **Hiện tượng thực tế (Actual Behavior):**
  TV2 sử dụng tiêu đề `flow-approved-v1` cho tài liệu nội bộ phân hệ và commit message của mình, gây hiểu nhầm rằng toàn bộ luồng tương tác hệ thống đã được chính thức phê duyệt.
- **Kỳ vọng (Expected Behavior):**
  Theo phân công kiến trúc, mốc `flow-approved-v1` là quyền phê duyệt duy nhất của TV1 Lead tại Task 2.3. Bàn giao của TV2 ở Task 2.2a chỉ mang ý nghĩa `academic-prototype-ready`.
- **Đề xuất khắc phục (Proposed Correction):**
  TV2 cập nhật lại tiêu đề tài liệu `tv2-web/docs/flow-approved-v1.md` thành `academic-subsystem-prototype-v1.md` hoặc làm rõ đây là mốc sẵn sàng nội bộ của phân hệ Academic, không thay thế cho quyết định nghiệm thu toàn hệ thống của TV1.
- **Tác động Hợp đồng:** Không có.

---

### F23-008: Mock fallback của Chat tự động gắn đề xuất kế hoạch cho mọi câu hỏi quy chế
- **Mức độ:** **MINOR**
- **Owner chịu trách nhiệm:** **TV3** (`tv3-planner-ui`)
- **Kịch bản liên quan:** P04 (Chat hỏi quy chế không ép mở Planner).
- **Tuyến đường dẫn (Route):** `/chat`.
- **Tệp tin & Dòng lệnh:** `tv3-planner-ui/src/pages/ChatAdvisorPage.js:84-95`.
- **Các bước tái hiện (Steps to Reproduce):**
  Trong `/chat`, gửi câu hỏi: "Điều kiện cảnh báo học vụ mức 1 của trường là gì?".
- **Hiện tượng thực tế (Actual Behavior):**
  Component fallback tự động gán `planProposal: plannerStore.getPlan()`, khiến câu trả lời hiển thị một thẻ kế hoạch học tập không liên quan bên dưới câu giải thích quy chế.
- **Kỳ vọng (Expected Behavior):**
  Hỏi quy chế thuần túy chỉ trả lời trích dẫn điều khoản quy định (FR-05, FR-06), không hiển thị đề xuất kế hoạch học tập trừ khi người dùng chủ động yêu cầu lập lộ trình (P05).
- **Đề xuất khắc phục (Proposed Correction):**
  Trong `ChatAdvisorPage.js`, kiểm tra nội dung câu hỏi trước khi gắn `planProposal`. Nếu là câu hỏi quy chế, đặt `planProposal: null`.
- **Tác động Hợp đồng:** Không có (khớp với hợp đồng AI của TV1 tại Task 2.2e).

---

### F23-009: Cấu hình kịch bản `check-ownership.mjs` của TV5 khóa cứng `tv1-ai/docs/`
- **Mức độ:** **MINOR (Tooling / CI)**
- **Owner chịu trách nhiệm:** **TV5** (`tv5-platform` / `scripts/`)
- **Kịch bản liên quan:** Ownership Check & CI Governance.
- **Tệp tin & Dòng lệnh:** `scripts/check-ownership.mjs:43-45`.
- **Hiện tượng thực tế (Actual Behavior):**
  Hàm `classifyFile` gán:
  ```javascript
  if (normalized.startsWith('tv1-ai/docs/')) {
    return { domain: 'tv1-docs-readonly', role: null, readOnly: true };
  }
  ```
  Quy tắc này xuất phát từ Task 1.1/1.5 nhằm bảo vệ tài liệu khởi tạo. Tuy nhiên bước sang Phase 2 (Task 2.3), TV1 được giao quyền xuất bản tài liệu nghiệm thu (`task-2.3-review.md`, `task-2.3-owner-fixes.md`, `task-2.3-contract-delta.md`) và cập nhật `solution-v1.md`. Quy tắc cũ của TV5 khiến script báo vi phạm giả `CRITICAL VIOLATION` khi TV1 cập nhật tài liệu trong folder sở hữu của mình.
- **Kỳ vọng (Expected Behavior):**
  `tv1-ai/docs/sources/` mới là thư mục tuyệt đối READ-ONLY (chứa các tài liệu nguồn bất biến). Các tài liệu deliverable của TV1 trong `tv1-ai/docs/` phải thuộc quyền sở hữu (`role: 'tv1'`).
- **Đề xuất khắc phục (Proposed Correction):**
  TV5 cập nhật lại điều kiện trong `scripts/check-ownership.mjs`:
  ```javascript
  if (normalized.startsWith('tv1-ai/docs/sources/')) {
    return { domain: 'tv1-sources-readonly', role: null, readOnly: true };
  }
  if (normalized.startsWith('tv1-ai/')) {
    return { domain: 'tv1-ai', role: 'tv1' };
  }
  ```
- **Tác động Hợp đồng:** Không có.

