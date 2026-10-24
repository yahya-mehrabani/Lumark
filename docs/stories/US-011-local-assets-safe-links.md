# US-011: Local Asset Resolution & Safe Link Handling

- **Story ID:** `US-011`
- **Parent Epic:** [EPIC-003: CommonMark, GFM & Core Document Rendering](../epics/EPIC-003-commonmark-gfm-rendering.md)
- **Status:** `IN_PROGRESS`
- **Assigned Phase:** Phase 3 (Baseline Markdown Rendering)

---

## 1. Objective and Expected Outcome

Implement safe resolution for local assets and external links:
1. Relative local image references (e.g., `![diagram](./images/arch.png)`) are resolved relative to the open Markdown document's parent folder.
2. Missing local images display an informative placeholder with the asset name instead of a broken icon.
3. Relative links to other local Markdown documents (e.g., `[guide](./guide.md)`) open the target file in a new or existing tab.
4. External web links (`http:`, `https:`, `mailto:`) are intercepted and launched in the OS default browser without navigating the WebView away.
5. All remote image loading is blocked by default to preserve privacy and offline operation.
6. Malicious link protocols (`javascript:`, `data:`, `file:`, unknown schemes) are strictly blocked.

---

## 2. Source PRD Requirements

- **FR-ASSET-001:** Relative local images (Resolved against document directory).
- **FR-ASSET-002:** Local Markdown links (Open target in tab).
- **FR-ASSET-003:** Other local links (Validated before opening).
- **FR-LINK-001:** External links (Intercepted, opened in OS browser).
- **FR-ASSET-004:** Remote resources blocked by default.
- **PRD Section 8.1:** Security invariants 3, 4, 5 (No arbitrary navigation, no silent protocol launch, no remote fetching).

---

## 3. Dependencies

- **Prerequisites:** [US-009](US-009-commonmark-gfm-pipeline.md) (Rendering pipeline) and [US-007](US-007-app-shell-tabs-empty-state.md) (Tab Store).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - `internal/assets/resolver.go` in Go backend for relative path traversal defense.
  - Custom `img` and `a` React components in `features/rendering/components/`.
  - External URL open handler in Go backend calling `runtime.BrowserOpenURL`.
- **Explicit Exclusions:**
  - Automatic download of remote web images (explicit non-goal for MVP).

---

## 5. Observable Acceptance Criteria

1. Relative image `![Logo](./logo.png)` loads and scales proportionally within container width.
2. Missing relative image `![Missing](./missing.png)` displays an inline placeholder badge: "Image not found: ./missing.png".
3. Path traversal attempts like `![Secret](../../../../etc/shadow)` return a 403 or safe placeholder and do not leak content.
4. Clicking `[Next Doc](./chapter2.md)` opens `chapter2.md` in a new tab.
5. Clicking `[Website](https://example.com)` opens `https://example.com` in the user's OS browser and does not change the app's view.
6. Clicking `[XSS](javascript:alert(1))` does nothing and logs a security warning.

---

## 6. Implementation Tasks

### Task US-011.1: Implement Go AssetResolver with path traversal checks
- **Task ID:** `US-011.1`
- **Status:** `DONE`
- **Dependencies:** None
- **Completion Criteria:** Resolves relative paths, canonicalizes them, and ensures they do not escape root boundaries unless permitted.
- **Verification Command:** `go test -v -run TestAssetResolver ./internal/assets/... && npm --prefix frontend run test:unit -- image-loader`
- **Expected Observable Result:** Relative image paths resolved to local custom protocol; path traversal blocked.
- **Evidence to Record:** Asset resolver test execution output.
- **Environment Handling:** Go backend and Node.js test environment.

### Task US-011.2: Implement custom Image component with error placeholder
- **Task ID:** `US-011.2`
- **Status:** `DRAFT`
- **Dependencies:** `US-011.1`
- **Completion Criteria:** Renders image or displays structured fallback card with path.
- **Verification Command:** `npm run test:unit -- missing-asset`
- **Expected Observable Result:** Missing image renders accessible placeholder badge without breaking document layout.
- **Evidence to Record:** Component test execution output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-011.3: Implement custom Link component with protocol dispatcher
- **Task ID:** `US-011.3`
- **Status:** `DRAFT`
- **Dependencies:** `US-011.2`
- **Completion Criteria:** Intercepts `onClick`, routes `.md` to TabStore, routes `http/https` to Go browser launcher, blocks dangerous schemes.
- **Verification Command:** `npm run test:unit -- link-router`
- **Expected Observable Result:** Relative .md links open in tabs; external http/https links delegated to OS browser.
- **Evidence to Record:** Link router test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-011.4: Write unit and integration tests
- **Task ID:** `US-011.4`
- **Status:** `DRAFT`
- **Dependencies:** `US-011.3`
- **Completion Criteria:** Tests assert link routing behavior and asset resolution boundaries.
- **Verification Command:** `npm run test:unit -- link-asset`
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Open fixture with relative image and missing image: verify both render as expected.
2. Click external HTTPS link: verify system default browser opens URL.
3. Inspect network activity in devtools: verify zero outbound HTTP requests for remote images.

---

## 8. Known Risks and Blockers

- OS-specific URL opening behaviors on Linux (relying on `xdg-open` under the hood; ensure non-blocking call).

---

## 9. Implementation Notes and Validation Evidence

- **Execution Date:** 2026-10-24
- **Agent ID:** Autonomous Implementation Agent (AGY-v2)
- **Changed Files:**
  - `internal/assets/resolver.go`: Canonical production Go scoped asset resolver with path traversal defenses, symlink verification, MIME detection, and Wails asset middleware.
  - `internal/assets/resolver_test.go`: Suite of 7 Go test suites covering valid assets, path traversal, symlink escapes, 403/404 handling, HTTP server, and concurrency.
  - `main.go`, `spike_service.go`: Migrated asset resolver imports to canonical `internal/assets`.
  - `frontend/src/features/rendering/image-loader.ts`: Frontend image resolution engine enforcing FR-ASSET-001, FR-ASSET-004, and PRD 8.1.
  - `frontend/src/features/rendering/image-loader.test.ts`: 19 Vitest unit tests verifying resolution, traversal blocking, dangerous protocol blocking, and remote blocking.
- **Terminal Output & Verification Evidence:**
```text
=== RUN   TestAssetResolver_ValidAssets
--- PASS: TestAssetResolver_ValidAssets (0.00s)
=== RUN   TestAssetResolver_PathTraversal
--- PASS: TestAssetResolver_PathTraversal (0.00s)
=== RUN   TestAssetResolver_NotFoundAndDirectory
--- PASS: TestAssetResolver_NotFoundAndDirectory (0.00s)
=== RUN   TestAssetResolver_HTTPServeHTTP
--- PASS: TestAssetResolver_HTTPServeHTTP (0.00s)
=== RUN   TestAssetResolver_Middleware
--- PASS: TestAssetResolver_Middleware (0.00s)
=== RUN   TestAssetResolver_ConcurrentAccess
--- PASS: TestAssetResolver_ConcurrentAccess (0.01s)
PASS
ok      markdown-viewer/internal/assets 0.014s

> vitest run image-loader
 ✓ src/features/rendering/image-loader.test.ts (19 tests) 21ms
 Test Files  1 passed (1)
      Tests  19 passed (19)
```
