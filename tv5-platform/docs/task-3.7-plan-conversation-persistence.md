# TASK 3.7 — LƯU KẾ HOẠCH, HỘI THOẠI VÀ THEO DÕI (`persistence-ready`)

> **Người thực hiện:** TV5 — Backend/DB/DevOps
> **Phạm vi:** `tv5-platform/` (contracts 1.2.0, app, infra, docs) và root files (`scripts/`, `.env.example`, `README.md`)
> **Chờ:** 3.2
> **Tiêu chí nghiệm thu:** Lưu/mở lại/hủy/sửa đồng thời/import lặp; không chéo tài khoản; không ACTIVE khi validation chưa có thật.

---

## 1. Tóm tắt

| Hạng mục | Kết quả |
|---|---|
| Kế hoạch (CRUD) | `StudyPlanService` chuyển từ bộ nhớ sang PostgreSQL: `study_plans` + `plan_semesters` + `planned_courses` + `plan_actions`. Thêm `DELETE /planner/plans/{planId}?planVersion=` để hủy bản nháp. |
| Bản nháp kế thừa, trạng thái | Giữ DRAFT → VALIDATED → ACTIVE → ARCHIVED. Sửa ACTIVE tạo DRAFT kế thừa (`sourcePlanId`); khôi phục tạo DRAFT mới. Bản ACTIVE/ARCHIVED không sửa trực tiếp và không hủy được. |
| Optimistic version | `planVersion` bắt buộc khi sửa/thẩm định/kích hoạt/hủy; khác bản lưu → `409 PLAN_VERSION_CONFLICT`. Mọi thao tác ghi khóa hồ sơ sinh viên (`SELECT … FOR UPDATE`) nên yêu cầu đồng thời được xếp hàng. |
| Kích hoạt | Một giao dịch: kiểm tra `planVersion`, `dataRevision`, công cụ thật; thẩm định lại trên hồ sơ và quy chế hiện hành; lưu trữ ACTIVE cũ; ghi ACTIVE mới kèm revision hồ sơ/quy chế/kế hoạch đã dùng. DB có ràng buộc một ACTIVE mỗi sinh viên. |
| Theo dõi | Chi tiết kế hoạch VALIDATED/ACTIVE cảnh báo khi dữ liệu học vụ hoặc quy chế đã đổi sau lần thẩm định/kích hoạt. |
| Công cụ chưa thật | `AcademicFacade.readyCapabilities()`: TV4 chưa khai báo `VALIDATE_STUDY_PLAN` thì validate/activate trả `503 TOOL_NOT_READY`. Thẩm định thử (`validationMode=MOCK`) chỉ bật được ở profile dev/test và không bao giờ dẫn tới VALIDATED/ACTIVE. |
| Hội thoại | `JdbcConversationStore` implement `ConversationStore` (lưu, đọc, liệt kê theo sinh viên); `GET /advisor/conversations`, `GET /advisor/conversations/{id}`. |
| StudentContextProvider | `DbStudentContextProvider` (từ 3.2) giữ nguyên: danh tính chỉ từ principal. Revision dùng để so sánh được đọc lại sau khi khóa trong giao dịch. |
| Import session, plan actions | Phiên nhập bảng điểm đã lưu DB từ 3.2; 3.7 kiểm thử nhập lặp. Action của kế hoạch lưu ở `plan_actions`. |
| Contracts | Phát hành **1.2.0**: 3 operation, 6 DTO/enum, 4 trường, 2 mã lỗi, 5 file mẫu. |
| DB | Migration `V4__plan_persistence_and_conversations.sql`. |

---

## 2. Tiêu chí nghiệm thu và bằng chứng

