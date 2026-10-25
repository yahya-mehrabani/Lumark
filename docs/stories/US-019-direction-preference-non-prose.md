# US-019: User Direction Preference & Non-Prose Bidi Protection

- **Story ID:** `US-019`
- **Parent Epic:** [EPIC-005: Bidirectional Text & Layout Engine (RTL/LTR)](../epics/EPIC-005-bidirectional-layout.md)
- **Status:** `DONE`
- **Assigned Phase:** Phase 4 (Advanced Rendering & Direction)

---

## 1. Objective and Expected Outcome

Implement user default direction preferences and protect non-prose elements from bidi distortion:
1. Provide a user preference setting with three options: `Auto` (default), `RTL`, and `LTR`.
2. This preference serves as the document fallback only when the document does not supply an explicit author direction or when auto-direction is neutral.
3. Strictly enforce LTR direction on all non-prose elements:
   - Fenced and inline code blocks (`pre`, `code`).
   - Mermaid diagram definitions and rendered diagrams.
   - KaTeX inline and display mathematical formulas.
4. Non-prose elements embedded within RTL paragraphs must retain an isolated LTR sub-context (`dir="ltr"` and `unicode-bidi: isolate`) so syntax and operators are never corrupted.

---

## 2. Source PRD Requirements

- **FR-DIR-004:** User default direction (Auto, RTL, LTR).
- **FR-DIR-005:** Non-prose direction (Code, Mermaid, math enforced LTR).

---

## 3. Dependencies

- **Prerequisites:** [US-017](US-017-auto-direction-engine.md) and [US-018](US-018-explicit-dir-css-precedence.md).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - Preferences hook in direction resolver.
  - Hardcoded LTR wrapper on `pre`, `code`, `mermaid-container`, and `katex-container`.
- **Explicit Exclusions:**
  - Persisting settings to disk (handled in Epic 7, US-025).

---

## 5. Observable Acceptance Criteria

1. Setting user preference to "RTL" causes a document without explicit direction to align all neutral blocks to the right.
2. Setting user preference to "LTR" causes neutral blocks to align to the left.
3. In all preference modes, code fences ````go ... ```` remain strictly left-aligned with LTR punctuation and indentation intact.
4. Mathematical formulas inside an RTL paragraph (e.g. `فرمول $f(x) = a x + b$ مهم است.`) render the equation LTR from left to right without reversing characters.
5. Mermaid diagrams inside an RTL document remain rendered LTR without node or arrow reversal.

---

## 6. Implementation Tasks

### Task US-019.1: Enforce LTR on non-prose AST nodes
- **Task ID:** `US-019.1`
- **Status:** `DONE`
- **Dependencies:** None
- **Completion Criteria:** Remark/rehype plugins explicitly assign `dir="ltr"` to `code`, `pre`, math, and diagram nodes.
- **Verification Command:** `npm run test:unit -- non-prose-ltr`
- **Expected Observable Result:** Code blocks, math formulas, and Mermaid diagrams strictly enforced to LTR.
- **Evidence to Record:** Non-prose isolation test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-019.2: Connect user direction preference to DirectionResolver
- **Task ID:** `US-019.2`
- **Status:** `DONE`
- **Dependencies:** `US-019.1`
- **Completion Criteria:** Resolver queries active user preference when evaluating un-annotated blocks.
- **Verification Command:** `npm run test:unit -- default-direction-setting`
- **Expected Observable Result:** User preference for default document direction applied to unclassified blocks.
- **Evidence to Record:** Default direction test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-019.3: Write unit tests for non-prose bidi isolation
- **Task ID:** `US-019.3`
- **Status:** `DONE`
- **Dependencies:** `US-019.2`
- **Completion Criteria:** Tests assert code blocks in RTL paragraphs retain `dir="ltr"` and pristine whitespace.
- **Verification Command:** `npm run test:unit -- non-prose-bidi`
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Run unit tests: `npm run test:unit -- non-prose-bidi`.
2. Open fixture `mixed-bidi-tech.md`: inspect code block inside Persian section; verify code alignment is left-to-right.

---

## 8. Known Risks and Blockers

- Parent RTL styles causing code block line-number or indentation inversion in some CSS engines. Mitigated by explicit `direction: ltr !important; text-align: left !important;` on `.code-container`.

