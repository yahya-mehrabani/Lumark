# ADR-0001: Technology Baseline — Desktop Application Stack Evaluation (Wails v3 Candidate vs Wails v2 Fallback)

- **Status:** APPROVED FOR FEASIBILITY SPIKE (Wails v3.0.0-beta.34 Preferred Spike Candidate / Wails v2.17.0 Proven Fallback; Final Production Baseline Pending Spike Evidence)
- **Canonical Path:** `docs/decisions/ADR-0001-technology-baseline.md`<br>
- **Historical Alias in PRD §14:** `docs/decisions/ADR-0001-desktop-stack.md` (canonical redirect to this file)
- **Verification Date:** 2026-10-23
- **Deciders:** Product Owner, Architecture Review
- **Sources & Documentation:**
  - Official Wails v3 Documentation & Prerequisites: <https://v3.wails.io>
  - Official Wails v3 Repository & Release Tags: <https://github.com/wailsapp/wails/releases/tag/v3.0.0-beta.34>
  - Official Wails v2 Documentation: <https://wails.io>
  - Official Wails v2 Repository & Release Tags: <https://github.com/wailsapp/wails/releases/tag/v2.17.0>

---

## 1. Context and Problem Statement

The Lumark product requires a fast, cross-platform desktop application satisfying the invariants in `PRD.md`:
1. Native execution on Windows 10/11 x64, macOS Apple Silicon (arm64), and Linux (Ubuntu 24.04 LTS x64).
2. Embedded production frontend assets (zero runtime dev server, zero Node.js runtime dependency on user machines).
3. Native OS integration: file picker dialogs, drag-and-drop, command-line arguments, file associations, and single-instance routing.
4. Offline-first security: isolated WebView DOM, strict sanitization, zero telemetry, and zero unauthenticated network requests.
5. High-fidelity rendering with extensions (KaTeX, Mermaid, Shiki syntax highlighting, and bidirectional RTL/LTR text).

While `PRD.md` established Go + Wails v2 + React + TypeScript + Vite as the initial MVP baseline, the Project Owner requested an explicit evaluation of **Wails v3** as the preferred candidate for the Phase 1 feasibility spike, while maintaining **Wails v2** as a proven fallback.

---

## 2. Technology Comparison: Wails v3 vs Wails v2

| Evaluation Dimension | Wails v3 (Proposed Spike Candidate: `v3.0.0-beta.34`) | Wails v2 (Fallback Baseline: `v2.17.0`) | Architectural Assessment |
|---|---|---|---|
| **Release Status & Maturity** | Beta (`v3.0.0-beta.34`, active development). API may undergo breaking changes prior to general availability. | Stable (`v2.17.0`, battle-tested in production across thousands of desktop apps). | Wails v3 carries higher prerelease risk; Wails v2 is low risk. |
| **Go Toolchain Requirement** | Requires Go 1.26.0+ (pinned toolchain in `v3/go.mod`: `go1.26.9`). Verified compatible with local `go1.26.8`. | Requires Go 1.25.0+ (`v2/go.mod`). Fully compatible with current Go. | Both versions support modern Go toolchains. |
| **Linux Subsystem & Libraries** | Defaults to **GTK4** and **WebKitGTK 6.0** (`libgtk-4-dev`, `libwebkitgtk-6.0-dev`). Legacy GTK3 build tag available. | Uses **GTK3** and **WebKit2GTK 4.0/4.1** (`libgtk-3-dev`, `libwebkit2gtk-4.1-dev`). | Local Ubuntu 26.04 WSL2 environment currently has GTK3 installed; GTK4/WebKitGTK 6.0 must be installed for default v3 build. |
| **Windows Subsystem** | Microsoft Edge WebView2 via procedural window management and enhanced native event hooks. | Microsoft Edge WebView2 via declarative application options. | Both provide high-performance WebView2 rendering on Windows 10/11. |
| **macOS Subsystem** | Native WKWebView via modern Cocoa bindings, native Apple Silicon (arm64) support, and multi-window support. | Native WKWebView via older Objective-C runtime bridge; single-window default. | Wails v3 has superior multi-window and native window management on macOS. |
| **Single-Instance IPC** | **Built-in First-Class Support:** Application options provide native single-instance flag and file-open/URL event handlers without custom sockets. | **Custom Coordination Required:** Must implement custom Go Unix socket / Windows named pipe listener (`ADR-0002`). | **Major advantage for Wails v3:** eliminates brittle bespoke IPC socket code. |
| **Frontend Binding Generation** | Static TypeScript bindings generated directly via CLI (`wails3 generate`) without launching the application. | Generated dynamically by running the application in dev mode. | **Major advantage for Wails v3:** faster, more reliable CI and TypeScript builds. |
| **Multi-Window & Tabs** | Native multi-window support and decoupled window lifecycle management. | Strictly single-window oriented in core architecture. | Gives flexibility for detached windows if tabs are expanded later. |
| **Packaging & Distribution** | Built-in Taskfile templates and modern cross-compilation helpers. | Bundled `wails build -package` generating NSIS, `.deb`, and `.app`. | Wails v2 has more mature built-in installer templates; v3 uses Taskfile. |
| **Security & Isolation** | Granular protocol routing, strict origin control, no arbitrary frontend-to-OS bridge exposure. | Strict context binding, but requires manual IPC permission hardening. | Both satisfy PRD Section 8 security invariants when configured properly. |

