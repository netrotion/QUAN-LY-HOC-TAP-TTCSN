# Response Integrity and Course Grounding Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` task by task after the user approves implementation. Checkboxes track execution; this document makes no product-code change.

**Goal:** Chat không lưu/trình bày câu cụt do Gemini multipart và trả lời đúng mã, tên, loại quan hệ học phần theo CTĐT authoritative.

**Architecture:** Sửa duy nhất ranh giới đọc Gemini response, mở rộng DTO eligibility hiện có từ cùng CTĐT mà engine dùng, rồi truyền metadata nhỏ gọn vào prompt. Đo guardrail sau các sửa đã chứng minh; chỉ sửa hành vi guardrail khi có ca lỗi được tái hiện.

**Tech Stack:** Java 21, Maven/JUnit, Spring Boot, Gemini REST adapter hiện có, React/Node test hiện có.

**Spec:** [2026-11-06-response-integrity-and-course-grounding-design.md](../specs/2026-11-06-response-integrity-and-course-grounding-design.md)

## Global constraints

- Không thay tính toán Academic Engine, không thêm LLM/RAG/tool call trên đường mặc định, không thêm dependency.
- Danh tính và revision chỉ đến từ `TrustedStudentContext`; không lấy tên/quan hệ học phần từ UI prompt hoặc model làm dữ kiện xác minh.
- `null` metadata nghĩa là chưa xác minh; danh sách rỗng nghĩa là CTĐT xác nhận không có quan hệ loại đó.
- Gemini response không hoàn chỉnh phải đi qua `MODEL_PROVIDER_ERROR` → HTTP 503 và không lưu turn; không trả một prefix như câu hoàn chỉnh.
- Không log prompt, raw response, khóa API, MSSV hoặc câu trả lời cá nhân vào telemetry.
- Giữ các thay đổi chưa commit sẵn có của worktree; commit từng task chỉ khi người triển khai đã kiểm tra staged diff đúng file của task.

## Review focus

| Input/failure mode | Hành vi cần test | Task |
| --- | --- | --- |
| `STOP` có 2 text parts tách giữa từ/câu | Ghép nguyên văn theo thứ tự, không tự thêm/khoét khoảng trắng. | 1 |
| `MAX_TOKENS`, `SAFETY`, thiếu text dù HTTP 200 | Provider error; API 503, lịch sử không có lượt trả lời. | 1 |
| Part `thought=true` đứng trước answer | Không hiển thị thought; chỉ ghép text parts hướng tới người dùng. | 1 |
| Mã đúng nhưng tên sai do user/UI nêu | Dùng tên từ cùng CTĐT, chỉ rõ khác biệt; không lặp tên sai như đã xác minh. | 2–3 |
| `prerequisites=[]`, `prior=[IT6019,IT6020]`, `missing=[IT6020]` | Phân biệt điều kiện đầy đủ với phần sinh viên còn thiếu. | 2–3 |

## Phase 0 — Baseline trước thay đổi chức năng

### Task 0: Đo đường live hiện tại mà không ghi nội dung cá nhân

**Files:**

- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/model/LiveAdvisorModel.java:213-274` (chỉ telemetry, chưa đổi parser)
- Create report: `tv1-ai/docs/audits/2026-11-06-response-integrity-baseline.md`

- [ ] **Step 1: Gắn số đo phi nội dung.** Trong `doCallGeminiModel`, đo `System.nanoTime()` từ trước `client.send` đến khi nhận response; với HTTP 200 đọc `finishReason`, `content.parts.size()`, `usageMetadata.promptTokenCount/candidatesTokenCount`, độ dài text part đầu và tổng độ dài text parts, ghi bằng logger cùng model/status. Không ghi URL chứa key, prompt, raw body, câu trả lời hoặc student ID. Giữ nguyên return `parts[0].text` ở task này để baseline là code hiện tại.
- [ ] **Step 2: Review bảo mật rồi đo.** Chạy `./mvnw.cmd -pl tv1-ai -am -Dtest=LiveAdvisorModelTest -Dsurefire.failIfNoSpecifiedTests=false test`; kiểm tra staged diff không chứa log dữ liệu cá nhân. Dùng account demo tách biệt và ít nhất 20 lượt có cả câu IT6080, hỏi tiếp, tư vấn trực tiếp; lưu số parts, finishReason, response length, token, backend wall time p50/p95 và số câu cụt trong report. Không dùng `0.8s` UI. Ghi rõ cỡ mẫu và chi phí gọi model; không coi 20 lượt là ước lượng chính xác tần suất lỗi hiếm.
- [ ] **Step 3: Chốt baseline.** Ghi model/config/branch/commit và ngày chạy, không ghi API key hay nội dung hội thoại thật; commit telemetry/report riêng nếu staged diff sạch. Task 1 chỉ bắt đầu sau bước này.

## Phase 1 — Toàn vẹn phản hồi Gemini (P0, sau Phase 0)

### Task 1: Đọc đủ response và từ chối kết quả chưa hoàn chỉnh

**Files:**

- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/model/LiveAdvisorModel.java:213-274`
- Test: `tv1-ai/src/test/java/vn/haui/advisor/ai/model/LiveAdvisorModelTest.java`
- Existing integration gate: `tv5-platform/app/src/test/java/vn/haui/advisor/platform/advisor/AdvisorChatApiTest.java`

**Interface:** `static String extractGeminiAnswer(JsonNode response)` package-private trong `LiveAdvisorModel`; `doCallGeminiModel` dùng nó trước khi trả `String`. Không đổi `AdvisorModel`/`ChatResponse`.

- [ ] **Step 1: Viết test thất bại.** Thêm test trong `LiveAdvisorModelTest` với JSON `STOP` gồm `parts: [{"text":"Môn IT6080 yêu cầu hoàn"},{"text":" thành IT6020."}]`; assert kết quả là `Môn IT6080 yêu cầu hoàn thành IT6020.`. Thêm ca 1 part, 3 parts, `thought=true` đứng đầu, `MAX_TOKENS`, `SAFETY`, thiếu candidate và `STOP` không có text. Dùng `ObjectMapper.readTree`, không gọi mạng; các ca lỗi phải throw, không trả prefix.
- [ ] **Step 2: Chạy RED.** `./mvnw.cmd -pl tv1-ai -am -Dtest=LiveAdvisorModelTest -Dsurefire.failIfNoSpecifiedTests=false test`; kỳ vọng test multipart/finishReason thất bại vì parser hiện chỉ lấy `parts[0]` và chưa có helper.
- [ ] **Step 3: Cài helper tối thiểu.** Trong nhánh HTTP 200, thay `root.at("/candidates/0/content/parts/0/text")` bằng `extractGeminiAnswer(root)`. Logic helper:

  ```java
  static String extractGeminiAnswer(JsonNode root) {
      JsonNode candidate = root.path("candidates").path(0);
      String finishReason = candidate.path("finishReason").asText("");
      if (!"STOP".equals(finishReason)) {
          throw new IllegalStateException("Gemini incomplete response: " + finishReason);
      }
      StringBuilder answer = new StringBuilder();
      for (JsonNode part : candidate.path("content").path("parts")) {
          if (!part.path("thought").asBoolean(false) && part.path("text").isTextual()) {
              answer.append(part.path("text").asText());
          }
      }
      if (answer.toString().isBlank()) throw new IllegalStateException("Gemini response has no answer text");
      return answer.toString();
  }
  ```

  Bỏ `System.err` in `response.body()` ở nhánh thiếu text và ở lỗi API để tránh lộ nội dung. Giữ telemetry phi nội dung từ Task 0; không ghi key hoặc raw body. Giữ `generate()` chuyển exception thành `MODEL_PROVIDER_ERROR` để platform trả 503.
- [ ] **Step 4: Chạy GREEN và integration gate.** Chạy lại lệnh test ở Step 2, rồi `./mvnw.cmd -pl tv5-platform/app -am -Dtest=AdvisorChatApiTest -Dsurefire.failIfNoSpecifiedTests=false test`; kỳ vọng 0 failure, test provider error vẫn xác nhận không lưu turn.
- [ ] **Step 5: Review/cam kết.** Kiểm tra `git diff --check` và diff chỉ gồm parser/test; commit riêng nếu staged diff sạch. Rủi ro: provider trả status thành công khác `STOP` sẽ bị 503; thu thập payload phi nội dung trước khi mở rộng allowlist.

