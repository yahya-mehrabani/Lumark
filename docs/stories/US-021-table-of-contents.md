# US-021: Interactive Table of Contents & Heading Navigation

- **Story ID:** `US-021`
- **Parent Epic:** [EPIC-006: Navigation, Search & User Reading Tools](../epics/EPIC-006-navigation-reading-tools.md)
- **Status:** `DONE`
- **Assigned Phase:** Phase 5 (Reading Experience & Durability)

---

## 1. Objective and Expected Outcome

Build an interactive document Table of Contents (TOC) sidebar:
1. Extract all visible `h1`-`h6` headings from the rendered document to form a hierarchical outline.
2. Clicking any item in the TOC smoothly scrolls the document viewport to that heading.
3. As the user scrolls through the document, the TOC automatically highlights the currently visible active heading.
4. Exclude sanitized-away or hidden headings from the outline.
5. If a document has zero headings, hide or cleanly disable the TOC toggle.

---

## 2. Source PRD Requirements

- **FR-NAV-001:** Table of contents (Document outline, click-to-scroll, unique anchors).
- **PRD Section 5.5:** Table of contents UX and outline panel.

---

## 3. Dependencies

- **Prerequisites:** [US-012](US-012-headings-anchors-fixtures.md) (Heading IDs and slugs).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - `frontend/src/features/navigation/TableOfContents.tsx`.
  - TOC toggle button in top toolbar/menu.
  - Active heading tracking via `IntersectionObserver`.
- **Explicit Exclusions:**
  - Workspace-wide headings across multiple unopened files.

---

## 5. Observable Acceptance Criteria

1. Opening a document with headings generates a matching tree structure in the TOC panel.
2. Clicking a heading in the TOC scrolls the viewport directly to the selected heading.
3. Scrolling down the document updates the highlighted TOC item to match the current viewport section.
4. Documents with identical heading titles (e.g., multiple `### Example`) link to distinct unique anchors.
5. Documents without headings collapse the TOC sidebar cleanly.

---

## 6. Implementation Tasks

### Task US-021.1: Implement heading extraction hook
- **Task ID:** `US-021.1`
- **Status:** `DONE`
- **Dependencies:** None
- **Completion Criteria:** React hook scans rendered DOM or Markdown AST and returns structured heading array.
- **Verification Command:** `npm run test:unit -- toc-generator`
- **Expected Observable Result:** TOC tree structure generated correctly with proper heading nesting levels.
- **Evidence to Record:** TOC generator test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-021.2: Implement TableOfContents sidebar component
- **Task ID:** `US-021.2`
- **Status:** `DONE`
- **Dependencies:** `US-021.1`
- **Completion Criteria:** Renders nested list with indentation reflecting `h1`-`h6` levels.
- **Verification Command:** `npm run test:unit -- toc-scroll-spy`
- **Expected Observable Result:** Active heading in TOC updates as user scrolls through document.
- **Evidence to Record:** Scroll spy test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-021.3: Implement active heading scroll spy
- **Task ID:** `US-021.3`
- **Status:** `DONE`
- **Dependencies:** `US-021.2`
- **Completion Criteria:** Uses `IntersectionObserver` to track the uppermost visible heading and updates active state.
- **Verification Command:** `npm run test:unit -- toc-sidebar-toggle`
- **Expected Observable Result:** Sidebar toggles open/closed via keyboard shortcut and preserves layout.
- **Evidence to Record:** Component test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-021.4: Write unit tests for TOC component
- **Task ID:** `US-021.4`
- **Status:** `DONE`
- **Dependencies:** `US-021.3`
- **Completion Criteria:** Tests verify tree hierarchy and click handler behavior.
- **Verification Command:** `npm run test:unit -- toc`
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Run unit tests: `npm run test:unit -- toc`.
2. Open large document with 10+ headings: verify TOC sidebar renders, click 5th heading, verify scroll.

---

## 8. Known Risks and Blockers

- Scroll spy jitter when multiple headings are visible simultaneously. Mitigated by rootMargin thresholding.

---

## 9. Implementation Notes and Validation Evidence

### Task US-021.1: Implement heading extraction hook
- **Execution Date:** 2026-10-25
- **Agent ID:** Antigravity Autonomous Runner
- **Status:** `DONE`
- **Changed Files:**
  - `frontend/src/features/navigation/types.ts`
  - `frontend/src/features/navigation/tocGenerator.ts`
  - `frontend/src/features/navigation/useTableOfContents.ts`
  - `frontend/src/features/navigation/toc-generator.test.ts`
- **Verification Command:** `npm run test:unit -- toc-generator`
- **Result:** `PASS` (16/16 tests passing)
- **Terminal Output:**
```text
> markdown-viewer-frontend@0.1.0 test:unit
> vitest run toc-generator

 RUN  v5.0.5 /home/repos/personal/markdown-go/frontend

 ✓ src/features/navigation/toc-generator.test.ts (16 tests) 85ms
   ✓ Heading AST & DOM Extractor (US-021.1) (16)
     ✓ cleanMarkdownHeadingText (1)
       ✓ strips inline markdown styles, links, code, and HTML tags
     ✓ extractHeadingsFromMarkdown (7)
       ✓ extracts h1 through h6 ATX headings with correct levels and IDs
       ✓ ignores headings located inside fenced code blocks
       ✓ disambiguates duplicate headings deterministically matching SlugTracker
       ✓ supports setext-style headings (=== and ---)
       ✓ supports HTML headings with explicit or generated IDs
       ✓ preserves Persian and Arabic scripts in heading IDs and labels
       ✓ returns empty array when markdown is empty or contains zero headings
     ✓ extractHeadingsFromElement (2)
       ✓ extracts headings from rendered DOM while stripping anchor symbols and skipping aria-hidden
       ✓ returns empty array when container is null
     ✓ buildTocTree (4)
       ✓ builds a hierarchical tree from flat heading items
       ✓ handles skipped levels cleanly (e.g., h1 followed by h3)
       ✓ handles documents starting with h2 or multiple root-level headings
       ✓ returns empty array for empty items list
     ✓ useTableOfContents hook (2)
       ✓ returns items, tree, and hasHeadings correctly for provided markdown
       ✓ returns hasHeadings: false when markdown contains no headings

 Test Files  1 passed (1)
      Tests  16 passed (16)
   Duration  1.34s
```

