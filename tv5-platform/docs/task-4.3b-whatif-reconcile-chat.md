# TASK 4.3b — NỐI API WHAT-IF, ĐỐI SOÁT VÀ CHAT (`all-api-live`)

> **Người thực hiện:** TV5 — Backend/DB/DevOps
> **Phạm vi:** `tv5-platform/` (contracts 1.5.0, app, infra, docs), `README.md`, `.env.example`
> **Chờ:** 4.2b (`planner-api-live`), 4.2c (TV1 `advisor-integrated`), 3.11 (TV4 `simulation-tools-ready`)
> **Tiêu chí nghiệm thu:** Contract + integration tests; live AI unavailable trả lỗi có thể thử lại, không fake answer.

---

## 1. Tóm tắt

| Hạng mục | Kết quả |
|---|---|
| What-if / ROI / mục tiêu ngược | `POST /simulation/grades`, `/simulation/retake-ranking`, `/simulation/target-grades` nối `simulateGrades`, `rankRetakeCourses`, `calculateTargetGrades` của TV4 trên hồ sơ server nạp từ DB (trước đây 501). Chỉ xem thử: không ghi bảng điểm, kế hoạch hay dataRevision. Kết quả kèm `dataRevision`, `policyVersion`. |
| Đối soát | `POST /planner/reconcile` chạy bộ đối chiếu TV4 trên **kế hoạch ACTIVE đã lưu** của chính sinh viên và bảng điểm đã xác nhận. Chỉ đọc. Kế hoạch không phải ACTIVE → 409 `PLAN_NOT_ACTIVE`; `planVersion` lệch → 409. |
| Hồ sơ DB cho mọi công cụ TV4 | `RecordBackedAcademicFacade` (từ 4.2b) cấp hồ sơ DB cho cả simulate/rank/target/reconcile; bộ đối chiếu nhận kế hoạch từ DB, không dùng kế hoạch mẫu có sẵn trong engine. Áp dụng cho cả lời gọi công cụ từ module AI. |
| Cập nhật hồ sơ → kế hoạch cần kiểm tra lại | Mọi thay đổi dữ liệu học vụ (xác nhận bảng điểm, khai báo chứng chỉ, đổi CTĐT) tăng `dataRevision` và thẩm định lại kế hoạch VALIDATED/ACTIVE sau khi commit (cơ chế 4.2b); chưa có công cụ thật thì VALIDATED về DRAFT, ACTIVE kèm cảnh báo "chưa được kiểm tra lại". Sửa thông tin cá nhân không đổi `dataRevision`. Có test riêng ở 4.3b. |
| Chat | `POST /advisor/chat` nối `AdvisorFacade` của TV1 (`DefaultAdvisorFacade`) với AcademicFacade thật, ngữ cảnh tin cậy từ phiên đăng nhập và hội thoại trên DB. Lượt chỉ được lưu khi có câu trả lời thật. |
| Hạn / lỗi / readiness AI | Hạn mỗi lượt `AI_CHAT_TIMEOUT` (45s); giới hạn 8 lượt đồng thời + 16 chờ. Chưa cấu hình, quá hạn, quá tải, nhà cung cấp mô hình lỗi → **503 `AI_UNAVAILABLE`**, `retryable: true`, header `Retry-After`, không có câu trả lời thay thế, không lưu gì. Readiness: `GET /actuator/health/advisor` (NOT_CONFIGURED → 503), `modules.advisor` trên bootstrap, `advisor` trên `/system/health`. |
| Thiếu AI key | Ứng dụng vẫn khởi động; `/actuator/health` vẫn UP; hồ sơ, kế hoạch, What-if, đối chiếu chạy bình thường; chỉ Chat trả 503. |
| Không mock trong runtime | Runtime luôn `ai.mode=live`. `ai.mode=mock` (MockAdvisorModel) chỉ khởi động được với profile dev/test. Platform dựng bean AI tường minh, không nạp `AiAutoConfiguration` (nên không bao giờ có `MockAcademicFacade`). |
| Contracts | Phát hành **1.5.0**: 3 mã lỗi, `retryable`, 4 trường `policyVersion`, 5 operation IMPLEMENTED. Không còn operation nào trả 501. |
| Hạ tầng | `compose.yaml` truyền `AI_MODE`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_CHAT_TIMEOUT`; image backend kèm `data-source/documents` cho RAG (`RAG_DOCUMENTS_ROOT=/app`). |

---

## 2. Tiêu chí nghiệm thu và bằng chứng

| Tiêu chí | Cơ chế | Kiểm chứng |
|---|---|---|
| **Contract tests** | Mọi response kiểm theo OpenAPI 1.5.0 (validator từ chối trường lạ); fixture mới. | `HttpContractConformanceTest.whatIfReconcileAndChatMatchSchema`: request fixture của simulate/rank/target/reconcile → 200 đúng schema, kèm `policyVersion`; reconcile version lệch → 409; Chat không khóa → 503 đúng mẫu `chat-ai-unavailable` (retryable, Retry-After). `ConsumerContractCompatibilityTest` (output TV4 đúng schema mới). `npm run check:contracts`, JS test 1.5.0 (không fixture nào 501). |
| **Integration: What-if/ROI/mục tiêu ngược** | Hồ sơ DB, chỉ đọc. | `SimulationApiTest`: kết quả API bằng đúng kết quả engine TV4 trên hồ sơ dựng độc lập từ API (chỉ khác `policyVersion`); ROI chỉ gợi ý môn D+/C (không F, không A/B); `studentId` lạ bị bỏ qua; sau 3 lời gọi `dataRevision`, bảng điểm, số kế hoạch không đổi. `std-near-grad-ktpm` nhận CPA DB (không phải 3.35 của hồ sơ mẫu); sinh viên chưa có bảng điểm nhận `currentCpa`/`cpaDelta` = null. Đầu vào sai 400, revision cũ 409, công cụ chưa thật 503, chưa đăng nhập 401, thiếu CSRF 403. |
| **Integration: đối soát** | Kế hoạch ACTIVE trên DB × bảng điểm DB. | `ReconcileApiTest`: học kỳ 2025_1 có môn đạt, môn F, môn không học → `completedCourses`/`missedOrFailedCourses`/`adjustmentsRecommended` đúng và **bằng** bộ đối chiếu TV4 chạy trực tiếp trên hồ sơ + kế hoạch đó; kế hoạch không đổi sau đối chiếu. DRAFT → 409 `PLAN_NOT_ACTIVE`; version cũ 409; revision cũ 409; thiếu/sai `completedSemester` 400; tài khoản khác 404; mã kế hoạch mẫu của engine (`plan-2024604757-0002`) không thuộc sinh viên → 404; công cụ chưa thật 503. |
| **Integration: Chat** | AdvisorFacade thật + công cụ học vụ thật + DB; mô hình giả lập có kiểm soát (LiveAdvisorModel với provider do test điều khiển). | `AdvisorChatApiTest.answersWithRealToolsAndPersistsTurns`: prompt gửi mô hình chứa kết quả `getAcademicStatus` thật của đúng người hỏi (`studentId`, CPA trên DB); lượt được lưu, hỏi tiếp nối vào cùng hội thoại (4 tin nhắn). `conversationsAreIsolated`: mã hội thoại của người khác → 404, không gọi mô hình; lịch sử không lẫn. `concurrentWritesNeverLoseMessages`: lượt khác ghi xen trong lúc mô hình trả lời không bị mất; ghi xen sau lần đọc cuối → lượt không ghi đè (409); module AI không ghi được ngoài lượt do platform điều phối. `validationAndAuthentication`: 400/401/403. |
| **Live AI unavailable → lỗi thử lại được, không fake answer** | Lỗi nhà cung cấp, quá hạn, chưa cấu hình, quá tải → 503 `AI_UNAVAILABLE`, `retryable`, `Retry-After`; lượt bị bỏ, không lưu. | `providerErrorIsRetryableAndNothingIsSaved`: mô hình ném lỗi → 503 `reason: PROVIDER_ERROR`, body không có `answer`, hội thoại không được tạo, bootstrap `DEGRADED`; gửi lại → 200, lưu đúng 1 lượt, `READY`. `timeoutIsRetryableAndLateAnswerIsDropped`: mô hình trả lời sau 7s (hạn 5s) → 503 `TIMEOUT`; câu trả lời đến muộn không được lưu. `missingKeyDoesNotBlockOtherFeatures`: chưa có khóa → 503 `NOT_CONFIGURED`, không gọi mô hình; `/actuator/health` 200, `/actuator/health/advisor` 503; hồ sơ, trạng thái học vụ, danh sách kế hoạch, What-if vẫn 200. `AdvisorReadinessTest`: mock ngoài dev/test → không khởi động. HTTP thật (jar, không khóa): Chat 503 `NOT_CONFIGURED` + Retry-After. |
| **Cập nhật hồ sơ → kế hoạch cần kiểm tra lại** | Sự kiện tăng `dataRevision` (4.2b). | `PlannerApiLiveTest.profileUpdateMarksPlansForRecheck`: đổi tên → revision giữ nguyên; khai báo chứng chỉ → kế hoạch VALIDATED/ACTIVE được kiểm tra lại trên revision mới; khi công cụ thẩm định chưa thật → VALIDATED về DRAFT, ACTIVE kèm cảnh báo "chưa được kiểm tra lại". |

---

## 3. Contracts 1.5.0

Chi tiết trong [`contracts/CHANGELOG.md`](../contracts/CHANGELOG.md). Không đổi tên hay xóa trường của 1.4.0.

- Mã lỗi `AI_UNAVAILABLE` (503), `CONVERSATION_BUSY` (409), `PLAN_NOT_ACTIVE` (409); `ApiErrorResponse.retryable` (chỉ có khi `true`) + header `Retry-After` trong response chung 503.
- `policyVersion` trên kết quả simulate/rank/target/reconcile; các trường CPA của simulate/target khai báo `nullable` (engine trả null khi thiếu dữ liệu, không gán 0).
- `simulateGrades`, `rankRetakeCourses`, `calculateTargetGrades`, `reconcileStudyPlan`, `chatAdvisor`: `IMPLEMENTED`; Chat thêm 404/409/503.
- Bỏ fixture `not-implemented` (không còn 501); thêm `chat-ai-unavailable`. `modules.advisor` và `/system/health.advisor`: `READY | DEGRADED | NOT_CONFIGURED | MOCK`.

---

## 4. Thiết kế chính

### 4.1. Công cụ TV4 trên hồ sơ DB
`simulateGrades`, `rankRetakeCourses`, `calculateTargetGrades` của TV4 (`GradeSimulator`) và `reconcileStudyPlan` (`PlanReconciler`) tra hồ sơ trong Map truyền vào rồi rơi về hồ sơ mẫu V0/V1 theo mã sinh viên. `RecordBackedAcademicFacade` chạy chúng với đúng một hồ sơ dựng từ DB (như generate/validate ở 4.2b). `PlanReconciler` chỉ biết kế hoạch được đăng ký (kèm hai kế hoạch mẫu, một trong số đó có mã `plan-2024604757-0002` trùng định dạng mã kế hoạch thật): platform đăng ký kế hoạch đã lưu của sinh viên qua `StoredPlanSource`; kế hoạch không thuộc sinh viên thì dừng.

### 4.2. Chat
| Bước | Xử lý |
|---|---|
| Đầu vào | `conversationId` bắt buộc (client sinh UUID; 1–100 ký tự `[A-Za-z0-9._:-]`), `message` 1–4000 ký tự; danh tính từ phiên. Mã hội thoại thuộc sinh viên khác → 404 trước khi gọi mô hình. |
| Sẵn sàng | `NOT_CONFIGURED` → 503 ngay, không gọi mô hình. |
| Gọi module AI | Trên luồng riêng (8 + hàng chờ 16; đầy → 503 `BUSY`), hạn `haui.advisor.chat-timeout`. |
| Lỗi | Quá hạn → 503 `TIMEOUT`; exception → 503 `ERROR`; cảnh báo `MODEL_PROVIDER_ERROR` (module AI dùng để báo mô hình lỗi/chưa cấu hình, kèm câu trả lời báo lỗi) → 503 `PROVIDER_ERROR` — câu trả lời báo lỗi đó **không** được trả về; `SECURITY_ERROR` → 404; `VALIDATION_ERROR` → 400. Mỗi lỗi đặt trạng thái `DEGRADED` trong 2 phút. |
| Lưu | Module AI đọc/ghi hội thoại qua `ConversationTurns.advisorStore()`: đọc thẳng DB, còn lần ghi được giữ trong lượt; platform chỉ ghi khi lượt có câu trả lời thật, và chỉ khi hội thoại vẫn như lần module AI đọc để nối thêm (khóa dòng, so `updated_at`). Ghi xen sau lần đọc đó → 409 `CONVERSATION_BUSY` (retryable), không tin nhắn nào bị mất. Lượt bị bỏ (lỗi, quá hạn) không ghi gì, kể cả khi module AI ghi muộn. Module AI không ghi được ngoài lượt do platform điều phối. |

Composition root `AdvisorConfig` dựng: `RagAdvisorService` (vector store trong bộ nhớ, lập chỉ mục ở lần hỏi đầu, không lúc khởi động), `LiveAdvisorModel` (khóa từ biến môi trường `GEMINI_API_KEY`, tắt đọc file `.env`), `DefaultToolAdapter` trên AcademicFacade thật, `ConversationHistoryManager` bắt buộc store bền vững, `DefaultAdvisorFacade` với `ai.advisor.tool-timeout-ms`.

### 4.3. Readiness
`AdvisorReadiness`: `MOCK` (chỉ dev/test), `NOT_CONFIGURED` (live, thiếu `ai.model.api-key` = `GEMINI_API_KEY`), `DEGRADED` (vừa có lượt lỗi trong `haui.advisor.degraded-window`), `READY`. Health indicator `advisor` dùng mã riêng cho các trạng thái khác UP; mã riêng không nằm trong thứ tự mặc định nên `/actuator/health` không bị kéo xuống. Nhóm `advisor` khai báo thứ tự và `NOT_CONFIGURED → 503`.

---

## 5. Việc cần các thành viên khác xử lý

### TV1 — module AI (phát hiện khi nối thật)
| # | Vấn đề | Ảnh hưởng / platform đã làm |
|---|---|---|
| 1 | `LiveAdvisorModel` báo lỗi mô hình bằng một câu trả lời "an toàn" + cảnh báo `MODEL_PROVIDER_ERROR` thay vì ném lỗi; `DefaultAdvisorFacade` vẫn lưu lượt đó. | Platform nhận diện theo tiền tố cảnh báo, trả 503 và bỏ lần ghi. Nên có kết quả/ngoại lệ có kiểu để không phụ thuộc chuỗi. |
| 2 | Khóa API đọc từ `System.getenv("GEMINI_API_KEY")`/system property/file `.env`, không từ `AiProperties.model.apiKey`; tên model cũng đọc từ biến môi trường. | Platform tắt đọc `.env`; readiness dựa trên `ai.model.api-key=${GEMINI_API_KEY:}` nên hai bên cùng nguồn. Nên nhận khóa/model qua constructor. |
| 3 | `buildPrompt` không đưa lịch sử hội thoại vào prompt dù đã nạp. | Hỏi tiếp không có ngữ cảnh lượt trước ở phía mô hình (lịch sử vẫn lưu đúng). |
| 4 | Giá trị cố định trong `DefaultAdvisorFacade`: đối chiếu dùng `"PLAN-CURRENT"`, `"2024_1"`; sinh kế hoạch mặc định `"2025_2"`; phát hiện thiếu bảng điểm bằng `REV-0`/`REV-EMPTY`. | Đối chiếu qua chat luôn lỗi (không có kế hoạch mã đó → cảnh báo công cụ lỗi, không bịa kết quả); `TRANSCRIPT_REQUIRED` không bao giờ kích hoạt với revision thật `REV-<mã>-NNN`. |
| 5 | RAG mặc định nhúng cục bộ tất định (`DeterministicFakeEmbeddingProvider`) và vector store trong bộ nhớ; `LiveEmbeddingProvider` gọi API từng đoạn tuần tự. | Platform giữ mặc định của module AI (`AI_RAG_EMBEDDING_PROVIDER=FAKE`), chỉ ảnh hưởng xếp hạng đoạn quy chế, không tạo câu trả lời. PGVECTOR chưa nối: cần migration `rag_chunks` (sẽ là **V6**) trên PostgreSQL có pgvector, số chiều khớp model nhúng, và warm-up chỉ mục. |
| 6 | `DefaultAdvisorFacade` tạo `newCachedThreadPool` không giới hạn cho công cụ. | Platform giới hạn số lượt chat đồng thời ở tầng trên. |

### TV4
- `GradeSimulator`, `PlanReconciler` rơi về hồ sơ mẫu V0/V1 và kế hoạch mẫu theo mã: platform đã chặn ở runtime; nên chuyển sang `StudentAcademicRecordProvider` và bỏ kế hoạch mẫu khỏi engine (4.3c).
- `SimulatedCourseGrade.credits` là số nguyên trong Java trong khi hợp đồng là số thực (học phần 1.5 TC). ROI luôn lấy mục tiêu A.

### TV3 (4.4a)
- What-if/ROI/mục tiêu ngược/đối chiếu: gọi API thật; số liệu "Dự kiến"; CPA có thể null khi thiếu bảng điểm; đối chiếu chỉ cho kế hoạch ACTIVE (409 `PLAN_NOT_ACTIVE`).
- Chat: client sinh `conversationId` (UUID) cho hội thoại mới; 503 `AI_UNAVAILABLE` → thông báo + nút gửi lại, giữ nội dung đã gõ, tôn trọng `Retry-After`, **không** hiển thị câu trả lời nào; 409 `CONVERSATION_BUSY` → tải lại hội thoại rồi gửi lại.

### TV2
- Hiển thị trạng thái trợ lý theo `modules.advisor` (bootstrap); không chặn các màn khác khi `NOT_CONFIGURED`.

---

## 6. Cấu hình

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `AI_MODE` | `live` | `mock` chỉ chạy với `SPRING_PROFILES_ACTIVE=dev`/`test`, nếu không ứng dụng dừng khi khởi động. |
| `GEMINI_API_KEY` | (trống) | Khóa mô hình. Trống → Chat 503 `AI_UNAVAILABLE` (`NOT_CONFIGURED`), chức năng khác chạy bình thường. |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Model Gemini (module AI đọc trực tiếp). |
| `AI_CHAT_TIMEOUT` | `45s` | Hạn cho cả lượt chat. |
| `AI_TOOL_TIMEOUT_MS` | `5000` | Hạn mỗi lời gọi công cụ học vụ trong chat (`ai.advisor.tool-timeout-ms`). |
| `AI_RAG_EMBEDDING_PROVIDER` | `FAKE` | Nhúng RAG: `FAKE` (cục bộ tất định của module AI) hoặc `LIVE`. |
| `RAG_DOCUMENTS_ROOT` | (tự dò) | Thư mục chứa `data-source/documents`; image Docker đặt `/app`. |
| `haui.advisor.*` | 8 / 16 / 4000 / 10s / 2m | Lượt đồng thời, hàng chờ, độ dài câu hỏi, `Retry-After`, cửa sổ `DEGRADED`. |

---

## 7. Kết quả kiểm thử

| Kiểm tra | Kết quả |
|---|---|
| `./mvnw -B verify` | **BUILD SUCCESS**: contracts 186, TV1 254 (4 skipped — `PgVectorRealDatabaseIntegrationTest` cần PostgreSQL có pgvector), TV4 160, platform app **101** (trước task 86: +3 `SimulationApiTest`, +2 `ReconcileApiTest`, +7 `AdvisorChatApiTest`, +2 `AdvisorReadinessTest`, +1 `PlannerApiLiveTest.profileUpdateMarksPlansForRecheck`; test 501 thay bằng test schema 1.5.0). |
| Test platform trên PostgreSQL 16 thật (cluster tạm, cổng riêng) | **101/101 pass**, Flyway V1–V5. |
| HTTP thật trên jar + PostgreSQL (live, **không** `GEMINI_API_KEY`) | **18/18**: chat chưa đăng nhập 401; `/actuator/health` 200 còn `/actuator/health/advisor` 503 `NOT_CONFIGURED`; `/system/health` UP + `advisor: NOT_CONFIGURED`; bootstrap 1.5.0 với What-if/ROI/mục tiêu ngược/đối chiếu `READY`; chat → 503 `AI_UNAVAILABLE`, `retryable`, `Retry-After: 10`, không có `answer`, không lưu hội thoại; What-if trên hồ sơ DB (CPA 3.88, không phải 3.35 mẫu), ROI, mục tiêu ngược 200, `dataRevision` không đổi; revision cũ 409; đối chiếu bản nháp 409 `PLAN_NOT_ACTIVE`; tài khoản khác nhận dữ liệu của mình, không đối chiếu được kế hoạch của người khác (404); thiếu CSRF 403. |
| Jar với `AI_MODE=mock`, không profile dev/test | Không khởi động (exit 1): "ai.mode=mock … chỉ dùng được với profile dev hoặc test". |
| `npm run check:contracts` | PASS: 1.5.0, 55 fixture, 39 operation, lock khớp. |
| `npm test` / `npm run lint` | 92/92 pass / PASS. |
| `check:architecture`, `check:ownership`, `check:secrets` | PASS (ownership: chỉ TV5). |
| `check:contract-consumers` | 13 phát hiện, đều là tên trường cũ có sẵn trong test TV3; không phát hiện mới từ 1.5.0. |

---

## 8. Giới hạn còn lại

- Chưa gọi Gemini thật trong phiên này (không có khóa API); luồng thành công của Chat kiểm bằng mô hình giả lập có kiểm soát đi đúng đường `LiveAdvisorModel`. Đánh giá chất lượng câu trả lời với mô hình thật thuộc TV1 (live eval chạy riêng).
- Validate/activate kế hoạch vẫn 503 ở runtime vì TV4 chưa khai báo `VALIDATE_STUDY_PLAN` (từ 4.2b). Hệ quả: ở runtime hiện chưa có kế hoạch ACTIVE nên đối chiếu chỉ trả 409 `PLAN_NOT_ACTIVE`; luồng đối chiếu đầy đủ mới chạy trong test (facade test khai báo thêm thẩm định thật).
- RAG dùng vector store trong bộ nhớ và nhúng cục bộ (§5 TV1 #5); pgvector chưa nối.
- `DEGRADED` và hàng chờ chat tính theo từng tiến trình; nhiều instance cần trạng thái dùng chung.
- Chưa build lại image Docker (máy không có Docker CLI).
