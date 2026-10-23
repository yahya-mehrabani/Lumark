# US-023: Document Viewport Controls: Themes, Zoom & Selection

- **Story ID:** `US-023`
- **Parent Epic:** [EPIC-006: Navigation, Search & User Reading Tools](../epics/EPIC-006-navigation-reading-tools.md)
- **Status:** `DRAFT`
- **Assigned Phase:** Phase 5 (Reading Experience & Durability)

---

## 1. Objective and Expected Outcome

Provide complete viewport appearance and accessibility controls:
1. Support Light, Dark, and System theme options.
2. Switching themes instantly updates application chrome, document text, code syntax theme, and Mermaid diagram theme without page reload.
3. System theme dynamically tracks OS dark mode changes via `window.matchMedia('(prefers-color-scheme: dark)')`.
4. Zoom controls: Increase (`Ctrl/Cmd`+`+` or `=`), Decrease (`Ctrl/Cmd`+`-`), and Reset (`Ctrl/Cmd`+`0`). Initial zoom 100%, clamped between 50% and 250%.
5. Native text selection and copy across paragraphs, code blocks, and tables, preserving native right-click context menu (`FR-NAV-005`).

---

## 2. Source PRD Requirements

- **FR-NAV-003:** Zoom (Shortcuts, bounded limits, reset).
- **FR-NAV-004:** Theme (Light, Dark, System theme adaptation).
- **FR-NAV-005:** Copy and selection (Text selection, copy action, native context menu).
- **PRD Section 5.7:** Themes, typography, and zoom UX.

---

## 3. Dependencies

- **Prerequisites:** [US-009](US-009-commonmark-gfm-pipeline.md) (Core rendering), [US-010](US-010-code-blocks-highlighting.md) (Shiki), and [US-013](US-013-mermaid-offline-rendering.md) (Mermaid).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - CSS custom properties (variables) for theme tokens (`--bg-primary`, `--text-primary`, `--border-subtle`, etc.).
  - Zoom scaling applied to document container (`zoom` CSS property or `transform: scale`).
  - Shortcut listener for zoom keybindings.
  - Text selection styles and clipboard copy integration.
- **Explicit Exclusions:**
  - Custom user-authored color themes or theme marketplace (explicit non-goal for MVP).

---

## 5. Observable Acceptance Criteria

1. Selecting Dark theme switches chrome and document to dark background with high-contrast text and dark code syntax.
2. Selecting System theme automatically tracks OS light/dark changes.
3. Pressing `Ctrl/Cmd`+`+` zooms document in increments of 10%; pressing `Ctrl/Cmd`+`0` resets to 100%.
4. Zoom is bounded between 50% and 250% and does not cause layout distortion or scroll loss.
5. Right-clicking selected text brings up native context menu with standard "Copy" action.

---

## 6. Implementation Tasks (AUD-003, AUD-004)

### Task US-023.1: Define CSS theme tokens and dark mode classes
- **Task ID:** `US-023.1`
- **Status:** `DRAFT`
- **Dependencies:** None
- **Completion Criteria:** CSS design tokens defined for light and dark modes with WCAG AA contrast.
- **Verification Command:** `npm run test:unit -- theme-tokens`
- **Expected Observable Result:** Token assertions pass with contrast ratios >= 4.5:1 for body text.
- **Evidence to Record:** Test execution report in Section 8.
- **Environment Handling:** Headless DOM test environment.

### Task US-023.2: Implement ThemeStore and OS media listener
- **Task ID:** `US-023.2`
- **Status:** `DRAFT`
- **Dependencies:** `US-023.1`
- **Completion Criteria:** React store manages theme selection and syncs data-theme attribute on `<html>`.
- **Verification Command:** `npm run test:unit -- theme-store`
- **Expected Observable Result:** Store toggles between light, dark, and system; mock media query updates theme attribute.
- **Evidence to Record:** Store test logs.
- **Environment Handling:** Vitest with jsdom media query mock.

### Task US-023.3: Implement zoom controller and keyboard shortcuts
- **Task ID:** `US-023.3`
- **Status:** `DRAFT`
- **Dependencies:** `US-023.2`
- **Completion Criteria:** Handlers for `Ctrl/Cmd` + `+`, `-`, `0` with scale clamping between 50% and 250%.
- **Verification Command:** `npm run test:unit -- zoom-controller`
- **Expected Observable Result:** Zoom state changes by 10% per step; clamping enforced at 50% and 250%.
- **Evidence to Record:** Test assertion output.
- **Environment Handling:** Standard unit test environment.

### Task US-023.4: Write unit and visual tests for theme and zoom
- **Task ID:** `US-023.4`
- **Status:** `DRAFT`
- **Dependencies:** `US-023.3`
- **Completion Criteria:** Tests assert theme class toggling, diagram theme updates, and zoom value bounds.
- **Verification Command:** `npm run test:unit -- theme-zoom`
- **Expected Observable Result:** 100% test pass on theme and zoom suites.
- **Evidence to Record:** Complete Vitest suite output.
- **Environment Handling:** Standard unit test environment.

### Task US-023.5: Implement native text selection, copy action, and context menu preservation (FR-NAV-005)
- **Task ID:** `US-023.5`
- **Status:** `DRAFT`
- **Dependencies:** `US-023.1`
- **Completion Criteria:** Document text selectable across all elements; context menu event not suppressed on `.markdown-content`; `Ctrl/Cmd+C` copies selected text to system clipboard.
- **Verification Command:** `npm run test:unit -- selection-copy`
- **Expected Observable Result:** Unit tests confirm `contextmenu` event propagation is unblocked, clipboard copy is triggered on shortcut, and plain-text selection is preserved.
- **Evidence to Record:** Vitest execution output and manual right-click verification notes.
- **Environment Handling:** Automated unit tests run in jsdom; interactive context menu checked during Phase 5 UI testing.

---

## 7. Known Risks and Blockers

- Zoom scaling on some WebViews causing blurry fonts. Use CSS font-size scaling or standard CSS `zoom` property where supported.

---

## 8. Implementation Notes and Validation Evidence

*(To be filled by implementation agent during Phase 5 execution)*
- **Execution Date:** Not yet executed
- **Agent ID:** N/A
- **Changed Files:** None
- **Terminal Output & Verification Evidence:**
```text
(Awaiting Phase 5 execution)
```
