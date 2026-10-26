# Current Operational State

**Last Updated:** 2026-10-26<br>
**Status Authority:** Single active operational snapshot for incoming agents.<br>
**Planning Audit Remediation Status:** Complete across all 18 original audit findings (AUD-001 through AUD-018) and 10 new remediation findings (REM-001 through REM-010).<br>
**Implementation Readiness Verdict:** **`DONE`** (All implementation phases completed under Linux; native desktop checks documented as deferred to separate post-implementation cross-platform validation).

---

## 1. Project Phase & Status Summary

- **Current Overall Phase:** **Phase 6 (Distribution & Release Hardening) — COMPLETE**.
- **Planning Status:** **REMEDIATED & VALIDATED** (Phase 0 planning baseline complete and archived).
- **Application Implementation Status:** **ALL 6 IMPLEMENTATION PHASES (PHASES 1–6) AND ALL 32 USER STORIES (US-001 THROUGH US-032) COMPLETE IN LINUX ENVIRONMENT**. Stories [`US-001`](../stories/US-001-wails-react-skeleton-spike.md) through [`US-032`](../stories/US-032-association-matrix-release-hardening.md) fully implemented, tested, and verified under Linux/WSLg.
- **Feasibility Spike Status:** **SPIKE & PRODUCTION IMPLEMENTATION COMPLETE**. Wails v3 candidate (`v3.0.0-beta.34`) verified across all application modules.
- **Last Completed Work Item:** Task [`US-032.4: Sign off Release Acceptance Checklist`](../stories/US-032-association-matrix-release-hardening.md) (`DONE`; Story [`US-032`](../stories/US-032-association-matrix-release-hardening.md) `DONE`; `EPIC-008` `DONE`).
- **Active / Next Eligible Work Item:** Post-Implementation Cross-Platform Validation Process (evaluating native Windows 10/11 x64 host and macOS Apple Silicon runtime integration per deferred test checklist in `docs/release-checklist.md`).

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

1. **Story US-031 Complete & Story US-032 Next Eligible:**
   - Task `US-031.1: Create production Linux desktop entry and SVG icon` is **`DONE`** (`packaging/linux/markdown-viewer.desktop` and `build/linux/markdown-viewer.desktop` configured with FreeDesktop Desktop Entry Specification 1.5 compliance, `%F` parameter, `Utility;TextEditor;Viewer;` categories, `text/markdown` & `text/x-markdown` MIME types, strictly excluding `text/plain`, `markdown-viewer.svg` scalable icon verified, and `scripts/validate_desktop_file.py` created).
   - Task `US-031.2: Implement Debian control file and maintainer scripts` is **`DONE`** (`packaging/linux/debian/control` declares `Depends: libc6 (>= 2.38), libgtk-4-1 (>= 4.12.0) | libgtk-3-0 (>= 3.24.0), libwebkitgtk-6.0-4 (>= 2.40.0) | libwebkit2gtk-4.1-0 (>= 2.40.0)`; `postinst` and `postrm` scripts trigger `update-desktop-database`, `update-mime-database`, and `gtk-update-icon-cache`; `build-deb.sh` builds production `.deb` placing binary at `/usr/bin/markdown-viewer`).
   - Task `US-031.3: Configure AppImage build pipeline` is **`DONE`** (`packaging/linux/build-appimage.sh` stages `build/staging/markdown-viewer.AppDir` with `AppRun` launcher, binary, desktop entry, and icons, with portable bundle archive generation).
   - Task `US-031.4: Execute package verification on clean Ubuntu 24.04 runner` is **`DONE`** (`scripts/test-package-linux.sh` automated package verification suite passed via `npm run test:package:linux`; `.github/workflows/linux-build.yml` CI workflow created for `ubuntu-24.04`; `docs/packaging.md` updated).
   - Story [`US-031: Linux Debian Package, AppImage & Desktop/MIME Integration`](../stories/US-031-linux-packaging-associations.md) is **`DONE`**.
   - Next Eligible Story: [`US-032: Cross-Platform File Association Validation Matrix & Release Hardening`](../stories/US-032-association-matrix-release-hardening.md) (`READY`; Phase 6 / `EPIC-008: Packaging, Operating-System Integration & Release Hardening`).
2. **Preserve Testing-Sequence Policy:** Testing is Linux-only during implementation. Multi-platform validation is conducted in a separate post-implementation workflow; overall phase cross-platform verdict remains `NOT_READY` until dedicated platform evidence is recorded.
