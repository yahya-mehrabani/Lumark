# EPIC-005: Bidirectional Text & Layout Engine (RTL/LTR)

- **Epic ID:** `EPIC-005`
- **Title:** Bidirectional Text & Layout Engine (RTL/LTR)
- **Status:** `IN_PROGRESS`
- **Phase:** Phase 4 (Advanced Rendering & Direction)
- **Target Release:** MVP Multilingual

---

## 1. Objective and Scope

Deliver first-class support for multilingual documentation, specifically Persian and Arabic RTL text mixed with English LTR text:
1. Block-level automatic direction detection using standards-compliant Unicode bidirectional behavior (`dir="auto"` and first strong directional character).
2. Strict support for explicit author markup (`dir="rtl"`, `dir="ltr"`).
3. Support for scoped CSS direction and text alignment properties (`direction: rtl`, `text-align: right`).
4. Proper precedence resolution: Author markup/CSS > Auto-detection > User preference.
5. Strict protection of non-prose elements (code fences, math, Mermaid diagrams) ensuring they default to LTR and avoid bidi layout corruption.
6. Multi-platform regression fixtures for Persian and Arabic text.

---

## 2. Source PRD Requirements

- **FR-DIR-001:** Automatic direction (Block-level strong character detection)
- **FR-DIR-002:** Explicit HTML direction (`dir="rtl|ltr|auto"`)
- **FR-DIR-003:** CSS direction and alignment (Safe inline & scoped class styles)
- **FR-DIR-004:** User default direction (Preferences: Auto, RTL, LTR)
- **FR-DIR-005:** Non-prose direction (Code, Mermaid, math enforced LTR)
- **FR-DIR-006:** Direction regression fixtures (Persian, Arabic, mixed technical text)

---

## 3. Dependencies

- **Preceding Epics:** `EPIC-003` (Markdown pipeline) and `EPIC-004` (Scoped CSS parser).

---

## 4. Major Risks

- WebKitGTK vs WebView2 differences in Unicode bidirectional text shaping and punctuation placement.
- Scoped CSS direction accidentally overriding auto-detection on child blocks.

---

## 5. Exit Criteria

- Persian-first paragraphs render aligned to the right with correct character joining.
- English-first paragraphs render aligned to the left.
- Mixed paragraphs (Persian text with English inline code or links) retain correct reading order and punctuation placement.
- Code blocks inside Persian documents remain strictly LTR.
- RTL regression fixtures pass across all target platform WebViews.

---

## 6. Included User Stories

- [US-017: Unicode Automatic Direction Detection Engine](../stories/US-017-auto-direction-engine.md)
- [US-018: Explicit HTML `dir` & Scoped CSS Direction Precedence](../stories/US-018-explicit-dir-css-precedence.md)
- [US-019: User Direction Preference & Non-Prose Bidi Protection](../stories/US-019-direction-preference-non-prose.md)
- [US-020: RTL/LTR Golden Fixtures & Platform WebView Verification Suite](../stories/US-020-rtl-ltr-fixtures-suite.md)
