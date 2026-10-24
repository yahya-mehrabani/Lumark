# US-008: Native File Picker & Drag-and-Drop Integration

- **Story ID:** `US-008`
- **Parent Epic:** [EPIC-002: Core Native Application Lifecycle & Tab Management](../epics/EPIC-002-native-lifecycle-tabs.md)
- **Status:** `DONE`
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
  - Wails native dialog adapter in `internal/platform/dialogs.go` (implemented in `internal/dialogs`).
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
- **Status:** `DONE`
- **Dependencies:** None
- **Completion Criteria:** Go method calls `runtime.OpenFileDialog` with extension filters and returns selected paths.
- **Verification Command:** `go test -v -run TestNativeFileDialog ./internal/dialogs/...`
- **Expected Observable Result:** File dialog configuration sets filters to Markdown files and resolves selected paths.
- **Evidence to Record:** Go dialogs test output.
- **Environment Handling:** Standard Go toolchain environment.

### Task US-008.2: Implement frontend file drop handler
- **Task ID:** `US-008.2`
- **Status:** `DONE`
- **Dependencies:** `US-008.1`
- **Completion Criteria:** Handles `dragover`, `dragleave`, and `drop` events with visual drop-target feedback.
- **Verification Command:** `npm run test:unit -- drag-drop`
- **Expected Observable Result:** DropZone component processes single and multiple dropped files.
- **Evidence to Record:** Vitest dropzone test output.
- **Environment Handling:** Node.js / Vitest jsdom environment.

### Task US-008.3: Implement multi-file batch loader and error notifier
- **Task ID:** `US-008.3`
- **Status:** `DONE`
- **Dependencies:** `US-008.2`
- **Completion Criteria:** Dispatches valid files to TabStore; displays warning toast for rejected files.
- **Verification Command:** `npm run test:unit -- mixed-drop`
- **Expected Observable Result:** Mixed drop test verifies Markdown files are opened while non-Markdown files are filtered.
- **Evidence to Record:** Vitest test output.
- **Environment Handling:** Node.js / Vitest jsdom environment.

### Task US-008.4: Write unit and integration tests
- **Task ID:** `US-008.4`
- **Status:** `DONE`
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

### Task US-008.1: Implement native file dialog in Go
- **Execution Date:** 2026-10-24
- **Status:** `DONE`
- **Changed Files:**
  - `internal/dialogs/types.go`: `DialogRunner` interface, `WailsDialogRunner`, and `DefaultMarkdownFilters()`.
  - `internal/dialogs/service.go`: `DialogService` interface and `Service` implementing `OpenFile`, `OpenFiles`, `OpenFileDialog`, `OpenMultipleFilesDialog`.
  - `internal/dialogs/service_test.go`: Unit tests for `TestNativeFileDialog` covering single file, multi-file, cancellation, error handling, default Markdown filters, and Wails uninitialized runner.
  - `main.go`: Registered `dialogs.NewService()` in Wails application services.
  - `frontend/bindings/markdown-viewer/internal/dialogs/service.ts`: Generated TypeScript bindings for `OpenFile` and `OpenFiles`.
