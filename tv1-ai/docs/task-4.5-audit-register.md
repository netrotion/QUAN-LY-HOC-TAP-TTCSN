# BỔ SUNG SỔ THEO DÕI LỖI TÍCH HỢP & CHUYỂN GIAO (TASK 4.5 AUDIT REGISTER)
## Phân hệ Cố vấn Học vụ Thông minh — HaUI Academic Advisor

- **Dự án:** HaUI Academic Advisor (`QUAN-LY-HOC-TAP-TTCSN`)
- **Mã Task:** Task 4.5 — Nghiệm thu tích hợp một phiên bản (Release Candidate Acceptance)
- **Người lập:** TV1 — Lead & AI Engineer
- **Ngày lập:** 25/10/2026
- **Trạng thái:** ACTIVE (Chuyển giao cho các Owner)
- **Quy tắc phân định:** Tuân thủ tuyệt đối quy định Lead tại Task 4.5: *"Gửi lỗi về owner, chờ PR sửa/test rồi rerun. Không code thay module người khác."*

---

## 1. TỔNG QUAN HIỆN TRẠNG CHẤT LƯỢNG TOÀN HỆ THỐNG

| Phân hệ / Workspace | Số lượng Test | Trạng thái Thực tế | Ghi chú & Đánh giá |
| :--- | :---: | :---: | :--- |
| `tv1-ai` | **269 tests** | ✅ **100% PASS** | Đã bao gồm Unit tests, RAG, Security, ToolAdapter, Task 4.5 Project-wide & BDD suites. |
| `tv2-web` & `tv3-planner-ui` | **123 tests** | ✅ **100% PASS** | Frontend unit tests, lint rules, Vite/Rollup production build thành công sạch sẽ. |
| `tv5-platform/contracts` | **Full suite** | ✅ **100% PASS** | Contracts V1 (OpenAPI 1.5.0, lock, glossary, js/java fixtures) đồng bộ. |
| `tv4-academic` | **171 tests** | ✅ **100% PASS** | Thuật toán học vụ, tính điểm GPA/CPA, quy chế tiên quyết và regression test 4.3c. |
| `tv5-platform/app` | **101 tests** | ❌ **20 FAILURES** | **Lỗi xung đột tích hợp (DEF-4.5-01)** nảy sinh ngay sau khi merge PR #13 của TV4. |

---

## 2. DANH MỤC PHIẾU BÁO LỖI CHUYỂN GIAO (DEFECT TICKETS)

