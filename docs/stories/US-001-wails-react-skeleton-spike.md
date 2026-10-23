# US-001: Wails Application Skeleton & Production Asset Embedding Spike

- **Story ID:** `US-001`
- **Parent Epic:** [EPIC-001: Technical Feasibility Spike & Platform Foundation](../epics/EPIC-001-feasibility-spike.md)
- **Status:** `IN_PROGRESS`
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
- **Status:** `DONE`
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
- **Status:** `DONE`
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

- **Execution Date:** 2026-10-23
- **Agent ID:** Antigravity AI Implementation Agent
- **Active Task:** `US-001.2` (Completed & Verified)
- **Host Environment:** Linux COM-807 6.18.54.1-microsoft-standard-WSL2 (Ubuntu 26.04.1 LTS x86_64)
- **Graphical Subsystem:** WSLg active (`DISPLAY=:0`, `WAYLAND_DISPLAY=wayland-0`)
- **Status Transition:** Task `US-001.2` transitioned from `READY` to `DONE` (`US-001` remains `IN_PROGRESS`).
- **Changed Files:** Documentation status and verification evidence only (CLI diagnostics task; zero application source files changed).

### Task US-001.1 Verification Evidence

#### 1. Core Toolchain & GTK3/WebKit2GTK 4.1 Verification
**Command:**
```bash
go version && node -v && npm -v && pkg-config --cflags gtk+-3.0 webkit2gtk-4.1
```
**Exit Code:** 0
**Captured Terminal Output:**
```text
go version go1.26.8 linux/amd64
v22.22.1
9.2.0
-I/usr/include/webkitgtk-4.1 -I/usr/include/gtk-3.0 -I/usr/include/pango-1.0 -I/usr/include/cairo -I/usr/include/gdk-pixbuf-2.0 -I/usr/include/glycin-2 -I/usr/include/at-spi2-atk/2.0 -I/usr/include/at-spi-2.0 -I/usr/include/atk-1.0 -I/usr/include/dbus-1.0 -I/usr/lib/x86_64-linux-gnu/dbus-1.0/include -I/usr/include/fribidi -I/usr/include/pixman-1 -I/usr/include/harfbuzz -I/usr/include/freetype2 -I/usr/include/libpng16 -I/usr/include/gio-unix-2.0 -I/usr/include/libsoup-3.0 -I/usr/include/libmount -I/usr/include/blkid -isystem /usr/include/mit-krb5 -isystem /usr/include/mit-krb5 -I/usr/include/glib-2.0 -I/usr/lib/x86_64-linux-gnu/glib-2.0/include -I/usr/include/sysprof-6 -pthread
```

#### 2. GTK4 and WebKitGTK 6.0 Subsystem Verification (Wails v3 Requirements)
**Command:**
```bash
pkg-config --cflags gtk4 webkitgtk-6.0
```
**Exit Code:** 0
**Captured Terminal Output:**
```text
-I/usr/include/webkitgtk-6.0 -I/usr/include/gtk-4.0 -I/usr/include/pango-1.0 -I/usr/include/fribidi -I/usr/include/harfbuzz -I/usr/include/gdk-pixbuf-2.0 -I/usr/include/glycin-2 -I/usr/include/cairo -I/usr/include/freetype2 -I/usr/include/libpng16 -I/usr/include/pixman-1 -I/usr/include/graphene-1.0 -I/usr/lib/x86_64-linux-gnu/graphene-1.0/include -mfpmath=sse -msse -msse2 -I/usr/include/libsoup-3.0 -I/usr/include/libmount -I/usr/include/blkid -isystem /usr/include/mit-krb5 -isystem /usr/include/mit-krb5 -I/usr/include/glib-2.0 -I/usr/lib/x86_64-linux-gnu/glib-2.0/include -I/usr/include/sysprof-6 -pthread
```

