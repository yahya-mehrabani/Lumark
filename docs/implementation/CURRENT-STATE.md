# Current Operational State

**Last Updated:** 2026-10-23<br>
**Status Authority:** Single active operational snapshot for incoming agents.<br>
**Planning Audit Remediation Status:** Complete across all 18 original audit findings (AUD-001 through AUD-018) and 10 new remediation findings (REM-001 through REM-010).<br>
**Implementation Readiness Verdict:** **`IN_PROGRESS`** (Phase 1 Feasibility Spike in progress; overall Phase 1 verdict remains **`NOT_READY`** for Phase 2 transition until multi-platform feasibility evidence is satisfied on Windows, macOS, and Linux per PRD Section 1.4)

---

## 1. Project Phase & Status Summary

- **Current Overall Phase:** **Phase 1 (Technical Feasibility Spike)**.
- **Planning Status:** **REMEDIATED & VALIDATED** (Phase 0 planning baseline complete and archived).
- **Application Implementation Status:** **PHASE 2 (EPIC-002), PHASE 3 (EPIC-003), PHASE 4 (EPIC-004 & EPIC-005), AND PHASE 5 NAVIGATION TOOLS (EPIC-006: STORY US-021) COMPLETE IN LINUX ENVIRONMENT**. Stories [`US-001`](../stories/US-001-wails-react-skeleton-spike.md) through [`US-004`](../stories/US-004-packaging-association-spike.md) (Phase 1 Spike), Stories [`US-005`](../stories/US-005-native-document-service.md) through [`US-008`](../stories/US-008-file-picker-drag-drop.md) (Phase 2 Core Lifecycle & Tabs), Stories [`US-009`](../stories/US-009-commonmark-gfm-pipeline.md) through [`US-012`](../stories/US-012-headings-anchors-fixtures.md) (Phase 3 Core Rendering Core), Stories [`US-013`](../stories/US-013-mermaid-offline-rendering.md) through [`US-016`](../stories/US-016-adversarial-security-corpus.md) (Phase 4 `EPIC-004`), Stories [`US-017`](../stories/US-017-auto-direction-engine.md) through [`US-020`](../stories/US-020-rtl-ltr-fixtures-suite.md) (Phase 4 `EPIC-005`), and Story [`US-021`](../stories/US-021-table-of-contents.md) (Phase 5 `EPIC-006`) fully verified across all implementation tasks under Linux/WSLg.
- **Feasibility Spike Status:** **SPIKE IMPLEMENTATION COMPLETE / AWAITING CROSS-PLATFORM GATES**. Authorized by Product Owner on 2026-10-23 (`EPIC-001`, `US-001` through `US-004`). Preferred spike candidate: Wails v3 `v3.0.0-beta.34`; fallback candidate: Wails v2 `v2.17.0`. Final production baseline decision remains pending Phase 1 multi-platform evidence.
- **Last Completed Work Item:** Task `US-022.2: Implement text node search and highlight engine` under Story [`US-022: In-Document Text Search with Match Highlighting`](../stories/US-022-in-document-search.md) (`DONE`; 8/8 tests passing in `search-navigation.test.tsx`).
- **Active / Next Eligible Work Item:** Task `US-022.3: Wire keyboard shortcuts` under Story [`US-022: In-Document Text Search with Match Highlighting`](../stories/US-022-in-document-search.md) (Phase 5 / `EPIC-006: Navigation, Search & User Reading Tools`).

---

## 2. Verified Facts & Current Environment Inventory

1. **Host Environment:** Linux COM-807 6.18.54.1-microsoft-standard-WSL2 (Ubuntu 26.04.1 LTS x86_64).
2. **Graphical Subsystem:** WSLg is active with `DISPLAY=:0` and `WAYLAND_DISPLAY=wayland-0`. Graphical runtime execution is functional within WSL2.
3. **Core Toolchains Installed & Verified:**
   - Go: `go1.26.10 linux/amd64` (selected via `toolchain go1.26.10` in `go.mod` under `GOTOOLCHAIN=auto`; local host base binary `/usr/bin/go` is `go1.26.8`).
   - Wails v3 Module Requirement: `go 1.26.0`, toolchain `go1.26.9` (satisfied by `go1.26.10`).
   - Wails CLI: `v3.0.0-beta.34` (`/root/go/bin/wails3`).
   - Node.js: `v22.22.1` (`/usr/bin/node`).
   - npm: `9.2.0` (`/usr/bin/npm`).
   - Git: `2.53.0` (`/usr/bin/git`).
