# US-012: Headings, Stable Anchor Generation & Core Fixture Suite

- **Story ID:** `US-012`
- **Parent Epic:** [EPIC-003: CommonMark, GFM & Core Document Rendering](../epics/EPIC-003-commonmark-gfm-rendering.md)
- **Status:** `IN_PROGRESS`
- **Assigned Phase:** Phase 3 (Baseline Markdown Rendering)

---

## 1. Objective and Expected Outcome

Implement stable heading anchor generation and establish the baseline golden fixture suite:
1. Generate deterministic, unique URL-safe slugs for all Markdown headings (`h1`-`h6`).
2. Disambiguate duplicate heading text (e.g. `## Introduction`, `## Introduction-1`).
3. Preserve safe author-defined HTML `id` attributes.
4. Support internal hash link scrolling (e.g., clicking `[See intro](#introduction)` scrolls smoothly to `#introduction`).
5. Create and commit the baseline golden fixture suite (`fixtures/golden/`) covering standard CommonMark, GFM, and code blocks.

---

## 2. Source PRD Requirements

- **FR-RENDER-008:** Headings and anchors (Deterministic unique anchors, TOC alignment).
- **PRD Section 13.2:** Golden fixtures suite baseline.

---

## 3. Dependencies

- **Prerequisites:** [US-009](US-009-commonmark-gfm-pipeline.md) (Core rendering pipeline).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - Slug generation utility in `frontend/src/features/rendering/utils/slugify.ts`.
  - Custom heading components attaching IDs and anchor targets.
  - Golden fixtures: `commonmark-spec.md`, `gfm-extensions.md`, `code-syntax.md`, `local-assets.md`.
- **Explicit Exclusions:**
  - Full Table of Contents UI sidebar (handled in Epic 6, US-021).

---

## 5. Observable Acceptance Criteria

1. Headings receive predictable IDs: `# Getting Started` -> `id="getting-started"`.
2. Duplicate headings receive numbered suffix: second `# Getting Started` -> `id="getting-started-1"`.
3. Unicode headings generate valid percent-encoded or transliterated safe slugs (e.g., `# راهنمای کاربری` -> `id="راهنمای-کاربری"` or safe slug).
4. Clicking internal anchor link `#my-heading` scrolls the document viewport to that heading.
5. Automated test runs golden fixtures through renderer and verifies expected DOM nodes without crashes.

---

## 6. Implementation Tasks

### Task US-012.1: Implement deterministic slug generator
- **Task ID:** `US-012.1`
- **Status:** `DONE`
- **Dependencies:** None
- **Completion Criteria:** Function converts strings to lowercase slugs, removes special chars, tracks occurrences.
- **Verification Command:** `npm run test:unit -- heading-slugs`
- **Expected Observable Result:** Heading slugs generated deterministically; duplicate headings receive numerical suffix.
- **Evidence to Record:** Slug generator test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-012.2: Implement custom Heading components with anchor IDs
- **Task ID:** `US-012.2`
- **Status:** `DONE`
- **Dependencies:** `US-012.1`
- **Completion Criteria:** React components render `h1`-`h6` with attached `id` attributes.
- **Verification Command:** `npm run test:unit -- anchor-scroll`
- **Expected Observable Result:** Anchor link clicks scroll viewport smoothly to matching heading ID.
- **Evidence to Record:** Anchor scrolling test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-012.3: Assemble baseline golden fixture suite
- **Task ID:** `US-012.3`
- **Status:** `DONE`
- **Dependencies:** None
- **Completion Criteria:** Commit fixtures in `fixtures/golden/` with tests validating them.
- **Verification Command:** `npm run test:unit -- golden-headings`
- **Expected Observable Result:** Headings fixture renders accurately across h1 through h6.
- **Evidence to Record:** Golden fixture test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-012.4: Write unit and visual tests for fixtures
- **Task ID:** `US-012.4`
- **Status:** `DRAFT`
- **Dependencies:** `US-012.2`, `US-012.3`
- **Completion Criteria:** Vitest suite verifies all golden fixture elements render properly.
- **Verification Command:** `npm run test:unit -- fixtures`
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Run fixture test suite: `npm run test:unit -- fixtures`.
2. Inspect rendered document: verify each heading tag has a unique `id` matching its text.

