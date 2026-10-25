# US-028: Fault Isolation, User-Facing Error Notifications & Local Diagnostics

- **Story ID:** `US-028`
- **Parent Epic:** [EPIC-007: Settings, Persistence & Durability](../epics/EPIC-007-settings-durability.md)
- **Status:** `IN_PROGRESS`
- **Assigned Phase:** Phase 5 (Reading Experience & Durability)

---

## 1. Objective and Expected Outcome

Deliver fault isolation, accessible error notifications, and a privacy-preserving local diagnostics logger:
1. Present plain-language, actionable error messages for file I/O failures, oversized documents, and corrupted inputs without exposing raw stack traces.
2. Isolate component failures (malformed KaTeX, broken Mermaid, missing images, invalid HTML) so that a failure in one section never blanks the window or breaks other tabs.
3. Provide an optional local diagnostics log file in the user config directory (`~/.config/markdown-viewer/app.log` or `%APPDATA%\MarkdownViewer\app.log`).
4. Strict privacy compliance: Logs must **never** record document body text or credentials, and must sanitize sensitive path segments by default.
5. Log files must rotate and remain bounded (maximum 5 MiB total disk space).

---

## 2. Source PRD Requirements

- **FR-ERR-001:** Actionable errors (Plain language, next action, no raw stack traces).
- **FR-ERR-002:** Fault isolation (Component errors do not crash app or corrupt settings).
- **FR-ERR-003:** Local diagnostics (Bounded local log without document text).
- **PRD Section 8.4:** Privacy invariants (Zero telemetry, zero remote log reporting).

---

## 3. Dependencies

- **Prerequisites:** [US-005](US-005-native-document-service.md) and [US-025](US-025-settings-service-persistence.md).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - `internal/diagnostics/logger.go` with size-based rotation.
  - React Error Boundary at root and per-tab level.
  - Accessible Toast / Notification UI component.
- **Explicit Exclusions:**
  - Remote Sentry, Datadog, or crash-reporting services (prohibited by PRD).

---

## 5. Observable Acceptance Criteria

1. Attempting to open an unreadable file (e.g. permission denied) displays a toast: "Cannot read file: Permission denied" with a "Choose Another File" button.
2. A document containing a JavaScript syntax error in an unhandled custom plugin is caught by the tab ErrorBoundary; the tab displays an error card, but other open tabs remain functional.
3. The diagnostics log records startup timestamps, log level, and component errors without document text.
4. When `app.log` reaches 5 MiB, it rotates to `app.log.1` and discards older logs.
5. Zero remote network calls occur on application errors.

---

## 6. Implementation Tasks

### Task US-028.1: Implement Go bounded rotating logger
- **Task ID:** `US-028.1`
- **Status:** `DONE`
- **Dependencies:** None
- **Completion Criteria:** Structured logger writes to file, rotates at 5 MiB, redacts file paths, masks document contents, and excludes credentials and file history (AUD-011).
- **Verification Command:** `go test -v -run TestDiagnosticsLog ./internal/diagnostics/...`
- **Expected Observable Result:** Diagnostics logs bounded to 5 MiB with rotation; document contents, credentials, and tokens excluded.
- **Evidence to Record:** Diagnostics log test output.
- **Environment Handling:** Standard Go toolchain environment.

### Task US-028.2: Implement frontend React Error Boundaries
- **Task ID:** `US-028.2`
- **Status:** `DONE`
- **Dependencies:** `US-028.1`
- **Completion Criteria:** ErrorBoundary wraps tab content; renders fallback UI on crash.
- **Verification Command:** `npm run test:unit -- error-boundary`
- **Expected Observable Result:** Component error boundary catches rendering faults and displays recovery UI.
- **Evidence to Record:** Error boundary test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-028.3: Implement ToastNotification component
- **Task ID:** `US-028.3`
- **Status:** `DONE`
- **Dependencies:** `US-028.2`
- **Completion Criteria:** Accessible toast banner (WCAG AA) with auto-dismiss and close button.
- **Verification Command:** `npm run test:unit -- error-toasts`
- **Expected Observable Result:** Plain-language error toasts display for file errors without raw stack traces.
- **Evidence to Record:** Toast component test output.
- **Environment Handling:** Node.js / Vitest environment.

### Task US-028.4: Write unit tests for logging and fault isolation
- **Task ID:** `US-028.4`
- **Status:** `READY`
- **Dependencies:** `US-028.3`
- **Completion Criteria:** Tests assert document text absence from log files and rotation triggers.
- **Verification Command:** `go test -v -race ./internal/diagnostics/...`
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Run unit tests: `go test -v -race ./internal/diagnostics/...`.
2. Inspect generated log file: verify timestamps, error codes, and absence of document content.
3. Trigger artificial component error in test tab: verify adjacent tabs stay interactive.

---

## 8. Known Risks and Blockers

- Accidental path leakage in error logs on multi-user systems. Apply path anonymization helper (e.g., replacing `/home/username/` with `~/`).

---

## 9. Implementation Notes and Validation Evidence

