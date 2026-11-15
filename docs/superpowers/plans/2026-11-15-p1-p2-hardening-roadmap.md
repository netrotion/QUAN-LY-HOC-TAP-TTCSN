# Implementation Plan: P1 & P2 Subsystem Hardening Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai toàn diện 5 nhiệm vụ kỹ thuật thuộc cấp độ P1 và P2 theo Audit Roadmap của hệ thống HaUI Academic Advisor: Nén hội thoại lũy tiến (P1.1), Pipeline đánh giá tự động Golden Dataset (P1.2), Cách ly định danh và chống giả mạo Tool Calling (P1.3), Chuẩn hóa Prometheus Metrics qua Micrometer (P2.1), và Sổ tay dữ kiện học tập dài hạn Cross-Session Fact Ledger (P2.2).

**Architecture:** 
- Phân tầng `tv1-ai` (AI & Orchestration) phối hợp cùng `tv5-platform/contracts` và `tv4-academic`.
- Quản lý bộ nhớ: `ConversationHistoryManager` chuyển đổi từ cơ chế chặn cứng ngoại lệ 900KB sang Progressive Compaction (tóm tắt lượt cũ, bảo tồn turns mới).
- Bảo mật Tool: Zero-Trust binding trong `GeminiAcademicTools`, ép buộc `TrustedStudentContext` từ phiên đăng nhập, vô hiệu hóa tham số giả mạo.
- Giám sát: `AiMetricsCollector` kết nối trực tiếp với `MeterRegistry` (Micrometer) chuẩn Prometheus.
- Dữ kiện dài hạn: `StudentFactStore` & `StudentFactLedger` lưu trữ Key-Value facts đã kiểm chứng, nạp vào ngữ cảnh AI xuyên suốt các phiên.

**Tech Stack:** Java 21, Spring Boot 3.3.4, Jackson Databind, Micrometer, JUnit 5, AssertJ.

**Spec:** Kế hoạch kiến trúc & Đề xuất ưu tiên hành động (Actionable Roadmap) cho 10 Subsystems (Loại trừ Data Coverage, Override dòng 597, và RAG 24 chunks).

## Global Constraints
- Không hard-code cấu hình hoặc dữ liệu thử nghiệm trong production classes.
- Không sử dụng mock data trong production paths.
- Giữ nguyên 100% tính tương thích ngược cho 420 unit tests hiện có.
- Bảo toàn tính năng cách ly dữ liệu đa người dùng (Multi-tenant isolation) theo `studentId`.

## Review Focus
1. **Compaction Data Loss:** Nén hội thoại không được làm mất thông tin học phần, điểm số và mục tiêu CPA đã trao đổi trong các lượt cũ.
2. **Infinite Compaction Loop:** Đảm bảo hàm nén luôn hội tụ và giảm dung lượng payload, có điều kiện dừng an toàn.
3. **IDOR / Parameter Tampering:** Kiểm tra chặt chẽ trường hợp LLM sinh ra tham số `student_id` khác với sinh viên đang đăng nhập.
4. **Micrometer Null-Safety:** `AiMetricsCollector` phải hoạt động hoàn hảo cả khi không có Spring context hoặc `MeterRegistry == null`.
5. **Memory Poisoning Defense:** `StudentFactLedger` chỉ chấp nhận các thuộc tính học vụ hợp lệ (target CPA, track, credit limits), từ chối chuỗi inject tự do.

---

### Task 1: P1.1 Progressive Conversation Compaction trong `ConversationHistoryManager`

**Files:**
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/conversation/ConversationHistoryManager.java`
- Modify: `tv1-ai/src/test/java/vn/haui/advisor/ai/conversation/ConversationHistoryManagerTest.java`

**Interfaces:**
- `public ConversationRecord saveTurn(String conversationId, String studentId, ChatMessageHistoryItem userMsg, ChatMessageHistoryItem assistantMsg, int maxTotalChars)`
- `private List<ChatMessageHistoryItem> compactHistoryIfNecessary(List<ChatMessageHistoryItem> messages, int limit)`
- `private ChatMessageHistoryItem createConsolidatedSummary(List<ChatMessageHistoryItem> olderMessages)`

- [ ] **Step 1: Viết test kiểm tra nén hội thoại lũy tiến khi vượt ngưỡng dung lượng**
Thêm test `testSaveTurnWithProgressiveCompactionOnApproachingLimit` vào `ConversationHistoryManagerTest.java` chứng minh rằng khi danh sách tin nhắn tích lũy qua nhiều lượt vượt quá ngưỡng, hệ thống tự động gộp các tin nhắn cũ thành 1 tin nhắn tóm tắt `[Tóm tắt lịch sử trao đổi trước đó]` mà không ném `ConversationStorageOverflowException`. Đồng thời giữ nguyên test `testSaveTurnThrowsOnOverflowWithoutPruning` khi một tin nhắn đơn lẻ vượt quá limit.

- [ ] **Step 2: Chạy test để xác nhận test mới FAIL**
Run: `.\mvnw.cmd test -pl tv1-ai -Dtest=ConversationHistoryManagerTest#testSaveTurnWithProgressiveCompactionOnApproachingLimit`

