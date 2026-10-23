# US-014: LaTeX Math Offline Rendering with KaTeX

- **Story ID:** `US-014`
- **Parent Epic:** [EPIC-004: Advanced Rendering & Security Sanitization](../epics/EPIC-004-advanced-rendering-security.md)
- **Status:** `DRAFT`
- **Assigned Phase:** Phase 4 (Advanced Rendering & Security)

---

## 1. Objective and Expected Outcome

Render mathematical expressions offline using locally bundled KaTeX:
1. Recognize inline math (`$...$`) and display math blocks (`$$...$$`).
2. Render formulas using locally bundled KaTeX CSS and web fonts (WOFF2) with zero network calls.
3. Ordinary dollar signs in prose (e.g. `The price is $5.00 and $10.00`) must not trigger accidental math rendering.
4. Malformed LaTeX formulas or unsupported macros must render a readable inline error or raw formula fallback rather than throwing uncaught exceptions.
5. Long display equations must scroll horizontally without clipping or breaking layout.

---

## 2. Source PRD Requirements

- **FR-RENDER-006:** LaTeX math (Inline, display, KaTeX local assets, offline, MathML retention).
- **FR-RENDER-009:** Graceful partial rendering.
- **PRD Section 5.4:** Math horizontal scrolling.

---

## 3. Dependencies

- **Prerequisites:** [US-009](US-009-commonmark-gfm-pipeline.md) (Rendering pipeline).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - `remark-math` and `rehype-katex` integration into the unified pipeline.
  - Bundling KaTeX fonts in `frontend/src/assets/fonts/katex/` and local CSS in `styles/katex.css`.
  - Custom error fallback component for math parse errors.
- **Explicit Exclusions:**
  - Remote MathJax or external CDN font loading.

---

## 5. Observable Acceptance Criteria

1. Inline math `$a^2 + b^2 = c^2$` renders formatted mathematical superscripts and italic variables.
2. Display math `$$\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$$` renders centered with proper mathematical symbols.
3. Text `$10 and $20` remains plain prose without math conversion.
4. Invalid formula `$$\frac{1}{$$` renders raw text with error indicator, without crashing the document.
5. Formula rendering works completely offline with zero network requests.

---

## 6. Implementation Tasks

### Task US-014.1: Bundle KaTeX CSS and fonts locally
- **Task ID:** `US-014.1`
- **Status:** `DRAFT`
- **Dependencies:** None
- **Completion Criteria:** WOFF2 fonts committed and referenced via local `@font-face` relative URLs.
- **Verification Command:** `npm run test:unit -- katex-adapter`
- **Expected Observable Result:** Inline and display math formulas render to HTML using bundled KaTeX fonts/CSS.
- **Evidence to Record:** KaTeX adapter test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-014.2: Integrate remark-math and rehype-katex into pipeline
- **Task ID:** `US-014.2`
- **Status:** `DRAFT`
- **Dependencies:** `US-014.1`
- **Completion Criteria:** Configures parser with `throwOnError: false` to allow graceful fallbacks.
- **Verification Command:** `npm run test:unit -- katex-error-fallback`
- **Expected Observable Result:** Malformed LaTeX formula displays raw formula with warning badge.
- **Evidence to Record:** KaTeX error fallback test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-014.3: Implement horizontal scrolling for display equations
- **Task ID:** `US-014.3`
- **Status:** `DRAFT`
- **Dependencies:** `US-014.2`
- **Completion Criteria:** Container `.katex-display` has `overflow-x: auto` and padding.
- **Verification Command:** `npm run test:unit -- katex-currency-avoidance`
- **Expected Observable Result:** Currency symbols (e.g. $100 and $200) not falsely interpreted as math delimiters.
- **Evidence to Record:** Currency avoidance test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-014.4: Write unit tests for math rendering
- **Task ID:** `US-014.4`
- **Status:** `DRAFT`
- **Dependencies:** `US-014.3`
- **Completion Criteria:** Tests assert math HTML generation, currency protection, and error handling.
- **Verification Command:** `npm run test:unit -- math`
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Run unit tests: `npm run test:unit -- math`.
2. Open fixture `math-katex.md` with network disconnected: verify formulas display cleanly with KaTeX fonts.

---

## 8. Known Risks and Blockers

- Accidental currency syntax matches. Ensure `remark-math` strict spacing rules are enforced.

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
