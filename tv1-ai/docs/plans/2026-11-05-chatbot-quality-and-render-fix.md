# HaUI Advisor Chatbot: Quality & Rendering Fix Implementation Plan

- **Goal:** Fix root causes of Markdown/LaTeX rendering failures and answer quality issues (verbose fluff, template greetings, PII leaks, intent misclassification, context noise).
- **Architecture Stack:**
  - Frontend: React 18.3.1, `@haui/planner-ui`, `tv2-web` (Vite)
  - Backend: Spring Boot Java 21, `tv1-ai`, `tv4-academic`, `tv5-platform`
  - Libraries to add: `react-markdown`, `remark-gfm`, `remark-math`, `rehype-katex`, `katex`
- **Output Artifacts:** Tested and verified frontend Markdown/LaTeX renderer, updated intent classifier, clean prompt builder, updated system prompt ("mình - bạn"), PII filtering, and regression test suite.

---

## Task Decomposition

### Task 1: Frontend Markdown & Math Renderer (`tv3-planner-ui` & `tv2-web`)
1. Install/link dependencies: `react-markdown`, `remark-gfm`, `remark-math`, `rehype-katex`, `katex`.
2. Ensure Vite build and dependency resolution work smoothly with React 18.3.1.
3. Import KaTeX CSS in `tv2-web/src/styles/global.css`.
4. Create dedicated `MarkdownContent` component in `tv3-planner-ui/src/components/MarkdownContent.js` supporting:
   - GFM tables, strikethrough, autolinks, blockquotes
   - Math inline `$x$` and block `$$\sum...$$` via `remark-math` + `rehype-katex`
   - Safe link handling (`target="_blank"`, `rel="noopener noreferrer"`)
   - Preservation of newlines (`remark-gfm` / CSS)
   - XSS sanitization (disabling raw HTML)
5. Update [`ChatAdvisorPage.js`](file:///E:/thuctapcosonganh/tv3-planner-ui/src/pages/ChatAdvisorPage.js#L1210) to replace raw text `<p>` with `<MarkdownContent content={msg.text} />`.
6. Write unit tests for Markdown & Math rendering in `tv3-planner-ui/test/`.

### Task 2: PII Redaction & Clean Context Assembly (`tv1-ai`)
1. In [`LiveAdvisorModel.java`](file:///E:/thuctapcosonganh/tv1-ai/src/main/java/vn/haui/advisor/ai/model/LiveAdvisorModel.java#L253-L260):
   - Remove `studentCode` / `studentId` from `<student_context>`.
   - Do NOT inject `<student_context>` if the query is a general regulation query (`category == REGULATION`).
   - Do NOT inject `<academic_tool_results> KHÔNG CÓ KẾT QUẢ TỪ CÔNG CỤ HỌC VỤ. </academic_tool_results>` when query does not require academic tools; omit or label as "Không yêu cầu dữ liệu học vụ cá nhân".
2. In [`ResponseGroundingValidator.java`](file:///E:/thuctapcosonganh/tv1-ai/src/main/java/vn/haui/advisor/ai/grounding/ResponseGroundingValidator.java):
   - Add defense-in-depth PII post-processing regex to strip/redact any accidental `Mã sinh viên: \d+` or `(Mã SV: \d+)` from the final answer.
3. Update `LiveAdvisorModelPromptTest.java` and `ResponseGroundingValidatorTest.java`.

### Task 3: Intent Classification & Personal Academic Tool Routing (`tv1-ai`)
1. In [`IntentClassifier.java`](file:///E:/thuctapcosonganh/tv1-ai/src/main/java/vn/haui/advisor/ai/intent/IntentClassifier.java):
   - Prioritize personal queries (`GRADUATION_AUDIT`, `DEBT_COURSES`) over pure `REGULATION` when the student asks about personal status even if containing words like "theo quy chế" (e.g. "Tôi còn thiếu chứng chỉ chuẩn đầu ra nào theo quy chế?").
2. In [`DefaultAdvisorFacade.java`](file:///E:/thuctapcosonganh/tv1-ai/src/main/java/vn/haui/advisor/ai/service/DefaultAdvisorFacade.java#L260-L350):
   - Ensure `GRADUATION_AUDIT` triggers `toolAdapter.runGraduationAudit(context)` so certificate checklist is retrieved.
3. Update `IntentClassifierTest.java` with test cases covering mixed queries.

### Task 4: System Prompt Overhaul ("mình – bạn", Direct & Concise) (`tv1-ai`)
1. Rewrite `SYSTEM_PROMPT` in [`LiveAdvisorModel.java`](file:///E:/thuctapcosonganh/tv1-ai/src/main/java/vn/haui/advisor/ai/model/LiveAdvisorModel.java#L24-L32):
   - Adopt objective AI advisor persona using "mình - bạn".
   - Prohibit template greetings ("Chào em...") and teacher sign-offs ("Chúc em... trao đổi với thầy cô nhé").
   - Require direct, concise answers without repeating background regulation or dumping formulas unless asked.
   - For missing personal data, state clearly at the very beginning of the response.
2. Update unit tests in `LiveAdvisorModelTest.java`.

### Task 5: End-to-End Verification & Before/After Evaluation
1. Run full test suites: `npm test`, `npm run build`, and `.\mvnw.cmd test`.
2. Run test script against live model on the 5 representative scenarios and verify:
   - Output contains no student code.
   - Output is concise and uses "mình - bạn".
   - No negative noise about missing grades on formula queries.
   - Frontend renders Markdown & LaTeX without raw syntax.