4. **Go Verification & Linter Tools Installed:**
   - `golangci-lint`: `2.15.0` (`/root/go/bin/golangci-lint`).
   - `goimports`: Installed (`/root/go/bin/goimports`).
   - `govulncheck`: `v1.9.0` (`/root/go/bin/govulncheck`; 0 vulnerabilities found under `go1.26.10`).
   - `gopls`: `v0.24.0` (`/root/go/bin/gopls`).
5. **Shell & Utility Tools Installed:** `shellcheck`, `shfmt`, `rg` (ripgrep), `fdfind`, `tree`, `jq`, `strace`, `lsof`.
6. **Linux Desktop Libraries Installed & Verified:**
   - `libgtk-3-dev`: `3.24.52-0ubuntu1` (GTK3 stack, verified via `pkg-config --cflags gtk+-3.0`).
   - `libwebkit2gtk-4.1-dev`: `2.52.6-0ubuntu0.26.04.1` (WebKitGTK 4.1 stack, verified via `pkg-config --cflags webkit2gtk-4.1`).
   - `libgtk-4-dev`: `4.22.4+ds-0ubuntu0.1` (GTK4 stack, verified via `pkg-config --cflags gtk4`).
   - `libwebkitgtk-6.0-dev`: `2.52.6-0ubuntu0.26.04.1` (WebKitGTK 6.0 stack, verified via `pkg-config --cflags webkitgtk-6.0`).
   - `build-essential` / `gcc`: `gcc (Ubuntu 15.2.0-16ubuntu1) 15.2.0`.
   - `pkg-config`: `2.5.1`.

---

## 3. Outstanding Blockers, Platform Gates, and Open Decisions

1. **Technology Baseline Spike Authorization (Owner Requirement 1 — RESOLVED FOR SPIKE):**
   - The Product Owner formally authorized Phase 1 technical feasibility spike execution on 2026-10-23 using Wails v3 candidate (`v3.0.0-beta.34`) as preferred candidate and Wails v2 (`v2.17.0`) as proven fallback.
   - *Authority Boundary Preserved:* Spike authorization permits executing `EPIC-001` spike tasks. Final production baseline approval remains contingent on multi-platform feasibility evidence.
2. **Linux GTK4 / WebKitGTK 6.0 Package Availability (RESOLVED):**
   - Verified that `libgtk-4-dev` (`4.22.4`) and `libwebkitgtk-6.0-dev` (`2.52.6`) are already installed locally on Ubuntu 26.04 WSL2 and pass `pkg-config` compiler checks. No additional package installation was required.
3. **Platform Execution Gate & Environment Distinction:**
   - **Linux WSL2/WSLg (`DISPLAY=:0`):** Available locally for build compilation, CLI testing, and graphical window rendering. **Cannot** validate native Ubuntu desktop file associations (`xdg-mime`, `.desktop` launcher, system file manager context menus).
   - **Native Ubuntu Desktop:** **`BLOCKED`** locally; required for complete native association and package lifecycle testing (`dpkg -i`, uninstall).
   - **Windows Native Host Tools Unavailable Locally:** Windows host commands (`cmd.exe`, `powershell.exe`) are accessible via WSL2, but `go`, `node`, and C++ compilers are **not** in the Windows host `PATH`. Native Windows build, WebView2 launch, and ProgID association verification is **`BLOCKED / NOT RUN`** locally.
   - **macOS Apple Silicon Hardware Unavailable Locally:** Apple Silicon hardware is not present locally. macOS build, packaging, and WKWebView runtime verification is **`BLOCKED / NOT RUN`** locally.
