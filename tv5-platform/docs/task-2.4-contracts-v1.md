# TASK 2.4 — PHÁT HÀNH CONTRACT V1 (`contracts-v1`)

> **Người thực hiện:** TV5 — Backend/DB/DevOps
> **Phạm vi:** `tv5-platform/` (contracts, app, infra, docs) và root files (`pom.xml`, `package.json`, `package-lock.json`, `scripts/`, `.github/`, `README.md`)
> **Đầu vào (bản chốt):** `tv1-ai/docs/task-2.3-contract-delta.md` (CD-01..CD-07), `tv1-ai/docs/task-2.3-owner-fixes.md`, `tv4-academic/docs/academic-spec-v1.md`, `tv1-ai/specs/task-2.2e-chat-spec.md`
> **Mốc:** `contracts-v1` — phiên bản hợp đồng `1.0.0`
> **Tiêu chí nghiệm thu:** Không có hai tên/trường khác nhau cho cùng dữ liệu; ví dụ và DTO qua test.

---

## 1. Tóm tắt

| Hạng mục | Kết quả |
|---|---|
| OpenAPI | `contracts/openapi/openapi-v1.yaml`: 17 operation, 46 schema (45 DTO/enum Java + BootstrapInfoResponse), request/response đầy đủ, mã lỗi `ApiErrorCode`. File V0 đã gỡ. |
| Java DTO/ports | 45 DTO/enum, 4 port (không đổi chữ ký port). 4 DTO mới, 2 DTO trùng chức năng đã gộp. |
| JSON fixtures | 35 file mẫu + `fixture-manifest.json`, cùng một sinh viên demo `2024604757`; mã, tên và số tín chỉ học phần lấy từ CTĐT của TV4. |
| Một dữ liệu — một tên | `glossary-v1.json`: 108 trường chuẩn, 24 tên V0 khai tử. Test tự động trên DTO, OpenAPI và fixture. |
| Fixture cho FE | Package npm `@haui/contracts` (workspace): `getFixture`, `findFixture`, `OPERATIONS`, `ENUMS`. |
| Fake provider cho AI | `vn.haui.advisor.contracts.fake`: `FixtureAcademicFacade`, `FixtureAdvisorFacade`, `FixedStudentContextProvider`, `InMemoryConversationStore`. |
| Input cho TV4 | 10 request fixture cho 9 capability của `AcademicFacade` (có `facadeMethod` trong manifest), chạy thật trên engine TV4 trong consumer test. |
| Runtime | Planner V1 (list/save/get/validate/activate/restore) chạy in-memory đúng ngữ nghĩa CD-01..CD-05; endpoint chưa nối trả `501 NOT_IMPLEMENTED` đúng schema. |
| Khóa mốc | `contracts-v1.lock.json` (SHA-256 của mọi file contract) + `CHANGELOG.md`; `check-contracts` chặn thay đổi không qua quy trình. |

---

## 2. Ánh xạ bản chốt Task 2.3 → contracts-v1

