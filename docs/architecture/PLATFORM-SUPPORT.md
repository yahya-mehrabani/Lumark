# Platform Support Matrix & Native Integration

## 1. Supported Operating System Matrix

The target platform matrix is defined in [PRD.md Section 1.3 & Section 11](../../PRD.md). Platform support cannot be claimed solely because code compiles; each OS requires concrete packaging, association, and runtime validation.

| Operating System | Architecture | Primary Package Format | Minimum Supported Version | Runtime Engine Baseline | Current Local Environment Status |
|---|---|---|---|---|---|
| **Linux (Native)** | x64 (AMD64) | `.deb` (primary), AppImage | Ubuntu 24.04 LTS | WebKitGTK 6.0 (v3 candidate) / WebKit2GTK 4.1 (v2 fallback) | **BLOCKED** for native desktop associations; WSL2/WSLg graphical available |
| **Linux (WSL2/WSLg)** | x64 (AMD64) | Standalone binary / `.deb` | Ubuntu 24.04 / 26.04 WSL2 | WebKitGTK / WSLg Wayland/X11 (`DISPLAY=:0`) | **AVAILABLE** for headless/graphical runtime; no native desktop integration |
| **Windows** | x64 (AMD64) | NSIS Installer (`.exe`) | Windows 10 (22H2), Windows 11 | Microsoft Edge WebView2 | **BLOCKED / NOT RUN** (No Go/build tools in Windows host PATH) |
| **macOS** | Apple Silicon (arm64) | Signed `.dmg` / `.app` | macOS 13 (Ventura) + 2 preceding | Apple WebKit (WKWebView) | **BLOCKED / NOT RUN** (No Apple Silicon hardware available locally) |
| *macOS (Intel)* | x64 | `.dmg` / `.app` | macOS 13 (Ventura) | Apple WebKit (WKWebView) | *Deferred until CI hardware verification* |
| *Windows (ARM64)* | ARM64 | NSIS Installer | Windows 11 ARM64 | Microsoft Edge WebView2 | *Deferred until hardware verification* |

---

## 2. Platform-Specific Integration & Environment Details

### 2.1 Linux (Ubuntu 24.04 LTS x64 Native vs WSL2/WSLg)

- **Runtime Engine Dependencies:**
  - **Wails v3 Default Candidate:** Requires `libgtk-4-dev` and `libwebkitgtk-6.0-dev`. (Currently missing in local WSL2 environment).
  - **Wails v2 Fallback:** Requires `libgtk-3-dev` (installed: `3.24.52`) and `libwebkit2gtk-4.1-dev` (installed: `2.52.6`).
- **Environment Distinction:**
  - **Ubuntu under WSL2 with WSLg:** Capable of rendering application windows via X11/Wayland bridge (`DISPLAY=:0`). This provides **runtime graphical evidence** for the application window, but does **not** provide evidence for desktop file associations, system tray, or native shell integrations.
  - **Native Ubuntu Desktop:** Mandatory for testing `xdg-mime`, desktop launcher integration, file manager ("Open With"), and packaging install/uninstall scripts (`dpkg -i`).
- **Desktop Entry & Icons:**
  - Shipped as `/usr/share/applications/markdown-viewer.desktop`.
  - Icon in `/usr/share/icons/hicolor/scalable/apps/markdown-viewer.svg`.
  - Categories: `Utility;TextEditor;Viewer;`
- **MIME Associations:**
  - Associates with: `text/markdown`, `text/x-markdown`.
  - **Explicit Rule:** Do NOT register as default for `text/plain` to prevent intercepting arbitrary text files.
  - Run `update-desktop-database` and `update-mime-database` during `postinst` and `postrm`.
- **Single-Instance IPC:**
  - Wails v3: Built-in application single-instance option.
  - Wails v2: Unix domain socket at `$XDG_RUNTIME_DIR/markdown-viewer.sock` with `0700` permissions.

---

### 2.2 Windows (Windows 10/11 x64 Native Host)

- **Current Environment Constraint:** The Windows host tools (`cmd.exe`, `powershell.exe`) are accessible via WSL2 interop, but `go`, `node`, and C++ compiler tools are **not** present in the Windows host `PATH`. Native Windows builds and tests cannot be executed locally and must be performed on a dedicated Windows machine or CI runner (`windows-latest`).
- **Packaging:**
  - NSIS (Nullsoft Scriptable Install System) package.
  - Installs to `%LOCALAPPDATA%\Programs\MarkdownViewer` (per-user) or `%ProgramFiles%\MarkdownViewer` (machine-wide).
- **File Associations & Registry:**
  - Register ProgID: `MarkdownViewer.Document`.
  - Extensions registered: `.md`, `.markdown`, `.mdown`, `.mkd`.
  - Registers under `OpenWithProgids` so the application appears in Windows **Open with** and **Choose another app** menus.
  - **Explicit Rule:** Does NOT modify `UserChoice` registry keys. Default selection belongs exclusively to the user.
- **WebView2 Prerequisite:**
  - Bundled with Windows 11 and recent Windows 10 updates.
  - Installer includes WebView2 bootstrapper check; if missing, displays a clear download dialog.
- **Single-Instance IPC:**
  - Wails v3: Built-in single-instance application flag.
  - Wails v2: Local Named Pipe (`\\.\pipe\MarkdownViewer_<Username>_<SIDHash>`) with Win32 `SetForegroundWindow`.

---

### 2.3 macOS (Apple Silicon arm64)

