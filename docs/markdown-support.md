# Markdown Compatibility Contract

**Document Status:** Canonical Baseline Specification<br>
**Authority:** Derived from [PRD.md](../PRD.md) Section 7 (Markdown Compatibility Contract) and Section 6.2<br>
**Canonical Path:** `docs/markdown-support.md`<br>
**Related Epics:** `EPIC-003`, `EPIC-004`, `EPIC-005`

---

## 1. Supported Content Classes (PRD §7.1)

The Markdown rendering pipeline guarantees support for the following content classes via automated test fixtures:

1. **CommonMark Specification:** Standard block elements (paragraphs, headings h1-h6, blockquotes, ordered and unordered lists, thematic breaks, code blocks) and inline spans (emphasis, strong, code, links, images).
2. **GitHub Flavored Markdown (GFM):** Tables (with alignment), task lists (checkboxes), strikethrough (`~~text~~`), and autolinks (`https://...`).
3. **Fenced Code Blocks & Highlighting:** Syntax highlighting powered by local Shiki (bundled language grammars and light/dark themes), language badge display, copy-to-clipboard button preserving exact whitespace and indentation, and plain-text fallback for unknown language identifiers.
4. **Mermaid Diagrams:** Offline rendering of flowcharts, sequence diagrams, state diagrams, class diagrams, entity-relationship diagrams, and Gantt charts. Rendered through an isolated custom component with disabled script execution and error fallbacks.
5. **LaTeX Mathematics (KaTeX):** Inline math (`$...$`) and display math (`$$...$$`) rendered completely offline with locally bundled KaTeX fonts and CSS. Graceful degradation on unsupported TeX syntax.
6. **Safe HTML Fragments:** Sanitized raw HTML block and inline elements adhering to the strict allowlist defined in Section 3 below.
7. **Bidirectional Layout (RTL / LTR):** Automatic first-strong-character paragraph direction (`dir="auto"`), explicit author-specified HTML `dir` attribute override, and scoped CSS direction classes. Code blocks, mathematical formulas, and Mermaid diagrams are strictly isolated to LTR.
8. **Local Asset & Reference Resolution:** Relative image paths (`./assets/img.png`) and relative Markdown cross-links (`./subfolder/spec.md`) resolved securely against the active document's parent directory.

---

## 2. Explicitly Unsupported and Constrained Content (PRD §7.2)

To maintain absolute system security and rendering determinism:
- **Zero Scripting:** `<script>` tags, inline event handlers (`onclick`, `onerror`, `onload`), `javascript:` URLs, and active DOM execution are stripped unconditionally.
- **Zero Remote Dependencies:** Remote stylesheets (`<link rel="stylesheet">`), CSS `@import`, remote web fonts (`@font-face` pointing to external URLs), remote scripts, and remote iframes are strictly blocked by default.
- **Embedded Web Applications:** No `<iframe>`, `<object>`, `<embed>`, `<form>`, `<base>`, or `<meta http-equiv>` elements.
- **External MathJax:** Unsupported KaTeX commands degrade to styled raw text; no external runtime or CDN math parser is invoked.

---

## 3. Rendering Pipeline Contract (PRD §7.3)

The document rendering sequence executes as a deterministic, ten-stage pipeline:

```text
[1. Native Read (Go DocumentService)]
       │ (Size check <= 20 MiB, read error isolation)
       ▼
[2. UTF-8 Normalization]
       │ (BOM stripped, invalid byte sequences replaced with U+FFFD)
       ▼
[3. Markdown AST Parse]
       │ (react-markdown + remark-gfm parser)
       ▼
[4. Raw HTML Extraction & AST Transformation]
       │ (Extract safe markup if raw HTML enabled by policy)
       ▼
[5. HTML Sanitization]
       │ (rehype-sanitize with strict allowlist)
       ▼
[6. CSS Parsing & Scoping]
       │ (Dedicated CSS parser; strip unsafe at-rules, position:fixed, chrome-targeting selectors)
       ▼
[7. Custom Extension Renderers]
       │ (Custom components for CodeBlock, Mermaid, KaTeX, Image, Link, Heading)
       ▼
[8. Bidirectional Layout Engine]
       │ (Auto-direction calculation; LTR enforcement on non-prose)
       ▼
[9. Local Asset Resolution]
       │ (Relative images resolved via scoped local asset bridge)
       ▼
[10. Viewport DOM Mount & Error Boundary]
         (Render inside .markdown-content viewport; isolate component faults)
```

---

## 4. CSS Allowlist Baseline (PRD §7.4)

Scoped inline styles and embedded stylesheets within `.markdown-content` are filtered through a dedicated AST CSS parser (`ADR-0003`):

### Permitted Declarations
- **Direction & Alignment:** `direction` (`ltr`, `rtl`), `text-align` (`left`, `right`, `center`, `justify`, `start`, `end`).
- **Typography:** `font-weight`, `font-style`, `font-size`, constrained `font-family`, `text-decoration`, `line-height`.
- **Box Model:** `margin`, `padding`, `border`, `color`, `background-color` (restricted to safe color literals, HSL, RGB; no `url()` or external assets).
- **Layout:** Constrained `max-width`, `display` (`inline`, `block`, `inline-block`, `flex`).

### Prohibited Declarations
- `@import`, external `@font-face`, `url(...)`, `expression(...)`, `-moz-binding`, `behavior`.
- `position: fixed`, absolute full-screen positioning, `z-index` escalation targeting application chrome.
- Selectors targeting outside `.markdown-content`.
