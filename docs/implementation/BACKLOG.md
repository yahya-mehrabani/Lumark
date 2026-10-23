# Implementation Backlog

This document is the authoritative index of all Epics and User Stories for `markdown-go`. For detailed acceptance criteria, task breakdowns, and validation evidence, follow the links to the individual authoritative work-item documents.

---

## 1. Status Model Summary

- `DRAFT`: Initial specification; awaiting prerequisites.
- `READY`: Fully articulated, dependencies satisfied, ready for implementation.
- `IN_PROGRESS`: Actively under development by an agent.
- `BLOCKED`: Blocked by external dependency, platform constraint, or decision.
- `DONE`: Implementation complete, automated tests passed, observable evidence recorded in repo.
- `DEFERRED`: Formally postponed with documented rationale.

---

## 2. Epics Index

| Epic ID | Title | Target Phase | Status | Authoritative Document |
|---|---|---|---|---|
| `EPIC-001` | Technical Feasibility Spike & Platform Foundation | Phase 1 | `IN_PROGRESS` (Authorized for Feasibility Spike) | [EPIC-001-feasibility-spike.md](../epics/EPIC-001-feasibility-spike.md) |
| `EPIC-002` | Core Native Application Lifecycle & Tab Management | Phase 2 | `DRAFT` | [EPIC-002-native-lifecycle-tabs.md](../epics/EPIC-002-native-lifecycle-tabs.md) |
| `EPIC-003` | CommonMark, GFM & Core Document Rendering | Phase 3 | `DRAFT` | [EPIC-003-commonmark-gfm-rendering.md](../epics/EPIC-003-commonmark-gfm-rendering.md) |
| `EPIC-004` | Advanced Rendering & Security Sanitization | Phase 4 | `DRAFT` | [EPIC-004-advanced-rendering-security.md](../epics/EPIC-004-advanced-rendering-security.md) |
| `EPIC-005` | Bidirectional Text & Layout Engine (RTL/LTR) | Phase 4 | `DRAFT` | [EPIC-005-bidirectional-layout.md](../epics/EPIC-005-bidirectional-layout.md) |
| `EPIC-006` | Navigation, Search & User Reading Tools | Phase 5 | `DRAFT` | [EPIC-006-navigation-reading-tools.md](../epics/EPIC-006-navigation-reading-tools.md) |
| `EPIC-007` | Settings, Persistence & Durability | Phase 5 | `DRAFT` | [EPIC-007-settings-durability.md](../epics/EPIC-007-settings-durability.md) |
| `EPIC-008` | Packaging, Operating-System Integration & Release Hardening | Phase 6 | `DRAFT` | [EPIC-008-packaging-platform-integration.md](../epics/EPIC-008-packaging-platform-integration.md) |

---

## 3. User Stories Index

### Phase 1: Technical Feasibility Spike (EPIC-001)

| Story ID | Title | Priority | Status | Dependencies | Story Link |
|---|---|---|---|---|---|
| `US-001` | Wails Application Skeleton & Production Asset Embedding Spike (Wails v3 Candidate / v2 Fallback) | P0 | `DONE` | None | [US-001.md](../stories/US-001-wails-react-skeleton-spike.md) |
| `US-002` | Command-Line & Single-Instance IPC Feasibility Spike | P0 | `DONE` | `US-001` | [US-002.md](../stories/US-002-cli-single-instance-spike.md) |
| `US-003` | WebView Rendering & Local Asset Security Baseline Spike | P0 | `DONE` | `US-001` | [US-003.md](../stories/US-003-webview-asset-security-spike.md) |
| `US-004` | Platform Packaging & File Association Feasibility Spike | P0 | `IN_PROGRESS` (Tasks US-004.1, US-004.2 DONE) | `US-001` | [US-004.md](../stories/US-004-packaging-association-spike.md) |

---

### Phase 2: Core Native Application Lifecycle & Tab Management (EPIC-002)

| Story ID | Title | Priority | Status | Dependencies | Story Link |
|---|---|---|---|---|---|
| `US-005` | Native Document Service & Secure File Loading | P0 | `DRAFT` | `EPIC-001` | [US-005.md](../stories/US-005-native-document-service.md) |
| `US-006` | Application Lifecycle, Command-Line Parsing & Single-Instance Routing | P0 | `DRAFT` | `US-005` | [US-006.md](../stories/US-006-lifecycle-cli-single-instance.md) |
| `US-007` | Frontend Application Shell, Tab State Management & Empty State | P0 | `DRAFT` | `US-005`, `US-006` | [US-007.md](../stories/US-007-app-shell-tabs-empty-state.md) |
| `US-008` | Native File Picker & Drag-and-Drop Integration | P0 | `DRAFT` | `US-005`, `US-007` | [US-008.md](../stories/US-008-file-picker-drag-drop.md) |

---

### Phase 3: Baseline Markdown Rendering (EPIC-003)

| Story ID | Title | Priority | Status | Dependencies | Story Link |
|---|---|---|---|---|---|
| `US-009` | CommonMark & GitHub Flavored Markdown Rendering Pipeline | P0 | `DRAFT` | `US-007` | [US-009.md](../stories/US-009-commonmark-gfm-pipeline.md) |
| `US-010` | Fenced Code Blocks, Syntax Highlighting & Copy Action | P0 | `DRAFT` | `US-009` | [US-010.md](../stories/US-010-code-blocks-highlighting.md) |
| `US-011` | Local Asset Resolution & Safe Link Handling | P0 | `DRAFT` | `US-009`, `US-007` | [US-011.md](../stories/US-011-local-assets-safe-links.md) |
| `US-012` | Headings, Stable Anchor Generation & Core Fixture Suite | P0 | `DRAFT` | `US-009` | [US-012.md](../stories/US-012-headings-anchors-fixtures.md) |

