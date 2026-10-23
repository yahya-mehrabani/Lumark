# ADR-0002: Single-Instance IPC Architecture & File Routing

- **Status:** PROPOSED (BASELINE FOR SPIKE)
- **Date:** 2026-10-23
- **Deciders:** Native Application Architecture

---

## 1. Context and Problem Statement

Requirement `FR-OPEN-005` specifies that the Markdown Viewer must run as a single instance per user session by default. When a user double-clicks a `.md` file or executes `markdown-viewer path/to/doc.md` while the application is already running:
1. The new process must detect the existing instance.
2. The new process must transmit the requested file paths to the existing instance.
3. The existing instance must bring its window to the foreground and open the documents in new tabs.
4. The secondary process must exit cleanly with code 0.
5. IPC must be strictly local, access-controlled to the current operating-system user, and must not bind to a public network port or localhost TCP port (avoiding firewall prompts and port-collision vulnerabilities).

---

## 2. Decision

We will implement an OS-specific, local-only IPC coordinator in the Go backend (`internal/instance/`):

### Windows
- Use a named mutex (`Global\` or `Local\MarkdownViewer_<SessionID>`) to detect existing instances.
- Use a local Named Pipe (`\\.\pipe\MarkdownViewer_<Username>_<Hash>`) with security attributes restricting access to the current user's SID.
- Secondary instance connects to the pipe, writes a length-prefixed JSON payload containing file paths and activation requests, waits for an acknowledgement byte, and exits.
- Primary instance receives paths, normalizes them, brings window to focus via Win32 API (`SetForegroundWindow`), and dispatches them to the document manager.

### Linux
- Use a Unix Domain Socket located in `$XDG_RUNTIME_DIR/markdown-viewer.sock` (mode `0700`, owner-only).
- If `$XDG_RUNTIME_DIR` is not set, fallback to a locked file in `~/.cache/markdown-viewer/`.
- File locking (`flock` on a lockfile) prevents race conditions during startup.

### macOS
- Primary mechanism: macOS natively routes document open events (`application:openFile:` and `application:openFiles:`) to the running `.app` bundle instance via Apple Events / Launch Services.
- For command-line invocations outside of `open`, use a Unix domain socket in `$TMPDIR/markdown-viewer-<uid>.sock`.

---

## 3. Alternatives Considered

### Alternative A: Localhost TCP Listener (e.g., `127.0.0.1:49152`)
- *Pros:* Simple cross-platform networking code.
- *Cons:* May trigger OS firewall warnings on Windows, susceptible to port scanning/hijacking by other local applications, risk of port collisions.
- *Reason for Rejection:* Prohibited by PRD Section 6.1 (`FR-OPEN-005` invariant: "IPC/instance coordination is local-only, access-controlled to the current user, and does not use a public network listener").

### Alternative B: File Polling / File Queue (Lockfile + JSON spool)
- *Pros:* Very simple to write.
- *Cons:* High latency (polling interval), file cleanup issues on crash, potential race conditions under rapid multi-file launches.
- *Reason for Rejection:* Lacks the responsiveness and reliability of socket/pipe IPC.

---

## 4. Consequences and Risks

### Consequences
- Requires clean platform separation under `internal/instance/instance_windows.go`, `instance_linux.go`, and `instance_darwin.go`.
- Stale sockets or lockfiles (e.g., after an unexpected SIGKILL or machine power failure) must be detected safely: the client attempts a ping connection before assuming a stale lockfile.

### Mitigation in Phase 1 Spike
- Story `US-002` will explicitly spike and validate this IPC mechanism on Linux and document Windows/macOS test requirements before full application wiring.