---

## 3. Pinned Releases and Toolchains

To guarantee reproducible, non-ephemeral project execution:
- **Pinned Wails v3 Candidate (Preferred Spike Candidate):** `github.com/wailsapp/wails/v3/cmd/wails3@v3.0.0-beta.34`
  - Exact Go Toolchain Requirement: `go 1.26.0+` (repo local: `go1.26.8 linux/amd64`, toolchain: `go1.26.9`)
  - Linux Native Libraries Required: `libgtk-4-dev` (installed: `4.22.4`), `libwebkitgtk-6.0-dev` (installed: `2.52.6`), `build-essential`, `pkg-config` (verified present locally)
- **Pinned Wails v2 Fallback (Documented Fallback Candidate):** `github.com/wailsapp/wails/v2/cmd/wails@v2.17.0`
  - Exact Go Toolchain Requirement: `go 1.25.0+` (repo local: `go1.26.8 linux/amd64`)
  - Linux Native Libraries Required: `libgtk-3-dev` (installed: `3.24.52`), `libwebkit2gtk-4.1-dev` (installed: `2.52.6`), `build-essential`, `pkg-config`
- **Frontend Stack Baseline:** React 19 + TypeScript (strict mode) + Vite 6 + committed `package-lock.json`.

---

## 4. Objective Pass/Fail Evaluation Criteria for Wails v3

During Phase 1 Feasibility Spike (`EPIC-001`, `US-001` through `US-004`), Wails v3 must satisfy all of the following criteria:

1. **Build & Asset Embedding (US-001):**
   - Compiles cleanly into a standalone executable embedding React production assets.
   - Launches interactive WebView window in under 2.5 seconds without active Node.js processes.
2. **Single-Instance IPC & File Routing (US-002):**
   - Native single-instance hook receives secondary launch arguments and delivers the path to the running instance without window duplication.
   - Handles paths with spaces, Unicode characters, and relative segments correctly.
3. **WebView Sandbox & Local Assets (US-003):**
   - Renders local markdown content via `react-markdown` and resolves relative local images via local custom asset handler.
   - Proves zero arbitrary local filesystem access outside the document scope.
4. **Platform Packaging & Dependency Feasibility (US-004):**
   - Linux package (`.deb`) successfully registers desktop entry and `text/markdown` association.
   - Packaging templates verified for Windows NSIS and macOS `.app`.
   - Linux runtime dependencies documented clearly (`libgtk-4-dev` and `libwebkitgtk-6.0-dev`).

### Fallback Trigger
If Wails v3 encounters any of the following blocking conditions during the spike:
- Critical compilation failures or WebKitGTK 6.0 crashes on Ubuntu 24.04/26.04;
- Inability to provision required GTK4/WebKitGTK 6.0 libraries in CI or developer environments;
- Broken single-instance routing or window freeze regressions on Windows/macOS;
**Then the team will immediately execute the documented fallback to Wails v2 (`v2.17.0`)**, for which the GTK3 development libraries are already verified and installed locally.

---

## 5. Decision Status, Authority, and Spike Authorization Boundaries

- **Product Owner Authorization (2026-10-23):** The Product Owner has formally authorized execution of the Phase 1 technical feasibility spike (`EPIC-001`, `US-001` through `US-004`) using provisional candidates:
  - **Preferred spike candidate:** Wails v3 `v3.0.0-beta.34`.
  - **Fallback candidate:** Wails v2 `v2.17.0`, subject to the documented fallback criteria in Section 4.
  - **Final production baseline:** Not yet approved. This decision depends strictly on recorded feasibility evidence across all declared target platforms (Windows 10/11 x64, macOS Apple Silicon, Ubuntu 24.04/26.04 x64).
- **Authorization Scope:** This authorization strictly permits the technical spike work defined by `EPIC-001`. It does not authorize implementation of product features outside the spike scope, nor does it approve Wails v3 as the final production baseline.
- **PRD Authority:** `PRD.md` Section 1.1 designates Wails v2 as the documented MVP baseline. In accordance with `AGENTS.md` Rule 7.1, this PRD specification is not silently rewritten during planning or spike authorization.
- **Current Status:** **APPROVED FOR FEASIBILITY SPIKE** (Wails v3 `v3.0.0-beta.34` Preferred Spike Candidate / Wails v2 `v2.17.0` Fallback; Final Production Baseline Pending Spike Evidence).
- **Readiness Verdict Impact:** Phase 1 Feasibility Spike is actively `IN_PROGRESS` under Product Owner authorization. Implementation of Phase 2+ product features remains gated on Phase 1 exit criteria and multi-platform evidence.
