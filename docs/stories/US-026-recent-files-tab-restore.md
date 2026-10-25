# US-026: Recent Files Tracking & Startup Tab Restoration

- **Story ID:** `US-026`
- **Parent Epic:** [EPIC-007: Settings, Persistence & Durability](../epics/EPIC-007-settings-durability.md)
- **Status:** `IN_PROGRESS`
- **Assigned Phase:** Phase 5 (Reading Experience & Durability)

---

## 1. Objective and Expected Outcome

Manage recent documents and optional session tab restoration:
1. Maintain a bounded list of up to 20 recently opened files, ordered most-recent first.
2. Re-opening an existing recent file moves it to the top of the list rather than creating duplicates.
3. Check existence of recent files on disk: mark deleted or moved files as unavailable and allow users to remove them.
4. Provide a "Clear Recent Files" action.
5. Store only canonical normalized paths and ISO timestamps; never document text.
6. Optional startup restore: If `restoreOpenTabs` is enabled in preferences, reopen the previous session's active document tabs on app launch.

---

## 2. Source PRD Requirements

- **FR-OPEN-006:** Recent files (Bounded to 20, missing file handling, no text content).
- **FR-SET-001:** Preferences (Restore open tabs, recent-file list).
- **FR-SET-003:** Data minimization (Store paths and timestamps only).

---

## 3. Dependencies

- **Prerequisites:** [US-025](US-025-settings-service-persistence.md) (Settings service) and [US-007](US-007-app-shell-tabs-empty-state.md) (Tab Store).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - `internal/recents/service.go` in Go backend.
  - Recent files list display in Empty State and File Menu.
  - Startup tab restoration logic in `frontend/src/app/App.tsx`.
- **Explicit Exclusions:**
  - Caching rendered HTML or document body in recent metadata.

---

## 5. Observable Acceptance Criteria

1. Opening a file appends its normalized path to the recent files list at index 0.
2. Reopening the same file updates its timestamp and moves it to index 0 without duplicating.
3. The list never exceeds 20 items (oldest entry drops off).
4. If a recent file is deleted from disk, the UI displays a disabled or grayed-out badge ("File missing on disk").
5. Clicking "Clear Recent Files" removes all entries.
6. When `restoreOpenTabs: true`, restarting the app automatically restores tabs open during last session.

---

## 6. Implementation Tasks

### Task US-026.1: Implement Go RecentFilesService
- **Task ID:** `US-026.1`
- **Status:** `DONE`
- **Dependencies:** None
- **Completion Criteria:** Manages slice of `RecentFileDTO`, bounded to 20, checks `os.Stat` for existence flag.
- **Verification Command:** `go test -v -run TestRecentFilesList ./internal/recents/...`
- **Expected Observable Result:** Recent files list enforces 20-item bound and deduplicates paths.
- **Evidence to Record:** Recent files test output.
- **Environment Handling:** Standard Go toolchain environment.

### Task US-026.2: Integrate Recent Files in UI
- **Task ID:** `US-026.2`
- **Status:** `DONE`
- **Dependencies:** `US-026.1`
- **Completion Criteria:** Displays clickable list in EmptyState and File menu; includes "Clear Recents" button.
- **Verification Command:** `npm run test:unit -- recent-files-menu`
- **Expected Observable Result:** Recent files menu displays filenames with truncated path tooltips.
- **Evidence to Record:** Component test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-026.3: Implement startup tab restoration logic
- **Task ID:** `US-026.3`
- **Status:** `READY`
- **Dependencies:** `US-026.2`
- **Completion Criteria:** On startup, if enabled, dispatches open requests for persisted open tab paths.
- **Verification Command:** `npm run test:unit -- tab-restore`
- **Expected Observable Result:** Startup restores tabs from previous session if configured in settings.
- **Evidence to Record:** Tab restoration test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-026.4: Write unit tests for recents management
- **Task ID:** `US-026.4`
- **Status:** `DRAFT`
- **Dependencies:** `US-026.3`
- **Completion Criteria:** Go tests verify 20-item bounding, deduplication, and missing-file status.
- **Verification Command:** `go test -v -race ./internal/recents/...`
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Run unit tests: `go test -v -race ./internal/recents/...`.
2. Open 5 files: verify all 5 appear in recents.
3. Delete one file from disk: verify it shows as missing in recents.
4. Enable tab restore, open 2 tabs, quit app, relaunch: verify both tabs reload.

