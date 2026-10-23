# ADR-0003: HTML & CSS Sanitization and Scope Isolation Strategy

- **Status:** PROPOSED (BASELINE FOR SPIKE & IMPLEMENTATION)
- **Date:** 2026-10-23
- **Deciders:** Security & Frontend Architecture

---

## 1. Context and Problem Statement

The Markdown Viewer renders arbitrary local files, including files downloaded from untrusted internet sources. Markdown allows embedded raw HTML fragments and `<style>` blocks (or inline styles) to support rich layouts and bidirectional formatting (e.g., Persian/Arabic alignment).

Per PRD Section 7 and Section 8:
1. Markdown and HTML must **never** execute arbitrary scripts or call native Go/Wails bindings.
2. Embedded styles must **never** manipulate application chrome, create full-screen clickjacking overlays, or escape the `.markdown-viewport` container.
3. CSS sanitization must **never** rely solely on regular expressions.
4. If a CSS declaration or tag is rejected, safe surrounding text must still render.
5. All fonts, KaTeX styles, and diagram assets must be local—no remote `@import` or `url()` fetching.

---

## 2. Decision

We establish a multi-stage sanitization and scoping pipeline in the frontend rendering layer:

### Stage 1: AST-Based HTML Sanitization (`rehype-sanitize`)
- Use `rehype-sanitize` integrated into the `unified` pipeline.
- Allowlist restricted to semantic elements: `h1`-`h6`, `p`, `div`, `span`, `blockquote`, `ul`, `ol`, `li`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `pre`, `code`, `em`, `strong`, `del`, `hr`, `br`, `img`, `a`, `details`, `summary`, `figure`, `figcaption`, and `<style>` (subject to Stage 2).
- Prohibit: `<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, `<input>`, `<button>`, `<base>`, `<meta>`, and all inline event handlers (`onclick`, `onerror`, etc.).
- Attributes allowed: `dir` (values: `rtl`, `ltr`, `auto`), `lang`, `class`, `id` (slugified and scoped), `title`, `src` (passed through asset resolver), `href` (validated scheme: `http`, `https`, `mailto`, or relative path).

### Stage 2: AST-Based CSS Parser and Scoper
- Embedded `<style>` blocks and inline `style` attributes are processed using an AST-based CSS parser (such as PostCSS or a strict CSS AST walker).
- Every selector in a `<style>` block is prepended with `.markdown-content` to prevent targeting application chrome or tabs.
- Rule Allowlist:
  - Allowed properties: `direction`, `text-align`, `font-family`, `font-size`, `font-weight`, `font-style`, `line-height`, `color`, `background-color`, `border`, `border-*`, `padding`, `padding-*`, `margin`, `margin-*`, `width`, `max-width`.
  - Disallowed properties: `position: fixed` (converted to `absolute` or stripped), `position: sticky`, `z-index` > 10, `behavior`, `-moz-binding`, `expression()`.
  - Stripped at-rules: `@import`, `@font-face`, `@keyframes` (to prevent high-CPU animation DOS), `@media` rules that attempt screen-wide alterations.
  - Stripped values: Any `url(...)` pointing to remote URLs or non-validated protocols.

### Stage 3: Sandboxed DOM Container & Inert Rendering
- Render all content into a root container `<div className="markdown-content">`.
- Set strict Content Security Policy (CSP) in the HTML shell: `default-src 'none'; img-src 'self' data: local-asset:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self';`.

---

## 3. Alternatives Considered

### Alternative A: DOMPurify in the Browser DOM
- *Pros:* Widely tested for web applications.
- *Cons:* Runs on the client DOM after parsing; doesn't natively provide scoped CSS rewrite without extensive hooks; harder to integrate with `react-markdown` AST without extra serialization.
- *Reason for Rejection:* AST-level processing via `rehype-sanitize` + PostCSS prevents unsafe nodes from ever entering the React virtual DOM or browser DOM.

### Alternative B: Disallowing All Raw HTML and CSS
- *Pros:* Maximum simplicity and security.
- *Cons:* Directly breaks PRD requirements `FR-RENDER-007`, `FR-DIR-002`, and `FR-DIR-003` (explicit HTML direction and styled RTL/LTR blocks).
- *Reason for Rejection:* Fails core product requirements for multilingual technical documentation.

---

## 4. Consequences and Verification

- The sanitization pipeline will be validated by an adversarial test corpus (`US-016`) including script injection, malformed HTML/SVG, CSS overlay exploits, and obfuscated protocols.
- Pipeline tests will run in both unit tests (Node/Vitest) and packaged WebView E2E checks.