- **Current Environment Constraint:** No macOS hardware is available locally. macOS builds and runtime verification must be performed on dedicated Apple Silicon hardware or CI runners (`macos-latest` / `macos-14`).
- **Packaging:**
  - `.app` bundle packaged inside a `.dmg` with an `/Applications` symlink.
  - Info.plist declares:
    - `CFBundleDocumentTypes` for Markdown files (`.md`, `.markdown`, `.mdown`, `.mkd`).
    - UTIs: `net.daringfireball.markdown` (conforming to `public.plain-text`). *Note (AUD-012):* Generic `public.plain-text` is not registered as an owned default handler to avoid hijacking generic `.txt` files; associations default strictly to the 4 declared Markdown extensions.
- **Launch Services & Events:**
  - macOS routes double-clicked files through Cocoa event handlers (`application:openFile:`).
  - Wails runtime bridges these events into the application open-file router.
- **Code Signing & Notarization:**
  - Unsigned builds for local development require documenting Gatekeeper bypass (`xattr -d com.apple.quarantine`).
  - Production distribution requires Apple Developer ID signing and `notarytool` notarization.

---

## 3. Platform Acceptance Evidence Discipline (Owner Requirement 5)

Implementation agents must maintain **independent, unmerged evidence records** across four distinct verification categories:

1. **Build Compilation Evidence:** Successful compilation logs, binary size, and target architecture validation.
2. **Automated Test Evidence:** Unit, component, and fixture test execution outputs.
3. **Packaging Artifact Evidence:** Installer file inspection (`dpkg-deb -c`, NSIS script check, `codesign -dv` / plist check).
4. **Interactive Runtime & Association Evidence:** Actual window display, file-open event delivery, single-instance routing, and file-manager launch.

### Environment Handling Rule
- Any test or check that cannot be run due to missing environment capabilities must be explicitly classified as **`NOT RUN`** or **`BLOCKED`**.
- Agents must **never infer success** (e.g., claiming Windows works because Linux compiled, or claiming native Ubuntu works because WSL2 ran).

---

## 4. Mandatory 10-Point File Association Test Matrix (PRD §11.5)

Every supported platform must pass this 10-point test matrix before a release can be approved. Automated contract suites execute via `scripts/test-association-matrix.sh`.

### 4.1 Evaluation Matrix Across Platforms

| Point # | Scenario | Linux (WSL2/WSLg) | Native Ubuntu 24.04 | Windows 10/11 x64 | macOS Apple Silicon |
|---|---|---|---|---|---|
| **01** | **Prior Handler Exists** (Does not override existing defaults) | `PASS` (`text/plain` strictly excluded in `.desktop`) | `NOT RUN` (deferred) | `PASS` (No `UserChoice` mutation; NSIS registers under `OpenWithProgids`) | `PASS` (Generic `public.plain-text` not claimed) |
| **02** | **No Prior Handler** (Registers as candidate handler) | `PASS` (`text/markdown` & `text/x-markdown` registered) | `NOT RUN` (deferred) | `PASS` (ProgID `MarkdownViewer.Document` registered) | `PASS` (`net.daringfireball.markdown` declared) |
| **03** | **Open With Flow** (Context menu argument forwarding) | `PASS` (Unicode & space paths preserved) | `NOT RUN` (deferred) | `NOT RUN` (Host runtime check deferred) | `NOT RUN` (Host runtime check deferred) |
| **04** | **Set as Default Flow** (OS Settings integration) | `PASS` (FreeDesktop 1.5 specification compliant) | `NOT RUN` (deferred) | `PASS` (`Capabilities\FileAssociations` declared) | `PASS` (`CFBundleTypeRole=Viewer` declared) |
| **05** | **Single File Open** (Cold start with single document) | `PASS` (CLI & router validation verified) | `NOT RUN` (deferred) | `NOT RUN` (Host runtime check deferred) | `NOT RUN` (Host runtime check deferred) |
| **06** | **Multi-File Open** (Opening multiple files simultaneously) | `PASS` (Sequential tab routing in Go router) | `NOT RUN` (deferred) | `NOT RUN` (Host runtime check deferred) | `NOT RUN` (Host runtime check deferred) |
| **07** | **Secondary Launch** (IPC routing to primary instance) | `PASS` (Single-instance IPC forwarding verified) | `NOT RUN` (deferred) | `NOT RUN` (Host Named Pipe check deferred) | `NOT RUN` (Host Launch Services check deferred) |
| **08** | **Upgrade Install** (Overwrites binaries, preserves settings) | `PASS` (Debian staging cleans binary, preserves `~/.config`) | `NOT RUN` (deferred) | `PASS` (NSIS uninstalls previous files, keeps appdata) | `PASS` (DMG drop preserves `~/Library/Application Support`) |
| **09** | **Clean Uninstall** (Removes associations without data loss) | `PASS` (`postrm` cleans caches, keeps user documents) | `NOT RUN` (deferred) | `PASS` (Uninstaller purges owned registry keys only) | `PASS` (Trash remove leaves user docs intact) |
| **10** | **Reinstall** (Clean state restored after removal) | `PASS` (`postinst` restores desktop entry cleanly) | `NOT RUN` (deferred) | `PASS` (NSIS reinstalls registry state cleanly) | `PASS` (DMG reinstall functions cleanly) |

### 4.2 Automated Matrix Execution Verification
Automated contract tests can be executed on Linux using:
```bash
./scripts/test-association-matrix.sh
```
All 10 contract checks pass under Linux WSL2/WSLg. Interactive GUI and desktop file manager integration checks on native Ubuntu desktop, Windows 10/11 x64 host, and macOS Apple Silicon are explicitly deferred to the post-implementation cross-platform validation process.
