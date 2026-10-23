# US-018: Explicit HTML `dir` & Scoped CSS Direction Precedence

- **Story ID:** `US-018`
- **Parent Epic:** [EPIC-005: Bidirectional Text & Layout Engine (RTL/LTR)](../epics/EPIC-005-bidirectional-layout.md)
- **Status:** `DRAFT`
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
- **Status:** `DRAFT`
- **Dependencies:** None
- **Completion Criteria:** Checks node for existing `dir` attribute or computed style before running auto-detection.
- **Verification Command:** `npm run test:unit -- explicit-html-dir`
- **Expected Observable Result:** Author-specified HTML dir='rtl' or dir='ltr' attribute overrides auto-direction.
- **Evidence to Record:** Explicit dir test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-018.2: Support scoped class-based direction CSS
- **Task ID:** `US-018.2`
- **Status:** `DRAFT`
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

*(To be filled by implementation agent during execution)*
- **Execution Date:** Not yet executed
- **Agent ID:** N/A
- **Changed Files:** None
- **Terminal Output & Verification Evidence:**
```text
(Awaiting execution in Phase 4)
```
