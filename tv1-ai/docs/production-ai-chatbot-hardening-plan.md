# Production-Grade AI Chatbot Hardening & Anti-Hallucination Architecture Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện toàn diện hệ thống AI Chatbot tư vấn học vụ HaUI Advisor đạt chuẩn Production-Grade: loại bỏ triệt để ảo giác (zero-hallucination guarantee), khắc phục 100% các lỗ hổng kiến trúc và điểm nghẽn hiệu năng (Prompt History Blindness, InMemory RAG limitation, Sequential Embeddings, Heuristic Regex Routing), dọn dẹp toàn bộ code rác/code thừa và vượt qua mọi kiểm thử hồi quy.

**Architecture:** Giữ vững nguyên lý **Deterministic Rule-Orchestrated Hybrid AI**: 100% logic học thuật và tính điểm được giải bằng Java DAG trong `tv4-academic`; LLM (Gemini 2.5 Flash) hoạt động như một NLP Presentation & Synthesis engine trong khung an toàn XML thụ động (`<rag_evidence>`, `<academic_tool_results>`, `<student_context>`, `<conversation_history>`, `<user_query>`); lưu trữ vector bền vững trên PostgreSQL 16 `pgvector` với cơ chế chuyển đổi linh hoạt dual-mode H2/PostgreSQL; kết hợp Hybrid Search (Lexical + Cosine) và Reciprocal Rank Fusion (RRF); hậu kiểm tra số liệu nghiêm ngặt qua `ResponseGroundingValidator`.

**Tech Stack:** Java 21, Spring Boot 3.3.4, PostgreSQL 16 + pgvector, Spring JdbcTemplate, Google Gemini 2.5 REST API, Jackson 2.17, JUnit 5, AssertJ, Mockito, Flyway 10.

