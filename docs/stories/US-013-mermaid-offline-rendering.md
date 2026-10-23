# US-013: Mermaid Diagrams Offline Rendering & Error Isolation

- **Story ID:** `US-013`
- **Parent Epic:** [EPIC-004: Advanced Rendering & Security Sanitization](../epics/EPIC-004-advanced-rendering-security.md)
- **Status:** `DRAFT`
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
- **Status:** `DRAFT`
- **Dependencies:** None
- **Completion Criteria:** Mermaid initialized with `securityLevel: 'strict'`, `startOnLoad: false`.
- **Verification Command:** `npm run test:unit -- mermaid-adapter`
- **Expected Observable Result:** Mermaid adapter initializes with securityLevel='strict' and renders SVG offline.
- **Evidence to Record:** Mermaid adapter test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-013.2: Implement MermaidBlock React component with error boundary
- **Task ID:** `US-013.2`
- **Status:** `DRAFT`
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

*(To be filled by implementation agent during execution)*
- **Execution Date:** Not yet executed
- **Agent ID:** N/A
- **Changed Files:** None
- **Terminal Output & Verification Evidence:**
```text
(Awaiting execution in Phase 4)
```
