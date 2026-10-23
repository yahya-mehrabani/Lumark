# US-008: Native File Picker & Drag-and-Drop Integration

- **Story ID:** `US-008`
- **Parent Epic:** [EPIC-002: Core Native Application Lifecycle & Tab Management](../epics/EPIC-002-native-lifecycle-tabs.md)
- **Status:** `DRAFT`
- **Assigned Phase:** Phase 2 (Core Application Structure)

---

## 1. Objective and Expected Outcome

Enable users to open Markdown files through:
1. Native OS file picker dialog triggered from the File menu, empty state button, or shortcut (`Ctrl/Cmd`+`O`), prioritizing `.md`, `.markdown`, `.mdown`, and `.mkd`.
2. Drag-and-drop operations dropping one or more files onto the window (tab bar or main viewport).
3. Handling mixed valid/invalid drops gracefully (opening valid files while non-intrusively reporting unsupported files).

---

## 2. Source PRD Requirements

- **FR-OPEN-001:** Open a document (Native file picker dialog).
- **FR-OPEN-002:** Drag and drop (Single/multi-file drops, consistent handling).
- **FR-ERR-001:** Actionable error reporting.

---

## 3. Dependencies

- **Prerequisites:** [US-005](US-005-native-document-service.md) (DocumentService) and [US-007](US-007-app-shell-tabs-empty-state.md) (Tab State Store).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - Wails native dialog adapter in `internal/platform/dialogs.go`.
  - Frontend drag-and-drop event handlers in `features/shell/DropZone.tsx`.
  - Extension filtering and multi-file batch opening.
- **Explicit Exclusions:**
  - Dragging remote URLs (only local file drops supported).

---

## 5. Observable Acceptance Criteria

1. Clicking "Open File" opens native OS file picker with Markdown filter enabled.
2. Selecting one or more `.md` files opens them as tabs in the specified order.
3. Canceling the file picker causes no state changes or errors.
4. Dragging 3 `.md` files onto the window opens all 3 files.
5. Dragging a mix of a valid `.md` file and an unsupported `.exe` file opens the `.md` file and displays a non-intrusive notification about the unsupported file without crashing.

---

## 6. Implementation Tasks

### Task US-008.1: Implement native file dialog in Go
- **Task ID:** `US-008.1`
- **Status:** `DRAFT`
- **Dependencies:** None
- **Completion Criteria:** Go method calls `runtime.OpenFileDialog` with extension filters and returns selected paths.
- **Verification Command:** `go test -v -run TestNativeFileDialog ./internal/dialogs/...`
- **Expected Observable Result:** File dialog configuration sets filters to Markdown files and resolves selected paths.
- **Evidence to Record:** Go dialogs test output.
- **Environment Handling:** Standard Go toolchain environment.

### Task US-008.2: Implement frontend file drop handler
- **Task ID:** `US-008.2`
- **Status:** `DRAFT`
- **Dependencies:** `US-008.1`
- **Completion Criteria:** Handles `dragover`, `dragleave`, and `drop` events with visual drop-target feedback.
- **Verification Command:** `npm run test:unit -- drag-drop`
- **Expected Observable Result:** DropZone component processes single and multiple dropped files.
- **Evidence to Record:** Vitest dropzone test output.
- **Environment Handling:** Node.js / Vitest jsdom environment.

### Task US-008.3: Implement multi-file batch loader and error notifier
- **Task ID:** `US-008.3`
- **Status:** `DRAFT`
- **Dependencies:** `US-008.2`
- **Completion Criteria:** Dispatches valid files to TabStore; displays warning toast for rejected files.
- **Verification Command:** `npm run test:unit -- mixed-drop`
- **Expected Observable Result:** Mixed drop test verifies Markdown files are opened while non-Markdown files are filtered.
- **Evidence to Record:** Vitest test output.
- **Environment Handling:** Node.js / Vitest jsdom environment.

### Task US-008.4: Write unit and integration tests
- **Task ID:** `US-008.4`
- **Status:** `DRAFT`
- **Dependencies:** `US-008.3`
- **Completion Criteria:** Tests verify drag event states and file filtering logic.
- **Verification Command:** `npm run test:unit -- dropzone`
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Test file picker: Press `Ctrl/Cmd`+`O`, select sample file, verify tab opens.
2. Test drag-and-drop: Drag test file into window, verify drop indicator appears and file loads.
3. Test mixed drop: Drag one `.md` and one `.bin` file; verify `.md` opens and toast displays warning.

---

## 8. Known Risks and Blockers

- Wails drag-and-drop event differences between WebKitGTK and WebView2 (some WebViews require specific CSS `-webkit-app-region: no-drag` settings on drop targets).

---

## 9. Implementation Notes and Validation Evidence

*(To be filled by implementation agent during execution)*
- **Execution Date:** Not yet executed
- **Agent ID:** N/A
- **Changed Files:** None
- **Terminal Output & Verification Evidence:**
```text
(Awaiting execution in Phase 2)
```