- **Terminal Output & Verification Evidence:**
```text
=== RUN   TestNativeFileDialog
=== RUN   TestNativeFileDialog/single_file_selection_success
=== RUN   TestNativeFileDialog/single_file_selection_canceled_by_user
=== RUN   TestNativeFileDialog/single_file_selection_runner_error
=== RUN   TestNativeFileDialog/multiple_files_selection_success
=== RUN   TestNativeFileDialog/multiple_files_selection_canceled_by_user
=== RUN   TestNativeFileDialog/default_markdown_filters_validation
=== RUN   TestNativeFileDialog/custom_title_configuration
=== RUN   TestNativeFileDialog/wails_runner_without_running_application_returns_ErrNoApplication
--- PASS: TestNativeFileDialog (0.00s)
    --- PASS: TestNativeFileDialog/single_file_selection_success (0.00s)
    --- PASS: TestNativeFileDialog/single_file_selection_canceled_by_user (0.00s)
    --- PASS: TestNativeFileDialog/single_file_selection_runner_error (0.00s)
    --- PASS: TestNativeFileDialog/multiple_files_selection_success (0.00s)
    --- PASS: TestNativeFileDialog/multiple_files_selection_canceled_by_user (0.00s)
    --- PASS: TestNativeFileDialog/default_markdown_filters_validation (0.00s)
    --- PASS: TestNativeFileDialog/custom_title_configuration (0.00s)
    --- PASS: TestNativeFileDialog/wails_runner_without_running_application_returns_ErrNoApplication (0.00s)
PASS
- **Linter Status:** `golangci-lint run ./internal/dialogs/...` passed with 0 issues.

### Task US-008.2: Implement frontend file drop handler
- **Execution Date:** 2026-10-24
- **Status:** `DONE`
- **Changed Files:**
  - `frontend/src/features/shell/DropZone.tsx`: `DropZone` component with nested counter tracking, `is-drag-over` state, accessible ARIA attributes, and visual drop overlay.
  - `frontend/src/features/shell/dropzone.css`: Modern glassmorphism overlay with pulsating dashed border and drop icon badge.
  - `frontend/src/features/shell/drag-drop.test.tsx`: Comprehensive component tests for dragenter, dragover, nested child tracking, dragleave, drop, and disabled state.
- **Terminal Output & Verification Evidence:**
```text
> markdown-viewer-frontend@0.1.0 test:unit
> vitest run drag-drop

 RUN  v5.0.5 /home/repos/personal/markdown-go/frontend

 ✓ src/features/shell/drag-drop.test.tsx (7 tests) 111ms
   ✓ DropZone Component (7)
     ✓ renders children correctly without overlay initially 42ms
     ✓ shows visual feedback overlay on dragenter and dragover 28ms
     ✓ hides visual overlay on dragleave when leaving the dropzone boundary 10ms
     ✓ handles nested drag enter/leave without prematurely hiding overlay 9ms
     ✓ calls onFilesDropped with single dropped file and clears overlay 10ms
     ✓ calls onFilesDropped with multiple dropped files preserving order 4ms
     ✓ ignores drag events and does not trigger onFilesDropped when disabled 3ms

 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  11:04:27
- **Full Test Suite & Build:** `npm run test:unit` (41 passed across 5 files), `npm run build` (58 modules transformed, zero TypeScript/Vite errors).

### Task US-008.3: Implement multi-file batch loader and error notifier
- **Execution Date:** 2026-10-24
- **Status:** `DONE`
- **Changed Files:**
  - `frontend/src/features/shell/batchLoader.ts`: Multi-file batch loader with extension filtering, file partitioning, `loadDroppedFiles`, and actionable warning formatting (`formatRejectedFilesMessage`).
  - `frontend/src/features/shell/mixed-drop.test.tsx`: Unit tests verifying 3 `.md` files drop batch loading (Acceptance Criteria 4), mixed drop with valid `.md` and unsupported `.exe` (Acceptance Criteria 5), multiple unsupported files, empty list, and duplicate path refocusing.
  - `frontend/src/features/shell/AppShell.tsx`: Wrapped root shell in `DropZone`.
  - `frontend/src/App.tsx`: Wired `handleOpenFile` via `DialogService.OpenFiles()` and `handleFileDrop` via `loadDroppedFiles()` into `<AppShell>`.
