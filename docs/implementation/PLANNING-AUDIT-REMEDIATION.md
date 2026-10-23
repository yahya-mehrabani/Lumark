# Planning Audit Remediation Report — Markdown Viewer

**Date:** 2026-10-23<br>
**Review Type:** Final Audit-ID Integrity & Residual-Finding Correction Pass<br>
**Auditor / Verification Agent:** Antigravity AI Assistant<br>
**Authoritative Input Audit Sources:**
1. [`docs/implementation/INDEPENDENT-PLANNING-AUDIT.md`](INDEPENDENT-PLANNING-AUDIT.md) (Repository source covering AUD-001 through AUD-008)
2. Product Owner Audit Correction Mandate (Authoritative registry restoring AUD-009 through AUD-018)
**Authoritative PRD:** [`PRD.md`](../../PRD.md)<br>
**Final Implementation Readiness Verdict:** **`NOT_READY`** (Blocked on ADR-0001 Baseline Decision & Platform Execution Gates)

---

## 1. Executive Summary

This corrective remediation report restores the integrity of the original audit finding registry (`AUD-001` through `AUD-018`), strictly separating original audit findings from new issues discovered during the remediation process (`REM-001` through `REM-010`). It also provides an explicit, reproducible 88-to-60 requirement crosswalk with row-level traceability, records the execution of repository validators, establishes the canonical status of `ADR-0001`, and reaffirms the strict cross-platform phase gates.

### Repository Source Limitation Disclosure
The persisted repository file [`docs/implementation/INDEPENDENT-PLANNING-AUDIT.md`](INDEPENDENT-PLANNING-AUDIT.md) only documents findings `AUD-001` through `AUD-008`. Findings `AUD-009` through `AUD-018` were communicated directly in the audit correction mandate as the authoritative original finding registry. To prevent historical fabrication, `INDEPENDENT-PLANNING-AUDIT.md` has not been retroactively altered; instead, this report explicitly documents the limitation and comprehensively restores and reassesses all 18 original findings under their authoritative definitions.

### Invariant Compliance
In accordance with `AGENTS.md` and repository constraints:
- `PRD.md` remains strictly unmodified (`git diff PRD.md` is empty).
- Zero lines of application source code, npm dependencies, or build outputs have been generated.
- No test or build verification results have been fabricated or inferred.
- All persisted Markdown documents utilize repository-relative links; zero machine-specific file paths or `file:///` URIs exist in persisted content.
- The overall implementation readiness verdict remains **`NOT_READY`** pending formal Product Owner baseline decision on `ADR-0001` and execution of Phase 1 feasibility gates across declared platforms.

---

## 2. Complete Disposition of All 18 Original Audit Findings (AUD-001 through AUD-018)