| Delta | Phân loại | Hiện thực trong contracts-v1 |
|---|---|---|
| **CD-01** Activate | REQUIRED | `POST /planner/plans/{planId}/activate`, body `{planVersion, dataRevision}`. Chưa `VALIDATED` → `422 PLAN_NOT_VALIDATED`. Thẩm định lại lúc kích hoạt mà có vi phạm → `422 PLAN_VALIDATION_FAILED` (`details` = vi phạm). Dữ liệu cũ → `409 DATA_REVISION_STALE`. Lệch phiên bản → `409 PLAN_VERSION_CONFLICT`. Bản ACTIVE cũ chuyển `ARCHIVED` trong cùng khối khóa, trả về `archivedPlanIds`. |
| **CD-02** Validate | REQUIRED | `POST /planner/validate` luôn gọi `AcademicFacade` (TV4). Có `planId` + `planVersion`: thẩm định bản đã lưu, hợp lệ thì chuyển `VALIDATED`. Không có `planId`: kiểm tra nhanh `semesters` chưa lưu, không ghi gì. Response tách `valid`, `status`, `violations`, `warnings`. |
| **CD-03** Save ≠ Activate | REQUIRED | `POST /planner/plans` luôn trả `DRAFT`, cho lưu cả khi còn vi phạm. `planId = null` → tạo mới. DRAFT/VALIDATED → cập nhật tại chỗ, `planVersion + 1`, về DRAFT. ACTIVE → tạo DRAFT kế thừa (`sourcePlanId`), ACTIVE giữ nguyên. ARCHIVED/COMPLETED → `409 PLAN_NOT_EDITABLE`. |
| **CD-04** Restore | RECOMMENDED → làm | `POST /planner/plans/{planId}/restore` (body tùy chọn `{planName}`) → `StudyPlanDetailResponse` của DRAFT mới (`planVersion = 1`, `sourcePlanId` = bản gốc). Bản gốc bất biến. |
| **CD-05** History | RECOMMENDED → làm | `GET /planner/plans` → `StudyPlanListResponse{plans: StudyPlanSummaryItem[]}` gồm `planId, planName, planVersion, status, sourcePlanId, totalCredits, projectedCpa, updatedAt`. Chi tiết qua `GET /planner/plans/{planId}`. |
| **CD-06** Projected ≠ Actual | UI_ONLY | Không đổi schema. Các trường dự kiến thống nhất tên: `projectedCpa`, `expectedGpa`, `targetGrade`, `cpaDelta`; mô tả OpenAPI ghi rõ nhãn "Dự kiến". |
| **CD-07** Context isolation | NO_CONTRACT_CHANGE | Giữ chữ ký `StudentContextProvider`. `StudentDataVersion` chỉ bỏ `version` (trùng nghĩa `dataRevision`) và đổi `lastUpdated` → `updatedAt`. Mọi `studentId` trong request là `readOnly`: server điền từ `TrustedStudentContext`. |

**Ghi chú về đầu vào:** TV1 chưa ban hành file `flow-approved-v1`. Các lỗi F23-001..F23-009 đã được owner sửa trên `main` trước task này. Task 2.4 dùng `task-2.3-contract-delta.md` làm bản chốt hợp đồng, theo chỉ dẫn ở §7 của `task-2.3-review.md`.

---

## 3. Danh mục contracts-v1

```text
tv5-platform/contracts/
├── openapi/openapi-v1.yaml        # Nguồn chuẩn HTTP (OpenAPI 3.0.3)
├── glossary-v1.json               # Từ điển trường, tên khai tử, accessor chuyển tiếp
├── examples/                      # 35 JSON fixture + fixture-manifest.json
├── src/main/java/.../contracts/
│   ├── dto/                       # DTO + enum (StudyPlanStatus, ApiErrorCode, AcademicRiskLevel)
│   ├── ports/                     # AcademicFacade, AdvisorFacade, StudentContextProvider, ConversationStore
│   ├── fake/                      # Fake provider dựa trên fixture
│   ├── ContractVersion.java       # 1.0.0 / contracts-v1
│   └── ContractsJson.java         # Cấu hình Jackson chuẩn (ISO-8601, giữ null, từ chối trường lạ)
├── src/test/java/...              # Contract test (đóng gói test-jar cho platform app)
├── js/                            # @haui/contracts cho FE (index.js + contracts-v1.generated.js)
├── package.json                   # Workspace npm @haui/contracts
├── CHANGELOG.md
└── contracts-v1.lock.json
```

### 3.1. Operation

| Tag | Method & path | operationId | Schema request → response | Runtime |
|---|---|---|---|---|
| System | `GET /system/bootstrap` | getBootstrapInfo | — → BootstrapInfoResponse | IMPLEMENTED |
| System | `GET /system/health` | getSystemHealth | — → inline | IMPLEMENTED |
| Academic | `GET /academic/status` | getAcademicStatus | (facade: AcademicStatusRequest) → AcademicStatusResponse | 501 |
| Academic | `POST /academic/eligibility` | checkCourseEligibility | CourseEligibilityRequest → CourseEligibilityResponse | 501 |
| Planner | `POST /planner/generate` | generateStudyPlan | GenerateStudyPlanRequest → GenerateStudyPlanResponse | 501 |
| Planner | `POST /planner/validate` | validateStudyPlan | ValidateStudyPlanRequest → ValidateStudyPlanResponse | IN_MEMORY + TV4 |
| Planner | `GET /planner/plans` | listStudyPlans | — → StudyPlanListResponse | IN_MEMORY |
| Planner | `POST /planner/plans` | saveStudyPlan | SaveStudyPlanRequest → SaveStudyPlanResponse | IN_MEMORY |
| Planner | `GET /planner/plans/{planId}` | getStudyPlan | — → StudyPlanDetailResponse | IN_MEMORY |
| Planner | `POST /planner/plans/{planId}/activate` | activateStudyPlan | ActivateStudyPlanRequest → ActivateStudyPlanResponse | IN_MEMORY + TV4 |
| Planner | `POST /planner/plans/{planId}/restore` | restoreStudyPlan | RestoreStudyPlanRequest (tùy chọn) → StudyPlanDetailResponse | IN_MEMORY |
| Planner | `POST /planner/reconcile` | reconcileStudyPlan | ReconcileStudyPlanRequest → ReconcileStudyPlanResponse | 501 |
| Simulation | `POST /simulation/grades` | simulateGrades | SimulateGradesRequest → SimulateGradesResponse | 501 |
| Simulation | `POST /simulation/retake-ranking` | rankRetakeCourses | RankRetakeCoursesRequest → RankRetakeCoursesResponse | 501 |
| Simulation | `POST /simulation/target-grades` | calculateTargetGrades | CalculateTargetGradesRequest → CalculateTargetGradesResponse | 501 |
| Audit | `GET /audit/graduation` | runGraduationAudit | (facade: GraduationAuditRequest) → GraduationAuditResponse | 501 |
| Advisor | `POST /advisor/chat` | chatAdvisor | ChatRequest → ChatResponse | 501 |

