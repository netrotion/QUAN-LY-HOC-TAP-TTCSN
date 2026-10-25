# HeroUI v3 Hybrid Design System Synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchronize the frontend design system across `tv2-web` and `tv3-planner-ui` using HeroUI v3 tokens, styling, and compound components while maintaining 100% test pass rate and strict backward compatibility.

**Architecture:** Hybrid HeroUI Design System integrating `@heroui/styles` into `tv2-web`, enriching `tokens.css` with HeroUI OKLCH variables and micro-interactions, upgrading the 7 shared UI components (`Button`, `Card`, `Modal`, `Table`, `Loading`, `Error`, `EmptyState`) to support both classic and compound APIs, and modernizing main pages.

**Tech Stack:** React 18, Vite 5, `@heroui/styles` v3, CSS Custom Properties (OKLCH tokens), BEM styling, React Router 6.

**Spec:** `docs/superpowers/specs/2026-10-25-heroui-design-system-sync-design.md`

## Global Constraints

- Scope: Frontend only (`tv2-web` and `tv3-planner-ui`). Never modify backend (`tv1-ai`, `tv4-academic`, `tv5-platform`).
- Architecture: `tv3-planner-ui` must NEVER import directly from `tv2-web`. TV3 receives components via `props.ui` or DI `createStudentRoutes({ api, ui })`.
- Boundary: Zero direct LLM SDK imports in frontend.
- Git: Local git commits only. Absolutely NEVER run `git push` to remote repository.
- Quality Gate: All 115 existing test cases in `npm test` must continue passing with 0 failures at each task.

## Review Focus

1. Component props regression: Calling `<Button onClick={fn} loading={true} variant="primary">` must behave identically to the existing API while adding HeroUI animations and visual polish.
2. Compound component support: `<Card.Header>`, `<Card.Title>`, `<Card.Body>`, and `<Card.Footer>` must work seamlessly alongside legacy flat props (`title`, `subtitle`, `footer`).
3. Modal backdrop & accessibility: Modal must preserve body scroll lock, ESC key press to close, and backdrop click dismissal.
4. CSS Variable compatibility: All existing `--color-*` tokens must remain valid so legacy styles and test assertions (`--color-primary`, `--color-success`) do not break.
5. TV3 Contract integrity: `createStudentRoutes({ api, ui })` must receive the upgraded `ui` object containing all 7 components without throwing.

---

### Task 1: Add `@heroui/styles` and HeroUI v3 Tokens

**Files:**
- Modify: `tv2-web/package.json`
- Modify: `tv2-web/src/styles/tokens.css`
- Test: `tv2-web/test/app.test.mjs`

**Interfaces:**
- Produces: CSS custom properties (`--heroui-*`, OKLCH colors, elevation shadows, radii, transitions) in `tokens.css`.
- Preserves: Existing `--color-*` properties checked by `tv2-web/test/app.test.mjs`.

- [ ] **Step 1: Write the failing test assertion for HeroUI tokens**

Add a test assertion in `tv2-web/test/app.test.mjs` inside Test 5 ensuring HeroUI tokens are present in `tokens.css`:
```javascript
assert.equal(tokensCss.includes('--heroui-primary'), true, 'Thiếu token --heroui-primary');
assert.equal(tokensCss.includes('--heroui-radius-lg'), true, 'Thiếu token --heroui-radius-lg');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tv2-web/test/app.test.mjs`
Expected: FAIL with "Thiếu token --heroui-primary"

- [ ] **Step 3: Install `@heroui/styles` in `tv2-web` and add HeroUI tokens to `tokens.css`**

Add `"@heroui/styles": "^3.2.6"` to `tv2-web/package.json` dependencies and add HeroUI v3 OKLCH palette, elevation shadows, radius, and transition timing variables to `tv2-web/src/styles/tokens.css`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tv2-web/test/app.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit locally**

