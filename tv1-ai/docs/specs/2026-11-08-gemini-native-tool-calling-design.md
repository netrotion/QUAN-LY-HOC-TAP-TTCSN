# Architecture Specification: Gemini Native Function Calling Orchestration for HaUI Advisor (TV1 AI)

**Status:** Proposed / Under Review  
**Author:** Senior AI/Chatbot Architect & TV1 AI Owner  
**Date:** 2026-11-08  
**Target Module:** `tv1-ai` (Maven module)  
**Related Modules (Unchanged):** `tv4-academic` (Academic Engine), `tv5-platform` (App & Contracts)

---

## 1. Context & Problem Statement

Hiện tại, hệ thống HaUI Advisor điều phối công cụ học vụ thông qua `IntentClassifier` và `ConversationTurnPlanner` dựa trên tập luật chuỗi thủ công (`containsAny`, `Pattern.compile`). 

### Hạn chế cốt tử đã xác minh:
1. **Dễ gãy khi gặp ngôn ngữ tự nhiên:** Câu hỏi thực tế của sinh viên khi dùng từ viết tắt (vd: `"m còn thiếu bao nhiêu tín chỉ để ra trường?"`), câu khuyết chủ ngữ, hoặc đảo ngữ bị trượt toàn bộ các nhánh regex.
2. **Overfit trên tập test nhỏ:** Hệ thống pass 26/26 ca kiểm thử tĩnh nhưng thất bại ngay trong các tương tác đời thường.
3. **Ảo giác khi thiếu dữ liệu:** Khi bộ lọc từ khóa trượt, câu hỏi bị đẩy sang LLM mà không có dữ liệu học vụ cá nhân, dẫn đến câu trả lời phủ nhận hoặc suy đoán sai.

### Mục tiêu thiết kế:
* **Chuyển đổi sang Pure Native Tool Calling:** Để Google Gemini tự phân tích ngữ nghĩa tự nhiên của người dùng và quyết định phát lệnh gọi công cụ (`functionCall`) có cấu trúc.
* **Tích hợp RAG như một Tool độc lập:** Giữ nguyên 100% hệ thống RAG hiện có (`RagAdvisorService`, Vector Store, Chunker, Embeddings, Citation Grounder); biến nó thành tool `search_regulations` được Gemini gọi theo nhu cầu.
* **Bảo toàn Zero-Trust Security:** Định danh sinh viên (`studentId`) và ngữ cảnh tin cậy (`TrustedStudentContext`) được inject an toàn tại server-side (`DefaultAdvisorFacade`), tuyệt đối không để LLM tự điền `studentId`.
* **Tuân thủ Ranh giới TV1:** Không sửa đổi contracts công khai của `tv5-platform/contracts` hay code nội bộ của `tv4-academic`.

---

## 2. Target Architecture & Component Interaction

```
[Student Message]
       │
       ▼
[DefaultAdvisorFacade] (TV1 Orchestrator)
       │
       ├─► 1. Chuẩn bị Gemini Request:
       │      - Conversation History (max 10 turns)
       │      - User Message
       │      - Tools Definition: 6 Academic Tools + 1 RAG Tool
       │
       ▼
[LiveAdvisorModel] (Turn 1: Tool Decision)
       │
       ▼
Gemini API (POST .../models/gemini-3.5-flash-lite:generateContent)
       │
       ├─► Trường hợp A: Cần gọi Tool (candidates[0].content.parts có functionCall)
       │      │
       │      ▼
       │   [DefaultAdvisorFacade] Dispatcher:
       │      ├─► Nếu 'search_regulations' ──► [RagAdvisorService.retrieve()] (TV1)
       │      └─► Nếu Academic Tool       ──► [ToolAdapter] ──► [AcademicFacade] (TV4)
       │                                                              │
       │                                                     (Return Structured DTOs)
       │      ▼
       │   2. Gửi Turn 2 sang Gemini:
       │      - Lịch sử + Tool Call + Tool Response (functionResponse)
       │      ▼
       │   Gemini sinh phản hồi tự nhiên tổng hợp đầy đủ số liệu
       │
       └─► Trường hợp B: Không cần Tool (Direct Chitchat / Follow-up lý giải)
              │
              ▼
           Gemini trả về câu trả lời trực tiếp ngay ở Turn 1
       │
       ▼
[ResponseGroundingValidator] (Kiểm tra bảo toàn số liệu & Citation)
       │
       ▼
[ChatResponse] trả về Client
```

