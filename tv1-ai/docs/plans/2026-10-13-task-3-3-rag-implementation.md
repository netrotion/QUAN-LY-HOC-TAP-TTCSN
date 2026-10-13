# HaUI Advisor Task 3.3 — RAG & Source Reading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai hoàn chỉnh, độc lập và có kiểm chứng phân hệ RAG (Retrieval-Augmented Generation) đọc dữ liệu từ 5 tài liệu quy chế chính thức (`REG-HAUI-01..05`), tuân thủ 100% Task 2.4 Contracts V1 và các quy tắc Ground-Truth của HaUI Advisor.

**Architecture:** Kiến trúc RAG dạng module phân lớp theo chuẩn Clean Architecture:
`Document Ingestion` (Markdown Parser + Semantic Chunker + Source Catalog Validator) 
$\rightarrow$ `Embedding Provider` (Deterministic Fake & Configurable Live abstraction) 
$\rightarrow$ `Vector Store` (In-Memory Cosine Store + PostgreSQL/pgvector Adapter) 
$\rightarrow$ `Retriever` (Vietnamese Query Normalizer + Semantic Cosine Matcher + TopK & Threshold Filter) 
$\rightarrow$ `Evidence Validator & Citation Grounder` (Strict Catalog Mapping + Anti-Hallucination Guardrails).

**Tech Stack:** Java 21, Spring Boot 3.3.4, Jackson 2.17.2, JUnit 5, AssertJ, pgvector 0.1.6, Spring JDBC.

**Spec:** `tv1-ai/docs/task-3.3-architecture-audit.md`, `tv1-ai/specs/task-2.2e-chat-spec.md`, `tv5-platform/contracts/openapi/openapi-v1.yaml`.

## Global Constraints

- Phạm vi ghi được cấp phép duy nhất: `tv1-ai/**`. Tuyệt đối không chỉnh sửa contracts hay mã nguồn phân hệ khác.
- Tuyệt đối không bịa đặt nguồn hoặc dùng source ID giả lập cũ (`SRC-MOCK-POLICY`, `MOCK`, `FAKE`, `FIXTURE`, `DEMO`).
- Dữ liệu quy chế gốc: 100% sử dụng 5 file trong `data-source/documents/**` (`REG-HAUI-01` đến `REG-HAUI-05`).
- Danh mục nguồn hợp lệ: `tv1-ai/src/main/resources/rag/source-catalog.json`.
- Mã hóa ký tự: 100% UTF-8 tiếng Việt nguyên vẹn; bảo toàn bảng Markdown và công thức toán học LaTeX (`\text{GPA}`, `\text{CPA}`, `\text{ROI}`).
- Định danh chunk: Ổn định và tất định (`{sourceId}#{sectionSlug}#{chunkIndex}`).
- Cô lập dữ liệu: Tuyệt đối không index thông tin cá nhân sinh viên hoặc bảng điểm vào kho vector dùng chung.
- Bảo đảm an toàn SQL: Mọi truy vấn pgvector phải sử dụng tham số hóa (`?`), nghiêm cấm nối chuỗi SQL.
- Không fallback ngầm (No silent fallback): Live mode thiếu cấu hình hoặc lỗi phải ném ngoại lệ rõ ràng, không được tự động chuyển về mock.
- Tương thích Contracts V1: Trích dẫn trả về kiểu `ChatSourceItem`, nguồn không đủ chứng cứ (`NO_EVIDENCE`) phải trả về `sources: []`.

## Review Focus

1. **Missing / Malformed Markdown files:** File không tồn tại hoặc bị lỗi định dạng phải báo lỗi `IllegalArgumentException` / `IllegalStateException` an toàn, không làm sập ứng dụng.
2. **Vietnamese diacritics & accent handling:** Câu truy vấn có hoặc không có dấu tiếng Việt, viết hoa/viết thường đều phải truy xuất đúng văn bản quy chế liên quan.
3. **Out-of-scope / Adversarial queries:** Câu hỏi ngoài phạm vi quy chế (thời tiết, giải trí, prompt injection) phải trả về `NO_EVIDENCE` và `sources: []`.
4. **Repeat indexing idempotency:** Index lại nhiều lần cùng một tài liệu không được làm nhân đôi bản ghi trong VectorStore.
5. **Prompt Injection in retrieved chunks:** Văn bản tài liệu không được phép chèn lệnh ghi đè vai trò hệ thống hoặc chỉ thị của LLM.

---

