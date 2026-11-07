# Gemini Native Function Calling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển đổi toàn diện cơ chế điều phối công cụ học vụ của HaUI Advisor (`tv1-ai`) từ tập luật if-else/regex thủ công sang mô hình Pure Native Function Calling của Google Gemini.

**Architecture:** Sử dụng trực tiếp tính năng `tools: [{ functionDeclarations: [...] }]` của Gemini API để mô hình tự động phân tích ngữ nghĩa tự nhiên của sinh viên (bao gồm từ viết tắt, câu khuyết chủ ngữ) và phát lệnh `functionCall`. `DefaultAdvisorFacade` đóng vai trò Dispatcher điều phối an toàn: gọi `RagAdvisorService` khi cần tra cứu quy chế và gọi `ToolAdapter` (sang `tv4-academic`) khi cần tra cứu học vụ, rồi gửi `functionResponse` để Gemini sinh câu trả lời tự nhiên có đối chiếu bảo vệ số liệu qua `ResponseGroundingValidator`.

**Tech Stack:** Java 21, Spring Boot 3.3.4, Jackson, Google Gemini REST API (v1beta `generateContent`), JUnit 5, AssertJ, Mockito.

**Spec:** [`tv1-ai/docs/specs/2026-11-08-gemini-native-tool-calling-design.md`](file:///E:/thuctapcosonganh/tv1-ai/docs/specs/2026-11-08-gemini-native-tool-calling-design.md)

## Global Constraints

- Mọi thay đổi code nằm hoàn toàn trong module `tv1-ai/` (tuân thủ `scripts/check-ownership.mjs`).
- Tuyệt đối không thay đổi public contracts tại `tv5-platform/contracts` và không sửa code `tv4-academic`.
- Định danh `studentId` và `dataRevision` luôn lấy từ `TrustedStudentContext`, tuyệt đối không để LLM tự sinh tham số định danh sinh viên.
- Toàn bộ trích dẫn quy chế `[REG-HAUI-*]` chỉ được xuất hiện nếu tool `search_regulations` tìm thấy tài liệu thực tế.
- Số liệu điểm CPA, GPA, tín chỉ từ `tv4-academic` phải được bảo tồn toán học nguyên vẹn qua `ResponseGroundingValidator`.
- Giới hạn tối đa 3 tool calls / lượt thoại (Max Tool Execution Budget = 3) để chống vòng lặp vô hạn.

## Review Focus

1. **Từ viết tắt sinh viên (`"m còn thiếu..."`):** Gemini phải nhận diện đúng ngữ nghĩa và phát lệnh `run_graduation_audit` mà không cần đại từ chuẩn mực.
2. **Hỏi điều kiện tiên quyết môn học với mã môn (`"kỳ tới e đăng ký IT6080 đc ko?"`):** Gemini phải trích xuất đúng `course_code = "IT6080"` trong `args` và phát lệnh `check_course_eligibility`.
3. **Tra cứu quy chế thuần túy (`"quy định cảnh báo học vụ mức 1"`):** Gemini phát lệnh `search_regulations` với `query`, không gọi nhầm các tool học vụ cá nhân.
4. **Chào hỏi xã giao (`"chào bạn / bạn là ai"`):** Gemini không phát `functionCall`, trả về câu trả lời văn bản trực tiếp ngay ở Turn 1.
5. **Tool Execution Timeout hoặc Lỗi Backend:** Nếu tool TV4 hoặc RAG ném ngoại lệ hoặc timeout, hệ thống ghi nhận warning và Gemini thông báo minh bạch, không tự bịa số liệu.

---

### Task 1: Định nghĩa Tools Declarations Schema & DTOs

**Files:**
- Create: `tv1-ai/src/main/java/vn/haui/advisor/ai/tools/GeminiToolDeclarations.java`
- Test: `tv1-ai/src/test/java/vn/haui/advisor/ai/tools/GeminiToolDeclarationsTest.java`

**Interfaces:**
- Consumes: OpenAPI 3.0 types, Jackson ObjectMapper.
- Produces: `GeminiToolDeclarations.getToolDeclarationsMap()` trả về List Map/JsonNode tương thích chuẩn Gemini `tools: [{ functionDeclarations: [...] }]` cho 7 tools:
  * `run_graduation_audit`, `get_academic_status`, `check_course_eligibility`, `rank_retake_courses`, `simulate_grades`, `generate_study_plan`, `search_regulations`.

- [ ] **Step 1: Write the failing test**
  Viết unit test kiểm tra cấu trúc schema JSON sinh ra cho 7 tools: kiểm tra tên hàm, trường mô tả (description), danh sách tham số (parameters, types, required fields).

- [ ] **Step 2: Run test to verify it fails**
  Chạy test: `./mvnw.cmd test -pl tv1-ai -Dtest=GeminiToolDeclarationsTest`
  Xác nhận lỗi: Class `GeminiToolDeclarations` chưa tồn tại.

- [ ] **Step 3: Implement minimal code**
  Viết `GeminiToolDeclarations.java` đóng gói danh mục 7 tools theo schema chuẩn của Google Gemini API.

- [ ] **Step 4: Run test to verify it passes**
  Chạy lại test: `./mvnw.cmd test -pl tv1-ai -Dtest=GeminiToolDeclarationsTest`
  Xác nhận `BUILD SUCCESS` và tất cả assertions pass.

- [ ] **Step 5: Commit**
  `git add tv1-ai/src/main/java/vn/haui/advisor/ai/tools/GeminiToolDeclarations.java tv1-ai/src/test/java/vn/haui/advisor/ai/tools/GeminiToolDeclarationsTest.java`  
  `git commit -m "feat(ai): define gemini native tool declarations schema"`

---

### Task 2: Hỗ trợ Function Calling 2 Chặng trong `LiveAdvisorModel`

**Files:**
- Create: `tv1-ai/src/main/java/vn/haui/advisor/ai/model/GeminiToolCall.java`
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/model/LiveAdvisorModel.java`
- Test: `tv1-ai/src/test/java/vn/haui/advisor/ai/model/LiveAdvisorModelToolCallingTest.java`

**Interfaces:**
- Consumes: Gemini API HTTP requests/responses, Jackson JsonNode.
- Produces:
  * `LiveAdvisorModel.inspectTurn(prompt, history, tools)`: Gửi Turn 1, parse response để trả về danh sách `List<GeminiToolCall>` nếu có `functionCall`, hoặc text nếu là direct answer.
  * `LiveAdvisorModel.completeTurnWithToolResults(prompt, history, toolCalls, toolResults)`: Gửi Turn 2 với `functionResponse` parts để nhận câu trả lời cuối cùng.

- [ ] **Step 1: Write the failing test**
  Viết unit test giả lập HTTP response từ Gemini chứa `functionCall` (mock provider function):
  - Test 1: Gemini trả về `functionCall` `run_graduation_audit`.
  - Test 2: Gemini trả về direct text (không có function call).
  - Test 3: Gemini Turn 2 nhận kết quả tool và sinh văn bản tổng hợp.

- [ ] **Step 2: Run test to verify it fails**
  Chạy test: `./mvnw.cmd test -pl tv1-ai -Dtest=LiveAdvisorModelToolCallingTest`
  Xác nhận test fails do thiếu method và DTO.

- [ ] **Step 3: Implement `GeminiToolCall` và cập nhật `LiveAdvisorModel`**
  - Tạo `GeminiToolCall` chứa `name` và `arguments` (Map).
  - Cập nhật payload builder của `LiveAdvisorModel` để đưa `tools` vào request JSON.
  - Thêm parser bóc tách `candidates[0].content.parts[].functionCall`.
  - Cung cấp method gửi Turn 2 với mảng `parts` gồm `functionResponse`.

- [ ] **Step 4: Run test to verify it passes**
  Chạy lại test: `./mvnw.cmd test -pl tv1-ai -Dtest=LiveAdvisorModelToolCallingTest`
  Xác nhận tất cả test case pass.

- [ ] **Step 5: Commit**
  `git add tv1-ai/src/main/java/vn/haui/advisor/ai/model/GeminiToolCall.java tv1-ai/src/main/java/vn/haui/advisor/ai/model/LiveAdvisorModel.java tv1-ai/src/test/java/vn/haui/advisor/ai/model/LiveAdvisorModelToolCallingTest.java`  
  `git commit -m "feat(ai): support two-turn gemini function calling in LiveAdvisorModel"`

---

### Task 3: Tích hợp Dispatcher Điều phối Công cụ trong `DefaultAdvisorFacade`

**Files:**
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/service/DefaultAdvisorFacade.java`
- Test: `tv1-ai/src/test/java/vn/haui/advisor/ai/service/GeminiToolOrchestrationIntegrationTest.java`

**Interfaces:**
- Consumes: `LiveAdvisorModel`, `ToolAdapter` (TV4), `RagAdvisorService` (TV1 RAG), `TrustedStudentContext`.
- Produces: `DefaultAdvisorFacade.chat(context, request)` hoàn chỉnh sử dụng Pure Function Calling.

- [ ] **Step 1: Write the failing test**
  Viết integration test cho `DefaultAdvisorFacade`:
  - Mô phỏng câu hỏi học vụ $\rightarrow$ Gemini phát `run_graduation_audit` $\rightarrow$ Facade gọi `ToolAdapter.runGraduationAudit` $\rightarrow$ Gemini Turn 2 sinh câu trả lời $\rightarrow$ Grounding validator kiểm tra hợp lệ.
  - Mô phỏng câu hỏi quy chế $\rightarrow$ Gemini phát `search_regulations` $\rightarrow$ Facade gọi `RagAdvisorService.retrieve` $\rightarrow$ Gemini Turn 2 trích dẫn nguồn `[REG-HAUI-*]`.
  - Giới hạn ngân sách gọi tool: Nếu Gemini phát quá 3 tool calls, Facade chặn ở 3 calls.

- [ ] **Step 2: Run test to verify it fails**
  Chạy test: `./mvnw.cmd test -pl tv1-ai -Dtest=GeminiToolOrchestrationIntegrationTest`
  Xác nhận test fails.

- [ ] **Step 3: Implement Tool Dispatcher logic in `DefaultAdvisorFacade`**
  - Tích hợp vòng lặp điều phối:
    1. Chuẩn bị tools schema từ `GeminiToolDeclarations`.
    2. Gọi mô hình Turn 1.
    3. Nếu có `GeminiToolCall`:
       - Duyệt qua từng tool call (tối đa 3).
       - Dispatch tới `ragAdvisorService.retrieve()` nếu là `search_regulations`.
       - Dispatch tới `toolAdapter` với context an toàn nếu là 6 Academic Tools.
       - Tổng hợp map kết quả `functionResponse`.
       - Chạy Turn 2 sinh câu trả lời.
    4. Nếu không có tool call: dùng text Turn 1.
    5. Kiểm định kết quả bằng `ResponseGroundingValidator`.

- [ ] **Step 4: Run test to verify it passes**
  Chạy lại test: `./mvnw.cmd test -pl tv1-ai -Dtest=GeminiToolOrchestrationIntegrationTest`
  Xác nhận tất cả pass.

- [ ] **Step 5: Commit**
  `git add tv1-ai/src/main/java/vn/haui/advisor/ai/service/DefaultAdvisorFacade.java tv1-ai/src/test/java/vn/haui/advisor/ai/service/GeminiToolOrchestrationIntegrationTest.java`  
  `git commit -m "feat(ai): orchestrate academic and rag tools via gemini function calling"`

---

### Task 4: Kiểm thử Tự nhiên Hóa (Colloquial Prompts) & Toàn bộ Quality Gates

**Files:**
- Create: `tv1-ai/src/test/java/vn/haui/advisor/ai/eval/NaturalLanguageToolCallingTest.java`
- Run: `./mvnw.cmd test`, `npm run check:all`

- [ ] **Step 1: Write colloquial test cases**
  Viết bộ test bao gồm các câu hỏi đời thường, viết tắt thực tế:
  - `"m còn thiếu bao nhiêu tín chỉ để ra trường?"`
  - `"kỳ tới e đăng ký IT6080 đc ko?"`
  - `"quy định cảnh báo học vụ mức 1"`
  - `"chào bạn"`
  Đảm bảo các câu viết tắt trên kích hoạt đúng tool mà không bị trượt như trước.

- [ ] **Step 2: Run test to verify colloquial cases pass**
  Chạy test: `./mvnw.cmd test -pl tv1-ai -Dtest=NaturalLanguageToolCallingTest`
  Xác nhận tất cả pass.

- [ ] **Step 3: Run full Maven Reactor test suite**
  Chạy: `./mvnw.cmd test`
  Xác nhận toàn bộ module (`haui-contracts`, `haui-ai`, `haui-academic`, `haui-platform-app`) đều `BUILD SUCCESS`.

- [ ] **Step 4: Run root quality gates and ownership check**
  Chạy: `npm run check:all`
  Xác nhận `check-ownership`, `check-secrets`, `check-architecture`, `check-contracts` và frontend tests đều qua.

- [ ] **Step 5: Final Commit**
  `git commit -m "test(ai): verify natural language tool calling and pass all quality gates"`
