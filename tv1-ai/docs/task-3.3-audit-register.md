# Task 3.3 Audit Register — RAG Implementation & Verification

| Finding ID | Severity | Description | Responsible Agent | Status | Retest Result | Independent Verification |
|------------|----------|-------------|-------------------|--------|---------------|--------------------------|
| **F33-001** | MEDIUM | `MockAdvisorModel` returns obsolete fixture source `SRC-MOCK-POLICY` (violates ChatEval Rule 10). | Sub-Agent D & Lead | CLOSED | `AdvisorFacadeRagIntegrationTest` (8/8) passed | Real RAG citations (`REG-HAUI-*`) verified |
| **F33-002** | LOW | Deprecated contract methods in `DefaultAdvisorFacade` (`getPlanId`, `getWarningMessages`). | Lead Orchestrator | CLOSED | `DefaultAdvisorFacade` compiles with zero warnings | Uses `getProposalId()` and `getWarnings()` |
| **F33-003** | MEDIUM | Full RAG pipeline missing in `tv1-ai` (Reader, Chunker, Embedding, VectorStore, Retriever). | Sub-Agents B, C, D | CLOSED | Full test suite passed (154/154 tests green) | Ingestion, VectorStore, Retriever & Grounding verified |
| **F33-004** | LOW | Referenced schema `source-catalog.schema.json` missing on disk in `tv1-ai/src/main/resources/rag/`. | Sub-Agent B (Core RAG) | CLOSED | `CatalogSchemaValidationTest` passed (1/1) | Verified on disk and test suite |
| **F33-005** | LOW | DEF-3.3-01: Compound modifier regex bypass in `EvidenceValidator` prompt injection detection. | Sub-Agent D & Lead | CLOSED | `testDetectsCompoundModifierPromptInjection` passed | Regex updated to match multiple modifier tokens |
| **F33-REV-01** | LOW | Plan document in root `docs/` triggered `npm run check:ownership` violation warning. | Lead Orchestrator | CLOSED | `npm run check:ownership` PASSED (51 paths verified) | Plan relocated to `tv1-ai/docs/plans/` |

---

## Detailed Findings Ledger

### Finding F33-001: Obsolete Fixture Citations in MockAdvisorModel
- **Severity:** MEDIUM
- **Location:** `tv1-ai/src/main/java/vn/haui/advisor/ai/model/MockAdvisorModel.java`
- **Description:** Previous mock model returned hardcoded `SRC-MOCK-POLICY` and `SRC-MOCK-PLAN`, which violate ChatEval Rule 10 forbidding `MOCK/FAKE/DEMO/FIXTURE` source IDs.
- **Remediation:** Integrated `RagAdvisorService` into `MockAdvisorModel`. Citations are retrieved and grounded dynamically from the canonical Ground-Truth catalog (`REG-HAUI-01..05`). When evidence is absent, citations are empty (`List.of()`).
- **Status:** CLOSED (Verified by `AdvisorFacadeRagIntegrationTest`).

### Finding F33-002: Deprecated Contract Method Invocations
- **Severity:** LOW
- **Location:** `tv1-ai/src/main/java/vn/haui/advisor/ai/service/DefaultAdvisorFacade.java`
- **Description:** Invocations to `planResp.getPlanId()` and `statusResp.getWarningMessages()` triggered deprecation warnings.
- **Remediation:** Replaced with `planResp.getProposalId()` and `statusResp.getWarnings()`.
- **Status:** CLOSED (Verified by compilation with zero deprecation warnings on facade).

### Finding F33-003: Missing Task 3.3 RAG Implementation Package
- **Severity:** MEDIUM
- **Location:** `tv1-ai/src/main/java/vn/haui/advisor/ai/rag/`
- **Description:** Full RAG pipeline was absent in `tv1-ai`.
- **Remediation:** Built complete pipeline: `RagCatalogReader`, `MarkdownDocumentReader`, `SemanticChunker`, `RagIngestionService`, `EmbeddingProvider`, `DeterministicFakeEmbeddingProvider`, `VectorStore`, `InMemoryVectorStore`, `PgVectorStoreAdapter`, `RagRetriever`, `VietnameseQueryNormalizer`, `EvidenceValidator`, `CitationGrounder`, and `RagAdvisorService`.
- **Status:** CLOSED (Verified across 154 automated unit, integration, and QA tests).

### Finding F33-004: Missing Schema File for Source Catalog
- **Severity:** LOW
- **Location:** `tv1-ai/src/main/resources/rag/source-catalog.schema.json`
- **Description:** `source-catalog.json` declared `$schema: ./source-catalog.schema.json` but file was absent on disk.
- **Remediation:** Created formal JSON Schema Draft-07 specification and automated test `CatalogSchemaValidationTest`.
- **Status:** CLOSED (Verified by `CatalogSchemaValidationTest`).

### Finding F33-005 (DEF-3.3-01): Compound Modifier Regex Limitation in EvidenceValidator
- **Severity:** LOW
- **Location:** `tv1-ai/src/main/java/vn/haui/advisor/ai/rag/grounding/EvidenceValidator.java`
- **Description:** Single token quantifier in prompt injection regex permitted multi-word payloads like `"Ignore all previous instructions"` to bypass regex detection.
- **Remediation:** Updated regex patterns to match multiple consecutive modifier tokens: `(?i)ignore\s+((all|previous|prior|system|above)\s+)*(instructions|directives|prompts|rules)`. Added regression test `testDetectsCompoundModifierPromptInjection`.
- **Status:** CLOSED (Verified by Sub-Agent E and Lead in `EvidenceValidatorTest`).

### Finding F33-REV-01: Plan File Location Outside TV1 Boundary
- **Severity:** LOW
- **Location:** `docs/superpowers/plans/2026-10-13-task-3-3-rag-implementation.md`
- **Description:** Subtree `docs/` at repository root triggered `npm run check:ownership` boundary violation.
- **Remediation:** Relocated plan file into `tv1-ai/docs/plans/2026-10-13-task-3-3-rag-implementation.md` and pruned root `docs/`.
- **Status:** CLOSED (Verified by `npm run check:ownership`).