### Task 1: Catalog Schema & Pom Dependencies Update

**Files:**
- Create: `tv1-ai/src/main/resources/rag/source-catalog.schema.json`
- Modify: `tv1-ai/pom.xml`
- Test: `tv1-ai/src/test/java/vn/haui/advisor/ai/rag/CatalogSchemaValidationTest.java`

**Interfaces:**
- Produces: JSON Schema Draft-07 for `source-catalog.json`; dependencies `spring-jdbc`, `pgvector`, `jackson-databind`.

- [ ] **Step 1: Write failing test for catalog schema**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Create `source-catalog.schema.json` and update `tv1-ai/pom.xml`**
- [ ] **Step 4: Run test and `mvn compile` to verify it passes**

---

### Task 2: Document Ingestion & Semantic Chunker (Sub-Agent B)

**Files:**
- Create: `tv1-ai/src/main/java/vn/haui/advisor/ai/rag/model/RagDocument.java`
- Create: `tv1-ai/src/main/java/vn/haui/advisor/ai/rag/model/RagChunk.java`
- Create: `tv1-ai/src/main/java/vn/haui/advisor/ai/rag/model/CatalogSourceEntry.java`
- Create: `tv1-ai/src/main/java/vn/haui/advisor/ai/rag/ingestion/RagCatalogReader.java`
- Create: `tv1-ai/src/main/java/vn/haui/advisor/ai/rag/ingestion/MarkdownDocumentReader.java`
- Create: `tv1-ai/src/main/java/vn/haui/advisor/ai/rag/ingestion/SemanticChunker.java`
- Create: `tv1-ai/src/main/java/vn/haui/advisor/ai/rag/ingestion/RagIngestionService.java`
- Test: `tv1-ai/src/test/java/vn/haui/advisor/ai/rag/ingestion/SemanticChunkerTest.java`
- Test: `tv1-ai/src/test/java/vn/haui/advisor/ai/rag/ingestion/RagIngestionServiceTest.java`

**Interfaces:**
- Consumes: `source-catalog.json`, `data-source/documents/*.md`
- Produces: `List<RagChunk>` with stable chunk IDs, hierarchical section titles, preserved tables/formulas, and catalog metadata.

- [ ] **Step 1: Write failing tests for Markdown parsing, heading preservation, table/formula integrity, and chunking**
- [ ] **Step 2: Run tests to verify failure**
- [ ] **Step 3: Implement `RagCatalogReader`, `MarkdownDocumentReader`, `SemanticChunker`, and `RagIngestionService`**
- [ ] **Step 4: Run tests to verify all 5 real documents parse and chunk cleanly**

---

### Task 3: Embedding Provider & Vector Infrastructure (Sub-Agent C)

**Files:**
- Create: `tv1-ai/src/main/java/vn/haui/advisor/ai/rag/embedding/EmbeddingProvider.java`
- Create: `tv1-ai/src/main/java/vn/haui/advisor/ai/rag/embedding/DeterministicFakeEmbeddingProvider.java`
- Create: `tv1-ai/src/main/java/vn/haui/advisor/ai/rag/vector/VectorStore.java`
- Create: `tv1-ai/src/main/java/vn/haui/advisor/ai/rag/vector/VectorSearchResult.java`
- Create: `tv1-ai/src/main/java/vn/haui/advisor/ai/rag/vector/InMemoryVectorStore.java`
- Create: `tv1-ai/src/main/java/vn/haui/advisor/ai/rag/vector/PgVectorStoreAdapter.java`
- Test: `tv1-ai/src/test/java/vn/haui/advisor/ai/rag/embedding/DeterministicFakeEmbeddingTest.java`
- Test: `tv1-ai/src/test/java/vn/haui/advisor/ai/rag/vector/InMemoryVectorStoreTest.java`
- Test: `tv1-ai/src/test/java/vn/haui/advisor/ai/rag/vector/PgVectorStoreAdapterTest.java`

**Interfaces:**
- Consumes: `RagChunk`, query string
- Produces: `float[]` embedding vectors; Vector search results with cosine similarity score and metadata filtering.

- [ ] **Step 1: Write failing tests for Fake Embedding determinism and VectorStore upsert/search/filtering**
- [ ] **Step 2: Run tests to verify failure**
- [ ] **Step 3: Implement `EmbeddingProvider`, `DeterministicFakeEmbeddingProvider`, `VectorStore`, `InMemoryVectorStore`, and `PgVectorStoreAdapter`**
- [ ] **Step 4: Run tests to verify idempotency, search ranking, and metadata filtering**