## Phase 2 — Dữ kiện học phần authoritative (P1, sau Phase 1 hoặc song song)

### Task 2: Bổ sung định nghĩa học phần vào kết quả eligibility sẵn có

**Files:**

- Modify: `tv5-platform/contracts/src/main/java/vn/haui/advisor/contracts/dto/CourseEligibilityResponse.java`
- Modify: `tv4-academic/src/main/java/vn/haui/advisor/academic/service/DefaultAcademicFacade.java:200-230`
- Test: `tv4-academic/src/test/java/vn/haui/advisor/academic/AcademicSpecV1Test.java`
- Test: `tv5-platform/app/src/test/java/vn/haui/advisor/platform/advisor/AdvisorChatApiTest.java`

**Interface:** Giữ constructor và fields cũ; thêm getters/setters cho `String courseName`, `List<String> prerequisiteCourseCodes`, `priorCourseCodes`, `corequisiteCourseCodes`. DTO vẫn đi qua `ToolAdapter.checkCourseEligibility` hiện tại.

- [ ] **Step 1: Viết test thất bại.** Với CTĐT KTPM hiện có, assert `checkCourseEligibility(IT6080)` trả `courseName="Lập trình Web bằng Java"`, `prerequisiteCourseCodes=[]`, `priorCourseCodes=[IT6019,IT6020]`; với IT6150 assert tên `Đồ án chuyên ngành`, `priorCourseCodes=[IT6040]`. Với mã không thuộc CTĐT, assert metadata null và eligibility vẫn không hợp lệ; không lấy tên user gõ.
- [ ] **Step 2: Chạy RED.** `./mvnw.cmd -pl tv4-academic -am -Dtest=AcademicSpecV1Test -Dsurefire.failIfNoSpecifiedTests=false test`; kỳ vọng test mới thất bại vì DTO chưa có metadata.
- [ ] **Step 3: Thêm fields và gắn metadata từ đúng CTĐT.** Sau `RuleEvaluator.checkEligibility(...)` tại `DefaultAcademicFacade.checkCourseEligibility`, tìm `CourseDefinitionItem` theo `courseCode` trong `targetCurriculum.getCourses()`. Nếu có, đặt tên và ba danh sách bằng `List.copyOf(...)` từ `getPrerequisites()`, `getPriorCourses()`, `getCorequisites()`; nếu không có, giữ null. Không gọi thêm tool, không fallback sang tên từ request. Giữ nguyên `missingPrerequisites` và `eligible` để client cũ tương thích.
- [ ] **Step 4: Chạy GREEN và API gate.** Chạy lại Step 2 và test `AdvisorChatApiTest`; kỳ vọng không thay quyết định đủ điều kiện, không thay quyền truy cập. Review JSON `/academic/eligibility` trong integration test để xác nhận metadata thuộc cùng sinh viên/CTĐT.
- [ ] **Step 5: Review/cam kết.** `git diff --check`, staged diff đúng DTO/engine/tests rồi commit riêng. Rủi ro: field mới chỉ phản ánh CTĐT mà engine đã dùng; test phải bắt mismatch với CTĐT của record thay vì thêm lookup theo code toàn cục.

### Task 3: Dùng metadata trong câu trả lời và bỏ câu gợi ý sai

**Files:**

- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/model/LiveAdvisorModel.java:25-40,383-391`
- Test: `tv1-ai/src/test/java/vn/haui/advisor/ai/model/LiveAdvisorModelPromptTest.java`
- Modify: `tv3-planner-ui/src/pages/ChatAdvisorPage.js:9-13,1969-1976,1571`
- Test: `tv3-planner-ui/test/task-3.12-chat-profile.test.mjs`

**Interface:** Format cùng `CourseEligibilityResponse`, không đổi public chat endpoint. `missingPrerequisites` được mô tả trong prompt là **điều kiện đăng ký còn thiếu**, vì engine gộp cả prerequisite/prior/corequisite vào field legacy này.

- [ ] **Step 1: Viết test thất bại.** `LiveAdvisorModelPromptTest`: tool result IT6080 phải chứa `courseName=Lập trình Web bằng Java`, `prerequisiteCourseCodes=[]`, `priorCourseCodes=[IT6019, IT6020]`, `missingEnrollmentRequirements` có IT6020 và không có tên `Đồ án chuyên ngành`. Test frontend assert `QUICK_PROMPTS_MAN_2` và sidebar không ghép `IT6080` với `Đồ án chuyên ngành`; khi không có API client, không sinh assistant answer giả; UI không hiện câu `Mô hình hoàn thành phản hồi trong` với số cố định.
- [ ] **Step 2: Chạy RED.** `./mvnw.cmd -pl tv1-ai -am -Dtest=LiveAdvisorModelPromptTest -Dsurefire.failIfNoSpecifiedTests=false test` và `npm --prefix tv3-planner-ui test`; kỳ vọng case mới thất bại.
- [ ] **Step 3: Format dữ kiện.** Đổi nhánh `CourseEligibilityResponse` trong `formatToolResults` để in `courseCode`, `courseName`, ba danh sách quan hệ, `eligible`, `missingEnrollmentRequirements` và `policyVersion`. Dùng `null`/`unknown` khi metadata chưa có; không biến null thành `[]`. Thêm một chỉ dẫn ngắn trong system prompt: đối chiếu tên người dùng nêu với `courseName`, phân biệt danh sách điều kiện đầy đủ với phần còn thiếu, phân biệt tiên quyết/học trước/song hành. Không tạo template trả lời cố định.
- [ ] **Step 4: Gỡ prompt sai, mock fallback và thời gian giả.** Thay cả quick pill và sidebar prompt bằng `Mình muốn kiểm tra môn học trước và tiên quyết của một học phần.`; sidebar title/description yêu cầu sinh viên cung cấp mã môn. Khi không có `api.advisor.chat`/`api.post`, ném lỗi cấu hình qua catch hiện có thay vì gọi `generateMockChatResponse`; sau khi xác nhận không còn caller, xóa hàm mock cũ trong file này. Xóa dòng hiển thị `Mô hình hoàn thành phản hồi trong ${msg.executionTime || '1.1s'}` và các giá trị `executionTime` cố định; giữ các nút đánh giá/copy. Không tự đặt một mã môn khác.
- [ ] **Step 5: Chạy GREEN.** Chạy lại hai lệnh ở Step 2, rồi `npm --prefix tv2-web run build`; kỳ vọng 0 failure, build thành công, câu gợi ý và footer không còn thông tin sai.
- [ ] **Step 6: Review/cam kết.** `git diff --check`, staged diff đúng model/UI/tests rồi commit riêng. Rủi ro: metadata làm prompt dài hơn; chỉ gửi một học phần đang hỏi, không gửi toàn bộ cây CTĐT.

## Phase 3 — Guardrail đo trước khi sửa (P1, sau Phase 1–2)

### Task 4: Ma trận raw → validate lần 1 → validate lần 2

**Files:**

- Read: `tv1-ai/src/main/java/vn/haui/advisor/ai/grounding/ResponseGroundingValidator.java`
- Test/diagnostic: `tv1-ai/src/test/java/vn/haui/advisor/ai/grounding/ResponseGroundingValidatorTest.java`
- Create report: `tv1-ai/docs/audits/2026-11-06-guardrail-behavior-matrix.md`

- [ ] **Step 1: Chuẩn bị ca tổng hợp không chứa PII thật.** Dùng sáu lớp input: (a) lời tư vấn không PII/citation, (b) mã SV mẫu không được hỏi, (c) citation có nguồn, (d) một citation không neo trong đoạn còn lại hữu ích, (e) mã môn đúng nhưng tên sai, (f) nhiều CPA/credits và Markdown. Mỗi ca có raw answer, `AdvisorModelInput`/`GroundedContext`/tool results và kỳ vọng về điều **không được mất**.
- [ ] **Step 2: Đo hai lượt validate.** Trong test diagnostic, gọi `first=validator.validate(raw,input)` và `second=validator.validate(first,input)`; ghi vào report các trường `answerChanged`, `allTextReplaced`, `warnings`, `sourceCount`, `piiLeak`, `markdownPreserved`, `courseNameMismatch`. Chỉ dùng dữ liệu tổng hợp trong report; không ghi hội thoại thật. Chạy `./mvnw.cmd -pl tv1-ai -am -Dtest=ResponseGroundingValidatorTest -Dsurefire.failIfNoSpecifiedTests=false test`.
- [ ] **Step 3: Ra quyết định theo kết quả.** Nếu có ca hợp lệ bị thay cả câu, mất cấu trúc hoặc mã/tên sai lọt qua, mở task sửa guardrail riêng với failing assertion và giữ PII/citation bảo vệ tương đương. Nếu không, ghi `no behavior change justified` và không sửa guardrail chỉ vì nó validate hai lần. Đừng đưa thay đổi guardrail chưa đo vào cùng commit Phase 1–2.

## Phase 4 — Nghiệm thu xuyên pipeline (sau Phase 1–3)

### Task 5: Regression và đo latency/cost

**Files:**

- Extend: `tv5-platform/app/src/test/java/vn/haui/advisor/platform/advisor/AdvisorChatApiTest.java`
- Extend: `tv1-ai/src/test/resources/eval/chat-eval-v1.json` chỉ bằng ca nhãn, không bằng câu trả lời giả đưa vào runtime
- Create report: `tv1-ai/docs/audits/2026-11-06-response-integrity-acceptance.md`

- [ ] **Step 1: Thêm ca xuyên pipeline.** Với provider fake có kiểm soát và CTĐT fixture, kiểm tra `IT6080` đưa đúng tên/ba loại quan hệ vào prompt. Thêm ca `MODEL_PROVIDER_ERROR` khẳng định HTTP 503 và conversation không có assistant turn. Thêm follow-up “môn đó” để đảm bảo courseCode từ lịch sử user vẫn dẫn tới cùng metadata. Độ đúng của lời đáp live phải đo riêng; provider fake không chứng minh được model sẽ sửa tên môn người dùng nêu sai.
- [ ] **Step 2: Chạy test gate.** `./mvnw.cmd test`, `npm --prefix tv3-planner-ui test`, `npm --prefix tv2-web run build`; lưu số passed/failed và đường dẫn log trong report. Không tuyên bố nghiệm thu nếu test fail.
- [ ] **Step 3: Đo live tối thiểu.** Dùng cùng bộ câu hỏi và cùng model/config trước/sau trên account demo tách biệt; ghi backend wall time p50/p95, số generation calls, token input/output, số câu cụt và số lần gọi sai mã/tên hoặc nhầm môn học trước với tiên quyết qua ít nhất 20 lượt. Không dùng `executionTime` của UI. Gate phát hành: 0 câu cụt do multipart trong test; 0 câu không hoàn chỉnh được lưu; 0 cặp mã/tên sai trong mẫu live; không tăng số LLM calls. Báo p95 live kèm cỡ mẫu, không coi chênh lệch trên 20 lượt là kết luận latency; đo riêng overhead parser bằng 1.000 response JSON cục bộ và yêu cầu p95 dưới 5 ms. Nếu tên/quan hệ vẫn sai, tạo failing case và bổ sung ràng buộc deterministic ở guardrail trước phát hành; không chỉ thêm câu lệnh prompt.
- [ ] **Step 4: Đối chiếu và handoff.** Report phân biệt lỗi đã sửa, lỗi còn mở và giả thuyết guardrail chưa chứng minh; chỉ đề nghị triển khai khi các gate đạt. Không auto deploy hoặc bật lại mock runtime.

## Dependency và rollback

Task 0 phải chạy trước mọi thay đổi chức năng để có baseline. Sau đó Task 1 độc lập Task 2. Task 3 cần DTO/metadata của Task 2. Task 4 cần output cuối của Task 1–3 để phép đo có ý nghĩa. Task 5 cần tất cả task trước. Nếu Task 1 gây 503 nhiều hơn do `finishReason` lạ, giữ fail-closed, thu metadata và mở rộng allowlist sau kiểm chứng; không quay về trả prefix. Nếu Task 2 gặp CTĐT không khớp, để metadata null và không khẳng định tên/quan hệ; không dùng mock hoặc tên do user cung cấp để lấp chỗ trống.
