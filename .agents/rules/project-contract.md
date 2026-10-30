---
trigger: always_on
---

# Project Contract

## Scope & Targets
- This is a Go + Wails v3 desktop Markdown Viewer.
- Target platforms: **Ubuntu Linux** and **Windows ONLY**. Mobile is out of scope.
- WSL Ubuntu is for Linux validation and cross-compilation ONLY. It does NOT replace native Windows GUI/runtime verification (report these separately).

## Architecture & Dependencies
- The PRD and existing codebase conventions are authoritative. Check alignment before coding.
- **NEVER** introduce new libraries, state management, CSS frameworks, or architectural layers without explicit user approval. If a request conflicts with the PRD, point it out first.

## Cross-Platform (Linux & Windows)
- Always use `filepath` (`filepath.Join`, `Clean`, `ToSlash`) in Go; NEVER hardcode `/` or `\`.
- Account for OS differences: permissions, line endings (`LF`/`CRLF`), case sensitivity, file watchers, and app-data dirs.
- Use Go build tags (`_linux.go`, `_windows.go`) for OS-specific logic ONLY when standard APIs fail.

## Boundary Separation
- **Go Backend:** File I/O, OS integration, heavy processing.
- **React Frontend:** Presentation, UI state, rendering.
- Preserve strict type contracts across Wails v3 bindings.