---

### Phase 4: Advanced Rendering, Security & Direction (EPIC-004 & EPIC-005)

| Story ID | Title | Priority | Status | Dependencies | Story Link |
|---|---|---|---|---|---|
| `US-013` | Mermaid Diagrams Offline Rendering & Error Isolation | P0 | `DRAFT` | `US-009` | [US-013.md](../stories/US-013-mermaid-offline-rendering.md) |
| `US-014` | LaTeX Math Offline Rendering with KaTeX | P0 | `DRAFT` | `US-009` | [US-014.md](../stories/US-014-katex-math-rendering.md) |
| `US-015` | HTML & CSS Sanitization and Scope Isolation Engine | P0 | `DRAFT` | `US-009` | [US-015.md](../stories/US-015-html-css-sanitization.md) |
| `US-016` | Adversarial Security Test Corpus & Fault Isolation | P0 | `DRAFT` | `US-013`, `US-015` | [US-016.md](../stories/US-016-adversarial-security-corpus.md) |
| `US-017` | Unicode Automatic Direction Detection Engine | P0 | `DRAFT` | `US-009` | [US-017.md](../stories/US-017-auto-direction-engine.md) |
| `US-018` | Explicit HTML `dir` & Scoped CSS Direction Precedence | P0 | `DRAFT` | `US-015`, `US-017` | [US-018.md](../stories/US-018-explicit-dir-css-precedence.md) |
| `US-019` | User Direction Preference & Non-Prose Bidi Protection | P0 | `DRAFT` | `US-017`, `US-018` | [US-019.md](../stories/US-019-direction-preference-non-prose.md) |
| `US-020` | RTL/LTR Golden Fixtures & Platform WebView Verification Suite | P0 | `DRAFT` | `US-017`–`US-019` | [US-020.md](../stories/US-020-rtl-ltr-fixtures-suite.md) |

---

### Phase 5: Reading Experience, Durability & Persistence (EPIC-006 & EPIC-007)

| Story ID | Title | Priority | Status | Dependencies | Story Link |
|---|---|---|---|---|---|
| `US-021` | Interactive Table of Contents & Heading Navigation | P0 | `DRAFT` | `US-012` | [US-021.md](../stories/US-021-table-of-contents.md) |
| `US-022` | In-Document Text Search with Match Highlighting | P0 | `DRAFT` | `US-009` | [US-022.md](../stories/US-022-in-document-search.md) |
| `US-023` | Document Viewport Controls: Themes, Zoom & Selection (includes FR-NAV-005) | P0 | `DRAFT` | `US-009`, `US-010`, `US-013` | [US-023.md](../stories/US-023-theme-zoom-selection.md) |
| `US-024` | Native WebView Print Workflow & Print Styling | P1 | `DRAFT` | `US-009`, `US-023` | [US-024.md](../stories/US-024-print-workflow-styling.md) |
| `US-025` | Versioned Settings Service & Atomic Persistence | P0 | `DRAFT` | `US-005` | [US-025.md](../stories/US-025-settings-service-persistence.md) |
| `US-026` | Recent Files Tracking & Startup Tab Restoration | P1 | `DRAFT` | `US-025`, `US-007` | [US-026.md](../stories/US-026-recent-files-tab-restore.md) |
| `US-027` | File Change Watcher & Debounced Auto-Reload | P1 | `DRAFT` | `US-005`, `US-007` | [US-027.md](../stories/US-027-file-change-watcher.md) |
| `US-028` | Fault Isolation, User-Facing Error Notifications & Local Diagnostics | P0/P1 | `DRAFT` | `US-005`, `US-025` | [US-028.md](../stories/US-028-fault-isolation-diagnostics.md) |

---

### Phase 6: Packaging, Platform Integration & Release Hardening (EPIC-008)

| Story ID | Title | Priority | Status | Dependencies | Story Link |
|---|---|---|---|---|---|
| `US-029` | Windows Packaging, NSIS Installer & File Associations | P0 | `DRAFT` | `EPIC-001`–`EPIC-007` | [US-029.md](../stories/US-029-windows-packaging-associations.md) |
| `US-030` | macOS Application Bundle, UTIs & Launch Services Integration | P0 | `DRAFT` | `EPIC-001`–`EPIC-007` | [US-030.md](../stories/US-030-macos-packaging-associations.md) |
| `US-031` | Linux Debian Package, AppImage & Desktop/MIME Integration | P0 | `DRAFT` | `EPIC-001`–`EPIC-007` | [US-031.md](../stories/US-031-linux-packaging-associations.md) |
| `US-032` | Cross-Platform File Association Validation Matrix & Release Hardening | P0 | `DRAFT` | `US-029`–`US-031` | [US-032.md](../stories/US-032-association-matrix-release-hardening.md) |

---

## 4. Backlog Metrics Summary

- **Total Epics:** 8
- **Total User Stories:** 32
- **Total Detailed Tasks:** 124 (all 124 tasks have complete, concrete verification methods and environment handling)
- **PRD Requirements & Obligations Mapped:** 60 / 60 (100% bidirectional traceability)
- **Current Implementation Verdict:** **`IN_PROGRESS`** (Phase 1 Feasibility Spike authorized on Wails v3 candidate `v3.0.0-beta.34` with v2 `v2.17.0` fallback; Tasks `US-001.1` through `US-001.4` completed & verified, `US-001.5` next)
