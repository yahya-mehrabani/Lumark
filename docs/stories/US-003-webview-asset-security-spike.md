# US-003: WebView Rendering & Local Asset Security Baseline Spike

- **Story ID:** `US-003`
- **Parent Epic:** [EPIC-001: Technical Feasibility Spike & Platform Foundation](../epics/EPIC-001-feasibility-spike.md)
- **Status:** `READY` (Execution Blocked on Baseline Decision & Platform Evidence)
- **Assigned Phase:** Phase 1 (Feasibility Spike)

---

## 1. Objective and Expected Outcome

Verify that the platform WebView (WebKitGTK on Linux, WebView2 on Windows, WKWebView on macOS) can safely:
1. Render a complex Markdown fixture containing mixed Persian/English RTL text, KaTeX math, Mermaid diagrams, code fences, and raw HTML fragments.
2. Resolve and display relative local image assets without exposing arbitrary filesystem access to JavaScript.
3. Enforce an inert DOM rendering boundary where documents cannot execute scripts in the application origin or invoke unexposed Go bindings.

---

## 2. Source PRD Requirements

- **PRD Section 1.4:** Mandatory feasibility spike items 6 & 7 (Relative local images, mixed fixture rendering).
- **FR-ASSET-001:** Relative local images (Resolve against document parent directory).
- **PRD Section 8.1 & 8.2:** Security invariants and WebView sandboxing boundary.

---

## 3. Dependencies

- **Prerequisites:** [US-001](US-001-wails-react-skeleton-spike.md) (Wails application skeleton runnable).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - Prototype custom asset handler or secure RPC bridge for loading relative image files.
  - Render a monolithic test fixture including RTL text, math formula, Mermaid diagram, and sanitized HTML.
  - Verify script execution prevention (`<script>alert(1)</script>` rendered as inert text).
- **Explicit Exclusions:**
  - Full production sanitization engine (tested via preliminary allowlist in this spike).

---

## 5. Observable Acceptance Criteria

1. A Markdown file with `![Local Image](./assets/test.png)` renders the image in the WebView without network requests.
2. Path traversal attempts (e.g., `../../../../etc/passwd` or `C:\Windows\...`) are blocked by the native asset handler with an error.
3. A test fixture containing Persian RTL text (`سلام دنیا`), KaTeX `$E = mc^2$`, and a simple Mermaid flowchart renders visibly in the native window.
4. Active script elements injected into the fixture are neutralized (no alert dialog or console script execution).

---

## 6. Implementation Tasks (AUD-004)

### Task US-003.1: Implement scoped local asset resolver in Go backend
- **Task ID:** `US-003.1`
- **Status:** `READY`
- **Dependencies:** `US-001.4`
- **Completion Criteria:** Go handler checks document directory boundaries and returns mime-typed image bytes or 403 Forbidden for path traversal attempts.
- **Verification Command:**
  ```bash
  go test -v -race ./spike/assets/...
  ```
- **Expected Observable Result:** `PASS` output verifying successful local image loading and rejection of path traversal payloads.
- **Evidence to Record:** Captured test output log in Section 8.
- **Environment Handling:** Works across Linux, macOS, and Windows filesystem conventions.

### Task US-003.2: Assemble cross-feature spike fixture
- **Task ID:** `US-003.2`
- **Status:** `READY`
- **Dependencies:** None
- **Completion Criteria:** `fixtures/spike/monolithic-fixture.md` created with Persian RTL, English LTR, code block, KaTeX, Mermaid, and image reference.
- **Verification Command:**
  ```bash
  test -f fixtures/spike/monolithic-fixture.md && grep -E "سلام دنیا|\\\$E = mc\^2\\\$|mermaid" fixtures/spike/monolithic-fixture.md
  ```
- **Expected Observable Result:** File exists and contains verified Persian text, KaTeX formula, and Mermaid diagram block.
- **Evidence to Record:** Line numbers and matching content strings.
- **Environment Handling:** Standard filesystem check applicable in all environments.

### Task US-003.3: Render fixture in spike WebView window and record visual result
- **Task ID:** `US-003.3`
- **Status:** `READY`
- **Dependencies:** `US-003.1`, `US-003.2`
- **Completion Criteria:** Application renders fixture cleanly without WebView crash or uncaught exceptions; scripts are inert.
- **Verification Command:** `test -f docs/stories/US-003-webview-asset-security-spike.md`
- **Expected Observable Result:** Verification criteria verified for Render fixture in spike WebView window and record visual result.
- **Evidence to Record:** Verification log.
- **Environment Handling:** Host environment.
- **Verification Procedure (Manual & Visual):**
  1. Launch application loading fixture: `./build/bin/markdown-viewer-spike fixtures/spike/monolithic-fixture.md`.
  2. Inspect rendered window: verify Persian alignment, KaTeX font rendering, and diagram layout.
  3. Inspect console logs: confirm zero script execution from document body.
- **Expected Observable Result:** Window renders all elements; `<script>` tag is rendered as plain text or omitted.
- **Evidence to Record:** Visual confirmation and console diagnostic log.
- **Environment Handling:** In headless environments, run with `xvfb-run` or mark interactive verification as `BLOCKED`.

---

## 7. Known Risks and Blockers

- WebKitGTK local CORS/security restrictions when loading `file://` or custom protocol assets. Ensure Wails asset server configuration handles local assets without compromising host security.

---

## 8. Implementation Notes and Validation Evidence

*(To be filled by implementation agent during Phase 1 execution)*
- **Execution Date:** Not yet executed
- **Agent ID:** N/A
- **Changed Files:** None
- **Terminal Output & Verification Evidence:**
```text
(Awaiting Phase 1 execution)
```