### Task US-021.2: Implement TableOfContents sidebar component
- **Execution Date:** 2026-10-25
- **Agent ID:** Antigravity Autonomous Runner
- **Status:** `DONE`
- **Changed Files:**
  - `frontend/src/features/navigation/TableOfContents.tsx`
  - `frontend/src/features/navigation/toc.css`
  - `frontend/src/features/navigation/toc-scroll-spy.test.tsx`
- **Verification Command:** `npm run test:unit -- toc-scroll-spy`
- **Result:** `PASS` (7/7 tests passing)
- **Terminal Output:**
```text
> markdown-viewer-frontend@0.1.0 test:unit
> vitest run toc-scroll-spy

 RUN  v5.0.5 /home/repos/personal/markdown-go/frontend

 ✓ src/features/navigation/toc-scroll-spy.test.tsx (7 tests) 232ms
   ✓ TableOfContents Sidebar Component (US-021.2) (7)
     ✓ renders a nested outline reflecting h1 through h6 levels
     ✓ smoothly scrolls to target heading element upon clicking a TOC link
     ✓ highlights active heading matching activeId with active class and aria-current="location"
     ✓ displays empty state notice when document has zero headings
     ✓ renders nothing when isOpen is false
     ✓ invokes onClose when the close button is clicked
     ✓ handles Persian and Arabic headings with dir="auto"

 Test Files  1 passed (1)
      Tests  7 passed (7)
   Duration  1.86s
```

### Task US-021.3: Implement active heading scroll spy
- **Execution Date:** 2026-10-25
- **Agent ID:** Antigravity Autonomous Runner
- **Status:** `DONE`
- **Changed Files:**
  - `frontend/src/features/navigation/useScrollSpy.ts`
  - `frontend/src/features/navigation/useTocToggle.ts`
  - `frontend/src/features/navigation/TableOfContents.tsx`
  - `frontend/src/features/navigation/index.ts`
  - `frontend/src/features/navigation/toc-sidebar-toggle.test.tsx`
- **Verification Command:** `npm run test:unit -- toc-sidebar-toggle`
- **Result:** `PASS` (6/6 tests passing)
- **Terminal Output:**
```text
> markdown-viewer-frontend@0.1.0 test:unit
> vitest run toc-sidebar-toggle

 RUN  v5.0.5 /home/repos/personal/markdown-go/frontend

 ✓ src/features/navigation/toc-sidebar-toggle.test.tsx (6 tests) 111ms
   ✓ Active Heading Scroll Spy & Sidebar Toggle (US-021.3) (6)
     ✓ useScrollSpy hook (2)
       ✓ observes heading elements and updates activeId on intersection
       ✓ falls back to the heading directly above viewport when no heading is currently intersecting
     ✓ useTocToggle hook (3)
       ✓ manages open/close state programmatically
       ✓ toggles open/close via Ctrl+L and Cmd+L keyboard shortcuts
       ✓ cleanly disables and forces collapsed state when document has zero headings
     ✓ Component Toggle & Layout Preservation (1)
       ✓ collapses and restores TableOfContents cleanly when isOpen changes

 Test Files  1 passed (1)
      Tests  6 passed (6)
   Duration  1.35s
```

### Task US-021.4: Write unit tests for TOC component
- **Execution Date:** 2026-10-25
- **Agent ID:** Antigravity Autonomous Runner
- **Status:** `DONE`
- **Changed Files:**
  - `frontend/src/features/rendering/MarkdownViewer.tsx`
  - `frontend/src/features/rendering/markdown.css`
  - `frontend/src/features/navigation/toc.test.tsx`
- **Verification Command:** `npm run test:unit -- toc`
- **Result:** `PASS` (36/36 tests passing across all 4 TOC test files)
- **Terminal Output:**
```text
> markdown-viewer-frontend@0.1.0 test:unit
> vitest run toc

 RUN  v5.0.5 /home/repos/personal/markdown-go/frontend

 ✓ src/features/navigation/toc.test.tsx (7 tests) 497ms
   ✓ Table of Contents Acceptance Criteria & Integration Suite (US-021.4) (7)
     ✓ Criterion 1: Opening a document with headings generates a matching tree structure in the TOC panel
     ✓ Criterion 2 & Instruction 2: Large document with 10+ headings renders TOC and scrolls when 5th heading is clicked
     ✓ Criterion 3: Scrolling down updates the highlighted TOC item to match the current viewport section
     ✓ Criterion 4: Documents with identical heading titles link to distinct unique anchors
     ✓ Criterion 5: Documents without headings collapse the TOC sidebar cleanly and disable the toggle
     ✓ Bidirectional Support: Preserves Persian and Arabic script headings in TOC outline and anchors
     ✓ Keyboard Navigation: Toggles outline on Ctrl+L keyboard shortcut
 ✓ src/features/navigation/toc-scroll-spy.test.tsx (7 tests) 265ms
 ✓ src/features/navigation/toc-sidebar-toggle.test.tsx (6 tests) 131ms
 ✓ src/features/navigation/toc-generator.test.ts (16 tests) 327ms

 Test Files  4 passed (4)
      Tests  36 passed (36)
   Duration  9.31s
```
