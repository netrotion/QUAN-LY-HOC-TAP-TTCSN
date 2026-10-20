# TASK 4.1 — NỐI API DỮ LIỆU VỚI CÔNG CỤ HỌC VỤ THẬT (`academic-api-live`)

> **Người thực hiện:** TV5 — Backend/DB/DevOps
> **Phạm vi:** `tv5-platform/` (contracts 1.3.0, app, docs) và root files (`scripts/`, `README.md`)
> **Chờ:** 3.1 (TV4 `academic-core-ready`, đã merge PR #10), 3.7 (`persistence-ready`)
> **Tiêu chí nghiệm thu:** API integration test có hai tài khoản; so kết quả facade; không hidden fallback mock.

---

## 1. Tóm tắt

| Hạng mục | Kết quả |
|---|---|
| AcademicFacade thật | Bean `academicFacade` = `DefaultAcademicFacade` của TV4, dựng với `DbStudentAcademicRecordProvider` (hồ sơ từ DB), quy chế và CTĐT đọc từ **cùng file seed DB** (`haui.seed.policy-resource`, `haui.seed.curriculum-resource`) và **không có hồ sơ sinh viên mẫu** (`Map.of()`). |
| StudentContextProvider | `DbStudentContextProvider` (3.2): danh tính chỉ từ principal của phiên đăng nhập. `studentId` client gửi (vd. trong `CourseEligibilityRequest`) bị bỏ qua. |
| Hồ sơ do server nạp | Mỗi yêu cầu nạp hồ sơ học vụ **một lần** trên snapshot `REPEATABLE READ` (revision, bảng điểm, chứng chỉ cùng thời điểm) rồi gắn cho facade trong lúc gọi (`withRecord`). Facade hỏi hồ sơ bao nhiêu lần cũng nhận đúng bản đó. |
| API đã nối | `GET /academic/status`, `POST /academic/eligibility`, `GET /academic/curriculum/tree` (**mới**), `GET /audit/graduation`. `GET /academic/curriculum` (3.2) thêm `dataRevision`, `policyVersion`. |
| profileRevision, policyVersion | Mọi kết quả trên trả `dataRevision` (= revision của đúng hồ sơ đã dùng để tính) và `policyVersion` (`policyId@version` quy chế engine áp dụng, hiện `policy-haui-demo-2026@0.0.1-v0`, `DEMO_UNVERIFIED`). "profileRevision" trong mô tả task chính là `dataRevision` (glossary: một dữ liệu — một tên); tên `profileRevision` được ghi vào `glossary-v1.json#retired`. |
| Không fallback mock | Capability chưa được TV4 khai báo trong `readyCapabilities()` → `503 TOOL_NOT_READY`. Chế độ MOCK (dev/test) chỉ áp dụng cho thẩm định kế hoạch, không cho status/eligibility/tree/audit. Runtime không có bean `contracts.fake`/`ai.mock`; `check:architecture` chặn import fake/mock/hồ sơ mẫu trong `tv5-platform/app/src/main`. |
| Fake bindings | Chỉ ở test: `AcademicToolsTestConfig` (`@TestConfiguration`, chỉ trong `src/test`), dựng giống runtime nhưng cho phép tắt công cụ/ép vi phạm/đổi quy chế. |
| Contracts | Phát hành **1.3.0** (1 operation, 3 DTO/enum, 6 trường, 1 file mẫu). |

---

## 2. Tiêu chí nghiệm thu và bằng chứng

| Tiêu chí | Cơ chế | Kiểm chứng |
|---|---|---|
| **Hai tài khoản** | Mọi truy vấn lấy `studentId` từ `TrustedStudentContext`; hồ sơ nạp theo context; kết quả facade phải cùng `studentId` và `dataRevision` với hồ sơ đã nạp, lệch → lỗi 500 (không trả cho client). | `AcademicApiIntegrationTest.twoAccountsMatchFacade`: A và B nhập bảng điểm khác nhau qua API (nhập tay → xem lại → xác nhận); mỗi người nhận CPA/tín chỉ của mình (A 8 TC, B 3 TC); B gửi `studentId` của A trong body eligibility vẫn nhận kết quả của B (LP6011: A đủ điều kiện, B không). `curriculumTree`: cây của A và B khác nhau theo bảng điểm. HTTP thật trên jar + PostgreSQL: `2024604757` và `std-near-grad-ktpm` (gửi kèm `studentId` của `std-warning-real`) nhận đúng dữ liệu của mình. |
| **So kết quả facade** | Platform trả nguyên văn kết quả facade; chỉ thêm `policyVersion` và bỏ `deadline` không phải ngày (§4.4). | `assertSameAsFacade`: JSON của API (bỏ `policyVersion`) bằng đúng JSON của `academicFacade.getAcademicStatus/runGraduationAudit/checkCourseEligibility` gọi trực tiếp cho cùng sinh viên/revision; cây CTĐT so từng nút (120 học phần) với `checkCourseEligibility`. `TranscriptImportFlowTest`: CPA của `/academic/status` bằng CPA facade tính, không phải 3.99 in trên tài liệu; tín chỉ tích lũy 8 (không phải 120 in trên tài liệu). |
| **Không hidden fallback mock** | Facade không nạp hồ sơ mẫu; lỗi đọc DB xảy ra ở platform trước khi gọi facade; capability chưa thật → 503. | `noFixtureProfileFallback`: tài khoản `std-2026-003` (trùng mã hồ sơ mẫu TV4 có CPA 3.12, 112 TC) nhận CPA `null` và tín chỉ theo DB; facade dựng kiểu cũ (`new DefaultAcademicFacade()`) trả 3.12 cho cùng mã — chứng minh khác biệt. `liveBindingsOnly`: bean facade đúng lớp `DefaultAcademicFacade`, context/record provider trên DB, không bean nào thuộc `contracts.fake`/`ai.mock`. `AcademicApiServiceTest.loadFailureIsNotMasked`: DB lỗi → lỗi lên client, facade không được gọi. `AcademicToolGateTest.academicResultsHaveNoMockFallback`: bật mock ở profile test, status/eligibility/audit vẫn NOT_READY → 503. `HttpContractConformanceTest.academicEndpointsMatchSchema`: tắt công cụ → 503 `TOOL_NOT_READY` cho cả 4 endpoint. HTTP thật: hồ sơ mẫu ghi `std-near-grad-ktpm` 132 TC/CPA 3.35, API trả 12 TC/CPA 3.88 (4 lần học có trong DB). |
| **Revision theo hồ sơ server** | `dataRevision` trả về là revision của snapshot đã dùng; eligibility nhận `dataRevision` client (tùy chọn), cũ → 409. | `resultsFollowServerRevision`: nhập lại bảng điểm → revision mới, tín chỉ 3 → 6, kết quả khớp facade; revision cũ → `409 DATA_REVISION_STALE`; `targetSemester` sai dạng → 400. |

---

## 3. Contracts 1.3.0

Chi tiết trong [`contracts/CHANGELOG.md`](../contracts/CHANGELOG.md). Không đổi tên hay xóa trường của 1.2.0.

- `GET /academic/curriculum/tree` (`getCurriculumTree`) → `CurriculumTreeResponse { studentId, curriculumId, curriculumName, majorCode, totalCreditsRequired, transcriptStatus, courses[], dataRevision, policyVersion }`.
  Mỗi `CurriculumTreeCourseItem` = trường của `CurriculumCourseItem` + `status` (`CourseProgressStatus`) + lần học gần nhất (`letterGrade`, `semesterCode`) + kết quả nguyên văn của `checkCourseEligibility` (`eligible`, `missingPrerequisites`, `warnings`).
- `policyVersion` trên `AcademicStatusResponse`, `CourseEligibilityResponse`, `GraduationAuditResponse`, `CurriculumResponse`; `CurriculumResponse.dataRevision`.
- `getAcademicStatus`, `checkCourseEligibility`, `runGraduationAudit`: `IMPLEMENTED`, response 501 thay bằng 503 `TOOL_NOT_READY`.
- `ENUMS.CourseProgressStatus` trong `@haui/contracts`; fixture mới `curriculum-tree`; fixture `not-implemented` chuyển sang `generateStudyPlan`.

---

## 4. Thiết kế chính

### 4.1. Nguồn dữ liệu của engine
`AcademicEngineSources` đọc `PolicyDemo` và `CurriculumFixture` (model TV4) từ đúng resource mà `PlatformDataSeeder` dùng để seed DB, với cùng cấu hình `ObjectMapper` như `AcademicFixtureLoader` của TV4. Hệ quả:
- CTĐT engine dùng trùng CTĐT trong DB; sinh viên theo CTĐT khác CTĐT đã nạp vào engine → 503 `TOOL_NOT_READY` (không tính trên CTĐT sai).
- `policyVersion` (qua `FixturePolicyVersionSource`) lấy từ chính `PolicyDemo` đã nạp vào engine. Thiếu file hoặc thiếu `policyId`/`version` → ứng dụng không khởi động (trước đây ghi `policy-unknown` rồi chạy tiếp).

### 4.2. Hồ sơ do server nạp, ghim theo yêu cầu
`DbStudentAcademicRecordProvider.load()` đọc hồ sơ trong giao dịch read-only `REPEATABLE READ`. `AcademicApiService` nạp một lần, rồi `withRecord(record, call)` gắn bản đó vào luồng hiện tại trong lúc gọi facade:
- kết quả luôn khớp `dataRevision` trả về (xác nhận bảng điểm chen giữa không làm lệch);
- lỗi đọc DB xảy ra ở platform, không bị `DefaultAcademicFacade` nuốt (`catch (Exception)`) thành kết quả 0 tín chỉ/cảnh báo lỗi;
- cây CTĐT gọi facade 120 lần nhưng chỉ đọc DB một lần.

Ngoài lượt gọi đó (vd. module AI gọi facade trực tiếp ở 4.2c), provider đọc thẳng từ DB như trước.

### 4.3. Trạng thái nút trên cây CTĐT
| Điều kiện | `status` |
|---|---|
| Chưa có bảng điểm đã xác nhận (`transcriptStatus = NONE`) | `UNKNOWN` (không khẳng định đạt hay khóa) |
| Có lần học đạt (theo `GradeCalculator.isPassed` của TV4, cùng quy tắc engine dùng tính CPA) | `PASSED` |
| Lần gần nhất chưa có điểm | `IN_PROGRESS` |
| Lần gần nhất `F`, chưa đạt lần nào | `FAILED` |
| Điểm không đọc được theo quy tắc | `UNKNOWN` |
| Chưa học, facade `eligible = true` / `false` | `ELIGIBLE` / `BLOCKED` |

Platform không tự tính điều kiện tiên quyết; `eligible`/`missingPrerequisites`/`warnings` là kết quả nguyên văn của facade cho từng học phần.

### 4.4. Ràng buộc hợp đồng ở biên
Engine TV4 hiện ghi chữ vào `AuditCertificateAction.deadline` ("Trước kỳ tốt nghiệp") trong khi hợp đồng là ngày `yyyy-MM-dd` hoặc `null`. Platform bỏ giá trị không phải ngày (ghi cảnh báo một lần vào log) thay vì trả JSON sai hợp đồng; nội dung việc cần làm vẫn ở `actionDescription`. Đây là thay đổi duy nhất platform áp lên kết quả facade (ngoài việc thêm `policyVersion`); test so sánh với facade áp đúng quy tắc này.

### 4.5. Cổng công cụ
`AcademicToolGate.WIRED` = `GET_ACADEMIC_STATUS`, `CHECK_COURSE_ELIGIBILITY`, `RUN_GRADUATION_AUDIT`, `VALIDATE_STUDY_PLAN`; `MOCKABLE` = chỉ `VALIDATE_STUDY_PLAN`. TV4 khai báo 8 capability (trừ `VALIDATE_STUDY_PLAN`) nên bootstrap báo `academic: PARTIAL`, status/eligibility/audit `READY`, thẩm định `NOT_READY` (vẫn 503, kế hoạch chưa kích hoạt được — đúng tiêu chí 3.7). Capability TV4 khai báo nhưng platform chưa nối (generate, simulate, retake, target, reconcile) vẫn `NOT_READY`/501.

---

## 5. Việc cần các thành viên khác xử lý

### TV4 — sai lệch phát hiện khi nối thật (đề nghị xử lý ở 4.3c)
Platform không sửa code TV4; các điểm dưới đây ảnh hưởng số liệu sinh viên thấy trên API thật.

| # | Vấn đề | Ảnh hưởng quan sát được |
|---|---|---|
| 1 | `getAcademicStatus`/`runGraduationAudit` cố định `totalCreditsRequired = 135`, CTĐT KTPM (fixture `curriculum-ktpm-v1.json`) là 150. | `/academic/status`, `/audit/graduation` trả 135 trong khi `/academic/curriculum` và cây trả 150; % hoàn thành tính trên 135. |
| 2 | Audit thêm mục cố định "KHỐI ĐẠI CƯƠNG" `completed = true`, 30/30, không tính từ bảng điểm. | Tài khoản chưa có bảng điểm vẫn thấy "Đã hoàn thành 100%" khối đại cương. |
| 3 | Thiếu bảng điểm: status trả `accumulatedCredits = 0`, `riskLevel = NORMAL` thay vì `null` (UNKNOWN) như hợp đồng ("Thiếu dữ liệu → null, không gán 0"); audit coi chứng chỉ `UNKNOWN` là "Chưa hoàn thành". | Sinh viên mới thấy 0 TC và mức NORMAL như dữ kiện. |
| 4 | `pendingActions[].deadline` là chữ ("Trước kỳ tốt nghiệp"), `status` là "Chưa nộp" (hợp đồng: ngày `yyyy-MM-dd`; `PENDING` \| `DONE`). | Platform bỏ `deadline` (§4.4); `status` trả nguyên văn nên FE không tô màu `PENDING`. |
| 5 | `calculateAccumulatedCreditsFromAttempts` dùng `intValue()`: học phần 1.5 TC thành 1. | `2024604757`: 59 TC thay vì 59.5. (Trường `accumulatedCredits` của hợp đồng hiện là integer — TV5 sẽ đổi sang number ở 2.0.0 cùng các trường `credits` legacy.) |
| 6 | `generateStudyPlan`, `simulateGrades`, `rankRetakeCourses`, `calculateTargetGrades`, `reconcileStudyPlan`, `validateStudyPlan` vẫn đọc hồ sơ mẫu (`profiles`, `AcademicFixtures.getStudentProfilesV1()`), không qua `StudentAcademicRecordProvider`, dù `readyCapabilities()` khai báo sẵn sàng. | Với wiring 4.1 (không hồ sơ mẫu) các hàm này không có dữ liệu sinh viên thật; phải sửa trước 4.2b/4.3b. Platform chưa nối nên vẫn 501/NOT_READY. |
| 7 | `checkCourseEligibility` ưu tiên hồ sơ mẫu trùng mã hơn bảng điểm DB; facade `catch (Exception)` nuốt lỗi provider. | Platform đã chặn (không hồ sơ mẫu + hồ sơ ghim), nhưng facade dựng ở nơi khác vẫn có rủi ro. |

### TV2 (4.2a)
- Thay mock `GET /academic/status`, `/academic/curriculum`, `/audit/graduation` bằng client thật; trạng thái cây môn học lấy từ `GET /academic/curriculum/tree` (không tự tính PASSED/BLOCKED trong JS như `mockAcademicService.getCurriculum`).
- Hiển thị `policyVersion` (quy chế demo) cạnh kết quả; xử lý `503 TOOL_NOT_READY` (thông báo chưa có kết quả, không hiện số giả); `deadline` có thể `null`.

### TV1 (4.2c)
- Bean `AcademicFacade` trong platform là facade thật trên DB; gọi với `studentId` từ `StudentContextProvider`. Lưu ý mục 6 của TV4 trước khi dùng generate/simulate.
- `AiAutoConfiguration` đăng ký `MockAcademicFacade` khi `ai.mode=mock` và thiếu bean `AcademicFacade`; trong platform bean thật luôn có nên điều kiện này không kích hoạt, nhưng không nên dựa vào nhánh đó khi nối ở 4.3b.

---

## 6. Cấu hình

Không thêm biến môi trường. Quy chế và CTĐT của engine theo `haui.seed.policy-resource` và `haui.seed.curriculum-resource` (mặc định là fixture TV4 trên classpath, cùng file seed DB).

---

## 7. Kết quả kiểm thử

| Kiểm tra | Kết quả |
|---|---|
| `./mvnw verify` | **656 test pass** (contracts 184, TV1 235, TV4 160, platform app 77). Trước task: platform 64 test, 1 lỗi (`ToolNotReadyTest` giả định TV4 chưa khai báo capability nào, sai từ khi merge 3.11). |
| Test trên PostgreSQL 16 thật (cluster tạm, cổng riêng) | 46 test của 11 lớp (API học vụ, hợp đồng HTTP, nhập bảng điểm, dữ liệu sinh viên, kế hoạch, bảo mật, migration) pass; Flyway V1–V4 thành công. |
| HTTP thật trên jar + PostgreSQL (profile `default`, tài khoản demo) | Chưa đăng nhập → 401. Hai tài khoản: status/curriculum/tree/audit/eligibility 200 với `dataRevision` của từng người và `policyVersion = policy-haui-demo-2026@0.0.1-v0`; cây 120 học phần (`2024604757`: 22 PASSED, 1 FAILED, 64 ELIGIBLE, 33 BLOCKED); `studentId` lạ trong body bị bỏ qua; revision cũ → 409; `deadline` audit `null`; bootstrap `1.3.0`, `academic: PARTIAL`. |
| `npm run check:contracts` | PASS: 1.3.0, 55 fixture, 39 operation, lock khớp. |
| `npm test` / `npm run lint` | 82/82 pass / PASS. |
| `check:architecture`, `check:ownership`, `check:secrets` | PASS (ownership: chỉ TV5). |
| `check:contract-consumers` | 13 phát hiện, đều là tên trường cũ có sẵn trong test TV3; không phát hiện mới từ 1.3.0. |

---

## 8. Giới hạn còn lại

- Số liệu API phản ánh đúng engine TV4 hiện tại, gồm các sai lệch ở §5 (135 TC, khối đại cương cố định, 0 thay vì UNKNOWN). Platform chỉ chặn phần vi phạm định dạng hợp đồng (`deadline`).
- Quy chế là bản demo `DEMO_UNVERIFIED`; mọi kết quả đã gắn `policyVersion` để FE ghi rõ.
- Cây CTĐT gọi facade cho từng học phần (120 lần mỗi yêu cầu, một lần đọc DB); chưa đo tải.
- Thẩm định kế hoạch vẫn 503 ở runtime vì TV4 chưa khai báo `VALIDATE_STUDY_PLAN` thật (phần của 4.2b).
- Chưa build lại image Docker (máy không có Docker CLI); PostgreSQL thật chạy bằng cluster tạm, không có pgvector.