`501` nghĩa là contract đã chốt nhưng runtime chưa nối facade (Phase 4). Body lỗi vẫn đúng `ApiErrorResponse`.

### 3.2. Đổi từ V0 sang V1

Bảng đổi tên đầy đủ nằm trong [`contracts/CHANGELOG.md`](../contracts/CHANGELOG.md). Các thay đổi cấu trúc:
- **Gộp `preview` vào `generate`:** `POST /planner/preview` và `PreviewStudyPlan*` trùng chức năng với `generateStudyPlan` (mỗi bên một shape cho cùng phương án). V1 chỉ giữ `POST /planner/generate`. `GenerateStudyPlanResponse` là bản xem trước chưa lưu, chỉ có `proposalId`, không có `planId`/`planVersion`.
- **`proposalId` thống nhất:** phương án đi qua chat (`ChatPlanProposal.proposalId`) và qua planner (`GenerateStudyPlanResponse.proposalId`) cùng một mã.
- **Path tài nguyên:** `/planner/plan`, `/planner/save`, `/planner/activate` thay bằng `/planner/plans...`.
- **Alias ẩn đã bỏ:** `PlannedSemesterItem` từng xuất cùng lúc `totalCredits/plannedCredits` và `expectedGpa/estimatedGpa`. `ChatActionItem.getDescription()` từng tự trả `label`. Cả ba đều do contract test phát hiện.

---

## 4. Một dữ liệu — một tên (cách kiểm chứng)

| Kiểm tra | Ở đâu | Bắt lỗi gì |
|---|---|---|
| Fixture ↔ schema OpenAPI | `ContractFixturesConformanceTest` | Trường ngoài schema, sai kiểu, sai enum, sai pattern mã học kỳ, sai định dạng ngày |
| Fixture → DTO → JSON | `ContractFixturesConformanceTest` | DTO thiếu trường, hoặc sinh thêm trường có giá trị (tên thứ hai cho cùng dữ liệu) |
| DTO ↔ OpenAPI | `ContractNamingConsistencyTest` | Tập trường và kiểu Java khác schema OpenAPI; enum Java ≠ enum OpenAPI |
| Alias getter/setter | `ContractNamingConsistencyTest` | Một giá trị ghi vào DTO xuất hiện dưới hai tên JSON |
| Glossary | `ContractNamingConsistencyTest`, `check-contracts` | Trường chưa đăng ký; cùng tên mà khác kiểu JSON; dùng tên đã khai tử |
| Số liệu dẫn xuất | `ContractsSerializationTest` | `totalCredits` học kỳ ≠ tổng môn; `totalCredits` kế hoạch ≠ tổng học kỳ; lịch sử ≠ chi tiết |
| Dữ liệu nguồn | `check-contracts` | Mã học phần trong fixture phải có trong CTĐT TV4, cùng tên, cùng số tín chỉ |
| Server | `StudyPlanService.normalize` | Server tự tính lại `totalCredits`, không tin số client gửi |

**Mutation check đã chạy:** khi cố tình đưa lại `getPlannedCredits()`, dùng `projectedNewCpa` trong fixture, hoặc thêm getter trùng nghĩa `sourceTitle`, có 11 test fail và chỉ đúng chỗ lỗi.

