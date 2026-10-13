# BÁO CÁO KIỂM TOÁN KIẾN TRÚC TOÀN DIỆN — HAUI ADVISOR TASK 3.8
## Prompt Template, Tool Calling Adapter, Conversation Persistence & AI Orchestration

- **Dự án:** HaUI Advisor (`netrotion/QUAN-LY-HOC-TAP-TTCSN`)
- **Mã Task:** Task 3.8 — Code hội thoại và Tool Calling
- **Phân hệ sở hữu:** `tv1-ai` (Lead + AI)
- **Tác giả:** Principal AI Architect & Lead Orchestrator
- **Ngày lập:** 2026-10-13
- **Trạng thái:** `ARCHITECTURE_AUDIT_VERIFIED`

---

## 1. TỔNG QUAN KIỂM TOÁN VÀ PHẠM VI HỆ THỐNG

### 1.1. Bối cảnh Kỹ thuật
Task 3.8 hoàn thiện phân hệ Trợ lý Cố vấn Học vụ Thông minh (HaUI Advisor) có khả năng đối thoại tự nhiên, tra cứu quy chế học vụ qua RAG (đã chuyển giao tại Task 3.3), điều phối công cụ học vụ authoritative (`AcademicFacade`), duy trì ngữ cảnh đa lượt (`ConversationStore`), và ngăn chặn triệt để ảo giác (Hallucination) cũng như các lỗ hổng an ninh mạng.

### 1.2. Phạm vi Quyền ghi (Authorized Write Scope)
- **Chỉ ghi độc quyền tại:** `tv1-ai/**`
- **Chỉ đọc (Read-only):**
  - `tv1-ai/docs/sources/**`
  - `tv2-web/**`
  - `tv3-planner-ui/**`
  - `tv4-academic/**`
  - `tv5-platform/**`
  - Root build files & CI scripts.

---

## 2. KẾT QUẢ ĐÁNH GIÁ CÁC GIAO DIỆN HỢP ĐỒNG (CONTRACTS V1.2.0)

### 2.1. Cổng Học vụ `AcademicFacade` & `AcademicCapability`
Cổng `AcademicFacade` định nghĩa 9 capabilities độc lập:
1. `getAcademicStatus(AcademicStatusRequest)`: Tra cứu GPA, CPA, tín chỉ tích lũy, mức độ cảnh báo học vụ.
2. `checkCourseEligibility(CourseEligibilityRequest)`: Kiểm tra điều kiện tiên quyết và khả năng đăng ký môn.
3. `generateStudyPlan(GenerateStudyPlanRequest)`: Sinh đề xuất lộ trình học tập tối ưu (`proposalId`, `semesters`, `projectedCpa`).
4. `validateStudyPlan(ValidateStudyPlanRequest)`: Thẩm định ràng buộc tín chỉ (10-24 TC, hè 12 TC) và tiên quyết.
5. `simulateGrades(SimulateGradesRequest)`: Mô phỏng What-if điểm học kỳ mới và CPA biến động.
6. `rankRetakeCourses(RankRetakeCoursesRequest)`: Xếp hạng các môn cần học cải thiện (D/D+/C) theo ROI tăng CPA.
7. `calculateTargetGrades(CalculateTargetGradesRequest)`: Tính toán GPA trung bình các kỳ còn lại để đạt mục tiêu tốt nghiệp.
8. `runGraduationAudit(GraduationAuditRequest)`: Rà soát điều kiện tốt nghiệp (tín chỉ, CPA, chuẩn đầu ra MOS/TOEIC/GDTC/GDQP-AN).
9. `reconcileStudyPlan(ReconcileStudyPlanRequest)`: Đối chiếu kế hoạch khi sinh viên có kết quả học tập mới.
10. `readyCapabilities()`: Trả về danh sách capability là công cụ thật (`REAL`).

### 2.2. Hiện trạng Triển khai `tv4-academic`
- `DefaultAcademicFacade` đã triển khai logic tính toán cho cả 9 capabilities dựa trên dữ liệu mẫu fixtures (CTĐT CT1085, 150 TC).
- Tuy nhiên, `DefaultAcademicFacade` không override `readyCapabilities()`, dẫn tới mặc định trả về `Set.of()` (`NOT_READY`).
- Do đó, `ToolAdapter` của `tv1-ai` phải có cơ chế kiểm tra `isCapabilityReady(AcademicCapability)` và xử lý an toàn:
  - Khi tool trả về `NOT_READY`, không được ném 500 hay bịa kết quả thành công; hệ thống phải phát ra cảnh báo `TOOL_UNAVAILABLE` và hướng dẫn người dùng hành động thay thế.

