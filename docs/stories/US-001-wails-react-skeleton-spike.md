# US-001: Wails Application Skeleton & Production Asset Embedding Spike

- **Story ID:** `US-001`
- **Parent Epic:** [EPIC-001: Technical Feasibility Spike & Platform Foundation](../epics/EPIC-001-feasibility-spike.md)
- **Status:** `READY` (Execution Blocked on Baseline Decision & Platform Evidence)
- **Assigned Phase:** Phase 1 (Feasibility Spike)

---

## 1. Objective and Expected Outcome

Verify that a minimal Wails desktop application (evaluating Wails v3 `v3.0.0-beta.34` as preferred candidate with Wails v2 `v2.17.0` fallback) with a React + TypeScript frontend compiles cleanly, embeds production frontend assets directly into the Go application binary, and launches without requiring a development server (e.g., Vite dev server) or external Node.js runtime.

---

## 2. Source PRD Requirements

- **PRD Section 1.1:** Baseline technology choices (Go + Wails + React + TypeScript + Vite).
- **PRD Section 1.2:** Invariants 1, 2, 3 (Embedded frontend assets, Node.js build-time only, no separate Go runtime for end users).
- **PRD Section 1.4:** Mandatory feasibility spike item 1 & 2.
- **ADR-0001:** Technology baseline evaluation (Wails v3 candidate vs Wails v2 fallback).

---

## 3. Dependencies and Prerequisites

- **Preceding Stories:** None (Initial Phase 1 work item).
- **Required Decisions:** Product Owner review of [ADR-0001](../decisions/ADR-0001-technology-baseline.md) candidate comparison.
- **Toolchain Prerequisites:**
  - Go toolchain `go1.26.8` (or `go 1.26.0+`).
  - Node.js LTS (`v22.x`) and npm (`9.x+`).
  - Pinned Wails CLI: `wails3@v3.0.0-beta.34` (candidate) or `wails@v2.17.0` (fallback).
  - Linux Native Libraries: `libgtk-4-dev` and `libwebkitgtk-6.0-dev` for Wails v3; `libgtk-3-dev` and `libwebkit2gtk-4.1-dev` for Wails v2 fallback.

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - Verify Go and Node environment readiness.
  - Install pinned Wails CLI without using `@latest`.
  - Initialize minimal project configuration (`wails.json` / `Taskfile.yml`).
  - Configure Vite production build output for embedding in Go (`//go:embed all:frontend/dist`).
  - Build and launch standalone binary outside dev mode.
- **Explicit Exclusions:**
  - Do not implement production UI components, tabs, or document viewing features in this spike.
  - Do not commit generated build binaries (`build/bin/`) or `node_modules` to Git.

---

## 5. Observable Acceptance Criteria

1. Standalone binary builds cleanly with embedded assets (`dist/`).
2. Executing the compiled binary opens a native desktop window displaying a static test string ("Spike Baseline Loaded").
3. Terminating any running Node/npm processes does not affect the running binary (verifying no development server dependency).
4. Window launches in under 2.5 seconds on the reference machine.
5. Exact build output, binary size, and environment diagnostics are captured for review.

---

## 6. Implementation Tasks (AUD-004, AUD-008)

### Task US-001.1: Verify local toolchain readiness and environment prerequisites
- **Task ID:** `US-001.1`
- **Status:** `READY`
- **Dependencies:** None
- **Completion Criteria:** Go toolchain (`>= 1.26.0`), Node.js (`>= 20.0.0`), npm, and C build tools are verified; GTK and WebKit library availability is inventoried.
- **Verification Command:**
  ```bash
  go version && node -v && npm -v && pkg-config --cflags gtk+-3.0 webkit2gtk-4.1
  ```
- **Expected Observable Result:** Clean terminal output displaying Go version >= 1.26, Node version >= 20, npm version, and valid compiler include flags.
- **Evidence to Record:** Captured terminal text in Section 9.
- **Environment Handling:** If Go or Node is missing, record status as `BLOCKED`.

### Task US-001.2: Install pinned Wails CLI and run environment diagnostics
- **Task ID:** `US-001.2`
- **Status:** `READY`
- **Dependencies:** `US-001.1`
- **Completion Criteria:** Pinned Wails CLI installed to `~/go/bin/`; doctor command verifies system capabilities.
- **Verification Command (Wails v3 candidate):**
  ```bash
  go install github.com/wailsapp/wails/v3/cmd/wails3@v3.0.0-beta.34 && wails3 doctor
  ```
- **Fallback Verification Command (Wails v2):**
  ```bash
  go install github.com/wailsapp/wails/v2/cmd/wails@v2.17.0 && wails doctor
  ```
- **Expected Observable Result:** Wails doctor output confirms Go, Node, and npm detection with no fatal configuration errors.
- **Evidence to Record:** Complete doctor diagnostic report.
- **Environment Handling:** If required GTK4/WebKitGTK 6.0 packages are missing for v3, log the dependency blocker and trigger v2 fallback evaluation.

### Task US-001.3: Initialize minimal Wails project structure with React + Vite
- **Task ID:** `US-001.3`
- **Status:** `READY`
- **Dependencies:** `US-001.2`
- **Completion Criteria:** Valid project structure generated including Go entrypoint (`main.go`), embed directive, `frontend/package.json`, and `vite.config.ts`.
- **Verification Command:**
  ```bash
  test -f main.go && test -f frontend/package.json && test -f frontend/vite.config.ts && cd frontend && npm run build
  ```
- **Expected Observable Result:** `frontend/dist/index.html` is generated; Vite build exits with code 0.
- **Evidence to Record:** Directory listing and Vite build terminal output.
- **Environment Handling:** Local Node.js (>= 20) and npm build environment.

### Task US-001.4: Build production binary with embedded assets
- **Task ID:** `US-001.4`
- **Status:** `READY`
- **Dependencies:** `US-001.3`
- **Completion Criteria:** Production build produces a single standalone executable embedding the frontend build.
- **Verification Command:**
  ```bash
  go build -tags production -o build/bin/markdown-viewer-spike . && ls -lh build/bin/markdown-viewer-spike
  ```
- **Expected Observable Result:** Executable created; file size between 10 MiB and 30 MiB; `file` utility confirms ELF 64-bit executable.
- **Evidence to Record:** File size, checksum, and build execution log.
- **Environment Handling:** Linux CGO build environment (`gcc`, `pkg-config`, and GTK/WebKit libraries required).

### Task US-001.5: Execute standalone binary and verify independent execution
- **Task ID:** `US-001.5`
- **Status:** `READY`
- **Dependencies:** `US-001.4`
- **Completion Criteria:** Window launches, displays "Spike Baseline Loaded", and runs independently of Node.js.
- **Verification Procedure (Manual & Process Check):**
  1. Launch binary: `./build/bin/markdown-viewer-spike`.
  2. In separate terminal, run `ps aux | grep node` to confirm no active Vite server.
  3. Confirm window renders on screen (via WSLg display `:0` or native display).
- **Expected Observable Result:** Window renders static test text; zero Node processes running.
- **Evidence to Record:** Process table output and screenshot/window confirmation.
- **Environment Handling:** If running in headless CI without display, run with `xvfb-run` or mark interactive launch as `BLOCKED`.

---

## 7. Known Risks and Blockers

- Wails v3 default requires `libgtk-4-dev` and `libwebkitgtk-6.0-dev` which are not pre-installed on this machine.
- WSL2 graphical execution requires active WSLg (`DISPLAY=:0`).
- Windows-native build is blocked locally due to missing host toolchain.

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
