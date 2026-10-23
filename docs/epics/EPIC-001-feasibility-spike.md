# EPIC-001: Technical Feasibility Spike & Platform Foundation

- **Epic ID:** `EPIC-001`
- **Title:** Technical Feasibility Spike & Platform Foundation
- **Status:** `READY` (Awaiting Owner Decision on ADR-0001 Wails Baseline)
- **Phase:** Phase 1 (Technical Feasibility Spike)
- **Target Release:** MVP Foundation

---

## 1. Objective and Scope

De-risk the core technical and architectural assumptions before writing production UI or rendering code. The spike validates that:
1. **Application Skeleton & Asset Embedding (US-001):** A minimal Wails desktop application (evaluating Wails v3 `v3.0.0-beta.34` as preferred candidate with Wails v2 `v2.17.0` fallback) compiles with a React + TypeScript frontend, embeds production assets directly into the Go binary, and launches without an external dev server or Node.js runtime.
2. **Command-Line & Single-Instance Routing (US-002):** The application receives a file path from the command line, and secondary launches forward arguments to the existing instance without opening a duplicate window.
3. **WebView Sandbox & Local Asset Security (US-003):** The native WebView renders Markdown safely, isolates local document scopes, and resolves relative local images without exposing arbitrary filesystem access.
4. **Platform Packaging & Association Feasibility (US-004):** Packaging prototypes and file association configurations function on the host platform and are explicitly validated across the declared support matrix.

---

## 2. Source PRD Requirements

- **PRD Section 1.4:** Mandatory feasibility spike before product implementation.
- **FR-OPEN-004:** Open from command line or OS launch event (Spike validation).
- **FR-OPEN-005:** Single-instance file routing (Spike validation).
- **FR-ASSET-001:** Relative local images (Spike validation).
- **FR-OPEN-003:** OS file associations prototype (Spike validation).
- **PRD Section 8.2:** WebView security boundary verification.

---

## 3. Platform Verification Requirements & Evidence Matrix (AUD-002)

To satisfy PRD Section 1.4 and Section 11, the spike requires explicit evidence across all declared target platforms:

| Target Platform | Architecture | Required Feasibility Evidence | Local Environment Status |
|---|---|---|---|
| **Linux (Ubuntu 24.04/26.04)** | x64 | 1. Standalone binary build output.<br>2. Graphical launch into WebView window via WSLg (`DISPLAY=:0`).<br>3. Deb package structure inspection (`dpkg-deb -c`).<br>4. Desktop entry validation via `desktop-file-validate`. | **PARTIALLY AVAILABLE** (WSLg graphical runtime available; native package install requires native Ubuntu environment) |
| **Windows 10/11** | x64 | 1. Native Windows x64 executable build.<br>2. Interactive launch into WebView2 window.<br>3. Command-line path opening with spaces and Unicode.<br>4. Single-instance routing via mutex and IPC.<br>5. NSIS installer prototype compilation and association registry keys. | **BLOCKED / NOT RUN** locally (Windows host toolchain missing; requires dedicated Windows machine or CI runner) |
| **macOS (Apple Silicon)** | arm64 | 1. Native arm64 executable and `.app` bundle.<br>2. Interactive launch into WKWebView.<br>3. Launch Services `application:openFile:` event delivery.<br>4. Info.plist UTI association check. | **BLOCKED / NOT RUN** locally (Apple Silicon hardware unavailable locally; requires macOS CI runner) |

*Rule:* Unavailable platform checks must be marked **`NOT RUN`** or **`BLOCKED`**. Feasibility cannot be declared passed based solely on single-platform evidence.

---

## 4. Exit Criteria (Strict PRD Compliance — AUD-001)

- Minimal application compiles into a standalone binary embedding React production assets.
- Packaged minimal application verified on **each declared target OS** (Windows 10/11 x64, macOS Apple Silicon, Ubuntu 24.04 LTS x64) to install, launch, and open one associated Markdown file.
- Single-instance routing delivers secondary arguments to running window without duplicate process or window spawn.
- Relative image assets resolve correctly without arbitrary local filesystem exposure.
- Objective comparison between Wails v3 candidate and Wails v2 fallback completed and recorded in [`docs/decisions/ADR-0001-technology-baseline.md`](../decisions/ADR-0001-technology-baseline.md).

---

## 5. Included User Stories

- [US-001: Wails Application Skeleton & Production Asset Embedding Spike](../stories/US-001-wails-react-skeleton-spike.md)
- [US-002: Command-Line & Single-Instance IPC Feasibility Spike](../stories/US-002-cli-single-instance-spike.md)
- [US-003: WebView Rendering & Local Asset Security Baseline Spike](../stories/US-003-webview-asset-security-spike.md)
- [US-004: Platform Packaging & File Association Feasibility Spike](../stories/US-004-packaging-association-spike.md)
