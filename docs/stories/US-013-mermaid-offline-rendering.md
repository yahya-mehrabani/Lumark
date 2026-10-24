# US-013: Mermaid Diagrams Offline Rendering & Error Isolation

- **Story ID:** `US-013`
- **Parent Epic:** [EPIC-004: Advanced Rendering & Security Sanitization](../epics/EPIC-004-advanced-rendering-security.md)
- **Status:** `IN_PROGRESS`
- **Assigned Phase:** Phase 4 (Advanced Rendering & Security)

---

## 1. Objective and Expected Outcome

Render Mermaid diagrams offline with strict security sandboxing and fault isolation:
1. Recognize fenced code blocks labeled ````mermaid ... ```` and render them as vector diagrams (SVG).
2. Support core diagram types: flowchart, sequence, class, state, ER, and Gantt charts using locally bundled Mermaid libraries.
3. Configure Mermaid strictly for untrusted input: `securityLevel: 'strict'`, disable all user-defined JavaScript callbacks, disable `click` directives, and sanitize generated SVG.
4. Fault isolation: A malformed or invalid Mermaid diagram must display a localized error card showing the syntax issue and raw source without crashing the document or breaking other diagrams.
5. Diagram container must fit viewport and allow horizontal/vertical scrolling for oversized diagrams.

---

## 2. Source PRD Requirements

- **FR-RENDER-005:** Mermaid diagrams (Local bundle, strict security, SVG sanitization, error isolation).
- **FR-RENDER-009:** Graceful partial rendering.
- **PRD Section 5.4:** Document view diagram scrolling.
- **PRD Section 8.1:** Security invariant 1 & 4 (No arbitrary script execution).

---

## 3. Dependencies

- **Prerequisites:** [US-009](US-009-commonmark-gfm-pipeline.md) (Rendering pipeline).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - `frontend/src/features/rendering/components/MermaidBlock.tsx`.
  - Local Mermaid bundle and theme adaptation (sync with Light/Dark app theme).
  - SVG sanitizer stripping any `<script>` or interactive event attributes from generated SVG.
  - Error boundary fallback component.
- **Explicit Exclusions:**
  - Remote diagram rendering services.

---

## 5. Observable Acceptance Criteria

1. Flowchart, sequence diagram, and class diagram render visibly in offline mode.
2. An invalid diagram (e.g., `graph TD; A -->;`) renders an error card showing: "Mermaid Syntax Error" and displays the raw diagram source.
3. Multiple diagrams in the same document render independently; one invalid diagram does not affect the valid diagrams.
4. Mermaid `click` directives (e.g., `click A call alert()`) are ignored or stripped; clicking nodes triggers zero script execution.
5. Large diagrams scroll horizontally within a bounded container without forcing full-window horizontal scrolling.

---

## 6. Implementation Tasks

### Task US-013.1: Bundle Mermaid locally with strict configuration
- **Task ID:** `US-013.1`
- **Status:** `DONE`
- **Dependencies:** None
- **Completion Criteria:** Mermaid initialized with `securityLevel: 'strict'`, `startOnLoad: false`.
- **Verification Command:** `npm run test:unit -- mermaid-adapter`
- **Expected Observable Result:** Mermaid adapter initializes with securityLevel='strict' and renders SVG offline.
- **Evidence to Record:** Mermaid adapter test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-013.2: Implement MermaidBlock React component with error boundary
- **Task ID:** `US-013.2`
- **Status:** `DONE`
- **Dependencies:** `US-013.1`
- **Completion Criteria:** Uses `mermaid.render`, sanitizes SVG output, and catches parse errors cleanly.
- **Verification Command:** `npm run test:unit -- mermaid-error-fallback`
- **Expected Observable Result:** Syntax error in diagram renders formatted error container and preserves raw code.
- **Evidence to Record:** Error fallback test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-013.3: Implement theme synchronization (Light/Dark)
- **Task ID:** `US-013.3`
- **Status:** `DRAFT`
- **Dependencies:** `US-013.2`
- **Completion Criteria:** Diagram colors adapt when app theme changes between light and dark.
- **Verification Command:** `npm run test:unit -- mermaid-diagram-types`
- **Expected Observable Result:** Flowchart, sequence, state, class, and Gantt diagrams render cleanly.
- **Evidence to Record:** Diagram types test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-013.4: Write unit tests for Mermaid rendering and error fallbacks
- **Task ID:** `US-013.4`
- **Status:** `DRAFT`
- **Dependencies:** `US-013.3`
- **Completion Criteria:** Tests assert SVG output on valid syntax and error card on invalid syntax.
- **Verification Command:** `npm run test:unit -- mermaid`
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Run unit tests: `npm run test:unit -- mermaid`.
2. Open fixture `diagrams-mermaid.md` with network disabled: verify diagrams render.
3. Test invalid diagram fixture: verify error card renders without unhandled exceptions.

