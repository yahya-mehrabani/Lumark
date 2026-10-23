# AGENTS.md — Repository Instructions for AI Implementation Agents

## 1. Purpose and Philosophy

This document defines the mandatory operating rules for any AI coding agent working in this repository.

The goal of this repository workflow is **durable, file-based continuity**. Any compatible AI agent must be able to resume work using the repository files alone—without relying on previous conversational context, hidden session memory, or uncommitted ephemeral state.

The repository is the **single source of truth** for requirements, architecture, implementation status, verification evidence, decisions, blockers, and next actions.

---

## 2. Document Hierarchy and Authority

When documents conflict, adhere strictly to the following precedence hierarchy:

1. **`PRD.md`** — Authoritative product requirements. Do not silently rewrite, weaken, or omit any requirement.
2. **`docs/decisions/` (ADRs)** — Authoritative architectural and technology decisions.
3. **`docs/architecture/`** — System design, module boundaries, security policies, and test strategy.
4. **`docs/epics/` and `docs/stories/`** — Authoritative work-item contracts, acceptance criteria, and task definitions.
5. **`docs/implementation/ROADMAP.md` and `BACKLOG.md`** — Scheduling, phase gates, and backlog status index.
6. **`docs/implementation/CURRENT-STATE.md`** — Current operational snapshot and immediate continuation instructions.
7. **`docs/implementation/WORK-LOG.md`** — Append-only chronological history.

*Rule:* If you identify a contradiction between documents, do not make arbitrary assumptions. Document the conflict in `docs/implementation/CURRENT-STATE.md` and `WORK-LOG.md`, select the safest interpretation that preserves PRD invariants, and log an open decision.

---

## 3. Mandatory Pre-Flight Checklist (Before Starting Any Task / Work)

Every agent must perform these steps in order before modifying or creating any code:

1. **Check Git Status:**
   Run `git status --short` and `git diff` to inspect the working tree.
   - If there are uncommitted changes or interrupted work, **preserve them**. Do not discard, overwrite, reset, or commit unrelated or pre-existing user changes.
2. **Read Current State:**
   Read `docs/implementation/CURRENT-STATE.md` to identify the active phase, current work item, blockers, and required next action.
3. **Read Execution Protocol:**
   Read `docs/implementation/IMPLEMENTATION-PROTOCOL.md` to ensure adherence to the required 12-step lifecycle.
4. **Read the Active Work Item:**
   Read the specific Story file in `docs/stories/`, its parent Epic in `docs/epics/`, and the active Task. Read the completion criteria, dependencies, verification procedures, and evidence requirements.
5. **Verify Dependencies and Synchronize Status:**
   Ensure all prerequisite Stories/Tasks marked in the active Story are `DONE` and verified. If a dependency is not met, do not start—update status to `BLOCKED` and document why. Keep the Task status synchronized with the implementation protocol (`IN_PROGRESS`).

---

## 4. Status Model and Transitions

All Epics, Stories, and Tasks use this strict status model:

| Status | Meaning | Valid Next Statuses |
|---|---|---|
| `DRAFT` | Initial definition; not yet ready for execution. | `READY`, `DEFERRED` |
| `READY` | Acceptance criteria defined, dependencies satisfied, ready to execute. | `IN_PROGRESS`, `BLOCKED`, `DEFERRED` |
| `IN_PROGRESS` | Actively being implemented by an agent. | `READY`, `BLOCKED`, `DONE` |
| `BLOCKED` | Cannot proceed due to unmet dependency, missing platform, or open decision. | `READY`, `IN_PROGRESS`, `DEFERRED` |
| `DONE` | All completion criteria met, tests executed, actual verification evidence recorded. | *(Terminal unless regression)* |
| `DEFERRED` | Explicitly postponed with documented rationale. | `READY`, `DRAFT` |

### Rules for Marking `DONE`
- **Writing code alone is NEVER sufficient to mark a Task or Story as `DONE`.**
- Every Task must have observable verification output recorded in its document.
- If a verification step cannot be executed due to the current environment (e.g., macOS-specific build on a Linux runner), the task must be recorded as partially verified with the specific limitation explicitly documented in `CURRENT-STATE.md`. It must NOT be marked `DONE` without caveat.

---

## 5. Work Item Execution Rules