---

## 8. Known Risks and Blockers

- Non-Latin script slugification in old browser runtimes. Use standard Unicode-aware regexes.

---

## 9. Implementation Notes and Validation Evidence

### Task US-012.1 Validation Evidence
- **Execution Date:** 2026-10-24
- **Agent ID:** Autonomous Implementation Agent
- **Changed Files:**
  - `frontend/src/features/rendering/utils/slugify.ts`: Deterministic URL-safe slug generator with Unicode \p{L}/\p{N}/\p{M} preservation, author ID sanitizer, recursive node text extractor, and stateful `SlugTracker` for collision/duplicate disambiguation.
  - `frontend/src/features/rendering/heading-slugs.test.ts`: 21 comprehensive unit tests covering ASCII transformations, punctuation/special char handling, Persian/Arabic Unicode slugs, mixed-script slugs, React node text extraction, author-defined IDs, and stateful duplicate suffixing (`# Introduction` -> `introduction`, `introduction-1`, `introduction-2`).
- **Terminal Output & Verification Evidence:**
```text
> markdown-viewer-frontend@0.1.0 test:unit
> vitest run heading-slugs

 RUN  v5.0.5 /home/repos/personal/markdown-go/frontend

 ✓ src/features/rendering/heading-slugs.test.ts (21 tests) 27ms
   ✓ Deterministic Slug Generator (US-012.1) (21)
     ✓ slugify basic transformation (6)
       ✓ converts basic English headings to lowercase hyphenated slugs 11ms
       ✓ collapses multiple whitespace characters and hyphens 1ms
       ✓ removes punctuation and special characters 1ms
       ✓ strips leading and trailing punctuation and hyphens 1ms
       ✓ removes embedded HTML tags before slugifying 1ms
       ✓ handles empty strings and strings with only punctuation with safe fallback 0ms
     ✓ Unicode & Multilingual Support (PRD Section 6.3 & FR-RENDER-008) (3)
       ✓ preserves Persian and Arabic script characters in slug 2ms
       ✓ handles mixed Persian and English headings 0ms
       ✓ handles CJK and European accented characters 1ms
     ✓ extractTextFromNode helper (3)
       ✓ extracts text from strings, numbers, and arrays 1ms
       ✓ extracts text recursively from nested React elements 1ms
       ✓ handles null, undefined, and boolean values gracefully 0ms
     ✓ normalizeAuthorId helper (2)
       ✓ preserves clean author-defined IDs 0ms
       ✓ replaces spaces with hyphens and removes unsafe characters 0ms
     ✓ SlugTracker duplicate disambiguation (7)
       ✓ returns the base slug for the first occurrence 0ms
       ✓ adds numerical suffixes for duplicate headings deterministically 0ms
       ✓ disambiguates independently across different heading texts 0ms
       ✓ avoids collision when heading text already contains a numeric suffix 0ms
       ✓ supports author-provided custom ID with disambiguation 0ms
       ✓ resets state when reset() is called 0ms
       ✓ reports whether an ID exists via has() 0ms

 Test Files  1 passed (1)
      Tests  21 passed (21)
   Duration  1.36s
```

### Task US-012.2 Validation Evidence
- **Execution Date:** 2026-10-24
- **Agent ID:** Autonomous Implementation Agent
- **Changed Files:**
  - `frontend/src/features/rendering/components/Heading.tsx`: Custom `Heading` component rendering `h1`-`h6` with unique deterministic anchor `id`, `data-heading-id`, `data-testid="heading-{level}"`, and `.heading-anchor` links.
  - `frontend/src/features/rendering/MarkdownViewer.tsx`: Integrated `Heading` components for all heading levels, wrapped Markdown tree with `SlugContext.Provider`, and added `onNavigateAnchor` property.
  - `frontend/src/features/rendering/link-router.ts`: Enhanced internal anchor navigation to support URI decoding, element selection by ID or escaped CSS name, and smooth scrolling via `scrollIntoView({ behavior: 'smooth' })`.
  - `frontend/src/features/rendering/markdown.css`: Added styles for `.markdown-heading`, `.heading-anchor`, hover transition, and RTL layout adjustments.
  - `frontend/src/features/rendering/anchor-scroll.test.tsx`: 11 integration tests verifying isolated heading tags, MarkdownViewer deterministic heading IDs, duplicate suffixing, Unicode Persian heading IDs, smooth scroll execution on internal links, suffixed duplicate anchor scrolling, Persian/Arabic anchor scrolling, percent-encoded anchor resolution, and `onNavigateAnchor` delegation.
