# Context-aware Academic Tool Selection — Design (2026-11-07)

## Intent and evidence

The advisor must select the academic evidence needed to answer a student's actual question, including common paraphrases and comparisons across turns, without inventing student facts. The 2026-11-07 diagnostic traced `AdvisorChatService → DefaultAdvisorFacade → ConversationTurnPlanner → ToolAdapter → AcademicFacade → LiveAdvisorModel`. Gemini receives a text-only `generateContent` request after tools have run; it cannot request a tool in the current architecture. The local runtime reported eight academic capabilities READY and `VALIDATE_STUDY_PLAN` NOT_READY. A direct planner probe found that “IT6080 có đăng ký được không?” selected eligibility, while “Mình có được đăng ký IT6080 kỳ tới không?” selected no tool; a two-course simulation produced one course argument.

The user authorized both this spec and its implementation. This increment improves the existing deterministic selector and measures it before considering model-proposed calls.

## Decision

Keep one answer-generation call and the existing trusted-context boundary. `ConversationTurnPlanner` selects the smallest needed capability set and RAG flag from the current message plus owned recent user turns. Extend only proven gaps:

- Equivalent registration questions with a confirmed course code select `CHECK_COURSE_ELIGIBILITY`; course identity questions with a confirmed code use the same curriculum-backed result. A vague “kiểm tra môn này” without a known intent is clarified or answered without fabricated metadata.
- A personal comparison of retaking/improving versus a new course selects `GET_ACADEMIC_STATUS` and `RANK_RETAKE_COURSES` once for the comparison turn. A later constraint-only follow-up uses the prior answer/history and does not repeat tools without a new factual request.
- Explicit policy questions continue to use RAG. Neither the presence of an academic word nor a course code alone triggers policy retrieval.
- A simulation extracts every explicitly described grade scenario with a correct course-code association. If the association is ambiguous, ask for clarification; never silently drop a second grade. Generic aggregate simulations without course codes remain supported.
- Keep the existing clarification gates for target CPA, semester, credit cap, plan identity and insufficient grade details. Student ID and revision still come only from `TrustedStudentContext`; `ToolAdapter` validates arguments and `AcademicFacade` computes results.
- Log only route mode, category, capability names, provenance categories and tool outcomes/elapsed time. Do not log question text, student ID, course arguments, result bodies, prompt or API key.

## Scope and alternatives

No new Academic Tool, public API contract, database table, framework, model call or dependency is needed. `VALIDATE_STUDY_PLAN` remains outside chat because it requires an owned draft payload. A model-proposed structured selector could handle more paraphrases but would add latency/cost and a second trust-boundary validation; evaluate it only after a labeled deterministic baseline and a separate live quality comparison. Fine-tuning and a knowledge graph are unsupported by the observed failure mode.

## Evaluation and acceptance

Create a frozen, labeled tool-selection matrix before changing routing. Include positive and negative paraphrases, course identity, policy-only, comparison, one- and multi-course simulation, incomplete arguments and follow-ups. Report selection precision/recall over the matrix and require 100% exact arguments for simulation cases and 0 cross-student identity sourced from text. The matrix is a regression fixture, not a population estimate; do not claim production precision/recall from it.

Run focused red/green tests, then the full Maven reactor and repository checks. Confirm the local runtime readiness separately from planner selection. Compare the new default path to the old path: it adds no LLM request, no RAG request on direct advice, and at most two independent academic calls for the explicit comparison case. Measure live provider latency and answer quality in a later release gate; do not infer them from unit tests.

## Risks

Broader wording can cause false tool calls; pair each new positive with a negative case. Eligibility gives personal registration status as well as course metadata, so it must remain behind authenticated context and missing-transcript handling. Repeated tools on follow-ups waste latency; history-only constraint follow-ups remain direct. Tool errors must not be reported as verified facts.