```bash
git add tv2-web/package.json tv2-web/src/styles/tokens.css tv2-web/test/app.test.mjs
git commit -m "feat(ui): add @heroui/styles and HeroUI v3 design tokens`n`nCo-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 2: Enhance Shared UI CSS Layer with HeroUI Micro-Interactions

**Files:**
- Modify: `tv2-web/src/styles/global.css`
- Test: `tv2-web/test/app.test.mjs`

**Interfaces:**
- Consumes: HeroUI tokens from `tokens.css`.
- Produces: HeroUI interactive styles (`active:scale-[0.98]`, frosted glass backdrops, accessible focus-visible rings, polished scrollbars).

- [ ] **Step 1: Add assertions for HeroUI interactive states in `global.css`**

In `tv2-web/test/app.test.mjs`, verify `global.css` includes HeroUI micro-interaction patterns:
```javascript
const globalCss = fs.readFileSync(path.join(tv2Root, 'src/styles/global.css'), 'utf-8');
assert.equal(globalCss.includes('active:scale'), true, 'global.css thiếu hiệu ứng active:scale HeroUI');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tv2-web/test/app.test.mjs`
Expected: FAIL

- [ ] **Step 3: Implement HeroUI interactive styles in `tv2-web/src/styles/global.css`**

Update `global.css` with HeroUI button active scaling (`.haui-btn:active:not(:disabled) { transform: scale(0.98); }`), subtle border styling, frosted glass topbar and card overlays, and focus rings.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tv2-web/test/app.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit locally**

```bash
git add tv2-web/src/styles/global.css tv2-web/test/app.test.mjs
git commit -m "feat(ui): add HeroUI v3 micro-interactions and frosted styling to global.css`n`nCo-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 3: Upgrade `Button.jsx` and `Card.jsx` to HeroUI v3 Patterns

**Files:**
- Modify: `tv2-web/src/components/ui/Button.jsx`
- Modify: `tv2-web/src/components/ui/Card.jsx`
- Test: `tv2-web/test/app.test.mjs`

**Interfaces:**
- Produces: Upgraded `Button` (with `primary`, `secondary`, `danger`, `ghost`, `outline`, active scale, spinner) and `Card` (with flat props + compound `Card.Header`, `Card.Title`, `Card.Body`, `Card.Footer`).

- [ ] **Step 1: Write tests for HeroUI Button and Card features**

In `tv2-web/test/app.test.mjs`, add tests verifying:
- `Button.VARIANTS` includes `outline`.
- `Card.Title` is an exported compound component function.
- `Card` renders correctly both with flat props and compound components.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tv2-web/test/app.test.mjs`
Expected: FAIL

- [ ] **Step 3: Implement HeroUI patterns in `Button.jsx` and `Card.jsx`**

- Add `outline` variant to `Button.VARIANTS`, apply HeroUI classes and micro-press transitions.
- Export `Card.Title` alongside `Card.Header`, `Card.Body`, `Card.Footer` with HeroUI elevation and styling.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tv2-web/test/app.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit locally**

```bash
git add tv2-web/src/components/ui/Button.jsx tv2-web/src/components/ui/Card.jsx tv2-web/test/app.test.mjs
git commit -m "feat(ui): upgrade Button and Card to HeroUI v3 compound patterns`n`nCo-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 4: Upgrade `Modal.jsx`, `Table.jsx`, `Loading.jsx`, `Error.jsx`, `EmptyState.jsx`

**Files:**
- Modify: `tv2-web/src/components/ui/Modal.jsx`
- Modify: `tv2-web/src/components/ui/Table.jsx`
- Modify: `tv2-web/src/components/ui/Loading.jsx`
- Modify: `tv2-web/src/components/ui/Error.jsx`
- Modify: `tv2-web/src/components/ui/EmptyState.jsx`
- Test: `tv2-web/test/app.test.mjs`

**Interfaces:**
- Produces: Polished `Modal` with frosted backdrop and scale-in animation, `Table` with HeroUI zebra and hover styling, `Loading` with HeroUI spinner, `Error` and `EmptyState` with HeroUI modern badges and typography.

- [ ] **Step 1: Write test verifying Modal, Table, Loading, Error, EmptyState components**

