# EPIC-006: Navigation, Search & User Reading Tools

- **Epic ID:** `EPIC-006`
- **Title:** Navigation, Search & User Reading Tools
- **Status:** `IN_PROGRESS`
- **Phase:** Phase 5 (Reading Experience & Durability)
- **Target Release:** MVP UX

---

## 1. Objective and Scope

Provide the essential reading and navigation tools required for a premium document viewing experience:
1. Interactive Table of Contents (TOC) sidebar derived from `h1`-`h6` headings with click-to-scroll navigation and active heading highlighting.
2. Fast, in-document text search with match count, previous/next cycling, keyboard shortcuts (`Ctrl/Cmd`+`F`, `F3`, `Escape`), and non-destructive highlighting.
3. Viewport controls: Theme selection (Light, Dark, System default), Zoom level adjustment with standard shortcuts, and native text selection.
4. Native WebView print workflow with clean print CSS (hiding app chrome and preserving readable typography).

---

## 2. Source PRD Requirements

- **FR-NAV-001:** Table of contents (Document outline, click-to-scroll, unique anchors)
- **FR-NAV-002:** Find in document (In-doc search, match count, next/prev, non-destructive)
- **FR-NAV-003:** Zoom (Increase, decrease, reset, shortcuts, bounded limits)
- **FR-NAV-004:** Theme (Light, Dark, System theme adapting Mermaid and syntax themes)
- **FR-NAV-005:** Copy and selection (Text selection, copy action, native context menu)
- **FR-NAV-006:** Print (Native print workflow, print-specific CSS rules)
- **PRD Section 5.5 - 5.7:** UX specifications for TOC, Search, and Themes

---

## 3. Dependencies

- **Preceding Epic:** `EPIC-003` (Core document rendering).

---

## 4. Major Risks

- In-document search highlights mutating the rendered DOM and interfering with React virtual DOM reconciliation.
- Linux WebKitGTK print API inconsistencies across desktop environments.

---

## 5. Exit Criteria

- TOC displays heading hierarchy accurately; clicking an item scrolls smoothly to heading.
- Search highlights all matches and scrolls to active match without altering document text.
- Theme switching instantly updates app chrome, Markdown text, code blocks, and diagrams.
- Print dialog opens via native shortcut/menu and outputs readable paginated document.

---

## 6. Included User Stories

- [US-021: Interactive Table of Contents & Heading Navigation](../stories/US-021-table-of-contents.md)
- [US-022: In-Document Text Search with Match Highlighting](../stories/US-022-in-document-search.md)
- [US-023: Document Viewport Controls: Themes, Zoom & Selection](../stories/US-023-theme-zoom-selection.md)
- [US-024: Native WebView Print Workflow & Print Styling](../stories/US-024-print-workflow-styling.md)
