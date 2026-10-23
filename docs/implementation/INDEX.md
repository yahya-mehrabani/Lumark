# Implementation Documentation Index

This directory contains the authoritative planning, tracking, architecture, and governance documentation for `markdown-go`.

---

## 1. Quick Navigation & Reading Order for AI Agents

When entering the repository for the first time, follow this reading order:

1. [AGENTS.md](../../AGENTS.md) — Operating rules, tooling policy, and platform evidence discipline.
2. [docs/implementation/CURRENT-STATE.md](CURRENT-STATE.md) — Current active work item, blockers, and exact next action.
3. [docs/implementation/IMPLEMENTATION-PROTOCOL.md](IMPLEMENTATION-PROTOCOL.md) — 12-step execution lifecycle.
4. [PRD.md](../../PRD.md) — Authoritative product requirements.
5. Active Story in [docs/stories/](../stories/) and Epic in [docs/epics/](../epics/).

---

## 2. Directory Structure and Canonical Deliverables Mapping

### Canonical Deliverables Reconciliation (AUD-006)

| Required PRD Deliverable (PRD §14) | Canonical Document Path | Role & Content |
|---|---|---|
| `docs/decisions/ADR-0001-desktop-stack.md` | [`docs/decisions/ADR-0001-technology-baseline.md`](../decisions/ADR-0001-technology-baseline.md) | Technology baseline evaluation: Wails v3 candidate vs Wails v2 fallback. |
| `docs/markdown-support.md` | [`docs/markdown-support.md`](../markdown-support.md) | Markdown compatibility contract, dialect, pipeline stages, and CSS allowlist. |
| `docs/security.md` | [`docs/security.md`](../security.md) | Security invariants, WebView boundary, adversarial corpus, and privacy rules. |
| `docs/testing.md` | [`docs/testing.md`](../testing.md) (Redirect to [`architecture/TEST-STRATEGY.md`](../architecture/TEST-STRATEGY.md)) | Unit, component, fixture, visual, and platform association test strategy. |
| `docs/packaging.md` | [`docs/packaging.md`](../packaging.md) (Redirect to [`architecture/PLATFORM-SUPPORT.md`](../architecture/PLATFORM-SUPPORT.md)) | OS packaging specifications, association matrix, and installer behavior. |

### Complete Documentation Map

```text
/
├── PRD.md                           # Authoritative Product Requirements Document
├── AGENTS.md                        # Universal agent guidelines, tooling policy, platform rules
├── README.md                        # Project overview & portable navigation links
├── CHANGELOG.md                     # User-visible changes (Keep a Changelog format)
│
└── docs/
    ├── markdown-support.md          # Canonical Markdown compatibility contract (PRD §14)
    ├── security.md                  # Canonical security & privacy specification (PRD §14)
    ├── testing.md                   # Canonical testing strategy redirect (PRD §14)
    ├── packaging.md                 # Canonical packaging specification redirect (PRD §14)
    │
    ├── implementation/              # Implementation management & tracking
    │   ├── INDEX.md                 # This master index & deliverable mapping
    │   ├── ROADMAP.md               # Phased implementation plan with strict gates & risks
    │   ├── BACKLOG.md               # Master backlog index of Epics & Stories
    │   ├── REQUIREMENT-TRACEABILITY.md # Bidirectional traceability matrix
    │   ├── CURRENT-STATE.md         # Active operational snapshot & next actions
    │   ├── WORK-LOG.md              # Append-only chronological work log
    │   ├── IMPLEMENTATION-PROTOCOL.md # 12-step implementation execution protocol
    │   ├── PLANNING-VALIDATION.md   # Final planning review & verification record
    │   ├── INDEPENDENT-PLANNING-AUDIT.md # Preserved independent audit findings (P1)
    │   └── PLANNING-AUDIT-REMEDIATION.md # Comprehensive remediation & revalidation report
    │
    ├── epics/                       # Authoritative Epic definitions (EPIC-001 to EPIC-008)
    │   ├── EPIC-001-feasibility-spike.md
    │   └── ...
    │
    ├── stories/                     # Authoritative User Stories (US-001 to US-032)
    │   ├── US-001-wails-react-skeleton-spike.md
    │   └── ...
    │
    ├── architecture/                # System architecture & technical contracts
    │   ├── OVERVIEW.md              # High-level component architecture & diagram
    │   ├── MODULE-BOUNDARIES.md     # Module boundaries & Go/Frontend RPC contract
    │   ├── TEST-STRATEGY.md         # Verification strategy, fixtures & CI matrix
    │   ├── PLATFORM-SUPPORT.md      # OS support matrix & 10-point association test
    │   └── DEVELOPMENT-TOOLING.md   # Environment inventory, tools, and Linux dependencies
    │
    └── decisions/                   # Architecture Decision Records (ADRs)
        ├── ADR-0001-technology-baseline.md  # Wails v3 candidate vs v2 fallback
        ├── ADR-0001-desktop-stack.md        # Canonical redirect alias
        ├── ADR-0002-single-instance-ipc.md   # Single-instance architecture
        └── ADR-0003-sanitization-css-policy.md # HTML & CSS sanitization policy
```

---

## 3. Work Breakdown Structure Summary

- **Total Epics:** 8
- **Total User Stories:** 32
- **Requirement Traceability:** 60 distinct requirements and supporting obligations (40 Functional, 10 Security, 3 Privacy, 7 Quality & Platform obligations).
- **Current Phase:** Phase 0 (Planning Audit Remediation Complete; Implementation Readiness: **`NOT_READY`** pending baseline decision and platform evidence).
