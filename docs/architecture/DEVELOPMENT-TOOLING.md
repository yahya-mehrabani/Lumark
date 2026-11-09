# Development Environment & Tooling Inventory

This document provides a reproducible inventory of the development environment, toolchain versions, platform capabilities, and system dependencies for the Lumark project.

---

## 1. Verified Host Environment

- **Operating System:** Linux COM-807 6.18.54.1-microsoft-standard-WSL2 #1 SMP PREEMPT_DYNAMIC x86_64
- **Distribution:** Ubuntu 26.04.1 LTS (Resolute Raccoon)
- **Environment Type:** Windows Subsystem for Linux (WSL2)
- **Graphical Subsystem (WSLg):** Available and active
  - `DISPLAY=:0`
  - `WAYLAND_DISPLAY=wayland-0`
- **Host Interoperability:** Windows host commands (`cmd.exe`, `powershell.exe`) accessible via `/mnt/c/`, but native Windows development tools (`go`, `node`, `cl.exe`, `gcc`) are **NOT** present in the Windows host `PATH`. Native Windows build and launch execution is therefore **BLOCKED / NOT RUN** on this machine.
- **macOS Hardware:** Not present locally; macOS Apple Silicon build and runtime execution is **BLOCKED / NOT RUN** on this machine.

---

## 2. Toolchain Inventory & Status

| Tool | Category | Status | Verified Version | Installation Path | Role / Usage |
|---|---|---|---|---|---|
| **`go`** | Core Required | INSTALLED | `go1.26.8 linux/amd64` | `/usr/bin/go` | Go backend toolchain |
| **`node`** | Core Required | INSTALLED | `v22.22.1` | `/usr/bin/node` | Frontend build-time runtime |
| **`npm`** | Core Required | INSTALLED | `9.2.0` | `/usr/bin/npm` | Node package manager |
| **`git`** | Core Required | INSTALLED | `2.53.0` | `/usr/bin/git` | Version control |
| **`wails`** | Core Required | NOT INSTALLED | Candidate: `v3.0.0-beta.34` (Fallback: `v2.17.0`) | N/A (Requires pinned install) | Desktop application framework CLI |
| **`golangci-lint`** | Recommended | INSTALLED | `2.15.0` (built with go1.27.0) | `/root/go/bin/golangci-lint` | Go static analysis & linter |
| **`goimports`** | Recommended | INSTALLED | Current stable | `/root/go/bin/goimports` | Go imports & formatting |
| **`govulncheck`** | Recommended | INSTALLED | `v1.9.0` (DB: 2026-10-21) | `/root/go/bin/govulncheck` | Go dependency vulnerability scan |
| **`shellcheck`** | Recommended | INSTALLED | Available | `/usr/bin/shellcheck` | Shell script linting |
| **`shfmt`** | Recommended | INSTALLED | Available | `/usr/bin/shfmt` | Shell script formatting |
| **`gopls`** | Optional | INSTALLED | `v0.24.0` | `/root/go/bin/gopls` | Go language server & diagnostics |
| **`rg`** | Optional | INSTALLED | Available | `/usr/bin/rg` | Fast regex code search |
| **`fdfind`** | Optional | INSTALLED | Available | `/usr/bin/fdfind` | Fast file finding |
| **`tree`** | Optional | INSTALLED | Available | `/usr/bin/tree` | Directory tree visualization |
| **`jq`** | Optional | INSTALLED | Available | `/usr/bin/jq` | JSON inspection & processing |
| **`strace`** | Optional | INSTALLED | Available | `/usr/bin/strace` | System call tracing for IPC debugging |
| **`lsof`** | Optional | INSTALLED | Available | `/usr/bin/lsof` | Socket & file descriptor inspection |

---

## 3. Linux Desktop & Native Library Prerequisites

### Wails v3 Default Linux Stack (GTK4 + WebKitGTK 6.0)
The default Linux path for Wails v3 requires GTK4 and WebKitGTK 6.0:
- **`libgtk-4-dev`**: **MISSING** (Status: Uninstalled; required for Wails v3 default builds).
- **`libwebkitgtk-6.0-dev`**: **MISSING** (Status: Uninstalled; required for Wails v3 default builds).
- **`build-essential` / `gcc`**: INSTALLED.
- **`pkg-config`**: INSTALLED.

### Wails v2 / Legacy GTK3 Stack (GTK3 + WebKit2GTK 4.1)
The fallback Wails v2 stack (and Wails v3 legacy GTK3 tag) uses GTK3 and WebKit2GTK 4.1:
- **`libgtk-3-dev`**: **INSTALLED** (`3.24.52-0ubuntu1`, verified via `pkg-config gtk+-3.0`).
- **`libwebkit2gtk-4.1-dev`**: **INSTALLED** (`2.52.6-0ubuntu0.26.04.1`, verified via `pkg-config webkit2gtk-4.1`).

### Linux Environment Distinction
- **WSL2 with WSLg:** Allows running GUI applications displaying via the X11/Wayland bridge (`DISPLAY=:0`). This provides **graphical runtime evidence** within WSL2.
- **Native Ubuntu 24.04/26.04 LTS:** Required for testing real desktop shell integration, file associations via `xdg-mime` and file managers (Nautilus), system tray, and package installation lifecycle (`dpkg -i`). Testing in WSL2 cannot substitute for native Ubuntu desktop validation.

---

## 4. Pinned Tooling Policy & Reproducibility Rules

1. **No `@latest` in Scripts:** All tool installation commands in developer documentation and CI scripts must use explicit, pinned version tags.
2. **Pinned Versions for Feasibility Spike:**
   - Wails v3 Candidate CLI: `github.com/wailsapp/wails/v3/cmd/wails3@v3.0.0-beta.34`
   - Wails v2 Fallback CLI: `github.com/wailsapp/wails/v2/cmd/wails@v2.17.0`
   - Go Toolchain Baseline: `go1.26.8` (verified locally) / `go 1.26.0` (`v3/go.mod` baseline).
   - Node.js Baseline: Node 22 LTS (`v22.22.1` verified locally).
3. **No Unauthenticated Changes:** Agents must not install OS packages (`apt-get`) or modify host files during planning or read-only tasks.
