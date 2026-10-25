# US-027: File Change Watcher & Debounced Auto-Reload

- **Story ID:** `US-027`
- **Parent Epic:** [EPIC-007: Settings, Persistence & Durability](../epics/EPIC-007-settings-durability.md)
- **Status:** `DONE`
- **Assigned Phase:** Phase 5 (Reading Experience & Durability)

---

## 1. Objective and Expected Outcome

Automatically monitor open documents for external disk modifications:
1. When an open `.md` file is modified externally (e.g. edited in an external editor), detect the change via OS file notifications (using `fsnotify` in Go backend).
2. Debounce rapid write events (e.g. 300ms window) to avoid multiple partial re-renders.
3. Automatically reload the document content in the open tab and preserve the user's active scroll position where content remains stable.
4. If an open file is moved or deleted, update the tab to an "Unavailable / Missing" state without crashing.
5. Reloading one tab does not affect or reset unrelated open tabs.
6. Cleanly release watcher handles when a tab is closed or during app shutdown.

---

## 2. Source PRD Requirements

- **FR-OPEN-007:** File changed on disk (Debounce, scroll preservation, missing-file handling).
- **PRD Section 9.4:** State and lifecycle (Race condition handling between watcher and reload).
- **PRD Section 12.2:** Reliability (Release watcher loops on shutdown).

---

## 3. Dependencies

- **Prerequisites:** [US-005](US-005-native-document-service.md) (DocumentService) and [US-007](US-007-app-shell-tabs-empty-state.md) (Tab Store).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - `internal/watcher/filewatcher.go` using `fsnotify`.
  - Wails event emission `wails:file-changed` with file path.
  - Frontend debounced reload handler and scroll position restorer.
- **Explicit Exclusions:**
  - Watching directories recursively (only actively opened file paths are watched).

---

## 5. Observable Acceptance Criteria

1. Modifying an open file in terminal (`echo "## New Heading" >> doc.md`) reloads the tab within 500ms.
2. If scrolled halfway down a 50-paragraph document, adding a paragraph at the end preserves the current scroll offset.
3. Rapid external saves (e.g., 10 saves in 100ms) coalesce into a single reload event.
4. Deleting an open file externally updates the tab title with a warning icon and keeps the previous content readable with a notification banner.
5. Closing a tab stops watching that file immediately (verified by checking OS open file handles).

---

## 6. Implementation Tasks

### Task US-027.1: Implement Go file watcher service with fsnotify
- **Task ID:** `US-027.1`
- **Status:** `DONE`
- **Dependencies:** None
- **Completion Criteria:** Go service manages active watch list with `WatchFile(path)` and `UnwatchFile(path)`.
- **Verification Command:** `go test -v -run TestFileWatcher ./internal/watcher/...`
- **Expected Observable Result:** File modification events detected and forwarded to frontend debounced.
- **Evidence to Record:** Watcher test output.
- **Environment Handling:** Standard Go toolchain environment.

### Task US-027.2: Implement event debouncer in Go
- **Task ID:** `US-027.2`
- **Status:** `DONE`
- **Dependencies:** `US-027.1`
- **Completion Criteria:** Coalesces write events with a 300ms timer before emitting reload event.
- **Verification Command:** `go test -v -run TestWatcherDebounce ./internal/watcher/...`
- **Expected Observable Result:** Rapid file saves debounced into a single reload event.
- **Evidence to Record:** Debounce test output.
- **Environment Handling:** Standard Go toolchain environment.

### Task US-027.3: Implement frontend scroll preservation during tab reload
- **Task ID:** `US-027.3`
- **Status:** `DONE`
- **Dependencies:** `US-027.2`
- **Completion Criteria:** Records `scrollTop` or top visible heading, re-renders content, restores scroll offset.
- **Verification Command:** `npm run test:unit -- reload-scroll-preservation`
- **Expected Observable Result:** Document reload preserves current scroll position and active heading.
- **Evidence to Record:** Scroll preservation test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-027.4: Write unit and integration tests for watcher
- **Task ID:** `US-027.4`
- **Status:** `DONE`
- **Dependencies:** `US-027.3`
- **Completion Criteria:** Tests assert debouncing, deletion detection, and cleanup on unwatch.
- **Verification Command:** `go test -v -race ./internal/watcher/...`
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Open document in app.
2. In bash: `echo "Updated content" >> test.md`.
3. Check app window: verify document updates automatically without losing scroll position.

