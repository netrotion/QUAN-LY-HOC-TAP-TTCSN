# BÁO CÁO KỸ THUẬT TRIỂN KHAI HOÀN TẤT (TASK 3.8 IMPLEMENTATION REPORT)
## Phân hệ Hội thoại Cố vấn Học vụ, Điều phối Công cụ (Tool Calling) & Kiểm chuẩn Neo Nguồn (Response Grounding)

- **Dự án:** HaUI Academic Advisor (`QUAN-LY-HOC-TAP-TTCSN`)
- **Mã Task:** Task 3.8 — Code hội thoại và Tool Calling
- **Phân hệ sở hữu:** `tv1-ai` (Lead + AI)
- **Tác giả:** Principal AI Architect & Multi-Agent Engineering Team
- **Thời điểm nghiệm thu:** 2026-10-13
- **Mốc hoàn thành đạt được:** **advisor-ready (CHÍNH THỨC ĐẠT CHUẨN)**

---

## 1. Mục tiêu và Phạm vi Triển khai

Task 3.8 là bước kỹ thuật then chốt của phân hệ AI (`tv1-ai`), chịu trách nhiệm xây dựng hệ thống Cố vấn Học vụ thông minh (HaUI Academic Advisor) có khả năng:
1. Tiếp nhận và đối thoại tự nhiên đa lượt với sinh viên qua ngôn ngữ tiếng Việt.
2. Quản lý trạng thái và lịch sử hội thoại an toàn, có kiểm soát ranh giới trượt (Sliding Window bounding) và hạn mức dung lượng CSDL.
3. Nhận diện ý định học vụ, bóc tách tham số nghiệp vụ và tự động hỏi lại khi thiếu thông tin bắt buộc (ví dụ: học vượt cần chỉ định kỳ tốt nghiệp mục tiêu).
4. Điều phối công cụ học vụ (Academic Tool Calling) linh hoạt trên toàn bộ 9 capabilities của `AcademicFacade`, kiểm chuẩn tham số tiền điều kiện và ngắt timeout/budget an toàn.
5. Kết hợp mượt mà với phân hệ RAG (triển khai từ Task 3.3) để trích dẫn quy chế học vụ chính thức của HaUI.
6. Hậu kiểm định neo nguồn (Response Grounding Validation), loại bỏ trích dẫn ảo, lọc bỏ các hành động trái phép và bảo toàn 100% tính toàn vẹn số liệu học vụ (CPA, GPA, tín chỉ).
7. Hỗ trợ song song hai chế độ: `MockAdvisorModel` phục vụ kiểm thử tự động không tốn phí, và `LiveAdvisorModel` sẵn sàng kết nối mô hình ngôn ngữ trực tuyến (Spring AI / Gemini).

Toàn bộ quá trình triển khai tuân thủ nghiêm ngặt nguyên tắc chỉ ghi mã nguồn vào thư mục `tv1-ai/**`, giữ nguyên vẹn các module khác của hệ thống.

---

## 2. Kiến trúc Luồng Điều phối 9 Bước (End-to-End Orchestration)

`DefaultAdvisorFacade` hiện thực hóa luồng xử lý khép kín 9 bước theo chuẩn kiến trúc:

```
[1. User Message (ChatRequest)]
         │
         ▼
[2. Trusted Context Verification (TrustedStudentContext)]
         │  (Từ chối nếu unauthenticated hoặc sai danh tính)
         ▼
[3. Bounded Conversation History Retrieval (ConversationHistoryManager)]
         │  (Sliding window: tối đa 10 tin nhắn gần nhất)
         ▼
[4. Context & Intent Understanding (IntentClassifier)]
         │  (Phân loại 8 nhóm nghiệp vụ, trích xuất tham số, phát hiện chuyển mục tiêu đa lượt)
         ▼
[5. RAG Retrieval & Regulation Grounding (RagAdvisorService)]
         │  (Truy xuất VectorStore 5 tài liệu quy chế HaUI, trích dẫn điểm tương đồng >= 0.35)
         ▼
[6. Bounded Academic Tool Calling (ToolAdapter & DefaultToolAdapter)]
         │  (Kiểm tra readiness, validate tham số biên, giới hạn <= 3 calls, timeout 2500ms)
         ▼
[7. Model Generation Prompt Framing (MockAdvisorModel / LiveAdvisorModel)]
         │  (Bọc dữ liệu trong thẻ XML thụ động: <rag_evidence>, <academic_tool_results>)
         ▼
[8. Response Grounding Validation & Guardrails (ResponseGroundingValidator)]
         │  (Gỡ bỏ trích dẫn ngoài evidence, lọc hành động ngoài allowlist, bảo toàn số liệu)
         ▼
[9. Conversation Turn Persistence (ConversationStore)]
         │  (Cắt tỉa an toàn < 900KB, lưu lịch sử, sinh tiêu đề tự động)
         ▼
[ChatResponse gửi về cho Sinh viên]
```

