# Independent Planning Audit Report — Markdown Viewer

**Date:** 2026-10-23<br>
**Audit Scope:** Pre-Implementation Planning, Architecture, Backlog & Traceability<br>
**Auditor:** Independent Planning Review<br>
**Initial Verdict:** **NOT READY FOR IMPLEMENTATION**

---

## 1. Executive Summary

An independent planning audit of the Markdown Viewer repository was conducted prior to Phase 1 technical feasibility spike execution. The audit identified eight Priority 1 (P1) findings that prevent safe, unambiguous, and compliant implementation of the application.

Writing application code, initializing packages, or beginning the technical feasibility spike is blocked until all P1 findings are formally remediated and revalidated.

---

## 2. Priority 1 (P1) Audit Findings

### AUD-001: Phase 0 and Phase 1 Exit Criteria Contradict the PRD
- **Severity:** P1 (Governance / Process Invariant)
- **Condition:** Phase 0 and Phase 1 definitions in `docs/implementation/ROADMAP.md`, `docs/implementation/CURRENT-STATE.md`, and `docs/implementation/PLANNING-VALIDATION.md` contradict the authoritative PRD (`PRD.md` Section 14). Specifically:
  1. The PRD specifies for Phase 0: *"Exit criteria: a buildable minimal application and documented confirmed support matrix."* However, planning documents declared Phase 0 "COMPLETE" with *"zero application code written"*.
  2. The PRD specifies for Phase 1: *"Exit criteria: each declared target OS can install, launch and open one associated Markdown file. Do not start advanced rendering before this works."* However, `ROADMAP.md` weakened this gate to *"on Linux (and Windows/macOS where test environments are available)"*.
- **Impact:** Premature phase transition and silent weakening of the mandatory cross-platform gate.

### AUD-002: The Feasibility Spike Can Pass Without Required Platform Evidence
- **Severity:** P1 (Platform / Quality Invariant)
- **Condition:** `docs/epics/EPIC-001-feasibility-spike.md` and stories `US-001` through `US-004` permit the feasibility spike to be declared complete based solely on Linux host evidence, treating Windows and macOS testing as optional templates or future CI tasks.
- **Impact:** PRD Section 1.4 requires cross-platform validation across Windows 10/11 x64, macOS Apple Silicon, and Ubuntu 24.04 LTS x64 before committing to the baseline.

### AUD-003: Traceability Totals and Completeness Claims Are Incorrect
- **Severity:** P1 (Requirement Traceability)
- **Condition:**
  1. `PLANNING-VALIDATION.md` and `REQUIREMENT-TRACEABILITY.md` claim 54/54 (100%) requirement coverage, but the actual table contains 53 rows and conflates 40 functional requirements, 10 security invariants, and 3 non-functional/release items.
  2. `FR-NAV-005` (Native text selection and right-click context menu copy) was semantically misattributed to `US-023.1` (CSS theme tokens and dark mode classes), leaving the actual selection and copy behavior unmapped in tasks.
- **Impact:** Misleading completeness metrics and missing task-level tracking for user-facing selection functionality.

### AUD-004: 78 Tasks Lack Task-Level Verification
- **Severity:** P1 (Quality / Execution Protocol)
- **Condition:** Out of 119 Tasks across 32 User Stories in `docs/stories/`, exactly 78 Tasks omit a task-level verification method or command. Only 41 tasks have an explicit verification field.
- **Impact:** Violates `AGENTS.md` Section 4 ("Writing code alone is NEVER sufficient to mark a Task or Story as DONE. Every Task must have observable verification output recorded").

### AUD-005: Machine-Specific Absolute Links Make Documentation Non-Portable
- **Severity:** P1 (Portability / Tooling)
- **Condition:** Exactly 195 Markdown links across 51 documentation files use machine-specific absolute file URIs (`../../...`).
- **Impact:** Breaks hyperlink navigation for any developer or CI runner outside the originating host environment and filesystem structure.

### AUD-006: Required PRD Deliverables and Actual Canonical Document Paths Are Inconsistent
- **Severity:** P1 (Traceability / Architecture)
- **Condition:** PRD Section 14 Phase 0 mandates specific deliverables (`docs/decisions/ADR-0001-desktop-stack.md`, `docs/markdown-support.md`, `docs/security.md`, `docs/testing.md`, `docs/packaging.md`). The repository created `ADR-0001-technology-baseline.md` and architecture subfolder documents (`docs/architecture/*`) without an explicit mapping table or canonical path reconciliation.
- **Impact:** Inconsistent references across planning artifacts and ambiguity regarding canonical deliverables.

### AUD-007: CURRENT-STATE.md Incorrectly Reports No Blockers
- **Severity:** P1 (Operational Governance)
- **Condition:** `docs/implementation/CURRENT-STATE.md` reports *"Blockers: None currently blocking Phase 1 execution"* despite unresolved platform access constraints (no native Windows host toolchain, no Apple Silicon hardware locally), uninstalled runtime libraries, and pending technology baseline decisions.
- **Impact:** Downstream agents assume readiness to execute implementation commands that cannot succeed in the current environment.

### AUD-008: The First Task Sequence and Verification Criteria Are Ambiguous or Inadequate
- **Severity:** P1 (Execution Protocol)
- **Condition:**
  1. `US-001.1` conflates environment prerequisite verification with toolchain installation and invokes `wails doctor` before Wails CLI installation.
  2. `US-001.2` defines its verification as `ls -la wails.json frontend/vite.config.ts`, which merely checks for the existence of two files rather than validating syntax, dependencies, or build readiness.
- **Impact:** Non-deterministic startup sequence for the very first implementation task.

---

## 3. Remediation Directives

All eight P1 findings must be resolved in documentation prior to any implementation:
1. Reconcile phase entry and exit criteria across PRD, Roadmap, and Current State without weakening platform gates.
2. Formulate explicit, separate platform evidence requirements for Windows, Linux (distinguishing WSL2/WSLg vs native), and macOS.
3. Recalculate requirement totals, distinguish requirement categories, and correct `FR-NAV-005` semantic mapping.
4. Define concrete, observable verification methods, acceptance conditions, and environment failure treatments for all tasks.
5. Convert all 195 `file:///` URIs to repository-relative links and validate target paths.
6. Establish canonical deliverable mappings and resolve ADR-0001 naming discrepancies.
7. Update `CURRENT-STATE.md` with verified facts, real blockers, and eligible next actions.
8. Structure `US-001.1` and `US-001.2` as a deterministic, verifiable prerequisite and initialization sequence.
