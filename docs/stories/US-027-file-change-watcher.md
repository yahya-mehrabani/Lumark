# US-027: File Change Watcher & Debounced Auto-Reload

- **Story ID:** `US-027`
- **Parent Epic:** [EPIC-007: Settings, Persistence & Durability](../epics/EPIC-007-settings-durability.md)
- **Status:** `READY`
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
- **Status:** `DRAFT`
- **Dependencies:** None
- **Completion Criteria:** Go service manages active watch list with `WatchFile(path)` and `UnwatchFile(path)`.
- **Verification Command:** `go test -v -run TestFileWatcher ./internal/watcher/...`
- **Expected Observable Result:** File modification events detected and forwarded to frontend debounced.
- **Evidence to Record:** Watcher test output.
- **Environment Handling:** Standard Go toolchain environment.

### Task US-027.2: Implement event debouncer in Go
- **Task ID:** `US-027.2`
- **Status:** `DRAFT`
- **Dependencies:** `US-027.1`
- **Completion Criteria:** Coalesces write events with a 300ms timer before emitting reload event.
- **Verification Command:** `npm run test:unit -- reload-scroll-preservation`
- **Expected Observable Result:** Document reload preserves current scroll position and active heading.
- **Evidence to Record:** Scroll preservation test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-027.3: Implement frontend scroll preservation during tab reload
- **Task ID:** `US-027.3`
- **Status:** `DRAFT`
- **Dependencies:** `US-027.2`
- **Completion Criteria:** Records `scrollTop` or top visible heading, re-renders content, restores scroll offset.
- **Verification Command:** `go test -v -run TestWatcherDebounce ./internal/watcher/...`
- **Expected Observable Result:** Rapid file saves debounced into a single reload event.
- **Evidence to Record:** Debounce test output.
- **Environment Handling:** Standard Go toolchain environment.

### Task US-027.4: Write unit and integration tests for watcher
- **Task ID:** `US-027.4`
- **Status:** `DRAFT`
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

*(To be filled by implementation agent during execution)*
- **Execution Date:** Not yet executed
- **Agent ID:** N/A
- **Changed Files:** None
- **Terminal Output & Verification Evidence:**
```text
(Awaiting execution in Phase 5)
```