1. **Bounded Scope:** Work on only one Story or Task at a time. Do not make opportunistic, out-of-scope edits across unrelated components.
2. **Preserve Existing Documentation:** Do not delete docstrings, comments, or existing tests unless refactoring is explicitly part of the active Story.
3. **Local-First & Safe by Default:**
   - No runtime network dependencies (no CDN scripts, remote fonts, or telemetry).
   - Never pass unsanitized HTML/CSS/SVG directly into the WebView DOM.
   - Keep native Go file access scoped to validated user requests.
4. **Cross-Platform Discipline:**
   - Always handle file paths with platform-aware utilities (preserving case on Linux, supporting spaces and Unicode, handling Windows backslashes).
   - Document any platform limitations explicitly.

---

## 6. Mandatory Task Completion Checklist & Conventional Commits Policy

Before marking a Task `DONE` and concluding a work unit, every agent must strictly adhere to the following verification and commit protocol.

### 6.1 Pre-Completion Verification & Review Checklist
1. **Bounded Scope:** Implement only the agreed Task scope. Do not make opportunistic, out-of-scope edits across unrelated components.
2. **Run Verification Commands:** Execute the Task's required tests, build commands, and verification procedures.
3. **Run Linters and Static Analysis:** Run relevant linting, formatting, and security checks required by the Task (`golangci-lint`, `goimports`, `govulncheck`, `shellcheck`, `npm run lint`).
4. **Review Final Diff:** Run `git diff --check`, inspect `git status --short`, and review the diff for correctness, scope, regressions, secrets, accidental files, and consistency with the architecture and `PRD.md`.
   - *Self-Review Distinction:* Clearly distinguish a review conducted by another agent from a self-review. Never describe an agent self-review as an independent review.
5. **Confirm Evidence Coverage:** Confirm that every completion criterion defined in the Task has corresponding observable verification output recorded in the Story under `Validation Evidence`.
6. **Update Tracking Documents:** Update the Task status, Story/Epic summaries, `docs/implementation/BACKLOG.md`, `docs/implementation/REQUIREMENT-TRACEABILITY.md` (if requirement status changed), `docs/implementation/CURRENT-STATE.md`, and append to `docs/implementation/WORK-LOG.md`.
7. **Mark Task Status Accurately:** Mark the Task `DONE` only when its required completion and verification conditions have actually passed. If a mandatory check fails, is blocked, or has not run, do not claim that the Task is complete. Record the precise result (`FAIL`, `NOT RUN`, `BLOCKED`) and keep the relevant blocker visible.

### 6.2 Mandatory Task-Level Conventional Commits Policy
- **Default Unit of Commit:** The default unit of commit is exactly **one completed Task per commit**.
- **Conventional Commits Schema:** Use standard Conventional Commits format:
  ```text
  <type>(<scope>): <imperative summary>
  ```
  - Permitted types: `feat`, `fix`, `refactor`, `test`, `docs`, `build`, `ci`, `perf`, `security`, `chore`.
  - Representative examples:
    - `feat(file-open): support CLI file arguments`
    - `fix(render): preserve output after sanitizer failures`
    - `test(security): add malformed HTML regression cases`
    - `docs(planning): record feasibility spike results`
  - **Commit Body:** Include the Task ID (e.g., `Task: US-001.1`) and actual verification commands/results in the commit body where useful.
- **Pre-Commit Staging Discipline:**
  - Run `git diff --check` to catch whitespace or patch defects.
  - Inspect `git status --short`.
  - Review the staged diff with `git diff --cached` before committing.
  - **Stage explicit paths only:** Never use `git add -A`, `git add .`, or blindly stage the entire working tree.
  - **Preserve unrelated user changes:** Never stage or discard untracked or modified files belonging to unrelated user work.
- **Commit Safety & Integrity:**
  - Commit only when the Task's required completion conditions are satisfied.
  - Do not bypass commit hooks, amend existing commits, rewrite history, or include secrets without explicit authorization.
  - If a Task cannot be completed because a required environment or platform is unavailable, report the limitation accurately and follow the repository's status protocol (`NOT RUN` / `BLOCKED`); do not force a `DONE` status or fabricate verification results.

### 6.3 Story Completion Protocol
When all Tasks in a Story are complete:
- Run the Story-level integration and regression checks.
- Review that the Story's acceptance criteria are fully covered by actual verification evidence.
- Synchronize Story, Epic, backlog, and current-state statuses.
- **No Redundant Story Commits:** Do not create an additional Story commit if all changes have already been committed by Task and the Story-level check introduces no new changes. If the Story validation requires a distinct integration fix, commit that fix separately using Conventional Commits and reference the affected Task or Story.


