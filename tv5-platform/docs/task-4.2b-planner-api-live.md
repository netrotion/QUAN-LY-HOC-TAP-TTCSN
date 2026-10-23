# TASK 4.2b — NỐI API TẠO VÀ KIỂM TRA KẾ HOẠCH (`planner-api-live`)

> **Người thực hiện:** TV5 — Backend/DB/DevOps
> **Phạm vi:** `tv5-platform/` (contracts 1.4.0, app, docs) và `README.md`
> **Chờ:** 4.1 (`academic-api-live`), 3.6 (TV4 `planner-tool-ready`)
> **Tiêu chí nghiệm thu:** Tạo → sửa → validate → save → activate → read; test version xung đột và quyền.

---

## 1. Tóm tắt

| Hạng mục | Kết quả |
|---|---|
| Planner tool trên hồ sơ DB | Bean `academicFacade` = `RecordBackedAcademicFacade` (kế thừa `DefaultAcademicFacade` của TV4). `generateStudyPlan`/`validateStudyPlan` của TV4 đọc hồ sơ dạng `StudentProfileFixture` và khi thiếu thì lấy **hồ sơ mẫu** theo mã sinh viên; lớp này cấp cho hai hàm đó đúng hồ sơ DB của sinh viên (bảng điểm đã xác nhận + CPA/tín chỉ/mức cảnh báo do chính engine tính từ bảng điểm đó). Không còn nhánh hồ sơ mẫu, kể cả khi module AI gọi facade. |
| `POST /planner/generate` | Nối thật (trước đây 501). Hồ sơ server nạp một lần và ghim cho lượt gọi; `studentId` client gửi bị bỏ qua; `dataRevision` cũ → 409; không ghi gì; phương án luôn `DRAFT`, kèm `dataRevision` và `policyVersion`. Chưa có bảng điểm đã xác nhận → cảnh báo đầu `warnings`. |
| `POST /planner/validate` | Gọi planner tool trên hồ sơ DB (mức cảnh báo học tập thật áp trần 14 TC). Bản đã lưu: hồ sơ đọc **sau khi khóa** hồ sơ sinh viên, kết quả ghi lại (ACTIVE giữ ACTIVE). Nội dung chưa lưu: `status` luôn `DRAFT`. |
| Lưu nháp không báo đã qua nghiệp vụ | Lưu luôn `DRAFT`, không mang kết quả thẩm định nào (kể cả nội dung vừa qua kiểm tra nhanh); thông điệp lưu nói rõ "Bản nháp chưa được kiểm tra điều kiện". Kích hoạt ngay sau khi lưu → `422 PLAN_NOT_VALIDATED`. |
| Lưu/activate với validation revision | Mỗi lần thẩm định thật ghi bộ (planVersion, dataRevision, policyVersion). Kích hoạt chỉ nhận `VALIDATED` có `validatedPlanVersion = planVersion`, thẩm định lại trên hồ sơ đọc sau khi khóa và quy chế hiện hành, rồi lưu trữ ACTIVE cũ + ghi ACTIVE mới trong **một giao dịch** (DB vẫn bảo đảm một ACTIVE mỗi sinh viên). Chi tiết kế hoạch trả `policyVersion` (mới) cùng `validatedAt`, `dataRevision`. |
| Revalidate khi transcript/policy đổi | `dataRevision` tăng (xác nhận bảng điểm, khai báo chứng chỉ, đổi CTĐT) → sự kiện `AcademicDataChangedEvent`, sau khi commit thẩm định lại kế hoạch VALIDATED/ACTIVE. Quy chế đổi (khi triển khai lại) → thẩm định lại khi đọc kế hoạch. VALIDATED vi phạm về DRAFT; ACTIVE vi phạm giữ ACTIVE kèm cảnh báo; chưa có công cụ thật thì VALIDATED về DRAFT. |
| Contracts | Phát hành **1.4.0** (2 trường, `generateStudyPlan` IMPLEMENTED, 501 → 503). |
| DB | Migration `V5__plan_revalidation.sql` (`checked_data_revision`, `checked_policy_version`). |