---

## 8. Known Risks and Blockers

- Startup delay if checking `os.Stat` on 20 network-mounted paths. Ensure existence checks are asynchronous or timeout-bounded.

---

## 9. Implementation Notes and Validation Evidence

- **Execution Date:** 2026-10-25
- **Agent ID:** Autonomous Story Runner (Phase 5 / EPIC-007)
- **Changed Files:**
  - `internal/recents/dto.go` (Defined `RecentFileDTO` and `NormalizePath`)
  - `internal/recents/service.go` (Implemented `RecentFilesService` with 20-item bounding, deduplication, `os.Stat` dynamic existence checks, atomic JSON persistence, and corruption recovery)
  - `internal/recents/service_test.go` (Unit test `TestRecentFilesList` testing bounded recents, deduplication, and missing-file detection)
  - `frontend/src/features/recents/types.ts` (Defined `RecentFileItem` interface)
  - `frontend/src/features/recents/recentsStore.ts` (Implemented `RecentsStore` with `InMemoryRecentsAdapter` and `useRecentFiles` React hook)
  - `frontend/src/features/recents/RecentFilesMenu.tsx` (Dropdown menu in header bar with missing badges, tooltips, removal, and clear action)
  - `frontend/src/features/recents/recents.css` (Styles for recents dropdown, menu items, badges, and animations)
  - `frontend/src/features/shell/EmptyState.tsx` & `empty-state.css` (Added missing on disk badges, remove button, and clear recents header action)
  - `frontend/src/features/shell/AppShell.tsx` (Integrated `RecentFilesMenu` in header actions and wired recent files handlers)
  - `frontend/src/App.tsx` (Initialized `recentsStore`, added loaded documents to recents, wired handlers)
  - `frontend/src/features/recents/recent-files-menu.test.tsx` (10 unit tests verifying rendering, interaction, tooltips, missing badge, remove, clear, and store behavior)
- **Terminal Output & Verification Evidence:**

```text
=== Task US-026.1 Verification ===
Command: go test -v -run TestRecentFilesList ./internal/recents/...
=== RUN   TestRecentFilesList
--- PASS: TestRecentFilesList (0.04s)
PASS
ok      markdown-viewer/internal/recents        0.046s

Static Analysis & Linters:
Command: /root/go/bin/golangci-lint run ./internal/recents/... && /root/go/bin/goimports -l ./internal/recents/
Output: 0 issues. Exit Code: 0

=== Task US-026.2 Verification ===
Command: npm run test:unit -- recent-files-menu
 ✓ src/features/recents/recent-files-menu.test.tsx (10 tests) 129ms
   ✓ RecentFilesMenu Component (8)
     ✓ renders Recent Files header button with closed state initially 42ms
     ✓ opens dropdown on click and displays recent files with tooltips 29ms
     ✓ displays "Missing on disk" badge when a file does not exist 9ms
     ✓ calls onSelectFile when an item is clicked and closes menu 12ms
     ✓ calls onRemoveFile when the remove button is clicked without triggering onSelectFile 9ms
     ✓ calls onClearFiles when "Clear All" button is clicked 7ms
     ✓ renders empty message when no recent files are present 5ms
     ✓ closes dropdown when Escape key is pressed 7ms
   ✓ RecentsStore & InMemoryRecentsAdapter (2)
     ✓ deduplicates paths and moves reopened files to index 0 3ms
     ✓ enforces maximum bound and removes items 2ms

Test Files  1 passed (1)
     Tests  10 passed (10)
Exit Code: 0

TypeScript Typecheck:
Command: npx tsc --noEmit
Output: 0 errors. Exit Code: 0
```
