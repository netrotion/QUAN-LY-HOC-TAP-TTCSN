# BÁO CÁO KỸ THUẬT: MIGRATION TOÀN DIỆN VÀ API CONTRACTS ĐẦY ĐỦ (TASK 2.2d)

> **Người thực hiện:** TV5 — Backend/Database/DevOps Engineer  
> **Nhiệm vụ:** Task 2.2d — Tạo migration và API contract đầy đủ  
> **Module phụ trách:** `tv5-platform` (`contracts/`, `app/`, `infra/`, `docs/`)  
> **Căn cứ thiết kế:** PRD §8 (Data Model gốc), PRD §13.2 (StudyPlan State Machine), Brief Solution, Session Context Isolation  

---

## 1. Mục tiêu và Phạm vi Triển khai

Task 2.2d thiết lập nền tảng lưu trữ bền vững (Persistence Schema) và hợp đồng giao tiếp API hoàn chỉnh phục vụ cho:
- **TV1 (Lead + AI):** Truy xuất nguồn tri thức RAG (`knowledge_sources`), lịch sử hội thoại (`conversations`, `conversation_messages`).
- **TV2 (FE nền tảng/học vụ):** Nhập/xem lại bảng điểm (`import_sessions`), tra cứu CTĐT (`curricula`, `courses`, `course_relations`), rà soát chuẩn đầu ra (`audit_requirements`, `student_audit_checklists`).
- **TV3 (FE kế hoạch/AI):** Toàn bộ chu trình thao tác Kế hoạch học tập: Đọc chi tiết (`read`), Xem trước (`preview`), Thẩm định (`validate`), Lưu nháp/bản mới (`save`), và Kích hoạt (`activate`).
- **TV4 (Academic Tools):** Cung cấp cấu trúc tương thích 1-1 với 9 capability và fixture học vụ chuẩn HaUI.

---

## 2. Chi tiết Database Migration (`V2__comprehensive_platform_schema.sql`)

Flyway migration V2 bổ sung toàn diện 14 thực thể nghiệp vụ mới và nâng cấp 2 thực thể hiện có, nâng tổng số bảng quản lý lên 20 bảng:

| # | Bảng (Table) | Mục đích nghiệp vụ | Khóa chính (PK) / Khóa ngoại (FK) / Ràng buộc chính |
|---|---|---|---|
| **1** | `users` | Tài khoản xác thực hệ thống, phân quyền (STUDENT, ADVISOR, ADMIN) | `user_id` (PK), `username` (UNIQUE), `status` |
| **2** | `student_records` | Nâng cấp: liên kết `user_id`, bổ sung `data_revision`, `version` | `student_id` (PK), FK $\rightarrow$ `users(user_id)` |
| **3** | `curricula` | Khung CTĐT theo ngành (CT1085 - KTPM 150 TC) | `curriculum_id` (PK), `curriculum_code` (UNIQUE) |
| **4** | `curriculum_versions` | Quản lý phiên bản CTĐT theo khóa tuyển sinh (K19...) | `version_id` (PK), FK $\rightarrow$ `curricula` |
| **5** | `courses` | Danh mục 120 học phần, khối kiến thức, số tín chỉ, kỳ gợi ý | `course_id` (PK), `course_code` (UNIQUE) |
| **6** | `course_relations` | Ràng buộc tiên quyết (PREREQUISITE), học trước (PRIOR), song hành (COREQUISITE) | `relation_id` (PK), FK $\rightarrow$ `courses`, UNIQUE(target, required, type) |
| **7** | `course_offerings` | Đợt mở lớp học phần theo học kỳ chính/hè | `offering_id` (PK), FK $\rightarrow$ `courses` |
| **8** | `enrollment_attempts` | Lịch sử các lần học, điểm 10, điểm chữ, điểm 4, học lại/cải thiện (PRD §8) | `attempt_id` (PK), FK $\rightarrow$ `student_records`, FK $\rightarrow$ `courses` |
| **9** | `audit_requirements` | Chuẩn đầu ra tín chỉ và phi tín chỉ (TOEIC 450, MOS, GDQP, GDTC) | `requirement_id` (PK), `requirement_code` (UNIQUE) |
| **10** | `student_audit_checklists` | Trạng thái đạt/thiếu của sinh viên đối với từng chuẩn tốt nghiệp | `checklist_id` (PK), FK $\rightarrow$ `student_records`, FK $\rightarrow$ `audit_requirements` |
| **11** | `import_sessions` | Quản lý phiên tải lên bảng điểm PDF/Excel từ e-HaUI, xem lại và xác nhận | `session_id` (PK), FK $\rightarrow$ `student_records`, `status` |
| **12** | `study_plans` | Nâng cấp: `plan_name`, `version`, `data_revision`, `target_graduation_semester` | `plan_id` (PK), FK $\rightarrow$ `student_records`, State Machine |
| **13** | `plan_semesters` | Danh sách học kỳ trong kế hoạch (PRD §8 PlanSemester) | `plan_semester_id` (PK), FK $\rightarrow$ `study_plans` |
| **14** | `planned_courses` | Môn học dự kiến trong từng kỳ, mục tiêu điểm, loại môn (PRD §8 PlannedCourse) | `planned_course_id` (PK), FK $\rightarrow$ `plan_semesters`, FK $\rightarrow$ `courses` |
| **15** | `plan_actions` | Hành động khuyến nghị (gỡ nợ tiên quyết, học cải thiện ROI cao, cân bằng tải) | `action_id` (PK), FK $\rightarrow$ `study_plans` |
| **16** | `knowledge_sources` | Metadata nguồn RAG tri thức quy chế (source_id, doc_code, section, version) | `source_id` (PK), `document_code` |

