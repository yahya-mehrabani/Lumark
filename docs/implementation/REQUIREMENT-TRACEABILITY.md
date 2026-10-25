# Requirement Traceability Matrix

This document provides complete, bidirectional traceability between the authoritative product requirements in [PRD.md](../../PRD.md) and the implementation artifacts (Epics, Stories, and Tasks).

---

## 1. Functional Requirements Traceability (40 Requirements)

| Requirement ID | PRD Source Section | Priority | Implementing Epic & Story | Implementing Tasks | Planned Verification Method | Implementation Status | Verification Status |
|---|---|---|---|---|---|---|---|
| **FR-OPEN-001** | §6.1 | P0 | `EPIC-002` / [`US-005`](../stories/US-005-native-document-service.md), [`US-008`](../stories/US-008-file-picker-drag-drop.md) | `US-005.1`-`4`, `US-008.1` | Native file picker open test with Unicode & spaces | `IN_PROGRESS` | `PARTIALLY_VERIFIED` (`US-005` Go backend verified) |
| **FR-OPEN-002** | §6.1 | P0 | `EPIC-002` / [`US-008`](../stories/US-008-file-picker-drag-drop.md) | `US-008.2`-`4` | Drag-and-drop test (single/multiple/mixed files) | `NOT_STARTED` | `UNVERIFIED` |
| **FR-OPEN-003** | §6.1, §11 | P0 | `EPIC-008` / [`US-029`](../stories/US-029-windows-packaging-associations.md), [`US-030`](../stories/US-030-macos-packaging-associations.md), [`US-031`](../stories/US-031-linux-packaging-associations.md), [`US-032`](../stories/US-032-association-matrix-release-hardening.md) (Spiked in [`US-004`](../stories/US-004-packaging-association-spike.md)) | `US-004.1`-`6`, `US-029.1`-`4`, `US-030.1`-`4`, `US-031.1`-`4`, `US-032.1` | 10-point OS association matrix across Windows, macOS, Linux | `NOT_STARTED` | `UNVERIFIED` |
| **FR-OPEN-004** | §6.1 | P0 | `EPIC-002` / [`US-006`](../stories/US-006-lifecycle-cli-single-instance.md) (Spiked in [`US-002`](../stories/US-002-cli-single-instance-spike.md)) | `US-002.1`-`3`, `US-006.1` | CLI launch with single, multiple, and Unicode paths | `IN_PROGRESS` | `PARTIALLY_VERIFIED` (`US-006` Go CLI parsing & path normalizer verified) |
| **FR-OPEN-005** | §6.1 | P0 | `EPIC-002` / [`US-006`](../stories/US-006-lifecycle-cli-single-instance.md) (Spiked in [`US-002`](../stories/US-002-cli-single-instance-spike.md)) | `US-002.1`-`3`, `US-006.2`-`4` | Secondary launch IPC forwarding to running instance without second window | `IN_PROGRESS` | `PARTIALLY_VERIFIED` (`US-006` instance coordinator, router & concurrency verified) |
| **FR-OPEN-006** | §6.1 | P1 | `EPIC-007` / [`US-026`](../stories/US-026-recent-files-tab-restore.md) | `US-026.1`-`4` | Unit tests for 20-item bound, recency sort, missing-file badge | `NOT_STARTED` | `UNVERIFIED` |
| **FR-OPEN-007** | §6.1 | P1 | `EPIC-007` / [`US-027`](../stories/US-027-file-change-watcher.md) | `US-027.1`-`4` | Disk modification debounced reload and scroll preservation test | `NOT_STARTED` | `UNVERIFIED` |
| **FR-RENDER-001**| §6.2 | P0 | `EPIC-003` / [`US-009`](../stories/US-009-commonmark-gfm-pipeline.md) | `US-009.1`-`3` | CommonMark specification golden fixture automated test | `IMPLEMENTED` | `VERIFIED` (`US-009` React CommonMark pipeline verified) |
| **FR-RENDER-002**| §6.2 | P0 | `EPIC-003` / [`US-009`](../stories/US-009-commonmark-gfm-pipeline.md) | `US-009.1`-`3` | GFM fixture automated test (tables, task lists, strikethrough) | `IMPLEMENTED` | `VERIFIED` (`US-009` GFM pipeline & fixtures verified) |
| **FR-RENDER-003**| §6.2 | P0 | `EPIC-003` / [`US-010`](../stories/US-010-code-blocks-highlighting.md) | `US-010.1`-`4` | Local Shiki highlighting test for known/unknown languages | `IMPLEMENTED` | `VERIFIED` (`US-010` Shiki offline highlighting & fallback verified) |
| **FR-RENDER-004**| §6.2 | P0 | `EPIC-003` / [`US-010`](../stories/US-010-code-blocks-highlighting.md) | `US-010.3`, `US-010.4` | Copy code clipboard verification test (whitespace/Unicode exact) | `IMPLEMENTED` | `VERIFIED` (`US-010` Copy code clipboard fidelity & feedback verified) |
| **FR-RENDER-005**| §6.2 | P0 | `EPIC-004` / [`US-013`](../stories/US-013-mermaid-offline-rendering.md) | `US-013.1`-`4` | Offline Mermaid fixture suite, invalid syntax error fallback test | `IMPLEMENTED` | `VERIFIED` (`US-013` Offline Mermaid rendering, diagram types, SVG sanitization, and error isolation verified) |
| **FR-RENDER-006**| §6.2 | P0 | `EPIC-004` / [`US-014`](../stories/US-014-katex-math-rendering.md) | `US-014.1`-`4` | Offline KaTeX math rendering, currency sign false-match test | `IMPLEMENTED` | `VERIFIED` (`US-014` Offline KaTeX math rendering, local font bundling, currency protection, and MathML accessibility verified) |
| **FR-RENDER-007**| §6.2 | P0 | `EPIC-004` / [`US-015`](../stories/US-015-html-css-sanitization.md) | `US-015.1`-`4` | Allowlist sanitization unit test and script-stripping assertions | `IMPLEMENTED` | `VERIFIED` (`US-015` rehype-sanitize AST allowlist, PostCSS scoped CSS transform, inline style sanitization, golden fixture verified) |
| **FR-RENDER-008**| §6.2 | P0 | `EPIC-003` / [`US-012`](../stories/US-012-headings-anchors-fixtures.md) | `US-012.1`-`4` | Heading slug generation and internal hash scrolling test | `IMPLEMENTED` | `VERIFIED` (`US-012` Heading slug generation, duplicate disambiguation, and anchor scrolling verified) |
| **FR-RENDER-009**| §6.2 | P0 | `EPIC-004` / [`US-013`](../stories/US-013-mermaid-offline-rendering.md), [`US-014`](../stories/US-014-katex-math-rendering.md), [`US-015`](../stories/US-015-html-css-sanitization.md) | `US-013.2`, `US-014.2`, `US-015.3`, `US-015.4` | Fault isolation test: malformed extension does not blank doc | `IMPLEMENTED` | `VERIFIED` (`US-013` Mermaid fallback, `US-014` KaTeX fallback, and `US-015` HTML/CSS partial rendering verified) |
| **FR-DIR-001** | §6.3 | P0 | `EPIC-005` / [`US-017`](../stories/US-017-auto-direction-engine.md) | `US-017.1`-`4` | First strong character auto-direction test across multilingual fixtures | `IMPLEMENTED` | `VERIFIED` (`US-017` First strong character UBA detector, rehypeAutoDirection block plugin, CSS unicode-bidi isolate, and 79 multilingual tests verified) |
| **FR-DIR-002** | §6.3 | P0 | `EPIC-005` / [`US-018`](../stories/US-018-explicit-dir-css-precedence.md) | `US-018.1`, `US-018.3` | Explicit HTML `dir` attribute override verification | `IMPLEMENTED` | `VERIFIED` (`US-018` Explicit HTML `dir` attribute override, container cascade, and child overriding verified) |
| **FR-DIR-003** | §6.3 | P0 | `EPIC-005` / [`US-018`](../stories/US-018-explicit-dir-css-precedence.md) | `US-018.2`, `US-018.3` | Scoped CSS direction & alignment classes precedence test | `IMPLEMENTED` | `VERIFIED` (`US-018` Scoped CSS direction and text alignment class extraction, cascading, and scope containment verified) |
| **FR-DIR-004** | §6.3 | P0 | `EPIC-005` / [`US-019`](../stories/US-019-direction-preference-non-prose.md) | `US-019.2`, `US-019.3` | User default direction setting test (Auto, RTL, LTR) | `IMPLEMENTED` | `VERIFIED` (`US-019` User direction preferences 'auto'|'rtl'|'ltr', reactive hook, and DirectionResolver fallback for neutral blocks verified across 15 unit tests) |
| **FR-DIR-005** | §6.3 | P0 | `EPIC-005` / [`US-019`](../stories/US-019-direction-preference-non-prose.md) | `US-019.1`, `US-019.3` | Non-prose LTR isolation test (code, math, Mermaid stay LTR) | `IMPLEMENTED` | `VERIFIED` (`US-019` Strict LTR enforcement on code blocks, inline code, KaTeX math, and Mermaid diagrams with bidi isolation verified across 28 unit tests) |
| **FR-DIR-006** | §6.3 | P0 | `EPIC-005` / [`US-020`](../stories/US-020-rtl-ltr-fixtures-suite.md) | `US-020.1`-`3` | Comprehensive bidi regression fixture suite across platform WebViews | `IMPLEMENTED` | `VERIFIED` (`US-020` Complete 6-document golden fixture suite covering Persian, Arabic, mixed technical, nested lists, bidi tables, and explicit styling verified across 30 automated tests under Linux; Windows/macOS deferred) |
| **FR-ASSET-001** | §6.4 | P0 | `EPIC-003` / [`US-011`](../stories/US-011-local-assets-safe-links.md) (Spiked in [`US-003`](../stories/US-003-webview-asset-security-spike.md)) | `US-003.1`, `US-011.1`, `US-011.2` | Relative image loading test and missing asset placeholder test | `IMPLEMENTED` | `VERIFIED` |
| **FR-ASSET-002** | §6.4 | P0 | `EPIC-003` / [`US-011`](../stories/US-011-local-assets-safe-links.md) | `US-011.3`, `US-011.4` | Relative local `.md` link tab opening and anchor scrolling test | `IMPLEMENTED` | `VERIFIED` |
| **FR-ASSET-003** | §6.4 | P1 | `EPIC-003` / [`US-011`](../stories/US-011-local-assets-safe-links.md) | `US-011.3` | Non-markdown local file open validation | `IMPLEMENTED` | `VERIFIED` |
| **FR-LINK-001** | §6.4 | P0 | `EPIC-003` / [`US-011`](../stories/US-011-local-assets-safe-links.md) | `US-011.3`, `US-011.4` | Intercepted external link launch in OS default browser | `IMPLEMENTED` | `VERIFIED` |
| **FR-ASSET-004** | §6.4 | P0 | `EPIC-003` / [`US-011`](../stories/US-011-local-assets-safe-links.md), `EPIC-004` / [`US-015`](../stories/US-015-html-css-sanitization.md) | `US-011.1`, `US-015.1` | Network monitor check: remote images/styles blocked by default | `IMPLEMENTED` | `VERIFIED` |
| **FR-NAV-001** | §6.5 | P0 | `EPIC-006` / [`US-021`](../stories/US-021-table-of-contents.md) | `US-021.1`-`4` | Table of contents extraction, scroll-to-heading, active scroll spy | `NOT_STARTED` | `UNVERIFIED` |
| **FR-NAV-002** | §6.5 | P0 | `EPIC-006` / [`US-022`](../stories/US-022-in-document-search.md) | `US-022.1`-`4` | In-document search, match counter, next/prev navigation test | `NOT_STARTED` | `UNVERIFIED` |
| **FR-NAV-003** | §6.5 | P0 | `EPIC-006` / [`US-023`](../stories/US-023-theme-zoom-selection.md) | `US-023.3`, `US-023.4` | Zoom shortcuts, zoom limits (50%-250%), reset test | `NOT_STARTED` | `UNVERIFIED` |
| **FR-NAV-004** | §6.5 | P0 | `EPIC-006` / [`US-023`](../stories/US-023-theme-zoom-selection.md) | `US-023.1`, `US-023.2` | Light, Dark, System theme switching and OS sync test | `NOT_STARTED` | `UNVERIFIED` |
| **FR-NAV-005** | §6.5 | P0 | `EPIC-006` / [`US-023`](../stories/US-023-theme-zoom-selection.md) | `US-023.5` | Native text selection across elements and right-click context menu copy test | `NOT_STARTED` | `UNVERIFIED` |
| **FR-NAV-006** | §6.5 | P1 | `EPIC-006` / [`US-024`](../stories/US-024-print-workflow-styling.md) | `US-024.1`-`4` | Print preview styling test (chrome hidden, page breaks clean) | `NOT_STARTED` | `UNVERIFIED` |
| **FR-SET-001** | §6.6 | P0 | `EPIC-007` / [`US-025`](../stories/US-025-settings-service-persistence.md) | `US-025.1`-`4` | Settings persistence and retrieval round-trip unit test | `NOT_STARTED` | `UNVERIFIED` |
| **FR-SET-002** | §6.6 | P0 | `EPIC-007` / [`US-025`](../stories/US-025-settings-service-persistence.md) | `US-025.2`, `US-025.4` | Corrupted JSON recovery and schema migration test | `NOT_STARTED` | `UNVERIFIED` |
| **FR-SET-003** | §6.6 | P0 | `EPIC-007` / [`US-025`](../stories/US-025-settings-service-persistence.md), [`US-026`](../stories/US-026-recent-files-tab-restore.md) | `US-025.1`, `US-026.1` | Inspection of persisted `settings.json`: zero document content | `NOT_STARTED` | `UNVERIFIED` |
| **FR-SET-004** | §6.6 | P1 | `EPIC-007` / [`US-025`](../stories/US-025-settings-service-persistence.md) | `US-025.3`, `US-025.4` | Reset to defaults action verification | `NOT_STARTED` | `UNVERIFIED` |
| **FR-ERR-001** | §6.7 | P0 | `EPIC-007` / [`US-028`](../stories/US-028-fault-isolation-diagnostics.md) | `US-028.3` | Plain-language error toast verification (no raw stack traces) | `NOT_STARTED` | `UNVERIFIED` |
| **FR-ERR-002** | §6.7 | P0 | `EPIC-007` / [`US-028`](../stories/US-028-fault-isolation-diagnostics.md) | `US-028.2`, `US-028.4` | Error boundary fault isolation unit tests | `NOT_STARTED` | `UNVERIFIED` |
| **FR-ERR-003** | §6.7 | P1 | `EPIC-007` / [`US-028`](../stories/US-028-fault-isolation-diagnostics.md) | `US-028.1`, `US-028.4` | Diagnostics log rotation (5 MiB bound) and content check | `NOT_STARTED` | `UNVERIFIED` |

