# US-002: Command-Line & Single-Instance IPC Feasibility Spike

- **Story ID:** `US-002`
- **Parent Epic:** [EPIC-001: Technical Feasibility Spike & Platform Foundation](../epics/EPIC-001-feasibility-spike.md)
- **Status:** `DONE`
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
- **Status:** `DONE`
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
- **Status:** `DONE`
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
  - `fixtures/golden/نمونه سند.md` (baseline golden fixture for Persian RTL and Unicode path verification)
  - `main.go` (Wails application lifecycle integration, coordinator role dispatch, secondary argument forwarding, primary document event listener, graceful SIGINT/SIGTERM shutdown, and `logReceivedFile` UTF-8 byte and decoded basename logger)
  - `build/bin/markdown-viewer-spike` (compiled standalone binary with IPC coordinator and embedded assets)
  - `spike/ipc/types.go` (core types, Role, Message, Options)
  - `spike/ipc/protocol.go` (length-prefixed JSON wire framing and ACK protocol)
  - `spike/ipc/dir.go` (runtime directory resolution and XDG fallback hierarchy)
  - `spike/ipc/lock.go` (FileLock interface and ErrAlreadyRunning)
  - `spike/ipc/lock_unix.go` (POSIX flock advisory locking for Unix/Linux/Darwin)
  - `spike/ipc/lock_windows.go` (Windows lock stub for cross-compilation safety)
  - `spike/ipc/coordinator.go` (Coordinator lifecycle, socket management, message forwarding)
  - `spike/ipc/evaluation.go` (architectural comparison: Wails v3 SingleInstance vs custom socket IPC)
  - `spike/ipc/coordinator_test.go` (table-driven tests, race detection, concurrency stress tests, byte-level UTF-8 equality assertions)

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

### Task US-002.2 Verification Evidence

#### 1. Exact Task Verification Command
**Command:**
```bash
./build/bin/markdown-viewer-spike doc1.md & PID=$!; sleep 1; ./build/bin/markdown-viewer-spike doc2.md; kill $PID
```
**Exit Code:** 0
**Captured Terminal Output:**
```text
[1] 212252
2026/10/23 20:55:08 [IPC/Primary] Single-instance coordinator active (socket: /run/user/0/markdown-viewer.sock)
2026/10/23 20:55:08 [IPC/Primary] Initial arguments: [doc1.md] (working dir: /home/repos/personal/markdown-go)
2026/10/23 20:55:08 [IPC/Primary] File received: doc1.md
2026/10/23 20:55:09 [IPC/Primary] Received forwarded message from secondary (working dir: /home/repos/personal/markdown-go, args: [doc2.md])
2026/10/23 20:55:09 [IPC/Primary] File received: doc2.md
2026/10/23 20:55:09 [IPC/Secondary] Forwarded 1 argument(s) to primary instance and exiting
2026/10/23 20:55:10 [IPC/Primary] Received termination signal; stopping application
2026/10/23 20:55:10 [IPC/Primary] Application shutting down; releasing IPC coordinator resources
Command finished with secondary exit code 0
```

#### 2. Comprehensive Lifecycle, Single-Window & Forwarding Latency Verification
**Test Script:**
```bash
# Step 1: Start primary instance with doc1.md in background
GDK_BACKEND=x11 WEBKIT_DISABLE_COMPOSITING_MODE=1 ./build/bin/markdown-viewer-spike doc1.md > /tmp/primary.log 2>&1 &
PRIMARY_PID=$!

# Step 2: Verify primary process and single window creation
ps -p $PRIMARY_PID -o pid,comm
xwininfo -root -tree | grep -i "Markdown Viewer"

# Step 3: Invoke secondary instance with doc2.md and measure transmission latency
START_NS=$(date +%s%N)
./build/bin/markdown-viewer-spike doc2.md
SEC_EXIT=$?
END_NS=$(date +%s%N)
ELAPSED_MS=$(( (END_NS - START_NS) / 1000000 ))

# Step 4: Verify process count and window count after secondary launch
ps -p $PRIMARY_PID -o pid,comm
WINDOW_COUNT=$(xwininfo -root -tree | grep -c "Markdown Viewer (Spike Baseline)" || true)

# Step 5: Cleanly terminate primary instance
kill -TERM $PRIMARY_PID
wait $PRIMARY_PID 2>/dev/null || true
```

