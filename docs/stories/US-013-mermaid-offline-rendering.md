# US-013: Mermaid Diagrams Offline Rendering & Error Isolation

- **Story ID:** `US-013`
- **Parent Epic:** [EPIC-004: Advanced Rendering & Security Sanitization](../epics/EPIC-004-advanced-rendering-security.md)
- **Status:** `DONE`
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
- **Status:** `DONE`
- **Dependencies:** `US-013.2`
- **Completion Criteria:** Diagram colors adapt when app theme changes between light and dark.
- **Verification Command:** `npm run test:unit -- mermaid-diagram-types`
- **Expected Observable Result:** Flowchart, sequence, state, class, and Gantt diagrams render cleanly.
- **Evidence to Record:** Diagram types test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-013.4: Write unit tests for Mermaid rendering and error fallbacks
- **Task ID:** `US-013.4`
- **Status:** `DONE`
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

### Task US-013.3 Validation Evidence
- **Execution Date:** 2026-10-24
- **Agent ID:** Antigravity Autonomous Runner
- **Changed Files:**
  - `frontend/src/features/rendering/mermaid-adapter.ts` (added `detectAppTheme` and `MermaidTheme` export)
  - `frontend/src/features/rendering/components/MermaidBlock.tsx` (integrated dynamic theme synchronization via MutationObserver on `data-theme` attribute and `data-mermaid-theme` tracking)
  - `frontend/src/test-setup.ts` (added SVGElement and SVGPathElement `getTotalLength` and `getPointAtLength` polyfills for headless layout)
  - `fixtures/golden/diagrams-mermaid.md` (comprehensive golden fixture suite with flowchart, sequence, class, state, ER, and Gantt charts)
  - `frontend/src/features/rendering/mermaid-diagram-types.test.tsx` (9 tests verifying clean rendering for all diagram types and dynamic theme adaptation)
- **Verification Command & Output:**
```text
$ npm --prefix frontend run test:unit -- mermaid-diagram-types

 ✓ src/features/rendering/mermaid-diagram-types.test.tsx (9 tests) 1803ms
   ✓ Mermaid Diagram Types & Theme Synchronization (US-013.3) (9)
     ✓ renders a flowchart diagram cleanly into SVG 816ms
     ✓ renders a sequence diagram cleanly into SVG 150ms
     ✓ renders a class diagram cleanly into SVG 175ms
     ✓ renders a state diagram cleanly into SVG 141ms
     ✓ renders an entity-relationship (ER) diagram cleanly into SVG 88ms
     ✓ renders a Gantt chart cleanly into SVG 80ms
     ✓ adapts diagram styling and attributes when rendered with light vs dark themes 92ms
     ✓ detects app theme correctly from documentElement data-theme attribute 1ms
     ✓ dynamically adapts MermaidBlock when document theme attribute changes 254ms

 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  17:24:14
   Duration  3.82s

$ npm --prefix frontend run build
✓ built in 2.47s (exit code 0)
```

### Task US-013.4 Validation Evidence
- **Execution Date:** 2026-10-24
- **Agent ID:** Antigravity Autonomous Runner
- **Changed Files:**
  - `frontend/src/features/rendering/mermaid-integration.test.tsx` (authored 5 full-pipeline integration tests verifying all 6 diagrams from golden fixture, click directive neutralization and script stripping, horizontal scrolling bounds, fault isolation, and empty/whitespace safety)
  - `frontend/src/features/rendering/components/MermaidBlock.tsx` (added safe early return for empty and whitespace diagram blocks)
  - `docs/implementation/REQUIREMENT-TRACEABILITY.md` (updated `FR-RENDER-005` to `IMPLEMENTED` / `VERIFIED`)
