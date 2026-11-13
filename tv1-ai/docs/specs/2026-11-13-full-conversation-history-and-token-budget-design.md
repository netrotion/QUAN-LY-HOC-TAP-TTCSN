# HaUI Advisor — AI Application Architecture Hardening & Full Conversation History Spec

- **Hệ thống:** HaUI Academic Advisor System (`tv1-ai`, `tv4-academic`, `tv5-platform`)
- **Tác giả:** Principal AI Engineer & AI Systems Architect
- **Tài liệu:** Design Specification (Spec)
- **Ngày lập:** 13/11/2026
- **Trạng thái:** APPROVED FOR PLANNING (Không sửa code trong pha này)

---

## 1. TỔNG QUAN VÀ MỤC TIÊU HỆ THỐNG

### 1.1. Bối cảnh & Mục tiêu
Hệ thống **HaUI Advisor** là trợ lý AI cố vấn học vụ cho sinh viên Trường Đại học Công nghiệp Hà Nội, hỗ trợ sinh viên tra cứu quy chế tín chỉ, theo dõi điểm GPA/CPA, kiểm tra điều kiện học phần tiên quyết, mô phỏng điểm số (what-if), xếp hạng môn học cải thiện và lập kế hoạch học tập cá nhân hóa.

Mục tiêu của tài liệu đặc tả này là:
1. **Khóa chặt Kiến trúc AI Củng cố (Architecture Hardening Baseline):** Giữ vững và hoàn thiện các trụ cột công nghệ đã cam kết (RAG Pipeline với `pgvector` và Hybrid Search, Gemini Native Function Calling, Multi-layer Guardrails, Controlled Streaming, và Live Model Evaluation).
2. **Triệt tiêu Cắt ngầm và Trùng lặp Ngữ cảnh Đa lượt:** Thiết kế cơ chế truyền tải **Full Conversation History** nguyên vẹn 100% qua cả 4 tầng kiến trúc (`ConversationHistoryManager`, `DefaultAdvisorFacade`, `AdvisorStreamingService`, `LiveAdvisorModel`).
3. **Giám sát Ngân sách Token Toàn diện (Token Budget Monitoring):** Tính toán chính xác toàn bộ 6 thành phần ngân sách token ($T_{\text{sys}} + T_{\text{hist}} + T_{\text{rag}} + T_{\text{tool}} + T_{\text{user}} + T_{\text{reserve}}$) và từ chối có kiểm soát khi vượt ngưỡng trần an toàn, tuyệt đối không âm thầm cắt tỉa tin nhắn (no silent truncation).

---

## 2. NGUYÊN TẮC THIẾT KẾ & RÀNG BUỘC CỐT LÕI (GLOBAL CONSTRAINTS)

1. **RAG Pipeline Retention:** Tuyệt đối không xóa bỏ Embedding, Chunking, Vector Search, Lucene BM25, Reciprocal Rank Fusion (RRF), Reranking hay `pgvector`. Kích hoạt chạy với model embedding thật (`text-embedding-004`) và PostgreSQL `pgvector`.
2. **Full History Transmission:** Nạp toàn bộ danh sách tin nhắn của cuộc trò chuyện thuộc về người dùng đã xác thực (`TrustedStudentContext`). Không áp dụng Sliding Window 10 lượt cố định. Không sử dụng Summary Memory hoặc Compaction trong phiên bản này.
3. **Zero History Duplication:** Không được phép đưa tin nhắn hiện tại của sinh viên vào 2 lần (cả trong mảng `contents` của Gemini và thẻ `<conversation_history>` của XML prompt).
4. **No Silent Truncation:** Khi kích thước hội thoại chạm trần database (1MB) hoặc vượt trần token budget (64,000 tokens), hệ thống phải ném ngoại lệ hoặc trả về mã lỗi rõ ràng (`CONTEXT_LIMIT_EXCEEDED`), không tự động xóa tin nhắn cũ (`messages.remove(0)`).
5. **Function Calling & Tool Integrity:** Giữ nguyên 9 công cụ học vụ theo chuẩn OpenAPI / Gemini Function Declarations. Xóa bỏ toàn bộ các tham số hardcode (`includeSummer`, `retakeCourses`).
6. **Multi-layer Guardrails:** Duy trì ranh giới xác thực danh tính dựa trên Spring Session (chống IDOR 100%), bảo toàn số học CPA/GPA bằng regex, khử PII mã SV ở đầu ra, và bổ sung lớp bảo vệ chống Indirect Prompt Injection.
7. **Controlled Streaming:** Phân biệt rõ status/step streaming với text streaming. Sử dụng `AdaptiveValidationBuffer` để stream văn bản mượt mà mà vẫn đảm bảo 100% không rò rỉ PII hay số liệu sai lệch.

