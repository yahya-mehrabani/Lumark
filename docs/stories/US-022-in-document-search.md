# US-022: In-Document Text Search with Match Highlighting

- **Story ID:** `US-022`
- **Parent Epic:** [EPIC-006: Navigation, Search & User Reading Tools](../epics/EPIC-006-navigation-reading-tools.md)
- **Status:** `IN_PROGRESS`
- **Assigned Phase:** Phase 5 (Reading Experience & Durability)

---

## 1. Objective and Expected Outcome

Implement fast, non-destructive in-document text search:
1. Triggered via shortcut (`Ctrl/Cmd`+`F`), menu item, or toolbar button.
2. Floating search bar with text input, match counter ("Match 3 of 15"), Previous (`Shift+Enter` / `Shift+F3`), Next (`Enter` / `F3`), and Close (`Escape`).
3. Highlights all visible text matches in the document without permanently mutating the DOM or interfering with text copying.
4. Active match is distinguished with a prominent highlight color and scrolled into view.
5. Default to case-insensitive matching; ignore hidden elements and SVG path data.

---

## 2. Source PRD Requirements

- **FR-NAV-002:** Find in document (Next/prev, match count, non-destructive highlights).
- **PRD Section 5.6:** Search UX and keyboard controls.

---

## 3. Dependencies

- **Prerequisites:** [US-009](US-009-commonmark-gfm-pipeline.md) (Core rendering).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - `frontend/src/features/navigation/SearchBar.tsx`.
  - Non-destructive CSS Custom Highlight API or DOM text node range highlighter.
  - Keyboard navigation handlers.
- **Explicit Exclusions:**
  - Multi-file or workspace-wide search across closed files (explicit non-goal for MVP).

---

## 5. Observable Acceptance Criteria

1. Pressing `Ctrl/Cmd`+`F` focuses search bar; typing a query highlights all matching words.
2. Status displays accurate match count (e.g. "1 of 5"); pressing `Enter` cycles through matches.
3. Active match smoothly scrolls into the center of the viewport.
4. Copying text across a highlighted search match copies the original text without injected highlight tags.
5. Pressing `Escape` closes the search bar and removes all highlights immediately.

---

## 6. Implementation Tasks

### Task US-022.1: Implement SearchBar React component
- **Task ID:** `US-022.1`
- **Status:** `DONE`
- **Dependencies:** None
- **Completion Criteria:** Renders input, prev/next buttons, close button, and match counter.
- **Verification Command:** `npm run test:unit -- search-indexer`
- **Expected Observable Result:** Text occurrences located across document nodes with exact character offsets.
- **Evidence to Record:** Search indexer test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-022.2: Implement text node search and highlight engine
- **Task ID:** `US-022.2`
- **Status:** `READY`
- **Dependencies:** `US-022.1`
- **Completion Criteria:** Scans DOM text nodes, computes bounding ranges, applies non-destructive `<mark>` or CSS Highlight API.
- **Verification Command:** `npm run test:unit -- search-navigation`
- **Expected Observable Result:** Next/previous navigation cycles through matches and scrolls active match into view.
- **Evidence to Record:** Search navigation test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-022.3: Wire keyboard shortcuts
- **Task ID:** `US-022.3`
- **Status:** `DRAFT`
- **Dependencies:** `US-022.2`
- **Completion Criteria:** Handles `Ctrl/Cmd+F`, `Enter`, `Shift+Enter`, `F3`, `Escape`.
- **Verification Command:** `npm run test:unit -- search-highlighting`
- **Expected Observable Result:** Matched text wrapped in highlight mark elements without corrupting underlying DOM.
- **Evidence to Record:** Search highlight test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-022.4: Write unit and interaction tests
- **Task ID:** `US-022.4`
- **Status:** `DRAFT`
- **Dependencies:** `US-022.3`
- **Completion Criteria:** Tests assert match count accuracy, cycling, and cleanup on close.
- **Verification Command:** `npm run test:unit -- search`
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Run unit tests: `npm run test:unit -- search`.
2. Open large document: press `Ctrl/Cmd+F`, search for repeated word, verify match count and next/prev cycling.

---

## 8. Known Risks and Blockers

- Performance on large documents (5+ MB). Debounce search input by 150ms and bound maximum highlighted ranges.

---

## 9. Implementation Notes and Validation Evidence

### Task US-022.1 Validation Evidence
- **Execution Date:** 2026-10-25
- **Changed Files:**
  - `frontend/src/features/navigation/types.ts`
  - `frontend/src/features/navigation/searchIndexer.ts`
  - `frontend/src/features/navigation/SearchBar.tsx`
  - `frontend/src/features/navigation/search.css`
  - `frontend/src/features/navigation/index.ts`
  - `frontend/src/features/navigation/search-indexer.test.tsx`
- **Verification Command:** `npm run test:unit -- search-indexer`
- **Terminal Output & Verification Evidence:**
```text
> markdown-viewer-frontend@0.1.0 test:unit
> vitest run search-indexer

 RUN  v5.0.5 /home/repos/personal/markdown-go/frontend

 ✓ src/features/navigation/search-indexer.test.tsx (20 tests) 398ms
   ✓ Search Indexer Unit Tests (US-022.1) (20)
     ✓ escapeRegExp (2)
       ✓ escapes all regular expression metacharacters
       ✓ returns empty string unmodified
     ✓ isIgnoredElement (4)
       ✓ returns true for script, style, noscript, and svg tags
       ✓ returns true for elements contained inside an svg subtree
       ✓ returns true for elements with hidden attribute or aria-hidden="true"
       ✓ returns false for normal visible elements
     ✓ collectSearchableTextNodes (1)
       ✓ collects text nodes from paragraphs, headings, and code blocks while omitting script/style/svg
     ✓ findMatches (8)
       ✓ returns empty array when query or root is empty
       ✓ finds single match with accurate character offsets
       ✓ finds multiple matches in a single text node
       ✓ performs case-insensitive search by default
       ✓ respects caseSensitive option when enabled
       ✓ handles regex special characters safely
       ✓ indexes matches inside code blocks
       ✓ indexes Persian and RTL unicode text matches
     ✓ SearchBar Component Rendering & Interactions (5)
       ✓ returns null when isOpen is false
       ✓ renders input, buttons, and match count when open
       ✓ shows "No matches" and disables navigation when query has 0 matches
       ✓ dispatches Enter, Shift+Enter, F3, and Escape keyboard events
       ✓ toggles case sensitivity button

 Test Files  1 passed (1)
      Tests  20 passed (20)
   Duration  2.21s
```
- **Platform Limitations & Deferred Checks:** Native Windows/macOS execution deferred to post-implementation validation.