---

## 2. Security Invariants Traceability (10 Invariants)

| Requirement ID | Description | PRD Source | Implementing Work Item | Verification Method | Status |
|---|---|---|---|---|---|
| **SEC-INVAR-01** | No arbitrary script execution in app origin | §8.1 #1 | [`US-015`](../stories/US-015-html-css-sanitization.md), [`US-016`](../stories/US-016-adversarial-security-corpus.md) | Adversarial test corpus (`xss-scripts.md`) | `VERIFIED` (`US-016` adversarial runner asserts 100% script tags/handlers stripped, zero execution) |
| **SEC-INVAR-02** | Documents cannot invoke Go bindings directly | §8.1 #2 | [`US-003`](../stories/US-003-webview-asset-security-spike.md), [`US-015`](../stories/US-015-html-css-sanitization.md) | Sandboxed WebView bridge test | `NOT_STARTED` |
| **SEC-INVAR-03** | No top-level WebView navigation to external URLs | §8.1 #3 | [`US-011`](../stories/US-011-local-assets-safe-links.md) | Link interception and URL dispatcher test | `VERIFIED` |
| **SEC-INVAR-04** | No silent shell or protocol execution | §8.1 #4 | [`US-011`](../stories/US-011-local-assets-safe-links.md), [`US-016`](../stories/US-016-adversarial-security-corpus.md) | Adversarial protocol test (`protocols.md`) | `VERIFIED` (`US-016` protocols test asserts dangerous/smuggled schemes neutralized to # and blocked) |
| **SEC-INVAR-05** | Remote content not fetched automatically | §8.1 #5 | [`US-011`](../stories/US-011-local-assets-safe-links.md), [`US-015`](../stories/US-015-html-css-sanitization.md) | Network isolation test | `NOT_STARTED` |
| **SEC-INVAR-06** | CSS cannot escape document container | §8.1 #6 | [`US-015`](../stories/US-015-html-css-sanitization.md), [`US-016`](../stories/US-016-adversarial-security-corpus.md) | Scoped CSS AST transform test | `VERIFIED` (`US-015` PostCSS `.markdown-content` selector scoping, overlay neutralization, @import stripping verified) |
| **SEC-INVAR-07** | Safe SVG policy (scripts stripped) | §8.1 #7 | [`US-013`](../stories/US-013-mermaid-offline-rendering.md), [`US-016`](../stories/US-016-adversarial-security-corpus.md) | SVG sanitization assertions | `VERIFIED` (`US-016` asserts SVG script tags stripped, SVG javascript: links stripped, zero execution) |
| **SEC-INVAR-08** | File paths validated as data, never shell strings | §8.1 #8 | [`US-005`](../stories/US-005-native-document-service.md), [`US-006`](../stories/US-006-lifecycle-cli-single-instance.md) | Go unit tests with command injection strings | `IN_PROGRESS` |
| **SEC-INVAR-09** | Local file access strictly scoped | §8.1 #9 | [`US-005`](../stories/US-005-native-document-service.md), [`US-011`](../stories/US-011-local-assets-safe-links.md) | Path traversal unit tests (`../../etc/passwd`) | `NOT_STARTED` |
| **SEC-INVAR-10** | Settings and logs exclude document text | §8.1 #10 | [`US-025`](../stories/US-025-settings-service-persistence.md), [`US-028`](../stories/US-028-fault-isolation-diagnostics.md) | Automated scan of generated settings and logs | `NOT_STARTED` |

