# BÁO CÁO NGHIỆM THU KỸ THUẬT TASK 3.5
## CODE PLANNER BẰNG CONTRACT MOCK (`planner-ui-ready`)

- **Mã nhiệm vụ:** Task 3.5 (Phase 3 — Đợt A)
- **Thành viên phụ trách:** TV3 — FE Kế hoạch & AI (Planner UI)
- **Mốc bàn giao:** `planner-ui-ready`: Planner, lưu/hủy/mở lại bằng mock.
- **Thư mục làm việc:** `tv3-planner-ui/`
- **Ngày hoàn thành:** 14/10/2026

---

## 1. Yêu cầu & Căn cứ Nghiệm thu

Căn cứ bản phân công nhiệm vụ Phase 3 (`HaUI_Advisor_Solution_va_Prompt_theo_Phase.md` dòng 321–330):

```text
Code danh sách/kế hoạch nhiều kỳ, phương án, thêm/bớt/chuyển môn, cảnh báo validation. DRAFT lưu được khi dữ liệu đúng định dạng; kích hoạt phải kiểm tra nghiệp vụ. Sửa ACTIVE tạo DRAFT kế thừa, hủy giữ bản cũ. Dùng injected api/ui từ TV2.
```

- **Tiêu chí nghiệm thu:** UI test thêm/sửa/chuyển/hủy; chấp nhận không bắt buộc xem tree; lưu lỗi không mất nội dung.
- **Căn cứ:** Workbook TV3; PRD US-06/13, §13.2 + solution F08, F23-002..F23-005.

---

## 2. Kết quả Triển khai Chi tiết

### 2.1. Quản lý Danh sách / Kế hoạch Nhiều kỳ & Phương án Đề xuất
- **Cấu trúc đa kỳ:** Kế hoạch mục tiêu chuẩn gồm Kỳ 7 (Học kỳ 1 2026 - 2027), Kỳ 8 (Học kỳ 2 2026 - 2027) và Học kỳ hè 2027.
- **Hội tụ phương án:** Hỗ trợ nhận phương án lộ trình đề xuất (`incomingProposal`) từ AI Advisor Chat, What-if Simulator hoặc Graduation Audit Remediation (F23-006).
- **Thao tác:** Hiển thị banner đề xuất kèm 2 nhánh hành động rõ ràng: `Chấp nhận phương án` (nạp vào bản nháp hiện hành để tinh chỉnh) hoặc `Hủy` (bỏ qua).

### 2.2. Thêm, Bớt và Chuyển môn (`moveCourse`) giữa các kỳ
- **Thêm môn (`addCourseToSemester`):** Bổ sung học phần mới vào kỳ chỉ định từ danh mục gợi ý; tự động tính lại tổng tín chỉ kỳ và chuyển kế hoạch về `DRAFT` để thẩm định lại.
- **Bớt môn (`removeCourseFromSemester`):** Xóa học phần khỏi kỳ; cập nhật tải tín chỉ thời gian thực.
- **Chuyển môn (`moveCourse`):**
  - Di chuyển học phần từ học kỳ nguồn sang học kỳ đích.
  - Kiểm tra điều kiện: môn học phải tồn tại ở kỳ nguồn và chưa có ở kỳ đích.
  - Cập nhật số tín chỉ tức thời ở cả 2 kỳ (kỳ đi giảm, kỳ đến tăng).
  - Tích hợp Modal "Chuyển môn học" trực quan ngay trên cột Thao tác của bảng môn học (`StudyPlannerPage.js`).

### 2.3. Cảnh báo Validation & Quy tắc HaUI
- Kiểm tra quy chế đào tạo tín chỉ HaUI thời gian thực qua `evaluatePlanRules(plan)`:
  - **BR-03:** Sàn tối thiểu 10 tín chỉ trong học kỳ chính.
  - **BR-04:** Trần tối đa 24 tín chỉ trong học kỳ chính.
  - **Quy chế kỳ hè:** Tối đa 8 tín chỉ.
  - **Cảnh báo tải học vụ cao:** Cảnh báo khi học kỳ đạt từ 20 đến 24 tín chỉ.
- Khối hiển thị `validationBox` phản ánh trực quan trạng thái: `✓ 100% Hợp lệ` hoặc `⚠️ Cảnh báo quy chế` kèm chi tiết danh sách vi phạm.