- [ ] **Step 3: Cài đặt logic Progressive Compaction trong `ConversationHistoryManager.java`**
Cập nhật `saveTurn`:
1. Kiểm tra nếu `isSizeExceeded(json, limit)` và số lượng tin nhắn $> 4$:
2. Tách $K$ tin nhắn gần nhất (ví dụ: 4 tin nhắn = 2 turns gần nhất) giữ nguyên.
3. Trích xuất các sự kiện học vụ quan trọng từ các tin nhắn trước đó (các mã môn học, từ khóa CPA/GPA, tín chỉ) thành 1 tin nhắn tóm tắt có vai trò `user` hoặc `system`: `[Tóm tắt trao đổi trước đó: ...]`.
4. Gộp `[summaryMessage] + recentMessages` và serialize lại.
5. Nếu sau khi nén vẫn vượt quá giới hạn (do bản thân tin nhắn mới quá lớn), mới ném `ConversationStorageOverflowException`.

- [ ] **Step 4: Chạy lại toàn bộ test `ConversationHistoryManagerTest`**
Run: `.\mvnw.cmd test -pl tv1-ai -Dtest=ConversationHistoryManagerTest`
Expected: ALL PASS.

- [ ] **Step 5: Commit thay đổi Task 1**
```bash
git add tv1-ai/src/main/java/vn/haui/advisor/ai/conversation/ConversationHistoryManager.java tv1-ai/src/test/java/vn/haui/advisor/ai/conversation/ConversationHistoryManagerTest.java
git commit -m "feat(ai): implement progressive conversation compaction in ConversationHistoryManager"
```

---

### Task 2: P1.3 Strict SecurityContext Binding & Parameter Tampering Defense trong Tool Calling

**Files:**
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/service/GeminiAcademicTools.java`
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/service/DefaultAdvisorFacade.java`
- Create: `tv1-ai/src/test/java/vn/haui/advisor/ai/service/GeminiAcademicToolsSecurityTest.java`

**Interfaces:**
- `static void execute(ToolAdapter toolAdapter, TrustedStudentContext context, String toolName, Map<String, Object> args, Map<String, Object> toolResults, List<String> warnings)`
- Sanitize arguments: kiểm tra và chặn mọi nỗ lực override `student_id` / `studentId` hoặc ký tự độc hại trong `course_code`.

- [ ] **Step 1: Viết test an ninh giả lập tấn công Parameter Tampering & IDOR**
Tạo file `GeminiAcademicToolsSecurityTest.java` với các kịch bản:
- Sinh viên A (`SV001`) gọi tool nhưng args chứa `student_id = "SV002"`. Kiểm tra hệ thống ghi nhận cảnh báo và chỉ truy vấn với `context.getStudentId()`.
- Sinh viên truyền `course_code` chứa injection ký tự đặc biệt (ví dụ: `CS101; DROP TABLE courses--`). Kiểm tra args bị sanitize.
- `context == null` hoặc `context.getStudentId() == null` bị từ chối ngay với `SecurityException`.

- [ ] **Step 2: Chạy test để xác nhận test FAIL**
Run: `.\mvnw.cmd test -pl tv1-ai -Dtest=GeminiAcademicToolsSecurityTest`

- [ ] **Step 3: Cài đặt logic phòng thủ an ninh trong `GeminiAcademicTools.java`**
1. Bổ sung kiểm tra đầu vào:
   ```java
   if (context == null || context.getStudentId() == null || context.getStudentId().isBlank()) {
       throw new SecurityException("Mã sinh viên xác thực không hợp lệ. Từ chối thực thi công cụ học vụ.");
   }
   ```
2. Rà soát `args`: Nếu phát hiện `student_id` hoặc `studentId` khác với `context.getStudentId()`, ghi log cảnh báo `log.warn("Phát hiện nguy cơ Parameter Tampering...")` và loại bỏ khỏi args.
3. Trong `check_course_eligibility` và `simulate_grades`: kiểm tra regex `^[a-zA-Z0-9_. -]{2,20}$` trước khi gọi backend.

- [ ] **Step 4: Chạy test xác nhận PASS**
Run: `.\mvnw.cmd test -pl tv1-ai -Dtest=GeminiAcademicToolsSecurityTest`
Expected: ALL PASS.

