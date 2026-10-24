# EPIC-002: Core Native Application Lifecycle & Tab Management

- **Epic ID:** `EPIC-002`
- **Title:** Core Native Application Lifecycle & Tab Management
- **Status:** `DONE` (All 4 child stories US-005 through US-008 complete and verified)
- **Phase:** Phase 2 (Core Application Structure)
- **Target Release:** MVP Core

---

## 1. Objective and Scope

Establish the production application shell, native Go services, and frontend tab state. This includes:
1. `DocumentService` in Go to safely read local Markdown files, enforce the 20 MiB size limit, handle BOM and UTF-8 encoding gracefully.
2. Full command-line argument parsing and native open-file routing.
3. Production-grade single-instance coordination to prevent duplicate windows.
4. React application shell with an interactive empty state, drag-and-drop zone, and multi-document tab strip.
5. Integration of native file picker dialogs via Wails runtime.

---

## 2. Source PRD Requirements

- **FR-OPEN-001:** Open a document (Native file picker, Unicode, space handling)
- **FR-OPEN-002:** Drag and drop (Single/multi-file drops onto window)
- **FR-OPEN-004:** Open from command line or OS launch event
- **FR-OPEN-005:** Single-instance file routing
- **PRD Section 5.1 - 5.3:** Main window, Empty state, and Tab interaction architecture
- **PRD Section 9.5:** Document size limit (20 MiB max)

---

## 3. Dependencies

- **Preceding Epic:** `EPIC-001` (Feasibility Spike validated).

---

## 4. Major Risks

- Path normalization discrepancies across OSs (e.g., Windows drive letters and backslashes vs POSIX paths).
- Race conditions during rapid multi-file launches or simultaneous drag-and-drop events.

---

## 5. Exit Criteria

- User can launch app with 1 or more files via CLI or file picker and see them in separate tabs.
- Dragging files into the window opens them in tabs.
- Launching an already-open file focuses the existing tab without reloading or duplicating.
- Files > 20 MiB or unreadable files show clear, actionable error states without crashing.

---

## 6. Included User Stories

- [US-005: Native Document Service & Secure File Loading](../stories/US-005-native-document-service.md)
- [US-006: Application Lifecycle, Command-Line Parsing & Single-Instance Routing](../stories/US-006-lifecycle-cli-single-instance.md)
- [US-007: Frontend Application Shell, Tab State Management & Empty State](../stories/US-007-app-shell-tabs-empty-state.md)
- [US-008: Native File Picker & Drag-and-Drop Integration](../stories/US-008-file-picker-drag-drop.md)