---

## 2. Tiêu chí nghiệm thu và bằng chứng

| Tiêu chí | Cơ chế | Kiểm chứng |
|---|---|---|
| **Tạo → sửa → validate → save → activate → read** | Generate trên bảng điểm DB; sửa phía client; kiểm tra nhanh; lưu DRAFT; validate bản đã lưu; kích hoạt; đọc lại. | `PlannerApiLiveTest.generateEditValidateSaveActivateRead`: nhập bảng điểm 4 môn qua API → generate trả `DRAFT`, `dataRevision`/`policyVersion` đúng, **không** xếp lại 4 môn đã học, `semesters`/`warnings`/`projectedCpa` bằng đúng kết quả `StudyPlanScheduler` của TV4 chạy trên hồ sơ dựng độc lập từ `/academic/transcript` + `/academic/status`; DB không có kế hoạch nào sau generate. Sửa (bỏ một môn) → kiểm tra nhanh `valid=true`, `REAL`, `status=DRAFT` → lưu `DRAFT` ("chưa được kiểm tra điều kiện"), chi tiết `validatedAt`/`policyVersion` null, kích hoạt → 422 `PLAN_NOT_VALIDATED` → validate v1 → `VALIDATED` → sửa tiếp → v2 `DRAFT` → validate v2 → kích hoạt → đọc lại `ACTIVE`, v2, `validatedAt`, `policyVersion`, đúng học kỳ; DB một ACTIVE. HTTP thật (jar + PostgreSQL): generate 200 cho `std-near-grad-ktpm` (2 kỳ × 20 TC, 12 môn, không môn nào đã học), lưu → `DRAFT`, đọc lại đủ học kỳ. |
| **Version xung đột** | `planVersion` bắt buộc, so sau khi khóa hồ sơ sinh viên. | Cùng test: validate/kích hoạt/lưu bằng v1 khi bản lưu ở v2 → 409 `PLAN_VERSION_CONFLICT`. `PlanPersistenceTest.concurrentEditsOnlyOneWins` (6 yêu cầu song song → một 200, năm 409), `concurrentActivationsKeepOneActive`, `StudyPlanSecurityAndVersionTest.shouldBumpVersionAndResetValidationOnEdit` vẫn pass. Generate/validate với `dataRevision` cũ → 409 `DATA_REVISION_STALE`. HTTP thật: sửa → v2, sửa bằng v1 → 409. |
| **Quyền** | Danh tính chỉ từ phiên đăng nhập; mọi truy vấn kế hoạch kèm `student_id` của context. | `PlannerApiLiveTest.permissionsAndIsolation`: generate chưa đăng nhập 401, thiếu CSRF 403; `studentId` của người khác trong body bị bỏ qua (phương án, `dataRevision` và cảnh báo thiếu bảng điểm là của người gọi); revision của tài khoản khác → 409; tài khoản khác đọc/validate/kích hoạt/sửa/hủy kế hoạch → 404, kế hoạch gốc không đổi. HTTP thật: 401, 403, tài khoản khác đọc/hủy/sửa → 404. |
| **Không dùng hồ sơ mẫu** | Planner tool chỉ nhận hồ sơ DB. | `PlannerApiLiveTest.generateNeverUsesSampleProfiles`: `std-near-grad-ktpm` (hồ sơ mẫu TV4: CPA 3.35, 132 TC) nhận phương án tính từ DB (CPA 3.88 → dự kiến 4.00), bằng kết quả TV4 trên hồ sơ DB; facade dựng kiểu cũ rơi về hồ sơ mẫu cho 3.60. `RecordBackedAcademicFacadeTest`: hồ sơ đầu vào giữ nguyên lần học, không điền `majorCode`, đạt/không để engine xác định. HTTP thật: CPA dự kiến 4 (không phải 3.60). |
| **Lưu nháp không báo đã qua nghiệp vụ** | Lưu không ghi kết quả thẩm định; kiểm tra nhanh không trả `VALIDATED`. | Như trên; `StudyPlanSecurityAndVersionTest.shouldIgnoreClientSuppliedStudentId` (kiểm tra nhanh hợp lệ → `DRAFT`), `MockValidationTest`. |
| **Revalidate khi transcript đổi** | Sau khi commit thay đổi dữ liệu học vụ: thẩm định lại VALIDATED/ACTIVE trên hồ sơ mới. | `PlannerApiLiveTest.transcriptChangeRevalidates`: hai kế hoạch 18 TC/kỳ (một VALIDATED, một ACTIVE); nhập lại bảng điểm toàn F → engine TV4 tính CPA 0, `WARNING_LEVEL_1` → ngay sau khi xác nhận, bản VALIDATED về DRAFT với "Vi phạm: … tối đa 14 tín chỉ", bản ACTIVE giữ ACTIVE, `validatedAt`/`policyVersion` null, cảnh báo "không còn đạt điều kiện"; kế hoạch 14 TC mới vẫn kích hoạt được và thay bản cũ; bảng điểm tốt trở lại → ACTIVE được kiểm tra lại, vẫn đạt. `PlanPersistenceTest.repeatedImportForcesRecheck`: thẩm định lại ngay khi xác nhận, kích hoạt bằng revision cũ → 409, bảng điểm không nhân đôi. |
| **Revalidate khi policy đổi** | Khi đọc kế hoạch: lần thẩm định gần nhất dựa trên quy chế khác → thẩm định lại. | `PlannerApiLiveTest.policyChangeRevalidatesOnRead` (quy chế mới có vi phạm → VALIDATED về DRAFT ngay khi đọc danh sách), `PlanPersistenceTest.policyChangeRequiresRecheck` (quy chế mới vẫn đạt → VALIDATED theo quy chế mới; kích hoạt thẩm định lại, vi phạm → 422, về DRAFT). |
| **Không ACTIVE khi validation chưa thật** | Giữ cổng 3.7: chỉ `VALIDATE_STUDY_PLAN` TV4 khai báo mới là công cụ thật. | `ToolNotReadyTest` (runtime mặc định: generate 200, validate/activate 503, không VALIDATED/ACTIVE), `PlannerApiLiveTest.revalidationWithoutRealTool` (dữ liệu đổi khi chưa có công cụ thật: VALIDATED hết hiệu lực về DRAFT, ACTIVE giữ nguyên kèm cảnh báo theo dõi; có công cụ lại thì được kiểm tra lại). HTTP thật: bootstrap `GENERATE_STUDY_PLAN: READY`, `VALIDATE_STUDY_PLAN: NOT_READY`; validate/kiểm tra nhanh/activate → 503. |