#### 3. Native Package Inventory (dpkg)
**Command:**
```bash
dpkg -l | grep -E "libgtk-[34]-dev|libwebkit.*dev"
```
**Exit Code:** 0
**Captured Terminal Output:**
```text
ii  libgtk-3-dev:amd64                               3.24.52-0ubuntu1                           amd64        development files for the GTK library
ii  libgtk-4-dev:amd64                               4.22.4+ds-0ubuntu0.1                       amd64        development files for the GTK library
ii  libwebkit2gtk-4.1-dev                            2.52.6-0ubuntu0.26.04.1                    amd64        Web content engine library for GTK - development files
ii  libwebkitgtk-6.0-dev                             2.52.6-0ubuntu0.26.04.1                    amd64        Web content engine library for GTK - development files
```

#### 4. Wails v3 Module Metadata Verification
**Command:**
```bash
go list -m -json github.com/wailsapp/wails/v3@v3.0.0-beta.34
```
**Exit Code:** 0
**Captured Terminal Output:**
```json
{
        "Path": "github.com/wailsapp/wails/v3",
        "Version": "v3.0.0-beta.34",
        "Time": "2026-10-20T15:13:56Z",
        "Dir": "/root/go/pkg/mod/github.com/wailsapp/wails/v3@v3.0.0-beta.34",
        "GoMod": "/root/go/pkg/mod/cache/download/github.com/wailsapp/wails/v3/@v/v3.0.0-beta.34.mod",
        "GoVersion": "1.26.0",
        "Origin": {
                "VCS": "git",
                "URL": "https://github.com/wailsapp/wails",
                "Hash": "2bdf60a266de9ed835d6998cd695c66e2c37d15a",
                "Ref": "refs/tags/v3.0.0-beta.34"
        }
}
```
*(Metadata confirms Go version requirement `go 1.26.0` and toolchain `go1.26.9`; local `go1.26.8 linux/amd64` satisfies toolchain requirements).*

#### 5. Pinned Wails CLI Binary Check
**Command:**
```bash
/root/go/bin/wails3 version
```
**Exit Code:** 0
**Captured Terminal Output:**
```text
v3.0.0-beta.34
```

#### 6. Build Utilities & Graphical Runtime Inventory
- **C Compiler:** `gcc (Ubuntu 15.2.0-16ubuntu1) 15.2.0`
- **Package Config:** `pkg-config 2.5.1`
- **Graphical Displays:** `DISPLAY=:0`, `WAYLAND_DISPLAY=wayland-0` (WSLg active)
- **Toolchain Status:** All prerequisites for Task `US-001.2` (`wails3 doctor`) are satisfied.

### Task US-001.2 Verification Evidence

#### 1. Pinned Wails CLI Binary Verification
**Command:**
```bash
/root/go/bin/wails3 version
```
**Exit Code:** 0
**Captured Terminal Output:**
```text
v3.0.0-beta.34
```

#### 2. Go Toolchain Analysis & Compiler vs Upstream Distinction
**Commands:**
```bash
go env GOTOOLCHAIN
GOTOOLCHAIN=local go version
go version -m /root/go/bin/wails3
```
**Exit Code:** 0
**Captured Terminal Output:**
- `go env GOTOOLCHAIN`:
  ```text
  auto
  ```
- `GOTOOLCHAIN=local go version`:
  ```text
  go version go1.26.8 linux/amd64
  ```
- `go version -m /root/go/bin/wails3` (header excerpt):
  ```text
  /root/go/bin/wails3: go1.26.8
          path    github.com/wailsapp/wails/v3/cmd/wails3
          mod     github.com/wailsapp/wails/v3    v3.0.0-beta.34  h1:3p/s+rk6olaquzaDWWowVTJ1ZMIBDHEsTUqxsffR4Zw=
  ```
**Explicit Toolchain Version Distinction:**
- **Local Active Go Version:** `go1.26.8 linux/amd64` (`/usr/bin/go`).
- **Compiler Version Used to Build CLI Binary:** `go1.26.8` (confirmed via `go version -m /root/go/bin/wails3`).
- **Wails v3 Minimum Go Requirement:** `go 1.26.0` (declared in `github.com/wailsapp/wails/v3@v3.0.0-beta.34` `go.mod`).
- **Wails v3 Upstream Toolchain Directive:** `toolchain go1.26.9` (declared in upstream module `go.mod`).
- **Analysis:** Local `go1.26.8` satisfies the minimum language requirement `go 1.26.0`. Local compiler version `go1.26.8` is distinct from the upstream toolchain directive `go1.26.9`. With `GOTOOLCHAIN=auto`, local compilation operates without requiring artificial toolchain switching.