### 2.3. Cổng Lưu trữ Hội thoại `ConversationStore`
- Hợp đồng `ConversationStore` thuộc quyền sở hữu của `tv5-platform` (triển khai qua `JdbcConversationStore`).
- Nhận diện hội thoại độc quyền theo cặp `(conversationId, studentId)`.
- Các nguyên tắc an ninh:
  - Không cho phép người dùng A đọc hoặc ghi đè hội thoại của người dùng B (trả về 404 hoặc ném `IllegalArgumentException`).
  - Hạn mức kích thước `messagesJson` tối đa là 1 MB (`haui.conversation.max-messages-bytes: 1048576`).

### 2.4. Cổng Trợ lý Ảo `AdvisorFacade`
- Phương thức cốt lõi: `ChatResponse chat(ChatRequest request, TrustedStudentContext context)`.
- `ChatRequest` tuyệt đối không chứa `studentId`. Danh tính sinh viên luôn được cung cấp an toàn từ `TrustedStudentContext`.
- Cấu trúc `ChatResponse`:
  - `answer`: Văn bản giải thích tự nhiên, sư phạm.
  - `sources`: Danh sách `ChatSourceItem` hợp lệ trích xuất từ RAG.
  - `actions`: Danh sách `ChatActionItem` (cho phép `NAVIGATE`, `OPEN_PLANNER`, `OPEN_WHAT_IF`, `OPEN_AUDIT`, `OPEN_TRANSCRIPT_IMPORT`).
  - `planProposal`: Đề xuất kế hoạch `ChatPlanProposal` (`proposalId`, `semesters`, `projectedCpa`).
  - `warnings`: Danh sách cảnh báo học vụ và hệ thống dạng chuỗi mã cấu trúc (không encode vào answer).

---

## 3. CÁC ĐIỂM YẾU VÀ KHIẾM KHUYẾT CẦN GIẢI QUYẾT (AUDIT FINDINGS)

| ID | Vấn đề Kiến trúc Phát hiện | Mức độ | Trách nhiệm Phân công | Biện pháp Khắc phục Kỹ thuật |
|---|---|:---:|:---:|---|
| **F-3.8-001** | `DefaultAdvisorFacade` hardcode tham số (`"2024_2025_HK2"`, CPA `3.0`, `18` TC, hè `false`) | CRITICAL | Lead / Agent B | Xây dựng bộ bóc tách ý định & tham số động từ tin nhắn người dùng và lịch sử hội thoại; hỏi lại khi thiếu tham số bắt buộc. |
| **F-3.8-002** | `ToolAdapter` chỉ hỗ trợ 3/9 capabilities của `AcademicFacade` | HIGH | Agent B | Mở rộng `ToolAdapter` và `DefaultToolAdapter` hỗ trợ đầy đủ 9 capabilities kèm tiền kiểm chuẩn tham số và kiểm tra `readyCapabilities()`. |
| **F-3.8-003** | Thiếu tích hợp lưu trữ hội thoại đa lượt qua `ConversationStore` | HIGH | Agent C | Tiêm `ConversationStore` vào `DefaultAdvisorFacade`, thực hiện nạp/lưu lịch sử có sliding window $\le 10$ lượt, kiểm soát dung lượng $<900$ KB. |
| **F-3.8-004** | `LiveAdvisorModel` chưa được cài đặt, thiếu cấu hình Gemini/Spring AI | HIGH | Agent D | Xây dựng `LiveAdvisorModel` với Spring AI / Gemini REST adapter, bọc ngoại lệ kết nối an toàn, cấu hình timeout và retry hữu hạn. |
| **F-3.8-005** | Nguy cơ lọt chunk bị nghi ngờ chèn chỉ thị trong `EvidenceValidator` | MEDIUM | Agent D / Security | Lọc bỏ ngay lập tức các chunk bị gắn cờ `DATA_POISONING_SUSPECT`; sử dụng thẻ XML bọc bằng chứng RAG thay cho backtick trần. |
| **F-3.8-006** | `Endpoint POST /api/v1/advisor/chat` trên `tv5-platform` vẫn trả 501 `NOT_IMPLEMENTED` | NOTE | TV5 Platform | Lập tài liệu chuyển giao TV5 chi tiết (`task-3.8-handoff.md`), hoàn thiện tầng module `tv1-ai` đạt mốc `advisor-ready`. |