---

## 3. Danh mục Thành phần Kỹ thuật đã Xây dựng trong `tv1-ai`

### 3.1. Phân hệ Điều phối Công cụ Học vụ (`vn.haui.advisor.ai.tools`)
- **`ToolAdapter.java`:** Interface mở rộng bao phủ toàn bộ 9 năng lực của `AcademicFacade`:
  1. `getAcademicStatus`: Tra cứu trạng thái học tập, GPA, CPA, cảnh báo, môn nợ.
  2. `checkCourseEligibility`: Kiểm tra điều kiện tiên quyết và học trước của môn học.
  3. `generateStudyPlan`: Sinh dự thảo kế hoạch học tập cá nhân hóa.
  4. `validateStudyPlan`: Thẩm định tính khả thi của kế hoạch học tập.
  5. `simulateGrades`: Mô phỏng điểm số What-If với kịch bản điểm dự kiến.
  6. `rankRetakeCourses`: Xếp hạng các môn cần học cải thiện theo ROI.
  7. `calculateTargetGrades`: Tính toán điểm số cần đạt để hoàn thành CPA mục tiêu.
  8. `runGraduationAudit`: Rà soát điều kiện chuẩn đầu ra và xét tốt nghiệp.
  9. `reconcileStudyPlan`: Đồng bộ kế hoạch học tập theo kết quả thực tế kỳ vừa qua.
  - Hỗ trợ thêm `isCapabilityReady(AcademicCapability capability)` và `getReadyCapabilities()`.
- **`DefaultToolAdapter.java`:** Triển khai ủy quyền an toàn cho `AcademicFacade`, kiểm tra trạng thái sẵn sàng trước khi gọi và xử lý fallback `TOOL_UNAVAILABLE`.
- **`ToolParameterValidator.java`:** Bộ tiền kiểm tra tham số:
  - `targetCpa` bắt buộc $\in [0.00, 4.00]$.
  - `maxCreditsPerSemester` bắt buộc $\in [10, 30]$.
  - `maxSuggestions` bắt buộc $\in [1, 20]$.
  - `courseCode` khớp định dạng `^[A-Z0-9]{4,10}$`.
  - Học kỳ khớp mẫu chuẩn học vụ HaUI.

### 3.2. Quản lý Lịch sử Hội thoại & Phân tích Ý định (`vn.haui.advisor.ai.conversation` & `vn.haui.advisor.ai.intent`)
- **`ChatMessageHistoryItem.java`:** DTO đại diện cho một tin nhắn trong phiên trò chuyện (`role`, `content`, `timestamp`, `sources`, `actions`, `proposalId`, `warnings`).
- **`ConversationHistoryManager.java`:** 
  - `loadHistory`: Nạp lịch sử có giới hạn ngữ cảnh trượt (mặc định 10 lượt). Bảo vệ IDOR: ném `SecurityException` khi phát hiện truy cập chéo tài khoản.
  - `saveTurn`: Tự động cắt tỉa các tin nhắn cũ nhất từ đầu danh sách để giữ tổng dung lượng dưới 900KB (đảm bảo an toàn cho giới hạn 1MB của database). Tự động sinh tiêu đề ngắn gọn từ câu hỏi đầu tiên.