- **Verification Command & Output:**
```text
$ npm --prefix frontend run test:unit -- mermaid

 ✓ src/features/rendering/mermaid-diagram-types.test.tsx (9 tests) 1628ms
   ✓ Mermaid Diagram Types & Theme Synchronization (US-013.3) (9)
     ✓ renders a flowchart diagram cleanly into SVG 701ms
     ✓ renders a sequence diagram cleanly into SVG 178ms
     ✓ renders a class diagram cleanly into SVG 147ms
     ✓ renders a state diagram cleanly into SVG 140ms
     ✓ renders an entity-relationship (ER) diagram cleanly into SVG 97ms
     ✓ renders a Gantt chart cleanly into SVG 70ms
     ✓ adapts diagram styling and attributes when rendered with light vs dark themes 96ms
     ✓ detects app theme correctly from documentElement data-theme attribute 1ms
     ✓ dynamically adapts MermaidBlock when document theme attribute changes 189ms

 ✓ src/features/rendering/mermaid-integration.test.tsx (5 tests) 1150ms
   ✓ Mermaid Full Pipeline Integration & Golden Fixtures (US-013.4) (5)
     ✓ renders all 6 diagram types from the golden fixture suite without errors 680ms
     ✓ neutralizes click directives and dangerous links so clicking triggers zero script execution (AC 4, SEC-INVAR-07) 120ms
     ✓ enforces horizontal scrolling container for large diagrams (AC 5, PRD §5.4) 110ms
     ✓ renders multiple diagrams independently where an invalid diagram does not affect valid ones (AC 3) 210ms
     ✓ handles empty and whitespace-only diagram blocks safely 30ms

 ✓ src/features/rendering/mermaid-error-fallback.test.tsx (5 tests) 938ms
   ✓ Mermaid Error Boundary & Fault Isolation (US-013.2) (5)
     ✓ renders a valid diagram successfully into sanitized SVG container 592ms
     ✓ renders a formatted error card displaying syntax error and preserving raw code on invalid syntax 118ms
     ✓ isolates diagram errors so one broken diagram does not break valid diagrams 115ms
     ✓ catches unexpected React rendering errors via MermaidErrorBoundary 45ms
     ✓ integrates seamlessly in MarkdownViewer with mixed Markdown, valid diagram, and broken diagram 68ms

 ✓ src/features/rendering/mermaid-adapter.test.ts (7 tests) 731ms
   ✓ Mermaid Adapter & Strict Configuration (US-013.1) (7)
     ✓ initializes Mermaid with strict security configuration and manual loading 15ms
     ✓ enforces securityLevel: strict even if caller attempts to override with loose settings 6ms
     ✓ renders a basic flowchart into valid SVG offline 459ms
     ✓ renders sequence diagrams and class diagrams offline 183ms
     ✓ sanitizes rendered SVG by removing script tags and event handlers 11ms
     ✓ throws an error and cleans up temporary DOM nodes on invalid diagram syntax 20ms
     ✓ parses valid diagrams successfully via parseMermaid 11ms

 Test Files  4 passed (4)
      Tests  26 passed (26)
   Start at  17:28:09
   Duration  13.68s

$ npm --prefix frontend run test:unit
 Test Files  26 passed (26)
      Tests  229 passed (229)
   Duration  51.19s (exit code 0)

$ npm --prefix frontend run build
✓ built in 2.05s (exit code 0)

$ go test ./...
ok      markdown-viewer/internal/assets (cached)
ok      markdown-viewer/internal/dialogs        (cached)
ok      markdown-viewer/internal/documents      (cached)
ok      markdown-viewer/internal/instance       (cached)
ok      markdown-viewer/internal/platform       (cached)
ok      markdown-viewer/spike/assets    (cached)
ok      markdown-viewer/spike/ipc       (cached)

$ golangci-lint run ./...
0 issues. (exit code 0)
```

### Story US-013 Completion Summary
- **Outcome:** Story `US-013` is **DONE**.
- All 4 tasks (`US-013.1`, `US-013.2`, `US-013.3`, `US-013.4`) are complete and verified with observable output.
- All 5 observable acceptance criteria satisfied:
  1. Flowchart, sequence, class, state, ER, and Gantt charts render visibly offline.
  2. Invalid Mermaid syntax produces a localized error card displaying "Mermaid Syntax Error" with concise error details and raw source.
  3. Multiple diagrams in the same document render independently without cascade failure.
  4. Click directives and javascript: links are neutralized, preventing script execution.
  5. Oversized diagrams scroll horizontally within a bounded container without forcing full-window horizontal scrolling.
