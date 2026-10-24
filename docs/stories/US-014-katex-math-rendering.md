# US-014: LaTeX Math Offline Rendering with KaTeX

- **Story ID:** `US-014`
- **Parent Epic:** [EPIC-004: Advanced Rendering & Security Sanitization](../epics/EPIC-004-advanced-rendering-security.md)
- **Status:** `IN_PROGRESS`
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
- **Status:** `DONE`
- **Dependencies:** None
- **Completion Criteria:** WOFF2 fonts committed and referenced via local `@font-face` relative URLs.
- **Verification Command:** `npm run test:unit -- katex-adapter`
- **Expected Observable Result:** Inline and display math formulas render to HTML using bundled KaTeX fonts/CSS.
- **Evidence to Record:** KaTeX adapter test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-014.2: Integrate remark-math and rehype-katex into pipeline
- **Task ID:** `US-014.2`
- **Status:** `DONE`
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

### Task US-014.1: Bundle KaTeX CSS and fonts locally
- **Execution Date:** 2026-10-24
- **Agent ID:** Antigravity Autonomous Story Runner
- **Changed Files:**
  - `frontend/package.json` (added `katex: 0.16.47`, `@types/katex: ^0.16.7`, `@types/node`)
  - `frontend/package-lock.json`
  - `frontend/src/assets/fonts/katex/` (20 WOFF2 font files copied for offline rendering)
  - `frontend/src/styles/katex.css` (local `@font-face` definitions pointing to relative `../assets/fonts/katex/*.woff2`, zero remote network URLs)
  - `frontend/src/features/rendering/katex-adapter.ts` (strict options, MathML retention, fault isolation, syntax validation)
  - `frontend/src/features/rendering/katex-adapter.test.ts` (10 unit tests for adapter, font bundling, and offline CSS)
- **Terminal Output & Verification Evidence:**
```text
> markdown-viewer-frontend@0.1.0 test:unit
> vitest run katex-adapter

 RUN  v5.0.5 /home/repos/personal/markdown-go/frontend

 ✓ src/features/rendering/katex-adapter.test.ts (10 tests) 93ms
   ✓ KaTeX Adapter & Offline Bundling (US-014.1) (10)
     ✓ has strict default configuration conforming to PRD FR-RENDER-006 7ms
     ✓ renders inline math into HTML with MathML accessibility layer 10ms
     ✓ renders display math when displayMode is true 14ms
     ✓ handles empty or whitespace-only math without crashing 1ms
     ✓ provides safe inline error fallback on malformed LaTeX when throwOnError is false 3ms
     ✓ throws error on malformed LaTeX when throwOnError is explicitly true 1ms
     ✓ validates syntax correctly with isMathValid 5ms
     ✓ renders directly into a DOM element with renderMathToElement 43ms
     ✓ verifies all 20 KaTeX WOFF2 fonts are locally bundled in assets/fonts/katex 4ms
     ✓ verifies styles/katex.css references local relative fonts with zero external network URLs 2ms

 Test Files  1 passed (1)
      Tests  10 passed (10)
   Start at  17:45:16
   Duration  1.27s (environment 65%, setup 10%, transform 10%, tests 10%, import 4%, worker 1%)
```
- **Build Verification:**
```text
> markdown-viewer-frontend@0.1.0 build
> tsc && vite build --mode production
✓ built in 2.35s
```
- **Deferred Cross-Platform Checks:** Native Windows WebView2 and macOS WKWebView visual font rendering deferred to post-implementation cross-platform process (`NOT RUN`).

### Task US-014.2: Integrate remark-math and rehype-katex into pipeline
- **Execution Date:** 2026-10-24
- **Agent ID:** Antigravity Autonomous Story Runner
- **Changed Files:**
  - `frontend/package.json` (installed `remark-math: 6.0.0`, `rehype-katex: 7.0.1`)
  - `frontend/package-lock.json`
  - `frontend/src/features/rendering/MarkdownViewer.tsx` (configured `remarkMath` in `remarkPlugins` and `rehypeKatex` with `STRICT_KATEX_OPTIONS` in `rehypePlugins`)
  - `frontend/src/features/rendering/markdown.css` (styled KaTeX math and added warning badge for `.katex-error`)
  - `frontend/src/features/rendering/katex-error-fallback.test.tsx` (5 unit tests covering pipeline integration, safe error badge, graceful partial rendering, and multi-error isolation)
- **Terminal Output & Verification Evidence:**
```text
> markdown-viewer-frontend@0.1.0 test:unit
> vitest run katex-error-fallback

 RUN  v5.0.5 /home/repos/personal/markdown-go/frontend

 ✓ src/features/rendering/katex-error-fallback.test.tsx (5 tests) 710ms
   ✓ KaTeX Pipeline Integration & Error Fallback (US-014.2) (5)
     ✓ renders valid inline and display math via the unified pipeline 408ms
     ✓ renders malformed inline formula with safe error fallback badge without crashing 26ms
     ✓ renders malformed display formula with graceful partial rendering (FR-RENDER-009) 150ms
     ✓ handles unsupported or unknown LaTeX macros gracefully without throwing 56ms
     ✓ handles multiple distinct math errors across the document independently 63ms

 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  17:52:00
   Duration  5.33s (import 40%, environment 34%, tests 15%, transform 6%, setup 4%, worker 1%)
```
- **Build Verification:**
```text
> markdown-viewer-frontend@0.1.0 build
> tsc && vite build --mode production
✓ built in 4.28s
```
- **Deferred Cross-Platform Checks:** Native Windows WebView2 and macOS WKWebView math presentation deferred to post-implementation cross-platform validation workflow (`NOT RUN`).
