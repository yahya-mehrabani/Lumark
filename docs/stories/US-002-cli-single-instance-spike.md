# US-002: Command-Line & Single-Instance IPC Feasibility Spike

- **Story ID:** `US-002`
- **Parent Epic:** [EPIC-001: Technical Feasibility Spike & Platform Foundation](../epics/EPIC-001-feasibility-spike.md)
- **Status:** `IN_PROGRESS`
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
- **Status:** `DONE`
- **Dependencies:** `US-001.4`
- **Completion Criteria:** Prototype IPC coordinator handles single-instance detection and message passing.
- **Verification Command:**
  ```bash
  go test -v -race ./spike/ipc/...
  ```
- **Expected Observable Result:** `PASS` output confirming primary socket creation, secondary connection, JSON payload transmission, and clean shutdown.
- **Evidence to Record:** Test output logs in Section 8.
- **Environment Handling:** Fallback directory handling verified under mock environments when `$XDG_RUNTIME_DIR` is unset or unavailable.

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

- Stale socket file after abnormal termination (SIGKILL). Coordinator tests connectivity and unlinks stale socket before failing startup (verified in `TestStaleSocketCleanup`).
- Windows named pipe security descriptors must be verified on native Windows host in Phase 6.

---

## 8. Implementation Notes and Validation Evidence

- **Execution Date:** 2026-10-23
- **Agent ID:** Antigravity Autonomous Task Runner
- **Changed Files:**
  - `spike/ipc/types.go` (core types, Role, Message, Options)
  - `spike/ipc/protocol.go` (length-prefixed JSON wire framing and ACK protocol)
  - `spike/ipc/dir.go` (runtime directory resolution and XDG fallback hierarchy)
  - `spike/ipc/lock.go` (FileLock interface and ErrAlreadyRunning)
  - `spike/ipc/lock_unix.go` (POSIX flock advisory locking for Unix/Linux/Darwin)
  - `spike/ipc/lock_windows.go` (Windows lock stub for cross-compilation safety)
  - `spike/ipc/coordinator.go` (Coordinator lifecycle, socket management, message forwarding)
  - `spike/ipc/evaluation.go` (architectural comparison: Wails v3 SingleInstance vs custom socket IPC)
  - `spike/ipc/coordinator_test.go` (table-driven tests, race detection, concurrency stress tests)

### Task US-002.1 Verification Evidence

#### 1. Unit & Race Detector Verification (`go test -v -race ./spike/ipc/...`)
```text
=== RUN   TestPrimaryStartupAndRole
--- PASS: TestPrimaryStartupAndRole (0.00s)
=== RUN   TestSecondaryConnectionAndTransmission
--- PASS: TestSecondaryConnectionAndTransmission (0.00s)
=== RUN   TestMultipleSecondaryTransmissions
--- PASS: TestMultipleSecondaryTransmissions (0.00s)
=== RUN   TestStaleSocketCleanup
--- PASS: TestStaleSocketCleanup (0.00s)
=== RUN   TestCleanShutdown
--- PASS: TestCleanShutdown (0.00s)
=== RUN   TestFallbackDirectoryHandling
=== RUN   TestFallbackDirectoryHandling/ValidXDGRuntimeDir
=== RUN   TestFallbackDirectoryHandling/FallbackToUserCacheWhenXDGUnset
=== RUN   TestFallbackDirectoryHandling/FallbackToTempDirWhenHomeAndXDGUnset
=== RUN   TestFallbackDirectoryHandling/FailsWhenNoDirAvailable
--- PASS: TestFallbackDirectoryHandling (0.00s)
    --- PASS: TestFallbackDirectoryHandling/ValidXDGRuntimeDir (0.00s)
    --- PASS: TestFallbackDirectoryHandling/FallbackToUserCacheWhenXDGUnset (0.00s)
    --- PASS: TestFallbackDirectoryHandling/FallbackToTempDirWhenHomeAndXDGUnset (0.00s)
    --- PASS: TestFallbackDirectoryHandling/FailsWhenNoDirAvailable (0.00s)
=== RUN   TestPayloadIntegrityWithUnicodeAndSpaces
--- PASS: TestPayloadIntegrityWithUnicodeAndSpaces (0.00s)
=== RUN   TestConcurrentSecondaryInstances
--- PASS: TestConcurrentSecondaryInstances (0.00s)
=== RUN   TestEvaluationMatrix
--- PASS: TestEvaluationMatrix (0.00s)
PASS
ok      markdown-viewer/spike/ipc       1.031s
```

#### 2. Static Analysis & Linting
- `goimports -l ./spike/ipc/` — Clean (0 issues)
- `gofmt -l ./spike/ipc/` — Clean (0 issues)
- `golangci-lint run ./spike/ipc/...` — Clean (0 issues)
- `govulncheck ./...` — Clean (0 vulnerabilities found)
- `GOOS=windows go build ./spike/ipc/...` — Cross-compilation verified (exit code 0)

#### 3. Wails v3 Native SingleInstance vs Custom Socket IPC Evaluation
| Dimension | Wails v3 Built-in (`SingleInstanceOptions`) | Custom Socket IPC (`ADR-0002` Coordinator) | Verdict for Spike Baseline |
|---|---|---|---|
| **Transport** | Linux: D-Bus session bus (`godbus/dbus`) + file lock; Win: Named mutex + Win32 window message; Mac: distributed notifications. | Local Unix Domain Socket (`0700` permissions) with POSIX `flock` lockfile on POSIX; Named Pipe on Windows. | Custom socket IPC operates without external D-Bus desktop daemon prerequisites. |
| **Testability** | Requires active `DBUS_SESSION_BUS_ADDRESS`. Fails in minimal containers or CI runners lacking D-Bus daemon. | Fully testable in headless CI, WSL2, containers, and table-driven race tests. | Custom socket IPC enables reliable automated CI verification. |
| **Security** | Access controlled to session bus; optional AES 32-byte key. | Strict OS file permissions (`0700` runtime dir, `0600` lockfile, `0700` socket). Strict UID control. No public ports. | Both fully satisfy `FR-OPEN-005`. |
| **Lifecycle Coupling** | Hardcoded inside `application.New()`. Immediately calls `os.Exit()` on second instance. | Modular Go package. Allows CLI parsing, pre-GUI argument normalization, or headless delegation. | Custom IPC coordinator offers superior separation of concerns. |
| **Recommendation** | Use for native desktop window activation where D-Bus/Win32 message routing is required. | Use for robust CLI IPC forwarding and headless automated verification. | Prototype validates both approaches; Task US-002.2 will wire coordination into application lifecycle. |

#### 4. Platform Deferrals
- Native Windows Named Pipe runtime execution and security descriptor verification deferred to Phase 6 native Windows host testing (`NOT RUN`).
- macOS Apple Silicon distributed notification / Launch Services verification deferred to Phase 6 Apple Silicon hardware testing (`NOT RUN`).