---

## 4. BẢN THIẾT KẾ KIẾN TRÚC MỤC TIÊU CHO TASK 3.8

### 4.1. Luồng Điều phối Tổng thể (Orchestration Pipeline)
```text
User Message (ChatRequest) + TrustedStudentContext
  │
  ▼
[1. Request & Security Context Validation]
  │  (Kiểm tra tính hợp lệ của message và tính xác thực của studentId)
  ▼
[2. Conversation Retrieval & Bounding]
  │  (ConversationStore.getConversation(convId, studentId) -> Sliding window <= 10 turns)
  ▼
[3. Intent Understanding & Parameter Extraction]
  │  (Nhận diện kịch bản: Regulation, Debt, Plan, Accelerated, What-if, Retake, Audit, Goal Change)
  │  (Trích xuất targetCpa, targetSemester, courseCode, expectedGrades)
  │  (Nếu thiếu tham số bắt buộc như targetSemester khi học vượt -> Trả về CLARIFICATION_REQUIRED)
  ▼
[4. RAG Retrieval & Evidence Grounding]
  │  (RagAdvisorService.retrieveAndGround(query) -> GroundedContext & Citations)
  │  (Loại bỏ chunk bị nghi ngờ poisoning; chuẩn hóa mã nguồn REG-HAUI-01..05)
  ▼
[5. Tool Readiness Check & Execution]
  │  (ToolAdapter.isCapabilityReady(capability))
  │  ├── Nếu NOT_READY -> Bổ sung TOOL_UNAVAILABLE warning, không fabricate số liệu
  │  └── Nếu READY/MOCK -> Thực thi công cụ với timeout <= 2.5s, giới hạn số lần gọi <= 3
  ▼
[6. Authoritative Academic Result Preservation]
  │  (Giữ nguyên tuyệt đối GPA, CPA, tín chỉ, mã môn, môn nợ từ kết quả của AcademicFacade)
  │  (Cấm LLM tính nhẩm hoặc ghi đè kết quả tính toán)
  ▼
[7. AdvisorModel Explanation Generation]
  │  (MockAdvisorModel hoặc LiveAdvisorModel với System Instructions an toàn)
  │  (Đóng gói câu trả lời sư phạm, mạch lạc, dễ hiểu)
  ▼
[8. Post-Generation Guardrails & Validation]
  │  (Kiểm tra toàn vẹn trích dẫn: loại bỏ source ID không có trong retrieved evidence)
  │  (Kiểm tra Allowlist hành động UI: NAVIGATE, OPEN_PLANNER, OPEN_WHAT_IF, OPEN_AUDIT, OPEN_TRANSCRIPT_IMPORT)
  ▼
[9. Conversation Persistence]
  │  (Cập nhật tin nhắn người dùng và câu trả lời vào messagesJson -> ConversationStore.saveConversation)
  ▼
Return ChatResponse (answer, sources, actions, planProposal, warnings)
```

### 4.2. Danh mục Công cụ và Schema Tham số (Tool Schemas)

1. **`getAcademicStatus`**:
   - Tham số: `context` (tự động lấy `studentId` và `dataRevision`).
2. **`checkCourseEligibility`**:
   - Tham số: `context`, `courseCode` (chuẩn `^[A-Z0-9]{4,10}$`), `semester` (chuẩn `^20\d{2}_[12S]$`).
3. **`generateStudyPlan`**:
   - Tham số: `context`, `targetGraduationSemester`, `targetCpa` ($0.0 \le \text{cpa} \le 4.0$), `maxCreditsPerSemester` ($10 \le \text{tc} \le 30$), `includeSummerSemesters` (boolean), `retakeCourses` (list mã môn).
4. **`validateStudyPlan`**:
   - Tham số: `context`, `ValidateStudyPlanRequest`.
5. **`simulateGrades`**:
   - Tham số: `context`, `courses` (danh sách `SimulatedCourseGrade`: mã môn, tín chỉ, điểm chữ A/B+/B/C+/C/D+/D/F, điểm hệ 4).