- [ ] **Step 5: Commit thay đổi Task 2**
```bash
git add tv1-ai/src/main/java/vn/haui/advisor/ai/service/GeminiAcademicTools.java tv1-ai/src/test/java/vn/haui/advisor/ai/service/GeminiAcademicToolsSecurityTest.java
git commit -m "feat(ai): enforce zero-trust student binding and parameter tampering defense in GeminiAcademicTools"
```

---

### Task 3: P1.2 Pipeline Đánh giá Tự động Golden Academic Scenarios (Offline Eval)

**Files:**
- Create: `tv1-ai/src/test/resources/eval/golden-academic-scenarios.json`
- Create: `tv1-ai/src/test/java/vn/haui/advisor/ai/eval/AcademicGoldenEvalTest.java`

**Interfaces:**
- Đọc file JSON chứa 10+ kịch bản tư vấn học vụ chuẩn của HaUI.
- Mỗi kịch bản bao gồm: `scenarioId`, `query`, `expectedIntent`, `requiredTools`, `expectedPolicyKeywords`, `mustNotContain`.
- Đo lường và khẳng định (Assert):
  1. Intent Precision: Phân loại đúng kịch bản $\ge 90\%$.
  2. Tool Coverage: Quyết định gọi tool chính xác 100% đối với các tình huống cần tra cứu dữ liệu.
  3. Grounding & Anti-Hallucination: Khi dữ liệu bảng điểm trống, hệ thống không được bịa điểm.

- [ ] **Step 1: Tạo bộ dữ liệu `golden-academic-scenarios.json`**
Soạn 10 kịch bản điển hình của sinh viên HaUI:
- Môn điểm D/F cần học cải thiện (`RETAKE_IMPROVEMENT`, yêu cầu tool `rank_retake_courses`, `get_academic_status`).
- Điều kiện xét tốt nghiệp chuẩn đầu ra tiếng Anh và GDTC (`GRADUATION_AUDIT`, yêu cầu tool `run_graduation_audit`).
- Kiểm tra điều kiện tiên quyết môn Kiến trúc máy tính (`COURSE_ELIGIBILITY`, tool `check_course_eligibility`).
- Đăng ký vượt tín chỉ kỳ hè (`ACADEMIC_REGULATION`, tham chiếu quy chế).
- Hỏi khi chưa đồng bộ bảng điểm (Anti-hallucination check).

- [ ] **Step 2: Viết test đánh giá tự động `AcademicGoldenEvalTest.java`**
Test nạp JSON, chạy qua `IntentClassifier`, `ConversationTurnPlanner`, và kiểm tra ma trận quyết định.

- [ ] **Step 3: Chạy test đánh giá**
Run: `.\mvnw.cmd test -pl tv1-ai -Dtest=AcademicGoldenEvalTest`
Expected: PASS 100% các tiêu chí đã định nghĩa.

- [ ] **Step 4: Commit thay đổi Task 3**
```bash
git add tv1-ai/src/test/resources/eval/golden-academic-scenarios.json tv1-ai/src/test/java/vn/haui/advisor/ai/eval/AcademicGoldenEvalTest.java
git commit -m "test(ai): introduce automated golden academic eval pipeline with 10 real-world scenarios"
```

---

### Task 4: P2.1 Chuẩn hóa Prometheus Metrics qua Micrometer trong `AiMetricsCollector`

**Files:**
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/telemetry/AiMetricsCollector.java`
- Modify: `tv1-ai/src/test/java/vn/haui/advisor/ai/telemetry/AiMetricsCollectorTest.java`

**Interfaces:**
- Bổ sung constructor: `public AiMetricsCollector(io.micrometer.core.instrument.MeterRegistry meterRegistry)`
- Đăng ký các metrics Micrometer:
  - `ai.advisor.requests` (Counter: tags `mode`, `category`)
  - `ai.advisor.tokens` (Counter: tags `type=prompt/generation`)
  - `ai.advisor.latency` (Timer: tổng thời gian turn)
  - `ai.advisor.tool.duration` (Timer: tag `tool_name`)
  - `ai.advisor.guardrail.violations` (Counter: tag `reason`)
  - `ai.advisor.cost.usd` (Gauge)

- [ ] **Step 1: Viết test cho Micrometer integration trong `AiMetricsCollectorTest.java`**
Sử dụng `SimpleMeterRegistry` để kiểm tra khi `recordTurn`, `recordToolExecution`, `recordGuardrailViolation` được gọi, các Meters trong registry tăng giá trị tương ứng.

- [ ] **Step 2: Chạy test để xác nhận test FAIL**
Run: `.\mvnw.cmd test -pl tv1-ai -Dtest=AiMetricsCollectorTest#testMicrometerIntegration`