- **Terminal Output & Verification Evidence:**
```text
> markdown-viewer-frontend@0.1.0 test:unit
> vitest run mixed-drop

 RUN  v5.0.5 /home/repos/personal/markdown-go/frontend

 ✓ src/features/shell/mixed-drop.test.tsx (10 tests) 28ms
   ✓ Multi-File Batch Loader & Error Notifier (10)
     ✓ isSupportedMarkdownFile (2)
       ✓ accepts standard markdown extensions case-insensitively 5ms
       ✓ rejects unsupported extensions and empty strings 1ms
     ✓ partitionFiles (1)
       ✓ correctly splits valid and invalid files 5ms
     ✓ formatRejectedFilesMessage (2)
       ✓ formats single unsupported file notification 1ms
       ✓ formats multiple unsupported files notification 1ms
     ✓ loadDroppedFiles (5)
       ✓ opens 3 valid .md files in the specified order (Acceptance Criteria 4) 5ms
       ✓ handles mixed valid and invalid drop: opens valid file and notifies warning without crashing (Acceptance Criteria 5) 2ms
       ✓ displays warning and opens zero tabs when all dropped files are unsupported 1ms
       ✓ handles empty dropped files list without state change or error 2ms
       ✓ refocuses existing tab when dropping an already-opened file without duplicating tabs 2ms

 Test Files  1 passed (1)
      Tests  10 passed (10)
   Start at  11:09:56
   Duration  1.15s (environment 79%, setup 12%, tests 3%, transform 3%, import 2%, worker 1%)
```
- **Full Test Suite & Build:** `npm run test:unit` (51 passed across 6 files), `npm run build` (62 modules transformed, zero TypeScript/Vite errors).

### Task US-008.4: Write unit and integration tests
- **Execution Date:** 2026-10-24
- **Status:** `DONE`
- **Changed Files:**
  - `frontend/src/features/shell/DropZone.tsx`: Added `ariaLabel` prop with default `'Application drop zone'` to prevent ARIA naming collisions with nested EmptyState dropzones.
  - `frontend/src/features/shell/dropzone.test.tsx`: Comprehensive integration test suite covering DropZone states (clean init, dragenter/dragover overlay, boundary dragleave reset, drop dispatch), full AppShell 3-file batch drop (Acceptance Criteria 4), mixed drop of valid .md and invalid .exe without crashing (Acceptance Criteria 5), native open file triggers (header button, Ctrl+O, Cmd+O), EmptyState open/drop clicks, and Unicode/spaced filenames.
- **Terminal Output & Verification Evidence:**
```text
> markdown-viewer-frontend@0.1.0 test:unit
> vitest run dropzone

 RUN  v5.0.5 /home/repos/personal/markdown-go/frontend

 ✓ src/features/shell/dropzone.test.tsx (9 tests) 348ms
   ✓ DropZone & AppShell Drag-and-Drop Integration Tests (US-008.4) (9)
     ✓ DropZone Drag Event States & Visual Feedback (4)
       ✓ initializes in clean state without active overlay 44ms
       ✓ transitions to is-drag-over on dragenter and maintains on dragover 23ms
       ✓ restores normal state on dragleave when boundary counter reaches zero 8ms
       ✓ resets drag state and dispatches files on drop 13ms
     ✓ Full AppShell Drag-and-Drop & File Filtering Integration (5)
       ✓ handles 3 dropped Markdown files opening them as tabs in order (AC 4) 161ms
       ✓ handles mixed drop of valid .md and invalid .exe without crashing (AC 5) 24ms
       ✓ triggers onOpenFile when clicking header Open File button or Ctrl+O shortcut 30ms
       ✓ triggers onOpenFile when clicking EmptyState button or dropzone 18ms
       ✓ supports filenames with spaces and unicode characters 19ms

 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  11:14:19
   Duration  1.70s (environment 51%, tests 26%, import 9%, transform 8%, setup 6%, worker 1%)
```
- **Full Test Suite & Build:** `npm run test:unit` (60 passed across 7 files), `npm run build` (62 modules transformed, zero errors).
- **Backend Tests:** `go test ./...` passed across all packages.
- **Story US-008 Completion Status:** `DONE` across all 4 tasks (`US-008.1` through `US-008.4`).