**Accessor chuyển tiếp:** TV1/TV4 đang gọi 9 getter và 1 constructor theo tên V0. Để reactor vẫn compile mà không sửa folder của owner khác, các accessor này được giữ ở dạng `@Deprecated(forRemoval = true)` + `@JsonIgnore`. Chúng không xuất hiện trong JSON. Test buộc mỗi accessor như vậy phải có trong `glossary-v1.json#javaBridges`, và sẽ gỡ ở `1.1.0`.

---

## 5. Hướng dẫn cho từng thành viên (Phase 3)

### TV1 — AI
- Test không cần engine TV4: `new DefaultToolAdapter(new FixtureAcademicFacade())`, context `new FixedStudentContextProvider().getAuthenticatedContext()`, lịch sử chat `new InMemoryConversationStore()`. Gọi `changeDataRevision(...)` để mô phỏng dữ liệu cũ.
- Cần đổi trong PR của TV1 (javac đang in cảnh báo `[removal]`): `getWarningMessages()` → `getWarnings()`, `GenerateStudyPlanResponse#getPlanId()` → `getProposalId()`, `getSuggestedSemesters()` → `getSemesters()`, constructor 8 tham số của `GenerateStudyPlanResponse` → bản 7 tham số.
- Chat spec 2.2e mô tả `ChatSourceItem` dạng snake_case. Trên dây là camelCase (`sourceId`, `referenceUrl`). Route `OPEN_WHAT_IF` trong spec là `/simulator`, còn UI dùng `/what-if`. TV1 nên thống nhất với TV2/TV3.
- `DefaultAdvisorFacade` đang truyền học kỳ dạng `2024_2025_HK2`. Dạng chuẩn là `<năm>_<1|2|SUMMER>`, ví dụ `2026_1`.

### TV2 — FE học vụ / TV3 — FE kế hoạch
- Mock theo schema V1: `import { getFixture, findFixture, OPERATIONS, ENUMS } from '@haui/contracts'` (cần chạy `npm install` để link workspace). Ví dụ `findFixture('POST', '/planner/plans/x/activate', { httpStatus: 422 })` trả lỗi chuẩn.
- Không gửi `studentId` trong request (`readOnly`). Gửi lại nguyên văn `dataRevision`/`planVersion` server trả về.
- Planner (TV3): lưu nháp `POST /planner/plans`. Kiểm tra điều kiện bằng `POST /planner/validate` với `{planId, planVersion}`. Chỉ bật nút kích hoạt khi `status == VALIDATED`. Sửa bản ACTIVE thì server tạo DRAFT kế thừa. "Mở lại phiên bản cũ" dùng `POST /planner/plans/{planId}/restore`. Lịch sử dùng `GET /planner/plans` (thay `name` → `planName`, `version` chuỗi `'v2.4'` → `planVersion` số).
- `npm run check:contract-consumers -- --owner tv3` liệt kê chính xác chỗ cần đổi. Lúc phát hành có 96 tên trường V0 (ví dụ `projectedNewCpa`, `cpaDifference`, `potentialCpaGain`, `requiredCredits`/`earnedCredits`, `warningMessages`, `maxCourses`). Request What-if/generate phải dùng `maxSuggestions` và `targetGraduationSemester` (không phải `maxCourses`/`targetSemester`). Validate gửi `semesters`, không gửi `{totalCredits}` phẳng.

### TV4 — Academic
- Input chuẩn cho 9 capability: các fixture có `facadeMethod: "AcademicFacade#..."` trong `examples/fixture-manifest.json` (sinh viên `2024604757` + một ca thiếu dữ liệu `std-missing-unknown-v1`, đều có trong `student-profiles-v1.json`).
- Consumer test của platform chạy `DefaultAcademicFacade` thật trên các input này và kiểm output theo schema V1. Hiện tại pass toàn bộ.
- Cần đổi trong PR của TV4: `getPotentialCpaGain()` → `getCpaDelta()`, `getProjectedNewCpa()` → `getProjectedCpa()`, `getCpaDifference()` → `getCpaDelta()`, `getProjectedSemesterGpa()` → `getExpectedGpa()`, `getFeasibilityWarnings()`/`getWarningMessages()` → `getWarnings()`, `getTotalCreditsEarned()` → `getAccumulatedCredits()`, constructor 8 tham số → 7 tham số. Danh sách đầy đủ theo dòng: `./mvnw -pl tv4-academic test-compile`.
- Mã học kỳ hè theo contract là `<năm>_SUMMER`, khớp cách `validateStudyPlan` nhận diện kỳ hè hiện nay.