---

## 7. Strict Prohibitions

1. **NO Silent Scope Changes:** Do not drop, alter, or weaken requirements from `PRD.md`.
2. **NO Hallucinated Evidence:** Never claim a test passed, a build succeeded, or a platform was verified without actual command output.
3. **NO Uncommitted Destructive Actions:** Never run `git reset --hard` or `git clean -fd` without explicit user authorization.
4. **NO Code Implementation During Planning:** When the task is planning or documentation, do not generate application code, build scripts, or install npm/Go packages.
5. **NO External Leaks:** Do not transmit user documents, full paths, or credentials in error logs or network requests.

---

## 8. Agent Tooling Policy

To ensure deterministic quality, consistency, and troubleshooting capabilities, agents must adhere to the following tooling policy:

### Tool Classification
- **Required Core Toolchain:** Go toolchain (`go`), Node.js & npm (frontend build-time only), Git (`git`), and the pinned Wails CLI (`v3.0.0-beta.34` candidate / `v2.17.0` fallback). These are unconditional prerequisites for building and running the application.
- **Recommended Verification Tools:**
  - `goimports`: Mandatory Go import management and canonical formatting before verification.
  - `golangci-lint`: Static analysis and linting; must pass with repository config before marking tasks done.
  - `govulncheck`: Vulnerability scanning for Go dependencies.
  - `shellcheck` & `shfmt`: Mandatory linting and formatting for repository shell scripts.
- **Optional Diagnostic Utilities:**
  - `gopls`: Language server for code navigation, symbol inspection, and IDE diagnostics.
  - `rg` (ripgrep), `fd` / `fdfind`, `tree`, `jq`: Exploration and file inspection.
  - `strace`, `lsof`: Runtime troubleshooting, socket inspection, and IPC debugging.

### Tooling Execution Rules
1. **Never Assume Global `@latest`:** Never run unpinned commands like `go install ...@latest` or `npm install -g ...` in reproducible instructions. Tools must be pinned to explicit versions in project config or CI workflows.
2. **Handle Missing Tools Gracefully:** If a recommended or optional tool is missing, report its absence clearly in the task log. Do not fail silent, do not install packages during read-only/planning tasks, and never invent or simulate tool output.
3. **Keep Detailed Inventory in Documentation:** Machine-specific versions and environment setup belong in `docs/architecture/DEVELOPMENT-TOOLING.md`, keeping `AGENTS.md` focused on universal repository rules.

---

## 9. Platform Acceptance Evidence Discipline

1. **Independent Platform Records:** Maintain separate, unmerged evidence records for:
   - **Windows 10/11 x64** (native host build and runtime);
   - **Ubuntu 24.04 / 26.04 x64** (explicitly distinguishing WSL2/WSLg with `DISPLAY=:0` vs native Ubuntu installation);
   - **macOS Apple Silicon** (native arm64 build and runtime).
2. **Categorized Evidence:** For each platform, distinguish:
   - Build compilation output;
   - Automated unit/integration test results;
   - Packaging artifact validation;
   - Interactive runtime and file association behavior.
3. **No Inferred Success:** A successful build on Linux is not proof of Windows or macOS compatibility. A successful build in WSL2 is not proof of native Linux window manager or file-manager association behavior. Mark any check that cannot be directly executed in the current environment as `NOT RUN` or `BLOCKED`.

---

# 10. Wails v3 Project Rules

## Documentation sources
- Main docs: https://v3.wails.io/
- API reference: https://v3.wails.io/reference/overview/
- Changelog: https://v3.wails.io/changelog/
- CLI guide: https://v3.wails.io/guides/cli/

## Version requirements
- Installed Wails CLI: v3.0.0-beta.34
- Verify the actual project dependency version in go.mod.
- Prefer APIs compatible with the project's pinned version.
- Never assume Wails v2 APIs are valid in v3.
- Check official documentation before using unfamiliar APIs.
- If documentation and installed code disagree, investigate before proceeding.

## Agent workflow
- Inspect the repository before creating or modifying files.
- Use Wails CLI MCP for supported Wails development tasks.
- Use official documentation for API decisions.
- Do not invent commands, methods, or configuration options.
- Explain architectural decisions before major changes.
- Run appropriate tests and builds after implementation.
- Ask before destructive operations.

## App MCP
- Use App MCP only when the application is running in development mode.
- Never enable development MCP access in production builds.