| Finding ID | Title & Original Meaning | Severity | Status | Concrete Evidence (Canonical Path & Section/Lines) | Remaining Action & Dependencies | Verdict Impact |
|---|---|---|---|---|---|---|
| **AUD-001** | **Phase 0 and Phase 1 Exit Criteria Contradict the PRD:** Phase 0 claimed completion without code, and Phase 1 weakened mandatory cross-platform exit gates. | P1 | **RESOLVED** | [`docs/implementation/ROADMAP.md`](ROADMAP.md#L41-L69), [`docs/epics/EPIC-001-feasibility-spike.md`](../epics/EPIC-001-feasibility-spike.md#L46-L53), [`docs/implementation/CURRENT-STATE.md`](CURRENT-STATE.md#L10-L18) | None for planning. Runtime execution requires target OS test environments. | Enforces strict Phase 1 cross-platform exit gate. |
| **AUD-002** | **Feasibility Spike Can Pass Without Required Platform Evidence:** Spike permitted declaring completion based solely on Linux host evidence, treating Windows/macOS as optional. | P1 | **RESOLVED** | [`docs/epics/EPIC-001-feasibility-spike.md`](../epics/EPIC-001-feasibility-spike.md#L32-L45), [`docs/stories/US-004-packaging-association-spike.md`](../stories/US-004-packaging-association-spike.md#L56-L115), [`AGENTS.md`](../../AGENTS.md#L135-L155) | Execution requires host Windows tools and macOS Apple Silicon runner. | Enforces `NOT_READY` until multi-platform evidence is collected. |
| **AUD-003** | **Traceability Totals and Completeness Claims Are Incorrect:** Planning claimed 54/54 coverage while table had 53 rows and conflated categories; FR-NAV-005 misattributed. | P1 | **RESOLVED** | [`docs/implementation/REQUIREMENT-TRACEABILITY.md`](REQUIREMENT-TRACEABILITY.md#L7-L107), Section 4.2 of this report ([`PLANNING-AUDIT-REMEDIATION.md#42-granular-crosswalk-matrix-all-88-entries`](PLANNING-AUDIT-REMEDIATION.md#42-granular-crosswalk-matrix-all-88-entries)), [`scripts/reconcile_requirements_crosswalk.py`](../../scripts/reconcile_requirements_crosswalk.py) | None for planning baseline. 60 distinct catalog items categorized with verified structural mapping completeness across all 88 source entries in Section 4.2; bidirectional catalog traceability verified in REQUIREMENT-TRACEABILITY.md; implementation verification remains unverified (0/60 implemented). | None on planning. |
| **AUD-004** | **Tasks Lack Task-Level Verification:** 78 of 119 tasks in `docs/stories/` omitted explicit verification methods or commands. | P1 | **RESOLVED** | All 32 story files in [`docs/stories/`](../stories/); [`scripts/reconcile_tasks.py`](../../scripts/reconcile_tasks.py) | None. All 124 tasks possess complete Method, Result, Evidence, and Environment Handling fields. | None on planning. |
| **AUD-005** | **Machine-Specific Absolute Links Make Documentation Non-Portable:** 195 markdown links used machine-specific `file:///home/...` absolute URIs. | P1 | **RESOLVED** | Repository-wide markdown files; [`scripts/validate_links.py`](../../scripts/validate_links.py) | None. 0 machine-specific links remaining; 349 valid internal relative links. | None. |
| **AUD-006** | **Required PRD Deliverables and Actual Document Paths Inconsistent:** PRD §14 mandated deliverables while repository created mismatched paths. | P1 | **RESOLVED** | [`docs/markdown-support.md`](../markdown-support.md), [`docs/security.md`](../security.md), [`docs/testing.md`](../testing.md), [`docs/packaging.md`](../packaging.md), [`docs/decisions/ADR-0001-desktop-stack.md`](../decisions/ADR-0001-desktop-stack.md), [`docs/implementation/INDEX.md`](INDEX.md#L21-L30) | None. Canonical PRD deliverables established; mapping table published. | None. |
| **AUD-007** | **CURRENT-STATE.md Incorrectly Reports No Blockers:** Current state reported no blockers despite missing Windows tools, macOS hardware, and pending decisions. | P1 | **RESOLVED** | [`docs/implementation/CURRENT-STATE.md`](CURRENT-STATE.md#L43-L60), [`docs/architecture/DEVELOPMENT-TOOLING.md`](../architecture/DEVELOPMENT-TOOLING.md#L1-L70) | Product Owner approval on ADR-0001; installation of GTK4/WebKitGTK 6.0 packages for v3; external test runners. | Directly enforces verdict `NOT_READY`. |
| **AUD-008** | **First Task Sequence and Verification Criteria Ambiguous:** US-001.1 conflated prerequisites with installation; US-001.2 only checked file existence. | P1 | **RESOLVED** | [`docs/stories/US-001-wails-react-skeleton-spike.md`](../stories/US-001-wails-react-skeleton-spike.md#L63-L138) (Tasks `US-001.1` through `US-001.5`) | None for planning. Execution begins when Phase 1 is authorized. | None. |
| **AUD-009** | **Incorrect mapping of FR-NAV-005:** Must trace to text selection and context-menu copy functionality rather than CSS theme tokens. | P1 | **RESOLVED** | [`docs/stories/US-023-theme-zoom-selection.md`](../stories/US-023-theme-zoom-selection.md#L100-L117) (Task `US-023.5`), [`docs/implementation/REQUIREMENT-TRACEABILITY.md`](REQUIREMENT-TRACEABILITY.md#L42,L104), [`scripts/reconcile_requirements_crosswalk.py`](../../scripts/reconcile_requirements_crosswalk.py) | Execution in Phase 5 / US-023 (under EPIC-006: Navigation, Search & User Reading Tools). | None on planning readiness. |
| **AUD-010** | **Partial-render behavior lacks adequate sanitizer failure coverage:** Graceful partial render (FR-RENDER-009) lacks coverage for malformed or rejected HTML/CSS. | P2 | **PARTIALLY RESOLVED** | [`PRD.md`](../../PRD.md#L309-L313), [`docs/stories/US-013-mermaid-offline-rendering.md`](../stories/US-013-mermaid-offline-rendering.md#L68-L76), [`docs/stories/US-014-katex-math-rendering.md`](../stories/US-014-katex-math-rendering.md#L68-L76), [`docs/stories/US-015-html-css-sanitization.md`](../stories/US-015-html-css-sanitization.md#L55,L80-L98) | Execution of Vitest tests in `US-015.4` / `US-016.2` asserting that malformed/rejected HTML/CSS tags render inline fallback / raw text without breaking document render. | Does not block Phase 1; must be verified in Phase 4. |
| **AUD-011** | **Privacy traceability does not adequately verify diagnostics/log exclusions:** Exclude document contents, file history, and credentials with redaction & rotation. | P2 | **PARTIALLY RESOLVED** | [`docs/stories/US-028-fault-isolation-diagnostics.md`](../stories/US-028-fault-isolation-diagnostics.md#L16-L17,L59-L67,L89-L97), [`docs/implementation/REQUIREMENT-TRACEABILITY.md`](REQUIREMENT-TRACEABILITY.md#L67,L75) | Execution of automated log scan in `US-028.4` verifying exclusion of credentials, tokens, document contents, and file history; path sanitization assertions. | Does not block Phase 1; must be verified in Phase 5. |
| **AUD-012** | **macOS `public.plain-text` UTI association may be too broad:** Validate intended scope, defaulting strictly to 4 Markdown extensions unless broader behavior approved. | P2 | **PARTIALLY RESOLVED** | [`PRD.md`](../../PRD.md#L103-L107,L753-L759), [`docs/architecture/PLATFORM-SUPPORT.md`](../architecture/PLATFORM-SUPPORT.md#L67-L71), [`docs/stories/US-030-macos-packaging-associations.md`](../stories/US-030-macos-packaging-associations.md#L14-L17) | Scoped `US-030` and `PLATFORM-SUPPORT.md` to restrict default association strictly to Markdown extensions (`net.daringfireball.markdown`), preventing hijacking of generic `.txt` files. Verification requires macOS runner. | Does not block Phase 1; finalized before Phase 6 packaging. |
| **AUD-013** | **README support claims for macOS may exceed actual support matrix and evidence:** Claims must distinguish target support from verified platform evidence. | P2 | **PARTIALLY RESOLVED** | [`README.md`](../../README.md#L5,L23), [`docs/architecture/PLATFORM-SUPPORT.md`](../architecture/PLATFORM-SUPPORT.md#L62-L77), [`docs/implementation/CURRENT-STATE.md`](CURRENT-STATE.md#L54-L56) | README explicitly qualifies status as planning baseline with zero code implemented; macOS listed as planned target platform pending Apple Silicon hardware verification. | Contributes to `NOT_READY` verdict. |
| **AUD-014** | **Performance benchmark scripts, fixture corpora, and CI evidence missing or insufficient:** Artifacts missing prior to implementation. | P2 | **OPEN (PLANNED FOR EXECUTION)** | [`docs/architecture/TEST-STRATEGY.md`](../architecture/TEST-STRATEGY.md#L15-L55), [`docs/stories/US-016-adversarial-security-corpus.md`](../stories/US-016-adversarial-security-corpus.md), [`docs/stories/US-032-association-matrix-release-hardening.md`](../stories/US-032-association-matrix-release-hardening.md#L68-L76) | Creation of `fixtures/security/` (Phase 4), `scripts/benchmark.sh` (Phase 6), and CI workflow files. Correctly not created during planning (zero-code constraint). | Does not block Phase 1; blocks respective phase gates. |
| **AUD-015** | **Some Task verifiers do not demonstrate every completion criterion:** Verification commands must fully demonstrate all listed completion criteria. | P2 | **PARTIALLY RESOLVED** | All 32 story files in [`docs/stories/`](../stories/); [`scripts/reconcile_tasks.py`](../../scripts/reconcile_tasks.py) | During task implementation in Phases 1-6, implementing agents must ensure unit/integration tests explicitly assert 100% of completion criteria rather than general placeholder tests. All 124 tasks have complete structural verification fields, but runtime adequacy of tests to cover all criteria is verified per task during implementation. | Does not block Phase 1 planning baseline. |
| **AUD-016** | **Implementation roadmap differs from PRD suggested phases without documented rationale:** 10 PRD suggested phases consolidated into 7 roadmap phases. | P2 | **RESOLVED** | [`docs/implementation/ROADMAP.md`](ROADMAP.md#L28-L44), [`PRD.md`](../../PRD.md#L1120-L1190) | Explicit crosswalk and consolidation rationale table added to `ROADMAP.md` mapping PRD suggested phases 0-9 into roadmap phases 0-6. | None on planning. |
| **AUD-017** | **Preserve and validate existing useful architecture boundaries and security principles:** Go backend I/O vs React view boundary and AST sanitization. | INFO | **RESOLVED** | [`docs/architecture/MODULE-BOUNDARIES.md`](../architecture/MODULE-BOUNDARIES.md), [`docs/security.md`](../security.md), [`docs/decisions/ADR-0003-sanitization-css-policy.md`](../decisions/ADR-0003-sanitization-css-policy.md), [`AGENTS.md`](../../AGENTS.md#L90-L96) | Ongoing adherence by implementation agents during code authoring. | None. |
| **AUD-018** | **Planned checks must be distinguished from actual build, test, runtime, and packaging results:** Never report planned tests as executed/passed. | INFO | **RESOLVED** | [`AGENTS.md`](../../AGENTS.md#L60-L66,L140-L155), [`docs/implementation/CURRENT-STATE.md`](CURRENT-STATE.md#L21-L62), [`docs/implementation/IMPLEMENTATION-PROTOCOL.md`](IMPLEMENTATION-PROTOCOL.md#L67-L72) | Ongoing enforcement of 5-state reporting protocol (`PASS`, `FAIL`, `SKIPPED`, `NOT RUN`, `BLOCKED`). 0 tests falsely claimed passed. | None. |

---

## 3. Dedicated Registry of New Remediation Findings (REM-001 through REM-010)

The following findings represent distinct issues and architectural conditions discovered during the planning remediation process. They are assigned a dedicated `REM-*` namespace to prevent collisions with the original audit findings:

| Remediation ID | Title & Condition | Severity | Status | Concrete Evidence (Canonical Path & Section/Lines) | Remaining Work & Dependencies | Verdict Impact |
|---|---|---|---|---|---|---|
| **REM-001** | **Dual / Competing ADR-0001 Records and Spike Authorization Boundary:** Two ADR-0001 files existed; Wails v3 candidate vs v2 fallback required clarification. | P2 | **RESOLVED** (in planning) | [`docs/decisions/ADR-0001-technology-baseline.md`](../decisions/ADR-0001-technology-baseline.md#L1-L14,L80-L91), [`docs/decisions/ADR-0001-desktop-stack.md`](../decisions/ADR-0001-desktop-stack.md#L1-L10) | Product Owner formal baseline decision on ADR-0001. | Contributes to `NOT_READY` verdict pending PO spike baseline selection. |
| **REM-002** | **Task Count Reconciliation (119 vs 124 Tasks) & ID Integrity:** Task count expanded from 119 to 124 during remediation; required exact accounting. | P2 | **RESOLVED** | [`scripts/reconcile_tasks.py`](../../scripts/reconcile_tasks.py), [`docs/stories/US-001`](../stories/US-001-wails-react-skeleton-spike.md) (+1), [`docs/stories/US-004`](../stories/US-004-packaging-association-spike.md) (+3), [`docs/stories/US-023`](../stories/US-023-theme-zoom-selection.md) (+1) | None. Exactly 124 tasks reconciled, 0 duplicate IDs, 0 sequence gaps. | None. |
| **REM-003** | **Requirement Inventory Mismatch (88 Original vs 60 Revised Items):** Audit inventory of 88 entries required explicit mapping to revised 60-item catalog. | P2 | **RESOLVED** | Section 4.2 of this report ([`PLANNING-AUDIT-REMEDIATION.md#42-granular-crosswalk-matrix-all-88-entries`](PLANNING-AUDIT-REMEDIATION.md#42-granular-crosswalk-matrix-all-88-entries)), [`docs/implementation/REQUIREMENT-TRACEABILITY.md`](REQUIREMENT-TRACEABILITY.md#L7-L107), [`scripts/reconcile_requirements_crosswalk.py`](../../scripts/reconcile_requirements_crosswalk.py) | None for planning. Complete 88-row crosswalk persisted in Section 4.2 with verified structural mapping completeness to 60 catalog items. Manual semantic review documented in Section 4.4; implementation verification remains unverified (0/60). | None. |
| **REM-004** | **Ambiguity Between WSL2/WSLg and Native Ubuntu Desktop Integration:** WSLg graphical runtime can render windows but cannot test desktop associations. | P2 | **RESOLVED** (in documentation) | [`docs/architecture/PLATFORM-SUPPORT.md`](../architecture/PLATFORM-SUPPORT.md#L20-L40), [`docs/architecture/DEVELOPMENT-TOOLING.md`](../architecture/DEVELOPMENT-TOOLING.md#L35-L50), [`AGENTS.md`](../../AGENTS.md#L135-L155) | Native Ubuntu desktop testing environment required for association checks. | Contributes to `NOT_READY` verdict. |
| **REM-005** | **Missing Linux GTK4/WebKitGTK 6.0 Dependencies for Wails v3:** Wails v3 compilation on Ubuntu requires GTK4 packages not installed locally. | P2 | **PARTIALLY RESOLVED** (Documented & bounded) | [`docs/architecture/DEVELOPMENT-TOOLING.md`](../architecture/DEVELOPMENT-TOOLING.md#L55-L70), [`docs/decisions/ADR-0001-technology-baseline.md`](../decisions/ADR-0001-technology-baseline.md#L48-L55), [`docs/implementation/CURRENT-STATE.md`](CURRENT-STATE.md#L48-L51) | `sudo apt install libgtk-4-dev libwebkitgtk-6.0-dev` if Wails v3 candidate is approved. | Enforces `NOT_READY` verdict until packages are provisioned. |
| **REM-006** | **Incomplete Host Toolchain for Native Windows Target:** Windows host tools (`go`, `node`, MSVC) missing from Windows host `PATH` via WSL2 interop. | P2 | **PARTIALLY RESOLVED** (Documented & bounded) | [`docs/architecture/DEVELOPMENT-TOOLING.md`](../architecture/DEVELOPMENT-TOOLING.md#L20-L30), [`docs/architecture/PLATFORM-SUPPORT.md`](../architecture/PLATFORM-SUPPORT.md#L42-L60), [`docs/implementation/CURRENT-STATE.md`](CURRENT-STATE.md#L51-L54) | Provision Windows host toolchain or CI runner (`windows-latest`). | Enforces `NOT_READY` verdict. |
| **REM-007** | **Local Unavailability of macOS Apple Silicon Hardware:** Apple Silicon hardware not present locally; prevents local build/runtime validation. | INFO | **PARTIALLY RESOLVED** (Documented & bounded) | [`docs/architecture/DEVELOPMENT-TOOLING.md`](../architecture/DEVELOPMENT-TOOLING.md#L30-L34), [`docs/architecture/PLATFORM-SUPPORT.md`](../architecture/PLATFORM-SUPPORT.md#L62-L77), [`docs/implementation/CURRENT-STATE.md`](CURRENT-STATE.md#L54-L56) | Provision GitHub Actions macOS runner (`macos-latest` / M1/M2) for Phase 1 gate. | Enforces `NOT_READY` verdict. |
| **REM-008** | **Non-Implementation Boundary Discipline Enforcement:** Risk of premature application code generation during planning passes. | INFO | **RESOLVED** | `git status`, working tree inspection | None. 0 application source files, 0 `package.json`, 0 `go.mod`, 0 binaries created. | None. |
| **REM-009** | **Ephemeral Script Dependency in Verification Procedures:** Remediation scripts in temporary locations risked being lost or non-reproducible. | INFO | **RESOLVED** | [`scripts/validate_links.py`](../../scripts/validate_links.py), [`scripts/reconcile_tasks.py`](../../scripts/reconcile_tasks.py), [`scripts/reconcile_requirements_crosswalk.py`](../../scripts/reconcile_requirements_crosswalk.py) | None. Portable, standalone Python scripts committed to repository `scripts/`. | None. |
| **REM-010** | **Standard Environment Failure Status Classification Protocol:** Lack of standardized classification for unavailable platform tools. | INFO | **RESOLVED** | [`AGENTS.md`](../../AGENTS.md#L140-L155), [`docs/implementation/IMPLEMENTATION-PROTOCOL.md`](IMPLEMENTATION-PROTOCOL.md#L67-L72), all 124 tasks in [`docs/stories/`](../stories/) | None. Standardized 5-state reporting protocol (`PASS`, `FAIL`, `SKIPPED`, `NOT RUN`, `BLOCKED`). | None. |

---

## 4. Requirement & Obligation Inventory Crosswalk (88 Original -> 60 Revised)

### 4.1 Explanation of Count Change and Consolidations
The original audit inventory cataloged **88 granular entries**:
- **40 Functional Requirements (`FR-*`)** across PRD Section 6.
- **13 Supporting Matrix Entries** comprising the 10-point file association test matrix (PRD §11.5) and 3 target platform matrix specifications (PRD §1.3, §11.2, §11.3, §11.4).
- **35 Audit-Only Obligations** comprising 10 Security Invariants (PRD §8.1), 3 Privacy Obligations (PRD §8.4), 4 Architecture Baseline Constraints (PRD §1.2, §9.1), 5 Non-Functional Quality Attributes (PRD §12), and 13 Release Acceptance Checklist Gates (PRD §15.1).

The revised catalog in [`docs/implementation/REQUIREMENT-TRACEABILITY.md`](REQUIREMENT-TRACEABILITY.md) organizes these into **60 distinct cataloged items**:
- **40 Functional Requirements (`FR-*`)**: Mapped 1:1.
- **10 Security Invariants (`SEC-INVAR-01` through `SEC-INVAR-10`)**: Mapped 1:1.
- **3 Privacy Obligations (`PRIV-01` through `PRIV-03`)**: Mapped 1:1.
- **5 Quality Attributes (`NFR-PERF`, `NFR-RELY`, `NFR-A11Y`, `NFR-COMPAT`, `NFR-MAINT`)**: Mapped 1:1.
- **1 Consolidated Association Matrix Item (`PKG-ASSOC-MATRIX`)**: Consolidates the 10 association test points and 3 platform matrix requirements into an explicit, verifiable matrix implemented in `US-032.1` and spiked in `US-004.1-6`.
- **1 Consolidated Release Checklist Item (`REL-CHECKLIST`)**: Consolidates the 13 PRD §15.1 release gates into an authoritative release sign-off checklist verified in `US-032.1-4`.
- **4 Architecture Constraints**: Explicitly verified under `NFR-MAINT`, `US-001.3-5`, and `docs/architecture/MODULE-BOUNDARIES.md`.

**Total Revised Catalog Items: 40 + 10 + 3 + 5 + 1 + 1 = 60 items.**

### 4.2 Granular Crosswalk Matrix (All 88 Entries)

| Original Audit Entry ID | Description | PRD Source | Destination Catalog ID | Implementing Work Items & Tasks | Acceptance & Verification Coverage Preserved |
|---|---|---|---|---|---|
| `FR-OPEN-001` | Open a document (picker) | §6.1 | `FR-OPEN-001` | `US-005.1-4`, `US-008.1` | Native file dialog, Unicode and space handling in paths |
| `FR-OPEN-002` | Drag and drop | §6.1 | `FR-OPEN-002` | `US-008.2-4` | Visual drop target, multi-file and mixed-file drag-and-drop |
| `FR-OPEN-003` | OS file associations | §6.1, §11 | `FR-OPEN-003` | `US-004.1-6`, `US-029`-`032` | Registration without overriding user default choice (`UserChoice`) |
| `FR-OPEN-004` | Open from CLI / OS launch | §6.1 | `FR-OPEN-004` | `US-002.1-3`, `US-006.1` | CLI argument handling, absolute/relative path resolution |
| `FR-OPEN-005` | Single-instance routing | §6.1 | `FR-OPEN-005` | `US-002.1-3`, `US-006.2-4` | Forwarding path to existing instance without second window spawn |
| `FR-OPEN-006` | Recent files list | §6.1 | `FR-OPEN-006` | `US-026.1-4` | 20-item bound, recency sort, missing-file badge indicators |
| `FR-OPEN-007` | File changed on disk reload | §6.1 | `FR-OPEN-007` | `US-027.1-4` | Debounced disk change detection with scroll position preservation |
| `FR-RENDER-001` | CommonMark rendering | §6.2 | `FR-RENDER-001` | `US-009.1-4` | CommonMark 0.31.2 compliance with golden test suite |
| `FR-RENDER-002` | GitHub Flavored Markdown | §6.2 | `FR-RENDER-002` | `US-009.1-4` | Tables, task lists, strikethrough, autolinks compliance |
| `FR-RENDER-003` | Code highlighting | §6.2 | `FR-RENDER-003` | `US-010.1-4` | Offline Shiki syntax highlighting across bundled languages |
| `FR-RENDER-004` | Copy code block text | §6.2 | `FR-RENDER-004` | `US-010.3-4` | Exact clipboard copy preserving line endings and whitespace |
| `FR-RENDER-005` | Mermaid diagrams offline | §6.2 | `FR-RENDER-005` | `US-013.1-4` | Offline SVG diagram rendering with safe error fallback |
| `FR-RENDER-006` | LaTeX math formulas | §6.2 | `FR-RENDER-006` | `US-014.1-4` | Offline KaTeX math rendering, currency sign false-match defense |
| `FR-RENDER-007` | Raw HTML fragment allowlist | §6.2 | `FR-RENDER-007` | `US-015.1-4` | Strict tag/attribute allowlist, script & event-handler stripping |
| `FR-RENDER-008` | Headings and slug anchors | §6.2 | `FR-RENDER-008` | `US-012.1-4` | Deterministic heading slug generation and in-document scrolling |
| `FR-RENDER-009` | Graceful partial rendering | §6.2 | `FR-RENDER-009` | `US-013.2`, `US-014.2`, `US-015.3` | Malformed diagram or math block does not break document render |
| `FR-DIR-001` | Automatic RTL/LTR detection | §6.3 | `FR-DIR-001` | `US-017.1-4` | First-strong character paragraph direction engine |
| `FR-DIR-002` | Explicit HTML dir override | §6.3 | `FR-DIR-002` | `US-018.1`, `US-018.3` | `dir="rtl"` / `dir="ltr"` attribute precedence |
| `FR-DIR-003` | CSS direction & alignment | §6.3 | `FR-DIR-003` | `US-018.2`, `US-018.3` | Scoped alignment classes (`.text-right`, `.rtl`) |
| `FR-DIR-004` | User default direction setting | §6.3 | `FR-DIR-004` | `US-019.2-3` | Configurable fallback direction (Auto, RTL, LTR) |
| `FR-DIR-005` | Non-prose LTR isolation | §6.3 | `FR-DIR-005` | `US-019.1`, `US-019.3` | Code blocks, KaTeX, and Mermaid remain strictly LTR |
| `FR-DIR-006` | Direction regression fixtures | §6.3 | `FR-DIR-006` | `US-020.1-4` | Multilingual bidi test suite (Persian, Arabic, Hebrew, English) |
| `FR-ASSET-001` | Relative local images | §6.4 | `FR-ASSET-001` | `US-003.1`, `US-011.1-2` | Scoped asset resolution relative to document directory |
| `FR-ASSET-002` | Local Markdown links in tabs | §6.4 | `FR-ASSET-002` | `US-011.3-4` | Clicking relative `.md` link opens target in new/existing tab |
| `FR-ASSET-003` | Other local link validation | §6.4 | `FR-ASSET-003` | `US-011.3` | Non-markdown local files validated before opening |
| `FR-LINK-001` | External links in OS browser | §6.4 | `FR-LINK-001` | `US-011.3-4` | External web links intercepted and launched in OS default browser |
| `FR-ASSET-004` | Remote resources blocked | §6.4 | `FR-ASSET-004` | `US-011.1`, `US-015.1` | Network isolation: remote images and scripts blocked by default |
| `FR-NAV-001` | Table of contents navigation | §6.5 | `FR-NAV-001` | `US-021.1-4` | Heading outline extraction, scroll spy, click-to-scroll |
| `FR-NAV-002` | Find in document search | §6.5 | `FR-NAV-002` | `US-022.1-4` | In-document search, match counter, next/previous keyboard cycling |
| `FR-NAV-003` | Zoom controller (50%-250%) | §6.5 | `FR-NAV-003` | `US-023.3-4` | Keyboard shortcuts (`Ctrl/Cmd`+`+`/`-`/`0`), limits enforcement |
| `FR-NAV-004` | Theme switcher | §6.5 | `FR-NAV-004` | `US-023.1-2` | Light, Dark, System theme switching and OS sync |
| `FR-NAV-005` | Native text selection & context copy | §6.5 | `FR-NAV-005` | `US-023.5` | Native text selection and right-click context menu copy preservation |
| `FR-NAV-006` | Print styling & preview | §6.5 | `FR-NAV-006` | `US-024.1-4` | Print stylesheet hiding UI chrome, pagination clean breaks |
| `FR-SET-001` | Preferences JSON persistence | §6.6 | `FR-SET-001` | `US-025.1-4` | Schema-validated atomic JSON settings persistence |
| `FR-SET-002` | Settings migration & recovery | §6.6 | `FR-SET-002` | `US-025.2`, `US-025.4` | Fallback recovery and version migration for corrupted settings |
| `FR-SET-003` | Data minimization in settings | §6.6 | `FR-SET-003` | `US-025.1`, `US-026.1` | Document content excluded from persisted settings files |
| `FR-SET-004` | Reset settings to default | §6.6 | `FR-SET-004` | `US-025.3-4` | User action to reset all settings to baseline defaults |
| `FR-ERR-001` | Actionable plain-language errors | §6.7 | `FR-ERR-001` | `US-028.3` | User-facing toast notifications without raw stack traces |
| `FR-ERR-002` | Fault isolation & error boundary | §6.7 | `FR-ERR-002` | `US-028.2`, `US-028.4` | React error boundary prevents application crash on render error |
| `FR-ERR-003` | Local diagnostics rotation | §6.7 | `FR-ERR-003` | `US-028.1`, `US-028.4` | Diagnostic log file rotation bounded at 5 MiB |
| `MAT-ASSOC-01` | Fresh install (prior viewer exists) | §11.5 #1 | `PKG-ASSOC-MATRIX` | `US-032.1` | Association test matrix Point 1 verified across OS targets |
| `MAT-ASSOC-02` | Fresh install (no handler configured) | §11.5 #2 | `PKG-ASSOC-MATRIX` | `US-032.1` | Association test matrix Point 2 verified across OS targets |
| `MAT-ASSOC-03` | Open With / Choose Another App | §11.5 #3 | `PKG-ASSOC-MATRIX` | `US-004.1-5`, `US-032.1` | Association test matrix Point 3 verified across OS targets |
| `MAT-ASSOC-04` | Setting default via OS settings flow | §11.5 #4 | `PKG-ASSOC-MATRIX` | `US-032.1` | Association test matrix Point 4 verified across OS targets |
| `MAT-ASSOC-05` | Opening one file from file manager | §11.5 #5 | `PKG-ASSOC-MATRIX` | `US-004.3`, `US-032.1` | Association test matrix Point 5 verified across OS targets |
| `MAT-ASSOC-06` | Opening several files from file manager | §11.5 #6 | `PKG-ASSOC-MATRIX` | `US-032.1` | Association test matrix Point 6 verified across OS targets |
| `MAT-ASSOC-07` | Opening file while app running | §11.5 #7 | `PKG-ASSOC-MATRIX` | `US-002.2`, `US-032.1` | Association test matrix Point 7 verified across OS targets |
| `MAT-ASSOC-08` | Upgrade over previous version | §11.5 #8 | `PKG-ASSOC-MATRIX` | `US-032.1` | Association test matrix Point 8 verified across OS targets |
| `MAT-ASSOC-09` | Uninstall removes owned associations | §11.5 #9 | `PKG-ASSOC-MATRIX` | `US-004.3`, `US-032.1` | Association test matrix Point 9 verified across OS targets |
| `MAT-ASSOC-10` | Reinstall after clean uninstall | §11.5 #10 | `PKG-ASSOC-MATRIX` | `US-032.1` | Association test matrix Point 10 verified across OS targets |
| `MAT-PLAT-WIN` | Windows 10/11 x64 platform target | §1.3, §11.2 | `PKG-ASSOC-MATRIX` | `US-004.4`, `US-029.1-4` | Windows packaging, NSIS, ProgID, and WebView2 runtime |
| `MAT-PLAT-MAC` | macOS Apple Silicon arm64 target | §1.3, §11.3 | `PKG-ASSOC-MATRIX` | `US-004.5`, `US-030.1-4` | macOS bundle, UTI `net.daringfireball.markdown`, Cocoa events |
| `MAT-PLAT-LNX` | Ubuntu 24.04 LTS x64 target | §1.3, §11.4 | `PKG-ASSOC-MATRIX` | `US-004.1-3`, `US-031.1-4` | Linux `.deb`, desktop launcher, MIME database integration |
| `SEC-INVAR-01` | No script execution in app origin | §8.1 #1 | `SEC-INVAR-01` | `US-015`, `US-016` | Adversarial corpus script stripping assertions |
| `SEC-INVAR-02` | Documents cannot invoke Go bridge | §8.1 #2 | `SEC-INVAR-02` | `US-003`, `US-015` | Sandboxed WebView bridge isolation verification |
| `SEC-INVAR-03` | No top-level WebView navigation | §8.1 #3 | `SEC-INVAR-03` | `US-011` | Interception of top-level navigation attempts |
| `SEC-INVAR-04` | No silent shell or protocol execution | §8.1 #4 | `SEC-INVAR-04` | `US-011`, `US-016` | Adversarial protocol scheme blocking (`javascript:`, etc.) |
| `SEC-INVAR-05` | Remote content not fetched automatically | §8.1 #5 | `SEC-INVAR-05` | `US-011`, `US-015` | Network monitor assertions during document reading |
| `SEC-INVAR-06` | CSS cannot escape document container | §8.1 #6 | `SEC-INVAR-06` | `US-015`, `US-016` | Scoped CSS AST parsing and prefixing |
| `SEC-INVAR-07` | Safe SVG policy (scripts stripped) | §8.1 #7 | `SEC-INVAR-07` | `US-013`, `US-016` | SVG sanitization assertions on Mermaid and inline SVGs |
| `SEC-INVAR-08` | File paths validated as data | §8.1 #8 | `SEC-INVAR-08` | `US-005`, `US-006` | Go unit tests with shell injection metacharacters |
| `SEC-INVAR-09` | Local file access strictly scoped | §8.1 #9 | `SEC-INVAR-09` | `US-005`, `US-011` | Directory traversal defenses (`../../etc/passwd`) |
| `SEC-INVAR-10` | Settings and logs exclude doc text | §8.1 #10 | `SEC-INVAR-10` | `US-025`, `US-028` | Automated scan of persisted settings and rotated logs |
| `PRIV-01` | Zero telemetry, analytics, user tracking | §8.4 | `PRIV-01` | `US-001`, `US-028` | Code audit and network traffic inspection |
| `PRIV-02` | Fully offline default operation | §8.4 | `PRIV-02` | `US-011`, `US-032` | Disconnected network interface verification |
| `PRIV-03` | Dependency audit for telemetry/licenses | §8.4 | `PRIV-03` | `US-032` | Automated scanning with `govulncheck` and license review |
| `ARCH-INVAR-01` | Embedded frontend assets (no dev server) | §1.2 #1 | `NFR-MAINT` | `US-001.3-4` | Standalone binary embedding Vite dist output |
| `ARCH-INVAR-02` | Node.js build-time only | §1.2 #2 | `NFR-MAINT` | `US-001.4-5` | Process inspection confirms zero Node processes at runtime |
| `ARCH-INVAR-03` | Single native Go binary | §1.2 #3 | `NFR-MAINT` | `US-001.4-5` | Standalone executable execution without Go runtime install |
| `ARCH-INVAR-04` | Backend I/O vs Frontend view boundary | §9.1 | `NFR-MAINT` | `US-005`, `US-007` | DTO and typed RPC contract enforcement (`MODULE-BOUNDARIES.md`) |
| `NFR-PERF-01` | Performance benchmarks | §12.1 | `NFR-PERF` | `US-032.2` | Launch < 2.5s, 1 MiB render < 1.0s, 5 MiB < 3.0s |
| `NFR-RELY-01` | Reliability and error resilience | §12.2 | `NFR-RELY` | `US-025`, `US-028` | Fault injection tests, atomic persistence, resource bounds |
| `NFR-A11Y-01` | Accessibility compliance | §12.3 | `NFR-A11Y` | `US-023`, `US-032` | Keyboard navigation, WCAG AA contrast, visible focus |
| `NFR-COMPAT-01` | Compatibility & Unicode handling | §12.4 | `NFR-COMPAT` | `US-005`, `US-006` | UTF-8 normalization, BOM stripping, cross-platform paths |
| `NFR-MAINT-01` | Maintainability & code standards | §12.5 | `NFR-MAINT` | `US-001`, `US-032` | Strict TypeScript, Go static checks (`golangci-lint`) |
| `REL-GATE-01` | App builds & installs on all target OSs | §15.1 #1 | `REL-CHECKLIST` | `US-032.1-4` | Release acceptance checklist item 1 sign-off |
| `REL-GATE-02` | Open via picker, drop, CLI, association | §15.1 #2 | `REL-CHECKLIST` | `US-032.1-4` | Release acceptance checklist item 2 sign-off |
| `REL-GATE-03` | Single-instance routing functional | §15.1 #3 | `REL-CHECKLIST` | `US-032.1-4` | Release acceptance checklist item 3 sign-off |
| `REL-GATE-04` | Multiple tabs & duplicate handling | §15.1 #4 | `REL-CHECKLIST` | `US-032.1-4` | Release acceptance checklist item 4 sign-off |
| `REL-GATE-05` | CommonMark & GFM fixture suites pass | §15.1 #5 | `REL-CHECKLIST` | `US-032.1-4` | Release acceptance checklist item 5 sign-off |
| `REL-GATE-06` | Mermaid renders offline with fallbacks | §15.1 #6 | `REL-CHECKLIST` | `US-032.1-4` | Release acceptance checklist item 6 sign-off |
| `REL-GATE-07` | KaTeX renders offline with fallbacks | §15.1 #7 | `REL-CHECKLIST` | `US-032.1-4` | Release acceptance checklist item 7 sign-off |
| `REL-GATE-08` | Code syntax highlighting & exact copy | §15.1 #8 | `REL-CHECKLIST` | `US-032.1-4` | Release acceptance checklist item 8 sign-off |
| `REL-GATE-09` | Safe HTML allowlist & active script neutralization | §15.1 #9 | `REL-CHECKLIST` | `US-032.1-4` | Release acceptance checklist item 9 sign-off |
| `REL-GATE-10` | Auto, explicit HTML & CSS RTL/LTR functional | §15.1 #10 | `REL-CHECKLIST` | `US-032.1-4` | Release acceptance checklist item 10 sign-off |
| `REL-GATE-11` | Relative local images & links functional | §15.1 #11 | `REL-CHECKLIST` | `US-032.1-4` | Release acceptance checklist item 11 sign-off |
| `REL-GATE-12` | External links open in default OS browser | §15.1 #12 | `REL-CHECKLIST` | `US-032.1-4` | Release acceptance checklist item 12 sign-off |
| `REL-GATE-13` | Corrupt settings, missing files handled safely | §15.1 #13 | `REL-CHECKLIST` | `US-032.1-4` | Release acceptance checklist item 13 sign-off |

### 4.3 Structural Validation Results
Executed reproducible repository validator [`scripts/reconcile_requirements_crosswalk.py`](../../scripts/reconcile_requirements_crosswalk.py) directly against the persisted Section 4.2 table:
- **Persisted Table Scanned:** Section 4.2 (`### 4.2 Granular Crosswalk Matrix (All 88 Entries)`).
- **Rows Parsed:** Exactly 88 rows (40 Functional Requirements + 13 Supporting Matrix Entries + 35 Audit-Only Obligations).
- **Duplicate Source Inventory Keys:** **0** duplicates across all 88 entries.
- **Missing Destination Catalog IDs:** **0** missing; every entry defines a concrete revised catalog target.
- **Missing Implementation Mappings:** **0** missing; every entry references implementing Epics, Stories, and Tasks.
- **Catalog Parity:** All 60 destination catalog items match 1:1 with [`docs/implementation/REQUIREMENT-TRACEABILITY.md`](REQUIREMENT-TRACEABILITY.md) (0 missing, 0 unexpected).
- **Referenced Story Files on Disk:** All 32 referenced Story IDs (`US-001` through `US-032`) verified present in `docs/stories/`.
- **Structural Mapping Completeness:** **PASS** (Exit code `0`).

### 4.4 Manual Semantic Review & Residual Risk Assessment
An automated structural validator confirms mapping completeness (i.e., that each source entry has a recorded destination and required references), but does not prove semantic equivalence or runtime implementation behavior. A qualitative row-by-row manual review confirmed the following:
1. **Matrix Preservation:** The 10-point file association matrix (`MAT-ASSOC-01` through `10`) and 3 platform matrix items are explicitly articulated in `US-032.1` and spiked in `US-004.1-6`.
2. **Release Checklist Preservation:** All 13 gates from PRD §15.1 are represented as verifiable sign-off items in `US-032.1-4`.
3. **Semantic Corrections:** `FR-NAV-005` is correctly mapped to text selection and right-click context menu copy in `US-023.5` under Phase 5 / EPIC-006 (resolving AUD-009; separated from theme tokens).
4. **Distinction from Implementation Verification:** Implementation verification remains **`UNVERIFIED`** (0 of 60 catalog items verified; 0 lines of application code written). A completed planning crosswalk does not constitute implementation evidence.
5. **Open Residual Audit Findings & Respective Phase Gates:**
   - **AUD-010 (Partial-Render HTML/CSS Fallback — PARTIALLY RESOLVED):** While Mermaid and KaTeX fallbacks are fully covered in `US-013` and `US-014`, test assertions for malformed/rejected raw HTML/CSS fallback must be explicitly verified during Phase 4 implementation in `US-015` and `US-016`.
   - **AUD-011 (Privacy Redaction in Logs — PARTIALLY RESOLVED):** Settings and logs exclude document text, but automated test assertions verifying path redaction and exclusion of credentials/tokens must be verified during Phase 5 execution in `US-028.4`.
   - **AUD-012 (macOS UTI Scope — PARTIALLY RESOLVED):** `public.plain-text` association is scoped to Markdown extensions (`net.daringfireball.markdown`) to prevent broad hijacking of `.txt` files; runtime verification is contingent on macOS hardware access in Phase 6.
   - **AUD-014 (Benchmark Scripts & Fixture Corpora — OPEN / PLANNED FOR EXECUTION):** Benchmark script creation (`scripts/benchmark.sh`) and adversarial corpus (`fixtures/security/`) are scheduled for Phase 4 and Phase 6; cannot be created during planning baseline.
   - **AUD-015 (Task Verifier Completion Criteria Coverage — PARTIALLY RESOLVED):** Task verification fields are structurally complete across all 124 tasks, but during Phase 1-6 implementation, implementing agents must ensure unit/integration tests explicitly cover all completion criteria rather than general placeholder assertions.

---

## 5. Reproducible Task Verification & Accounting Audit

### 5.1 Task Count Reconciliation (119 -> 124 Tasks)
The task count transition from the original 119 baseline tasks to 124 tasks is accounted for by **exactly 5 added tasks** across three user stories:
1. **`US-001` (+1 task):** Restructured during `AUD-008` first-task sequencing remediation from 4 tasks to 5 tasks, adding dedicated task `US-001.5` (*Execute standalone binary and verify independent execution*).
2. **`US-004` (+3 tasks):** Expanded during `AUD-002` platform feasibility remediation from a Linux-only 3-task spike to a comprehensive 6-task multi-platform spike, adding `US-004.4` (*Windows NSIS packaging prototype*), `US-004.5` (*macOS bundle & UTI association prototype*), and `US-004.6` (*Independent multi-platform feasibility evidence compilation*).
3. **`US-023` (+1 task):** Added during `AUD-003` / `AUD-009` traceability remediation to correct the semantic misattribution of `FR-NAV-005` (Native text selection and right-click context menu copy), adding dedicated task `US-023.5`.
- **Merged or Removed Tasks:** 0.
- **Net Reconciled Tasks:** 119 + 5 = **124 Tasks**.

### 5.2 Structural Validation & Quality Results
Ran reproducible repository validator [`scripts/reconcile_tasks.py`](../../scripts/reconcile_tasks.py):
- **Stories Scanned:** 32 of 32 stories in `docs/stories/`.
- **Total Tasks Inventoried:** 124 tasks.
- **Duplicate Task IDs:** **0**.
- **Sequence Gaps (Missing IDs):** **0** (all stories have continuous 1..N task numbering).
- **Structural Defects (Missing Fields):** **0**. Every task defines:
  1. `Completion Criteria`
  2. `Verification Command` or `Verification Method` or `Verification Procedure`
  3. `Expected Observable Result`
  4. `Evidence to Record`
  5. `Environment Handling`
- **Environment-Dependent Tasks Identified:** 15 tasks require specific OS or graphical runtime capabilities (GUI display, native package manager, Windows registry, or macOS Cocoa events).

### 5.3 Environment Status Reporting Protocol
Implementation agents must report task execution using this strict 5-state protocol:
- **`PASS`**: Verification command executed with zero exit code; observable output matches documented expectation.
- **`FAIL`**: Verification command executed with non-zero exit code or regression observed.
- **`SKIPPED`**: Optional or conditional check bypassed with documented justification.
- **`NOT RUN`**: Required toolchain or hardware unavailable in current execution environment (e.g., macOS ARM64 on Linux host).
- **`BLOCKED`**: Pre-requisite task, external dependency, or approval gate missing (e.g., ADR-0001 approval).

---

## 6. Canonical ADR-0001 Technology Baseline

- **Canonical Record Path:** [`docs/decisions/ADR-0001-technology-baseline.md`](../decisions/ADR-0001-technology-baseline.md)
- **Noncanonical Historical Alias:** [`docs/decisions/ADR-0001-desktop-stack.md`](../decisions/ADR-0001-desktop-stack.md) (explicit alias redirecting to canonical record; not independently maintained).
- **Authoritative Status:** **`PROPOSED CANDIDATE FOR FEASIBILITY SPIKE`**
- **Evaluation Distinctions:**
  1. **Proposed Feasibility-Spike Candidate:** Wails v3 Beta `v3.0.0-beta.34` (`github.com/wailsapp/wails/v3/cmd/wails3@v3.0.0-beta.34`).
     - Required Go Toolchain: `go 1.26.0+` (local verified: `go1.26.8 linux/amd64`, toolchain: `go1.26.9`).
     - Linux Subsystem: Defaults to GTK4 and WebKitGTK 6.0 (`libgtk-4-dev`, `libwebkitgtk-6.0-dev`, uninstalled locally).
  2. **Documented Proven Fallback Candidate:** Wails v2 Stable `v2.17.0` (`github.com/wailsapp/wails/v2/cmd/wails@v2.17.0`).
     - Required Go Toolchain: `go 1.25.0+` (local verified: `go1.26.8 linux/amd64`).
     - Linux Subsystem: GTK3 and WebKit2GTK 4.1 (`libgtk-3-dev`, `libwebkit2gtk-4.1-dev`, both installed locally).
  3. **Product Owner Spike Authorization Boundary:** The Product Owner may authorize execution of the Phase 1 feasibility spike on Wails v3 **without** declaring Wails v3 the final production baseline.
  4. **Final Baseline Adoption Gate:** Formal adoption of Wails v3 and amendment of `PRD.md §1.1` depends strictly on observable Phase 1 spike evidence across Windows, Linux, and macOS.

---

## 7. Platform Gate Reconciliation & Environment Boundaries

### 7.1 Subsystem Classification & Constraints
| Target Platform | Runtime Environment | Compilation Capability | Automated Test Capability | Packaging Capability | Interactive Runtime & Desktop Integration Capability |
|---|---|---|---|---|---|
| **Ubuntu Linux** | Local WSL2 / WSLg (`DISPLAY=:0`) | **YES** (`gcc`, `go`) | **YES** (`go test`, Vitest) | **YES** (`dpkg-deb -c`) | **PARTIAL**: Graphical window rendering works via WSLg; native desktop associations (`xdg-mime`, `.desktop` file manager launch) **require native Ubuntu**. |
| **Ubuntu Linux** | Native Installation | **YES** | **YES** | **YES** | **FULL**: Native desktop launcher, MIME associations, and install/uninstall lifecycle verified. |
| **Windows 10/11** | WSL2 Host Interop | **YES** (cross-compile) | **NO** (no host Go/Node) | **PARTIAL** (NSIS script lint) | **BLOCKED / NOT RUN**: Native Windows host tools (`go`, `node`, MSVC) missing from Windows host `PATH`. Requires dedicated Windows machine or CI. |
| **Windows 10/11** | External CI (`windows-latest`) | **YES** | **YES** (headless) | **YES** (NSIS `.exe`) | **PARTIAL**: Headless verification only; full interactive window focus and Explorer double-click require interactive Windows host. |
| **macOS (arm64)** | Local Environment | **NO** (no hardware) | **NO** | **NO** | **BLOCKED / NOT RUN**: Apple Silicon hardware not present locally. |
| **macOS (arm64)** | External CI (`macos-latest`) | **YES** (arm64) | **YES** (headless) | **YES** (`.app` bundle) | **PARTIAL**: Headless verification only; Cocoa event delivery (`application:openFile:`) requires interactive Aqua desktop. |

### 7.2 Sequential Spike Progression & Strict Phase 1 Gate Invariant
- **Sequential Spike Progression:** Feasibility spike tasks (`US-001` through `US-004`) may proceed sequentially in available environments (e.g., WSL2/WSLg for Linux compilation and window launch).
- **Strict Phase 1 Exit Invariant:** **Phase 1 must not pass and Phase 2 must not begin** until all mandatory platform evidence across Windows 10/11 x64, macOS Apple Silicon, and Ubuntu 24.04 LTS x64 is verified or the Product Owner has formally amended the support scope.
- **Prohibition of Inferred Success:** A successful build on Linux is not proof of Windows or macOS compatibility. A successful launch in WSL2 is not proof of native Ubuntu file-manager association.

---

## 8. Revalidation Verification Results & Link Portability

### 8.1 Verification Command Outputs

| Check / Tool | Target Metric | Actual Result | Status |
|---|---|---|---|
| Link Validation (`scripts/validate_links.py`) | 0 machine-specific links; 0 broken links | 74 files scanned; 0 machine-specific links; 379 valid internal relative links; 0 broken links | **PASS** |
| Task Verification Quality (`scripts/reconcile_tasks.py`) | 124 tasks; 0 defects; 0 gaps | 124 tasks; 0 duplicate IDs; 0 sequence gaps; complete structural verification fields | **PASS** (Structural) |
| Requirement Crosswalk (`scripts/reconcile_requirements_crosswalk.py`) | 88 persisted rows parsed; 60 catalog items mapped | 88 rows parsed from Section 4.2; 0 duplicate keys, 0 missing destinations; 60/60 catalog parity; 32 story files verified; 0/60 implemented | **PASS** (Structural) |
| PRD Modification Boundary (`git diff PRD.md`) | PRD unchanged | `git diff PRD.md` is completely empty | **PASS** |
| Implementation Boundary (`git status`) | Zero application code / dependencies | 0 `.go` source files, 0 `package.json`, 0 `go.mod`, 0 binaries | **PASS** |
| Platform Evidence Status | Independent platform records | Windows and macOS classified as `BLOCKED / NOT RUN` locally | **PASS** |

### 8.2 Persisted File Link Portability vs IDE Hyperlinks
A specific check of persisted Markdown files confirms:
- **Persisted Content:** Contains **0** machine-specific `file:///` URIs and **0** `/home/` absolute paths. All persisted links are repository-relative Markdown links (e.g., `[link](../stories/...)` or `[script](../../scripts/...)`).
- **IDE Rendered View:** The IDE UI may render relative Markdown links as clickable `file:///` URLs in the visual interface, but the underlying persisted files remain 100% portable and environment-agnostic.

---

## 9. Final Implementation Readiness Verdict & Next Action

### **FINAL VERDICT: `NOT_READY`**

*Rationale:* Planning documentation, task-level verifiers, link portability, deliverable paths, and requirement crosswalks have achieved complete revalidation compliance. However, because:
1. The **technology baseline decision (`ADR-0001`)** remains in `PROPOSED` status awaiting Product Owner evaluation;
2. Required Linux packages (`libgtk-4-dev`, `libwebkitgtk-6.0-dev`) for Wails v3 are uninstalled locally; and
3. Mandatory cross-platform feasibility gates (native Windows host tools, Apple Silicon macOS hardware) cannot be run locally without external runner provisioning;

The repository is correctly classified as **`NOT_READY`** for application implementation.

### Outstanding Blockers Summary
1. **Technology Baseline Blocker:** `ADR-0001` pending Product Owner decision between Wails v3 candidate (`v3.0.0-beta.34`) and Wails v2 fallback (`v2.17.0`).
2. **Platform Dependency Blocker:** Linux GTK4/WebKitGTK 6.0 packages (`libgtk-4-dev`, `libwebkitgtk-6.0-dev`) uninstalled for Wails v3 candidate.
3. **Platform Runner Blocker:** Native Windows host tools (`go`, `node`, MSVC) missing locally; Apple Silicon macOS hardware unavailable locally. External CI runners (`windows-latest`, `macos-latest`) required for cross-platform Phase 1 exit gate.
4. **Security & Privacy Implementation Blockers:** Sanitizer failure fallback assertions (AUD-010) and credential/token log exclusion assertions (AUD-011) must be implemented in their respective phases before release.
5. **Performance Blocker:** Benchmark script creation (`scripts/benchmark.sh`) scheduled for Phase 6 (AUD-014).

### Exact Next Eligible Action
The Product Owner reviews [`docs/decisions/ADR-0001-technology-baseline.md`](../decisions/ADR-0001-technology-baseline.md) and decides whether to authorize execution of the Phase 1 feasibility spike using the **Wails v3 candidate (`v3.0.0-beta.34`)** (requiring installation of `libgtk-4-dev` and `libwebkitgtk-6.0-dev`) or the **Wails v2 fallback (`v2.17.0`)** (utilizing pre-installed GTK3/WebKit2GTK 4.1 packages).