---

## 8. Known Risks and Blockers

- Mermaid rendering latency on documents with 20+ diagrams. Implement lazy rendering via `IntersectionObserver` where practical.

---

## 9. Implementation Notes and Validation Evidence

### Task US-013.1 Validation Evidence
- **Execution Date:** 2026-10-24
- **Agent ID:** Antigravity Autonomous Runner
- **Changed Files:**
  - `frontend/package.json` (installed `mermaid@11.4.1`)
  - `frontend/package-lock.json`
  - `frontend/src/test-setup.ts` (polyfilled SVGElement layout methods for jsdom)
  - `frontend/src/features/rendering/utils/sanitize-svg.ts` (DOM-based SVG sanitizer enforcing SEC-INVAR-07)
  - `frontend/src/features/rendering/mermaid-adapter.ts` (strict offline Mermaid adapter)
  - `frontend/src/features/rendering/mermaid-adapter.test.ts` (7 unit tests covering strict config and offline rendering)
- **Verification Command & Output:**
```text
$ npm --prefix frontend run test:unit -- mermaid-adapter

 ✓ src/features/rendering/mermaid-adapter.test.ts (7 tests) 732ms
   ✓ Mermaid Adapter & Strict Configuration (US-013.1) (7)
     ✓ initializes Mermaid with strict security configuration and manual loading 15ms
     ✓ enforces securityLevel: strict even if caller attempts to override with loose settings 6ms
     ✓ renders a basic flowchart into valid SVG offline 483ms
     ✓ renders sequence diagrams and class diagrams offline 183ms
     ✓ sanitizes rendered SVG by removing script tags and event handlers 11ms
     ✓ throws an error and cleans up temporary DOM nodes on invalid diagram syntax 20ms
     ✓ parses valid diagrams successfully via parseMermaid 11ms

 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  17:12:28
   Duration  2.31s

$ npm --prefix frontend run build
✓ built in 1.95s (exit code 0)
```

### Task US-013.2 Validation Evidence
- **Execution Date:** 2026-10-24
- **Agent ID:** Antigravity Autonomous Runner
- **Changed Files:**
  - `frontend/src/features/rendering/components/MermaidBlock.tsx` (MermaidBlock component with localized error boundary and MermaidErrorCard)
  - `frontend/src/features/rendering/MarkdownViewer.tsx` (wired MermaidBlock for ````mermaid ... ```` code fences)
  - `frontend/src/features/rendering/markdown.css` (styles for mermaid container, loading state, error card, and raw source)
  - `frontend/src/features/rendering/mermaid-error-fallback.test.tsx` (5 unit/integration tests verifying error handling, isolation, error boundaries, and MarkdownViewer integration)
- **Verification Command & Output:**
```text
$ npm --prefix frontend run test:unit -- mermaid-error-fallback

 ✓ src/features/rendering/mermaid-error-fallback.test.tsx (5 tests) 2403ms
   ✓ Mermaid Error Boundary & Fault Isolation (US-013.2) (5)
     ✓ renders a valid diagram successfully into sanitized SVG container 1310ms
     ✓ renders a formatted error card displaying syntax error and preserving raw code on invalid syntax 168ms
     ✓ isolates diagram errors so one broken diagram does not break valid diagrams 377ms
     ✓ catches unexpected React rendering errors via MermaidErrorBoundary 60ms
     ✓ integrates seamlessly in MarkdownViewer with mixed Markdown, valid diagram, and broken diagram 477ms

 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  17:17:58
   Duration  7.24s

$ npm --prefix frontend run build
✓ built in 7.52s (exit code 0)
```
