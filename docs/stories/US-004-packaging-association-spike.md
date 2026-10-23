# US-004: Platform Packaging & File Association Feasibility Spike

- **Story ID:** `US-004`
- **Parent Epic:** [EPIC-001: Technical Feasibility Spike & Platform Foundation](../epics/EPIC-001-feasibility-spike.md)
- **Status:** `READY` (Execution Blocked on Baseline Decision & Platform Evidence)
- **Assigned Phase:** Phase 1 (Feasibility Spike)

---

## 1. Objective and Expected Outcome

Verify packaging and desktop file association mechanisms across all three target operating systems:
1. **Linux (Ubuntu 24.04/26.04):** Prototype a Debian package (`.deb`) with `.desktop` launcher, icon, and MIME association (`text/markdown`), validating clean installation, candidate registration, and clean removal without orphaned entries.
2. **Windows 10/11 x64:** Prototype an NSIS installer registering ProgID `MarkdownViewer.Document` under `OpenWithProgids` without modifying `UserChoice`.
3. **macOS Apple Silicon (arm64):** Prototype an `.app` bundle with `Info.plist` declaring `CFBundleDocumentTypes` and UTI `net.daringfireball.markdown`.
4. Maintain independent, unmerged platform evidence records, marking unavailable environments explicitly as `NOT RUN` or `BLOCKED`.

---

## 2. Source PRD Requirements

- **FR-OPEN-003:** OS file associations (Registration without overriding user default choice).
- **PRD Section 1.4:** Mandatory feasibility spike items 5 & 8 (File association prototype & clean uninstall across target OSs).
- **PRD Section 11.1, 11.2, 11.3, 11.4:** General, Windows, macOS, and Linux packaging specifications.

---

## 3. Dependencies

- **Prerequisites:** [US-001](US-001-wails-react-skeleton-spike.md) (Compiled binary available).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - Create Linux packaging manifests (`debian/control`, `postinst`, `prerm`, `markdown-viewer.desktop`).
  - Create Windows NSIS installer script (`installer.nsi`) and ProgID registry configuration.
  - Create macOS `Info.plist` and document bundle template.
  - Verify package creation, inspect archive contents, and execute association tests where environments permit.
- **Explicit Exclusions:**
  - Production code signing certificates and Apple Developer notarization (deferred to Phase 6).

---

## 5. Observable Acceptance Criteria

1. `.deb` package builds and passes `desktop-file-validate` and archive structure inspection.
2. In native Linux environment, `dpkg -i` registers app in desktop database without overriding user defaults; `dpkg -r` removes desktop entry without orphaned files.
3. Windows NSIS script compiles into an installer declaring ProgID `MarkdownViewer.Document` and extensions `.md`, `.markdown`.
4. macOS `Info.plist` contains valid XML defining document types and UTI `net.daringfireball.markdown`.
5. Platforms that cannot be executed locally are explicitly classified as `NOT RUN` or `BLOCKED`.

---

## 6. Implementation Tasks (AUD-002, AUD-004)

### Task US-004.1: Create Linux packaging manifest and desktop entry
- **Task ID:** `US-004.1`
- **Status:** `READY`
- **Dependencies:** `US-001.4`
- **Completion Criteria:** Valid `markdown-viewer.desktop` with `MimeType=text/markdown;text/x-markdown;` and SVG icon.
- **Verification Command:**
  ```bash
  desktop-file-validate packaging/linux/markdown-viewer.desktop
  ```
- **Expected Observable Result:** Command exits with code 0 and no validation warnings or errors.
- **Evidence to Record:** Command exit code and terminal output.
- **Environment Handling:** Works on all Linux environments with `desktop-file-utils` installed.

### Task US-004.2: Build prototype Debian package (.deb)
- **Task ID:** `US-004.2`
- **Status:** `READY`
- **Dependencies:** `US-004.1`
- **Completion Criteria:** `.deb` archive is created containing binary in `/usr/bin/` and desktop file.
- **Verification Command:**
  ```bash
  dpkg-deb --info build/bin/markdown-viewer-spike.deb && dpkg-deb -c build/bin/markdown-viewer-spike.deb
  ```
- **Expected Observable Result:** Archive metadata confirms valid control fields and file tree structure.
- **Evidence to Record:** Package file listing and control metadata output.
- **Environment Handling:** Standard dpkg check applicable in Linux/WSL2 environments.

