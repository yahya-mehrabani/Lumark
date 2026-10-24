# US-016: Adversarial Security Test Corpus & Fault Isolation

- **Story ID:** `US-016`
- **Parent Epic:** [EPIC-004: Advanced Rendering & Security Sanitization](../epics/EPIC-004-advanced-rendering-security.md)
- **Status:** `IN_PROGRESS`
- **Assigned Phase:** Phase 4 (Advanced Rendering & Security)

---

## 1. Objective and Expected Outcome

Create and maintain an extensive corpus of adversarial security fixtures and automated security verification tests:
1. Establish `fixtures/security/` containing adversarial payloads targeting XSS, HTML injection, CSS escape, SVG script execution, and protocol smuggling.
2. Build automated tests that assert unsafe behavior is neutralized (e.g., verifying attributes are absent from the DOM, scripts did not fire, links do not execute), not merely that rendering did not crash.
3. Test pathological inputs: 100+ levels of nested blockquotes/lists and oversized single-line inputs to ensure fault isolation without memory exhaustion.

---

## 2. Source PRD Requirements

- **PRD Section 8.1:** Security invariants (P0).
- **PRD Section 8.3:** Sanitization test corpus (Mandatory fixtures).
- **PRD Section 8.4:** Privacy invariants (No telemetry, no remote loading).

---

## 3. Dependencies

- **Prerequisites:** [US-013](US-013-mermaid-offline-rendering.md) and [US-015](US-015-html-css-sanitization.md).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - `fixtures/security/` corpus:
    - `xss-scripts.md` (`<script>`, nested scripts, SVG scripts).
    - `event-handlers.md` (`onerror`, `onload`, `onmouseover`, obfuscated handlers).
    - `protocols.md` (`javascript:`, `data:`, `vbscript:`, mixed-case `JavaScriPt:`).
    - `css-overlays.md` (Fixed positioning, z-index hijacking, chrome targeting).
    - `mermaid-injection.md` (`click` directives, SVG script tags).
    - `deep-nesting-dos.md` (Deeply nested lists, extreme line lengths).
  - Automated runner executing all fixtures through the sanitization pipeline.
- **Explicit Exclusions:**
  - Network-based penetration testing (the app is strictly local-first).

---

## 5. Observable Acceptance Criteria

1. 100% of malicious script tags and event handlers in `fixtures/security/` are stripped before DOM insertion.
2. Injected CSS overlays cannot cover the application titlebar or tab strip.
3. Obfuscated protocol URLs (`java script:`, `data:text/html,...`) are neutralized or blocked upon click.
4. Rendering `deep-nesting-dos.md` finishes within bounded time (< 1s) without throwing a stack overflow exception.
5. All security tests pass in CI.

---

## 6. Implementation Tasks

### Task US-016.1: Author adversarial fixture files
- **Task ID:** `US-016.1`
- **Status:** `DONE`
- **Dependencies:** None
- **Completion Criteria:** Commit full set of adversarial fixtures to `fixtures/security/`.
- **Verification Command:** `npm run test:security`
- **Expected Observable Result:** Zero scripts, event handlers, or active SVG payloads execute.
- **Evidence to Record:** Security corpus test execution output.
- **Environment Handling:** Node.js / Vitest security test runner.

### Task US-016.2: Implement automated adversarial test runner
- **Task ID:** `US-016.2`
- **Status:** `DONE`
- **Dependencies:** `US-016.1`
- **Completion Criteria:** Vitest test suite loads each fixture, renders through pipeline, and queries DOM for forbidden tags/attributes.
- **Verification Command:** `npm run test:security -- dos-corpus`
- **Expected Observable Result:** Deeply nested lists (100+ levels) and oversized attributes handled without stack overflow.
- **Evidence to Record:** DoS test execution output.
- **Environment Handling:** Node.js / Vitest security test runner.

### Task US-016.3: Add fuzzing and pathological nesting checks
- **Task ID:** `US-016.3`
- **Status:** `READY`
- **Dependencies:** `US-016.2`
- **Completion Criteria:** Tests assert parser termination on deeply nested blocks.
- **Verification Command:** `npm run test:security`
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Run security test suite: `npm run test:security`.
2. Verify all adversarial test assertions pass.
3. Review console logs to verify no script evaluation warnings or uncaught errors.

---

## 8. Known Risks and Blockers

- Browser DOM parser normalizing certain bypasses in unexpected ways. AST-level sanitization avoids DOM-parser re-interpretation vulnerabilities.

---

## 9. Implementation Notes and Validation Evidence

### Task US-016.1 Validation Evidence
- **Execution Date:** 2026-10-24
- **Agent ID:** Antigravity Autonomous Story Runner
- **Status:** `DONE`
- **Changed Files:**
  - `fixtures/security/xss-scripts.md`
  - `fixtures/security/event-handlers.md`
  - `fixtures/security/protocols.md`
  - `fixtures/security/css-overlays.md`
  - `fixtures/security/mermaid-injection.md`
  - `fixtures/security/deep-nesting-dos.md`
  - `frontend/package.json`
