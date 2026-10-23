# US-009: CommonMark & GitHub Flavored Markdown Rendering Pipeline

- **Story ID:** `US-009`
- **Parent Epic:** [EPIC-003: CommonMark, GFM & Core Document Rendering](../epics/EPIC-003-commonmark-gfm-rendering.md)
- **Status:** `DRAFT`
- **Assigned Phase:** Phase 3 (Baseline Markdown Rendering)

---

## 1. Objective and Expected Outcome

Implement the core Markdown rendering pipeline in React using `react-markdown` and `remark-gfm`:
1. Parse standard CommonMark constructs: headings (`h1`-`h6`), paragraphs, blockquotes, ordered/unordered lists, nested lists, thematic breaks, emphasis, strong emphasis, links, and inline code.
2. Support GitHub Flavored Markdown (GFM) extensions: tables with alignment, task lists (checkboxes), strikethrough (`~text~`), and autolinks.
3. Render inside a responsive, typography-optimized `.markdown-content` container with readable maximum line width and horizontal scrolling for wide tables.

---

## 2. Source PRD Requirements

- **FR-RENDER-001:** Common Markdown constructs.
- **FR-RENDER-002:** GitHub Flavored Markdown (Tables, task lists, strikethrough, autolinks).
- **PRD Section 5.4:** Document view (Readable line length, table scrolling).
- **PRD Section 7.1:** Supported content classes.

---

## 3. Dependencies

- **Prerequisites:** [US-007](US-007-app-shell-tabs-empty-state.md) (Tab State Store and Shell).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - `frontend/src/features/rendering/MarkdownViewer.tsx`.
  - CSS styling for typography, tables, blockquotes, and lists (`styles/markdown.css`).
  - Unit tests verifying CommonMark and GFM AST transformations.
- **Explicit Exclusions:**
  - Mermaid diagrams and KaTeX math (handled in Epic 4).
  - Code syntax highlighting (handled in US-010).

---

## 5. Observable Acceptance Criteria

1. GFM tables render with borders, padding, and text alignment matching column specs (`:---`, `:---:`, `---:`). Wide tables scroll horizontally without forcing window resize.
2. Task lists render disabled checkbox inputs (`[ ]`, `[x]`) styled clearly.
3. Strikethrough renders wrapped in `<del>`.
4. Raw URLs (e.g. `https://example.com`) are automatically converted into clickable links.
5. Large documents render within bounded memory and do not execute any Markdown text as code.

---

## 6. Implementation Tasks

### Task US-009.1: Configure react-markdown and remark-gfm pipeline
- **Task ID:** `US-009.1`
- **Status:** `DRAFT`
- **Dependencies:** None
- **Completion Criteria:** Component parses Markdown string and returns React DOM tree.
- **Verification Command:** `npm run test:unit -- commonmark-pipeline`
- **Expected Observable Result:** CommonMark blocks (headings, paragraphs, lists) parse to standard React elements.
- **Evidence to Record:** CommonMark parser test pass output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-009.2: Implement responsive document viewport and typography CSS
- **Task ID:** `US-009.2`
- **Status:** `DRAFT`
- **Dependencies:** `US-009.1`
- **Completion Criteria:** CSS rules enforce max-width (e.g., 850px), system font fallbacks, and table overflow-x auto.
- **Verification Command:** `npm run test:unit -- gfm-pipeline`
- **Expected Observable Result:** GFM tables, strikethrough, autolinks, and task lists parse accurately.
- **Evidence to Record:** GFM parser test pass output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-009.3: Add component tests for CommonMark and GFM constructs
- **Task ID:** `US-009.3`
- **Status:** `DRAFT`
- **Dependencies:** `US-009.2`
- **Completion Criteria:** Tests assert proper HTML elements generated for tables, task lists, and quotes.
- **Verification Command:** `npm run test:unit -- markdown-viewer`
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Run unit test suite: `npm run test:unit -- markdown-viewer`.
2. Open fixture `gfm-extensions.md`: verify table alignment and task checkboxes render.

---

## 8. Known Risks and Blockers

- Very long single lines without spaces causing horizontal overflow. Ensure `overflow-wrap: break-word` is applied.

---

## 9. Implementation Notes and Validation Evidence

*(To be filled by implementation agent during execution)*
- **Execution Date:** Not yet executed
- **Agent ID:** N/A
- **Changed Files:** None
- **Terminal Output & Verification Evidence:**
```text
(Awaiting execution in Phase 3)
```
