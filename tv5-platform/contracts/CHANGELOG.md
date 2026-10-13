# CHANGELOG — tv5-platform/contracts

Mọi thay đổi hợp đồng sau mốc `contracts-v1` phải có mục ở đây, trong cùng PR của TV5 với thay đổi.
Quy trình: [docs/task-2.4-contracts-v1.md §6](../docs/task-2.4-contracts-v1.md).

## [1.2.0] — 2026-10-13 — lưu kế hoạch, hội thoại và trạng thái công cụ học vụ (Task 3.7)

Kế hoạch và hội thoại chạy trên DB; nêu rõ khi nào công cụ học vụ là "thật". Không đổi tên hay xóa trường nào của 1.1.0.

### Thêm
- 3 operation: `DELETE /planner/plans/{planId}?planVersion=` (hủy bản nháp DRAFT/VALIDATED, 204), `GET /advisor/conversations`,
  `GET /advisor/conversations/{conversationId}`.
- `AcademicFacade.readyCapabilities()` (method `default`, trả rỗng): implementation khai báo capability nào đã là công cụ thật.
  Chưa khai báo `VALIDATE_STUDY_PLAN` thì validate/activate trả **503 `TOOL_NOT_READY`** và không kế hoạch nào lên VALIDATED/ACTIVE.
- `ConversationStore.listConversations(studentId)` (fake in-memory đã cập nhật). Chỉ TV5 implement port này.
- Trường: `ValidateStudyPlanResponse.validationMode` (`REAL` | `MOCK`), `ValidateStudyPlanResponse.policyVersion`,
  `StudyPlanDetailResponse.validatedAt`, `BootstrapInfoResponse.academicTools`.
- DTO/enum: `AcademicCapability`, `ValidationMode`, `AcademicToolStatus`, `AcademicToolReadinessItem`, `ConversationSummaryItem`,
  `ConversationListResponse`; mã lỗi `TOOL_NOT_READY` (503), `CONVERSATION_NOT_FOUND` (404); response chung 503.
- 5 file mẫu mới (tổng 70, 54 ví dụ trong manifest): thẩm định MOCK, 503 khi validate/activate, lịch sử hội thoại, hội thoại không tồn tại.

### Thay đổi hành vi (không đổi schema 1.1.0)
- Kích hoạt kiểm tra planVersion, dataRevision và thẩm định lại trên hồ sơ + quy chế hiện hành trong cùng giao dịch;
  DB bảo đảm một ACTIVE mỗi sinh viên.
- Bỏ `x-implementation-status: IMPLEMENTED_IN_MEMORY`: planner chạy trên PostgreSQL.

### Việc cho owner khác
- TV4: khi `validateStudyPlan` là công cụ thật, override `readyCapabilities()` trả `VALIDATE_STUDY_PLAN`; chưa khai báo thì kế hoạch không kích hoạt được.
- TV1: lưu/đọc hội thoại qua `ConversationStore` với `studentId` từ `StudentContextProvider`.
- TV3: xử lý 503 `TOOL_NOT_READY` (tắt "Kích hoạt", hiện lý do), nút hủy bản nháp, nhãn `validationMode=MOCK`.

## [1.1.0] — 2026-10-13 — tài khoản, dữ liệu và nhập bảng điểm (Task 3.2)

Bổ sung các phần chưa có trong bản chốt 2.3 nhưng cần cho Task 3.2 (TV5) và 3.4 (TV2). Không đổi tên hay xóa trường nào của 1.0.0.

### Thêm
- 18 operation: `/auth/csrf`, `/auth/session`, `/auth/login`, `/auth/register`, `/auth/logout`; `GET|PUT /students/me`;
  `GET /academic/curriculum`, `GET /academic/transcript`; `/academic/transcript/imports` (list, upload multipart, manual, get, rows, confirm, cancel);
  `GET /academic/certificates`, `PUT /academic/certificates/{requirementCode}`.