#### 3. Official Wails Environment Diagnostic Report (`wails3 doctor`)
**Command:**
```bash
/root/go/bin/wails3 doctor
```
**Exit Code:** 0
**Captured Terminal Output:**
```text
Wails v3.0.0-beta.34 › Wails Doctor

# System

┌────────────────────────────────────────────────────────────────┐
| Name                | Ubuntu                                   |
| Version             | 26.04                                    |
| ID                  | ubuntu                                   |
| Branding            | 26.04.1 LTS (Resolute Raccoon)           |
| Platform            | linux                                    |
| Architecture        | amd64                                    |
| Desktop Environment | unset                                    |
| NVIDIA Driver       | N/A                                      |
| XDG_SESSION_TYPE    | unset                                    |
| CPU                 | Intel(R) Core(TM) i5-9500T CPU @ 2.20GHz |
| Memory              | 10GB                                     |
└────────────────────────────────────────────────────────────────┘

# Build Environment

┌───────────────────────────────┐
| Wails CLI    | v3.0.0-beta.34 |
| Go Version   | go1.26.8       |
| -buildmode   | exe            |
| -compiler    | gc             |
| CGO_CFLAGS   |                |
| CGO_CPPFLAGS |                |
| CGO_CXXFLAGS |                |
| CGO_ENABLED  | 1              |
| CGO_LDFLAGS  |                |
| GOAMD64      | v1             |
| GOARCH       | amd64          |
| GOOS         | linux          |
└───────────────────────────────┘

# Dependencies

┌───────────────────────────────────────────────────────────────────────────────────────────────────────────┐
| *Android SDK        | Not found. Set ANDROID_HOME (install via Android Studio or the command-line tools). |
| gcc                 | 12.12ubuntu2.26.04.2                                                                |
| gtk3 (legacy)       | 3.24.52-0ubuntu1                                                                    |
| gtk4                | 4.22.4+ds-0ubuntu0.1                                                                |
| npm                 | 9.2.0                                                                               |
| pkg-config          | 2.5.1-4                                                                             |
| webkit2gtk (legacy) | 2.52.6-0ubuntu0.26.04.1                                                             |
| webkitgtk-6.0       | 2.52.6-0ubuntu0.26.04.1                                                             |
| docker              | *Not installed (optional - for cross-compilation)                                   |
|                                                                                                           |
└───────────────────────────────────────── * - Optional Dependency ─────────────────────────────────────────┘

# Signing

┌────────────────────────────────────────┐
| macOS Signing   | Not configured       |
| Windows Signing | Not configured       |
| Linux Signing   | Not configured (GPG) |
└────────────────────────────────────────┘

# Checking for issues

 SUCCESS  No issues found

# Diagnosis

 SUCCESS  Your system is ready for Wails development!

Need documentation? Run: wails3 docs
 ♥   If Wails is useful to you or your company, please consider sponsoring the project: wails3 sponsor
```

#### 4. Dependency & Diagnostics Assessment
- **Core System Status:** `SUCCESS No issues found`; `SUCCESS Your system is ready for Wails development!`.
- **GTK4 & WebKitGTK 6.0 Detection:** GTK4 (`4.22.4`) and WebKitGTK 6.0 (`2.52.6`) were successfully detected by `wails3 doctor` alongside build tools (`gcc`, `pkg-config 2.5.1-4`) and Node ecosystem (`npm 9.2.0`).
- **Optional Dependencies Handled:**
  - `*Android SDK` (Not found): Optional mobile target; strictly excluded by PRD and project scope. No action required.
  - `*docker` (Not installed): Optional cross-compilation utility; not required for local WSL2/Linux spike development.
  - Code signing (macOS, Windows, Linux GPG): Not configured; packaging and distribution concern scheduled for Phase 6 (`EPIC-008`), not required for Phase 1 local feasibility spike.
- **Package Installation Decision:** Zero additional packages are required. No changes to system packages or shell environment variables were made.
- **Task Completion Status:** Task `US-001.2` completion criteria are fully met. Environment is verified ready for Task `US-001.3`.
