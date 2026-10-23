# EPIC-003: CommonMark, GFM & Core Document Rendering

- **Epic ID:** `EPIC-003`
- **Title:** CommonMark, GFM & Core Document Rendering
- **Status:** `DRAFT`
- **Phase:** Phase 3 (Baseline Markdown Rendering)
- **Target Release:** MVP Rendering Core

---

## 1. Objective and Scope

Implement the core Markdown parsing and rendering pipeline in the React frontend:
1. Standard CommonMark syntax and GitHub Flavored Markdown (GFM) extensions (tables, task lists, strikethrough, autolinks).
2. Local syntax highlighting for code fences using Shiki (or approved local highlighter), retaining exact whitespace and Unicode for copy operations.
3. Secure local relative image loading and local Markdown cross-document links.
4. Intercepting external links and delegating them to the operating system's default browser after scheme validation.
5. Deterministic unique heading slugs and baseline golden fixture suites.

---

## 2. Source PRD Requirements

- **FR-RENDER-001:** Common Markdown (Headings, lists, quotes, inline formatting)
- **FR-RENDER-002:** GitHub Flavored Markdown (Tables, task lists, strikethrough, autolinks)
- **FR-RENDER-003:** Code highlighting (Local syntax highlighting, plain text fallback)
- **FR-RENDER-004:** Copy code (Preserve tabs, spaces, newlines, and Unicode)
- **FR-RENDER-008:** Headings and anchors (Deterministic unique slugs)
- **FR-ASSET-001:** Relative local images (Resolved against document path)
- **FR-ASSET-002:** Local Markdown links (Opening target in new/existing tab)
- **FR-ASSET-003:** Other local links (Validated before opening)
- **FR-LINK-001:** External links (HTTP/HTTPS/mailto opened in OS browser)
- **FR-ASSET-004:** Remote resources blocked by default
- **PRD Section 5.4:** Document view formatting and layout constraints

---

## 3. Dependencies

- **Preceding Epic:** `EPIC-002` (Native Document Service & Tab State available).

---

## 4. Major Risks

- Pathological code blocks freezing the frontend UI during syntax highlighting.
- Remote resource leaks if parser fails to block external image URLs.

---

## 5. Exit Criteria

- Standard CommonMark and GFM documents render accurately within readable line-length container.
- Code blocks display language badges and copy button copies exact code text.
- Relative images load correctly without exposing arbitrary filesystem access.
- Clicking external links opens default OS browser without navigating the WebView.
- Core fixture suite passes in automated test runner.

---

## 6. Included User Stories

- [US-009: CommonMark & GitHub Flavored Markdown Rendering Pipeline](../stories/US-009-commonmark-gfm-pipeline.md)
- [US-010: Fenced Code Blocks, Syntax Highlighting & Copy Action](../stories/US-010-code-blocks-highlighting.md)
- [US-011: Local Asset Resolution & Safe Link Handling](../stories/US-011-local-assets-safe-links.md)
- [US-012: Headings, Stable Anchor Generation & Core Fixture Suite](../stories/US-012-headings-anchors-fixtures.md)