Đồng thời, file `tv5-platform/infra/migrations/01_init_schema.sql` đã được đồng bộ hóa hoàn toàn để triển khai Docker Compose với PostgreSQL 16 + pgvector.

---

## 3. OpenAPI Spec & DTOs cho 5 Thao tác Kế hoạch Học tập

Đã bổ sung đầy đủ REST endpoints và JSON schemas tại `tv5-platform/contracts/`:

### 3.1. Danh sách Endpoints
- **READ (`GET /api/v1/planner/plan`):**
  - Trả về `StudyPlanDetailResponse`: Thông tin đầy đủ kế hoạch học tập (semesters, planned courses, action recommendations, target CPA, warnings).
- **PREVIEW (`POST /api/v1/planner/preview`):**
  - Nhận `PreviewStudyPlanRequest`, trả về `PreviewStudyPlanResponse` mô phỏng lộ trình tối ưu trước khi lưu.
- **VALIDATE (`POST /api/v1/planner/validate`):**
  - Nhận `ValidateStudyPlanRequest`, trả về `ValidateStudyPlanResponse` thẩm định quy chế tín chỉ (10-24 TC kỳ chính, $\le 12$ TC kỳ hè, $\le 14$ TC khi cảnh báo).
- **SAVE (`POST /api/v1/planner/save`):**
  - Nhận `SaveStudyPlanRequest`, trả về `SaveStudyPlanResponse`. Áp dụng cơ chế Optimistic Locking qua `planVersion` (tự động tăng version khi lưu thành công).
- **ACTIVATE (`POST /api/v1/planner/activate`):**
  - Nhận `ActivateStudyPlanRequest`, chuyển kế hoạch sang `ACTIVE` và tự động lưu trữ (`ARCHIVED`) các kế hoạch `ACTIVE` trước đó.

### 3.2. Mẫu JSON Fixtures & Manifest
Đã tạo 7 file mẫu JSON mới trong `tv5-platform/contracts/examples/` và đăng ký vào `fixture-manifest.json` (nâng tổng số capability lên 15/15, pass 100% `check:contracts`):
- `study-plan-read-response.sample.json`
- `study-plan-preview-request.sample.json` / `study-plan-preview-response.sample.json`
- `study-plan-save-request.sample.json` / `study-plan-save-response.sample.json`
- `study-plan-activate-request.sample.json` / `study-plan-activate-response.sample.json`

---

## 4. Port StudentContextProvider & Cơ chế Phát hiện Dữ liệu Thay đổi

### 4.1. Định nghĩa Port (`StudentContextProvider.java`)
```java
public interface StudentContextProvider {
    TrustedStudentContext getAuthenticatedContext();
    StudentDataVersion getDataVersion(String studentId);
    boolean isDataStale(String studentId, String clientRevision);
}
```

### 4.2. Nguyên tắc Bảo mật Bất khả xâm phạm
- **Không bao giờ tin `studentId` do client gửi:** Bất kể client gửi `studentId` qua URL param, JSON request body hay custom headers, hệ thống sẽ bỏ qua và ghi đè bằng `studentId` được trích xuất từ `SecurityContextHolder`.
- **Phát hiện dữ liệu thay đổi (Stale Data Detection):** Mỗi hồ sơ sinh viên mang một token `dataRevision`. Khi client gửi thao tác `preview`, `save` hoặc `activate` kèm một revision cũ hơn revision hiện tại trên server, hệ thống trả về mã lỗi HTTP `409 CONFLICT` kèm mã lỗi `DATA_REVISION_STALE`, ngăn chặn việc ghi đè dữ liệu lỗi thời.

---

## 5. Kết quả Kiểm thử Toàn diện

1. **`FlywaySchemaMigrationTest`:**
   - Khởi chạy in-memory test database với Flyway migration V1 & V2.
   - Xác thực tạo thành công và queryable toàn bộ 20 bảng cơ sở dữ liệu.
2. **`StudyPlanSecurityAndVersionTest`:**
   - Chặn request chưa xác thực (`403 Forbidden`).
   - Kiểm tra client gửi `studentId` giả mạo (`attacker-9999`) $\rightarrow$ Server ép buộc sử dụng định danh chính thức `2024604757`.
   - Kiểm tra phát hiện `dataRevision` lỗi thời $\rightarrow$ Báo lỗi `409 CONFLICT` (`DATA_REVISION_STALE`).
   - Kiểm tra lưu và kích hoạt kế hoạch với dữ liệu hợp lệ $\rightarrow$ Thành công và cập nhật version.
3. **`ContractsSerializationTest`:**
   - 17/17 tests kiểm thử serialization/deserialization DTOs khớp 100% JSON mẫu.
4. **Hệ thống Smoke Check (`npm run smoke`):**
   - 10/10 quality gates đạt trạng thái **PASS**.