| Tiêu chí | Cơ chế | Kiểm chứng |
|---|---|---|
| **Lưu / mở lại** | Nội dung kế hoạch lưu thành dòng (học kỳ, học phần, action), không còn trong bộ nhớ. Tổng tín chỉ do server tính. Môn có trong danh mục được liên kết `course_id`; môn ngoài danh mục vẫn giữ mã/tên/tín chỉ sinh viên đã lập. | `PlanPersistenceTest.saveReopenAndEdit`: mở lại đủ học kỳ, học phần, lý do, action và payload; đếm dòng trong DB; sửa thay toàn bộ nội dung, không để dòng mồ côi. Chạy thật trên PostgreSQL qua HTTP: mở lại đủ 5 học phần, 1 action. |
| **Hủy** | Chỉ bản nháp (DRAFT/VALIDATED) hủy được, cần đúng `planVersion`. Mã kế hoạch tăng dần theo sinh viên (`plan_sequence`), không cấp lại mã đã hủy. | `PlanPersistenceTest.deleteDraftsOnly`: thiếu version → 400; version cũ → 409; hủy → 204 rồi 404, học kỳ bị xóa theo; ACTIVE → `409 PLAN_NOT_EDITABLE`. Trên PostgreSQL: sau khi hủy `…-0001`, kế hoạch mới là `…-0002`. |
| **Sửa đồng thời** | Khóa hồ sơ sinh viên trong giao dịch, kiểm tra `planVersion` sau khi khóa. | `PlanPersistenceTest.concurrentEditsOnlyOneWins`: 6 yêu cầu cùng `planVersion=1` chạy song song → đúng một 200, năm `409 PLAN_VERSION_CONFLICT`, bản lưu ở version 2. `concurrentActivationsKeepOneActive`: kích hoạt song song hai kế hoạch → cuối cùng một ACTIVE, một ARCHIVED. Qua HTTP thật trên PostgreSQL: 4 lần sửa song song → `[200, 409, 409, 409]`. |
| **Import lặp** | Xác nhận bảng điểm tăng `dataRevision`. Kích hoạt bằng revision cũ → 409. Kích hoạt bằng revision mới → thẩm định lại trên dữ liệu mới. Mỗi lần xác nhận thay toàn bộ bảng điểm. Xác nhận lại cùng phiên → 409. | `PlanPersistenceTest.repeatedImportForcesRecheck`: ba lần nhập; bảng điểm không nhân đôi; cảnh báo "Dữ liệu học vụ đã thay đổi sau khi kiểm tra điều kiện"; kích hoạt bằng revision cũ → `409 DATA_REVISION_STALE`; kích hoạt bằng revision mới thành công, thông báo đã kiểm tra lại; nhập lần nữa → kế hoạch ACTIVE có cảnh báo theo dõi. |
| **Revision quy chế** | Mỗi lần thẩm định thật ghi `policyVersion`. Kích hoạt luôn thẩm định lại theo quy chế hiện hành. | `PlanPersistenceTest.policyChangeRequiresRecheck`: đổi quy chế → chi tiết cảnh báo; quy chế mới phát hiện vi phạm → `422 PLAN_VALIDATION_FAILED`, kế hoạch về DRAFT, không có ACTIVE; thẩm định lại theo quy chế mới rồi kích hoạt được, DB ghi đúng phiên bản quy chế. |
| **Không chéo tài khoản** | Mọi truy vấn kế hoạch và hội thoại kèm `student_id` của context; tài nguyên của người khác trả 404. `ConversationStore` từ chối ghi đè hội thoại của sinh viên khác. | `PlanPersistenceTest.otherAccountsCannotTouchPlansOrConversations`: B đọc, hủy, thẩm định, kích hoạt, khôi phục, sửa kế hoạch của A đều 404; kế hoạch A không đổi; B không đọc hay chiếm được hội thoại của A. `ConversationStoreTest.isolationAndLimits`. Trên PostgreSQL qua HTTP: tài khoản B đăng ký mới không đọc hay hủy được kế hoạch của A. |
| **Không ACTIVE khi validation chưa thật** | Engine TV4 hiện chưa khai báo công cụ thật (`readyCapabilities()` rỗng). Validate → `503 TOOL_NOT_READY`; activate → 503 trước cả bước kiểm tra trạng thái. MOCK chỉ ở dev/test, kết quả gắn nhãn và không đổi trạng thái. Bật MOCK ngoài dev/test làm ứng dụng không khởi động. | `ToolNotReadyTest`: lưu được, validate/activate 503, kế hoạch vẫn DRAFT, DB không có VALIDATED/ACTIVE, bootstrap báo NOT_READY. `MockValidationTest`: `validationMode=MOCK`, trạng thái DRAFT, activate 503. `AcademicToolGateTest`: mock ngoài dev/test → lỗi khởi động. Chạy jar thật với `ACADEMIC_MOCK_TOOLS=true` không có profile → thoát với thông báo lỗi. |

---

## 3. Contracts 1.2.0