---

## 3. Privacy Obligations Traceability (3 Obligations)

| Obligation ID | Description | PRD Source | Implementing Work Item | Verification Method | Status |
|---|---|---|---|---|---|
| **PRIV-01** | Zero telemetry, analytics, user tracking, or remote crash reports | §8.4 | [`US-001`](../stories/US-001-wails-react-skeleton-spike.md), [`US-028`](../stories/US-028-fault-isolation-diagnostics.md) | Code audit and network traffic capture | `NOT_STARTED` |
| **PRIV-02** | Fully offline default operation (no network required for reading) | §8.4 | [`US-011`](../stories/US-011-local-assets-safe-links.md), [`US-032`](../stories/US-032-association-matrix-release-hardening.md) | Disconnected network interface verification test | `NOT_STARTED` |
| **PRIV-03** | Third-party dependency audit for telemetry and licenses | §8.4 | [`US-032`](../stories/US-032-association-matrix-release-hardening.md) | `govulncheck`, `npm audit`, license scanner | `NOT_STARTED` |

---

## 4. Quality & Platform Obligations Traceability (7 Obligations)

| Obligation ID | Description | PRD Source | Implementing Work Item | Verification Method | Status |
|---|---|---|---|---|---|
| **NFR-PERF** | Launch < 2.5s, 1 MiB render < 1.0s, 5 MiB < 3.0s | §12.1 | [`US-032`](../stories/US-032-association-matrix-release-hardening.md) | Automated benchmark script (`scripts/benchmark.sh`) | `NOT_STARTED` |
| **NFR-RELY** | No uncaught crash on invalid input; atomic settings; resource cleanup | §12.2 | [`US-025`](../stories/US-025-settings-service-persistence.md), [`US-028`](../stories/US-028-fault-isolation-diagnostics.md) | Fault injection tests, fuzzing, and leak checks | `NOT_STARTED` |
| **NFR-A11Y** | Keyboard navigation, WCAG 2.2 AA contrast, visible focus, reduced motion | §12.3 | [`US-023`](../stories/US-023-theme-zoom-selection.md), [`US-032`](../stories/US-032-association-matrix-release-hardening.md) | Keyboard-only audit, contrast checker, axe-core | `NOT_STARTED` |
| **NFR-COMPAT** | UTF-8 normalization, BOM handling, non-Latin filenames, cross-platform paths | §12.4 | [`US-005`](../stories/US-005-native-document-service.md), [`US-006`](../stories/US-006-lifecycle-cli-single-instance.md) | Unit test suite with Unicode and malformed byte fixtures | `IN_PROGRESS` |
| **NFR-MAINT** | Strict TypeScript, Go static checks (`golangci-lint`), deterministic builds | §12.5 | [`US-001`](../stories/US-001-wails-react-skeleton-spike.md), [`US-032`](../stories/US-032-association-matrix-release-hardening.md) | CI linter passes (`golangci-lint`, `tsc --noEmit`) | `NOT_STARTED` |
| **PKG-ASSOC-MATRIX** | Mandatory 10-point association test matrix per target OS | §11.5 | [`US-032`](../stories/US-032-association-matrix-release-hardening.md) | Execution across Windows, macOS, and Linux matrix | `NOT_STARTED` |
| **REL-CHECKLIST** | 18-point release acceptance checklist signoff | §15.1 | [`US-032`](../stories/US-032-association-matrix-release-hardening.md) | Pre-release verification audit report | `NOT_STARTED` |

---

## 5. Requirement Coverage & Recalculation Summary (AUD-003)

- **Total Functional Requirements (FR-):** 40
- **Total Security Invariants (SEC-INVAR-):** 10
- **Total Privacy Obligations (PRIV-):** 3
- **Total Quality & Platform Obligations (NFR- / PKG- / REL-):** 7
- **Grand Total Cataloged Items:** **60 distinct requirements and obligations**
- **Structural Mapping Completeness:** 60 / 60 catalog items mapped to Epics, Stories, and concrete Tasks (0 unmapped; crosswalk from all 88 original audit inventory items verified in PLANNING-AUDIT-REMEDIATION.md Section 4.2)
- **Unmapped Items:** 0
- **Manual Semantic Review:** Requirement semantics preserved across consolidations (PKG-ASSOC-MATRIX, REL-CHECKLIST, NFR-MAINT); semantic mapping for `FR-NAV-005` correctly assigned to dedicated selection and copy task `US-023.5` under Phase 5 / `EPIC-006` (separated from theme tokens).
- **Implementation Status:** 0 / 60 Implemented (`NOT_STARTED`)
- **Verification Status:** 0 / 60 Verified (`UNVERIFIED`)