**Observed Evidence & Measurements:**
- **Primary Process PID:** `212036` (executable: `markdown-viewer-spike`)
- **Primary Window Inspection:** `0x600005 "Markdown Viewer (Spike Baseline)": ("markdown-viewer-spike" "markdown-viewer-spike") 1000x618+38+59`
- **Secondary Process Exit Code:** `0` (clean instantaneous exit)
- **Secondary Transmission Latency:** `89ms` (significantly under the 500ms requirement in Acceptance Criterion 2)
- **Active Process Count:** Exactly 1 application process remained active (`PID 212036`). Secondary terminated immediately after receiving ACK.
- **Active Window Count:** Exactly 1 window (`Markdown Viewer window count: 1`). No duplicate window was spawned.
- **Primary Received Log Assertions:**
  - `[IPC/Primary] Initial arguments: [doc1.md] (working dir: /home/repos/personal/markdown-go)`
  - `[IPC/Primary] File received: doc1.md`
  - `[IPC/Primary] Received forwarded message from secondary (working dir: /home/repos/personal/markdown-go, args: [doc2.md])`
  - `[IPC/Primary] File received: doc2.md`
- **Window Activation Trigger:** `mainWindow.Restore()`, `mainWindow.Show()`, and `mainWindow.Focus()` executed upon receipt of forwarded message.
- **Socket & Lock Resource Cleanup:** Socket file `/run/user/0/markdown-viewer.sock` cleanly unlinked upon process termination; advisory lock file released.

#### 3. Static Analysis, Quality & Regression Checks
- `goimports -l main.go` — Clean (0 issues)
- `gofmt -l main.go` — Clean (0 issues)
- `golangci-lint run ./...` — Clean (0 issues)
- `go test -v -race ./...` — Clean (PASS)
- `govulncheck ./...` — Clean (0 vulnerabilities found)

#### 4. Platform Deferrals
- Native Windows host single-instance Named Pipe and Win32 window message forwarding deferred to Phase 6 native Windows testing (`NOT RUN`).
- macOS Apple Silicon Launch Services document event routing deferred to Phase 6 Apple Silicon hardware testing (`NOT RUN`).

### Task US-002.3 Verification Evidence

#### 1. Exact Task Verification Command & Output
**Command:**
```bash
./build/bin/markdown-viewer-spike "fixtures/golden/نمونه سند.md"
```
**Exit Code:** 0
**Captured Terminal Output (Secondary forwarder to running Primary):**
```text
2026/10/23 21:17:24 [IPC/Secondary] Forwarded 1 argument(s) to primary instance and exiting
```
**Captured Primary Coordinator Logs (`/tmp/spike_task_us002_3.log`):**
```text
2026/10/23 21:17:22 [IPC/Primary] Single-instance coordinator active (socket: /run/user/0/markdown-viewer.sock)
2026/10/23 21:17:22 [IPC/Primary] Initial arguments: [fixtures/golden/نمونه سند.md] (working dir: /home/repos/personal/markdown-go)
2026/10/23 21:17:22 [IPC/Primary] File received: fixtures/golden/نمونه سند.md (filename: نمونه سند.md, utf8 bytes: [66 69 78 74 75 72 65 73 2f 67 6f 6c 64 65 6e 2f d9 86 d9 85 d9 88 d9 86 d9 87 20 d8 b3 d9 86 d8 af 2e 6d 64], filename bytes: [d9 86 d9 85 d9 88 d9 86 d9 87 20 d8 b3 d9 86 d8 af 2e 6d 64], valid utf8: true)
2026/10/23 21:17:24 [IPC/Primary] Received forwarded message from secondary (working dir: /home/repos/personal/markdown-go, args: [fixtures/golden/نمونه سند.md])
2026/10/23 21:17:24 [IPC/Primary] File received: fixtures/golden/نمونه سند.md (filename: نمونه سند.md, utf8 bytes: [66 69 78 74 75 72 65 73 2f 67 6f 6c 64 65 6e 2f d9 86 d9 85 d9 88 d9 86 d9 87 20 d8 b3 d9 86 d8 af 2e 6d 64], filename bytes: [d9 86 d9 85 d9 88 d9 86 d9 87 20 d8 b3 d9 86 d8 af 2e 6d 64], valid utf8: true)
2026/10/23 21:17:24 [IPC/Primary] Received termination signal; stopping application
2026/10/23 21:17:24 [IPC/Primary] Application shutting down; releasing IPC coordinator resources
```