---

## 9. Implementation Notes and Validation Evidence

### Task US-019.1 Verification Evidence (Executed 2026-10-25)
- **Task:** `US-019.1: Enforce LTR on non-prose AST nodes`
- **Status:** `DONE`
- **Changed Files:**
  - `frontend/src/features/direction/resolver.ts`
  - `frontend/src/features/rendering/components/CodeBlock.tsx`
  - `frontend/src/features/rendering/MarkdownViewer.tsx`
  - `frontend/src/features/rendering/markdown.css`
  - `frontend/src/features/direction/non-prose-ltr.test.tsx`
  - `frontend/src/features/direction/auto-direction-dom.test.tsx`
- **Verification Command & Result:**
```text
$ npm run test:unit -- non-prose-ltr

> markdown-viewer-frontend@0.1.0 test:unit
> vitest run non-prose-ltr

 ✓ src/features/direction/non-prose-ltr.test.tsx (13 tests) 836ms
   ✓ US-019.1: Enforce LTR on Non-Prose AST Nodes (FR-DIR-005) (13)
     ✓ 1. AST Helper & Tag Class Classification (3)
       ✓ identifies pre, code, and math as non-prose tags 4ms
       ✓ identifies math, katex, mermaid, and code container classes as non-prose 1ms
       ✓ isNonProseNode returns true for non-prose HAST elements 1ms
     ✓ 2. RehypeDirectionResolver AST Transformation (4)
       ✓ assigns dir="ltr" to pre and code elements in HAST tree 1ms
       ✓ assigns dir="ltr" to math and diagram elements in HAST tree 1ms
       ✓ enforces LTR on non-prose nodes even when nested inside an explicit RTL container 0ms
       ✓ enforces LTR on inline code within an auto-directed RTL paragraph 0ms
     ✓ 3. End-to-End MarkdownViewer DOM Verification (6)
       ✓ renders fenced code block with strict LTR isolation and dir="ltr" 208ms
       ✓ renders inline code inside Persian text with explicit dir="ltr" 14ms
       ✓ renders KaTeX inline formula with dir="ltr" in Persian context 41ms
       ✓ renders KaTeX display equation with dir="ltr" in RTL section 28ms
       ✓ renders Mermaid diagram with dir="ltr" inside Persian document 519ms
       ✓ isolates code block inside explicit dir="rtl" blockquote 11ms

 Test Files  1 passed (1)
      Tests  13 passed (13)
   Start at  08:51:27
   Duration  3.00s
```

Full direction regression test suite verification:
```text
$ npm run test:unit -- src/features/direction

 Test Files  8 passed (8)
      Tests  142 passed (142)
   Duration  15.85s
```

Frontend dev build check:
```text
$ npm run build:dev
✓ built in 2.04s (zero TypeScript / Vite bundling errors)
```

### Task US-019.2 Verification Evidence (Executed 2026-10-25)
- **Task:** `US-019.2: Connect user direction preference to DirectionResolver`
- **Status:** `DONE`
- **Changed Files:**
  - `frontend/src/features/direction/directionPreferences.ts`
  - `frontend/src/features/direction/resolver.ts`
  - `frontend/src/features/direction/autoDirection.ts`
  - `frontend/src/features/rendering/MarkdownViewer.tsx`
  - `frontend/src/features/direction/default-direction-setting.test.tsx`