---

## 3. Contracts 1.4.0

Chi tiết trong [`contracts/CHANGELOG.md`](../contracts/CHANGELOG.md). Không đổi tên hay xóa trường của 1.3.0.

- `GenerateStudyPlanResponse.policyVersion`; `StudyPlanDetailResponse.policyVersion` (quy chế của lần thẩm định thật còn hiệu lực, đi cùng `validatedAt`).
- `generateStudyPlan`: `IMPLEMENTED`, response 501 thay bằng 503 `TOOL_NOT_READY`.
- `validateStudyPlan` không có `planId`: `status` luôn `DRAFT` (1.3.0 trả `VALIDATED` khi hợp lệ). Với `planId` của bản ACTIVE: kết quả được ghi lại.
- Fixture `not-implemented` chuyển sang `reconcileStudyPlan`; `generate-study-plan-response`, `study-plan-read-response` có `policyVersion`.

---

## 4. Thiết kế chính

### 4.1. Planner tool trên hồ sơ DB
`DefaultAcademicFacade#generateStudyPlan/#validateStudyPlan` của TV4 không đọc `StudentAcademicRecordProvider` mà tra `profiles.get(studentId)` (Map hồ sơ truyền vào constructor, platform truyền rỗng từ 4.1); `generateStudyPlan` khi không thấy còn lấy `AcademicFixtures.getStudentProfilesV1()` — tài khoản trùng mã hồ sơ mẫu sẽ nhận phương án từ dữ liệu mẫu, tài khoản khác nhận phương án như chưa học môn nào. Platform không sửa code TV4 mà thay bean ở composition root:

