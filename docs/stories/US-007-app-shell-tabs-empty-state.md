# US-007: Frontend Application Shell, Tab State Management & Empty State

- **Story ID:** `US-007`
- **Parent Epic:** [EPIC-002: Core Native Application Lifecycle & Tab Management](../epics/EPIC-002-native-lifecycle-tabs.md)
- **Status:** `DONE` (Frontend application shell, tab state store, TabBar, EmptyState, and comprehensive unit test suite verified with 34 passing tests)
- **Assigned Phase:** Phase 2 (Core Application Structure)

---

## 1. Objective and Expected Outcome

Build the React frontend application shell, tab navigation system, and empty state:
1. Application shell layout containing menu bar, tab strip, document viewport container, and status bar.
2. Tab management: open, switch, and close tabs; duplicate path prevention (focuses existing tab instead of duplicating).
3. Informative empty state when 0 tabs are open: "Open File" button, drag-and-drop landing target, recent files list, and key shortcut hints.
4. Tab status indicators: show clear error badge if a file is missing or inaccessible on disk.

---

## 2. Source PRD Requirements

- **PRD Section 5.1:** Main window layout and chrome design.
- **PRD Section 5.2:** Empty state clear actions.
- **PRD Section 5.3:** Tabs management and single-tab duplicate prevention.
- **FR-OPEN-001:** Rendering document in tab upon selection.

---

## 3. Dependencies

- **Prerequisites:** [US-005](US-005-native-document-service.md) and [US-006](US-006-lifecycle-cli-single-instance.md).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - `frontend/src/features/shell/` and `frontend/src/features/tabs/`.
  - React state store for tabs (active tab ID, list of open tabs, document metadata).
  - Empty state component.
- **Explicit Exclusions:**
  - Full Markdown rendering pipeline (mock renderer placeholder used until Epic 3).

---

## 5. Observable Acceptance Criteria

1. Launching without files displays the empty state with "Open File" action and shortcut hints.
2. Opening a file creates a tab displaying the filename; closing the tab returns to empty state if it was the last tab.
3. Opening an already-open file focuses the existing tab without reloading or altering tab order.
4. Closing a tab frees its in-memory document state.
5. Inaccessible or missing files display a distinct error status badge on the tab without crashing the app.

---

## 6. Implementation Tasks

### Task US-007.1: Implement TabStateStore in React
- **Task ID:** `US-007.1`
- **Status:** `DONE`
- **Dependencies:** None
- **Completion Criteria:** Store handles `openTab`, `closeTab`, `switchTab`, and `focusExistingTab`.
- **Verification Command:** `npm run test:unit -- tab-store`
- **Expected Observable Result:** Tab state store manages open tabs, active tab index, and tab closing.
- **Evidence to Record:** Vitest unit test pass output.
- **Environment Handling:** Node.js / Vitest jsdom environment.

### Task US-007.2: Create TabBar and TabItem components
- **Task ID:** `US-007.2`
- **Status:** `DONE`
- **Dependencies:** `US-007.1`
- **Completion Criteria:** Accessible tab list with close buttons (`Ctrl/Cmd`+`W`), middle-click to close, and active tab styling.
- **Verification Command:** `npm run test:unit -- tab-bar`
- **Expected Observable Result:** TabBar and TabItem components render tabs and respond to tab clicks.
- **Evidence to Record:** Component test execution output.
- **Environment Handling:** Node.js / Vitest jsdom environment.

### Task US-007.3: Create EmptyState component
- **Task ID:** `US-007.3`
- **Status:** `DONE`
- **Dependencies:** `US-007.1`
- **Completion Criteria:** Renders action buttons, drag-and-drop dropzone, and shortcut cheatsheet.
- **Verification Command:** `npm run test:unit -- empty-state`
- **Expected Observable Result:** EmptyState component renders drag-and-drop zone and recent files entrypoint.
- **Evidence to Record:** Component test execution output.
- **Environment Handling:** Node.js / Vitest jsdom environment.

### Task US-007.4: Write component unit tests
- **Task ID:** `US-007.4`
- **Status:** `DONE`
- **Dependencies:** `US-007.2`, `US-007.3`
- **Completion Criteria:** Vitest + React Testing Library tests pass for tab switching, closing, and empty state.
- **Verification Command:** `npm run test:unit -- shell`
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Run frontend test suite: `npm run test:unit`.
2. Launch app: verify empty state renders when no documents are loaded.
3. Open 3 files: verify 3 tabs render. Close all 3: verify empty state reappears.

---

## 8. Known Risks and Blockers

- Identical filenames in different folders: Tab title must disambiguate with parent folder name if basenames collide.

---

## 9. Implementation Notes and Validation Evidence

- **Execution Date:** 2026-10-24
- **Agent ID:** Autonomous Story Runner
- **Changed Files:**
  - `frontend/package.json`
  - `frontend/package-lock.json`
  - `frontend/vitest.config.ts`
  - `frontend/src/test-setup.ts`
  - `frontend/src/features/tabs/types.ts`
  - `frontend/src/features/tabs/tabUtils.ts`
  - `frontend/src/features/tabs/tabStore.ts`
  - `frontend/src/features/tabs/useTabStore.ts`
  - `frontend/src/features/tabs/tab-store.test.ts`
- **Terminal Output & Verification Evidence:**

