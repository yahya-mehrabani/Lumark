# US-029: Windows Packaging, NSIS Installer & File Associations

- **Story ID:** `US-029`
- **Parent Epic:** [EPIC-008: Packaging, Operating-System Integration & Release Hardening](../epics/EPIC-008-packaging-platform-integration.md)
- **Status:** `IN_PROGRESS`
- **Assigned Phase:** Phase 6 (Distribution & Release Hardening)

---

## 1. Objective and Expected Outcome

Deliver a production-ready Windows installer and native file association registration:
1. Build an NSIS installer (`.exe`) for Windows 10/11 x64 using Wails v2 packaging.
2. Register the application with a dedicated ProgID (`MarkdownViewer.Document`) for extensions `.md`, `.markdown`, `.mdown`, `.mkd`.
3. Register the application under Windows `OpenWithProgids` and `Capabilities\FileAssociations` so it appears in "Open with" and "Choose another app" menus.
4. Strictly respect Windows conventions: do **not** attempt to overwrite `UserChoice` registry keys directly (avoiding Windows hash corruption warnings).
5. Verify Edge WebView2 runtime availability during installation; display clear download instructions if absent.
6. Provide a clean uninstaller that removes product shortcuts, registry entries, and file associations without affecting user documents or system settings.

---

## 2. Source PRD Requirements

- **FR-OPEN-003:** OS file associations.
- **PRD Section 11.1:** General installer requirements.
- **PRD Section 11.2:** Windows packaging, NSIS, ProgID, and WebView2 prerequisites.

---

## 3. Dependencies

- **Prerequisites:** `EPIC-001` through `EPIC-007` (All application features complete).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - `build/windows/installer/project.nsi` and icon assets.
  - Windows registry association scripts.
  - CI build configuration on `windows-latest`.
- **Explicit Exclusions:**
  - Hardware testing on Windows ARM64 (deferred to post-MVP hardware availability).

---

## 5. Observable Acceptance Criteria

1. NSIS installer builds in CI and produces a signed/publisher-identified `.exe`.
2. Running the installer places binary in `%LOCALAPPDATA%\Programs\MarkdownViewer` and creates Start Menu shortcut.
3. Right-clicking a `.md` file in Windows Explorer displays "Markdown Viewer" in the **Open with** submenu.
4. Double-clicking an associated `.md` file launches the application and displays the file.
5. Launching an associated file while the application is already open brings the existing window forward and opens a new tab.
6. Running the uninstaller removes the installation directory, shortcuts, and registry keys cleanly.

---

## 6. Implementation Tasks

### Task US-029.1: Configure NSIS script and application metadata
- **Task ID:** `US-029.1`
- **Status:** `DONE`
- **Dependencies:** None
- **Completion Criteria:** NSIS script includes version info, publisher, icon, and installation directory.
- **Verification Command:** `test -f packaging/windows/installer.nsi && grep -i 'MarkdownViewer.Document' packaging/windows/installer.nsi && grep -i 'VIProductVersion' packaging/windows/installer.nsi`
- **Expected Observable Result:** NSIS script declares ProgID and file association keys.
- **Evidence to Record:** NSIS script inspection output.
- **Environment Handling:** Script inspection on Linux; installer execution requires Windows host (BLOCKED locally).

### Task US-029.2: Implement ProgID and file association registry keys
- **Task ID:** `US-029.2`
- **Status:** `DONE`
- **Dependencies:** `US-029.1`
- **Completion Criteria:** Registers `HKCU\Software\Classes\MarkdownViewer.Document` and `OpenWithProgids`.
- **Verification Command:** `grep -i 'OpenWithProgids' packaging/windows/installer.nsi && ! grep -i 'UserChoice' packaging/windows/installer.nsi`
- **Expected Observable Result:** ProgID registered under OpenWithProgids; UserChoice key not modified.
- **Evidence to Record:** Script assertion output.
- **Environment Handling:** Script inspection on Linux; Windows registry test requires Windows runner (BLOCKED locally).

### Task US-029.3: Add WebView2 bootstrapper verification check
- **Task ID:** `US-029.3`
- **Status:** `DONE`
- **Dependencies:** `US-029.2`
- **Completion Criteria:** NSIS installer checks `HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-6E4F-4275-A2A8-CD2D769E2C34}`.
- **Verification Command:** `grep -i 'EdgeUpdate' packaging/windows/installer.nsi && grep -i 'F3017226-6E4F-4275-A2A8-CD2D769E2C34' packaging/windows/installer.nsi`
- **Expected Observable Result:** NSIS installer checks Microsoft Edge WebView2 Evergreen registry key and prompts for download if absent.
- **Evidence to Record:** CheckWebView2 routine inspection output.
- **Environment Handling:** Script inspection on Linux; Windows installer runtime test requires Windows runner (BLOCKED locally).

### Task US-029.4: Implement uninstaller cleanup routine
- **Task ID:** `US-029.4`
- **Status:** `DRAFT`
- **Dependencies:** `US-029.3`
- **Completion Criteria:** Uninstaller deletes only owned registry keys and application binaries.
- **Verification Method:** Verify registry before and after uninstall on Windows test VM.
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Build installer on Windows runner: `wails build -nsis`.
2. Install on Windows 10/11 test machine.
3. Execute association checks: open from Explorer, verify single-instance routing.
4. Run uninstaller: verify registry clean.

---

## 8. Known Risks and Blockers

- Windows SmartScreen warnings on unsigned binaries. Document code-signing certificate requirements in release notes.

---

## 9. Implementation Notes and Validation Evidence