### TV5 — Platform (Task 3.2)
- Thay store in-memory của `StudyPlanService` bằng PostgreSQL mà không đổi contract. Cần ràng buộc một ACTIVE mỗi sinh viên (partial unique index), cột `source_plan_id`, và giữ `planVersion` cho optimistic lock.
- Bổ sung contract cho các phần chưa có trong bản chốt 2.3 (xem §8) theo quy trình §6 trước khi code.

---

## 6. Quy trình thay đổi sau mốc `contracts-v1`

1. Chỉ TV5 sửa `tv5-platform/contracts/**`. Owner khác đề xuất qua issue hoặc PR mô tả. TV5 mở PR thay đổi contract.
2. Trong cùng PR:
   - sửa OpenAPI + DTO + fixture + glossary;
   - tăng `ContractVersion.CURRENT`, `info.version`, manifest, glossary và `package.json` (minor khi thêm, major khi phá vỡ);
   - ghi mục `## [x.y.z]` vào `CHANGELOG.md`;
   - chạy `npm run contracts:build` và `npm run contracts:lock`.
3. **Kiểm tra phía sử dụng** (bắt buộc ghi kết quả vào PR):
   - `./mvnw test`: contract test, HTTP contract test, consumer test TV4/TV1, toàn bộ test TV1/TV4 compile và pass;
   - `npm run check:contract-consumers`: báo cáo chỗ FE TV2/TV3 cần đổi;
   - `./mvnw -pl tv1-ai,tv4-academic test-compile`: cảnh báo `[removal]` cho Java.
4. Owner bị ảnh hưởng review PR. Phần sửa trong folder của họ do họ làm ở PR riêng.
5. `npm run check:contracts` (smoke + CI) fail nếu file contract đổi mà lock chưa cập nhật, nếu phiên bản lệch giữa các file, hoặc nếu CHANGELOG thiếu mục phiên bản.

---

## 7. Kết quả kiểm thử

| Lệnh | Kết quả |
|---|---|
| `./mvnw test` | 194 test pass: contracts 96, tv1-ai 33, tv4-academic 45, platform app 20 |
| `npm run check:contracts` | PASS: version 1.0.0 đồng nhất, 21 fixture, 17 operation, khớp CTĐT TV4, lock khớp |
| `npm run test` | PASS, gồm 6 test `@haui/contracts` |
| `npm run check:contract-consumers` | Báo cáo (không chặn): TV2 81, TV3 19 điểm cần đổi |
| `npm run smoke` | Xem kết quả trong PR |

---

## 8. Giới hạn và việc còn mở

- **Ngoài bản chốt 2.3, chưa có trong V1:** đăng nhập/phiên (`/auth/*`), hồ sơ sinh viên, CTĐT/cây môn (`GET /academic/curriculum`) và nhập bảng điểm (`POST /academic/transcript-ingest`, review → confirm). TV2 đang mock hai endpoint này với shape riêng. Đề xuất TV5 phát hành `contracts-v1.1` trước khi bắt đầu Task 3.2/3.4. Dựa trên prototype TV2 và các bảng `import_sessions`, `curricula`, `course_relations` đã có ở V2 migration.
- **`projectedCpa` của kế hoạch đã lưu** hiện là `null` trong store in-memory (chưa có capability tính CPA dự kiến cho kế hoạch tùy ý). Task 3.2/3.6 tính bằng `simulateGrades` trên `targetGrade`.
- **Tín chỉ là số nguyên:** CTĐT có học phần 1.5 TC (GDQP). Contract giữ `integer` như V0. Nếu cần tính các học phần này vào kế hoạch, phải đổi kiểu ở bản sau.
- **`eligible`/`completed` là boolean:** trường hợp thiếu dữ liệu biểu diễn theo spec TV4 (`eligible = false` + dòng `UNKNOWN` trong `missingPrerequisites`). Không thêm trường enum song song để tránh hai tên cho cùng dữ liệu.
- **Docker image** chưa build lại được trên máy thực hiện (không có Docker CLI). Dockerfile đã được bổ sung `examples/` và workspace `@haui/contracts`. `npm ci` với lockfile mới đã chạy thử thành công.
