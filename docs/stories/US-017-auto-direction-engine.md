# US-017: Unicode Automatic Direction Detection Engine

- **Story ID:** `US-017`
- **Parent Epic:** [EPIC-005: Bidirectional Text & Layout Engine (RTL/LTR)](../epics/EPIC-005-bidirectional-layout.md)
- **Status:** `IN_PROGRESS`
- **Assigned Phase:** Phase 4 (Advanced Rendering & Direction)

---

## 1. Objective and Expected Outcome

Implement block-level automatic text direction detection based on standard Unicode bidirectional rules:
1. Automatically determine direction (`rtl` or `ltr`) for textual blocks (paragraphs, headings, list items, blockquotes, table cells, captions).
2. Use standard HTML `dir="auto"` behavior or Unicode first strong directional character algorithm:
   - Paragraphs starting with Persian/Arabic characters resolve to RTL.
   - Paragraphs starting with Latin characters resolve to LTR.
   - Leading neutral characters (digits, punctuation, spaces, emojis) are skipped until the first strong directional character.
3. Allow adjacent blocks in the same document to have different directions independently.
4. Ensure punctuation (periods, parentheses, brackets, colons) in mixed-language sentences does not unpredictably jump to the wrong end of the line.

---

## 2. Source PRD Requirements

- **FR-DIR-001:** Automatic direction (Standards-compliant HTML bidi behavior, first strong character).
- **PRD Section 2.3:** Invariant 5 (RTL is a core feature).

---

## 3. Dependencies

- **Prerequisites:** [US-009](US-009-commonmark-gfm-pipeline.md) (Core rendering pipeline).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - `frontend/src/features/direction/autoDirection.ts`.
  - Attaching `dir="auto"` or calculated direction to block elements in the Markdown AST.
  - CSS bidirectional text isolation (`unicode-bidi: isolate`).
- **Explicit Exclusions:**
  - Code blocks and formulas (handled in US-019).

---

## 5. Observable Acceptance Criteria

1. A paragraph starting with Persian text (`این یک متن آزمایشی است.`) renders with `dir="rtl"`, right-aligned, with the trailing period placed on the left.
2. A paragraph starting with English text (`This is a test document.`) renders with `dir="ltr"`, left-aligned.
3. A block starting with `123. فارسی` resolves to RTL based on the first strong character (`ف`).
4. In a Persian sentence containing an English word (`از ابزار Docker استفاده کنید.`), "Docker" remains LTR while the overall sentence flows RTL and the period remains on the far left.
5. Adjacent paragraphs with differing languages alternate direction cleanly without bleeding into each other.

---

## 6. Implementation Tasks

### Task US-017.1: Implement Unicode first strong character detector
- **Task ID:** `US-017.1`
- **Status:** `DONE`
- **Dependencies:** None
- **Completion Criteria:** Tests accurately classify strings with leading punctuation, emojis, and numbers.
- **Verification Command:** `npm run test:unit -- first-strong-char`
- **Expected Observable Result:** Paragraphs beginning with Arabic/Persian characters assigned dir='rtl'; Latin assigned 'ltr'.
- **Evidence to Record:** Bidi unit test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-017.2: Apply block-level direction in Markdown AST
- **Task ID:** `US-017.2`
- **Status:** `DONE`
- **Dependencies:** `US-017.1`
- **Completion Criteria:** Remark/rehype plugin attaches `dir` attribute to `p`, `h1`-`h6`, `li`, `blockquote`, `td`, `th`.
- **Verification Command:** `npm run test:unit -- auto-direction-dom`
- **Expected Observable Result:** Block elements receive dir='auto' attribute.
- **Evidence to Record:** DOM test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-017.3: Configure CSS bidi rules
- **Task ID:** `US-017.3`
- **Status:** `DONE`
- **Dependencies:** `US-017.2`
- **Completion Criteria:** Applies `unicode-bidi: isolate;` to avoid cross-element bidi interference.
- **Verification Command:** `npm run test:unit -- mixed-paragraphs`
- **Expected Observable Result:** Multi-paragraph mixed Persian/English document sets direction independently per paragraph.
- **Evidence to Record:** Mixed text test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-017.4: Write unit tests for bidi resolution
- **Task ID:** `US-017.4`
- **Status:** `READY`
- **Dependencies:** `US-017.3`
- **Completion Criteria:** Tests verify direction calculation across 20+ multilingual test cases.
- **Verification Command:** `npm run test:unit -- auto-direction`
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Run unit tests: `npm run test:unit -- auto-direction`.
2. Open fixture `mixed-bidi-tech.md`: verify Persian and English paragraphs alternate alignment naturally.

---

## 8. Known Risks and Blockers

- Differences in system fonts for Persian shaping. Ensure fallback stack includes `Vazirmatn`, `Tahoma`, `Arial`, system-ui.

---

## 9. Implementation Notes and Validation Evidence

