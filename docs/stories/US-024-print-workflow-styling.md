# US-024: Native WebView Print Workflow & Print Styling

- **Story ID:** `US-024`
- **Parent Epic:** [EPIC-006: Navigation, Search & User Reading Tools](../epics/EPIC-006-navigation-reading-tools.md)
- **Status:** `IN_PROGRESS`
- **Assigned Phase:** Phase 5 (Reading Experience & Durability)

---

## 1. Objective and Expected Outcome

Provide document printing through the native WebView print pipeline:
1. Triggered via menu command (**File -> Print**) or shortcut (`Ctrl/Cmd`+`P`).
2. Invokes native print dialog via `window.print()` or Wails runtime print binding.
3. Print-specific CSS stylesheet (`@media print`):
   - Hides all application chrome (titlebar, tab bar, TOC, search bar, status bar, scrollbars).
   - Renders document on pure white background with black/dark text regardless of active theme.
   - Prevents page breaks directly after headings (`break-after: avoid`).
   - Ensures code blocks and tables format cleanly with sensible page pagination.
4. If print is unsupported on a specific platform configuration, disable the command gracefully and document the limitation.

---

## 2. Source PRD Requirements

- **FR-NAV-006:** Print (Native print workflow, print CSS rules, platform graceful degradation).

---

## 3. Dependencies

- **Prerequisites:** [US-009](US-009-commonmark-gfm-pipeline.md) (Core rendering) and [US-023](US-023-theme-zoom-selection.md) (Theme tokens).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - Print stylesheet in `frontend/src/styles/print.css`.
  - Print command handler with error detection.
- **Explicit Exclusions:**
  - Direct PDF export or headless PDF generation (explicit P2 non-goal for MVP).

---

## 5. Observable Acceptance Criteria

1. Pressing `Ctrl/Cmd`+`P` invokes native OS print preview dialog.
2. In the print preview, tabs, menu bar, and status bar are completely invisible.
3. Dark theme background is replaced with pure white background in print preview.
4. Headings remain attached to their subsequent paragraphs without orphaned heading breaks.
5. Links render cleanly with URL printed or omitted cleanly based on standard print styling.

---

## 6. Implementation Tasks

### Task US-024.1: Author print media CSS rules
- **Task ID:** `US-024.1`
- **Status:** `DONE`
- **Dependencies:** None
- **Completion Criteria:** CSS rules hide `.app-chrome`, `.tab-bar`, `.search-bar`, and reset document margins.
- **Verification Command:** `npm run test:unit -- print-css`
- **Expected Observable Result:** Print stylesheet hides application tabs, sidebar, and status bar.
- **Evidence to Record:** Print CSS unit test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-024.2: Implement Print command dispatcher
- **Task ID:** `US-024.2`
- **Status:** `DRAFT`
- **Dependencies:** `US-024.1`
- **Completion Criteria:** Binds `Ctrl/Cmd+P` and File menu action to `window.print()`.
- **Verification Command:** `npm run test:unit -- print-page-breaks`
- **Expected Observable Result:** Page break rules prevent headings and code blocks from splitting awkwardly.
- **Evidence to Record:** Print page break test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-024.3: Verify print behavior and platform limitations
- **Task ID:** `US-024.3`
- **Status:** `DRAFT`
- **Dependencies:** `US-024.2`
- **Completion Criteria:** Verify print dialog opens on Linux, Windows, and macOS; document any platform caveats.
- **Verification Method:** Manual print preview inspection.
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Open document: press `Ctrl/Cmd+P`.
2. Inspect print preview: confirm all application chrome is hidden and page breaks are clean.

---

## 8. Known Risks and Blockers

- WebKitGTK in headless or minimal container environments may fail `window.print()`. Story must catch exceptions and show a friendly toast.

---

## 9. Implementation Notes and Validation Evidence

- **Execution Date:** 2026-10-25
- **Agent ID:** Antigravity Autonomous Agent
- **Changed Files:**
  - `frontend/src/styles/print.css`
  - `frontend/src/features/viewport/print-css.test.ts`
  - `frontend/src/main.tsx`
  - `frontend/src/features/shell/AppShell.tsx`
  - `frontend/src/features/tabs/TabBar.tsx`
  - `frontend/src/features/rendering/MarkdownViewer.tsx`
  - `frontend/src/features/navigation/TableOfContents.tsx`
  - `frontend/src/features/navigation/SearchBar.tsx`
- **Terminal Output & Verification Evidence:**
```text
$ npm run test:unit -- print-css

> markdown-viewer-frontend@0.1.0 test:unit
> vitest run print-css

 RUN  v5.0.5 /home/repos/personal/markdown-go/frontend

 ✓ src/features/viewport/print-css.test.ts (30 tests) 16ms
   ✓ Print Media CSS Rules & Page Styling (US-024.1, FR-NAV-006) (30)
     ✓ contains @media print block and @page configuration 6ms
     ✓ Application Chrome Hiding (20)
       ✓ hides .app-chrome in @media print with display: none !important 0ms
       ✓ hides .app-header in @media print with display: none !important 0ms
       ✓ hides .header-actions in @media print with display: none !important 0ms
       ✓ hides .tab-bar in @media print with display: none !important 0ms
       ✓ hides .tab-bar-container in @media print with display: none !important 0ms
       ✓ hides .app-status-bar in @media print with display: none !important 0ms
       ✓ hides .document-header-bar in @media print with display: none !important 0ms
       ✓ hides .doc-zoom-controls in @media print with display: none !important 1ms
       ✓ hides .doc-theme-toggle-btn in @media print with display: none !important 0ms
       ✓ hides .doc-search-toggle-btn in @media print with display: none !important 0ms
       ✓ hides .doc-toc-toggle-btn in @media print with display: none !important 0ms
       ✓ hides .search-bar in @media print with display: none !important 0ms
       ✓ hides .search-bar-floating in @media print with display: none !important 0ms
       ✓ hides .toc-sidebar in @media print with display: none !important 0ms
       ✓ hides .toc-backdrop in @media print with display: none !important 0ms
       ✓ hides .copy-code-btn in @media print with display: none !important 0ms
       ✓ hides .dropzone-overlay in @media print with display: none !important 0ms
       ✓ hides .toast in @media print with display: none !important 0ms
       ✓ hides [data-app-chrome] in @media print with display: none !important 0ms
       ✓ enforces display: none !important and visibility: hidden on chrome selectors 0ms
     ✓ Theme and Background Reset to Pure White (3)
       ✓ forces pure white background and dark text on document containers 0ms
       ✓ resets CSS variables on [data-theme="dark"] to print-safe light tokens 0ms
       ✓ eliminates box-shadow and resets borders and overflow 0ms
     ✓ Page Break Rules (2)
       ✓ prevents page breaks after headings to avoid orphaned headers 0ms
       ✓ prevents page breaks inside pre code blocks, tables, images, and diagrams 0ms
     ✓ Document Typography, Table, and Code Formatting (4)
       ✓ formats tables cleanly with borders and full width 0ms
       ✓ formats code blocks with clear background and wrapping 0ms
       ✓ underlines links and renders readable link text 0ms
       ✓ hides scrollbars in print output 0ms

 Test Files  1 passed (1)
      Tests  30 passed (30)
   Start at  13:27:52
   Duration  1.35s
```