- [ ] **Step 3: Triển khai Micrometer binding trong `AiMetricsCollector.java`**
1. Bổ sung dependency `micrometer-core` (hoặc sử dụng qua Spring nếu đã có).
2. Inject optional `MeterRegistry` với `@Autowired(required = false)`.
3. Khi `recordTurn` được gọi, vừa cập nhật `LongAdder` nội bộ, vừa ghi nhận vào `MeterRegistry` nếu `meterRegistry != null`.

- [ ] **Step 4: Chạy toàn bộ test `AiMetricsCollectorTest`**
Run: `.\mvnw.cmd test -pl tv1-ai -Dtest=AiMetricsCollectorTest`
Expected: ALL PASS.

- [ ] **Step 5: Commit thay đổi Task 4**
```bash
git add tv1-ai/src/main/java/vn/haui/advisor/ai/telemetry/AiMetricsCollector.java tv1-ai/src/test/java/vn/haui/advisor/ai/telemetry/AiMetricsCollectorTest.java
git commit -m "feat(ai): integrate Micrometer Prometheus metrics into AiMetricsCollector"
```

---

### Task 5: P2.2 Cross-Session Student Fact Ledger (Sổ tay dữ kiện học tập dài hạn)

**Files:**
- Create: `tv5-platform/contracts/src/main/java/vn/haui/advisor/contracts/dto/StudentFactRecord.java`
- Create: `tv5-platform/contracts/src/main/java/vn/haui/advisor/contracts/ports/StudentFactStore.java`
- Create: `tv5-platform/contracts/src/main/java/vn/haui/advisor/contracts/fake/InMemoryStudentFactStore.java`
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/service/DefaultAdvisorFacade.java` (kết nối `StudentFactStore`, inject vào prompt context)
- Create: `tv1-ai/src/test/java/vn/haui/advisor/ai/conversation/StudentFactLedgerTest.java`

**Interfaces:**
- `StudentFactRecord(String studentId, BigDecimal targetCpa, String careerTrack, Integer maxCreditsPerSemester, Map<String, String> verifiedPreferences, Instant updatedAt)`
- `StudentFactStore`: `StudentFactRecord getFacts(String studentId)`, `void saveFacts(StudentFactRecord record)`
- Tích hợp vào `DefaultAdvisorFacade.buildPromptContext`: nạp block `<STUDENT_PREFERENCES>` an toàn.

- [ ] **Step 1: Tạo DTO và Port `StudentFactStore` trong `contracts`**
Tạo `StudentFactRecord.java`, `StudentFactStore.java`, `InMemoryStudentFactStore.java`.

- [ ] **Step 2: Viết test `StudentFactLedgerTest.java` trong `tv1-ai`**
Kiểm tra rằng:
- Lưu trữ mục tiêu học vụ (Target CPA 3.5, Track "Kỹ thuật phần mềm") trong phiên A.
- Khi sang phiên B, `DefaultAdvisorFacade` truy xuất được Fact Ledger này và chèn dữ kiện vào ngữ cảnh tư vấn mà không bị nhiễm bẩn thông tin từ các câu chat tự do.
- Đảm bảo tính cô lập giữa các sinh viên khác nhau.

- [ ] **Step 3: Triển khai tích hợp Fact Ledger vào `DefaultAdvisorFacade`**
Inject `StudentFactStore` (tùy chọn hoặc mặc định `InMemoryStudentFactStore`), format thành thẻ `<STUDENT_PREFERENCES>` khi chuẩn bị dữ liệu gửi cho AI Model.

- [ ] **Step 4: Chạy test `StudentFactLedgerTest` và toàn bộ test suite `tv1-ai`**
Run: `.\mvnw.cmd test -pl tv1-ai`
Expected: ALL PASS.

- [ ] **Step 5: Commit thay đổi Task 5**
```bash
git add tv5-platform/contracts/src/main/java/vn/haui/advisor/contracts/dto/StudentFactRecord.java tv5-platform/contracts/src/main/java/vn/haui/advisor/contracts/ports/StudentFactStore.java tv5-platform/contracts/src/main/java/vn/haui/advisor/contracts/fake/InMemoryStudentFactStore.java tv1-ai/src/main/java/vn/haui/advisor/ai/service/DefaultAdvisorFacade.java tv1-ai/src/test/java/vn/haui/advisor/ai/conversation/StudentFactLedgerTest.java
git commit -m "feat(ai): implement cross-session student fact ledger for persistent academic goals"
```

---

## Final Verification & Integration
- [ ] Chạy kiểm thử toàn bộ dự án: `.\mvnw.cmd clean test`
- [ ] Build cài đặt: `.\mvnw.cmd install -DskipTests`
- [ ] Khởi động backend và xác minh hệ thống hoạt động ổn định trên `http://localhost:8080`.

