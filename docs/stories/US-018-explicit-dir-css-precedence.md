# US-018: Explicit HTML `dir` & Scoped CSS Direction Precedence

- **Story ID:** `US-018`
- **Parent Epic:** [EPIC-005: Bidirectional Text & Layout Engine (RTL/LTR)](../epics/EPIC-005-bidirectional-layout.md)
- **Status:** `IN_PROGRESS`
- **Assigned Phase:** Phase 4 (Advanced Rendering & Direction)

---

## 1. Objective and Expected Outcome

Enforce author-directed formatting and direction precedence:
1. Preserve explicit HTML `dir="rtl"`, `dir="ltr"`, and `dir="auto"` attributes provided by document authors on allowlisted elements (`div`, `span`, `p`, `table`, etc.).
2. Respect allowed author CSS rules setting `direction: rtl|ltr` or `text-align: right|left|center|justify|start|end` via inline styles or scoped `<style>` blocks.
3. Enforce strict precedence:
   - **First:** Explicit HTML `dir` attribute or scoped CSS direction rule.
   - **Second:** Automatic block-level strong character detection (if no explicit author direction).
   - **Third:** User default direction preference (from settings).
4. Auto-direction must **never** override explicit author `dir` or CSS direction.

---

## 2. Source PRD Requirements

- **FR-DIR-002:** Explicit HTML direction (Author markup takes precedence).
- **FR-DIR-003:** CSS direction and alignment (Safe inline & scoped style classes).
- **PRD Section 16:** Direction precedence default agreement.

---

## 3. Dependencies

- **Prerequisites:** [US-015](US-015-html-css-sanitization.md) (CSS parser) and [US-017](US-017-auto-direction-engine.md) (Auto direction).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - Direction resolver pipeline step (`features/direction/resolver.ts`).
  - Handling `<style>` classes applying direction (e.g. `.rtl-box { direction: rtl; }`).
- **Explicit Exclusions:**
  - Global styles affecting tabs or application UI outside `.markdown-content`.

---

## 5. Observable Acceptance Criteria

1. An English paragraph wrapped in `<div dir="rtl">English text</div>` renders aligned to the right with RTL base direction.
2. An element styled via `<style>.force-ltr { direction: ltr; }</style><p class="force-ltr">متن فارسی</p>` renders with LTR base direction.
3. An explicit author `dir` attribute on a parent node cascades to child nodes unless overridden by a nested child.
4. Auto-direction runs only on elements that do not already have an explicit direction assigned.
5. Injected CSS cannot escape `.markdown-content` to affect tabs or navigation menus.

---

## 6. Implementation Tasks

### Task US-018.1: Implement DirectionResolver pipeline stage
- **Task ID:** `US-018.1`
- **Status:** `DONE`
- **Dependencies:** None
- **Completion Criteria:** Checks node for existing `dir` attribute or computed style before running auto-detection.
- **Verification Command:** `npm run test:unit -- explicit-html-dir`
- **Expected Observable Result:** Author-specified HTML dir='rtl' or dir='ltr' attribute overrides auto-direction.
- **Evidence to Record:** Explicit dir test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-018.2: Support scoped class-based direction CSS
- **Task ID:** `US-018.2`
- **Status:** `READY`
- **Dependencies:** `US-018.1`
- **Completion Criteria:** CSS parser extracts direction classes and registers them with direction resolver.
- **Verification Command:** `npm run test:unit -- scoped-dir-css`
- **Expected Observable Result:** Scoped CSS classes for direction and alignment override paragraph direction.
- **Evidence to Record:** CSS direction test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-018.3: Write unit tests for precedence order
- **Task ID:** `US-018.3`
- **Status:** `DRAFT`
- **Dependencies:** `US-018.2`
- **Completion Criteria:** Tests assert explicit `dir` wins over auto-direction across 15+ test cases.
- **Verification Command:** `npm run test:unit -- dir-precedence`
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Run unit tests: `npm run test:unit -- dir-precedence`.
2. Open fixture `explicit-dir-styling.md`: verify explicit `dir="rtl"` forces English to right, and `.force-ltr` forces Persian to left.

---

## 8. Known Risks and Blockers

- CSS class matching inside virtual DOM AST. Ensure classes are properly evaluated or mapped to standard HTML attributes.

---

## 9. Implementation Notes and Validation Evidence

- **Execution Date:** 2026-10-25
- **Agent ID:** Antigravity Autonomous Agent
- **Changed Files:**
  - `frontend/src/features/direction/resolver.ts`
  - `frontend/src/features/direction/autoDirectionPlugin.ts`
  - `frontend/src/features/direction/explicit-html-dir.test.tsx`
- **Terminal Output & Verification Evidence:**
  - `npm run test:unit -- explicit-html-dir`:
```text
 ✓ src/features/direction/explicit-html-dir.test.tsx (15 tests) 271ms
   ✓ US-018.1: Explicit HTML dir attribute and DirectionResolver (15)
     ✓ resolveExplicitDir utility (7)
       ✓ resolves explicit dir="rtl" attribute 4ms
       ✓ resolves explicit dir="ltr" attribute 1ms
       ✓ resolves explicit dir="auto" attribute 1ms
       ✓ normalizes case for dir attribute (RTL / LTR / AUTO) 1ms
       ✓ ignores invalid dir attribute values 0ms
       ✓ extracts explicit direction from inline style attribute 0ms
       ✓ returns undefined when neither dir nor direction style is present 0ms
     ✓ MarkdownViewer rendering with explicit HTML dir attributes (8)
       ✓ preserves explicit dir="rtl" on English paragraphs and does not override with auto 80ms
       ✓ preserves explicit dir="ltr" on Persian paragraphs and does not override with auto 9ms
       ✓ cascades explicit dir="rtl" from parent container to child paragraphs without dir="auto" override (AC 1 & AC 3) 14ms
       ✓ allows a child paragraph to explicitly override parent container direction (AC 3) 7ms
       ✓ allows a child paragraph to explicitly opt into auto-detection via dir="auto" inside parent container 8ms
       ✓ applies dir="auto" to un-directed block elements outside any explicit direction container 95ms
       ✓ preserves explicit dir on headings, blockquotes, and table cells 34ms
       ✓ respects inline style direction: rtl 10ms

 Test Files  1 passed (1)
      Tests  15 passed (15)
   Duration  2.11s
```
  - `npx tsc --noEmit`: Clean exit code 0.
  - `npm run test:unit -- src/features/direction/`: 5 passed test files, 94 passed tests.