- **Terminal Output & Verification Evidence:**
```text
> markdown-viewer-frontend@0.1.0 test:unit
> vitest run anchor-scroll

 RUN  v5.0.5 /home/repos/personal/markdown-go/frontend

 ✓ src/features/rendering/anchor-scroll.test.tsx (11 tests) 346ms
   ✓ Custom Headings & Anchor Scrolling (US-012.2) (11)
     ✓ Heading Component Isolated Tests (2)
       ✓ renders heading levels 1 through 6 with corresponding HTML tag and classes 60ms
       ✓ includes a clickable heading-anchor with direct link href 5ms
     ✓ Deterministic ID Assignment & Duplicate Disambiguation in MarkdownViewer (3)
       ✓ assigns unique predictable IDs to headings 127ms
       ✓ disambiguates duplicate heading text with incrementing suffixes 23ms
       ✓ generates valid IDs for Unicode / Persian / Arabic headings 14ms
     ✓ Internal Anchor Link Smooth Scrolling (6)
       ✓ scrolls smoothly to matching heading ID when anchor link is clicked 38ms
       ✓ scrolls to duplicate heading when anchor link references suffixed ID 19ms
       ✓ scrolls to Unicode heading when anchor link contains Persian characters 16ms
       ✓ handles percent-encoded anchor link and scrolls to matching heading 16ms
       ✓ delegates to onNavigateAnchor callback when provided on MarkdownViewer 11ms
       ✓ does not throw or crash when anchor target does not exist in DOM 11ms

 Test Files  1 passed (1)
      Tests  11 passed (11)
   Duration  1.92s
```

### Task US-012.3 Validation Evidence
- **Execution Date:** 2026-10-24
- **Agent ID:** Autonomous Implementation Agent
- **Changed Files:**
  - `fixtures/golden/headings-and-anchors.md`: Canonical golden fixture covering heading levels `h1` through `h6`, duplicate section headings for disambiguation testing, headings with inline markdown formatting, punctuation/symbol filtering, multilingual Unicode headings (Persian, Arabic, German umlauts, Japanese CJK), and in-document anchor navigation links.
  - `fixtures/golden/commonmark-spec.md`: Baseline CommonMark specification golden fixture covering typography, soft/hard breaks, blockquotes (nested), ordered and unordered lists, horizontal rules, and inline links per PRD Section 13.2.
  - `frontend/src/features/rendering/golden-headings.test.tsx`: 7 integration tests validating DOM tags `h1` through `h6`, deterministic IDs, duplicate suffixing (`duplicate-section`, `duplicate-section-1`, `duplicate-section-2`), Unicode preservation, formatted heading text extraction, heading-anchor presence, and internal link scrolling.
- **Terminal Output & Verification Evidence:**
```text
> markdown-viewer-frontend@0.1.0 test:unit
> vitest run golden-headings

 RUN  v5.0.5 /home/repos/personal/markdown-go/frontend

 ✓ src/features/rendering/golden-headings.test.tsx (7 tests) 1094ms
   ✓ Golden Headings Fixture Suite (US-012.3) (7)
     ✓ loads and renders the complete headings and anchors golden fixture 230ms
     ✓ renders all heading levels h1 through h6 with correct tags and deterministic IDs 68ms
     ✓ disambiguates triplicate duplicate headings with incrementing suffixes 336ms
     ✓ preserves Unicode characters across Persian, German, and Japanese headings 134ms
     ✓ extracts plain text from headings containing nested Markdown formatting 112ms
     ✓ attaches heading-anchor direct link to every rendered heading 51ms
     ✓ navigates to duplicate heading targets when clicked from internal links 147ms

 Test Files  1 passed (1)
      Tests  7 passed (7)
   Duration  3.63s
```