6. **`rankRetakeCourses`**:
   - Tham số: `context`, `maxSuggestions` ($1 \le n \le 10$).
7. **`calculateTargetGrades`**:
   - Tham số: `context`, `targetCpa`, `targetSemester`.
8. **`runGraduationAudit`**:
   - Tham số: `context`.
9. **`reconcileStudyPlan`**:
   - Tham số: `context`, `planId`, `completedSemester`, `planVersion`.

---

## 5. PHÂN CÔNG QUYỀN SỞ HỮU TỆP TRONG WAVE 3 (FILE OWNERSHIP PLAN)

Để đảm bảo nguyên tắc **"One file, one active writer"** và không xung đột mã nguồn:

- **Lead Orchestrator:**
  - `tv1-ai/src/main/java/vn/haui/advisor/ai/service/DefaultAdvisorFacade.java`
  - `tv1-ai/src/main/java/vn/haui/advisor/ai/config/AiAutoConfiguration.java`
  - `tv1-ai/src/main/java/vn/haui/advisor/ai/config/AiProperties.java`
  - `tv1-ai/docs/task-3.8-*.md`
- **Agent B (Academic Tool & Facade Engineer):**
  - `tv1-ai/src/main/java/vn/haui/advisor/ai/tools/ToolAdapter.java`
  - `tv1-ai/src/main/java/vn/haui/advisor/ai/tools/DefaultToolAdapter.java`
  - `tv1-ai/src/main/java/vn/haui/advisor/ai/tools/ToolParameterValidator.java`
  - `tv1-ai/src/test/java/vn/haui/advisor/ai/tools/ToolAdapterTest.java`
- **Agent C (Multi-turn Conversation & Persistence Engineer):**
  - `tv1-ai/src/main/java/vn/haui/advisor/ai/conversation/ConversationHistoryManager.java`
  - `tv1-ai/src/main/java/vn/haui/advisor/ai/conversation/ChatMessageHistoryItem.java`
  - `tv1-ai/src/main/java/vn/haui/advisor/ai/intent/IntentClassifier.java`
  - `tv1-ai/src/main/java/vn/haui/advisor/ai/intent/ParsedUserIntent.java`
  - `tv1-ai/src/test/java/vn/haui/advisor/ai/conversation/ConversationHistoryManagerTest.java`
- **Agent D (LLM & Response Grounding Engineer):**
  - `tv1-ai/src/main/java/vn/haui/advisor/ai/model/AdvisorModel.java`
  - `tv1-ai/src/main/java/vn/haui/advisor/ai/model/AdvisorModelInput.java`
  - `tv1-ai/src/main/java/vn/haui/advisor/ai/model/AdvisorModelOutput.java`
  - `tv1-ai/src/main/java/vn/haui/advisor/ai/model/MockAdvisorModel.java`
  - `tv1-ai/src/main/java/vn/haui/advisor/ai/model/LiveAdvisorModel.java`
  - `tv1-ai/src/main/java/vn/haui/advisor/ai/grounding/ResponseGroundingValidator.java`
  - `tv1-ai/src/test/java/vn/haui/advisor/ai/model/LiveAdvisorModelTest.java`
  - `tv1-ai/src/test/java/vn/haui/advisor/ai/grounding/ResponseGroundingValidatorTest.java`
- **Agent E (Independent QA & Evaluation Engineer):**
  - `tv1-ai/src/test/java/vn/haui/advisor/ai/eval/ChatEvalBenchmarkRunnerTest.java`
  - `tv1-ai/src/test/java/vn/haui/advisor/ai/service/AdvisorFacadeEdgeCasesTest.java`
  - `tv1-ai/src/test/java/vn/haui/advisor/ai/support/TestHarnessAcademicFacade.java`
  - `tv1-ai/src/test/java/vn/haui/advisor/ai/support/ScriptedAdvisorModel.java`
- **Agent F (Independent Security & Code Reviewer):**
  - `tv1-ai/src/test/java/vn/haui/advisor/ai/security/AdvisorSecurityIsolationTest.java`
  - `tv1-ai/docs/task-3.8-code-review.md`

---
*Báo cáo kiểm toán kiến trúc được phê duyệt bởi Lead Orchestrator.*