---

## 8. Known Risks and Blockers

- Editors using atomic save (writing to a temp file and renaming over original file) trigger `RENAME` or `REMOVE` events instead of `WRITE`. Watcher must detect file recreation and re-attach watch handle.

---

## 9. Implementation Notes and Validation Evidence

- **Execution Date:** 2026-10-25
- **Agent ID:** Antigravity Autonomous Story Runner
- **Changed Files:**
  - `go.mod`, `go.sum` (Added pinned `github.com/fsnotify/fsnotify v1.8.0`)
  - `internal/watcher/types.go` (Defined `EventType`, `FileChangeEvent`, `EventHandler`)
  - `internal/watcher/filewatcher.go` (Implemented `Service` with `WatchFile`, `UnwatchFile`, `IsWatching`, `WatchedFiles`, atomic save re-attachment, configurable debounce window, and graceful `Close`)
  - `internal/watcher/filewatcher_test.go` (Added comprehensive tests in `TestFileWatcher`)
  - `internal/watcher/debouncer_test.go` (Added 5 debounce tests in `TestWatcherDebounce` verifying coalescing of rapid writes, multiple files independence, distinct saves, unwatch timer cancellation, and 300ms default window)
  - `main.go` (Registered `watcherService` in services, registered `file:changed` / `wails:file-changed` events, hooked event forwarding and shutdown cleanup)
  - `frontend/src/features/tabs/tabReload.ts` (Implemented `captureScrollState`, `restoreScrollState`, and `handleFileChanged` with scroll preservation and missing-file handling)
  - `frontend/src/features/tabs/tabWatcher.ts` (Implemented `WatcherAdapter`, `InMemoryWatcherAdapter`, `WailsWatcherAdapter`, and `syncTabWatches`)
  - `frontend/src/features/tabs/tabStore.ts` (Enhanced `updateTabContent` to support status resetting)
  - `frontend/src/features/tabs/index.ts` (Exported tabReload and tabWatcher modules)
  - `frontend/src/App.tsx` (Wired `file:changed` listener, automatic tab watch syncing, and missing-file warning banner in viewport)
  - `frontend/src/features/tabs/reload-scroll-preservation.test.ts` (Added 9 unit tests verifying scroll capture/restoration, active/background tab reload isolation, disk deletion handling, and watcher syncing)
  - `internal/watcher/integration_test.go` (Added concurrent stress tests, rapid atomic save cycle, and shutdown race tests)
