# Design Spec: HeroUI v3 Hybrid Design System Synchronization

**Date**: 2026-10-25  
**Topic**: Frontend Design System Synchronization with HeroUI v3  
**Scope**: Frontend only (`tv2-web`, `tv3-planner-ui`)  
**Status**: Approved (In Design Review)  
**Git Policy**: Local commits only, strict prohibition on `git push`  

---

## 1. Context & Objectives

The HaUI Advisor application frontend consists of two core workspaces:
- `tv2-web`: The web host application providing the app shell, layout (Sidebar, Topbar), shared UI components (`Button`, `Card`, `Modal`, `Table`, `Loading`, `Error`, `EmptyState`), design tokens, and core academic pages (Dashboard, Progress, Curriculum, Transcript).
- `tv3-planner-ui`: The planner and AI advisor subsystem providing the Study Planner, AI Chatbot Advisor, What-If Simulator, and Student Profile pages. TV3 receives the UI components dynamically via Dependency Injection: `createStudentRoutes({ api, ui })`.

### Problem Statement
The current interface uses a custom monolithic CSS implementation. To enhance developer experience, visual aesthetic, accessibility, and consistency, the user requested synchronizing the entire system using **HeroUI v3**.

### Strategy: Hybrid HeroUI Design System (Approach 1)
- Install `@heroui/styles` v3 into `tv2-web` to leverage official HeroUI v3 design tokens, BEM CSS classes, modern OKLCH color palettes, interactive states, and elevation.
- Upgrade the 7 core shared UI components (`tv2-web/src/components/ui/`) with HeroUI patterns (including compound components like `Card.Header`, `Card.Title`, `Card.Body`, `Card.Footer`).
- Maintain **100% backward compatibility** for all existing component props (`onClick`, `loading`, `disabled`, `variant`, `size`, `isOpen`, `onClose`) so that all 115 test cases and all existing pages run seamlessly without regressions.
- Synchronize key pages across `tv2-web` and `tv3-planner-ui` with HeroUI aesthetics (frosted paper, micro-interaction transitions, elevation shadows, clean typography).

---

## 2. Architectural Boundaries & Constraints

1. **Frontend-Only Scope**:
   - Only modify `tv2-web` and `tv3-planner-ui`. Do not alter backend services (`tv1-ai`, `tv4-academic`, `tv5-platform`).
2. **Reverse Dependency Prohibition**:
   - `tv3-planner-ui` must NEVER import directly from `tv2-web`. TV3 consumes components strictly via `props.ui` or injected `ui` parameter.
3. **No Direct LLM SDK Imports**:
   - Frontend must never import SDKs from OpenAI, Anthropic, Google Generative AI, or LangChain.
4. **Git Push Prohibition**:
   - Strictly no `git push` to remote repositories under any circumstances.
5. **Quality Gate**:
   - All 115 tests (`npm test`), architecture checks (`npm run check:architecture`), and lint checks (`npm run lint`) must pass.

---

## 3. Detailed Design

### 3.1 Design Tokens & CSS Layer (`tokens.css` & `global.css`)
- **HeroUI Tokens Integration**:
  - Add HeroUI v3 variables into `tv2-web/src/styles/tokens.css`:
    - OKLCH Semantic colors: `--heroui-primary`, `--heroui-secondary`, `--heroui-success`, `--heroui-danger`, `--heroui-warning`, `--heroui-neutral`.
    - Radius scale: `--heroui-radius-sm`, `--heroui-radius-md`, `--heroui-radius-lg`, `--heroui-radius-xl`, `--heroui-radius-full`.
    - Elevation shadows: `--heroui-shadow-sm`, `--heroui-shadow-md`, `--heroui-shadow-lg`.
    - Micro-interactions: `--heroui-scale-pressed: 0.98`, `--heroui-transition-timing: cubic-bezier(0.34, 1.56, 0.64, 1)`.
  - Preserve all existing `--color-*` variables (`--color-primary`, `--color-success`, `--color-ink`, `--color-hairline`, etc.) to guarantee backward compatibility with existing tests.
