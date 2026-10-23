# US-002: Command-Line & Single-Instance IPC Feasibility Spike

- **Story ID:** `US-002`
- **Parent Epic:** [EPIC-001: Technical Feasibility Spike & Platform Foundation](../epics/EPIC-001-feasibility-spike.md)
- **Status:** `READY` (Execution Blocked on Baseline Decision & Platform Evidence)
- **Assigned Phase:** Phase 1 (Feasibility Spike)

---

## 1. Objective and Expected Outcome

Verify that the Go native backend can:
1. Accept one or more file paths passed via CLI arguments upon initial launch.
2. Coordinate a single instance per user session via a local-only IPC mechanism (evaluating Wails v3 native `SingleInstance` application option vs custom socket/named-pipe IPC in ADR-0002).
3. Safely forward file paths from a secondary process launch to the running primary instance.
4. Bring the running window forward and terminate the secondary CLI process cleanly with exit code 0.

---

## 2. Source PRD Requirements

- **FR-OPEN-004:** Open from command line or OS launch event.
- **FR-OPEN-005:** Single-instance file routing (Local-only, access-controlled, no public network port).
- **PRD Section 1.4:** Mandatory feasibility spike item 3 & 4.
- **ADR-0002:** Single-instance IPC architecture.

---

## 3. Dependencies

- **Prerequisites:** [US-001](US-001-wails-react-skeleton-spike.md) (Wails application skeleton runnable).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - Prototype IPC listener and client in Go (evaluating Wails v3 built-in single instance vs Go socket/pipe fallback).
  - Demonstrate single-instance path passing between two terminal invocations.
  - Test path handling with spaces, Unicode characters, and relative paths.
- **Explicit Exclusions:**
  - Production multi-document tab state (tested with a simple path logger/callback).
  - Full desktop window activation on non-host platforms (Windows/macOS) in this Linux session.

---

## 5. Observable Acceptance Criteria

1. Initial invocation `app sample.md` starts application and logs received path `sample.md`.
2. Second invocation in separate shell `app second.md` transmits `second.md` to primary process, exits with code 0 in < 500ms, and does not spawn a second window.
3. Primary process receives `second.md` and triggers window activation callback.
4. IPC mechanism uses strictly local permissions (`0700` socket or Windows named pipe) without binding to `127.0.0.1` or network ports.

---

## 6. Implementation Tasks (AUD-004)

### Task US-002.1: Implement and evaluate single-instance IPC mechanism
- **Task ID:** `US-002.1`
- **Status:** `READY`
- **Dependencies:** `US-001.4`
- **Completion Criteria:** Prototype IPC coordinator handles single-instance detection and message passing.
- **Verification Command:**
  ```bash
  go test -v -race ./spike/ipc/...
  ```
- **Expected Observable Result:** `PASS` output confirming primary socket creation, secondary connection, JSON payload transmission, and clean shutdown.
- **Evidence to Record:** Test output logs in Section 9.
- **Environment Handling:** If running in an environment without `/tmp` or `$XDG_RUNTIME_DIR`, verify fallback directory handling.

### Task US-002.2: Wire IPC coordinator into Wails application lifecycle
- **Task ID:** `US-002.2`
- **Status:** `READY`
- **Dependencies:** `US-002.1`
- **Completion Criteria:** App checks for running instance on startup; if running, forwards `os.Args[1:]` and exits; if primary, enters event loop.
- **Verification Command:**
  ```bash
  ./build/bin/markdown-viewer-spike doc1.md & PID=$!; sleep 1; ./build/bin/markdown-viewer-spike doc2.md; kill $PID
  ```
- **Expected Observable Result:** Secondary process exits immediately with exit code 0; primary process logs `doc2.md` received without launching second window.
- **Evidence to Record:** Captured shell session log with exit codes and process counts.
- **Environment Handling:** In headless environments, run with `xvfb-run` or check log stdout.

### Task US-002.3: Verify path handling with spaces and Unicode
- **Task ID:** `US-002.3`
- **Status:** `READY`
- **Dependencies:** `US-002.2`
- **Completion Criteria:** Forwarding paths like `test docs/نمونه سند.md` preserves exact Unicode characters and spaces without shell mangling.
- **Verification Command:**
  ```bash
  ./build/bin/markdown-viewer-spike "fixtures/golden/نمونه سند.md"
  ```
- **Expected Observable Result:** Application logs exact UTF-8 byte sequence and decoded filename `نمونه سند.md`.
- **Evidence to Record:** Decoded string assertion logs.
- **Environment Handling:** Verify terminal UTF-8 locale (`LANG=C.UTF-8` or `en_US.UTF-8`).

---

## 7. Known Risks and Blockers

- Stale socket file after abnormal termination (SIGKILL). Coordinator must test connectivity before failing startup.
- Windows named pipe security descriptors must be verified on native Windows host in Phase 6.

---

## 8. Implementation Notes and Validation Evidence

*(To be filled by implementation agent during Phase 1 execution)*
- **Execution Date:** Not yet executed
- **Agent ID:** N/A
- **Changed Files:** None
- **Terminal Output & Verification Evidence:**
```text
(Awaiting Phase 1 execution)
```
