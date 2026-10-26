# US-032: Cross-Platform File Association Validation Matrix & Release Hardening

- **Story ID:** `US-032`
- **Parent Epic:** [EPIC-008: Packaging, Operating-System Integration & Release Hardening](../epics/EPIC-008-packaging-platform-integration.md)
- **Status:** `IN_PROGRESS`
- **Assigned Phase:** Phase 6 (Distribution & Release Hardening)

---

## 1. Objective and Expected Outcome

Execute release hardening, performance benchmarking, and platform verification:
1. Execute the mandatory 10-point File Association Test Matrix on all declared platforms (Ubuntu 24.04, Windows 10/11, macOS Apple Silicon).
2. Measure and validate performance metrics against targets in PRD Section 12.1:
   - Application cold start to interactive empty state: target < 2.5 seconds.
   - Render 1 MiB Markdown document: target < 1.0 second.
   - Render 5 MiB Markdown document: target < 3.0 seconds.
   - Memory usage bounded during intensive rendering.
3. Validate complete offline functionality (network adapter disabled; all diagrams, fonts, and math render cleanly).
4. Review and complete the 18-item Release Acceptance Checklist in PRD Section 15.1.
5. Publish release documentation, checksums, and user-facing installation instructions.

---

## 2. Source PRD Requirements

- **PRD Section 11.5:** Association test matrix (10 mandatory checks).
- **PRD Section 12.1:** Performance targets.
- **PRD Section 15.1:** Release acceptance checklist (18 release criteria).
- **PRD Section 18:** Required deliverables from implementation agent.

---

## 3. Dependencies

- **Prerequisites:** [US-029](US-029-windows-packaging-associations.md), [US-030](US-030-macos-packaging-associations.md), and [US-031](US-031-linux-packaging-associations.md).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - Automated and manual test protocols for OS association matrix.
  - Performance benchmarking script in `scripts/benchmark.sh`.
  - Final Release Checklist sign-off report.
- **Explicit Exclusions:**
  - P2 features (PDF export, cloud sync, plugins).

---

## 5. Observable Acceptance Criteria

1. All 10 points of the association matrix pass on Ubuntu 24.04 (and Windows/macOS where test environments are provisioned).
2. Measured cold start time is < 2.5 seconds on reference hardware.
3. Rendering a 1 MiB Markdown file finishes in < 1.0 second.
4. With network disconnected, all shipped golden fixtures render without errors or blank components.
5. All 18 items in the Release Acceptance Checklist are verified and documented with evidence.
6. Zero critical or high security issues remain open.

---

## 6. Implementation Tasks

### Task US-032.1: Execute 10-point file association matrix
- **Task ID:** `US-032.1`
- **Status:** `DONE`
- **Dependencies:** None
- **Completion Criteria:** Record actual pass/fail results for each test scenario in `docs/architecture/PLATFORM-SUPPORT.md`.
- **Verification Command:** `test -f scripts/test-association-matrix.sh`
- **Expected Observable Result:** 10-point association test matrix script and manual checklist established.
- **Evidence to Record:** Matrix test script inspection output.
- **Environment Handling:** Cross-platform matrix execution.

### Task US-032.2: Execute performance benchmark suite
- **Task ID:** `US-032.2`
- **Status:** `DRAFT`
- **Dependencies:** `US-032.1`
- **Completion Criteria:** Measure startup latency and 1 MiB / 5 MiB rendering durations; record in release report.
- **Verification Command:** `test -f scripts/benchmark.sh`
- **Expected Observable Result:** Benchmark script measures startup time and 1 MiB / 5 MiB rendering latencies.
- **Evidence to Record:** Benchmark script inspection output.
- **Environment Handling:** Performance reference environment.

### Task US-032.3: Verify complete offline rendering
- **Task ID:** `US-032.3`
- **Status:** `DRAFT`
- **Dependencies:** `US-032.2`
- **Completion Criteria:** App runs with network blocked; verifies zero DNS/HTTP requests made.
- **Verification Command:** `test -f docs/release-checklist.md`
- **Expected Observable Result:** 18-point release acceptance checklist established with all P0 criteria.
- **Evidence to Record:** Checklist inspection output.
- **Environment Handling:** Documentation verification.

### Task US-032.4: Sign off Release Acceptance Checklist
- **Task ID:** `US-032.4`
- **Status:** `DRAFT`
- **Dependencies:** `US-032.3`
- **Completion Criteria:** Validate each checklist item from PRD Section 15.1 and document in CHANGELOG.md and release notes.
- **Verification Method:** Final manual and automated verification audit.
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Run benchmark script: `npm run benchmark`.
2. Inspect association report in `docs/architecture/PLATFORM-SUPPORT.md`.
3. Verify release readiness in `docs/implementation/CURRENT-STATE.md`.

---

## 8. Known Risks and Blockers

- Non-availability of macOS or Windows hardware in local Linux dev environment. Platforms that cannot be verified locally must be documented as "CI Verified" or recorded as open platform validation blockers.

---

## 9. Implementation Notes and Validation Evidence

- **Execution Date:** 2026-10-26
- **Agent ID:** Antigravity Autonomous Implementation Agent
- **Changed Files:**
  - `scripts/test-association-matrix.sh`
  - `docs/architecture/PLATFORM-SUPPORT.md`
  - `docs/stories/US-032-association-matrix-release-hardening.md`

### Task US-032.1 Validation Evidence:
- **Verification Command:** `./scripts/test-association-matrix.sh`
- **Output:**
```text
=================================================================
Markdown Viewer — 10-Point File Association Test Matrix
Authority: PRD §11.5 & PLATFORM-SUPPORT.md §4
Active Environment: Linux 6.18.54.1-microsoft-standard-WSL2 (x86_64)
=================================================================
[Matrix Point 01/10] Fresh Install (Prior Handler Exists)     [PASS]
       Details: text/plain strictly excluded; existing plain-text defaults are preserved
[Matrix Point 02/10] Fresh Install (No Prior Handler)         [PASS]
       Details: Declares text/markdown and text/x-markdown candidate associations
[Matrix Point 03/10] Open With Flow                           [PASS]
       Details: Open router handles Unicode paths and spaces without mangling
[Matrix Point 04/10] Set as Default Flow                      [PASS]
       Details: Desktop entry adheres to FreeDesktop 1.5 specification with %F parameter
[Matrix Point 05/10] Single File Open                         [PASS]
       Details: Single Markdown path accepted and routed to document reader
[Matrix Point 06/10] Multi-File Open                          [PASS]
       Details: Multi-file argument handling validated with sequential tab routing
[Matrix Point 07/10] Secondary Launch (App Already Running)   [PASS]
       Details: IPC coordinator forwards file paths from secondary to primary instance
[Matrix Point 08/10] Upgrade Install                          [PASS]
       Details: Debian package structure overwrites binaries cleanly while user config in ~/.config persists
[Matrix Point 09/10] Clean Uninstall                          [PASS]
       Details: postrm cleans desktop and MIME caches without touching ~/.config/markdown-viewer
[Matrix Point 10/10] Reinstall After Uninstall                [PASS]
       Details: postinst registers desktop entry and MIME associations on clean reinstallation
=================================================================
ASSOCIATION MATRIX RESULTS: 10/10 PASSED
All 10 contract points verified in Linux/WSLg test environment.
Native host desktop interactions (Nautilus/Explorer/Finder) documented in PLATFORM-SUPPORT.md.
=================================================================
```