- **Execution Date:** 2026-10-25
- **Agent ID:** Autonomous Story Runner
- **Active Environment:** Linux COM-807 (Ubuntu 26.04.1 LTS x86_64 under WSL2/WSLg)
- **Deferred Platform Checks:** Windows host interactive runtime and NSIS installer binary execution on Windows 10/11 x64 are marked `NOT RUN` (deferred to dedicated post-implementation cross-platform validation).

### Task US-029.1: Configure NSIS script and application metadata
- **Status:** `DONE`
- **Changed Files:**
  - `packaging/windows/installer.nsi`: Configured `VIProductVersion`, `VIFileVersion`, `VIAddVersionKey` (CompanyName, FileDescription, ProductVersion, FileVersion, LegalCopyright, ProductName, Comments), HiDPI awareness (`ManifestDPIAware true`), and `BrandingText`.
  - `.github/workflows/windows-build.yml`: Configured automated CI build on `windows-latest` running Go 1.26, Node 22, frontend build, Wails CLI packaging, and NSIS installer generation.
- **Verification Commands & Output:**
```bash
$ test -f packaging/windows/installer.nsi && grep -i 'MarkdownViewer.Document' packaging/windows/installer.nsi && grep -i 'VIProductVersion' packaging/windows/installer.nsi
!define PROGID "MarkdownViewer.Document"
    ; HKCU\Software\Classes\MarkdownViewer.Document
VIProductVersion "${PRODUCT_VERSION}.0"
Exit code: 0

$ golangci-lint run
0 issues.
Exit code: 0
```
- **Cross-Platform Verification Boundary:**
  - Linux NSIS Script & CI Workflow Configuration: `PASS`
  - Windows Host Installer Binary Build & Execution: `NOT RUN` (deferred to Windows cross-platform validation).

### Task US-029.2: Implement ProgID and file association registry keys
- **Status:** `DONE`
- **Changed Files:**
  - `packaging/windows/installer.nsi`: Configured dedicated ProgID `MarkdownViewer.Document` with DefaultIcon, FriendlyTypeName, CurVer, and shell open command. Configured `OpenWithProgids` for `.md`, `.markdown`, `.mdown`, and `.mkd`. Configured Windows Default Programs `Capabilities\FileAssociations` and `RegisteredApplications` for Windows Settings integration without modifying `UserChoice`. Added `SHChangeNotify` shell notification.
- **Verification Commands & Output:**
```bash
$ grep -i 'OpenWithProgids' packaging/windows/installer.nsi && ! grep -i 'UserChoice' packaging/windows/installer.nsi
    ; Register as Open With handler under OpenWithProgids for supported Markdown extensions
    ; Registering under OpenWithProgids presents Markdown Viewer in Windows "Open with"
    WriteRegNone HKCU "Software\Classes\.md\OpenWithProgids" "${PROGID}"
    WriteRegNone HKCU "Software\Classes\.markdown\OpenWithProgids" "${PROGID}"
    WriteRegNone HKCU "Software\Classes\.mdown\OpenWithProgids" "${PROGID}"
    WriteRegNone HKCU "Software\Classes\.mkd\OpenWithProgids" "${PROGID}"
    ; Remove OpenWithProgids entries without touching user preferences or unrelated handlers
    DeleteRegValue HKCU "Software\Classes\.md\OpenWithProgids" "${PROGID}"
    DeleteRegValue HKCU "Software\Classes\.markdown\OpenWithProgids" "${PROGID}"
    DeleteRegValue HKCU "Software\Classes\.mdown\OpenWithProgids" "${PROGID}"
    DeleteRegValue HKCU "Software\Classes\.mkd\OpenWithProgids" "${PROGID}"
Exit code: 0

$ golangci-lint run
0 issues.
Exit code: 0
```
- **Cross-Platform Verification Boundary:**
  - Linux Script & Registry Syntax Assertion: `PASS`
  - Windows Host Live Registry Key Audit: `NOT RUN` (deferred to Windows cross-platform validation).

### Task US-029.3: Add WebView2 bootstrapper verification check
- **Status:** `DONE`
- **Changed Files:**
  - `packaging/windows/installer.nsi`: Included `LogicLib.nsh` and `x64.nsh`. Implemented `CheckWebView2` function checking Microsoft Edge WebView2 Evergreen Runtime registry key `HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-6E4F-4275-A2A8-CD2D769E2C34}` (as well as alternative GUID `{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}` and per-user `HKCU` keys). Wired into `Function .onInit`. Configured interactive user prompt offering to open official Microsoft WebView2 download page if missing per PRD Section 11.2.
- **Verification Commands & Output:**
```bash
$ grep -i 'EdgeUpdate' packaging/windows/installer.nsi && grep -i 'F3017226-6E4F-4275-A2A8-CD2D769E2C34' packaging/windows/installer.nsi
    ReadRegStr $0 HKLM "SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-6E4F-4275-A2A8-CD2D769E2C34}" "pv"
    ReadRegStr $0 HKLM "SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
    ReadRegStr $0 HKCU "Software\Microsoft\EdgeUpdate\Clients\{F3017226-6E4F-4275-A2A8-CD2D769E2C34}" "pv"
    ReadRegStr $0 HKCU "Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
    ReadRegStr $0 HKLM "SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-6E4F-4275-A2A8-CD2D769E2C34}" "pv"
    ReadRegStr $0 HKCU "Software\Microsoft\EdgeUpdate\Clients\{F3017226-6E4F-4275-A2A8-CD2D769E2C34}" "pv"
Exit code: 0

$ golangci-lint run
0 issues.
Exit code: 0
```
- **Cross-Platform Verification Boundary:**
  - Linux Script & Registry Key Check Assertion: `PASS`
  - Windows Host Live WebView2 Detection Prompt: `NOT RUN` (deferred to Windows cross-platform validation).