- **Execution Date:** 2026-10-25
- **Agent ID:** Autonomous Implementation Agent
- **Changed Files:**
  - `frontend/src/features/direction/autoDirection.ts`
  - `frontend/src/features/direction/first-strong-char.test.ts`
- **Terminal Output & Verification Evidence:**
  - `npm run test:unit -- first-strong-char`:
```text
 ✓ src/features/direction/first-strong-char.test.ts (17 tests) 20ms
   ✓ Unicode First Strong Character Detector (US-017.1 / FR-DIR-001) (17)
     ✓ Basic Script Detection (4)
       ✓ accurately identifies Persian / Arabic text as RTL 8ms
       ✓ accurately identifies Latin text as LTR 1ms
       ✓ accurately identifies Hebrew text as RTL 0ms
       ✓ accurately identifies other LTR scripts (Cyrillic, Greek, CJK) 1ms
     ✓ Leading Neutral and Weak Character Handling (5)
       ✓ skips leading ASCII digits and dots to find first strong character (AC 3) 1ms
       ✓ skips leading Persian / Arabic-Indic digits to find first strong character 0ms
       ✓ skips leading punctuation (periods, brackets, quotes, dashes, markdown hashes) 1ms
       ✓ skips leading emojis and symbols 1ms
       ✓ skips leading whitespace, tabs, and newlines 1ms
     ✓ Mixed Language Paragraphs (AC 4) (2)
       ✓ resolves Persian-first sentence with English technical terms to RTL 0ms
       ✓ resolves English-first sentence with Persian terms to LTR 0ms
     ✓ HTML Tag Handling (2)
       ✓ skips leading HTML tags when detecting direction 0ms
       ✓ can strip HTML tags cleanly using stripHtmlTags 0ms
     ✓ Neutral-Only and Empty Strings Fallback (4)
       ✓ returns null by default when no strong characters are present 0ms
       ✓ respects custom fallback when provided 0ms
       ✓ getTextDirection returns fallback direction (default ltr) when no strong character 0ms
       ✓ isRtlText helper returns true only for RTL strong text 0ms

 Test Files  1 passed (1)
      Tests  17 passed (17)
   Start at  08:02:38
   Duration  1.19s
```
  - `npx tsc --noEmit`: Exit code 0 (clean).
  - `npm run test:unit -- auto-direction-dom`:
```text
 ✓ src/features/direction/auto-direction-dom.test.tsx (10 tests) 170ms
   ✓ Block-Level Direction in Markdown AST & DOM (US-017.2 / FR-DIR-001) (10)
     ✓ Rehype Plugin Unit Tests (4)
       ✓ applies dir="auto" to target block tags in HAST tree 6ms
       ✓ preserves author explicit dir="rtl" and dir="ltr" attributes (FR-DIR-002) 1ms
       ✓ does not attach dir="auto" to non-target tags (span, strong, code, a, div) 1ms
       ✓ covers all standard block tags in DEFAULT_AUTO_DIR_TAGS 1ms
     ✓ MarkdownViewer End-to-End DOM Rendering Integration (6)
       ✓ renders paragraphs with dir="auto" attribute in DOM 73ms
       ✓ renders all headings (h1 through h6) with dir="auto" attribute 31ms
       ✓ renders list items with dir="auto" attribute 13ms
       ✓ renders blockquotes with dir="auto" attribute 8ms
       ✓ renders table headers and cells with dir="auto" attribute 20ms
       ✓ preserves raw HTML explicit dir attribute in MarkdownViewer 12ms

 Test Files  1 passed (1)
      Tests  10 passed (10)
   Start at  08:08:14
   Duration  2.32s
  - `npm run test:unit -- markdown-viewer`: 6/6 tests passing (regression-free).
  - `npm run test:unit -- mixed-paragraphs`:
```text
 ✓ src/features/direction/mixed-paragraphs.test.tsx (8 tests) 157ms
   ✓ CSS Bidi Rules & Mixed-Paragraph Direction Independence (US-017.3 / FR-DIR-001) (8)
     ✓ CSS Bidi Rules & Font Stack Verification (4)
       ✓ applies unicode-bidi: isolate to block elements to prevent cross-element bidi bleeding (AC 5) 4ms
       ✓ includes Persian font fallbacks (Vazirmatn, Tahoma) in typography font-family stack 1ms
       ✓ configures text alignment and layout rules for RTL and LTR elements 1ms
       ✓ configures RTL-specific blockquote borders and list padding 1ms
     ✓ Multi-Paragraph Mixed Persian/English Independence (4)
       ✓ sets direction independently per paragraph in mixed-language document (AC 1, AC 2, AC 5) 82ms
       ✓ preserves punctuation positioning at the correct end of lines in mixed sentences (AC 1, AC 4) 11ms
       ✓ renders mixed headings, lists, and blockquotes with independent auto direction 40ms
       ✓ respects explicit author dir attributes alongside auto-detected blocks 12ms

 Test Files  1 passed (1)
      Tests  8 passed (8)
   Start at  08:12:58
   Duration  2.32s
```
