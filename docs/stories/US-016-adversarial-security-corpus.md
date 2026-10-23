# US-016: Adversarial Security Test Corpus & Fault Isolation

- **Story ID:** `US-016`
- **Parent Epic:** [EPIC-004: Advanced Rendering & Security Sanitization](../epics/EPIC-004-advanced-rendering-security.md)
- **Status:** `DRAFT`
- **Assigned Phase:** Phase 4 (Advanced Rendering & Security)

---

## 1. Objective and Expected Outcome

Create and maintain an extensive corpus of adversarial security fixtures and automated security verification tests:
1. Establish `fixtures/security/` containing adversarial payloads targeting XSS, HTML injection, CSS escape, SVG script execution, and protocol smuggling.
2. Build automated tests that assert unsafe behavior is neutralized (e.g., verifying attributes are absent from the DOM, scripts did not fire, links do not execute), not merely that rendering did not crash.
3. Test pathological inputs: 100+ levels of nested blockquotes/lists and oversized single-line inputs to ensure fault isolation without memory exhaustion.

---

## 2. Source PRD Requirements

- **PRD Section 8.1:** Security invariants (P0).
- **PRD Section 8.3:** Sanitization test corpus (Mandatory fixtures).
- **PRD Section 8.4:** Privacy invariants (No telemetry, no remote loading).

---

## 3. Dependencies

- **Prerequisites:** [US-013](US-013-mermaid-offline-rendering.md) and [US-015](US-015-html-css-sanitization.md).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - `fixtures/security/` corpus:
    - `xss-scripts.md` (`<script>`, nested scripts, SVG scripts).
    - `event-handlers.md` (`onerror`, `onload`, `onmouseover`, obfuscated handlers).
    - `protocols.md` (`javascript:`, `data:`, `vbscript:`, mixed-case `JavaScriPt:`).
    - `css-overlays.md` (Fixed positioning, z-index hijacking, chrome targeting).
    - `mermaid-injection.md` (`click` directives, SVG script tags).
    - `deep-nesting-dos.md` (Deeply nested lists, extreme line lengths).
  - Automated runner executing all fixtures through the sanitization pipeline.
- **Explicit Exclusions:**
  - Network-based penetration testing (the app is strictly local-first).

---

## 5. Observable Acceptance Criteria

1. 100% of malicious script tags and event handlers in `fixtures/security/` are stripped before DOM insertion.
2. Injected CSS overlays cannot cover the application titlebar or tab strip.
3. Obfuscated protocol URLs (`java script:`, `data:text/html,...`) are neutralized or blocked upon click.
4. Rendering `deep-nesting-dos.md` finishes within bounded time (< 1s) without throwing a stack overflow exception.
5. All security tests pass in CI.

---

## 6. Implementation Tasks

### Task US-016.1: Author adversarial fixture files
- **Task ID:** `US-016.1`
- **Status:** `DRAFT`
- **Dependencies:** None
- **Completion Criteria:** Commit full set of adversarial fixtures to `fixtures/security/`.
- **Verification Command:** `npm run test:security -- xss-corpus`
- **Expected Observable Result:** Zero scripts, event handlers, or active SVG payloads execute.
- **Evidence to Record:** Security corpus test execution output.
- **Environment Handling:** Node.js / Vitest security test runner.

### Task US-016.2: Implement automated adversarial test runner
- **Task ID:** `US-016.2`
- **Status:** `DRAFT`
- **Dependencies:** `US-016.1`
- **Completion Criteria:** Vitest test suite loads each fixture, renders through pipeline, and queries DOM for forbidden tags/attributes.
- **Verification Command:** `npm run test:security -- dos-corpus`
- **Expected Observable Result:** Deeply nested lists (100+ levels) and oversized attributes handled without stack overflow.
- **Evidence to Record:** DoS test execution output.
- **Environment Handling:** Node.js / Vitest security test runner.

### Task US-016.3: Add fuzzing and pathological nesting checks
- **Task ID:** `US-016.3`
- **Status:** `DRAFT`
- **Dependencies:** `US-016.2`
- **Completion Criteria:** Tests assert parser termination on deeply nested blocks.
- **Verification Command:** `npm run test:security`
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Run security test suite: `npm run test:security`.
2. Verify all adversarial test assertions pass.
3. Review console logs to verify no script evaluation warnings or uncaught errors.

---

## 8. Known Risks and Blockers

- Browser DOM parser normalizing certain bypasses in unexpected ways. AST-level sanitization avoids DOM-parser re-interpretation vulnerabilities.

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
