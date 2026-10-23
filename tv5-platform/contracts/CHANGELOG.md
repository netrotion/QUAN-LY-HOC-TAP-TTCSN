# CHANGELOG — tv5-platform/contracts

Mọi thay đổi hợp đồng sau mốc `contracts-v1` phải có mục ở đây, trong cùng PR của TV5 với thay đổi.
Quy trình: [docs/task-2.4-contracts-v1.md §6](../docs/task-2.4-contracts-v1.md).

## [1.5.0] — 2026-10-23 — What-if, đối chiếu kế hoạch và Chat (Task 4.3b)

Nối nốt các operation còn 501: What-if, xếp hạng học cải thiện (ROI), mục tiêu ngược, đối chiếu kế hoạch và Chat. Không còn
operation nào trả 501. Không đổi tên hay xóa trường nào của 1.4.0.

### Thêm
- Mã lỗi `AI_UNAVAILABLE` (503: trợ lý AI chưa cấu hình, quá hạn, quá tải hoặc nhà cung cấp mô hình lỗi; `details` có `reason: …`),
  `CONVERSATION_BUSY` (409: hội thoại vừa được lượt khác ghi), `PLAN_NOT_ACTIVE` (409: đối chiếu kế hoạch không phải ACTIVE).
- `ApiErrorResponse.retryable` (chỉ có khi `true`): lỗi tạm thời, gửi lại được sau số giây ở header `Retry-After`
  (khai báo trong response chung 503).
- `policyVersion` trên `SimulateGradesResponse`, `RankRetakeCoursesResponse`, `CalculateTargetGradesResponse`, `ReconcileStudyPlanResponse`.
- Fixture `chat-ai-unavailable` (`error-ai-unavailable.sample.json`); 4 file mẫu What-if/đối chiếu có `policyVersion`; glossary thêm `retryable`.
- `/system/health` có `advisor`; `BootstrapInfoResponse.modules.advisor` = `READY | DEGRADED | NOT_CONFIGURED | MOCK`.

### Thay đổi hành vi
- `simulateGrades`, `rankRetakeCourses`, `calculateTargetGrades`, `reconcileStudyPlan`, `chatAdvisor`: `IMPLEMENTED`; response 501 thay bằng
  503 (`TOOL_NOT_READY` cho công cụ học vụ, `AI_UNAVAILABLE` cho Chat). Chat thêm 404 (mã hội thoại của sinh viên khác) và 409.
- What-if/ROI/mục tiêu ngược/đối chiếu chỉ đọc, tính trên hồ sơ server nạp; `dataRevision` client gửi khác bản hiện hành → 409.
- `SimulateGradesResponse.currentCpa/expectedGpa/projectedCpa/cpaDelta`, `CalculateTargetGradesResponse.currentCpa/targetCpa/requiredAverageGpa`
  được khai báo `nullable` cho đúng kết quả engine khi thiếu dữ liệu (không gán 0).
- Bỏ fixture `not-implemented` và `error-not-implemented.sample.json` (không còn operation 501); mã `NOT_IMPLEMENTED` giữ trong enum.

### Việc cho owner khác
- TV3 (4.4a): nối What-if/ROI/mục tiêu ngược/đối chiếu và Chat; với 503 `AI_UNAVAILABLE` hiện thông báo + nút gửi lại (giữ nội dung đã gõ),
  tôn trọng `Retry-After`; 409 `CONVERSATION_BUSY` thì tải lại hội thoại rồi gửi lại; không hiển thị câu trả lời nào khi lỗi.
- TV1: chi tiết ở `tv5-platform/docs/task-4.3b-whatif-reconcile-chat.md` §5.

## [1.4.0] — 2026-10-23 — sinh và thẩm định kế hoạch trên planner tool thật (Task 4.2b)

Sinh phương án và thẩm định kế hoạch chạy planner tool của AcademicFacade trên hồ sơ server nạp từ DB; kế hoạch đang theo dõi
được thẩm định lại khi hồ sơ hoặc quy chế đổi. Không đổi tên hay xóa trường nào của 1.3.0.

### Thêm
- `GenerateStudyPlanResponse.policyVersion`: quy chế đã áp dụng khi sinh phương án (`policyId@version`).
- `StudyPlanDetailResponse.policyVersion`: quy chế của lần thẩm định thật còn hiệu lực, đi cùng `validatedAt`
  (khi đó `dataRevision` của kế hoạch là hồ sơ của lần thẩm định đó). Null khi chưa thẩm định hoặc kết quả đã hết hiệu lực.
- Fixture `generate-study-plan-response`, `study-plan-read-response` có `policyVersion` (không thêm file mẫu).

### Thay đổi hành vi
- `generateStudyPlan`: `x-implementation-status: IMPLEMENTED`; response 501 thay bằng **503 `TOOL_NOT_READY`** khi AcademicFacade
  chưa khai báo `GENERATE_STUDY_PLAN`. Không lưu gì; phương án luôn `DRAFT`. `dataRevision` client gửi khác bản hiện hành → 409,
  `targetGraduationSemester` sai dạng → 400. Chưa có bảng điểm đã xác nhận → cảnh báo đầu `warnings`.
