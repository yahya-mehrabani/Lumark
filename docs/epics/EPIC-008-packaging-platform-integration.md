# EPIC-008: Packaging, Operating-System Integration & Release Hardening

- **Epic ID:** `EPIC-008`
- **Title:** Packaging, Operating-System Integration & Release Hardening
- **Status:** `DRAFT`
- **Phase:** Phase 6 (Distribution & Release Hardening)
- **Target Release:** MVP Release

---

## 1. Objective and Scope

Deliver production-ready OS installation packages, complete native file associations, CI automation, and verify all MVP release criteria:
1. Windows: NSIS installer (`.exe`) with ProgID registration for `.md`/`.markdown`, Open With menu candidate registration, and clean uninstaller.
2. macOS: `.app` bundle and signed/notarized `.dmg` declaring Markdown document types and UTIs.
3. Linux: Ubuntu 24.04 LTS `.deb` package with `.desktop` launcher, icon, and MIME database integration.
4. Complete the mandatory 10-point File Association Test Matrix on all target platforms.
5. Validate performance benchmarks (startup < 2.5s, 1 MiB render < 1.0s, bounded memory).
6. Execute and sign off the Release Acceptance Checklist (PRD Section 15.1).

---

## 2. Source PRD Requirements

- **FR-OPEN-003:** OS file associations (Registration without overriding user default choice)
- **PRD Section 11.1:** General installer requirements
- **PRD Section 11.2:** Windows installer & WebView2 check
- **PRD Section 11.3:** macOS bundle & Launch Services
- **PRD Section 11.4:** Linux package, `.desktop`, and MIME types
- **PRD Section 11.5:** Association test matrix (10-point checklist)
- **PRD Section 12:** Quality attributes (Performance, Reliability, Accessibility, Compatibility)
- **PRD Section 13.3:** Continuous integration matrix
- **PRD Section 15.1:** Release acceptance checklist

---

## 3. Dependencies

- **Preceding Epics:** `EPIC-001` through `EPIC-007` (All feature and durability capabilities complete).

---

## 4. Major Risks

- File associations broken by OS updates (e.g., Windows UserChoice hash enforcement).
- Linux WebKitGTK packaging differences across distributions.
- macOS code-signing and notarization requirements on Apple Silicon.

---

## 5. Exit Criteria

- Production `.deb`, NSIS `.exe`, and macOS `.app`/`.dmg` artifacts build automatically in CI.
- 10-point association test matrix passes on all declared target operating systems.
- Cold start launch interactive in < 2.5s; 1 MiB render in < 1.0s.
- All 18 rows of the Release Acceptance Checklist verified.

---

## 6. Included User Stories

- [US-029: Windows Packaging, NSIS Installer & File Associations](../stories/US-029-windows-packaging-associations.md)
- [US-030: macOS Application Bundle, UTIs & Launch Services Integration](../stories/US-030-macos-packaging-associations.md)
- [US-031: Linux Debian Package, AppImage & Desktop/MIME Integration](../stories/US-031-linux-packaging-associations.md)
- [US-032: Cross-Platform File Association Validation Matrix & Release Hardening](../stories/US-032-association-matrix-release-hardening.md)