### Task US-007.1 Evidence (`npm run test:unit -- tab-store`)
```text
> markdown-viewer-frontend@0.1.0 test:unit
> vitest run tab-store

 RUN  v5.0.5 /home/repos/personal/markdown-go/frontend

 ✓ src/features/tabs/tab-store.test.ts (13 tests) 56ms
   ✓ TabStateStore (US-007.1) (13)
     ✓ initializes with empty state (0 tabs, activeTabId = null) 7ms
     ✓ opens a tab and sets it as active 5ms
     ✓ opens multiple tabs sequentially and updates active tab to the latest opened 1ms
     ✓ prevents duplicate tabs and focuses existing tab without altering order 1ms
     ✓ normalizes paths with backslashes and redundant slashes for duplicate detection 1ms
     ✓ focusExistingTab returns true and focuses tab if present, false otherwise 1ms
     ✓ switches active tab cleanly 1ms
     ✓ closes a tab and focuses adjacent tab 1ms
     ✓ closing the last remaining tab returns to empty state (0 tabs, activeTabId = null) 2ms
     ✓ disambiguates tab display titles when filenames collide across directories 1ms
     ✓ updates tab status badge and error message 1ms
     ✓ closeAllTabs clears all tabs and returns to empty state 1ms
     ✓ integrates with React hook useTabStore 27ms

 Test Files  1 passed (1)
      Tests  13 passed (13)
   Start at  10:32:53
   Duration  1.48s (environment 66%, import 10%, transform 9%, setup 9%, tests 5%, worker 1%)
```
Exit Code: 0 (PASS)

### Task US-007.2 Evidence (`npm run test:unit -- tab-bar`)
```text
> markdown-viewer-frontend@0.1.0 test:unit
> vitest run tab-bar

 RUN  v5.0.5 /home/repos/personal/markdown-go/frontend

 ✓ src/features/tabs/tab-bar.test.tsx (8 tests) 671ms
   ✓ TabBar & TabItem Components (US-007.2) (8)
     ✓ renders nothing when tabs list is empty 114ms
     ✓ renders accessible tab list and tab items with correct roles and aria attributes 284ms
     ✓ calls onSelectTab when a tab is clicked 72ms
     ✓ calls onCloseTab when close button is clicked 39ms
     ✓ closes tab on middle-click (button === 1 auxclick) 32ms
     ✓ displays status badge for missing or error files without crashing 54ms
     ✓ handles keyboard navigation with ArrowRight and ArrowLeft 38ms
     ✓ closes active tab on Ctrl+W keyboard shortcut 6ms

 Test Files  1 passed (1)
      Tests  8 passed (8)
   Start at  10:41:29
   Duration  11.55s (environment 62%, import 11%, transform 11%, tests 10%, setup 6%, worker 1%)
```
Exit Code: 0 (PASS)

### Task US-007.3 Evidence (`npm run test:unit -- empty-state`)
```text
> markdown-viewer-frontend@0.1.0 test:unit
> vitest run empty-state

 RUN  v5.0.5 /home/repos/personal/markdown-go/frontend

 ✓ src/features/shell/empty-state.test.tsx (6 tests) 555ms
   ✓ EmptyState Component (US-007.3) (6)
     ✓ renders title, subtitle, Open File button, and shortcut cheatsheet 339ms
     ✓ triggers onOpenFile when the Open File button is clicked 60ms
     ✓ handles drag-over and drag-leave state transitions on the dropzone 87ms
     ✓ handles file drop and triggers onFileDrop with dropped files 24ms
     ✓ renders recent files list and calls onSelectRecentFile when clicked 28ms
     ✓ displays empty message when no recent files are present 7ms

 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  10:45:14
   Duration  1.79s (environment 40%, tests 37%, import 8%, transform 7%, setup 6%, worker 1%)
```
Exit Code: 0 (PASS)

### Task US-007.4 Evidence (`npm run test:unit -- shell`)
```text
> markdown-viewer-frontend@0.1.0 test:unit
> vitest run shell

 RUN  v5.0.5 /home/repos/personal/markdown-go/frontend

 ✓ src/features/shell/shell.test.tsx (7 tests) 497ms
 ✓ src/features/shell/empty-state.test.tsx (6 tests) 307ms

 Test Files  2 passed (2)
      Tests  13 passed (13)
   Start at  10:50:29
   Duration  3.45s (environment 50%, tests 29%, import 9%, setup 9%, transform 3%, worker 1%)
```
Exit Code: 0 (PASS)

### Full Story US-007 Unit Test Suite (`npm run test:unit`)
```text
> markdown-viewer-frontend@0.1.0 test:unit
> vitest run

 RUN  v5.0.5 /home/repos/personal/markdown-go/frontend

 ✓ src/features/shell/shell.test.tsx (7 tests) 389ms
 ✓ src/features/shell/empty-state.test.tsx (6 tests) 365ms
 ✓ src/features/tabs/tab-bar.test.tsx (8 tests) 450ms
 ✓ src/features/tabs/tab-store.test.ts (13 tests) 48ms

 Test Files  4 passed (4)
      Tests  34 passed (34)
   Start at  10:50:09
   Duration  6.93s (environment 56%, tests 23%, import 10%, setup 8%, transform 2%, worker 1%)
```
Exit Code: 0 (PASS)
