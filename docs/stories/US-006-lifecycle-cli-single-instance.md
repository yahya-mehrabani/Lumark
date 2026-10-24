# US-006: Application Lifecycle, Command-Line Parsing & Single-Instance Routing

- **Story ID:** `US-006`
- **Parent Epic:** [EPIC-002: Core Native Application Lifecycle & Tab Management](../epics/EPIC-002-native-lifecycle-tabs.md)
- **Status:** `IN_PROGRESS` (Task US-006.1 complete; CLI argument parsing and path normalization verified)
- **Assigned Phase:** Phase 2 (Core Application Structure)

---

## 1. Objective and Expected Outcome

Implement the production application startup lifecycle, CLI argument parsing, and single-instance routing in Go (`internal/application/` and `internal/instance/`):
1. Parse CLI arguments for file paths, flags, and options.
2. Coordinate with any existing instance per user session via local IPC (Unix Domain Socket / Named Pipe).
3. If already running, dispatch file paths to the existing instance, request window focus, and terminate the secondary process with exit code 0.
4. If primary instance, start the local IPC listener, initialize Wails runtime, and route initial CLI paths to the frontend.

---

## 2. Source PRD Requirements

- **FR-OPEN-004:** Open from command line or OS launch event.
- **FR-OPEN-005:** Single-instance file routing (Local access-controlled IPC).
- **PRD Section 5.3 & 9.1:** Native lifecycle, open-file router, and instance coordinator.

---

## 3. Dependencies

- **Prerequisites:** [US-005](US-005-native-document-service.md) (DocumentService available).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - `internal/application/lifecycle.go` and `internal/instance/coordinator.go`.
  - Windows named pipe and Linux domain socket implementations.
  - Multi-file argument forwarding (e.g., `markdown-viewer doc1.md doc2.md doc3.md`).
- **Explicit Exclusions:**
  - Network sockets or remote listeners.

---

## 5. Observable Acceptance Criteria

1. `markdown-viewer file1.md file2.md` opens both files in tabs upon fresh launch.
2. Launching `markdown-viewer file3.md` while running forwards `file3.md` to running window; secondary process exits cleanly within 500ms.
3. Rapid simultaneous secondary launches (e.g., shell loop with 5 files) queue and open all 5 files without dropping any path.
4. If primary process crashed uncleanly, secondary detects stale lock/socket, cleans it up, and successfully becomes primary.

---

## 6. Implementation Tasks

### Task US-006.1: Implement CLI argument parser and path normalizer
- **Task ID:** `US-006.1`
- **Status:** `DONE`
- **Dependencies:** None
- **Completion Criteria:** Resolves relative paths to absolute canonical paths.
- **Verification Command:** `go test -v -run TestCLIArgParsing ./internal/instance/...`
- **Expected Observable Result:** CLI arguments parsed and normalized to absolute canonical filesystem paths.
- **Evidence to Record:** CLI argument parsing unit test output.
- **Environment Handling:** Standard Go toolchain environment.

### Task US-006.2: Implement production instance coordinator with fallback
- **Task ID:** `US-006.2`
- **Status:** `READY`
- **Dependencies:** `US-006.1`
- **Completion Criteria:** IPC server and client handle connect, transmit, ack, and stale socket recovery.
- **Verification Command:** `go test -v -run TestInstanceCoordinator ./internal/instance/...`
- **Expected Observable Result:** IPC coordination, message transmission, and stale socket cleanup pass.
- **Evidence to Record:** Instance coordinator unit test output.
- **Environment Handling:** Standard Go toolchain environment.

### Task US-006.3: Wire Wails window focus and event dispatching
- **Task ID:** `US-006.3`
- **Status:** `DRAFT`
- **Dependencies:** `US-006.2`
- **Completion Criteria:** Primary instance calls `runtime.WindowShow` and emits `wails:open-document` event.
- **Verification Command:** `go test -v -run TestWindowEventDispatch ./internal/instance/...`
- **Expected Observable Result:** Event emission verified for document open requests.
- **Evidence to Record:** Event dispatching unit test output.
- **Environment Handling:** Standard Go toolchain environment.

### Task US-006.4: Write unit and integration tests for instance coordinator
- **Task ID:** `US-006.4`
- **Status:** `DRAFT`
- **Dependencies:** `US-006.3`
- **Completion Criteria:** Unit tests verify concurrency, payload serialization, and stale cleanup.
- **Verification Command:** `go test -v -race ./internal/instance/...`
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Start app in background: `./build/bin/markdown-viewer &`.
2. Run: `./build/bin/markdown-viewer test.md`.
3. Check exit code: `0`. Check primary window: `test.md` opened.

---

## 8. Known Risks and Blockers

- OS permissions issues in multi-user environments (socket path must incorporate user UID or SID).

---

## 9. Implementation Notes and Validation Evidence

### Task US-006.1 Evidence (2026-10-24)
- **Execution Date:** 2026-10-24
- **Agent ID:** Autonomous Story Runner
- **Changed Files:** `internal/instance/cli.go`, `internal/instance/cli_test.go`
- **Verification Command:** `go test -v -run TestCLIArgParsing ./internal/instance/...`
- **Terminal Output & Verification Evidence:**
```text
=== RUN   TestCLIArgParsing
=== RUN   TestCLIArgParsing/EmptyArgs
=== RUN   TestCLIArgParsing/SingleFileRelative
=== RUN   TestCLIArgParsing/MultipleFilesRelative
=== RUN   TestCLIArgParsing/AbsolutePaths
=== RUN   TestCLIArgParsing/RelativeWithDotDot
=== RUN   TestCLIArgParsing/PathsWithSpaces
=== RUN   TestCLIArgParsing/UnicodePaths
=== RUN   TestCLIArgParsing/HelpFlag
=== RUN   TestCLIArgParsing/VersionFlag
=== RUN   TestCLIArgParsing/UnrecognizedFlags
=== RUN   TestCLIArgParsing/DefaultWorkingDirResolution
=== RUN   TestCLIArgParsing/WindowsStyleDriveLetter
--- PASS: TestCLIArgParsing (0.00s)
    --- PASS: TestCLIArgParsing/EmptyArgs (0.00s)
    --- PASS: TestCLIArgParsing/SingleFileRelative (0.00s)
    --- PASS: TestCLIArgParsing/MultipleFilesRelative (0.00s)
    --- PASS: TestCLIArgParsing/AbsolutePaths (0.00s)
    --- PASS: TestCLIArgParsing/RelativeWithDotDot (0.00s)
    --- PASS: TestCLIArgParsing/PathsWithSpaces (0.00s)
    --- PASS: TestCLIArgParsing/UnicodePaths (0.00s)
    --- PASS: TestCLIArgParsing/HelpFlag (0.00s)
    --- PASS: TestCLIArgParsing/VersionFlag (0.00s)
    --- PASS: TestCLIArgParsing/UnrecognizedFlags (0.00s)
    --- PASS: TestCLIArgParsing/DefaultWorkingDirResolution (0.00s)
    --- PASS: TestCLIArgParsing/WindowsStyleDriveLetter (0.00s)
PASS
ok      markdown-viewer/internal/instance       0.004s
```
- **Linter Output:** `golangci-lint run ./internal/instance/...` -> 0 issues.
- **Vulnerability Check:** `govulncheck ./internal/instance/...` -> No vulnerabilities found.
- **Cross-Platform Verification Boundary:** Linux WSL2 execution PASS. Windows native execution deferred to post-implementation cross-platform validation (NOT RUN).