- **Execution Date:** 2026-10-25
- **Agent ID:** Antigravity Autonomous Story Runner
- **Changed Files:**
  - `internal/diagnostics/types.go`
  - `internal/diagnostics/sanitize.go`
  - `internal/diagnostics/logger.go`
  - `internal/diagnostics/logger_test.go`
- **Terminal Output & Verification Evidence:**

#### Task US-028.1: Implement Go bounded rotating logger (`DONE`)
```text
=== RUN   TestDiagnosticsLog_DefaultOptions
--- PASS: TestDiagnosticsLog_DefaultOptions (0.00s)
=== RUN   TestDiagnosticsLog_Rotation
    logger_test.go:95: Rotation verified: active app.log = 218 bytes, backup app.log.1 = 218 bytes, total = 436 bytes
--- PASS: TestDiagnosticsLog_Rotation (0.00s)
=== RUN   TestDiagnosticsLog_PathRedaction
=== RUN   TestDiagnosticsLog_PathRedaction/User_home_document_path
=== RUN   TestDiagnosticsLog_PathRedaction/Direct_user_home
=== RUN   TestDiagnosticsLog_PathRedaction/Generic_Linux_user_home
=== RUN   TestDiagnosticsLog_PathRedaction/Generic_macOS_user_home
=== RUN   TestDiagnosticsLog_PathRedaction/System_path_outside_home
--- PASS: TestDiagnosticsLog_PathRedaction (0.00s)
=== RUN   TestDiagnosticsLog_CredentialRedaction
=== RUN   TestDiagnosticsLog_CredentialRedaction/Bearer_token
=== RUN   TestDiagnosticsLog_CredentialRedaction/Basic_auth
=== RUN   TestDiagnosticsLog_CredentialRedaction/Password_key-value
=== RUN   TestDiagnosticsLog_CredentialRedaction/API_key_key-value
=== RUN   TestDiagnosticsLog_CredentialRedaction/JWT_token
=== RUN   TestDiagnosticsLog_CredentialRedaction/PEM_Private_Key_block
--- PASS: TestDiagnosticsLog_CredentialRedaction (0.00s)
=== RUN   TestDiagnosticsLog_DocumentContentAndHistoryMasking
--- PASS: TestDiagnosticsLog_DocumentContentAndHistoryMasking (0.00s)
=== RUN   TestDiagnosticsLog_ConcurrentWrites
    logger_test.go:299: Concurrent test successfully wrote 55 lines in active log
--- PASS: TestDiagnosticsLog_ConcurrentWrites (0.02s)
PASS
ok      markdown-viewer/internal/diagnostics    0.033s

Linter Verification:
/root/go/bin/golangci-lint run ./internal/diagnostics/... -> 0 issues
```

#### Task US-028.2: Implement frontend React Error Boundaries (`DONE`)
```text
RUN  v5.0.5 /home/repos/personal/markdown-go/frontend

 ✓ src/features/errors/error-boundary.test.tsx (7 tests) 373ms
   ✓ ErrorBoundary (7)
     ✓ renders children when no error occurs 62ms
     ✓ catches rendering errors and displays accessible fallback UI 52ms
     ✓ calls onError callback with error details when crash occurs 17ms
     ✓ resets error state when Try Again is clicked and condition is resolved 141ms
     ✓ invokes onCloseTab when Close Tab button is clicked 29ms
     ✓ supports custom fallback render function 9ms
     ✓ isolates tab crashes in AppShell so adjacent tabs remain fully functional 58ms

 Test Files  1 passed (1)
      Tests  7 passed (7)
   Duration  2.28s

Regression Checks:
npm run test:unit -- shell -> 5 passed (5), 39 passed (39) in 9.57s
npm run build:dev -> built in 7.62s with 0 errors
```

#### Task US-028.3: Implement ToastNotification component (`DONE`)
```text
RUN  v5.0.5 /home/repos/personal/markdown-go/frontend

 ✓ src/features/notifications/error-toasts.test.tsx (11 tests) 224ms
   ✓ Error Toasts & Notifications (11)
     ✓ normalizeErrorMessage (Plain Language & Stack Trace Stripping) (5)
       ✓ normalizes permission denied errors and suggests Choose Another File action 10ms
       ✓ normalizes file not found errors 2ms
       ✓ normalizes oversized file errors exceeding 20 MiB limit 1ms
       ✓ normalizes unsupported file formats 1ms
       ✓ strips raw JavaScript stack traces from unexpected errors 1ms
     ✓ ToastNotification Accessibility & Interaction (4)
       ✓ renders with WCAG AA alert role and assertive live region for error toasts 105ms
       ✓ renders action button and executes callback when clicked 39ms
       ✓ auto-dismisses after durationMs elapses 6ms
       ✓ dismisses when close button is clicked 13ms
     ✓ ToastStore & ToastContainer Integration (2)
       ✓ displays error toast with Choose Another File button when showError is called 28ms
       ✓ dismisses newest toast on Escape key press 12ms

 Test Files  1 passed (1)
      Tests  11 passed (11)
   Duration  1.45s

Regression Checks:
npm run test:unit -- error-boundary -> 1 passed (1), 7 passed (7) in 1.42s
```
