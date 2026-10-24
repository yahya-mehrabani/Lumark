# EPIC-004: Advanced Rendering & Security Sanitization

- **Epic ID:** `EPIC-004`
- **Title:** Advanced Rendering & Security Sanitization
- **Status:** `IN_PROGRESS`
- **Phase:** Phase 4 (Advanced Rendering & Security)
- **Target Release:** MVP Advanced

---

## 1. Objective and Scope

Integrate advanced document extensions and enforce strict security invariants on untrusted content:
1. Render Mermaid diagrams offline with strict sandboxing (no user-defined JavaScript callbacks or active links), isolated errors, and SVG sanitization.
2. Render LaTeX math formulas inline and in display mode using locally bundled KaTeX assets.
3. Allow safe raw HTML fragments while stripping scripts, iframes, forms, and event-handler attributes via `rehype-sanitize`.
4. Implement dedicated AST-based CSS parsing and scoping to `.markdown-content`, preventing CSS from escaping the document viewport or altering application chrome.
5. Validate security invariants against an extensive adversarial test corpus.

---

## 2. Source PRD Requirements

- **FR-RENDER-005:** Mermaid diagrams (Local bundle, strict security, SVG sanitization, error isolation)
- **FR-RENDER-006:** LaTeX math (Inline `$`, display `$$`, KaTeX assets, offline)
- **FR-RENDER-007:** Raw HTML fragments (Allowlisted semantic tags and attributes)
- **FR-RENDER-009:** Graceful partial rendering (Extension errors do not break entire doc)
- **PRD Section 7.3:** 10-step rendering pipeline contract
- **PRD Section 7.4:** CSS allowlist baseline and scope containment
- **PRD Section 8:** Security and privacy invariants & sanitization test corpus

---

## 3. Dependencies

- **Preceding Epic:** `EPIC-003` (Core Markdown rendering pipeline established).

---

## 4. Major Risks

- Mermaid rendering vulnerabilities (SVG script injection or DoS via massive diagrams).
- CSS escape bypassing regex-based filters (mitigated by using an AST-based CSS parser as mandated by PRD).

---

## 5. Exit Criteria

- Flowcharts, sequence diagrams, and class diagrams render offline cleanly.
- KaTeX formulas render inline and block without network calls; malformed math shows clear fallback.
- Unsafe HTML tags (`<script>`, `<iframe>`, `onclick`) and unsafe CSS (`@import`, fixed overlays) are neutralized.
- All adversarial security fixtures in `fixtures/security/` pass without script execution.

---

## 6. Included User Stories

- [US-013: Mermaid Diagrams Offline Rendering & Error Isolation](../stories/US-013-mermaid-offline-rendering.md)
- [US-014: LaTeX Math Offline Rendering with KaTeX](../stories/US-014-katex-math-rendering.md)
- [US-015: HTML & CSS Sanitization and Scope Isolation Engine](../stories/US-015-html-css-sanitization.md)
- [US-016: Adversarial Security Test Corpus & Fault Isolation](../stories/US-016-adversarial-security-corpus.md)