---

## 3. Tool Declarations (Gemini Tools Schema)

Danh mục 7 công cụ được định nghĩa chuẩn theo OpenAPI 3.0 Schema truyền trong payload `tools: [{ functionDeclarations: [...] }]` của Gemini API:

### 3.1. Nhóm Công cụ Học vụ (Ủy thác cho TV4 qua `ToolAdapter`)

1. **`run_graduation_audit`**
   * *Mô tả:* Rà soát tiến độ tốt nghiệp của sinh viên hiện tại, số tín chỉ tích lũy, số tín chỉ còn thiếu, và trạng thái các chuẩn đầu ra (Tin học, Ngoại ngữ, GDQP, Thể chất).
   * *Parameters:* `{ "type": "OBJECT", "properties": {} }` (Không cần tham số, định danh lấy từ session).

2. **`get_academic_status`**
   * *Mô tả:* Lấy thông tin điểm CPA, GPA, xếp loại học lực, số tín chỉ tích lũy và tình trạng cảnh báo học tập hiện tại của sinh viên.
   * *Parameters:* `{ "type": "OBJECT", "properties": {} }`

3. **`check_course_eligibility`**
   * *Mô tả:* Kiểm tra xem sinh viên có đủ điều kiện đăng ký học phần hay không, bao gồm điều kiện tiên quyết, học phần học trước, học phần song hành và tên học phần.
   * *Parameters:*
     * `course_code` (STRING, required): Mã học phần (vd: "IT6080", "IT6019").
     * `semester` (STRING, optional): Học kỳ dự kiến đăng ký (vd: "2026_1").

4. **`rank_retake_courses`**
   * *Mô tả:* Phân tích bảng điểm và xếp hạng danh sách các học phần sinh viên nên học lại/học cải thiện để nâng CPA hiệu quả nhất.
   * *Parameters:*
     * `target_cpa` (NUMBER, optional): Điểm CPA mục tiêu mong muốn đạt được (vd: 3.2).
     * `max_suggestions` (INTEGER, optional): Số lượng môn gợi ý tối đa (mặc định 3).

5. **`simulate_grades`**
   * *Mô tả:* Mô phỏng điểm giả định cho một hoặc nhiều học phần để tính toán dự báo điểm CPA mới của sinh viên.
   * *Parameters:*
     * `simulations` (ARRAY, required): Danh sách các môn mô phỏng, mỗi phần tử gồm:
       * `course_code` (STRING, required): Mã môn học (vd: "IT6019").
       * `expected_grade` (STRING, required): Điểm chữ dự kiến ("A", "B", "C", "D", "F").

6. **`generate_study_plan`**
   * *Mô tả:* Đề xuất lộ trình kế hoạch học tập chi tiết phân bổ các môn vào từng kỳ cho đến kỳ tốt nghiệp mục tiêu.
   * *Parameters:*
     * `target_semester` (STRING, required): Học kỳ dự kiến tốt nghiệp (vd: "2026_2").
     * `max_credits` (INTEGER, required): Số tín chỉ tối đa sinh viên có thể học trong mỗi kỳ (vd: 18).
     * `target_cpa` (NUMBER, optional): Mục tiêu CPA mong muốn.

### 3.2. Nhóm Công cụ Tra cứu Quy chế (Ủy thác cho TV1 RAG)