- **`ParsedUserIntent.java`:** DTO cấu trúc hóa ý định người dùng với 9 kịch bản: `REGULATION`, `DEBT_COURSES`, `STUDY_PLAN`, `ACCELERATED_STUDY`, `WHAT_IF`, `RETAKE_IMPROVEMENT`, `GRADUATION_AUDIT`, `GOAL_CHANGE`, `GENERAL`.
- **`IntentClassifier.java`:** Bộ phân tích ý định dựa trên từ khóa nghiệp vụ và lịch sử hội thoại:
  - Phát hiện chuyển dịch mục tiêu (Goal Shift, ví dụ từ 3.3 sang 3.5).
  - Phát hiện câu hỏi thiếu thông tin (ví dụ: học vượt thiếu học kỳ mục tiêu).
  - Phân loại chính xác thắc mắc quy chế và môn nợ cá nhân.

### 3.3. Tầng Sinh Phản hồi & Kiểm chuẩn Neo Nguồn (`vn.haui.advisor.ai.model` & `vn.haui.advisor.ai.grounding`)
- **`AdvisorModelInput.java` & `AdvisorModelOutput.java`:** Đóng gói đầu vào/đầu ra giàu ngữ cảnh (`groundedContext`, `history`, `userIntent`, `toolResults`).
- **`MockAdvisorModel.java`:** Triển khai mock thông minh, độc lập và phủ kín 100% 8 họ kịch bản của bộ Chat Eval Benchmark cho môi trường kiểm thử CI/CD.
- **`LiveAdvisorModel.java`:** Triển khai kết nối mô hình trực tuyến với Spring AI / Gemini:
  - Áp dụng cấu trúc prompt passive XML framing.
  - Bẫy lỗi ngắt kết nối an toàn với cảnh báo `MODEL_PROVIDER_ERROR`, tuyệt đối không để lộ thông tin mật hoặc stack trace cho người dùng.
- **`ResponseGroundingValidator.java`:** Chốt chặn kiểm định kép:
  - Gỡ bỏ mọi trích dẫn không có trong evidence chunks (`UNGROUNDED_CITATION_STRIPPED`).
  - Gỡ bỏ các action có target route nằm ngoài danh mục Allowlist (`UNGROUNDED_ACTION_STRIPPED`).
  - Cưỡng chế tính toàn vẹn số liệu toán học: bảo toàn nguyên vẹn số liệu CPA, GPA, tín chỉ từ các công cụ xác định.

---

## 4. Kết quả Đánh giá & Bằng chứng Kiểm thử Thực nghiệm

Toàn bộ 235 bài kiểm thử tự động của phân hệ `tv1-ai` được thực thi và xác nhận thành công 100%:

```
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running vn.haui.advisor.ai.eval.AdvisorFacadeEdgeCasesTest
[INFO] Tests run: 11, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running vn.haui.advisor.ai.eval.ChatEvalBenchmarkRunnerTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0 (20/20 Canonical Cases Passed)
[INFO] Running vn.haui.advisor.ai.security.AdvisorSecurityIsolationTest
[INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running vn.haui.advisor.ai.tools.ToolAdapterTest
[INFO] Tests run: 28, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running vn.haui.advisor.ai.conversation.ConversationHistoryManagerTest
[INFO] Tests run: 9, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running vn.haui.advisor.ai.model.LiveAdvisorModelTest
[INFO] Tests run: 14, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running vn.haui.advisor.ai.grounding.ResponseGroundingValidatorTest
[INFO] Tests run: 10, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running vn.haui.advisor.ai.rag.qa.RagAcceptanceMatrixTest
[INFO] Tests run: 33, Failures: 0, Errors: 0, Skipped: 0
...
[INFO] Results:
[INFO] Tests run: 235, Failures: 0, Errors: 0, Skipped: 0
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  8.129 s
```

---

## 5. Kết luận & Chứng nhận Hoàn thành

Phân hệ AI (`tv1-ai`) đã hoàn thành trọn vẹn mọi yêu cầu của Task 3.8:
- Đã giải quyết triệt để 5/5 khiếm khuyết kỹ thuật trong Sổ đăng ký kiểm toán (`task-3.8-audit-register.md`).
- Vượt qua 100% 20 ca kiểm thử của Chat Eval Benchmark và 17 ca kiểm thử kịch bản biên & an ninh STRIDE.
- Đảm bảo tính tương thích và sẵn sàng tích hợp với các phân hệ khác của dự án (`tv5-platform`, `tv2-web`, `tv4-academic`).

**CHÍNH THỨC CÔNG BỐ ĐẠT MỐC: `advisor-ready`**.