### 2.4. DRAFT Lưu được khi Đúng Định dạng — Lưu Lỗi Không Mất Nội dung
- **Kiểm tra định dạng (`validatePlanFormat`):** Xác thực cấu trúc mảng học kỳ, mã kỳ, mã môn học và số tín chỉ hợp lệ (> 0).
- **Lưu DRAFT linh hoạt:** Cho phép lưu bản nháp ngay cả khi kế hoạch còn vi phạm tải tín chỉ học vụ (ví dụ: đang lập dở còn 8 TC), phục vụ nhu cầu lưu tạm của sinh viên theo solution §13.2. Từ chối lưu nếu dữ liệu hỏng định dạng (`INVALID_FORMAT`).
- **Lưu lỗi không mất nội dung:** Khi kết nối backend gặp sự cố mạng hoặc lỗi máy chủ (500/timeout), giao diện bắt lỗi an toàn và hiển thị thông báo, **toàn bộ nội dung đang chỉnh sửa trong kế hoạch được bảo toàn nguyên vẹn**, không bị xóa hay quay về trạng thái rỗng.

### 2.5. Kích hoạt Kiểm tra Nghiệp vụ & Kế thừa Bản ACTIVE
- **State Machine nghiêm ngặt:** `DRAFT → VALIDATED → ACTIVE`.
- Kế hoạch ở `DRAFT` hoặc còn vi phạm quy chế HaUI tuyệt đối không thể chuyển sang `VALIDATED` và bị từ chối kích hoạt (`PLAN_NOT_VALIDATED` / `PLAN_RULE_VIOLATION`).
- **Sửa ACTIVE tạo DRAFT kế thừa:** Khi sinh viên chỉnh sửa trên bản kế hoạch đang theo dõi (`ACTIVE`), hệ thống tự động tách sang bản nháp mới (`sourcePlanId: activeId`, tăng version `vX.Y`), bản `ACTIVE` cũ trong lịch sử được bảo toàn nguyên vẹn.
- **Hủy thay đổi (`discardDraftChanges`):** Hoàn tác sạch sẽ về mốc `baseline` đã kích hoạt gần nhất mà không làm xáo trộn lịch sử kế hoạch.

### 2.6. Injected API/UI từ TV2 & Cây môn học Tùy chọn
- Màn hình sử dụng toàn diện bộ component UI dùng chung V0 từ TV2 (`Button`, `Card`, `Table`, `Modal`, `Loading`, `Error`, `EmptyState`) thông qua Dependency Injection: `<StudyPlannerPage api={api} ui={ui} />`.
- **Xem tree là tùy chọn:** Sinh viên có thể tra cứu sơ đồ tiên quyết bất cứ lúc nào qua nút `🌳 Xem Cây môn học (Tùy chọn)` mở `CurriculumTreeModal` mà không bắt buộc phải mở tree trước khi lưu nháp hay kích hoạt.

---

## 3. Danh mục Tệp Thay đổi

1. `tv3-planner-ui/src/services/plannerStore.js`:
   - Bổ sung `validatePlanFormat(plan)`.
   - Bổ sung `moveCourse(fromSemesterCode, toSemesterCode, courseCode)`.
   - Cập nhật `saveDraft(customName)` kiểm tra định dạng dữ liệu trước khi lưu nháp.
2. `tv3-planner-ui/src/pages/StudyPlannerPage.js`:
   - Bổ sung state và modal `moveCourseModal` phục vụ chuyển môn học trực quan giữa các kỳ.
   - Bổ sung nút `Chuyển` trên từng hàng học phần trong bảng.
   - Cập nhật `handleSaveDraft` xử lý bất đồng bộ an toàn: lưu lỗi không mất nội dung bản nháp.
3. `tv3-planner-ui/src/index.js`:
   - Export bổ sung `validatePlanFormat` và `evaluatePlanRules` cho hợp đồng mô-đun.
4. `tv3-planner-ui/test/task-3.5-planner-mock.test.mjs`:
   - 9 ca kiểm thử toàn diện xác thực 100% tiêu chí nghiệm thu Task 3.5.

---

## 4. Bằng chứng Kiểm thử (Test Evidence)

Chạy bộ kiểm thử tự động tại `tv3-planner-ui`:
```bash
npm test --prefix tv3-planner-ui
```

**Kết quả:**
- **Tổng số tests:** 30 tests (bao gồm 21 tests hồi quy từ Phase 2 và 9 tests nghiệm thu Task 3.5).
- **Kết quả:** 30 passed, 0 failed (100% pass rate).
- **Thời gian chạy:** ~150ms.

Kiểm tra tích hợp chéo với `tv2-web`:
```bash
npm test --prefix tv2-web
```
- **Kết quả:** 24 tests passed 100%, bảo đảm không gây hồi quy hay phá vỡ hợp đồng Dependency Injection `{ api, ui }`.
