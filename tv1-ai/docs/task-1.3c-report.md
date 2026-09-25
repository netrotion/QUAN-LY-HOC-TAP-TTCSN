# BÁO CÁO KỸ THUẬT TASK 1.3c — AI MODULE SKELETON & MOCK INTEGRATION

**Dự án:** HaUI Advisor  
**Task:** 1.3c — TV1 — Lead + AI  
**Vai trò thực hiện:** TV1 — Lead + AI  
**Ngày thực hiện:** 2026-09-25  
**Trạng thái bàn giao:** `TASK_1_3C_READY_FOR_REVIEW`  

---

## 1. Trạng thái Repository khi bắt đầu

- **Branch:** `main`, clean working tree sau khi TV5 hoàn thành bàn giao Task 1.2 (`bootstrap-v0`).
- **Tài liệu nguồn TV1:** Toàn bộ thư mục `tv1-ai/docs/sources/` (7 tệp) và các tài liệu Task 1.1 (`solution-v1.md`, `review-task-1.1.md`, `prompt-task-1.1.md`, `README-task-1.1.md`, `source-manifest.json`) được bảo toàn nguyên vẹn 100%.
- **Module `tv1-ai` ban đầu:** Là Maven library skeleton chỉ có `package-info.java` và placeholder test `AiModulePlaceholderTest.java`, phụ thuộc `haui-contracts`.

---

## 2. Các Contracts đã sử dụng từ `tv5-platform/contracts/`

Module `tv1-ai` chỉ phụ thuộc duy nhất vào `vn.haui.advisor:haui-contracts`, không phụ thuộc chéo vào `tv4-academic` hay `tv5-platform/app`:

1. **Port Interfaces:**
   - `vn.haui.advisor.contracts.ports.AdvisorFacade`: Port chính do `tv1-ai` thực thi (`chat(ChatRequest, TrustedStudentContext)`).
   - `vn.haui.advisor.contracts.ports.AcademicFacade`: Port do `tv4-academic` thực thi; `tv1-ai` gọi qua `ToolAdapter`.
2. **Hội thoại & Ngữ cảnh tin cậy (Chat & Security DTOs):**
   - `ChatRequest`: Yêu cầu hội thoại từ client (không chứa `studentId`).
   - `TrustedStudentContext`: Danh tính sinh viên đã xác thực từ server session (`studentId`, `studentCode`, `fullName`, `majorCode`, `cohort`, `dataRevision`).
   - `ChatResponse`: Kết quả hội thoại chuẩn hóa gồm `answer`, `sources`, `actions`, `planProposal`, `warnings`.
   - `ChatSourceItem`: Trích dẫn quy chế/nguồn tài liệu.
   - `ChatActionItem`: Đề xuất hành động điều hướng (như xem bảng điểm, mở Study Planner).
   - `ChatPlanProposal`: Đề xuất kế hoạch học tập kèm các học kỳ dự kiến và CPA mục tiêu.
3. **DTOs học vụ (Academic DTOs):**
   - `AcademicStatusRequest`, `AcademicStatusResponse`, `AcademicRiskLevel`
   - `GenerateStudyPlanRequest`, `GenerateStudyPlanResponse`, `StudyPlanStatus`
   - `PlannedSemesterItem`, `PlannedCourseItem`
   - `ValidateStudyPlanRequest`, `ValidateStudyPlanResponse`
   - `CourseEligibilityRequest`, `CourseEligibilityResponse`

---

## 3. Kiến trúc thực tế sau khi triển khai

```text
Caller (API Controller / TV5 Runtime)
  │
  ▼
AdvisorFacade (DefaultAdvisorFacade)
  │
  ├──► Kiểm tra tính hợp lệ & Ngữ cảnh bảo mật (TrustedStudentContext)
  │
  ├──► ToolAdapter (DefaultToolAdapter)
  │      │
  │      └──► AcademicFacade Interface (MockAcademicFacade / Real AcademicFacade TV4)
  │
  └──► AdvisorModel (MockAdvisorModel hoặc LiveAdvisorModel)
         │
         ├── MockAdvisorModel (ai.mode=mock: Deterministic, Offline, Case A/B/C)
         └── LiveAdvisorModel (ai.mode=live: Skeleton adapter cho Spring AI ChatModel)
```