**Spec:** [tv1-ai/docs/production-ai-chatbot-hardening-plan.md](file:///E:/thuctapcosonganh/tv1-ai/docs/production-ai-chatbot-hardening-plan.md) (kèm báo cáo kiểm toán [production-ai-chatbot-audit-report.md](file:///E:/thuctapcosonganh/tv1-ai/docs/production-ai-chatbot-audit-report.md)).

---

## I. Global Constraints

1. **Ranh giới sở hữu (AGENTS.md):** Tuân thủ tuyệt đối quy định vai trò:
   - TV1 sở hữu `tv1-ai/` (gồm code AI, RAG, prompt, tokenizer, benchmark).
   - TV4 sở hữu `tv4-academic/` (gồm logic DAG, rules, quy chế tính điểm).
   - TV5 sở hữu `tv5-platform/` (gồm DB migrations, Spring Boot configuration, JPA/JDBC entities, Security).
   - Không vi phạm file nguồn bất biến `tv1-ai/docs/sources/`.
2. **Nguyên lý Chống Ảo Giác (Zero-Hallucination Mandate):**
   - Tuyệt đối không để LLM tự tính toán điểm CPA, GPA, số tín chỉ còn nợ hoặc điều kiện tiên quyết môn học. Mọi dữ liệu số phải xuất phát từ `tv4-academic` hoặc DB đã được xác thực qua `TrustedStudentContext`.
   - `ResponseGroundingValidator` là chốt chặn cuối cùng: phát hiện và ghi đè số liệu nếu LLM tự suy diễn sai lệch so với `academic_tool_results`.
3. **Dual-Mode Database Compatibility:**
   - Script di trú Flyway `V6__create_rag_chunks_pgvector.sql` phải chạy mượt mà trên cả PostgreSQL 16 (với extension `vector` và chỉ mục HNSW) lẫn H2 in-memory (sử dụng placeholders Flyway để bỏ qua HNSW/kiểu dữ liệu đặc thù khi chạy unit tests).
4. **Code Quality & Dead Code Floor:**
   - Không có code rác, không có biến thừa, không có import không sử dụng, không có phương thức mồ côi (`@SuppressWarnings` chỉ được dùng khi bất khả kháng với giải trình rõ ràng).
   - 100% test suite hiện tại (864 tests) và các test mới phải luôn PASS (Green).
5. **Bảo mật & Phân quyền:**
   - Toàn bộ câu truy vấn dữ liệu sinh viên bắt buộc dùng `TrustedStudentContext` lấy từ Spring Security Session. Không cho phép client truyền `studentId` tuỳ tiện qua body để vượt quyền.

---

## II. Review Focus

Năm failure modes / edge cases nguy hiểm nhất có thể làm hỏng trải nghiệm người dùng hoặc gây rò rỉ/sai lệch dữ liệu học vụ:

1. **Lỗ hổng đại từ quan hệ đa lượt (Multi-turn Coreference Blindness):** Sinh viên hỏi "Môn Cấu trúc dữ liệu có tiên quyết gì không?", sau đó hỏi tiếp "Môn đó mấy tín chỉ?". Nếu lịch sử không được nạp vào Prompt, bot sẽ trả lời chung chung hoặc từ chối do không biết "môn đó" là gì.
2. **Lệch cấu trúc bảng khi khởi chạy môi trường Test H2 (Flyway Vector Syntax Error):** Khi chạy `mvn test`, H2 Database ném lỗi cú pháp SQL `Unknown data type: "VECTOR"` nếu migration V6 không sử dụng placeholders cấu hình tương thích.
3. **Cạn kiệt Rate-Limit HTTP do gọi tuần tự (Batching Starvation):** Khi nạp 50 chunk văn bản quy chế vào `LiveEmbeddingProvider`, nếu gọi 50 request HTTP đơn lẻ nối tiếp, hệ thống sẽ bị Gemini API trả về mã lỗi 429 Too Many Requests và làm nghẽn thread pool.
4. **Trộn lẫn hoặc rò rỉ dữ liệu giữa các hội thoại (Cross-Conversation Memory Contamination):** Nếu `conversationId` bị giả mạo hoặc session bị đánh tráo, bot có thể đọc nhầm ngữ cảnh của sinh viên khác.
5. **Ảo giác mã học phần không tồn tại (Hallucinated Course Code):** LLM tự sinh mã môn học không có thật trong chương trình đào tạo HaUI (ví dụ: `IT9999`) khi tư vấn lộ trình.

---

## III. Detailed Tasks Breakdown

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TASK 1: Prompt & Conversational History Bounding (LiveAdvisorModel)         │
│ - Khắc phục Prompt History Blindness                                        │
│ - Tích hợp <conversation_history> an toàn                                   │
│ - Chống ảo giác đại từ chỉ định                                            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ TASK 2: High-Performance Batch Embedding (LiveEmbeddingProvider)            │
│ - Chuyển đổi tuần tự O(N) sang batchEmbedContents O(1)                      │
│ - Rate-limit backoff & Fallback an toàn                                     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ TASK 3: Persistent PostgreSQL pgvector Storage (Flyway V6 & Config)         │
│ - Tạo Flyway V6__create_rag_chunks_pgvector.sql                             │
│ - Cấu hình dual-mode placeholders (H2 / PostgreSQL)                         │
│ - Kích hoạt store-type=PGVECTOR trong AdvisorConfig                         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ TASK 4: Hybrid Search & Anti-Hallucination Guardrail Enhancement            │
│ - Bổ sung Lexical Match + Cosine Similarity + Reciprocal Rank Fusion (RRF)  │
│ - Mở rộng ResponseGroundingValidator kiểm tra Course Code & Tiên quyết      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ TASK 5: Intent Classifier Hardening & Dynamic Parameter Extraction          │
│ - Xóa bỏ hardcode học kỳ '2025_2' và target CPA                             │
│ - Trích xuất học kỳ động và xử lý đa ý định an toàn                         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ TASK 6: Dead Code, Redundancy & Warning Cleanup                             │
│ - Quét và loại bỏ dead code, unused imports, orphan variables               │
│ - Đảm bảo zero compilation warnings trên toàn bộ reactor                    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ TASK 7: Full Reactor Verification, Benchmark & Quality Gate                 │
│ - Chạy toàn bộ 864+ tests backend/frontend                                  │
│ - Chạy check-ownership.mjs và check-secrets.mjs                             │
│ - Bàn giao và lập báo cáo hoàn tất                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Task 1: Prompt & Conversational History Bounding (LiveAdvisorModel)

**Files:**
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/model/LiveAdvisorModel.java`
- Create: `tv1-ai/src/test/java/vn/haui/advisor/ai/model/LiveAdvisorModelPromptTest.java`

**Interfaces:**
- Consumes: `AdvisorModelInput.getHistory()`, `ChatMessageHistoryItem.getRole()`, `ChatMessageHistoryItem.getContent()`
- Produces: `LiveAdvisorModel.buildPrompt(AdvisorModelInput)` tạo chuỗi prompt XML bao gồm `<conversation_history>` đầy đủ và an toàn.

- [ ] **Step 1: Write the failing test**

Tạo test `tv1-ai/src/test/java/vn/haui/advisor/ai/model/LiveAdvisorModelPromptTest.java` kiểm tra `buildPrompt` phải chứa thẻ `<conversation_history>` với đầy đủ các lượt hội thoại trước đó và hướng dẫn giải quyết đại từ quan hệ:

```java
package vn.haui.advisor.ai.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.conversation.ChatMessageHistoryItem;
import vn.haui.advisor.contracts.dto.TrustedStudentContext;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class LiveAdvisorModelPromptTest {

    @Test
    @DisplayName("buildPrompt must contain conversation_history section with sanitized turns")
    void shouldIncludeFormattedConversationHistoryInPrompt() {
        LiveAdvisorModel model = new LiveAdvisorModel("dummy-key", "gemini-2.5-flash");

        TrustedStudentContext context = new TrustedStudentContext("SV001", "Nguyễn Văn A", "CNTT");
        List<ChatMessageHistoryItem> history = List.of(
                ChatMessageHistoryItem.ofUser("Môn IT6015 có tiên quyết gì không?"),
                ChatMessageHistoryItem.ofAssistant("Môn IT6015 yêu cầu tiên quyết IT6011.", List.of(), List.of(), null, List.of())
        );

        AdvisorModelInput input = new AdvisorModelInput(
                "Môn đó bao nhiêu tín chỉ?",
                context,
                Map.of(),
                null,
                history,
                null
        );

        String prompt = model.buildPrompt(input);

        assertThat(prompt).contains("<conversation_history>");
        assertThat(prompt).contains("<turn role=\"user\">Môn IT6015 có tiên quyết gì không?</turn>");
        assertThat(prompt).contains("<turn role=\"assistant\">Môn IT6015 yêu cầu tiên quyết IT6011.</turn>");
        assertThat(prompt).contains("</conversation_history>");
        assertThat(prompt).contains("<user_query>\nMôn đó bao nhiêu tín chỉ?\n</user_query>");
    }

    @Test
    @DisplayName("buildPrompt handles null or empty history gracefully")
    void shouldHandleEmptyHistoryGracefully() {
        LiveAdvisorModel model = new LiveAdvisorModel("dummy-key", "gemini-2.5-flash");
        TrustedStudentContext context = new TrustedStudentContext("SV001", "Nguyễn Văn A", "CNTT");
        AdvisorModelInput input = new AdvisorModelInput("Xin chào", context, Map.of());

        String prompt = model.buildPrompt(input);

        assertThat(prompt).contains("<conversation_history>");
        assertThat(prompt).contains("KHÔNG CÓ LỊCH SỬ HỘI THOẠI TRƯỚC ĐÓ.");
        assertThat(prompt).contains("</conversation_history>");
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.\mvnw.cmd test -pl tv1-ai -Dtest=LiveAdvisorModelPromptTest`  
Expected: FAIL với assertion lỗi vì hiện tại `LiveAdvisorModel.buildPrompt` không tạo `<conversation_history>`.

- [ ] **Step 3: Write minimal implementation**

Cập nhật `tv1-ai/src/main/java/vn/haui/advisor/ai/model/LiveAdvisorModel.java`:
1. Thêm chỉ dẫn vào `SYSTEM_PROMPT`:
   `"- Khi nhận được <conversation_history>, hãy phân giải chính xác các đại từ quan hệ (như 'môn đó', 'học kỳ đó', 'kết quả trên') dựa trên các lượt trao đổi trước. Tuyệt đối không suy diễn sang thông tin ngoài ngữ cảnh.\n"`
2. Cập nhật `buildPrompt(AdvisorModelInput input)` để chèn `<conversation_history>` trước `<user_query>`:

```java
        sb.append("<conversation_history>\n");
        if (input != null && input.getHistory() != null && !input.getHistory().isEmpty()) {
            for (ChatMessageHistoryItem item : input.getHistory()) {
                String role = (item.getRole() != null && !item.getRole().isBlank()) ? item.getRole().trim() : "user";
                String content = item.getContent() != null ? item.getContent().trim() : "";
                sb.append(String.format("<turn role=\"%s\">%s</turn>\n", role, content));
            }
        } else {
            sb.append("KHÔNG CÓ LỊCH SỬ HỘI THOẠI TRƯỚC ĐÓ.\n");
        }
        sb.append("</conversation_history>\n\n");
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.\mvnw.cmd test -pl tv1-ai -Dtest=LiveAdvisorModelPromptTest`  
Expected: BUILD SUCCESS, tất cả các test trong `LiveAdvisorModelPromptTest` đều PASS.

- [ ] **Step 5: Commit**

```bash
git add tv1-ai/src/main/java/vn/haui/advisor/ai/model/LiveAdvisorModel.java tv1-ai/src/test/java/vn/haui/advisor/ai/model/LiveAdvisorModelPromptTest.java
git commit -m "fix(tv1): format conversation history into LiveAdvisorModel prompt to resolve multi-turn coreference"
```

---

### Task 2: High-Performance Batch Embedding (LiveEmbeddingProvider)

**Files:**
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/rag/embedding/LiveEmbeddingProvider.java`
- Modify: `tv1-ai/src/test/java/vn/haui/advisor/ai/rag/embedding/LiveEmbeddingProviderTest.java`

**Interfaces:**
- Consumes: `List<String> texts`
- Produces: `List<float[]> embedAll(List<String> texts)` gửi batch request đơn lẻ (tối đa 100 chunks/request) thay vì vòng lặp $N$ HTTP requests.

- [ ] **Step 1: Write the failing test**

Bổ sung test trong `tv1-ai/src/test/java/vn/haui/advisor/ai/rag/embedding/LiveEmbeddingProviderTest.java` xác nhận `embedAll` gửi request theo batch và xử lý chính xác mảng vector trả về:

```java
    @Test
    @DisplayName("embedAll executes batch embedding for multiple texts without sequential single calls")
    void shouldExecuteBatchEmbeddingEfficiently() {
        AtomicInteger callCount = new AtomicInteger(0);
        LiveEmbeddingProvider provider = new LiveEmbeddingProvider("test-key", "text-embedding-004", 768);
        provider.setCustomBatchEmbedder(texts -> {
            callCount.incrementAndGet();
            List<float[]> list = new ArrayList<>();
            for (int i = 0; i < texts.size(); i++) {
                list.add(new float[768]);
            }
            return list;
        });

        List<float[]> embeddings = provider.embedAll(List.of("Văn bản 1", "Văn bản 2", "Văn bản 3"));

        assertThat(embeddings).hasSize(3);
        assertThat(callCount.get()).isEqualTo(1); // Chỉ gọi đúng 1 lần duy nhất cho toàn bộ batch
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.\mvnw.cmd test -pl tv1-ai -Dtest=LiveEmbeddingProviderTest`  
Expected: FAIL vì `setCustomBatchEmbedder` chưa được khai báo hoặc `embedAll` vẫn lặp từng phần tử.

- [ ] **Step 3: Write minimal implementation**

Cập nhật `LiveEmbeddingProvider.java`:
1. Thêm hook `Function<List<String>, List<float[]>> customBatchEmbedder` cho testability.
2. Cập nhật `embedAll(List<String> texts)`:
   - Nếu `customBatchEmbedder != null`, gọi batch embedder.
   - Nếu gọi HTTP trực tiếp với Gemini API, phân nhóm batch tối đa 100 phần tử/lần gọi:
     - Tạo payload JSON:
       ```json
       {
         "requests": [
           { "model": "models/text-embedding-004", "content": { "parts": [{ "text": "..." }] } }
         ]
       }
       ```
     - Gửi đến endpoint `:batchEmbedContents?key=...`.
     - Trích xuất danh sách `embeddings[i].values`.

- [ ] **Step 4: Run test to verify it passes**

Run: `.\mvnw.cmd test -pl tv1-ai -Dtest=LiveEmbeddingProviderTest`  
Expected: BUILD SUCCESS, tất cả các test trong `LiveEmbeddingProviderTest` đều PASS.

- [ ] **Step 5: Commit**

```bash
git add tv1-ai/src/main/java/vn/haui/advisor/ai/rag/embedding/LiveEmbeddingProvider.java tv1-ai/src/test/java/vn/haui/advisor/ai/rag/embedding/LiveEmbeddingProviderTest.java
git commit -m "perf(tv1): implement batchEmbedContents in LiveEmbeddingProvider to eliminate sequential HTTP overhead"
```

---

### Task 3: Persistent PostgreSQL pgvector Storage (Flyway V6 & Config)

**Files:**
- Create: `tv5-platform/app/src/main/resources/db/migration/V6__create_rag_chunks_pgvector.sql`
- Modify: `tv5-platform/app/src/main/resources/application.properties`
- Modify: `tv5-platform/app/src/test/resources/application-test.properties`
- Modify: `tv5-platform/app/src/main/java/vn/haui/advisor/platform/config/AdvisorConfig.java`
- Create: `tv5-platform/app/src/test/java/vn/haui/advisor/platform/config/AdvisorConfigPgVectorTest.java`

**Interfaces:**
- Consumes: `ai.rag.store-type=PGVECTOR`, `JdbcTemplate`
- Produces: `RagAdvisorService` bean sử dụng `PgVectorStoreAdapter` khi chạy ở chế độ PGVECTOR, tự động fallback sang `InMemoryVectorStore` khi chạy H2 test profile.

- [ ] **Step 1: Write the Flyway V6 migration script**

Tạo `tv5-platform/app/src/main/resources/db/migration/V6__create_rag_chunks_pgvector.sql`:
```sql
-- ==============================================================================
-- HaUI Advisor Platform - V6 Schema Migration
-- Module: tv5-platform & tv1-ai
-- Scope: Persistent Storage cho RAG Knowledge Base với pgvector
-- Compatible with: PostgreSQL 16 (+ pgvector extension) & H2 (PostgreSQL Mode)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS rag_chunks (
    chunk_id VARCHAR(128) PRIMARY KEY,
    source_id VARCHAR(128) NOT NULL,
    title VARCHAR(256),
    section VARCHAR(256),
    version VARCHAR(64),
    reference_url VARCHAR(512),
    content TEXT NOT NULL,
    chunk_index INT NOT NULL,
    token_estimate INT NOT NULL,
    embedding ${vector_column_type}
);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_source_id ON rag_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_version ON rag_chunks(version);
${vector_index_hnsw}
```

- [ ] **Step 2: Configure Flyway Placeholders for Dual-Mode Compatibility**

Cập nhật `tv5-platform/app/src/main/resources/application.properties`:
```properties
spring.flyway.placeholders.vector_column_type=${FLYWAY_VECTOR_TYPE:vector(768)}
spring.flyway.placeholders.vector_index_hnsw=${FLYWAY_VECTOR_INDEX:CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding_cosine ON rag_chunks USING hnsw (embedding vector_cosine_ops);}
```

Cập nhật `tv5-platform/app/src/test/resources/application-test.properties`:
```properties
spring.flyway.placeholders.vector_column_type=OTHER
spring.flyway.placeholders.vector_index_hnsw=-- test db: hnsw vector index skipped
```

- [ ] **Step 3: Update AdvisorConfig.java to Support PGVECTOR StoreType**

Cập nhật `tv5-platform/app/src/main/java/vn/haui/advisor/platform/config/AdvisorConfig.java`:
Thay vì ném `IllegalStateException`, tiêm `ObjectProvider<JdbcTemplate> jdbcTemplateProvider`:
```java
        VectorStore store;
        if (rag.getStoreType() == AiProperties.RagProperties.StoreType.PGVECTOR) {
            JdbcTemplate jdbcTemplate = jdbcTemplateProvider.getIfAvailable();
            if (jdbcTemplate != null) {
                store = new PgVectorStoreAdapter(jdbcTemplate);
            } else {
                throw new IllegalStateException("ai.rag.store-type=PGVECTOR requires a valid JdbcTemplate bean.");
            }
        } else {
            store = new InMemoryVectorStore();
        }
```

- [ ] **Step 4: Run Platform Tests to Verify Flyway Migration and Context Startup**

Run: `.\mvnw.cmd test -pl tv5-platform/app -am`  
Expected: BUILD SUCCESS (101/101 tests passed, migration V6 executed seamlessly in H2).

- [ ] **Step 5: Commit**

```bash
git add tv5-platform/app/src/main/resources/db/migration/V6__create_rag_chunks_pgvector.sql tv5-platform/app/src/main/resources/application.properties tv5-platform/app/src/test/resources/application-test.properties tv5-platform/app/src/main/java/vn/haui/advisor/platform/config/AdvisorConfig.java
git commit -m "feat(tv5): add V6 Flyway migration for rag_chunks and enable pgvector persistence in AdvisorConfig"
```

---

### Task 4: Hybrid Search & Anti-Hallucination Guardrail Enhancement

**Files:**
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/rag/retrieval/RagRetriever.java`
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/guardrail/ResponseGroundingValidator.java`
- Modify: `tv1-ai/src/test/java/vn/haui/advisor/ai/guardrail/ResponseGroundingValidatorTest.java`

**Interfaces:**
- Consumes: `Raw Query`, `CatalogReader`, `AcademicToolResults`
- Produces: `RagRetriever` thực hiện xếp hạng kết hợp (Hybrid Search + Reciprocal Rank Fusion); `ResponseGroundingValidator` kiểm tra nghiêm ngặt mã môn học và quan hệ tiên quyết trước khi xuất phản hồi cho sinh viên.

- [ ] **Step 1: Write the failing test for Course Code Guardrail**

Bổ sung test trong `tv1-ai/src/test/java/vn/haui/advisor/ai/guardrail/ResponseGroundingValidatorTest.java`:
Nếu LLM tự ý bịa ra mã môn học (ví dụ: `IT9999`) không có trong kết quả trả về từ công cụ học vụ hoặc catalog văn bản, validator phải phát hiện và đính kèm cảnh báo `UNGROUNDED_COURSE_CODE: IT9999`:

```java
    @Test
    @DisplayName("Validator must flag hallucinated course codes not present in tool results or evidence")
    void shouldFlagHallucinatedCourseCodes() {
        ResponseGroundingValidator validator = new ResponseGroundingValidator();
        AdvisorModelOutput rawOutput = new AdvisorModelOutput(
                "Bạn nên học môn IT9999 để cải thiện điểm số.",
                List.of(),
                List.of(),
                null,
                List.of()
        );

        AdvisorModelOutput validated = validator.validate(rawOutput, null, Map.of());

        assertThat(validated.getWarnings()).anyMatch(w -> w.contains("UNGROUNDED_COURSE_CODE") && w.contains("IT9999"));
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.\mvnw.cmd test -pl tv1-ai -Dtest=ResponseGroundingValidatorTest`  
Expected: FAIL vì validator hiện tại chỉ kiểm tra số liệu CPA/GPA chứ chưa kiểm tra mã học phần bịa đặt.

- [ ] **Step 3: Write minimal implementation**

1. Trong `ResponseGroundingValidator.java`:
   - Trích xuất toàn bộ regex `[A-Z]{2,4}[0-9]{4}` xuất hiện trong câu trả lời.
   - Tập hợp danh sách các mã môn hợp lệ từ `toolResults` và `groundedContext.getEvidenceChunks()`.
   - Nếu có mã môn xuất hiện trong câu trả lời nhưng không nằm trong tập hợp hợp lệ, gắn cảnh báo `UNGROUNDED_COURSE_CODE: [MÃ_MÔN]` vào danh sách cảnh báo.
2. Trong `RagRetriever.java`:
   - Nếu câu truy vấn chứa các từ khóa định danh cụ thể (như `"Điều 14"`, `"Khoản 2"`, mã học phần cụ thể), tăng trọng số ưu tiên điểm lexical (Exact Keyword Match Boost) vào kết quả Cosine Similarity thông qua công thức Reciprocal Rank Fusion:
     $$RRF(d) = \frac{1}{60 + rank_{vector}(d)} + \frac{1}{60 + rank_{keyword}(d)}$$

- [ ] **Step 4: Run test to verify it passes**

Run: `.\mvnw.cmd test -pl tv1-ai -Dtest=ResponseGroundingValidatorTest`  
Expected: BUILD SUCCESS, tất cả các bài kiểm tra đều PASS.

- [ ] **Step 5: Commit**

```bash
git add tv1-ai/src/main/java/vn/haui/advisor/ai/rag/retrieval/RagRetriever.java tv1-ai/src/main/java/vn/haui/advisor/ai/guardrail/ResponseGroundingValidator.java tv1-ai/src/test/java/vn/haui/advisor/ai/guardrail/ResponseGroundingValidatorTest.java
git commit -m "feat(tv1): enhance Hybrid Search ranking and add hallucinated course code detection in ResponseGroundingValidator"
```

---

### Task 5: Intent Classifier Hardening & Dynamic Parameter Extraction

**Files:**
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/intent/IntentClassifier.java`
- Modify: `tv1-ai/src/test/java/vn/haui/advisor/ai/intent/IntentClassifierTest.java`

**Interfaces:**
- Consumes: `userMessage`, `conversationHistory`
- Produces: `ParsedUserIntent` với học kỳ được trích xuất động theo năm thực tế, hỗ trợ multi-intent an toàn và ReDoS-safe regex.

- [ ] **Step 1: Write the failing test**

Bổ sung test trong `tv1-ai/src/test/java/vn/haui/advisor/ai/intent/IntentClassifierTest.java` kiểm tra việc nhận diện học kỳ động và xử lý câu hỏi hỗn hợp:

```java
    @Test
    @DisplayName("classify extracts dynamic semester patterns like 2024_1, 2024_2, 2025_1 without hardcoding")
    void shouldExtractDynamicSemesterPattern() {
        IntentClassifier classifier = new IntentClassifier();
        ParsedUserIntent intent = classifier.classify("Lập kế hoạch cho kỳ 1 năm học 2025-2026 với 18 tín chỉ");

        assertThat(intent.getTargetSemester()).isEqualTo("2025_1");
        assertThat(intent.getMaxCredits()).isEqualTo(18);
        assertThat(intent.getCategory()).isEqualTo(ParsedUserIntent.ScenarioCategory.STUDY_PLAN);
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.\mvnw.cmd test -pl tv1-ai -Dtest=IntentClassifierTest`  
Expected: FAIL nếu pattern regex không bắt đúng định dạng kỳ 1 năm học 2025-2026 thành `2025_1`.

- [ ] **Step 3: Write minimal implementation**

Cập nhật `IntentClassifier.java`:
1. Chuẩn hóa `SEMESTER_PATTERN`:
   `Pattern.compile("(?:học kỳ|kỳ)\\s*([123]|hè)\\s*(?:năm học)?\\s*(\\d{4})[-_](\\d{4})?", Pattern.CASE_INSENSITIVE)`
2. Xây dựng logic chuyển đổi linh hoạt: nếu người dùng nói `"kỳ 1 năm 2025-2026"` $\rightarrow$ trả về `"2025_1"`. Nếu người dùng chỉ nói `"kỳ tới"`, lấy học kỳ hiện tại theo mốc thời gian thực thay vì gán cứng `"2025_2"`.
3. Tối ưu các biểu thức regex bằng cách sử dụng các atomic grouping / character classes rõ ràng để ngăn ngừa rủi ro ReDoS.

- [ ] **Step 4: Run test to verify it passes**

Run: `.\mvnw.cmd test -pl tv1-ai -Dtest=IntentClassifierTest`  
Expected: BUILD SUCCESS, tất cả các test case phân loại intent đều PASS.

- [ ] **Step 5: Commit**

```bash
git add tv1-ai/src/main/java/vn/haui/advisor/ai/intent/IntentClassifier.java tv1-ai/src/test/java/vn/haui/advisor/ai/intent/IntentClassifierTest.java
git commit -m "refactor(tv1): harden IntentClassifier with dynamic semester extraction and ReDoS-safe patterns"
```

---

### Task 6: Dead Code, Redundancy & Warning Cleanup

**Files:**
- Scan & Cleanup across: `tv1-ai/`, `tv4-academic/`, `tv5-platform/`

**Interfaces:**
- Consumes: Toàn bộ codebase Java
- Produces: Mã nguồn sạch sẽ, không có unused imports, không có dead variables, không có phương thức không bao giờ được gọi.

- [ ] **Step 1: Check compiler warnings across reactor**

Run: `.\mvnw.cmd clean compile -Xlint:all` (hoặc kiểm tra warnings trong quá trình compile).  
Xác định các warnings về unused imports, unread private fields, hoặc deprecated methods.

- [ ] **Step 2: Clean up dead code and redundant files**

1. Xóa các unused imports và unreferenced local variables trong `tv1-ai` và `tv5-platform`.
2. Kiểm tra các class stub hoặc temporary code phát sinh trong quá trình thử nghiệm.
3. Giữ nguyên toàn bộ comment nghiệp vụ và Javadoc quan trọng theo quy định `<guidelines>`.

- [ ] **Step 3: Recompile and ensure zero warnings**

Run: `.\mvnw.cmd test-compile`  
Expected: BUILD SUCCESS không phát sinh lỗi hoặc cảnh báo nghiêm trọng.

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "chore: purge redundant code and clean up unused imports across reactor"
```

---

### Task 7: Full Reactor Verification, Benchmark & Quality Gate

**Files:**
- Test all modules: `tv1-ai`, `tv4-academic`, `tv5-platform/app`, `tv5-platform/contracts`
- Script: `scripts/check-ownership.mjs`, `scripts/check-secrets.mjs`

- [ ] **Step 1: Run Full Backend Test Suite**

Run: `.\mvnw.cmd test`  
Expected: BUILD SUCCESS. Toàn bộ hơn 730 tests backend (gồm `haui-contracts`, `haui-ai`, `haui-academic`, `haui-platform-app`) phải vượt qua $100\%$ không có lỗi hay lỗi flakiness.

- [ ] **Step 2: Run Full Frontend Test Suite**

Run: `npm test`  
Expected: Toàn bộ 134 tests frontend (gồm `tv2-web` và `tv3-planner-ui`) phải PASS.

- [ ] **Step 3: Run Ownership & Secret Guardrails**

Run:
```bash
node scripts/check-ownership.mjs
npm run check:secrets
```
Expected: Cả 2 checks đều thông báo `PASSED`.

- [ ] **Step 4: Update Documentation & Release Notes**

Cập nhật trạng thái trong [tv1-ai/docs/task-5.2d-ai-report.md](file:///E:/thuctapcosonganh/tv1-ai/docs/task-5.2d-ai-report.md) phản ánh các cải tiến sản phẩm đã hoàn thành.

- [ ] **Step 5: Final Git Commit & Summary**

```bash
git add tv1-ai/docs/
git commit -m "docs(tv1): update AI smoke report and audit status with production hardening completion"
```
