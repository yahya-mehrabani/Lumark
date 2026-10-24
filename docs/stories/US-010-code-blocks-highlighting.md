# US-010: Fenced Code Blocks, Syntax Highlighting & Copy Action

- **Story ID:** `US-010`
- **Parent Epic:** [EPIC-003: CommonMark, GFM & Core Document Rendering](../epics/EPIC-003-commonmark-gfm-rendering.md)
- **Status:** `IN_PROGRESS`
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
- **Status:** `DONE`
- **Dependencies:** None
- **Completion Criteria:** Shiki highlighter initialized locally with offline grammars and dual light/dark themes.
- **Verification Command:** `npm run test:unit -- shiki-highlighter`
- **Expected Observable Result:** Shiki tokens generated for supported languages with offline bundled grammars.
- **Evidence to Record:** Syntax highlighter test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-010.2: Implement CodeBlock React component
- **Task ID:** `US-010.2`
- **Status:** `DONE`
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

- **Execution Date:** 2026-10-24
- **Agent ID:** Autonomous Story Runner
- **Task US-010.1 Execution & Verification Evidence:**
  - **Changed Files:**
    - `frontend/package.json`
    - `frontend/package-lock.json`
    - `frontend/src/features/rendering/shiki-highlighter.ts`
    - `frontend/src/features/rendering/shiki-highlighter.test.ts`
  - **Verification Command:** `npm run test:unit -- shiki-highlighter`
  - **Output:**
```text
> markdown-viewer-frontend@0.1.0 test:unit
> vitest run shiki-highlighter

 RUN  v5.0.5 /home/repos/personal/markdown-go/frontend

 ✓ src/features/rendering/shiki-highlighter.test.ts (8 tests) 285ms
   ✓ Shiki Syntax Highlighter Service (US-010.1) (8)
     ✓ initializes highlighter with offline bundled languages and dual themes 6ms
     ✓ normalizes common language names and aliases 1ms
     ✓ verifies language support checks 1ms
     ✓ generates syntax tokens for supported languages with offline bundled grammars 50ms
     ✓ highlights code with dual themes generating both light and dark styles 74ms
     ✓ falls back to clean escaped plain text for unknown languages 1ms
     ✓ falls back to clean escaped plain text when no language is specified 0ms
     ✓ enforces safe size limits to prevent UI freezing (FR-RENDER-003) 1ms

 Test Files  1 passed (1)
      Tests  8 passed (8)
   Start at  14:09:40
   Duration  1.47s
```
  - **Status:** `DONE` (Offline Shiki highlighter initialized with dual `github-light` / `github-dark` themes, offline language grammars, aliases, unknown language fallback, and safe size boundaries).
- **Task US-010.2 Execution & Verification Evidence:**
  - **Changed Files:**
    - `frontend/src/features/rendering/components/CodeBlock.tsx`
    - `frontend/src/features/rendering/components/code-block-component.test.tsx`
    - `frontend/src/features/rendering/MarkdownViewer.tsx`
    - `frontend/src/features/rendering/markdown.css`
  - **Verification Command:** `npm run test:unit -- code-block-component`
  - **Output:**
```text
> markdown-viewer-frontend@0.1.0 test:unit
> vitest run code-block-component

 RUN  v5.0.5 /home/repos/personal/markdown-go/frontend

 ✓ src/features/rendering/components/code-block-component.test.tsx (9 tests) 553ms
   ✓ CodeBlock React Component (US-010.2) (9)
     ✓ renders code block container with overflow-x auto styling 241ms
     ✓ renders language badge for known language 7ms
     ✓ renders language badge for unknown language gracefully 18ms
     ✓ renders default TEXT badge when no language is specified 10ms
     ✓ renders line numbers matching code line count 215ms
     ✓ omits line numbers when showLineNumbers is false 14ms
     ✓ renders syntax highlighted HTML asynchronously for supported language 23ms
     ✓ falls back to readable plain text without error for unknown language 5ms
     ✓ renders accessible copy code button in header 11ms

 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  14:16:41
   Duration  2.04s
```
  - **Status:** `DONE` (CodeBlock React component renders highlighted HTML, uppercase language badge, line numbers column, horizontal scroll container with `overflow-x: auto`, and accessible copy button header; integrated into MarkdownViewer).