### Các nguyên tắc thiết kế bất khả xâm phạm:
1. **Bảo mật danh tính:** Mọi lời gọi qua `ToolAdapter` sang `AcademicFacade` bắt buộc phải trích xuất `studentId` từ `TrustedStudentContext`, tuyệt đối không nhận `studentId` từ client payload hay từ text do LLM sinh.
2. **Không sao chép logic học vụ:** `ToolAdapter` chỉ làm nhiệm vụ mapping DTO và ủy quyền gọi `AcademicFacade`, không tự tính toán lại GPA/CPA hay sao chép thuật toán phân bổ môn của TV4.
3. **Phân tách cảnh báo:** Cảnh báo học vụ được giữ nguyên trong danh sách `warnings` của `ChatResponse`, không encode warning lẫn lộn vào chuỗi `answer`.

---

## 4. Danh sách các File đã tạo / sửa đổi

Mọi thay đổi đều nằm 100% trong phạm vi sở hữu của `tv1-ai/`:

### 4.1. File cấu hình đã sửa:
- [`tv1-ai/pom.xml`](file:///E:/thuctapcosonganh/tv1-ai/pom.xml): Bổ sung `spring-boot-autoconfigure` và `spring-boot-starter-test` (quản lý phiên bản bởi BOM gốc).

### 4.2. File đã xóa:
- `tv1-ai/src/test/java/vn/haui/advisor/ai/AiModulePlaceholderTest.java`: Được thay thế bằng bộ kiểm thử toàn diện.

### 4.3. Mã nguồn chính đã tạo (`tv1-ai/src/main/java/vn/haui/advisor/ai/`):
- [`config/AiMode.java`](file:///E:/thuctapcosonganh/tv1-ai/src/main/java/vn/haui/advisor/ai/config/AiMode.java): Enum `MOCK`, `LIVE`.
- [`config/AiProperties.java`](file:///E:/thuctapcosonganh/tv1-ai/src/main/java/vn/haui/advisor/ai/config/AiProperties.java): Binding cấu hình `ai.mode`.
- [`config/AiAutoConfiguration.java`](file:///E:/thuctapcosonganh/tv1-ai/src/main/java/vn/haui/advisor/ai/config/AiAutoConfiguration.java): Spring Boot auto-configuration có điều kiện kích hoạt theo `ai.mode`.
- [`model/AdvisorModel.java`](file:///E:/thuctapcosonganh/tv1-ai/src/main/java/vn/haui/advisor/ai/model/AdvisorModel.java): Interface abstraction cho model tư vấn.
- [`model/AdvisorModelInput.java`](file:///E:/thuctapcosonganh/tv1-ai/src/main/java/vn/haui/advisor/ai/model/AdvisorModelInput.java): DTO đầu vào cho model (`userMessage`, `studentContext`, `toolResults`).
- [`model/AdvisorModelOutput.java`](file:///E:/thuctapcosonganh/tv1-ai/src/main/java/vn/haui/advisor/ai/model/AdvisorModelOutput.java): DTO đầu ra từ model.
- [`model/MockAdvisorModel.java`](file:///E:/thuctapcosonganh/tv1-ai/src/main/java/vn/haui/advisor/ai/model/MockAdvisorModel.java): Triển khai mock deterministic, không gọi network/Gemini.
- [`model/LiveAdvisorModel.java`](file:///E:/thuctapcosonganh/tv1-ai/src/main/java/vn/haui/advisor/ai/model/LiveAdvisorModel.java): Adapter skeleton cho Live mode.
- [`tools/ToolAdapter.java`](file:///E:/thuctapcosonganh/tv1-ai/src/main/java/vn/haui/advisor/ai/tools/ToolAdapter.java): Interface adapter gọi công cụ học vụ.
- [`tools/DefaultToolAdapter.java`](file:///E:/thuctapcosonganh/tv1-ai/src/main/java/vn/haui/advisor/ai/tools/DefaultToolAdapter.java): Triển khai gọi `AcademicFacade` interface.
- [`mock/MockAcademicFacade.java`](file:///E:/thuctapcosonganh/tv1-ai/src/main/java/vn/haui/advisor/ai/mock/MockAcademicFacade.java): Fixture giả lập của `AcademicFacade` dùng khi `ai.mode=mock`.
- [`service/DefaultAdvisorFacade.java`](file:///E:/thuctapcosonganh/tv1-ai/src/main/java/vn/haui/advisor/ai/service/DefaultAdvisorFacade.java): Triển khai port `AdvisorFacade`.

### 4.4. Bộ kiểm thử đã tạo (`tv1-ai/src/test/java/vn/haui/advisor/ai/`):
- [`config/AiModeConfigurationTest.java`](file:///E:/thuctapcosonganh/tv1-ai/src/test/java/vn/haui/advisor/ai/config/AiModeConfigurationTest.java): 5 tests kiểm tra context, chế độ mock/live và cô lập mock.
- [`tools/ToolAdapterTest.java`](file:///E:/thuctapcosonganh/tv1-ai/src/test/java/vn/haui/advisor/ai/tools/ToolAdapterTest.java): 4 tests kiểm tra ủy quyền `AcademicFacade`, bảo toàn dữ liệu và bảo mật `studentId`.
- [`service/AdvisorFacadeTest.java`](file:///E:/thuctapcosonganh/tv1-ai/src/test/java/vn/haui/advisor/ai/service/AdvisorFacadeTest.java): 6 tests kiểm tra Case A, B, C, validation, security và no-network execution.

---

## 5. Cơ chế hoạt động của `ai.mode=mock`

- Được kích hoạt khi `ai.mode=mock` hoặc khi chưa thiết lập thuộc tính (giá trị mặc định an toàn cho môi trường phát triển).
- Cấu hình Spring khởi tạo `MockAdvisorModel` và `MockAcademicFacade` (nếu chưa có bean thật từ TV4).
- Phản hồi deterministic 100%, có tiền tố `[MOCK_ADVISOR]` rõ ràng, không phụ thuộc đồng hồ hệ thống hay mạng ngoài.
- Xử lý mượt mà 3 kịch bản chính:
  - **Case A (Hỏi đáp chung):** Trả câu trả lời kèm nguồn quy chế fixture và action gợi ý xem bảng điểm; `planProposal` là `null`.
  - **Case B (Lập kế hoạch):** Gọi `ToolAdapter.generateStudyPlan(...)` -> nhận kế hoạch từ `MockAcademicFacade` -> đóng gói `ChatPlanProposal` và action `OPEN_PLANNER` dẫn tới `/planner`. Không tự ý lưu hay kích hoạt kế hoạch.
  - **Case C (Cảnh báo học vụ):** Khi công cụ trả cảnh báo, giữ nguyên cảnh báo trong trường `warnings` của `ChatResponse`, không tự ý sinh kế hoạch thành công ảo.

---

## 6. Cơ chế cô lập của `ai.mode=live`

- Khi cấu hình `ai.mode=live`:
  - `MockAdvisorModel` và `MockAcademicFacade` **TUYỆT ĐỐI KHÔNG ĐƯỢC TẠO** trong Spring context (được bảo vệ bởi `@ConditionalOnProperty(havingValue = "mock")`).
  - Nếu thiếu bean `AcademicFacade` thật, quá trình khởi tạo context sẽ thất bại rõ ràng với `NoSuchBeanDefinitionException`. Không có bất kỳ cơ chế fallback ngầm sang mock nào.
  - `LiveAdvisorModel` là skeleton boundary: nếu được gọi khi chưa cấu hình Gemini provider, nó sẽ ném `UnsupportedOperationException` chỉ rõ lỗi thay vì trả dữ liệu giả.

---

## 7. Chi tiết các Test Case đã viết và Xác minh

| Test Class | Số lượng test | Mục đích kiểm tra | Kết quả |
|---|:---:|---|:---:|
| `AiModeConfigurationTest` | 5 | Kích hoạt mock mode, default mode, live mode failure khi thiếu bean thật, live mode isolation khi có bean thật, và lỗi bind khi mode không hợp lệ. | **PASS** |
| `ToolAdapterTest` | 4 | Ủy quyền `getAcademicStatus`, `generateStudyPlan`, `validateStudyPlan` bảo đảm `studentId` từ context; từ chối `context` rỗng. | **PASS** |
| `AdvisorFacadeTest` | 6 | Kịch bản Case A, Case B, Case C, validation tin nhắn rỗng, bảo mật unauthenticated context, và kiểm tra thực thi offline (< 1s). | **PASS** |

---

## 8. Lệnh kiểm tra thực tế và Kết quả

Tất cả các lệnh kiểm thử tiêu chuẩn đã được chạy và xác nhận thành công tuyệt đối:

| Lệnh thực thi | Môi trường | Exit Code | Số lượng test / Chi tiết | Kết quả |
|---|---|:---:|:---:|:---:|
| `mvn test -pl tv1-ai -am` | Docker (`maven:3.9.9-temurin-21`) | `0` | **27 tests** (12 contracts + 15 tv1-ai) | **PASS** |
| `mvn test` (Toàn bộ reactor) | Docker (`maven:3.9.9-temurin-21`) | `0` | **31 tests** (12 contracts + 15 tv1-ai + 1 academic + 3 platform-app) | **PASS** |
| `node scripts/check-architecture.mjs` | Local Node.js | `0` | Kiểm tra ranh giới dependency, không có cyclic dependency | **PASS** |
| `node scripts/check-contracts.mjs` | Local Node.js | `0` | 11 fixture capabilities & OpenAPI V0 valid | **PASS** |
| `npm run lint` | Local Node.js | `0` | Clean code frontend | **PASS** |
| `npm run test` | Local Node.js | `0` | 3/3 workspace integration tests | **PASS** |

---

## 9. Các thành phần Mock / Fake hiện tại

1. `MockAdvisorModel`: Trả các phản hồi giả lập deterministic có gắn nhãn `[MOCK_ADVISOR]` và nguồn `FIXTURE`.
2. `MockAcademicFacade`: Fixture tạm thời cho `AcademicFacade` nằm trong package `vn.haui.advisor.ai.mock`, chỉ hoạt động khi `ai.mode=mock` và sẽ được thay thế khi TV4 bàn giao Task 1.3b.

---

## 10. Các thành phần chưa triển khai (Ngoài phạm vi Task 1.3c)

Theo đúng giới hạn của Task 1.3c, các thành phần sau chưa được thực thi:
1. **Gemini Live Inference:** Chưa gọi Google Gemini API thật qua Spring AI.
2. **RAG Pipeline:** Chưa nhúng pgvector store hay tìm kiếm vector tài liệu quy chế thật.
3. **Academic Algorithm:** Chưa triển khai thuật toán tính GPA/CPA hay phân bổ môn của TV4.
4. **Chat REST Controller & Persistence:** Chưa tạo API endpoint `/api/v1/chat` và bảng lưu lịch sử chat trong PostgreSQL (do TV5 phụ trách).

---

## 11. Các điểm phụ thuộc & Hướng bàn giao cho Task tiếp theo

1. **Bàn giao cho TV4 (Task 1.3b):**
   - TV4 triển khai `AcademicFacade` trong `tv4-academic/`. Khi TV4 cung cấp bean `AcademicFacade`, Spring Boot có thể tự động inject vào `ToolAdapter` mà không cần sửa đổi code của TV1.
2. **Bàn giao cho TV2 & TV3 (Task 1.3a & Task 1.4):**
   - TV2 và TV3 có thể an tâm sử dụng `ai.mode=mock` để phát triển giao diện Web, Chat UI và Study Planner ngay lập tức với các kịch bản Case A, B, C ổn định.
3. **Bàn giao cho TV5 (Phase 2):**
   - TV5 sẽ cấu hình Spring AI Gemini starter, API Key, và REST controller để kết nối `AdvisorFacade` vào luồng chat live.

---

> **KẾT LUẬN:** Task 1.3c hoàn tất 100% mục tiêu xây dựng AI skeleton, mock adapter, và hệ thống test cô lập. Toàn bộ mã nguồn tuân thủ nghiêm ngặt ranh giới folder của `tv1-ai/` và sẵn sàng để nghiệm thu.