- `validateStudyPlan` không có `planId` (kiểm tra nhanh nội dung chưa lưu): `status` luôn `DRAFT` (1.3.0 trả `VALIDATED` khi hợp lệ);
  `valid` vẫn là kết quả. Lưu nháp không mang kết quả thẩm định nào; `SaveStudyPlanResponse.message` nói rõ bản nháp chưa được kiểm tra.
- `validateStudyPlan` với `planId` của bản ACTIVE: kết quả được ghi lại, kế hoạch giữ ACTIVE.
- Thẩm định lại: khi `dataRevision` tăng (xác nhận bảng điểm, khai báo chứng chỉ, đổi CTĐT) hoặc quy chế đổi, kế hoạch VALIDATED/ACTIVE
  được thẩm định lại trên dữ liệu mới. VALIDATED vi phạm → DRAFT; ACTIVE vi phạm giữ ACTIVE, `validatedAt`/`policyVersion` về null,
  `warnings` nêu vi phạm. Chưa có công cụ thẩm định thật → VALIDATED về DRAFT (kết quả cũ hết hiệu lực).
- Fixture `not-implemented` minh họa `reconcileStudyPlan` (operation còn 501) thay cho `generateStudyPlan`.

### Việc cho owner khác
- TV3 (4.3a): nối `POST /planner/generate` (nhãn "Dự kiến", hiện `policyVersion`, cảnh báo); sau khi lưu luôn hiển thị bản nháp
  "chưa kiểm tra điều kiện", không dùng kết quả kiểm tra nhanh để bật "Kích hoạt"; hiển thị `validatedAt`/`policyVersion` và cảnh báo
  thẩm định lại trong `warnings` của chi tiết kế hoạch.
- TV4: `validateStudyPlan` vẫn chưa khai báo trong `readyCapabilities()` nên validate/activate còn 503 ở runtime; chi tiết và các sai lệch
  của planner tool ghi ở `tv5-platform/docs/task-4.2b-planner-api-live.md` §5.

## [1.3.0] — 2026-10-20 — API học vụ nối công cụ thật (Task 4.1)

Trạng thái học vụ, điều kiện học phần, cây CTĐT và rà soát tốt nghiệp chạy trên AcademicFacade thật với hồ sơ server nạp từ DB.
Không đổi tên hay xóa trường nào của 1.2.0.

### Thêm
- Operation `GET /academic/curriculum/tree` (`getCurriculumTree`) → `CurriculumTreeResponse`: mọi học phần của CTĐT kèm `status`
  (enum mới `CourseProgressStatus`: `PASSED` | `FAILED` | `IN_PROGRESS` | `ELIGIBLE` | `BLOCKED` | `UNKNOWN`), lần học gần nhất
  (`letterGrade`, `semesterCode`) và kết quả nguyên văn của `AcademicFacade#checkCourseEligibility` (`eligible`, `missingPrerequisites`, `warnings`).
  DTO `CurriculumTreeResponse`, `CurriculumTreeCourseItem`.
- Trường `policyVersion` (quy chế đã áp dụng, `policyId@version`) trên `AcademicStatusResponse`, `CourseEligibilityResponse`,
  `GraduationAuditResponse`, `CurriculumResponse`; `CurriculumResponse.dataRevision`. "profileRevision" trong mô tả task là `dataRevision`
  (một dữ liệu — một tên), đã ghi vào `glossary-v1.json#retired`.
- `ENUMS.CourseProgressStatus` trong module JS cho FE.
- 1 file mẫu mới `curriculum-tree-response.sample.json` (tổng 71, 55 ví dụ trong manifest).

### Thay đổi hành vi
- `getAcademicStatus`, `checkCourseEligibility`, `runGraduationAudit`: `x-implementation-status: IMPLEMENTED`; response 501 thay bằng
  **503 `TOOL_NOT_READY`** khi AcademicFacade chưa khai báo capability tương ứng. Không có kết quả thay thế (mock) cho các operation này.
- `studentId` trong `CourseEligibilityRequest` tiếp tục bị bỏ qua; `dataRevision` client gửi (nếu có) khác bản hiện hành → 409.
- Fixture `not-implemented` minh họa `generateStudyPlan` (operation còn 501) thay cho `getAcademicStatus`.

### Việc cho owner khác
- TV2 (4.2a): thay mock `GET /academic/status`, `/academic/curriculum`, `/audit/graduation` và trạng thái cây môn học bằng
  `GET /academic/curriculum/tree`; không tự tính trạng thái/điều kiện trong JS; hiển thị `policyVersion` và xử lý 503 `TOOL_NOT_READY`.
- TV4: các sai lệch phát hiện khi nối thật ghi ở `tv5-platform/docs/task-4.1-academic-api-live.md` §5.

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
