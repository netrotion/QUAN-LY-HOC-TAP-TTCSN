# Proposed architecture decisions requiring review

Status: **Proposed, not implemented**. These decisions change official academic outputs, deployment dependencies, or retained conversation data. The user request explicitly requires an ADR/proposed diff and approval before implementing changes of this size.

**Owner clarification:** The user states that repository data is real. `DEMO_UNVERIFIED` is a label currently present in the code; it does not prove the underlying data is fabricated. Source provenance has not been independently checked here.

## ADR 1 — Authoritative academic data and claims

**Problem.** `AcademicEngineSources` loads `policy-demo.json`, whose own status is `DEMO_UNVERIFIED`. `PlatformDataSeeder` synchronizes fixture curriculum and requirement names at every startup. `RecordBackedAcademicFacade` uses real student records with those fixture rules. The result may look personal and official despite unverified rules.

**Decision proposed.** The platform may compute official academic outcomes only when the applied policy and curriculum have an approved source, effective date/cohort, immutable version, and reviewed provenance. Add a typed `VERIFIED`/`UNVERIFIED` source state to the academic result contract. An unverified policy returns an explicit unavailable/unverified outcome for graduation eligibility, credit limits and other institutional decisions. Demo accounts and policy fixtures remain available only in explicit dev/test mode. The model and UI may explain an unverified simulation, but must not label it official.

**Proposed change set.** Define provenance in the academic policy/curriculum schema and database; add migration for policy versions; stop unconditional fixture upsert in `PlatformDataSeeder`; validate the active policy in `AcademicEngineSources`; propagate source state through `RecordBackedAcademicFacade`, `AcademicApiService`, tool DTOs and frontend status presentation. Keep DB student snapshot binding and deterministic TV4 engine.

**Acceptance.** Missing/unapproved policy gives no official graduation conclusion. Approved policy/version is echoed by REST, SSE, planner and audit responses. Old and new cohorts use the correct version. Startup never overwrites approved curriculum with demo data. Unknown/stale/contradictory student records return unavailable rather than a fabricated conclusion. Rollback restores the prior policy selector, not altered student data; migration retains old rows for audit. An institutional owner must supply/approve the actual policy and curriculum source before this can be made live.

## ADR 2 — Full conversation history and prompt budget

**Problem.** `loadFullHistory` returns all stored items, but `saveTurn` compacts old turns into a short summary when its 900,000-byte limit is reached. Existing compacted turns cannot be reconstructed. `TokenBudgetAuditor` estimates characters rather than measuring the assembled Gemini payload. The platform calls constructors that default `AiProperties`, so deployed context limits may not reach either chat path.

**Decision proposed.** Persist every raw turn, in order. Reject a write before any truncation or compaction if the configured storage limit would be exceeded. Reject a request before model dispatch if the complete assembled payload exceeds the provider budget, including system text, tool declarations/results, RAG, history, current input and reserved output. Existing compacted records must be flagged as historical data loss; do not present their summaries as complete history.

**Proposed change set.** Remove `compactHistory` and the bounded `loadHistory` API after caller review; add explicit storage-overflow response; pass `AiProperties` and `TokenBudgetAuditor` from `AdvisorConfig` to both chat constructors; measure/estimate the actual serialized payload at each model dispatch. Add a migration/diagnostic to identify `[Tóm tắt lịch sử trao đổi trước đó:` records, without deleting them.

**Acceptance.** More than 15 turns remain byte-for-byte and chronological; repeated current user input is included once; REST and SSE reject overflow without writing a partial turn; malformed legacy records remain untouched; provider payload size is measured in a provider-compatible way. Rollback is code-only for new writes, but previously compacted text remains unrecoverable. Review storage quota and retention obligations before deployment.

## ADR 3 — Trust boundary and orchestration

**Problem.** The working tree adds graduation and fake-source regexes and a selective XML replacement helper. The prompt still interpolates history, RAG chunks, tool results and context into XML-like delimiters. REST and SSE duplicate tool execution and fallback routing. Function calling is retained but a keyword planner can synthesize different calls.

**Decision proposed.** Gemini performs semantic interpretation and proposes typed tool calls. A single backend orchestration service validates tool name, schema, trusted student binding, authorization, readiness and execution. Results carry backend-controlled provenance and status. The model receives serialized role-separated inputs and structured tool responses; user/RAG/history strings never set role or source authority. A response contract distinguishes official academic facts, hypothetical assumptions, explanation and citations. A verified graduation claim requires a successful authorized `run_graduation_audit` result with the same student and data revision; model prose cannot establish it.

**Proposed change set.** Replace direct string concatenation in `LiveAdvisorModel` with one serializer for every dynamic field; make `GeminiAcademicTools` and `DefaultToolAdapter` share one parameter contract; move duplicated tool loop from `DefaultAdvisorFacade` and `AdvisorStreamingService` into one service; replace phrase-based graduation/numeric validation with typed claim verification; retain action/route allowlists and RAG evidence checks. Keep the existing RAG ingestion/search/fusion/reranking pipeline and streaming transport.

**Acceptance.** Tests cover unknown paraphrases, mixed intents, fake XML/JSON, hostile RAG text, tool-result spoofing, authorization failures, missing/stale/contradictory data, and identical REST/SSE outcomes. Use holdout prompts and report misses, not just regression cases. Roll back by switching the orchestration service implementation, with no schema data loss. Do not remove the existing regex patches until the replacement has measured parity and better adversarial behavior.

## ADR 4 — Real RAG runtime and source provenance

**Problem.** `application.properties` selects `FAKE` embeddings and `IN_MEMORY` vectors while `ai.mode` selects a live answer model. The catalog marks its own documents `PROJECT_GROUND_TRUTH`. `EvidenceValidator` silently accepts five hardcoded source IDs when the catalog cannot be read. Chat overrides retrieval settings with `(5, 0.35)`.

**Decision proposed.** Live RAG requires an operational embedding provider, a persistent index, and a corpus whose approval metadata is controlled outside the ingested text. Missing provider/index/source approval yields an explicit degraded or unavailable RAG outcome, not synthetic vectors or invented citations. Retrieval defaults have one owner in `AiProperties`; per-query overrides require an evaluated reason.

**Proposed change set.** Change deployment profile and `AdvisorConfig` readiness to require live embedding and pgvector; make ingestion idempotent by source version and embedding model; store approval metadata separately from document text; remove the hardcoded allowlist fallback from `EvidenceValidator` and chat-level literal retrieval parameters. Make required-document and lexical-index failures visible as typed degraded/unavailable outcomes rather than empty hits. Keep dev/test fake embeddings with visible labels. Use migration V6 and verify pgvector dimensions before index switchover.

**Acceptance.** Cold start, restart and provider failure do not silently use fake vectors; index version and embedding model match; approved sources alone generate authoritative citations. Evaluate retrieval against a fixed, reviewed question/evidence set before and after. Real provider calls are a paid external dependency and require separate authorization. Rollback can restore the old index version but must never label fake retrieval as live quality.