---

## 3. THIẾT KẾ CHI TIẾT PHÂN HỆ MEMORY & TOKEN BUDGET PIPELINE

### 3.1. Tầng 1: Quản trị Lưu trữ Lịch sử (`ConversationHistoryManager`)
- **Trách nhiệm:** Giao tiếp với `ConversationStore` (PostgreSQL), chuyển đổi qua lại giữa JSON và đối tượng `ChatMessageHistoryItem`, đảm bảo toàn vẹn dữ liệu.
- **Phương thức mới:**
  ```java
  public List<ChatMessageHistoryItem> loadFullHistory(String conversationId, String studentId) {
      return loadHistory(conversationId, studentId, -1);
  }
  ```
- **Hành vi nạp:** Khi `maxTurns <= 0`, trả về `new ArrayList<>(allMessages)` nguyên vẹn, bảo toàn 100% thứ tự thời gian.
- **Hành vi lưu trữ (`saveTurn`):**
  - Xóa bỏ triệt để đoạn mã pruning ngầm:
    ```java
    // LOẠI BỎ HOÀN TOÀN:
    // while (isSizeExceeded(json, limit) && messages.size() > 2) messages.remove(0);
    ```
  - Thay bằng kiểm tra ngưỡng trần dung lượng vật lý DB (`limit = 1,048,576` bytes):
    Nếu `isSizeExceeded(json, limit)`, ném ngoại lệ tường minh:
    ```java
    throw new ConversationStorageOverflowException(
        "Kích thước hội thoại vượt quá giới hạn lưu trữ cho phép (1MB). Giao dịch được bảo vệ không làm mất dữ liệu cũ."
    );
    ```

### 3.2. Tầng 2 & 3: Tầng Điều phối & Streaming (`DefaultAdvisorFacade` & `AdvisorStreamingService`)
- **Trách nhiệm:** Nhận yêu cầu từ Controller, xác thực danh tính `studentId`, nạp full history, kích hoạt Token Budget Audit, điều phối tool và đóng gói phản hồi.
- **Hành vi nạp:**
  - Thay thế `DEFAULT_MAX_HISTORY_TURNS = 10` bằng lời gọi `conversationHistoryManager.loadFullHistory(conversationId, studentId)`.
- **Hành vi kiểm soát Token Budget:**
  - Trước khi gọi `LiveAdvisorModel` (cả ở Turn 1 inspect, Turn 2 complete hoặc Stream):
    ```java
    TokenBudgetAuditor.AuditResult audit = tokenBudgetAuditor.audit(
        LiveAdvisorModel.SYSTEM_PROMPT,
        history,
        userMessage,
        groundedContext,
        toolResults,
        aiProperties.getModel().getMaxTokens(),
        aiProperties.getConversation().getMaxContextTokens()
    );
    ```
  - Nếu `!audit.isAllowed()`:
    - Ở chế độ thường: Trả về `ChatResponse` kèm cảnh báo `CONTEXT_LIMIT_EXCEEDED` và câu trả lời hướng dẫn: *"Cuộc hội thoại đã đạt đến dung lượng ngữ cảnh tối đa an toàn. Để bảo đảm tính chính xác học vụ, bạn vui lòng tạo một cuộc hội thoại mới."*
    - Ở chế độ Streaming: Phát sự kiện `ChatStreamEvent.error("CONTEXT_LIMIT_EXCEEDED", "Cuộc hội thoại đã đạt đến dung lượng ngữ cảnh tối đa an toàn...", false)` và đóng emitter.

### 3.3. Tầng 4: Bộ Điều hợp Mô hình Ngôn ngữ (`LiveAdvisorModel`)
- **Trách nhiệm:** Định dạng dữ liệu thành cấu trúc Gemini contents hoặc XML prompt, giao tiếp HTTP với Gemini API.
- **Quy tắc định dạng `formatGeminiContents(history, userMessage)`:**
  1. Duyệt toàn bộ `history` theo thứ tự từ tin nhắn đầu tiên đến tin nhắn cuối cùng.
  2. Ánh xạ vai trò: `user` -> `"user"`, `assistant` -> `"model"`.
  3. Bỏ qua tin nhắn `model` nếu nó đứng ở đầu danh sách (quy tắc bắt buộc của Gemini API).
  4. Gộp các tin nhắn có cùng role liên tiếp thành một lượt duy nhất (`parts: [text1, text2]`), bảo đảm luồng hội thoại luôn xen kẽ `user` -> `model` -> `user` -> `model`.
  5. **Kiểm tra chống trùng lặp (Anti-Duplication):** Kiểm tra nội dung tin nhắn `user` cuối cùng trong mảng. Nếu nó đã trùng khớp với `userMessage` hiện tại, tuyệt đối không append thêm lần thứ hai.
