# US-010: Fenced Code Blocks, Syntax Highlighting & Copy Action

- **Story ID:** `US-010`
- **Parent Epic:** [EPIC-003: CommonMark, GFM & Core Document Rendering](../epics/EPIC-003-commonmark-gfm-rendering.md)
- **Status:** `DRAFT`
- **Assigned Phase:** Phase 3 (Baseline Markdown Rendering)

---

## 1. Objective and Expected Outcome

Provide syntax highlighting and copy capabilities for fenced code blocks:
1. Syntax-highlight common programming languages (Go, TypeScript, JavaScript, Python, Rust, HTML, CSS, JSON, YAML, Bash, SQL, Markdown) using a locally bundled syntax engine (Shiki preferred).
2. Render unknown languages gracefully as clean plain text with monospaced font.
3. Display a language badge and an accessible "Copy Code" button on hover/focus.
4. Clicking "Copy Code" writes the raw original code to the system clipboard, preserving exact tabs, spaces, newlines, and Unicode characters without highlighter markup.

---

## 2. Source PRD Requirements

- **FR-RENDER-003:** Code highlighting (Local syntax highlighting, plain text fallback, no remote services).
- **FR-RENDER-004:** Copy code (Preserve tabs, spaces, newlines, and Unicode).
- **PRD Section 5.4:** Code blocks visual distinction and horizontal scrolling.

---

## 3. Dependencies

- **Prerequisites:** [US-009](US-009-commonmark-gfm-pipeline.md) (Core rendering pipeline).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - `frontend/src/features/rendering/components/CodeBlock.tsx`.
  - Local bundling of syntax grammars and themes (Light and Dark themes).
  - Clipboard API interaction via `navigator.clipboard.writeText` or Wails clipboard runtime.
- **Explicit Exclusions:**
  - Code editing or line-number mutation.

---

## 5. Observable Acceptance Criteria

1. Code block with ````go ... ```` highlights keywords, strings, and types accurately.
2. Code block with ````unknownlang ... ```` renders in readable monospaced font without errors.
3. Long lines scroll horizontally inside the code block without stretching the window.
4. Clicking "Copy" places exact original code on the clipboard; pasting into a text editor verifies identical tabs, spaces, and Unicode.
5. Copy button provides accessible feedback ("Copied!" tooltip/icon) that automatically dismisses after 2 seconds.

---

## 6. Implementation Tasks

### Task US-010.1: Integrate Shiki with local grammar bundle
- **Task ID:** `US-010.1`
- **Status:** `DRAFT`
- **Dependencies:** None
- **Completion Criteria:** Shiki highlighter initialized locally with offline grammars and dual light/dark themes.
- **Verification Command:** `npm run test:unit -- shiki-highlighter`
- **Expected Observable Result:** Shiki tokens generated for supported languages with offline bundled grammars.
- **Evidence to Record:** Syntax highlighter test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-010.2: Implement CodeBlock React component
- **Task ID:** `US-010.2`
- **Status:** `DRAFT`
- **Dependencies:** `US-010.1`
- **Completion Criteria:** Renders highlighted HTML, language badge, and container with `overflow-x: auto`.
- **Verification Command:** `npm run test:unit -- code-block-component`
- **Expected Observable Result:** CodeBlock component renders line numbers and language badge.
- **Evidence to Record:** CodeBlock component test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-010.3: Implement clipboard copy action and feedback
- **Task ID:** `US-010.3`
- **Status:** `DRAFT`
- **Dependencies:** `US-010.2`
- **Completion Criteria:** Copies raw source text; handles clipboard errors gracefully.
- **Verification Command:** `npm run test:unit -- copy-code`
- **Expected Observable Result:** Copy button copies exact raw code content to clipboard preserving indentation.
- **Evidence to Record:** Clipboard copy test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-010.4: Write unit tests for code rendering and copy
- **Task ID:** `US-010.4`
- **Status:** `DRAFT`
- **Dependencies:** `US-010.3`
- **Completion Criteria:** Tests assert exact text copied and fallback behavior on unknown languages.
- **Verification Command:** `npm run test:unit -- code-block`
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Run unit tests: `npm run test:unit -- code-block`.
2. Open fixture with Go code containing tabs and Unicode: click copy, paste into terminal, check `diff`.

---

## 8. Known Risks and Blockers

- Shiki bundle size if loading all languages upfront. Pre-bundle common languages and lazily load others or use a bounded grammar registry.

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