In `tv2-web/test/app.test.mjs`, add tests verifying compound/enhanced features for `Modal.Header`, `Modal.Body`, `Modal.Footer` and table row styling.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tv2-web/test/app.test.mjs`
Expected: FAIL

- [ ] **Step 3: Implement HeroUI v3 styling in `Modal.jsx`, `Table.jsx`, `Loading.jsx`, `Error.jsx`, `EmptyState.jsx`**

- Upgrade `Modal.jsx` to support compound components (`Modal.Header`, `Modal.Body`, `Modal.Footer`) while preserving flat props.
- Enhance `Table.jsx` with HeroUI modern table classes and hover effects.
- Enhance `Loading.jsx`, `Error.jsx`, `EmptyState.jsx` with HeroUI visual styling.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tv2-web/test/app.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit locally**

```bash
git add tv2-web/src/components/ui/Modal.jsx tv2-web/src/components/ui/Table.jsx tv2-web/src/components/ui/Loading.jsx tv2-web/src/components/ui/Error.jsx tv2-web/src/components/ui/EmptyState.jsx tv2-web/test/app.test.mjs
git commit -m "feat(ui): upgrade Modal, Table, and feedback components to HeroUI v3 styling`n`nCo-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 5: Synchronize Main Host Pages (`DashboardPage.jsx`, `AcademicProgressPage.jsx`)

**Files:**
- Modify: `tv2-web/src/pages/DashboardPage.jsx`
- Modify: `tv2-web/src/pages/AcademicProgressPage.jsx`
- Test: `tv2-web/test/app.test.mjs`
- Test: `tv2-web/test/tv2-academic-flow.test.mjs`

**Interfaces:**
- Consumes: Upgraded `Card`, `Button`, `Table` from `tv2-web/src/components/ui/`.
- Produces: Enhanced Dashboard summary KPIs, cumulative GPA chart styling, and academic progress views.

- [ ] **Step 1: Run academic flow tests to confirm baseline passes**

Run: `node --test tv2-web/test/tv2-academic-flow.test.mjs`
Expected: PASS

- [ ] **Step 2: Update `DashboardPage.jsx` and `AcademicProgressPage.jsx` with HeroUI cards and button styles**

Apply HeroUI card padding, subtle borders, high-contrast metric typography, and interactive button variants.

- [ ] **Step 3: Run all TV2 tests to verify zero regressions**

Run: `node --test tv2-web/test/*.test.mjs`
Expected: PASS

- [ ] **Step 4: Commit locally**

```bash
git add tv2-web/src/pages/DashboardPage.jsx tv2-web/src/pages/AcademicProgressPage.jsx
git commit -m "feat(web): synchronize DashboardPage and AcademicProgressPage with HeroUI v3 cards and buttons`n`nCo-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 6: Synchronize TV3 Pages (`StudentProfilePage.js`, `ChatAdvisorPage.js`, `StudyPlannerPage.js`)

**Files:**
- Modify: `tv3-planner-ui/src/pages/StudentProfilePage.js`
- Test: `tv3-planner-ui/test/*.test.mjs`

**Interfaces:**
- Consumes: Injected `ui` library via `createStudentRoutes({ api, ui })`.
- Produces: Polished profile form inputs, cohort/school dropdown selectors, and AI proposal cards.

- [ ] **Step 1: Run TV3 test suite to confirm baseline passes**

Run: `node --test tv3-planner-ui/test/*.test.mjs`
Expected: PASS (all tests pass)

- [ ] **Step 2: Update `StudentProfilePage.js` with HeroUI form styles and card elevation**

Modernize form controls, select dropdowns, and button containers with HeroUI styling tokens.

- [ ] **Step 3: Run TV3 test suite to verify zero regressions**

Run: `node --test tv3-planner-ui/test/*.test.mjs`
Expected: PASS

- [ ] **Step 4: Commit locally**

```bash
git add tv3-planner-ui/src/pages/StudentProfilePage.js
git commit -m "feat(planner): modernize StudentProfilePage with HeroUI v3 card and form aesthetics`n`nCo-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 7: Full System Verification & Architecture Check

**Files:**
- Test: Root scripts and checks

- [ ] **Step 1: Run full test suite across all workspaces**

Run: `npm test`
Expected: PASS (115/115 tests passing)

- [ ] **Step 2: Run architecture check**

Run: `npm run check:architecture`
Expected: PASS (0 violations, no reverse imports between tv3 and tv2)

- [ ] **Step 3: Run lint check**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 4: Run build check**

Run: `npm run build`
Expected: PASS (Vite builds successfully)

- [ ] **Step 5: Verify git status (Ensure NO git push)**

Run: `git status`
Expected: Working tree clean, main branch ahead of origin, NO remote push executed.
