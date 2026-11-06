# Conversational Academic Advisor — implementation status (2026-11-05)

Source plan: `tv1-ai/docs/plans/2026-11-05-conversational-academic-advisor.md`. This work is isolated on `codex/conversational-academic-advisor`; the prior dirty checkout was preserved.

## Implemented in this worktree

- Per-turn `ConversationTurnPlanner` reads only the current request and the owned, bounded conversation history. It tracks selected academic capabilities, policy-evidence need, missing slots and argument provenance. Clarification replies can complete a plan across three user turns; explicit course references such as “môn đó” can reuse a course code from a prior user turn. Unknown goals are not promoted from assistant text.
- `DefaultAdvisorFacade` uses the decision to retrieve policy only when needed and to call the minimum selected, ready Academic Tools. The trusted student context remains the sole identity source. The existing three-call budget and per-tool timeout remain. Plan, simulation, target-grade and reconciliation calls require their decision-critical arguments instead of the former hardcoded chat defaults.
- `LiveAdvisorModel` receives compact selected tool results, separates verified policy, academic facts and advice in its prompt, and only returns cited policy sources. `ResponseGroundingValidator` rejects unsupported inline source IDs and preserves newlines/Markdown while redacting unsolicited student-code labels.
- The mock response path no longer performs hidden RAG retrieval and no longer substitutes sample grades, ranked courses, failed courses, graduation progress or a CPA goal in the exercised missing-result branches. These tests are for safe local behavior, not a measurement of live advisor quality.
- A read-only review found and prompted further corrections: current CPA/GPA is not a plan target, the requested course is selected when two course codes appear, curricular “kỳ 7” is not passed as calendar term `2026_7`, reconciliation can continue after clarification, and a successful target calculation remains visible if plan generation fails. Redaction now receives the authenticated student code and never treats an arbitrary explicit ID request as authorization to show another student's code. Source metadata without retrieved evidence is dropped.
- Existing 20-case chat fixture is retained, with its original copy in `chat-eval-baseline-v1.json`; expectations that depended on invented mock facts were corrected. New tests cover multi-turn argument carryover, direct/no-tool, mixed tool plus RAG, clarification, citation and PII behavior.

## Gates that remain open

- The plan's two-person-labeled 40-conversation/120-turn dataset, blinded advisor rubric, claim-level citation scoring and live paired baseline have not been completed. The prior audit's direct-model samples cannot substitute for an end-to-end production baseline.
- No provider latency, token or cost comparison has been collected for the new default path. Therefore the plan's precision/recall, quality, p95 latency and cost release thresholds are **not claimed as met**.
- Phase 5 LLM-proposed tool calls remain conditional. There is no evidence yet that a second model round improves ambiguous turns enough to justify its cost; no function-calling framework was added.
- No gradual production rollout or deployment was performed. The branch/worktree is the reversible review boundary until the live evaluation and release gates pass.

## Verification record

- Baseline before these edits: 286 Maven tests, 0 failures, 4 skipped (`mvnw.cmd -pl tv1-ai -am test`).
- New focused RED → GREEN tests were run for PII formatting, unsupported citations, missing simulation arguments, mock fabrication and multi-turn routing.
- Frontend: `npm run check:secrets`, `check:architecture`, `check:contracts`, `lint`, `test` (140 passed) and `build` passed. `npm run check:all` stops at its ownership gate because the preserved worktree includes changes across tv1/tv2/tv3/tv5 and a plan document outside recognized ownership paths; the remaining functional checks were run separately.
- Final full Maven reactor: `mvnw.cmd test` **BUILD SUCCESS** (contracts 186, AI 335 with 4 skipped, Academic 171, platform 101; 0 failures). Log: `.superpowers/sdd/2026-11-05-conversational-academic-advisor/maven-full-final.log`.