### 🔴 Phiếu DEF-4.5-01: Mã môn học giả định trong test fixture của TV5 làm vỡ quy tắc thẩm định CTĐT của TV4
- **Mức độ nghiêm trọng:** **BLOCKER** (Chặn 20 integration tests tại `tv5-platform/app`, làm gãy pipeline `mvn test` toàn repo).
- **Phân hệ chịu trách nhiệm (Owner):** `tv5-platform` (TV5 — Platform & Backend Lead).
- **Commit kích hoạt:** Commit `f67bb45` (PR #13 của TV4: `feat(tv4): complete task 4.3c academic regression`).

#### Triệu chứng kỹ thuật:
Khi chạy kiểm thử `haui-platform-app`, 20 tests gặp lỗi `AssertionFailedError: expected: "VALIDATED" but was: "DRAFT"` hoặc `422 PLAN_NOT_VALIDATED`:
```json
{
  "code": "PLAN_NOT_VALIDATED",
  "message": "Chỉ kích hoạt được kế hoạch đã thẩm định hợp lệ. Hãy bấm \"Kiểm tra điều kiện\" trước.",
  "details": ["Trạng thái hiện tại: DRAFT"]
}
```

#### Phân tích nguyên nhân gốc rễ (Root Cause Analysis):
1. **Bên TV4 (Đúng nghiệp vụ):** Trong Task 4.3c, TV4 hoàn thiện bộ thẩm định `validateStudyPlan` nhằm thực thi quy chế HaUI: kiểm tra mọi môn học trong kế hoạch phải có trong CTĐT chính thức (`curriculum-ktpm-haui-2024`).
2. **Bên TV5 (Dữ liệu test không hợp lệ):** Khi TV5 viết các test fixture (`StudentRecords`, `test-plans`), TV5 đã sử dụng các mã môn giả định (`IT9L202611`, `IT9L202612`, `IT9L202613`...). 
3. **Điểm gãy tích hợp:** Khi TV5 gọi API thẩm định `/planner/validate`, TV4 phát hiện các mã môn `IT9L...` không tồn tại trong CTĐT, trả về `valid = false` kèm vi phạm:
   `"Vi phạm: Học phần IT9L202611 không tồn tại trong chương trình đào tạo curriculum-ktpm-haui-2024"`.
   Kế hoạch do đó bị giữ ở trạng thái `DRAFT`. Sau đó, khi test của TV5 gọi `POST /planner/activate`, server chặn bằng lỗi HTTP 422 vì kế hoạch chưa đạt trạng thái `VALIDATED`.

#### Danh sách 20 Test Cases bị ảnh hưởng tại `tv5-platform/app`:
1. `MockValidationTest.mockValidationNeverActivates:60`
2. `PlanPersistenceTest.concurrentActivationsKeepOneActive:191`
3. `PlanPersistenceTest.deleteDraftsOnly:142`
4. `PlanPersistenceTest.inheritedDraftAndRestore:292`
5. `PlanPersistenceTest.policyChangeRequiresRecheck:259`
6. `PlanPersistenceTest.repeatedImportForcesRecheck:218`
7. `PlannerApiLiveTest.generateEditValidateSaveActivateRead:164`
8. `PlannerApiLiveTest.permissionsAndIsolation:246`
9. `PlannerApiLiveTest.policyChangeRevalidatesOnRead:357`
10. `PlannerApiLiveTest.profileUpdateMarksPlansForRecheck:315`
11. `PlannerApiLiveTest.revalidationWithoutRealTool:371`
12. `PlannerApiLiveTest.transcriptChangeRevalidates:260`
13. `ReconcileApiTest.errorsAndPermissions:141`
14. `ReconcileApiTest.reconcileActivePlanAgainstDbTranscript:87`
15. `HttpContractConformanceTest.plannerFlowWithFixtureRequests:87`
16. `HttpContractConformanceTest.whatIfReconcileAndChatMatchSchema:147`
17. `StudyPlanSecurityAndVersionTest.shouldBumpVersionAndResetValidationOnEdit:168`
18. `StudyPlanSecurityAndVersionTest.shouldEnforceDraftValidatedActiveStateMachine:126`
19. `StudyPlanSecurityAndVersionTest.shouldIgnoreClientSuppliedStudentId:87`
20. `StudyPlanSecurityAndVersionTest.shouldInheritDraftFromActiveAndProtectArchived:186`

#### Hướng dẫn khắc phục cho TV5 (Action Plan for TV5):
- Sửa lại các mã môn học trong test fixtures của `tv5-platform/app` (trong `StudentRecords.java` hoặc các phương thức tạo kế hoạch mẫu): thay thế các mã môn `IT9L202611`, `IT9L202612`, `IT9L202613`... bằng các mã môn có thật trong file `curriculum-ktpm-v1.json` (ví dụ: `IT6005`, `IT6015`, `MA6002`, `BAS1201`, `IT6020`).
- Sau khi TV5 tạo PR sửa đổi và merge vào `main`, toàn bộ 20 tests trên sẽ pass và trả về trạng thái `VALIDATED` chuẩn mực.

---

### 🟡 Phiếu DEF-4.5-02: Quy trình tích hợp PR #13 thiếu bước kiểm tra reactor toàn diện
- **Mức độ nghiêm trọng:** **MEDIUM** (Quy trình CI/CD).
- **Phân hệ chịu trách nhiệm (Owner):** `tv4-academic` & `tv5-platform` (DevOps).
- **Mô tả:** PR #13 của TV4 được merge mà không phát hiện trước việc làm gãy test của TV5 do TV4 chỉ chạy test cô lập trong module `tv4-academic` thay vì chạy `mvn test` trên toàn reactor.
- **Biện pháp khắc phục:** Cấu hình GitHub Actions / CI pipeline bắt buộc chạy lệnh `mvn test` trên toàn root trước khi cho phép merge PR vào nhánh `main`.

---

## 3. CÔ LẬP LỖI & KẾ HOẠCH BÀN GIAO (QUARANTINE POLICY)

1. **Tuân thủ ranh giới:** TV1 tuyệt đối không trực tiếp can thiệp sửa file trong thư mục `tv5-platform/**`.
2. **Theo dõi trạng thái:** Lỗi DEF-4.5-01 được gắn cờ `QUARANTINED_PENDING_OWNER_PR`.
3. **Điều kiện Release Candidate:** Bản ứng viên phát hành (RC) của Task 4.5 sẽ tích hợp tài liệu Defect Register này làm bằng chứng kiểm toán kỹ thuật trước khi bàn giao cho Phase 5.
