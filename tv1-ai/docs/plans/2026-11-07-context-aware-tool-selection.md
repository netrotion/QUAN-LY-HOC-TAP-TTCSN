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

- [x] Add labeled positive and negative cases for registration paraphrases, course names, personal comparison, policy-only and time-constraint follow-up. Assert exact capability list and RAG flag. Print matrix precision/recall from actual decisions.
- [x] Run the focused planner tests and record the expected red cases.
- [x] Add minimal routing changes in `ConversationTurnPlanner.java`; rerun the focused tests and inspect false positives.

### 2. Preserve all simulation arguments

**Files:** `tv1-ai/src/test/java/vn/haui/advisor/ai/intent/IntentClassifierTest.java`, `tv1-ai/src/main/java/vn/haui/advisor/ai/intent/IntentClassifier.java`, `ConversationTurnPlannerTest.java`.

- [x] Add tests for two named courses, course code after grade, aggregate credits without a code and incomplete/ambiguous multi-course text. Assert the exact course code, credits and grade for every scenario.
- [x] Run the focused test and verify failure from the current single `m.find()` parser.
- [x] Implement the smallest multi-match parser. Return no simulated grades when course association is ambiguous so the existing clarification gate runs; rerun focused tests.

### 3. Trace actual route and tool outcome without PII

**Files:** `tv1-ai/src/main/java/vn/haui/advisor/ai/service/DefaultAdvisorFacade.java`, `tv1-ai/src/test/java/vn/haui/advisor/ai/service/ConversationalAdvisorFacadeTest.java`.

- [x] Add an integration test proving the comparison calls status and ranking, the policy-only question calls RAG alone, and the constraint-only follow-up makes no additional tool call.
- [x] Add one structured route log and bounded tool outcome logs containing enum/status/timing only. Check source and captured logs for absent raw message, student ID and arguments.
- [x] Run focused integration tests and verify tool failures remain warnings, not authoritative results.

### 4. Verify and decide on optional model selector

- [x] Run `./mvnw.cmd test`, `npm run check:all`, and `git diff --check`.
- [x] Record matrix counts, remaining misses, runtime readiness, latency/cost implications and whether a model-proposed selector is justified. Do not add it without measured benefit.
- [x] Keep this feature isolated on `codex/context-aware-tool-selection` for review; do not push or deploy without a separate request.

## Verification result

- Before routing changes, the frozen 26-case matrix had 10 true-positive tool selections, 0 false positives and 10 false negatives (precision 1.00, recall 0.50); eight cases failed the complete tool/RAG/clarification expectation.
- After routing changes, the same matrix has 20 true positives, 0 false positives and 0 false negatives; all 26 complete expectations pass. This curated fixture is not a production estimate. The multi-course parser and integration tests additionally verify exact arguments, clarification and reuse across turns.
- Full Maven reactor: `BUILD SUCCESS`; platform module ran 102 tests with no failures. `npm run check:all` and `git diff --check` passed.
- The earlier local readiness probe reported eight available academic capabilities and `VALIDATE_STUDY_PLAN` unavailable; this change does not alter readiness. No second model call or dependency was added. Explicit retake-versus-new-course comparisons now make two sequential academic calls, so that path can take longer. Live provider latency, API cost and answer quality remain unmeasured; a model-proposed selector is not justified by these fixture results alone.