- DTO: `LoginRequest`, `RegisterAccountRequest`, `AuthSessionResponse`, `CsrfTokenResponse`, `StudentProfileResponse`, `UpdateStudentProfileRequest`,
  `CurriculumResponse`, `CurriculumCourseItem`, `TranscriptResponse`, `TranscriptAttemptItem`, `TranscriptImportResponse`, `TranscriptImportRowItem`,
  `ImportRowIssueItem`, `TranscriptDocumentSummary`, `TranscriptImportListResponse`, `UpdateImportRowsRequest`, `ConfirmTranscriptImportRequest`,
  `CertificateStatusItem`, `CertificateListResponse`, `DeclareCertificateRequest`, `StudentAcademicRecord`; enum `AccountRole`, `TranscriptStatus`,
  `TranscriptSourceType`, `ImportSessionStatus`, `ImportIssueCode`, `CertificateStatus`, `CertificateVerification`.
- Port `StudentAcademicRecordProvider`: dữ liệu học vụ gốc (bảng điểm đã xác nhận, CTĐT, khai báo chứng chỉ) cho AcademicFacade, không có GPA/CPA.
  Fake `FixtureStudentAcademicRecordProvider` cho TV4/TV1.
- Mã lỗi: `UNAUTHENTICATED`, `INVALID_CREDENTIALS`, `ACCESS_DENIED`, `ACCOUNT_ALREADY_EXISTS`, `CURRICULUM_NOT_FOUND`, `REQUIREMENT_NOT_FOUND`,
  `IMPORT_SESSION_NOT_FOUND`, `IMPORT_SESSION_CLOSED`, `IMPORT_VERSION_CONFLICT`, `IMPORT_HAS_BLOCKING_ISSUES`, `IMPORT_LIMIT_REACHED`, `UPLOAD_TOO_LARGE`,
  `UNSUPPORTED_FILE_TYPE`; response chung 401, 413, 415, 429.
- 30 file mẫu mới (tổng 65, 48 ví dụ trong manifest), tên chuẩn đầu ra theo `policy-demo.json` của TV4 cho cả chứng chỉ lẫn checklist audit.

### Thay đổi
- Chưa đăng nhập trả **401 `UNAUTHENTICATED`** (1.0.0 ghi 403 không body); 403 chỉ còn cho thiếu CSRF/sai vai trò và có body `ACCESS_DENIED`.
- `credits` là **number** trên JSON (CTĐT có học phần 1.5 TC). DTO 1.0.0 vẫn giữ `Integer` trong Java để TV1/TV4 không vỡ compile,
  ghi trong `glossary-v1.json#legacyJavaTypes`; server từ chối số lẻ cho các trường này thay vì làm tròn ngầm. Đổi sang `BigDecimal` ở 2.0.0.
- Lùi việc gỡ accessor Java chuyển tiếp sang 2.0.0 (TV1/TV4 chưa chuyển; gỡ là thay đổi phá vỡ).
- Fixture `graduation-audit-response` dùng tên chuẩn đầu ra theo policy TV4 (trước đây lấy từ hồ sơ demo, lệch tên).

### Kiểm tra mới
- `check-contracts` chặn chuỗi lỗi mã hóa (UTF-8 đọc nhầm Windows-1252) trong fixture/OpenAPI/glossary.

## [1.0.0] — 2026-10-13 — `contracts-v1`

Phát hành hợp đồng V1 theo bản chốt Task 2.3 (`tv1-ai/docs/task-2.3-contract-delta.md`), đầu vào Phase 3.

