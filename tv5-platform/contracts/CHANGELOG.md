# CHANGELOG — tv5-platform/contracts

Mọi thay đổi hợp đồng sau mốc `contracts-v1` phải có mục ở đây, trong cùng PR của TV5 với thay đổi.
Quy trình: [docs/task-2.4-contracts-v1.md §6](../docs/task-2.4-contracts-v1.md).

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