Chi tiết trong [`contracts/CHANGELOG.md`](../contracts/CHANGELOG.md). Không đổi tên hay xóa trường của 1.1.0; báo cáo phía sử dụng vẫn 162 phát hiện như trước (không phát sinh mới).

- `DELETE /planner/plans/{planId}?planVersion=` → 204; `GET /advisor/conversations` → `ConversationListResponse`; `GET /advisor/conversations/{conversationId}` → `ConversationRecord`.
- `ValidateStudyPlanResponse.validationMode` (`REAL` | `MOCK`), `.policyVersion`; `StudyPlanDetailResponse.validatedAt`; `BootstrapInfoResponse.academicTools` (mỗi capability: `READY` | `MOCK` | `NOT_READY`).
- `AcademicFacade.readyCapabilities()` là method `default` (trả rỗng), không làm vỡ implementation hiện có. `ConversationStore.listConversations()` là method mới; chỉ TV5 implement port này.
- Mã lỗi `TOOL_NOT_READY` (503) và `CONVERSATION_NOT_FOUND` (404).

---

## 4. Thiết kế chính

### 4.1. Giao dịch và đồng thời
Mọi thao tác ghi kế hoạch (lưu, thẩm định bản đã lưu, kích hoạt, khôi phục, hủy) chạy trong `TransactionTemplate` và bắt đầu bằng `SELECT data_revision, plan_sequence FROM student_records … FOR UPDATE`. Nhờ đó:
- các yêu cầu đồng thời của cùng sinh viên chạy lần lượt, `planVersion` được so sau khi khóa;
- `dataRevision` so với giá trị đọc trong giao dịch, nên xác nhận bảng điểm không thể chen giữa lúc thẩm định lại và lúc ghi ACTIVE (xác nhận cũng cập nhật dòng `student_records` nên phải chờ khóa);
- sinh viên khác không bị ảnh hưởng.

Kích hoạt thẩm định lại thất bại thì ghi kế hoạch về DRAFT, commit, rồi mới trả 422 (không bị rollback mất).

### 4.2. Schema V4
- `study_plans`: `source_plan_id`, `projected_cpa`, `warnings_json`, `activated_at`, `validated_at`, `validated_plan_version`, `validated_data_revision`, `validated_policy_version`; `plan_payload` không còn bắt buộc.
- Một ACTIVE mỗi sinh viên: cột `active_student_id` (= `student_id` khi ACTIVE, NULL khi khác) + `UNIQUE`, kèm `CHECK` bảo đảm cột này luôn khớp trạng thái. Dùng cột thay cho partial unique index để chạy cả trên H2. `CHECK` có `IS NOT NULL` vì so sánh với NULL cho UNKNOWN mà CHECK coi UNKNOWN là đạt; test đã bắt đúng lỗi này trước khi sửa.
- `student_records.plan_sequence`: số thứ tự kế hoạch theo sinh viên.
- `planned_courses`: `course_code`, `course_name`, `credits NUMERIC(4,1)`, `rationale`, `sort_order`; `course_id` không còn bắt buộc.
- `plan_actions`: `label`, `target_route`, `payload_json`, `sort_order`; `description` không còn bắt buộc.
- `conversations.messages_json`: tin nhắn lưu nguyên JSON theo `ConversationRecord.messagesJson` do TV1 định nghĩa. Bảng `conversation_messages` (V1) chưa dùng.

### 4.3. Công cụ thật, NOT_READY và MOCK
`AcademicToolGate` quyết định theo thứ tự:
1. Capability chưa được platform nối vào endpoint → `NOT_READY` (endpoint vẫn trả 501 như trước).
2. TV4 khai báo trong `readyCapabilities()` → `READY`, kết quả `REAL`.
3. `haui.academic.mock-tools.enabled=true` (chỉ được ở profile `dev`/`test`) → `MOCK`: chạy engine hiện tại, gắn nhãn, không đổi trạng thái kế hoạch.
4. Còn lại → `503 TOOL_NOT_READY`.

Kích hoạt luôn yêu cầu `REAL`. Phiên bản quy chế lấy từ `policy-demo.json` của TV4 (`policyId@version`).

