# Subsystem Hardening (Memory Pollution, Indirect Injection & Financial APM) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai cơ chế chống nhiễm bẩn bộ nhớ (Memory Quarantine & Anti-Pollution), phòng vệ tiêm nhiễm chỉ thị gián tiếp qua RAG (Boundary Delimiters & Injection Filter), và giám sát tài chính token thời gian thực (USD & VND Financial Telemetry) cho hệ thống HaUI Academic Advisor.

**Architecture:** Sử dụng mô hình Tombstone Sanitization để cách ly các câu trả lời bị hallucinate nghiêm trọng khi nạp vào context lượt sau; bọc các chunk RAG trong thẻ XML `<evidence_chunk trust_level="external_passive_data">` kèm chỉ thị bất biến trong System Prompt; bổ sung công thức chuyển đổi tiền tệ VND và chi phí lượt trên `AiMetricsCollector`.

**Tech Stack:** Java 17, Spring Boot 3, Jackson, Apache Lucene, Google Gemini 2.5/1.5 API, JUnit 5, AssertJ.

**Spec:** [2026-11-15-subsystem-hardening-and-memory-pollution-defense.md](file:///e:/thuctapcosonganh/docs/superpowers/specs/2026-11-15-subsystem-hardening-and-memory-pollution-defense.md)

## Global Constraints
- Không xóa bỏ cấu trúc xen kẽ hợp lệ `user -> model` của Gemini API.
- Dữ liệu lưu trong Database giữ nguyên tính toàn vẹn (auditable history kèm warnings) và chỉ vô hiệu hóa ô nhiễm khi nạp vào prompt ngữ cảnh của mô hình.
- 100% các bài test hồi quy hiện hữu trong `tv1-ai` phải tiếp tục PASS.

## Review Focus
- Trường `quarantined` trong `ChatMessageHistoryItem` phải tương thích ngược khi deserializing các JSON cũ trong DB không có trường này.
- Khi một lượt trả lời của trợ lý bị gắn cờ `quarantined = true`, văn bản nạp vào Gemini ở lượt kế tiếp phải là `QUARANTINED_TOMBSTONE`, loại bỏ triệt để mọi số liệu bịa đặt.
- Các chunk RAG chứa chỉ thị gián tiếp dạng markdown/comment (`[SYSTEM INSTRUCTION]`, `<!-- ... -->`) phải bị loại bỏ và gắn cảnh báo `DATA_POISONING_SUSPECT`.
- Thẻ `<evidence_chunk>` phải bảo toàn đúng metadata (`id`, `source_id`, `section`, `trust_level`).
- Chi phí VND tính toán chính xác theo tỷ giá quy ước 25,400 VND/USD mà không gây lỗi chia cho 0.

---

### Task 1: Entity & Quarantine Logic in `ChatMessageHistoryItem` & `ResponseGroundingValidator`

**Files:**
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/conversation/ChatMessageHistoryItem.java`
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/grounding/ResponseGroundingValidator.java`
- Test: `tv1-ai/src/test/java/vn/haui/advisor/ai/memory/MemoryPollutionDefenseTest.java`

**Interfaces:**
- `ChatMessageHistoryItem`:
  - `public static final String QUARANTINED_TOMBSTONE`
  - `public boolean isQuarantined()`
  - `public void setQuarantined(Boolean quarantined)`
- `ResponseGroundingValidator`:
  - `public static boolean isSevereGroundingViolation(List<String> warnings)`

- [ ] **Step 1: Write failing unit test**
  Tạo file `tv1-ai/src/test/java/vn/haui/advisor/ai/memory/MemoryPollutionDefenseTest.java` kiểm tra `isSevereGroundingViolation` và JSON serialization của `quarantined`.

- [ ] **Step 2: Run test to verify failure**
  Chạy: `.\mvnw.cmd test -Dtest=MemoryPollutionDefenseTest#testQuarantineFieldAndViolationDetection -pl tv1-ai`
  Kỳ vọng: Lỗi biên dịch vì chưa có `isQuarantined` và `isSevereGroundingViolation`.

- [ ] **Step 3: Implement minimal code**
  - Cập nhật `ChatMessageHistoryItem.java` bổ sung `@JsonProperty("quarantined") private Boolean quarantined;` và getter/setter.
  - Cập nhật `ResponseGroundingValidator.java` bổ sung phương thức `isSevereGroundingViolation`.

- [ ] **Step 4: Run test to verify pass**
  Chạy: `.\mvnw.cmd test -Dtest=MemoryPollutionDefenseTest#testQuarantineFieldAndViolationDetection -pl tv1-ai`
  Kỳ vọng: Test PASS.

- [ ] **Step 5: Commit**
  `git add tv1-ai/src/main/java/vn/haui/advisor/ai/conversation/ChatMessageHistoryItem.java tv1-ai/src/main/java/vn/haui/advisor/ai/grounding/ResponseGroundingValidator.java tv1-ai/src/test/java/vn/haui/advisor/ai/memory/MemoryPollutionDefenseTest.java`
  `git commit -m "feat(ai): add memory quarantine entity fields and severe violation detector"`

---

### Task 2: Quarantine Integration in `DefaultAdvisorFacade` and `AdvisorStreamingService`

**Files:**
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/service/DefaultAdvisorFacade.java:410-425`
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/service/AdvisorStreamingService.java:298-312`
- Test: `tv1-ai/src/test/java/vn/haui/advisor/ai/memory/MemoryPollutionDefenseTest.java`

**Interfaces:**
- Khi lưu turn vào `conversationHistoryManager.saveTurn`:
  - Nếu `ResponseGroundingValidator.isSevereGroundingViolation(warnings)` là true, gọi `assistantHistoryItem.setQuarantined(true)`.

- [ ] **Step 1: Write failing test in `MemoryPollutionDefenseTest`**
  Viết test `testFacadeAndStreamingMarkQuarantinedOnSevereViolation`.

- [ ] **Step 2: Run test to verify failure**
  Chạy: `.\mvnw.cmd test -Dtest=MemoryPollutionDefenseTest#testFacadeAndStreamingMarkQuarantinedOnSevereViolation -pl tv1-ai`
  Kỳ vọng: FAIL vì Facade/Streaming chưa set flag `quarantined`.

- [ ] **Step 3: Update `DefaultAdvisorFacade.java` & `AdvisorStreamingService.java`**
  Thêm logic kiểm tra `isSevereGroundingViolation` trước khi nạp vào `saveTurn`.

- [ ] **Step 4: Run test to verify pass**
  Chạy: `.\mvnw.cmd test -Dtest=MemoryPollutionDefenseTest#testFacadeAndStreamingMarkQuarantinedOnSevereViolation -pl tv1-ai`
  Kỳ vọng: PASS.

- [ ] **Step 5: Commit**
  `git add tv1-ai/src/main/java/vn/haui/advisor/ai/service/DefaultAdvisorFacade.java tv1-ai/src/main/java/vn/haui/advisor/ai/service/AdvisorStreamingService.java tv1-ai/src/test/java/vn/haui/advisor/ai/memory/MemoryPollutionDefenseTest.java`
  `git commit -m "feat(ai): flag quarantined assistant turns in default facade and streaming service"`

---

### Task 3: Anti-Pollution Sanitization in `LiveAdvisorModel` History Formatting & Prompt Construction

**Files:**
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/model/LiveAdvisorModel.java:160-220,905-930`
- Test: `tv1-ai/src/test/java/vn/haui/advisor/ai/memory/MemoryPollutionDefenseTest.java`

**Interfaces:**
- `formatGeminiContents(List<ChatMessageHistoryItem> history, String userMessage)`
- `buildPrompt(AdvisorModelInput input)`

- [ ] **Step 1: Write failing test in `MemoryPollutionDefenseTest`**
  Viết test `testLiveAdvisorModelSanitizesQuarantinedHistoryItems` xác nhận tin nhắn có `isQuarantined == true` khi vào Gemini contents hoặc prompt sẽ chuyển thành `ChatMessageHistoryItem.QUARANTINED_TOMBSTONE`.

- [ ] **Step 2: Run test to verify failure**
  Chạy: `.\mvnw.cmd test -Dtest=MemoryPollutionDefenseTest#testLiveAdvisorModelSanitizesQuarantinedHistoryItems -pl tv1-ai`
  Kỳ vọng: FAIL vì LiveAdvisorModel chưa thay thế nội dung cách ly.

- [ ] **Step 3: Implement minimal code in `LiveAdvisorModel.java`**
  Trong `formatGeminiContents` và `buildPrompt`, kiểm tra `item.isQuarantined()`: nếu true, dùng `QUARANTINED_TOMBSTONE` thay cho `item.getContent()`.

- [ ] **Step 4: Run test to verify pass**
  Chạy: `.\mvnw.cmd test -Dtest=MemoryPollutionDefenseTest#testLiveAdvisorModelSanitizesQuarantinedHistoryItems -pl tv1-ai`
  Kỳ vọng: PASS.

- [ ] **Step 5: Commit**
  `git add tv1-ai/src/main/java/vn/haui/advisor/ai/model/LiveAdvisorModel.java tv1-ai/src/test/java/vn/haui/advisor/ai/memory/MemoryPollutionDefenseTest.java`
  `git commit -m "feat(ai): neutralize quarantined assistant messages in Gemini prompt assembly"`

---

### Task 4: Indirect Prompt Injection Defense in `EvidenceValidator`, `RagAdvisorService`, and `LiveAdvisorModel`

**Files:**
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/rag/grounding/EvidenceValidator.java`
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/rag/service/RagAdvisorService.java:270-295`
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/model/LiveAdvisorModel.java:30-40,860-875`
- Test: `tv1-ai/src/test/java/vn/haui/advisor/ai/rag/IndirectPromptInjectionDefenseTest.java`

**Interfaces:**
- `EvidenceValidator.isPotentialPromptInjection(String text)`
- `RagAdvisorService.buildFormattedPromptContext(List<VectorSearchResult> items)`
- `LiveAdvisorModel.buildPrompt(AdvisorModelInput input)`

- [ ] **Step 1: Write failing test in `IndirectPromptInjectionDefenseTest`**
  Kiểm tra phát hiện mẫu chỉ thị ẩn `[SYSTEM INSTRUCTION]`, `<system>`, `<!-- ... -->` và bao bọc thẻ `<evidence_chunk trust_level="external_passive_data">`.

- [ ] **Step 2: Run test to verify failure**
  Chạy: `.\mvnw.cmd test -Dtest=IndirectPromptInjectionDefenseTest -pl tv1-ai`
  Kỳ vọng: FAIL vì chưa có các mẫu regex và format thẻ mới.

- [ ] **Step 3: Implement minimal code**
  - Mở rộng regex trong `EvidenceValidator.java`.
  - Chuẩn hóa thẻ `<evidence_chunk>` trong `RagAdvisorService.java` và `LiveAdvisorModel.java`.
  - Bổ sung quy tắc bất biến trong `LiveAdvisorModel.SYSTEM_PROMPT`.

- [ ] **Step 4: Run test to verify pass**
  Chạy: `.\mvnw.cmd test -Dtest=IndirectPromptInjectionDefenseTest -pl tv1-ai`
  Kỳ vọng: PASS.

- [ ] **Step 5: Commit**
  `git add tv1-ai/src/main/java/vn/haui/advisor/ai/rag/grounding/EvidenceValidator.java tv1-ai/src/main/java/vn/haui/advisor/ai/rag/service/RagAdvisorService.java tv1-ai/src/main/java/vn/haui/advisor/ai/model/LiveAdvisorModel.java tv1-ai/src/test/java/vn/haui/advisor/ai/rag/IndirectPromptInjectionDefenseTest.java`
  `git commit -m "feat(ai): harden indirect prompt injection defense and RAG boundary delimiters"`

---

### Task 5: Enhanced Observability & Financial Telemetry in `AiMetricsCollector` and `AiTelemetrySnapshot`

**Files:**
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/telemetry/AiTelemetrySnapshot.java`
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/telemetry/AiMetricsCollector.java`
- Test: `tv1-ai/src/test/java/vn/haui/advisor/ai/telemetry/EnhancedObservabilityTelemetryTest.java`

**Interfaces:**
- `AiTelemetrySnapshot`:
  - `BigDecimal totalCostVnd()`
  - `BigDecimal averageCostPerTurnUsd()`
  - `BigDecimal averageCostPerTurnVnd()`
- `AiMetricsCollector`:
  - `public static final BigDecimal USD_TO_VND_RATE = BigDecimal.valueOf(25400)`

- [ ] **Step 1: Write failing test in `EnhancedObservabilityTelemetryTest`**
  Viết test kiểm tra tính toán chi phí VND và chi phí trung bình.

- [ ] **Step 2: Run test to verify failure**
  Chạy: `.\mvnw.cmd test -Dtest=EnhancedObservabilityTelemetryTest -pl tv1-ai`
  Kỳ vọng: FAIL vì thiếu các phương thức tính chi phí VND.

- [ ] **Step 3: Implement minimal code**
  Bổ sung tính toán vào `AiTelemetrySnapshot` và `AiMetricsCollector`.

- [ ] **Step 4: Run test to verify pass**
  Chạy: `.\mvnw.cmd test -Dtest=EnhancedObservabilityTelemetryTest -pl tv1-ai`
  Kỳ vọng: PASS.

- [ ] **Step 5: Commit**
  `git add tv1-ai/src/main/java/vn/haui/advisor/ai/telemetry/AiTelemetrySnapshot.java tv1-ai/src/main/java/vn/haui/advisor/ai/telemetry/AiMetricsCollector.java tv1-ai/src/test/java/vn/haui/advisor/ai/telemetry/EnhancedObservabilityTelemetryTest.java`
  `git commit -m "feat(ai): add VND currency conversion and turn-level financial observability"`

---

### Task 6: Full AI Module Regression Run

**Files:**
- Toàn bộ module `tv1-ai`

- [ ] **Step 1: Run full test suite**
  Chạy: `.\mvnw.cmd test -pl tv1-ai`
  Kỳ vọng: Toàn bộ 412+ tests đều PASS, 0 Failures, 0 Errors.

- [ ] **Step 2: Check git status and checkpoint commit**
  Xác nhận working tree sạch và ghi nhận trạng thái hoàn thành.

