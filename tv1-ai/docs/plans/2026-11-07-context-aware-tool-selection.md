# Context-aware Academic Tool Selection Implementation Plan

**Goal:** Fix demonstrated tool-selection and simulation-argument misses, add safe route telemetry, and measure a labeled regression baseline without extra model calls.

**Architecture:** Extend `ConversationTurnPlanner` and `IntentClassifier` in place; retain `DefaultAdvisorFacade → ToolAdapter → AcademicFacade` and one `LiveAdvisorModel` generation. No public contract or dependency change.

**Spec:** [Context-aware tool selection design](../specs/2026-11-07-context-aware-tool-selection-design.md).

## Global constraints

- `TrustedStudentContext` alone supplies student identity and revision.
- Academic Engine alone computes CPA, eligibility, rankings and simulations.
- Missing critical arguments cause clarification, not a guessed default.
- No added LLM call; no new RAG call for direct follow-ups.
- No question text, student ID, course argument or tool output in telemetry.

## Tasks

### 1. Freeze selection evaluation and reproduce misses

**Files:** `tv1-ai/src/test/java/vn/haui/advisor/ai/service/ToolSelectionMatrixTest.java`, `ConversationTurnPlannerTest.java`.

- [ ] Add labeled positive and negative cases for registration paraphrases, course names, personal comparison, policy-only and time-constraint follow-up. Assert exact capability list and RAG flag. Print matrix precision/recall from actual decisions.
- [ ] Run `./mvnw.cmd -pl tv1-ai -am -Dtest=ToolSelectionMatrixTest,ConversationTurnPlannerTest -Dsurefire.failIfNoSpecifiedTests=false test`; record the expected red cases.
- [ ] Add minimal routing changes in `ConversationTurnPlanner.java`; rerun the focused tests and inspect false positives.

### 2. Preserve all simulation arguments

**Files:** `tv1-ai/src/test/java/vn/haui/advisor/ai/intent/IntentClassifierTest.java`, `tv1-ai/src/main/java/vn/haui/advisor/ai/intent/IntentClassifier.java`, `ConversationTurnPlannerTest.java`.

- [ ] Add tests for two named courses, course code after grade, aggregate credits without a code and incomplete/ambiguous multi-course text. Assert the exact course code, credits and grade for every scenario.
- [ ] Run the focused test and verify failure from the current single `m.find()` parser.
- [ ] Implement the smallest multi-match parser. Return no simulated grades when course association is ambiguous so the existing clarification gate runs; rerun focused tests.

### 3. Trace actual route and tool outcome without PII

**Files:** `tv1-ai/src/main/java/vn/haui/advisor/ai/service/DefaultAdvisorFacade.java`, `tv1-ai/src/test/java/vn/haui/advisor/ai/service/ConversationalAdvisorFacadeTest.java`.

- [ ] Add an integration test proving the comparison calls status and ranking, the policy-only question calls RAG alone, and the constraint-only follow-up makes no additional tool call.
- [ ] Add one structured route log and bounded tool outcome logs containing enum/status/timing only. Check source and captured logs for absent raw message, student ID and arguments.
- [ ] Run focused integration tests and verify tool failures remain warnings, not authoritative results.

### 4. Verify and decide on optional model selector

- [ ] Run `./mvnw.cmd test`, `npm run check:all`, and `git diff --check`.
- [ ] Record matrix counts, remaining misses, runtime readiness, latency/cost implications and whether a model-proposed selector is justified. Do not add it without measured benefit.
- [ ] Keep this feature isolated on `codex/context-aware-tool-selection` for review; do not push or deploy without a separate request.
