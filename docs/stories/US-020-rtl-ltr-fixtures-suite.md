# US-020: RTL/LTR Golden Fixtures & Platform WebView Verification Suite

- **Story ID:** `US-020`
- **Parent Epic:** [EPIC-005: Bidirectional Text & Layout Engine (RTL/LTR)](../epics/EPIC-005-bidirectional-layout.md)
- **Status:** `IN_PROGRESS`
- **Assigned Phase:** Phase 4 (Advanced Rendering & Direction)

---

## 1. Objective and Expected Outcome

Create and maintain an extensive bidirectional regression fixture suite in `fixtures/golden/` and verify rendering across target platform WebViews:
1. Cover Persian-only, Arabic-only, and English-only documents.
2. Cover complex mixed-direction technical documents (Persian paragraphs with English headings, code snippets, numbers, dates, formulas, and URLs).
3. Cover nested direction elements (e.g. an LTR blockquote inside an RTL list item).
4. Cover tables with mixed-direction cells and alignment.
5. Cover CSS class-based direction via safe `<style>` tags.
6. Verify layout and character shaping on Linux WebKitGTK and Windows WebView2.

---

## 2. Source PRD Requirements

- **FR-DIR-006:** Direction regression fixtures (Persian, Arabic, English, mixed, nested, CSS class).
- **PRD Section 13.2:** Golden fixtures suite.

---

## 3. Dependencies

- **Prerequisites:** [US-017](US-017-auto-direction-engine.md), [US-018](US-018-explicit-dir-css-precedence.md), and [US-019](US-019-direction-preference-non-prose.md).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - Create fixture files in `fixtures/golden/`:
    - `persian-prose.md`
    - `arabic-prose.md`
    - `mixed-bidi-tech.md`
    - `nested-bidi-lists.md`
    - `bidi-tables.md`
    - `explicit-dir-styling.md`
  - Automated tests asserting proper `dir` and styling on all elements.
- **Explicit Exclusions:**
  - Adding automated UI screenshot diffing in CI unless lightweight tool is available.

---

## 5. Observable Acceptance Criteria

1. Persian fixture renders all paragraphs RTL with proper Arabic/Persian glyph joining.
2. Arabic fixture renders RTL with proper shaping.
3. Mixed technical document displays English code fences LTR, Persian sentences RTL, and inline numbers (e.g. `1405/08/02`) ordered correctly according to bidi rules.
4. Tables with Persian headers align text to right; columns with English numbers align cleanly.
5. All 6 bidi fixtures pass the automated fixture test runner.

---

## 6. Implementation Tasks

### Task US-020.1: Assemble comprehensive bidi fixture files
- **Task ID:** `US-020.1`
- **Status:** `DONE`
- **Dependencies:** None
- **Completion Criteria:** Commit verified Persian, Arabic, and mixed Markdown documents to `fixtures/golden/`.
- **Verification Command:** `npm run test:unit -- bidi-golden-fixtures`
- **Expected Observable Result:** Persian, Arabic, and mixed technical bidi fixtures pass structural rendering checks.
- **Evidence to Record:** Bidi golden fixture test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-020.2: Implement automated bidi fixture test suite
- **Task ID:** `US-020.2`
- **Status:** `DONE`
- **Dependencies:** `US-020.1`
- **Completion Criteria:** Vitest suite verifies computed `dir` and computed text alignment on every fixture block.
- **Verification Command:** `npm run test:unit -- bidi-alignment-precedence`
- **Expected Observable Result:** Alignment precedence tests pass across mixed text, tables, and blockquotes.
- **Evidence to Record:** Bidi precedence test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-020.3: Execute cross-platform verification on target OS WebViews
- **Task ID:** `US-020.3`
- **Status:** `DRAFT`
- **Dependencies:** `US-020.2`
- **Completion Criteria:** Visual and automated verification on Linux WebKitGTK and Windows WebView2.
- **Verification Command:** `npm run test:fixtures -- bidi`
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Run bidi test suite: `npm run test:fixtures -- bidi`.
2. Open `mixed-bidi-tech.md` in running app: visually confirm Persian shaping, correct period/comma placement, and LTR code fences.

---