### 4.4. Giới hạn đầu vào
Mỗi sinh viên tối đa 50 kế hoạch, 20 học kỳ/kế hoạch, 30 học phần/học kỳ, 50 action; tên, mã, độ dài văn bản và khoảng giá trị (CPA 0–4, tín chỉ 0–30) được kiểm tra trước khi ghi DB, trả 400 thay vì lỗi DB. Hội thoại tối đa 1 MB tin nhắn.

---

## 5. Việc cần các thành viên khác xử lý

| Owner | Việc |
|---|---|
| **TV4** | Khi `validateStudyPlan` là công cụ thật (không còn dựa trên hồ sơ fixture), override `readyCapabilities()` trả `VALIDATE_STUDY_PLAN`. Chưa khai báo thì không kế hoạch nào kích hoạt được. Nên cân nhắc đưa phiên bản quy chế vào facade thay cho việc platform đọc `policy-demo.json`. |
| **TV1** | Lưu/đọc hội thoại qua `ConversationStore` với `studentId` lấy từ `StudentContextProvider`; `messagesJson` do TV1 định nghĩa. |
| **TV3** | Xử lý `503 TOOL_NOT_READY` (tắt nút kích hoạt, hiện lý do), dùng `academicTools` trên bootstrap; nút hủy bản nháp (`DELETE` kèm `planVersion`); hiển thị nhãn khi `validationMode=MOCK`; hiển thị cảnh báo theo dõi trong `warnings`. |
| **TV2** | Màn lịch sử chat có thể dùng `GET /advisor/conversations`. |

---

## 6. Cấu hình

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `ACADEMIC_MOCK_TOOLS` | `false` | Bật thẩm định thử; chỉ nhận khi `SPRING_PROFILES_ACTIVE` là `dev` hoặc `test`, nếu không ứng dụng dừng khi khởi động. |
| `SPRING_PROFILES_ACTIVE` | `default` | Đã truyền qua `compose.yaml` cho backend. |
| `haui.planner.*` | 50 / 20 / 30 / 50 | Giới hạn kế hoạch, học kỳ, học phần, action. |
| `haui.conversation.max-messages-bytes` | `1048576` | Giới hạn kích thước tin nhắn của một hội thoại. |

---

## 7. Kết quả kiểm thử

| Kiểm tra | Kết quả |
|---|---|
| `./mvnw verify` | **324 test pass** (contracts 182, TV1 33, TV4 45, platform app 64). |
| Test trên PostgreSQL 16 thật | 42 test (kế hoạch, đồng thời, hội thoại, nhập bảng điểm, bảo mật) pass trên cluster tạm; Flyway V1–V4 thành công; mỗi sinh viên tối đa một ACTIVE; ràng buộc unique/check có trong DB. |
| HTTP thật trên PostgreSQL (jar) | 17/17: đăng nhập, bootstrap, lưu/mở lại, 503 khi validate/activate, sửa đồng thời `[200,409,409,409]`, tài khoản khác 404, hủy 409/204/404, hội thoại 200/404, chưa đăng nhập 401. Bật MOCK không có profile → ứng dụng không khởi động. |
| `npm run smoke` | 9/10 PASS, bước Docker bị bỏ qua (máy không có Docker CLI). |
| `npm run check:contracts` | PASS: 1.2.0, 54 ví dụ, 38 operation, lock khớp. |
| Ownership / secrets | PASS (chỉ TV5) / PASS. |
| `check:contract-consumers` | 162 phát hiện, không tăng so với trước 3.7. |

---

## 8. Giới hạn còn lại

- Hiện chưa kích hoạt được kế hoạch nào ở runtime thật vì TV4 chưa khai báo công cụ thẩm định thật. Đây là hành vi đúng theo tiêu chí, nhưng luồng kích hoạt mới chỉ chạy được trong test (facade giả lập công cụ thật).
- Phiên bản quy chế đọc từ fixture `policy-demo.json` (trạng thái `DEMO_UNVERIFIED` của TV4).
- Chưa có chuyển sang `COMPLETED`; đối chiếu kế hoạch với kết quả thực tế thuộc task sau (`reconcileStudyPlan` vẫn 501).
- Cảnh báo theo dõi được tính khi đọc kế hoạch, chưa có thông báo chủ động.
- Đồng thời mới kiểm bằng test song song và HTTP thật, chưa chạy kiểm thử tải.
- Phiên đăng nhập vẫn lưu trong bộ nhớ ứng dụng (giới hạn từ 3.2); chưa build lại image Docker.