- **Actions Executed:**
  1. Authored complete adversarial security test corpus in `fixtures/security/` covering:
     - `xss-scripts.md`: Direct `<script>`, nested `<scr<script>ipt>`, SVG scripts, CDATA, `<iframe>`, `<object>`, `<embed>`, `<form>`, `<base>`, `<meta>`.
     - `event-handlers.md`: Image `onerror`/`onload`, mouse `onmouseover`/`onclick`/`onmouseenter`, focus `onfocus`/`onblur`, obfuscated casings (`ONERROR`, `OnMouseOver`), and SVG handlers.
     - `protocols.md`: Direct `javascript:`, mixed-case `JavaScriPt:`, whitespace/control-char obfuscations, `data:text/html`, `vbscript:`, dangerous system protocols (`file:`, `shell:`, `ms-msdt:`), and safe link benchmarks.
     - `css-overlays.md`: Fixed positioning overlay (`position: fixed`, z-index 999999), application chrome selectors (`.tab-bar`, `.app-shell`, `body`, `#app`), `@import` injection, external `url()` background exfiltration, and safe scoped styles.
     - `mermaid-injection.md`: Mermaid click callbacks (`click B callback`), JavaScript URIs (`click Action "javascript:..."`), Data URIs, injected HTML script tags in node labels, and safe diagrams.
     - `deep-nesting-dos.md`: Deeply nested blockquotes (120 levels), nested unordered lists (100 levels), nested HTML tags (50 levels), and 10,000-character line.
  2. Added `"test:security": "vitest run src/features/rendering/security/"` to `frontend/package.json`.
  3. Executed `npm run test:security` to confirm runner integration and baseline test suite pass (4 test files, 51 tests PASS).
- **Terminal Output & Verification Evidence:**
```text
> markdown-viewer-frontend@0.1.0 test:security
> vitest run src/features/rendering/security/

 RUN  v5.0.5 /home/repos/personal/markdown-go/frontend

 ✓ src/features/rendering/security/sanitization.test.tsx (15 tests) 633ms
 ✓ src/features/rendering/security/style-scoping.test.tsx (7 tests) 326ms
 ✓ src/features/rendering/security/css-sanitizer.test.ts (19 tests) 86ms
 ✓ src/features/rendering/security/html-allowlist.test.ts (10 tests) 95ms

 Test Files  4 passed (4)
      Tests  51 passed (51)
   Duration  9.53s
```

### Task US-016.2 Validation Evidence
- **Execution Date:** 2026-10-24
- **Agent ID:** Antigravity Autonomous Story Runner
- **Status:** `DONE`
- **Changed Files:**
  - `frontend/src/features/rendering/security/adversarial-corpus.test.tsx`
  - `fixtures/security/mermaid-injection.md`
  - `docs/stories/US-016-adversarial-security-corpus.md`
- **Actions Executed:**
  1. Implemented automated Vitest adversarial test runner `frontend/src/features/rendering/security/adversarial-corpus.test.tsx` covering all 6 fixtures in `fixtures/security/`:
     - `xss-scripts.md`: Asserts 100% of `<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, `<base>`, `<meta>` tags are stripped; asserts `window.__malicious_executed` and `window.__svg_script_executed` are undefined; verifies safe prose preserved.
     - `event-handlers.md`: Queries all DOM elements to assert zero attributes starting with `on*` exist; verifies `onerror`, `onload`, `onclick`, `onmouseover` never execute; preserves safe text.
     - `protocols.md`: Asserts `javascript:`, `vbscript:`, `data:text/html` schemes are neutralized to safe `#` links; clicks blocked link and verifies zero execution and no unhandled navigation; verifies safe HTTPS/HTTP/anchor links work.
     - `css-overlays.md`: Asserts CSS rules are scoped to `.markdown-content`; asserts `body`/`html`/`:root` selectors are scoped; asserts `@import` and external `url()` background images are stripped; asserts `position: fixed` is neutralized to `position: absolute`; verifies application chrome remains visible.
     - `mermaid-injection.md`: Asserts Mermaid diagrams render without executing injected script tags or callbacks; verifies SVG links strip `javascript:` and `data:text/html`; verifies malicious click callbacks do not fire `alert`.
     - `deep-nesting-dos.md`: Asserts 120-level blockquotes, 100-level lists, and oversized line render cleanly in bounded time (350ms < 1000ms) without stack overflow.
  2. Executed `npm run test:security` (5 test files, 65/65 tests PASS).
  3. Executed `npm run test:security -- xss-corpus` (PASS).
  4. Executed `npm run test:security -- dos-corpus` (PASS).
  5. Executed `npm run build:dev` (TypeScript typecheck & Vite build passed cleanly in 4.20s).
- **Terminal Output & Verification Evidence:**
```text
> markdown-viewer-frontend@0.1.0 test:security
> vitest run src/features/rendering/security/

 ✓ src/features/rendering/security/adversarial-corpus.test.tsx (14 tests) 1530ms
   ✓ Adversarial Security Test Corpus & Fault Isolation Runner (US-016.2) (14)
     ✓ XSS & Script Injection Corpus (xss-corpus / xss-scripts.md) (4)
     ✓ Event Handlers Corpus (event-handlers.md) (2)
     ✓ Protocol Smuggling Corpus (protocols.md) (3)
     ✓ CSS Escape & Overlay Hijacking Corpus (css-overlays.md) (2)
     ✓ Mermaid Script Injection Corpus (mermaid-injection.md) (2)
     ✓ Pathological Deep Nesting Corpus (dos-corpus / deep-nesting-dos.md) (1)
 ✓ src/features/rendering/security/sanitization.test.tsx (15 tests) 575ms
 ✓ src/features/rendering/security/style-scoping.test.tsx (7 tests) 310ms
 ✓ src/features/rendering/security/html-allowlist.test.ts (10 tests) 83ms
 ✓ src/features/rendering/security/css-sanitizer.test.ts (19 tests) 38ms

 Test Files  5 passed (5)
      Tests  65 passed (65)
   Duration  12.79s
```