## 8. Known Risks and Blockers

- Variations in font ligature rendering across Linux desktop environments. Ensure web font or reliable system font fallback is present.

---

## 9. Implementation Notes and Validation Evidence

### Task US-020.1 Verification Evidence
- **Execution Date:** 2026-10-25
- **Agent ID:** Autonomous Implementation Agent
- **Changed Files:**
  - `fixtures/golden/persian-prose.md`
  - `fixtures/golden/arabic-prose.md`
  - `fixtures/golden/mixed-bidi-tech.md`
  - `fixtures/golden/nested-bidi-lists.md`
  - `fixtures/golden/bidi-tables.md`
  - `frontend/src/features/direction/bidi-golden-fixtures.test.tsx`
  - `docs/stories/US-020-rtl-ltr-fixtures-suite.md`
- **Terminal Output & Verification Evidence:**
```text
$ npm run test:unit -- bidi-golden-fixtures

 ✓ src/features/direction/bidi-golden-fixtures.test.tsx (6 tests) 1640ms
   ✓ Bidi Golden Fixtures Suite (US-020.1) (6)
     ✓ 1. persian-prose.md Golden Fixture (1)
       ✓ renders pure Persian prose with correct headings, paragraphs, lists, and quotes 223ms
     ✓ 2. arabic-prose.md Golden Fixture (1)
       ✓ renders pure Arabic prose with diacritics, proper headings, and lists 50ms
     ✓ 3. mixed-bidi-tech.md Golden Fixture (1)
       ✓ renders mixed technical content with LTR code, KaTeX, and Mermaid isolation 1187ms
     ✓ 4. nested-bidi-lists.md Golden Fixture (1)
       ✓ renders complex nested lists and blockquotes with appropriate direction 70ms
     ✓ 5. bidi-tables.md Golden Fixture (1)
       ✓ renders bilingual tables with proper cell alignments and elements 68ms
     ✓ 6. explicit-dir-styling.md Golden Fixture (1)
       ✓ renders explicit HTML dir attributes, scoped CSS, and cascading rules 36ms

 Test Files  1 passed (1)
      Tests  6 passed (6)
   Duration  4.13s

$ npm run test:unit -- src/features/direction
 Test Files  11 passed (11)
      Tests  178 passed (178)
   Duration  29.03s

$ npm run build:dev
✓ built in 1.73s (exit code 0)
```

### Task US-020.2 Verification Evidence
- **Execution Date:** 2026-10-25
- **Agent ID:** Autonomous Implementation Agent
- **Changed Files:**
  - `frontend/src/features/direction/bidi-alignment-precedence.test.tsx`
  - `docs/stories/US-020-rtl-ltr-fixtures-suite.md`
- **Terminal Output & Verification Evidence:**
```text
$ npm run test:unit -- bidi-alignment-precedence

 ✓ src/features/direction/bidi-alignment-precedence.test.tsx (9 tests) 1778ms
   ✓ Bidi Alignment Precedence & Fixture Block Suite (US-020.2) (9)
     ✓ 1. Text Alignment Precedence Rules (AC 4 & FR-DIR-003) (3)
       ✓ applies GFM table column alignment (:---, :---:, ---:) to th and td elements 106ms
       ✓ scoped CSS text-align class overrides default natural alignment 42ms
       ✓ blockquotes in RTL and LTR contexts maintain distinct directional borders and alignment 21ms
     ✓ 2. Comprehensive Computed dir Verification Across All 6 Golden Fixtures (6)
       ✓ verifies computed dir on every block element in persian-prose.md 91ms
       ✓ verifies computed dir on every block element in arabic-prose.md 48ms
       ✓ verifies non-prose LTR isolation across mixed-bidi-tech.md 536ms
       ✓ verifies nested list and item directions in nested-bidi-lists.md 367ms
       ✓ verifies table headers, cells, and alignment indicators in bidi-tables.md 283ms
       ✓ verifies explicit dir, scoped CSS class, and container cascading in explicit-dir-styling.md 211ms

 Test Files  1 passed (1)
      Tests  9 passed (9)
   Duration  4.23s

$ npm run build:dev
✓ built in 1.70s (exit code 0)
```