- **Quy tắc định dạng XML Prompt `buildPrompt(modelInput)`:**
  1. Thẻ `<conversation_history>` duyệt qua toàn bộ `modelInput.getHistory()`.
  2. Nếu có tin nhắn trong `history` trùng với `modelInput.getUserMessage()`, bỏ qua để không lặp lại.
  3. Thẻ `<user_query>` chứa duy nhất câu hỏi hiện tại của sinh viên.

---

## 4. ĐẶC TẢ THÀNH PHẦN MỚI: `TokenBudgetAuditor`

### 4.1. Công thức Ngân sách Token Toàn phần

$$T_{\text{total}} = T_{\text{sys}} + T_{\text{hist}} + T_{\text{rag}} + T_{\text{tool}} + T_{\text{user}} + T_{\text{reserve}}$$

| Thành phần | Ký hiệu | Cách tính toán | Giá trị ước lượng điển hình |
| :--- | :---: | :--- | :---: |
| **System Prompt & Schemas** | $T_{\text{sys}}$ | Ước lượng text của `SYSTEM_PROMPT` + 9 Tool JSON Schemas | 2,000 – 2,200 tokens |
| **Full Conversation History** | $T_{\text{hist}}$ | $\sum_{i=1}^M (\text{EstimateTokens}(\text{item}_i) + 4)$ | 500 – 45,000 tokens (tùy độ dài) |
| **RAG Evidence** | $T_{\text{rag}}$ | Ước lượng nội dung formatted context của GroundedContext | 400 – 1,200 tokens |
| **Academic Tool Results** | $T_{\text{tool}}$ | Ước lượng text/JSON của toàn bộ toolResults thực thi | 500 – 2,500 tokens |
| **Current User Message** | $T_{\text{user}}$ | $\text{EstimateTokens}(\text{userMessage})$ | 20 – 150 tokens |
| **Reserved Output Buffer** | $T_{\text{reserve}}$ | Cấu hình `ai.model.max-tokens` (mặc định 2,048) | Cố định 2,048 tokens |

### 4.2. Hệ số Ước lượng Ngôn ngữ Tiếng Việt (Vietnamese Heuristics)
Do cấu trúc tiếng Việt đa âm tiết và dấu Unicode kết hợp, thuật toán chuẩn hóa:
$$\text{EstimateTokens}(\text{text}) = \text{Math.max}\left(1, \left\lceil \text{text.length}() \times 0.38 \right\rceil\right)$$
- Text ASCII: $\approx 0.26$ tokens / char.
- Tiếng Việt có dấu: $\approx 0.38 - 0.42$ tokens / char.
- Dữ liệu JSON/XML thẻ tag: $\approx 0.31$ tokens / char.

### 4.3. Chính sách Ngưỡng & Xử lý Vi phạm
- **Cấu hình:** `ai.conversation.max-context-tokens = 64,000` (hoặc 128,000 cho Gemini 3.5 Flash-Lite).
- **Ngưỡng mềm (Soft Warning - 80%):** Khi $T_{\text{total}} \ge 0.8 \times T_{\text{max}}$, gắn cảnh báo `CONTEXT_BUDGET_APPROACHING_LIMIT`.
- **Ngưỡng cứng (Hard Rejection - 100%):** Khi $T_{\text{total}} > T_{\text{max}}$, từ chối thực thi với mã lỗi `CONTEXT_LIMIT_EXCEEDED`. Tuyệt đối không cắt bớt dữ liệu.

---

## 5. THIẾT KẾ BỘ CÔNG CỤ HỌC VỤ & ORCHESTRATION CHUẨN XÁC

### 5.1. Bổ sung 2 Tools còn thiếu trong Schema & Dispatcher
1. **`calculate_target_grades`:**
   - *Schema:* Nhận `target_cpa` (NUMBER) và `target_semester` (STRING, tùy chọn).
   - *Dispatcher:* Gọi `toolAdapter.calculateTargetGrades(context, targetCpa, targetSemester)`.