- `RecordBackedAcademicFacade` giữ nguyên mọi hàm khác của engine; với generate/validate thì lấy hồ sơ DB của sinh viên (bản platform đã ghim cho lượt gọi nếu có), tính trạng thái học vụ bằng chính engine trên hồ sơ đó, dựng `StudentProfileFixture` rồi chạy `DefaultAcademicFacade` một lượt với **đúng một** hồ sơ đó (cùng quy chế/CTĐT với bean).
- Hồ sơ đầu vào: lần học nguyên văn (mã, tên, tín chỉ, học kỳ, điểm chữ, điểm 10); `passed`/`gradePoint4` để trống cho engine tự xác định như khi tính CPA; CPA, tín chỉ tích lũy, mức cảnh báo lấy từ `getAcademicStatus` của engine; học kỳ hiện tại = số học kỳ chính có trong bảng điểm (trống khi chưa có, engine dùng mặc định). Không điền `majorCode`: engine đổi sang CTĐT đóng gói sẵn khi gặp `CT1085`, trong khi CTĐT của engine đã là CTĐT của sinh viên trong DB.
- CTĐT của sinh viên khác CTĐT engine → API trả 503 `TOOL_NOT_READY` (như 4.1); facade ném lỗi thay vì lập kế hoạch trên CTĐT sai.

### 4.2. Validate, lưu, kích hoạt
- Bộ "validation revision" = (planVersion, dataRevision, policyVersion) của lần thẩm định thật. `validated_*` chỉ giữ lần **đạt** còn hiệu lực; `checked_*` (V5) giữ hồ sơ/quy chế của lần thẩm định gần nhất dù đạt hay không, để chỉ kiểm tra lại khi hồ sơ hoặc quy chế đổi tiếp.
- Sửa nội dung xóa cả `validated_*` và `checked_*`; lưu từ ACTIVE tạo DRAFT kế thừa; kích hoạt ghi cả hai bộ.
- Kết quả thẩm định đạt cập nhật `dataRevision` của kế hoạch thành hồ sơ của lần thẩm định đó (giống kích hoạt từ 3.7).

### 4.3. Thẩm định lại
| Khi nào | Cách chạy |
|---|---|
| `dataRevision` tăng (`StudentDataService.bumpRevision`: xác nhận bảng điểm, khai báo chứng chỉ, đổi CTĐT) | `AcademicDataChangedEvent` → `PlanRevalidationListener` (`AFTER_COMMIT`) → `StudyPlanService.revalidate` trong giao dịch riêng (`REQUIRES_NEW`), khóa hồ sơ sinh viên. Lỗi chỉ ghi log, không làm hỏng thao tác đã commit. |
| Đọc kế hoạch (`GET /planner/plans`, `GET /planner/plans/{id}`) | Truy vấn đếm rẻ; chỉ khi có kế hoạch dựa trên hồ sơ/quy chế cũ mới mở giao dịch thẩm định lại. Đây là đường cho quy chế đổi (chỉ khi triển khai lại) và lưới an toàn khi bước trên lỗi. Lỗi không chặn việc đọc. |