- **HeroUI Global Styles in `global.css`**:
  - Incorporate HeroUI interactive states:
    - Button active press state (`:active { transform: scale(0.98); }`).
    - Focus visible rings with high-contrast accessibility outlines (`:focus-visible`).
    - Frosted glass backdrop blur (`backdrop-filter: blur(12px)`).
    - Smooth cubic-bezier transitions on hover and active states.

### 3.2 Shared UI Library V0 Upgrade (`tv2-web/src/components/ui/`)

1. **`Button.jsx`**:
   - Supports variants: `primary`, `secondary`, `danger`, `ghost`, `outline`.
   - Supports sizes: `sm`, `md`, `lg`.
   - Native active micro-press animation (`active:scale-[0.98]`).
   - Clean HeroUI spinner integration when `loading={true}`.
   - Backward compatible: handles both `onClick` and optional `onPress`, `disabled` and `loading`, `leftIcon` and `rightIcon`.
2. **`Card.jsx`**:
   - Elevated and bordered styling with HeroUI rounded corners (`rounded-2xl`) and subtle border color tokens.
   - Dual API:
     - Flat API: `title`, `subtitle`, `header`, `headerAction`, `footer`, `variant`, `padding`.
     - Compound API: `Card.Header`, `Card.Title`, `Card.Body`, `Card.Footer` for flexible layout composition.
3. **`Modal.jsx`**:
   - Backdrop with frosted glass effect (`bg-black/40 backdrop-blur-md`).
   - Smooth scale-in transition (`scale-[0.96]` to `scale-100`).
   - Body scroll locking on mount and unlocking on unmount.
   - Escape key listener and backdrop click handler.
4. **`Table.jsx`**:
   - HeroUI modern data table styling with subtle border separators, sticky header support, zebra row striping options, and smooth row hover transitions.
5. **`Loading.jsx`, `Error.jsx`, `EmptyState.jsx`**:
   - Polished SVG spinners, error cards with danger soft borders, and empty state containers with clear visual hierarchy.

### 3.3 Main Pages Synchronization

- **`tv2-web/src/pages/DashboardPage.jsx`**:
  - Modernize KPI Summary Cards (GPA, Credits, Current Standing) with HeroUI card elevation.
  - Refresh Cumulative GPA chart with high-contrast bars and smooth tooltips.
- **`tv2-web/src/pages/AcademicProgressPage.jsx`**:
  - Enhance progress bars and semester accordions with HeroUI radius and status tokens.
- **`tv3-planner-ui/src/pages/StudentProfilePage.js`**:
  - Modernize student profile card, dropdowns for member schools, faculties, and cohorts with HeroUI form styles.
- **`tv3-planner-ui/src/pages/StudyPlannerPage.js` & `ChatAdvisorPage.js`**:
  - Leverage injected `ui` components (`Button`, `Card`, `Modal`) for plan proposal cards, course moving actions, and quick prompts.

---

## 4. Verification & Testing Plan

1. **Automated Test Suite**:
   - Execute `npm test` covering all 115 tests across `tv2-web`, `tv3-planner-ui`, and `tv5-platform/contracts`.
   - Confirm 0 failures, 0 regressions.
2. **Architecture & Boundary Verification**:
   - Run `npm run check:architecture` to guarantee zero reverse dependencies.
   - Run `npm run check:ownership` and `npm run check:contracts`.
   - Run `npm run lint` for code style and syntax consistency.
3. **Build Verification**:
   - Execute `npm run build` (`build:planner` and `build:web`) to ensure Vite bundle succeeds with zero errors.

---

## 5. Deployment & Git Rules
- Strictly local commit only: `git commit -m "feat(ui): synchronize frontend with HeroUI v3 design system"`.
- NO `git push` to remote origin.