- **Terminal Output & Verification Evidence:**
```text
=== RUN   TestFileWatcher_WatchAndUnwatch
--- PASS: TestFileWatcher_WatchAndUnwatch (0.00s)
=== RUN   TestFileWatcher_ModifyDetection
--- PASS: TestFileWatcher_ModifyDetection (0.05s)
=== RUN   TestFileWatcher_NonexistentAndInvalidFile
--- PASS: TestFileWatcher_NonexistentAndInvalidFile (0.00s)
=== RUN   TestFileWatcher_UnwatchStopsNotifications
--- PASS: TestFileWatcher_UnwatchStopsNotifications (0.15s)
=== RUN   TestFileWatcher_Close
--- PASS: TestFileWatcher_Close (0.02s)
=== RUN   TestFileWatcher_AtomicSaveRecreation
--- PASS: TestFileWatcher_AtomicSaveRecreation (0.11s)
=== RUN   TestFileWatcher_Deletion
--- PASS: TestFileWatcher_Deletion (0.08s)
PASS
ok      markdown-viewer/internal/watcher        0.423s

=== RUN   TestWatcherDebounce_DefaultWindowIs300ms
--- PASS: TestWatcherDebounce_DefaultWindowIs300ms (0.00s)
=== RUN   TestWatcherDebounce_RapidWritesCoalesce
--- PASS: TestWatcherDebounce_RapidWritesCoalesce (0.43s)
=== RUN   TestWatcherDebounce_DistinctSavesSeparatedByWindow
--- PASS: TestWatcherDebounce_DistinctSavesSeparatedByWindow (0.34s)
=== RUN   TestWatcherDebounce_MultipleFilesIndependent
--- PASS: TestWatcherDebounce_MultipleFilesIndependent (0.28s)
=== RUN   TestWatcherDebounce_UnwatchCancelsPendingTimer
--- PASS: TestWatcherDebounce_UnwatchCancelsPendingTimer (0.23s)
PASS
ok      markdown-viewer/internal/watcher        1.288s

npm run test:unit -- reload-scroll-preservation:
 ✓ src/features/tabs/reload-scroll-preservation.test.ts (9 tests) 63ms
   ✓ tabReload & Scroll Preservation (9)
     ✓ captureScrollState and restoreScrollState (3)
       ✓ captures scrollTop and restores it to the container 18ms
       ✓ captures top-most visible heading ID when present 5ms
       ✓ handles null container gracefully without crashing 5ms
     ✓ handleFileChanged - Modification & Scroll Preservation (3)
       ✓ reloads active tab content and restores scroll position 19ms
       ✓ reloads background tabs without affecting active tab or scrolling 2ms
       ✓ ignores modification events for files that are not open 1ms
     ✓ handleFileChanged - External File Deletion (2)
       ✓ updates tab status to missing and preserves document text buffer on disk deletion 1ms
       ✓ clears missing status when a previously missing file is reloaded upon creation/modification 2ms
     ✓ syncTabWatches (1)
       ✓ watches newly opened tabs and un-watches closed tabs 6ms

 Test Files  1 passed (1)
      Tests  9 passed (9)

go test -v -race -count=1 ./internal/watcher/...:
=== RUN   TestWatcherDebounce_DefaultWindowIs300ms
--- PASS: TestWatcherDebounce_DefaultWindowIs300ms (0.00s)
=== RUN   TestWatcherDebounce_RapidWritesCoalesce
--- PASS: TestWatcherDebounce_RapidWritesCoalesce (0.44s)
=== RUN   TestWatcherDebounce_DistinctSavesSeparatedByWindow
--- PASS: TestWatcherDebounce_DistinctSavesSeparatedByWindow (0.32s)
=== RUN   TestWatcherDebounce_MultipleFilesIndependent
--- PASS: TestWatcherDebounce_MultipleFilesIndependent (0.29s)
=== RUN   TestWatcherDebounce_UnwatchCancelsPendingTimer
--- PASS: TestWatcherDebounce_UnwatchCancelsPendingTimer (0.23s)
=== RUN   TestFileWatcher_WatchAndUnwatch
--- PASS: TestFileWatcher_WatchAndUnwatch (0.02s)
=== RUN   TestFileWatcher_ModifyDetection
--- PASS: TestFileWatcher_ModifyDetection (0.06s)
=== RUN   TestFileWatcher_NonexistentAndInvalidFile
--- PASS: TestFileWatcher_NonexistentAndInvalidFile (0.00s)
=== RUN   TestFileWatcher_UnwatchStopsNotifications
--- PASS: TestFileWatcher_UnwatchStopsNotifications (0.15s)
=== RUN   TestFileWatcher_Close
--- PASS: TestFileWatcher_Close (0.00s)
=== RUN   TestFileWatcher_AtomicSaveRecreation
--- PASS: TestFileWatcher_AtomicSaveRecreation (0.13s)
=== RUN   TestFileWatcher_Deletion
--- PASS: TestFileWatcher_Deletion (0.08s)
=== RUN   TestFileWatcher_ConcurrentStress
--- PASS: TestFileWatcher_ConcurrentStress (0.05s)
=== RUN   TestFileWatcher_ConcurrentShutdownStress
--- PASS: TestFileWatcher_ConcurrentShutdownStress (0.05s)
=== RUN   TestFileWatcher_RapidAtomicSaveCycle
--- PASS: TestFileWatcher_RapidAtomicSaveCycle (0.22s)
PASS
ok      markdown-viewer/internal/watcher        3.059s
```
