# Testing Strategy (Canonical Redirect)

**Document Status:** Canonical Baseline Specification<br>
**Authority:** Derived from [PRD.md](../PRD.md) Section 13 (Testing Strategy)<br>
**Canonical Path:** `docs/testing.md`<br>

The authoritative, detailed Test Strategy specification is maintained at:
**[Test Strategy Specification](architecture/TEST-STRATEGY.md)**

---

## Quick Summary of Verification Layers

1. **Go Unit Tests:** Path validation, file size enforcement, UTF-8 normalization, settings persistence, single-instance routing.
2. **Frontend Unit & Component Tests:** React component rendering, tab state management, search algorithm, zoom controls, theme switching (Vitest).
3. **Markdown Rendering & Fixture Tests:** Golden fixture suites for CommonMark, GFM, LaTeX math, Mermaid diagrams, and bidirectional text.
4. **Adversarial Security Corpus:** Neutralization tests for XSS, SVG exploits, and CSS injection.
5. **Platform Packaging & Integration Matrix:** 10-point association test matrix per target OS.

For complete test commands, fixture definitions, and CI matrix policies, see [`docs/architecture/TEST-STRATEGY.md`](architecture/TEST-STRATEGY.md).