---

### Task 4: Retrieval & Citation Grounding (Sub-Agent D)

**Files:**
- Create: `tv1-ai/src/main/java/vn/haui/advisor/ai/rag/retrieval/VietnameseQueryNormalizer.java`
- Create: `tv1-ai/src/main/java/vn/haui/advisor/ai/rag/retrieval/RagRetriever.java`
- Create: `tv1-ai/src/main/java/vn/haui/advisor/ai/rag/retrieval/RetrievalResult.java`
- Create: `tv1-ai/src/main/java/vn/haui/advisor/ai/rag/grounding/CitationGrounder.java`
- Create: `tv1-ai/src/main/java/vn/haui/advisor/ai/rag/grounding/EvidenceValidator.java`
- Create: `tv1-ai/src/main/java/vn/haui/advisor/ai/rag/service/RagAdvisorService.java`
- Test: `tv1-ai/src/test/java/vn/haui/advisor/ai/rag/retrieval/RagRetrieverTest.java`
- Test: `tv1-ai/src/test/java/vn/haui/advisor/ai/rag/grounding/CitationGrounderTest.java`

**Interfaces:**
- Consumes: `userMessage`, `VectorStore`, `EmbeddingProvider`
- Produces: `List<ChatSourceItem>`, grounded prompt context, `NO_EVIDENCE` flag.

- [ ] **Step 1: Write failing tests for Vietnamese query retrieval on the 5 canonical regulation queries and out-of-scope query**
- [ ] **Step 2: Run tests to verify failure**
- [ ] **Step 3: Implement `VietnameseQueryNormalizer`, `RagRetriever`, `EvidenceValidator`, and `CitationGrounder`**
- [ ] **Step 4: Run tests to verify exact source citations (`REG-HAUI-01..05`) and empty sources on out-of-scope queries**

---

### Task 5: Spring Configuration & Facade Integration (Lead Orchestrator)

**Files:**
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/config/AiProperties.java`
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/config/AiAutoConfiguration.java`
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/model/MockAdvisorModel.java`
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/service/DefaultAdvisorFacade.java`
- Test: `tv1-ai/src/test/java/vn/haui/advisor/ai/service/AdvisorFacadeRagIntegrationTest.java`

**Interfaces:**
- Integrates all components into Spring application context; resolves F33-001 (removes `SRC-MOCK-POLICY`) and F33-002 (fixes deprecations).

- [ ] **Step 1: Write failing integration test verifying `AdvisorFacade` uses RAG for regulation queries**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Update `AiProperties`, `AiAutoConfiguration`, `MockAdvisorModel`, and `DefaultAdvisorFacade`**
- [ ] **Step 4: Run test to verify end-to-end green flow**

---

### Task 6: Independent QA Matrix & Regression (Sub-Agent E)

**Files:**
- Create: `tv1-ai/src/test/java/vn/haui/advisor/ai/rag/qa/RagAcceptanceMatrixTest.java`
- Create: `tv1-ai/docs/task-3.3-test-report.md`

- [ ] **Step 1: Design acceptance test suite covering all real documents, edge cases, negative queries, repeat indexing, and UTF-8 verification**
- [ ] **Step 2: Execute full acceptance suite and measure Recall@K, precision, and latency**
- [ ] **Step 3: Produce comprehensive test report `tv1-ai/docs/task-3.3-test-report.md`**

---

### Task 7: Independent Architecture & Security Review (Sub-Agent F)

**Files:**
- Create: `tv1-ai/docs/task-3.3-code-review.md`
- Update: `tv1-ai/docs/task-3.3-audit-register.md`

- [ ] **Step 1: Security review (SQL injection, student data isolation, prompt injection resistance, credential safety)**
- [ ] **Step 2: Architectural review (Contracts V1 compliance, loose coupling, package isolation)**
- [ ] **Step 3: Record any new findings in audit register and triage**

---

### Task 8: Final Verification & Task 3.8 Handoff

**Files:**
- Create: `tv1-ai/docs/task-3.3-implementation-report.md`
- Create: `tv1-ai/docs/task-3.3-handoff.md`

- [ ] **Step 1: Run full verification `./mvnw -B -pl tv1-ai -am test` and `npm run smoke`**
- [ ] **Step 2: Create implementation report and handoff documentation for Task 3.8**
- [ ] **Step 3: Confirm final status `RAG_READY_VERIFIED`**