4. **CI Runner Capabilities vs Interactive Evidence Requirements:**
   - *Automated / Headless CI Runners:* Can satisfy headless Go/TypeScript builds, automated unit/integration tests (`go test`, `npm run test:unit`), linter checks (`golangci-lint`), and package artifact generation (`.deb`, NSIS `.exe`, `.app`).
   - *Interactive Desktop Validation:* Real interactive window management, desktop file-manager double-click ("Open With"), OS-level default association, and single-instance foreground window activation require actual interactive execution on target operating systems.
5. **Phase Gate Invariant:**
   - The feasibility spike may proceed sequentially in available environments (e.g., WSL2/WSLg for Linux skeleton and window launch), but **Phase 1 must not pass and Phase 2 must not begin** until all mandatory platform evidence across Windows 10/11 x64, macOS Apple Silicon, and Ubuntu 24.04 LTS x64 is verified or the Product Owner has formally amended the support scope.

---

## 4. Uncommitted Changes to Preserve

All planning remediation artifacts must be preserved:
- `AGENTS.md`, `README.md`, `CHANGELOG.md`
- `scripts/validate_links.py`, `scripts/reconcile_tasks.py`, `scripts/reconcile_requirements_crosswalk.py`
- `docs/markdown-support.md`, `docs/security.md`, `docs/testing.md`, `docs/packaging.md`
- `docs/architecture/*` (including `DEVELOPMENT-TOOLING.md`)
- `docs/decisions/*` (canonical `ADR-0001-technology-baseline.md` and alias `ADR-0001-desktop-stack.md`)
- `docs/epics/*` and `docs/stories/*` (all 32 stories with task verifications)
- `docs/implementation/*` (including `INDEPENDENT-PLANNING-AUDIT.md` and `PLANNING-AUDIT-REMEDIATION.md`)

---

## 5. Exact Next Action for the Next Agent

1. **Confirm Story US-021 Complete:**
   - Story [`US-021: Interactive Table of Contents & Heading Navigation`](../stories/US-021-table-of-contents.md) is **`DONE`** across all four tasks:
     - `US-021.1`: Heading AST/DOM extraction hook and hierarchical tree builder verified (16/16 tests passing in `toc-generator.test.ts`).
     - `US-021.2`: `TableOfContents` sidebar component with hierarchical indentation, smooth scroll-to-heading, active highlight, and empty-state feedback verified (7/7 tests passing in `toc-scroll-spy.test.tsx`).
     - `US-021.3`: Active heading scroll spy via `IntersectionObserver` thresholding and `useTocToggle` with keyboard shortcuts (`Ctrl+Shift+O`, `Cmd+Shift+O`, `Alt+T`) and zero-heading guarding verified (6/6 tests passing in `toc-sidebar-toggle.test.tsx`).
     - `US-021.4`: Comprehensive unit and acceptance criteria test suite covering heading hierarchy, 10+ headings navigation, smooth scrolling, duplicate disambiguation, and RTL/Persian script support verified (36/36 tests passing across all TOC suites in `npm run test:unit -- toc`).
   - `FR-NAV-001` is marked `IMPLEMENTED` and `VERIFIED` in `REQUIREMENT-TRACEABILITY.md`.
2. **Execute Story US-022 Tasks:**
   - Completed: Task `US-022.1: Implement SearchBar React component and search indexer` (`DONE`; 20/20 tests passing in `search-indexer.test.tsx`).
   - Completed: Task `US-022.2: Implement text node search and highlight engine` (`DONE`; 8/8 tests passing in `search-navigation.test.tsx`).
   - Active work item: Task `US-022.3: Wire keyboard shortcuts` under Story [`US-022: In-Document Text Search with Match Highlighting`](../stories/US-022-in-document-search.md) (Phase 5 / `EPIC-006: Navigation, Search & User Reading Tools`).
3. **Preserve Testing-Sequence Policy:** Testing is Linux-only during implementation. Multi-platform validation is conducted in a separate post-implementation workflow; overall phase cross-platform verdict remains `NOT_READY` until dedicated platform evidence is recorded.