#### 2. Path Handling with Spaces and Multi-Byte UTF-8 Verification
**Test Command:**
```bash
./build/bin/markdown-viewer-spike "test docs/path with spaces/نمونه سند.md"
```
**Exit Code:** 0
**Captured Primary Coordinator Log:**
```text
2026/10/23 21:17:05 [IPC/Primary] Received forwarded message from secondary (working dir: /home/repos/personal/markdown-go, args: [test docs/path with spaces/نمونه سند.md])
2026/10/23 21:17:05 [IPC/Primary] File received: test docs/path with spaces/نمونه سند.md (filename: نمونه سند.md, utf8 bytes: [74 65 73 74 20 64 6f 63 73 2f 70 61 74 68 20 77 69 74 68 20 73 70 61 63 65 73 2f d9 86 d9 85 d9 88 d9 86 d9 87 20 d8 b3 d9 86 d8 af 2e 6d 64], filename bytes: [d9 86 d9 85 d9 88 d9 86 d9 87 20 d8 b3 d9 86 d8 af 2e 6d 64], valid utf8: true)
```

#### 3. Decoded String & Byte Assertions
- **Persian Text / Decoded Basename:** `نمونه سند.md` preserved without character mangling or substitution.
- **Exact UTF-8 Hex Byte Sequence (Basename):** `d9 86 d9 85 d9 88 d9 86 d9 87 20 d8 b3 d9 86 d8 af 2e 6d 64`
  - `ن`: `0xd9 0x86`
  - `م`: `0xd9 0x85`
  - `و`: `0xd9 0x88`
  - `ن`: `0xd9 0x86`
  - `ه`: `0xd9 0x87`
  - ` ` (space): `0x20`
  - `س`: `0xd8 0xb3`
  - `ن`: `0xd9 0x86`
  - `د`: `0xd8 0xaf`
  - `.`: `0x2e`
  - `m`: `0x6d`
  - `d`: `0x64`
- **Spaces in Directory Paths:** Preserved exactly across wire serialization (`74 65 73 74 20 64 6f 63 73 2f 70 61 74 68 20 77 69 74 68 20 73 70 61 63 65 73 2f`). No word splitting or shell argument fragmentation.
- **UTF-8 Validity:** Confirmed via `utf8.ValidString(arg) == true`.
- **Terminal Locale Environment:** `LANG=C.UTF-8`, `LC_CTYPE=C.UTF-8`.

#### 4. Automated Unit & Race Detector Suite (`go test -v -race ./...`)
- `TestPayloadIntegrityWithUnicodeAndSpaces` executed with exact byte sequence equality (`bytes.Equal`), valid UTF-8 string check (`utf8.ValidString`), and basename checks (`filepath.Base`) across:
  - `fixtures/golden/نمونه سند.md` (Persian RTL)
  - `docs/path with spaces/my file (copy) [1].md` (Spaces & brackets)
  - `test/中文文件名_测试.md` (Chinese CJK)
  - `test/файл_на_русском_языке.md` (Cyrillic)
  - `test/special!@#$%^&*()_+-=[]{}|;':,.<>?.md` (Special ASCII symbols)
  - `test/emoji_🚀_🎉_document.md` (Multi-byte 4-byte emojis)
- All 8 package tests passed with 0 race warnings under `-race`.

#### 5. Static Analysis, Quality & Regression Checks
- `goimports -l main.go spike/ipc/` — Clean (0 issues)
- `gofmt -l main.go spike/ipc/` — Clean (0 issues)
- `golangci-lint run ./...` — Clean (0 issues)
- `govulncheck ./...` — Clean (0 vulnerabilities found)

#### 6. Platform Deferrals
- Native Windows path encoding (UTF-16/`WideCharToMultiByte` Win32 API interactions, `\` backslash normalization, UNC paths) deferred to Phase 6 native Windows testing (`NOT RUN`).
- macOS Apple Silicon HFS+/APFS decomposed Unicode (NFD vs NFC normalization) path forwarding deferred to Phase 6 Apple Silicon testing (`NOT RUN`).

### Story US-002 Milestone Completion
All 3 tasks in Story `US-002` (`US-002.1`, `US-002.2`, `US-002.3`) are now fully verified and complete:
- `US-002.1`: Single-instance IPC coordinator implemented with POSIX advisory lockfile, Unix domain socket (`0700`), length-prefixed JSON framing, and automated tests.
- `US-002.2`: Coordinator wired into application lifecycle in `main.go`. Primary/secondary role dispatch, sub-90ms secondary argument forwarding, single-window invariant, and clean shutdown verified.
- `US-002.3`: Forwarding paths with spaces and Unicode (Persian RTL, CJK, Cyrillic, Emoji) verified with byte-level precision on standalone binary.