### Thêm
- `openapi/openapi-v1.yaml`: schema request/response đầy đủ cho 17 operation, mã lỗi `ApiErrorCode`, `x-facade-method`, `x-implementation-status`.
- Vòng đời kế hoạch (CD-01..CD-05): `GET/POST /planner/plans`, `GET /planner/plans/{planId}`, `POST /planner/plans/{planId}/activate`, `POST /planner/plans/{planId}/restore`.
- DTO: `StudyPlanSummaryItem`, `StudyPlanListResponse`, `RestoreStudyPlanRequest`, `ApiErrorCode`; trường `sourcePlanId`, `totalCredits`, `projectedCpa`, `activatedAt` cho kế hoạch đã lưu; `selectedRetakeCourseCodes`, `planName`, `targetCpa`, `totalCredits`, `actions` cho phương án sinh ra.
- `glossary-v1.json`: từ điển trường (một dữ liệu — một tên), danh sách tên khai tử, accessor Java chuyển tiếp.
- Fake provider (`vn.haui.advisor.contracts.fake`): `FixtureAcademicFacade`, `FixtureAdvisorFacade`, `FixedStudentContextProvider`, `InMemoryConversationStore`, `ContractFixtures`.
- Package npm `@haui/contracts` (fixtures, `OPERATIONS`, `ENUMS`, `findFixture`) cho mock FE.
- Contract test (fixture ↔ OpenAPI ↔ DTO), HTTP contract test, consumer test (TV4 engine, TV1 advisor), khóa `contracts-v1.lock.json`.

### Đổi tên (V0 → V1, một dữ liệu — một tên)
| V0 | V1 | Nơi |
|---|---|---|
| `plannedCredits`, `totalPlannedCredits` | `totalCredits` | `PlannedSemesterItem`, phương án/kế hoạch |
| `estimatedGpa`, `projectedSemesterGpa` | `expectedGpa` | `PlannedSemesterItem`, `SimulateGradesResponse` |
| `estimatedFinalCpa`, `projectedNewCpa` | `projectedCpa` | phương án, `SimulateGradesResponse` |
| `cpaDifference`, `potentialCpaGain` | `cpaDelta` | `SimulateGradesResponse`, `RetakeCourseRecommendation` |
| `version` (kế hoạch), `expectedVersion` | `planVersion` | `StudyPlanDetailResponse`, `ActivateStudyPlanRequest` |
| `savedAt`, `lastUpdated` | `updatedAt` | `SaveStudyPlanResponse`, `StudentDataVersion` |
| `warningMessages`, `feasibilityWarnings` | `warnings` | `AcademicStatusResponse`, `CalculateTargetGradesResponse` |
| `totalCreditsEarned`, `earnedCredits` | `accumulatedCredits` | `GraduationAuditResponse`, `AuditChecklistItem` |
| `requiredCredits` | `totalCreditsRequired` | `AuditChecklistItem` |
| `suggestedSemesters` | `semesters` | `ChatPlanProposal` |
| `planId` (phương án chưa lưu) | `proposalId` | `GenerateStudyPlanResponse` |

### Thay đổi hành vi / gỡ bỏ
- `POST /planner/preview` + `PreviewStudyPlanRequest/Response` gộp vào `POST /planner/generate` + `GenerateStudyPlan*` (hai thao tác trùng nhau).
- `GET /planner/plan`, `POST /planner/save`, `POST /planner/activate` thay bằng path tài nguyên `/planner/plans...` (CD-01, CD-03, CD-05).
- Lưu nháp luôn trả `DRAFT` (V0 trả `VALIDATED`). Kích hoạt chỉ nhận `VALIDATED`, lỗi → 422.
- `ActivateStudyPlanRequest` bỏ `planId` (đã nằm trên path).
- `StudentDataVersion` bỏ `version` (trùng nghĩa với `dataRevision`).
- `ChatActionItem.description` không còn tự lấy `label` khi trống (trước đây cùng một giá trị xuất ra hai trường).
- `ApiErrorResponse.code` là enum `ApiErrorCode`.
- Fixtures dựng lại quanh một sinh viên demo `2024604757` / `REV-2024604757-001`; mã, tên, số tín chỉ học phần lấy từ CTĐT của TV4.

### Chuyển tiếp (gỡ ở 1.1.0)
Accessor Java `@Deprecated(forRemoval)` + `@JsonIgnore` giữ cho TV1/TV4 compile, không xuất hiện trong JSON:
`getWarningMessages`, `getFeasibilityWarnings`, `getSuggestedSemesters`, `GenerateStudyPlanResponse#getPlanId` và constructor 8 tham số,
`getTotalCreditsEarned`, `getPotentialCpaGain`, `getCpaDifference`, `getProjectedNewCpa`, `getProjectedSemesterGpa`. Chi tiết: `glossary-v1.json#javaBridges`.