| Trạng thái | Công cụ thật, đạt | Công cụ thật, vi phạm | Chưa có công cụ thật |
|---|---|---|---|
| VALIDATED | giữ VALIDATED, ghi revision/quy chế mới, cảnh báo "Đã tự kiểm tra lại … vẫn đạt" | DRAFT, `validatedAt` null, cảnh báo nêu vi phạm | DRAFT, "Kết quả kiểm tra điều kiện hết hiệu lực" |
| ACTIVE | giữ ACTIVE, ghi lần thẩm định mới | giữ ACTIVE, `validatedAt`/`policyVersion` null, cảnh báo nêu vi phạm và hướng dẫn tạo bản nháp kế thừa | giữ nguyên; chi tiết kèm cảnh báo "chưa được kiểm tra lại" |

Không tự bỏ kế hoạch đang theo dõi: sinh viên sửa qua bản nháp kế thừa rồi kích hoạt bản mới.

### 4.4. Schema V5
`study_plans.checked_data_revision`, `checked_policy_version`; backfill từ `validated_*` cho VALIDATED/ACTIVE. Migration RAG `rag_chunks` TV1 đề xuất ở 4.2c (đặt tên V5) cần đổi sang **V6** khi đưa vào (4.3b).

---

## 5. Việc cần các thành viên khác xử lý

### TV4 — planner tool (đề nghị xử lý ở 4.3c)
Platform không sửa code TV4; các điểm dưới đây ảnh hưởng kết quả sinh viên thấy.

| # | Vấn đề | Ảnh hưởng |
|---|---|---|
| 1 | `validateStudyPlan` chỉ kiểm tra trần/sàn tín chỉ mỗi kỳ (và trần 14 TC khi cảnh báo); không kiểm tra tiên quyết/học trước/song hành, môn trùng, môn đã đạt, môn ngoài CTĐT; `readyCapabilities()` chưa khai báo `VALIDATE_STUDY_PLAN`. | Đúng tiêu chí 3.7: validate/activate vẫn **503 ở runtime**, chưa kế hoạch nào kích hoạt được. Khi TV4 bổ sung kiểm tra và khai báo capability, platform chạy thật ngay, không cần sửa. |
| 2 | `generateStudyPlan`/`validateStudyPlan` (và simulate/retake/target/reconcile) đọc `StudentProfileFixture`, rơi về hồ sơ mẫu `AcademicFixtures.getStudentProfilesV1()` thay vì `StudentAcademicRecordProvider`. | Platform đã chặn bằng `RecordBackedAcademicFacade`; nên chuyển engine sang provider để mọi nơi dựng facade đều an toàn. |
| 3 | `StudyPlanScheduler` cố định học kỳ `2025_1`, `2025_SUMMER`, `2025_2`, bỏ qua `targetGraduationSemester`. | Phương án sinh ngày 2026-10-23 xếp vào các kỳ đã qua (HTTP thật: `2025_1`, `2025_2`). Platform trả nguyên văn. |
| 4 | `projectedCpa` = CPA + 0.25 cố định, `expectedGpa` 3.50, `targetGrade` A/B cố định. | Số liệu "Dự kiến" không phải kết quả tính; FE phải gắn nhãn. |
| 5 | Facade chọn CTĐT theo `majorCode` (`CT1085` → CTĐT đóng gói sẵn). | Platform tránh bằng cách không điền `majorCode` (§4.1). |
| 6 | `validateStudyPlan` trả `planVersion = 1` cố định; `proposalId` dạng `plan-<mã>-v1` giống mã kế hoạch. | Platform ghi đè `planVersion`; `proposalId` trả nguyên văn (không trùng định dạng `plan-<mã>-0001` của bản đã lưu). |

