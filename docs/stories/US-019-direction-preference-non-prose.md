# US-019: User Direction Preference & Non-Prose Bidi Protection

- **Story ID:** `US-019`
- **Parent Epic:** [EPIC-005: Bidirectional Text & Layout Engine (RTL/LTR)](../epics/EPIC-005-bidirectional-layout.md)
- **Status:** `DRAFT`
- **Assigned Phase:** Phase 4 (Advanced Rendering & Direction)

---

## 1. Objective and Expected Outcome

Implement user default direction preferences and protect non-prose elements from bidi distortion:
1. Provide a user preference setting with three options: `Auto` (default), `RTL`, and `LTR`.
2. This preference serves as the document fallback only when the document does not supply an explicit author direction or when auto-direction is neutral.
3. Strictly enforce LTR direction on all non-prose elements:
   - Fenced and inline code blocks (`pre`, `code`).
   - Mermaid diagram definitions and rendered diagrams.
   - KaTeX inline and display mathematical formulas.
4. Non-prose elements embedded within RTL paragraphs must retain an isolated LTR sub-context (`dir="ltr"` and `unicode-bidi: isolate`) so syntax and operators are never corrupted.

---

## 2. Source PRD Requirements

- **FR-DIR-004:** User default direction (Auto, RTL, LTR).
- **FR-DIR-005:** Non-prose direction (Code, Mermaid, math enforced LTR).

---

## 3. Dependencies

- **Prerequisites:** [US-017](US-017-auto-direction-engine.md) and [US-018](US-018-explicit-dir-css-precedence.md).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - Preferences hook in direction resolver.
  - Hardcoded LTR wrapper on `pre`, `code`, `mermaid-container`, and `katex-container`.
- **Explicit Exclusions:**
  - Persisting settings to disk (handled in Epic 7, US-025).

---

## 5. Observable Acceptance Criteria

1. Setting user preference to "RTL" causes a document without explicit direction to align all neutral blocks to the right.
2. Setting user preference to "LTR" causes neutral blocks to align to the left.
3. In all preference modes, code fences ````go ... ```` remain strictly left-aligned with LTR punctuation and indentation intact.
4. Mathematical formulas inside an RTL paragraph (e.g. `فرمول $f(x) = a x + b$ مهم است.`) render the equation LTR from left to right without reversing characters.
5. Mermaid diagrams inside an RTL document remain rendered LTR without node or arrow reversal.

---

## 6. Implementation Tasks

### Task US-019.1: Enforce LTR on non-prose AST nodes
- **Task ID:** `US-019.1`
- **Status:** `DRAFT`
- **Dependencies:** None
- **Completion Criteria:** Remark/rehype plugins explicitly assign `dir="ltr"` to `code`, `pre`, math, and diagram nodes.
- **Verification Command:** `npm run test:unit -- non-prose-ltr`
- **Expected Observable Result:** Code blocks, math formulas, and Mermaid diagrams strictly enforced to LTR.
- **Evidence to Record:** Non-prose isolation test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-019.2: Connect user direction preference to DirectionResolver
- **Task ID:** `US-019.2`
- **Status:** `DRAFT`
- **Dependencies:** `US-019.1`
- **Completion Criteria:** Resolver queries active user preference when evaluating un-annotated blocks.
- **Verification Command:** `npm run test:unit -- default-direction-setting`
- **Expected Observable Result:** User preference for default document direction applied to unclassified blocks.
- **Evidence to Record:** Default direction test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-019.3: Write unit tests for non-prose bidi isolation
- **Task ID:** `US-019.3`
- **Status:** `DRAFT`
- **Dependencies:** `US-019.2`
- **Completion Criteria:** Tests assert code blocks in RTL paragraphs retain `dir="ltr"` and pristine whitespace.
- **Verification Command:** `npm run test:unit -- non-prose-bidi`
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Run unit tests: `npm run test:unit -- non-prose-bidi`.
2. Open fixture `mixed-bidi-tech.md`: inspect code block inside Persian section; verify code alignment is left-to-right.

---

## 8. Known Risks and Blockers

- Parent RTL styles causing code block line-number or indentation inversion in some CSS engines. Mitigated by explicit `direction: ltr !important; text-align: left !important;` on `.code-container`.

---

## 9. Implementation Notes and Validation Evidence

*(To be filled by implementation agent during execution)*
- **Execution Date:** Not yet executed
- **Agent ID:** N/A
- **Changed Files:** None
- **Terminal Output & Verification Evidence:**
```text
(Awaiting execution in Phase 4)
```