### Task US-004.3: Test Linux installation, MIME registration, and uninstall lifecycle
- **Task ID:** `US-004.3`
- **Status:** `READY`
- **Dependencies:** `US-004.2`
- **Completion Criteria:** `dpkg -i` registers app; `dpkg -r` removes app cleanly without leftover files.
- **Verification Command:** `go test -v -race ./internal/... && golangci-lint run`
- **Expected Observable Result:** Verification passes for Test Linux installation, MIME registration, and uninstall lifecycle with zero lint warnings.
- **Evidence to Record:** Go test and linter output.
- **Environment Handling:** Standard Go toolchain environment.
- **Verification Procedure (Manual & Scripted):**
  1. Install package: `sudo dpkg -i build/bin/markdown-viewer-spike.deb`.
  2. Verify candidate registration: `grep -i "markdown-viewer" /usr/share/applications/mimeinfo.cache`.
  3. Remove package: `sudo dpkg -r markdown-viewer-spike`.
  4. Verify clean removal: `test ! -f /usr/share/applications/markdown-viewer.desktop`.
- **Expected Observable Result:** App registered as candidate during install; completely removed during uninstall.
- **Evidence to Record:** Command outputs and cache query results.
- **Environment Handling:** If running in non-root environment or WSL2 without root access, classify as `BLOCKED`.

### Task US-004.4: Create and validate Windows NSIS packaging prototype
- **Task ID:** `US-004.4`
- **Status:** `READY`
- **Dependencies:** `US-001.4`
- **Completion Criteria:** NSIS script `packaging/windows/installer.nsi` configures `MarkdownViewer.Document` ProgID and `OpenWithProgids` keys without modifying `UserChoice`.
- **Verification Command:**
  ```bash
  grep -E "MarkdownViewer\.Document|OpenWithProgids" packaging/windows/installer.nsi
  ```
- **Expected Observable Result:** Script declares required registry keys and does not reference `UserChoice`.
- **Evidence to Record:** Registry declaration lines from script.
- **Environment Handling:** Compilation and installation execution on Windows host is `BLOCKED / NOT RUN` in the current WSL2 environment; must be verified on Windows CI runner.

### Task US-004.5: Create and validate macOS bundle and UTI association prototype
- **Task ID:** `US-004.5`
- **Status:** `READY`
- **Dependencies:** `US-001.4`
- **Completion Criteria:** `packaging/macos/Info.plist` defines `CFBundleDocumentTypes` for Markdown and declares UTI `net.daringfireball.markdown`.
- **Verification Command:**
  ```bash
  plutil -lint packaging/macos/Info.plist || grep -E "net\.daringfireball\.markdown|CFBundleDocumentTypes" packaging/macos/Info.plist
  ```
- **Expected Observable Result:** Valid XML plist structure containing declared UTI and document types.
- **Evidence to Record:** Plist inspection output.
- **Environment Handling:** macOS `.app` build and Launch Services test is `BLOCKED / NOT RUN` in the current Linux environment; must be verified on macOS CI runner.

### Task US-004.6: Record independent platform feasibility evidence
- **Task ID:** `US-004.6`
- **Status:** `READY`
- **Dependencies:** `US-004.2`, `US-004.4`, `US-004.5`
- **Completion Criteria:** Independent evidence records compiled for Windows, Linux, and macOS; non-run platforms explicitly classified as `NOT RUN` or `BLOCKED`.
- **Verification Command:**
  ```bash
  cat docs/stories/US-004-packaging-association-spike.md | grep -E "NOT RUN|BLOCKED|PASS"
  ```
- **Expected Observable Result:** Separate entries for Windows, Linux, and macOS reflecting actual execution status.
- **Evidence to Record:** Platform evidence summary in Section 8.
- **Environment Handling:** Applicable in all documentation environments.

---

## 7. Known Risks and Blockers

- Root access required for local `dpkg -i` tests.
- Windows host toolchain missing locally; native Windows validation blocked.
- Apple Silicon hardware unavailable locally; native macOS validation blocked.

---

## 8. Implementation Notes and Validation Evidence

*(To be filled by implementation agent during Phase 1 execution)*
- **Execution Date:** Not yet executed
- **Agent ID:** N/A
- **Changed Files:** None
- **Platform Evidence Records:**
  - **Linux (Ubuntu 24.04/26.04 WSL2):** `NOT RUN` (Awaiting Phase 1 execution)
  - **Linux (Ubuntu 24.04 LTS Native):** `BLOCKED` (Requires native Ubuntu machine)
  - **Windows 10/11 x64:** `BLOCKED` (Requires Windows host toolchain or CI runner)
  - **macOS Apple Silicon:** `BLOCKED` (Requires macOS hardware or CI runner)
- **Terminal Output & Verification Evidence:**
```text
(Awaiting Phase 1 execution)
```
