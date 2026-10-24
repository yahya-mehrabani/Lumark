# US-015: HTML & CSS Sanitization and Scope Isolation Engine

- **Story ID:** `US-015`
- **Parent Epic:** [EPIC-004: Advanced Rendering & Security Sanitization](../epics/EPIC-004-advanced-rendering-security.md)
- **Status:** `IN_PROGRESS`
- **Assigned Phase:** Phase 4 (Advanced Rendering & Security)

---

## 1. Objective and Expected Outcome

Implement the AST-based HTML and CSS sanitization engine:
1. Sanitize raw HTML fragments embedded in Markdown using `rehype-sanitize` with an explicit allowlist of safe semantic tags and attributes.
2. Strip all active executable elements (`<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, `<input>`, `<base>`, `<meta>`) and all inline event attributes (`onclick`, `onerror`, etc.).
3. Sanitize embedded `<style>` blocks and inline `style` attributes using a dedicated CSS AST parser (e.g. PostCSS) rather than regular expressions.
4. Scope all CSS selectors by prepending `.markdown-content`, preventing author styles from altering application chrome or tab navigation.
5. Strip unsafe CSS declarations (`@import`, `position: fixed`, `url()` to remote resources, `behavior`, `expression()`).

---

## 2. Source PRD Requirements

- **FR-RENDER-007:** Raw HTML fragments (Safe inline/block HTML subject to sanitization).
- **PRD Section 7.3 & 7.4:** 10-step rendering pipeline & CSS allowlist baseline.
- **PRD Section 8.1 & 8.2:** Security invariants 1, 2, 6 (No script execution, no bridge exposure, CSS containment).
- **docs/decisions/ADR-0003:** HTML & CSS sanitization policy.

---

## 3. Dependencies

- **Prerequisites:** [US-009](US-009-commonmark-gfm-pipeline.md) (Rendering pipeline).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - `frontend/src/features/rendering/security/htmlSanitizer.ts`.
  - `frontend/src/features/rendering/security/cssSanitizer.ts`.
  - Scoping transform for `<style>` blocks.
- **Explicit Exclusions:**
  - Allowing remote fonts or remote stylesheet imports.

---

## 5. Observable Acceptance Criteria

1. Safe HTML like `<div dir="rtl" class="highlight"><span style="color: red;">Text</span></div>` renders safely with color and direction intact.
2. `<script>alert(1)</script>` is completely removed from the DOM; no script executes.
3. `<img src=x onerror=alert(1)>` has `onerror` stripped cleanly.
4. A `<style>` block containing `.sidebar { color: blue; }` is rewritten to `.markdown-content .sidebar { color: blue; }`.
5. A style containing `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;` has `position: fixed` stripped or converted to `absolute` to prevent viewport overlays.
6. CSS `@import url("http://evil.com/style.css")` is completely stripped.
7. Malformed or rejected HTML/CSS fragments (e.g. unclosed tags, invalid CSS syntax) do not abort or blank the document render; the pipeline performs graceful partial rendering with an inline fallback or safe plain-text representation (FR-RENDER-009, AUD-010).

---

## 6. Implementation Tasks

### Task US-015.1: Configure rehype-sanitize schema allowlist
- **Task ID:** `US-015.1`
- **Status:** `DONE`
- **Dependencies:** None
- **Completion Criteria:** Allowlist allows semantic tags and attributes (`dir`, `lang`, `class`, `style`), strips active elements.
- **Verification Command:** `npm run test:unit -- html-allowlist`
- **Expected Observable Result:** Only allowlisted HTML tags and safe attributes pass through; scripts stripped.
- **Evidence to Record:** HTML sanitization test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-015.2: Implement AST-based CSS sanitizer and selector scoper
- **Task ID:** `US-015.2`
- **Status:** `DONE`
- **Dependencies:** `US-015.1`
- **Completion Criteria:** Parses CSS AST, prepends root class, strips disallowed declarations and at-rules.
- **Verification Command:** `npm run test:unit -- css-sanitizer`
- **Expected Observable Result:** CSS parser strips @import, position:fixed, and selectors targeting chrome.
- **Evidence to Record:** CSS sanitization test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-015.3: Integrate sanitizers into Markdown rendering pipeline
- **Task ID:** `US-015.3`
- **Status:** `DRAFT`
- **Dependencies:** `US-015.2`
- **Completion Criteria:** HTML and CSS sanitizers execute sequentially before node rendering.
- **Verification Command:** `npm run test:unit -- style-scoping`
- **Expected Observable Result:** Allowed CSS rules scoped strictly within .markdown-content container.
- **Evidence to Record:** Style scoping test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-015.4: Write unit tests for HTML and CSS sanitization
- **Task ID:** `US-015.4`
- **Status:** `DRAFT`
- **Dependencies:** `US-015.3`
- **Completion Criteria:** Vitest suite verifies stripping of event handlers, scripts, and CSS overlay rules.
- **Verification Command:** `npm run test:unit -- sanitization`
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Run unit test suite: `npm run test:unit -- sanitization`.
2. Inspect rendered DOM for malicious payload: verify no unauthorized attributes or scripts exist.

---

## 8. Known Risks and Blockers

- Browser CSS parser quirks with malformed CSS. The AST parser must discard unparseable rules rather than passing them through raw.

---

## 9. Implementation Notes and Validation Evidence

- **Execution Date:** 2026-10-24
- **Agent ID:** Autonomous Implementation Agent
- **Changed Files:**
  - `frontend/package.json`
  - `frontend/package-lock.json`
  - `frontend/src/features/rendering/security/htmlSanitizer.ts`
  - `frontend/src/features/rendering/security/html-allowlist.test.ts`
  - `frontend/src/features/rendering/security/cssSanitizer.ts`
  - `frontend/src/features/rendering/security/css-sanitizer.test.ts`
  - `docs/stories/US-015-html-css-sanitization.md`
- **Terminal Output & Verification Evidence:**

#### Task US-015.1: Configure rehype-sanitize schema allowlist
Command: `npm run test:unit -- html-allowlist`
```text
> markdown-viewer-frontend@0.1.0 test:unit
> vitest run html-allowlist

 RUN  v5.0.5 /home/repos/personal/markdown-go/frontend

 ✓ src/features/rendering/security/html-allowlist.test.ts (10 tests) 91ms
   ✓ Rehype-Sanitize Schema Allowlist (US-015.1) (10)
     ✓ allows safe semantic HTML tags and attributes 29ms
     ✓ preserves tables, lists, and formatting tags from raw HTML 11ms
     ✓ completely strips <script> tags and active script content 9ms
     ✓ strips inline event handler attributes (onerror, onclick, onload) 7ms
     ✓ strips active executable tags (iframe, object, embed, form, button, base, meta) 5ms
     ✓ strips arbitrary input elements outside of task lists 3ms
     ✓ preserves GFM task list checkboxes inside list items 8ms
     ✓ strips dangerous href protocols like javascript:, vbscript:, and data: 7ms
     ✓ preserves safe img src protocols and relative paths while stripping javascript: 4ms
     ✓ retains MathML tags and <style> in schema for subsequent pipeline stages 5ms

 Test Files  1 passed (1)
      Tests  10 passed (10)
   Start at  18:29:11
   Duration  1.45s (environment 58%, import 18%, tests 8%, transform 8%, setup 7%, worker 1%)
```
TypeScript compilation check (`npx tsc --noEmit`): Exit code 0 (zero errors).

#### Task US-015.2: Implement AST-based CSS sanitizer and selector scoper
Command: `npm run test:unit -- css-sanitizer`
```text
> markdown-viewer-frontend@0.1.0 test:unit
> vitest run css-sanitizer

 RUN  v5.0.5 /home/repos/personal/markdown-go/frontend

 ✓ src/features/rendering/security/css-sanitizer.test.ts (19 tests) 115ms
   ✓ AST-Based CSS Sanitizer & Selector Scoper (US-015.2) (19)
     ✓ Selector Scoping (5)
       ✓ prepends .markdown-content to class selectors 19ms
       ✓ scopes multi-selector rules separated by commas 2ms
       ✓ rewrites body, html, and :root selectors to .markdown-content 14ms
       ✓ prevents styles from escaping container by scoping chrome selectors 4ms
       ✓ supports custom container selector prefix 8ms
     ✓ At-Rules and Overlay Neutralization (8)
       ✓ completely strips @import at-rules (AC 6) 3ms
       ✓ strips @font-face and @keyframes at-rules 3ms
       ✓ converts position: fixed to position: absolute to prevent viewport overlays (AC 5) 1ms
       ✓ strips position: sticky 10ms
       ✓ clamps excessive z-index declarations to max 10 3ms
       ✓ strips remote url() declarations from background images 4ms
       ✓ strips executable expressions, javascript: and -moz-binding 10ms
       ✓ removes rule completely if all declarations are stripped 1ms
     ✓ Inline Style Sanitization (3)
       ✓ sanitizes inline styles and neutralizes position: fixed 2ms
       ✓ strips url() declarations and clamps z-index from inline styles 1ms
       ✓ returns empty string for invalid inline styles 1ms
     ✓ Graceful Degradation on Malformed CSS (AC 7 & AUD-010) (2)
       ✓ returns empty string for malformed or unparseable CSS without throwing 14ms
       ✓ returns empty string for empty or non-string inputs 2ms
     ✓ Rehype Plugin Transform (rehypeScopedCss) (1)
       ✓ transforms <style> tags and inline style attributes in Hast tree 2ms

 Test Files  1 passed (1)
      Tests  19 passed (19)
   Start at  18:36:21
   Duration  1.59s (environment 65%, setup 11%, tests 9%, transform 9%, import 3%, worker 2%)
```
TypeScript compilation check (`npx tsc --noEmit`): Exit code 0 (zero errors).