### TV3 (4.3a)
- Nối `POST /planner/generate` (nhãn "Dự kiến", hiện `policyVersion`, `warnings`); xử lý 503 `TOOL_NOT_READY` cho validate/activate (tắt "Kích hoạt", hiện lý do).
- Sau khi lưu luôn hiển thị bản nháp "chưa kiểm tra điều kiện"; kết quả kiểm tra nhanh (`status = DRAFT`, `valid`) không được dùng để bật "Kích hoạt" — phải validate bản đã lưu (`planId` + `planVersion`).
- Chi tiết kế hoạch: hiện `validatedAt`/`policyVersion`, cảnh báo thẩm định lại trong `warnings`; ACTIVE vi phạm → gợi ý sửa qua bản nháp kế thừa.

### TV1
- Bean `AcademicFacade` giờ là `RecordBackedAcademicFacade`: tool generate/validate của AI tính trên hồ sơ DB của `studentId` lấy từ `StudentContextProvider`; vẫn theo `readyCapabilities()` (validate chưa sẵn sàng).
- Migration `rag_chunks` đưa vào ở 4.3b sẽ là V6.

---

## 6. Cấu hình

Không thêm biến môi trường. Giới hạn đầu vào generate: `targetGraduationSemester` theo `yyyy_1|yyyy_2|yyyy_SUMMER`, `targetCpa` 0–4, `maxCreditsPerSemester` 0–60 (engine kẹp 10–24), tối đa 50 mã học lại/cải thiện.

---

## 7. Kết quả kiểm thử

| Kiểm tra | Kết quả |
|---|---|
| `./mvnw -B verify` | **BUILD SUCCESS**: contracts 184, TV1 254 (4 skipped — `PgVectorRealDatabaseIntegrationTest` của TV1 cần PostgreSQL có pgvector), TV4 160, platform app **86** (trước task 77: +6 `PlannerApiLiveTest`, +2 `RecordBackedAcademicFacadeTest`, +1 `HttpContractConformanceTest.generateMatchesSchema`). |
| Test platform trên PostgreSQL 16 thật (cluster tạm, cổng riêng) | **86/86 pass**; Flyway V1–V5 thành công; sau test không sinh viên nào có hơn một ACTIVE; mọi DRAFT có `checked_*` = NULL. |
| HTTP thật trên jar + PostgreSQL (runtime mặc định, tài khoản demo) | **17/17**: chưa đăng nhập 401; bootstrap 1.4.0, `GENERATE_STUDY_PLAN: READY`, `VALIDATE_STUDY_PLAN: NOT_READY`; generate 200 trên hồ sơ người gọi (`studentId` lạ bị bỏ qua), không xếp lại môn đã học, CPA dự kiến từ CPA DB; revision cũ 409; lưu → DRAFT + thông điệp "chưa được kiểm tra"; validate/kiểm tra nhanh/activate 503; sửa v2, sửa bằng v1 409; tài khoản khác đọc/hủy/sửa 404; thiếu CSRF 403. |
| `npm run check:contracts` | PASS: 1.4.0, 55 fixture, 39 operation, lock khớp. |
| `npm test` / `npm run lint` | 91/91 pass / PASS. |
| `check:architecture`, `check:ownership`, `check:secrets` | PASS (ownership: chỉ TV5). |
| `check:contract-consumers` | 13 phát hiện, đều là tên trường cũ có sẵn trong test TV3; không phát hiện mới từ 1.4.0. |

---

## 8. Giới hạn còn lại

- Luồng VALIDATED → ACTIVE chỉ chạy được trong test (facade test khai báo thêm `VALIDATE_STUDY_PLAN`; kết quả thẩm định vẫn là kết quả thật của engine TV4). Ở runtime validate/activate vẫn 503 cho tới khi TV4 xử lý §5 #1.
- Thẩm định lại chạy đồng bộ sau khi commit và khi đọc kế hoạch; chưa có job nền thẩm định lại toàn bộ sinh viên khi quy chế đổi, chưa có thông báo chủ động.
- Phương án sinh ra theo học kỳ cố định của TV4 (§5 #3).
- Chưa build lại image Docker (máy không có Docker CLI); PostgreSQL thật chạy bằng cluster tạm, không có pgvector.