2. **`reconcile_study_plan`:**
   - *Schema:* Nhận `plan_id` (STRING), `completed_semester` (STRING), `plan_version` (INTEGER).
   - *Dispatcher:* Gọi `toolAdapter.reconcileStudyPlan(context, planId, completedSemester, planVersion)`.

### 5.2. Khử Hardcode trong `GeminiAcademicTools.java`
- Đọc `include_summer` từ `args.get("include_summer")` (ép kiểu boolean linh hoạt).
- Đọc `retake_courses` từ `args.get("retake_courses")` (danh sách String mã môn học) thay vì gán `List.of()`.
- Đọc `max_credits` từ `args.get("max_credits")`, chỉ gán mặc định nếu người dùng không chỉ định.

---

## 6. THIẾT KẾ LUỒNG CONTROLLED STREAMING (ADAPTIVE BUFFER)

### 6.1. Nguyên tắc Phân lập Hai Kênh
1. **Kênh Sự kiện Tiến trình (Status Events):** Phát tức thời: `status("PLANNING")` -> `toolCall(...)` -> `toolResult(...)` -> `citation(...)`.
2. **Kênh Văn bản Trả lời (Text Streaming):**
   - Thay thế `chunk -> {}` bằng `AdaptiveValidationBuffer`.
   - Gom các token nhận được theo ranh giới câu (`.` `?` `!` `\n`) hoặc cụm 20 words.
   - Khi câu hoàn thành: Chạy kiểm tra nhanh regex loại bỏ PII Mã SV -> Phát `ChatStreamEvent.chunk(validatedChunk)`.
   - Khi hoàn tất sinh: Chạy toàn bộ câu trả lời qua `ResponseGroundingValidator.validate()` để bảo đảm tính toàn vẹn số học và gắn trích dẫn quy chế trước khi phát `ChatStreamEvent.done(...)`.

---

## 7. KẾ HOẠCH BẢO VỆ CHỐNG THOÁI LUI & KIỂM THỬ (TEST PLAN)

1. **Unit Test Suite:**
   - `ConversationHistoryManagerTest`: Kiểm thử `loadFullHistory` với 1 lượt, 10 lượt, 50 lượt; kiểm thử ném lỗi khi vượt kích thước DB; kiểm thử bảo toàn role và timestamp.
   - `TokenBudgetAuditorTest`: Kiểm thử tính toán chính xác 6 thành phần; kiểm thử vượt ngưỡng trần 64,000 tokens.
   - `LiveAdvisorModelContentsTest`: Kiểm thử khử trùng lặp `userMessage`, gộp consecutive same-role turns, và XML prompt formatting.
2. **Integration Test Suite:**
   - `FullHistoryMultiTurnRetentionTest`: Mô phỏng hội thoại 15 lượt. Lượt 2 nêu mục tiêu, lượt 14 đổi mục tiêu (Goal Shift), kiểm chứng model xử lý đúng mục tiêu mới nhất mà không mất lịch sử các môn ở lượt 3.
   - `StreamingAdaptiveBufferTest`: Kiểm thử SSE emitter nhận được chuỗi sự kiện `chunk` liên tục, không xuất hiện PII mã sinh viên.
3. **Regression Test Suite:**
   - Đảm bảo toàn bộ các test hiện có của `tv1-ai` (`PrdBddAcceptanceSuiteTest`, `Task42cIntegrationAcceptanceTest`, `Task45ProjectWideAcceptanceTest`) tiếp tục vượt qua 100%.

---

## 8. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

- [ ] Lịch sử hội thoại được truyền 100% qua cả 4 tầng, không có bất kỳ dòng code nào cắt ngọn `subList(size - maxTurns, size)`.
- [ ] Khi hội thoại dài vượt 64,000 tokens, hệ thống trả về lỗi `CONTEXT_LIMIT_EXCEEDED` rõ ràng, không âm thầm cắt bớt dữ liệu.
- [ ] Không có bất kỳ tin nhắn nào bị lặp lại 2 lần trong mảng `contents` gửi sang Gemini API.
- [ ] Tool `generate_study_plan` nhận đúng `includeSummer` và danh sách môn cải thiện từ lời gọi của model.
- [ ] Hai công cụ `calculate_target_grades` và `reconcile_study_plan` được gọi và thực thi thành công.
- [ ] SSE streaming phát các sự kiện `CHUNK` theo thời gian thực tới trình duyệt mà không lộ PII.
- [ ] 100% bài kiểm thử hiện có và bài kiểm thử mới đều PASS.