- **Verification Command & Result:**
```text
$ npm run test:unit -- default-direction-setting

> markdown-viewer-frontend@0.1.0 test:unit
> vitest run default-direction-setting

 ✓ src/features/direction/default-direction-setting.test.tsx (15 tests) 251ms
   ✓ US-019.2: User Direction Preference & Document Fallback (FR-DIR-004) (15)
     ✓ 1. Preference Store & Reactive Subscriptions (3)
       ✓ defaults active direction preference to "auto" 4ms
       ✓ updates active preference to "rtl" and "ltr" 1ms
       ✓ notifies subscribers upon preference change 2ms
     ✓ 2. RehypeDirectionResolver Preference Evaluation on AST Nodes (7)
       ✓ applies dir="rtl" to neutral block when user preference is "rtl" 2ms
       ✓ applies dir="ltr" to neutral block when user preference is "ltr" 1ms
       ✓ applies dir="auto" to neutral block when user preference is "auto" 0ms
       ✓ auto-detection with strong characters takes precedence over user preference 1ms
       ✓ explicit HTML author markup overrides user preference 1ms
       ✓ scoped CSS class direction overrides user preference 5ms
       ✓ non-prose elements remain strictly dir="ltr" under RTL user preference 1ms
     ✓ 3. MarkdownViewer End-to-End DOM Integration (5)
       ✓ aligns neutral blocks to the right when user preference is RTL (AC 1) 65ms
       ✓ aligns neutral blocks to the left when user preference is LTR (AC 2) 9ms
       ✓ supports directionPreference prop directly on MarkdownViewer 8ms
       ✓ code blocks remain strictly LTR even when user preference is RTL (AC 3) 123ms
       ✓ dynamically responds to setActiveDirectionPreference updates 23ms

 Test Files  1 passed (1)
      Tests  15 passed (15)
   Start at  08:57:23
   Duration  2.45s
```

Full direction regression test suite verification:
```text
$ npm run test:unit -- src/features/direction

 Test Files  9 passed (9)
      Tests  157 passed (157)
   Start at  08:57:32
   Duration  19.04s
```

Frontend dev build check:
```text
$ npm run build:dev
✓ built in 1.78s (zero TypeScript / Vite bundling errors)
```

### Task US-019.3 Verification Evidence (Executed 2026-10-25)
- **Task:** `US-019.3: Write unit tests for non-prose bidi isolation`
- **Status:** `DONE`
- **Changed Files:**
  - `frontend/src/features/direction/non-prose-bidi.test.tsx`
- **Verification Command & Result:**
```text
$ npm run test:unit -- non-prose-bidi

> markdown-viewer-frontend@0.1.0 test:unit
> vitest run non-prose-bidi

 ✓ src/features/direction/non-prose-bidi.test.tsx (15 tests) 1901ms
   ✓ US-019.3: Non-Prose Bidi Protection & Layout Isolation Suite (15)
     ✓ 1. Code Block Bidi Isolation in Persian RTL Context (3)
       ✓ code blocks in RTL paragraphs retain dir="ltr" and left alignment (AC 3) 253ms
       ✓ preserves pristine indentation, whitespace, and brackets without bidi inversion 23ms
       ✓ preserves symbols, arrows, and relational operators (<, >, <=, >=, !=, ==) in code fences 25ms
     ✓ 2. Inline Code Bidi Isolation in Mixed RTL/LTR Sentences (3)
       ✓ inline code inside Persian paragraph retains dir="ltr" without punctuation jump 15ms
       ✓ multiple inline code snippets in Persian sentence all receive dir="ltr" 12ms
       ✓ inline code in Arabic paragraph retains dir="ltr" 7ms
     ✓ 3. Mathematical Formulas in RTL Contexts (KaTeX) (3)
       ✓ inline formula in Persian paragraph renders strictly LTR without character reversal (AC 4) 57ms
       ✓ complex quadratic formula in Persian text maintains LTR operators and fraction 47ms
       ✓ display math block inside RTL document maintains centered LTR rendering 48ms
     ✓ 4. Mermaid Diagrams in RTL Contexts (2)
       ✓ Mermaid diagrams inside RTL document remain strictly LTR without arrow reversal (AC 5) 647ms
       ✓ Mermaid sequence diagram renders LTR under active RTL preference 562ms
     ✓ 5. Nested RTL Containers & Document Structures (4)
       ✓ code block inside explicit dir="rtl" div retains dir="ltr" 123ms
       ✓ code block inside RTL list item retains dir="ltr" 30ms
       ✓ code block inside RTL blockquote retains dir="ltr" 22ms
       ✓ table with Persian text isolates inline code in cells to LTR 19ms

 Test Files  1 passed (1)
      Tests  15 passed (15)
   Start at  09:00:47
   Duration  6.90s
```

Full direction regression test suite verification:
```text
$ npm run test:unit -- src/features/direction

 Test Files  10 passed (10)
      Tests  172 passed (172)
   Start at  09:01:10
   Duration  28.89s
```

Frontend dev build check:
```text
$ npm run build:dev
✓ built in 2.56s (zero TypeScript / Vite bundling errors)
```