7. **`search_regulations`**
   * *Mô tả:* Tra cứu các điều khoản trong cẩm nang quy chế đào tạo đại học chính quy HaUI (quy định đăng ký môn, thang điểm, cảnh báo học vụ, hoãn thi, điều kiện tốt nghiệp, học bổng...).
   * *Parameters:*
     * `query` (STRING, required): Cụm từ khóa hoặc câu hỏi tóm tắt nội dung quy chế cần tìm kiếm (vd: "quy định cảnh báo học vụ mức 1", "điều kiện hoãn thi kết thúc học phần").

---

## 4. Chi tiết Triển khai Kỹ thuật trong `tv1-ai`

### 4.1. Refactor `LiveAdvisorModel.java`
* Mở rộng phương thức gọi Gemini API:
  * Hỗ trợ gửi `tools: [{ functionDeclarations: [...] }]` trong request JSON.
  * Phân tích phản hồi từ Gemini: kiểm tra sự tồn tại của `functionCall` trong `candidates[0].content.parts`.
  * Hỗ trợ cấu trúc request 2 chặng:
    * Chặng 1: Gửi conversation context + tools.
    * Chặng 2: Gửi lại cuộc hội thoại kèm `role: "model"` chứa `functionCall` và `role: "user"` (hoặc `role: "function"`) chứa `functionResponse`.
* Giữ nguyên timeout an toàn và cơ chế ghi log telemetry không chứa PII.

### 4.2. Tái cấu trúc `DefaultAdvisorFacade.java`
* Thay thế quy trình rẽ nhánh cứng của `ConversationTurnPlanner`:
  * Gọi Gemini Chặng 1 với Tool Declarations.
  * Khi nhận được 1 hoặc nhiều `functionCall`:
    * Nếu gọi `search_regulations`: ủy thác cho `ragAdvisorService.retrieve(args.query)`.
    * Nếu gọi công cụ học vụ: kiểm tra quyền từ `TrustedStudentContext`, ủy thác cho `toolAdapter.{getAcademicStatus, runGraduationAudit, ...}`.
    * Đóng gói kết quả thành JSON `functionResponse`.
    * Chạy tiếp Gemini Chặng 2 để sinh câu trả lời đầy đủ.
* Đặt giới hạn **Max Tool Execution Budget = 3 tool calls / turn** để ngăn ngừa vòng lặp vô hạn (Infinite Loop Protection).

### 4.3. Bảo toàn `ResponseGroundingValidator.java`
* Tiếp tục kiểm định câu trả lời cuối cùng từ Gemini:
  * Đảm bảo mọi con số CPA, GPA, tín chỉ tích lũy trùng khớp với kết quả trả về từ `tv4-academic`.
  * Đảm bảo mọi trích dẫn `[REG-HAUI-*]` chỉ được xuất hiện nếu tool `search_regulations` được gọi và tìm thấy bằng chứng tương ứng.

---

## 5. Kế hoạch Kiểm thử & Acceptance Criteria

1. **Kiểm thử Ngôn ngữ Tự nhiên & Viết tắt:**
   * Test case 1: `"m còn thiếu bao nhiêu tín chỉ để ra trường?"` $\rightarrow$ Gemini phát `run_graduation_audit`.
   * Test case 2: `"kỳ tới e đăng ký IT6080 đc ko?"` $\rightarrow$ Gemini phát `check_course_eligibility` với `course_code: "IT6080"`.
   * Test case 3: `"quy định cảnh báo học vụ mức 1"` $\rightarrow$ Gemini phát `search_regulations`.
   * Test case 4: `"chào bạn / bạn là ai"` $\rightarrow$ Không gọi tool, trả lời chào hỏi trực tiếp.
2. **Kiểm thử Hồi quy Toàn bộ Repo:**
   * Maven reactor `mvnw.cmd test` đạt `BUILD SUCCESS` (toàn bộ 102 unit/integration tests platform pass).
   * Đảm bảo `scripts/check-ownership.mjs` tuân thủ 100% ranh giới của TV1.
