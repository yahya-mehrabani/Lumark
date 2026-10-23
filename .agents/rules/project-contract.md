---
trigger: always_on
---

# Project Contract

## Product Scope and Target Platforms
- This repository contains a desktop Markdown Viewer built with Go and Wails v3.
- Target platforms are **Ubuntu Linux** and **Windows** only. iOS and mobile targets are strictly out of scope.
- Development runs inside WSL Ubuntu, which serves for Linux validation and cross-compilation—NOT as a substitute for native Windows GUI/runtime verification.

## Requirements and Architectural Boundaries
- Treat the project's PRD, architecture documents, and existing codebase conventions as authoritative.
- Before implementing any feature, verify alignment with approved requirements and existing module boundaries.
- NEVER introduce new libraries, state management tools, CSS frameworks, or architectural layers without explicit justification and user approval.
- If a user request conflicts with the PRD or established architecture, point out the conflict and propose options before writing code.

## Cross-Platform Compatibility (Linux & Windows)
- Always use `filepath` (`filepath.Join`, `filepath.Clean`, `filepath.ToSlash`) instead of hardcoded `/` or `\` path separators in Go code.
- Account for OS differences in file permissions, line endings (`LF` vs `CRLF`), case sensitivity, file watchers, and local app-data directories.
- Isolate OS-specific implementations using Go build tags (`_linux.go`, `_windows.go`) or small platform adapters only when standard cross-platform APIs are insufficient.
- Always report verification status separately for: (1) WSL/Ubuntu Linux, and (2) Native Windows (noting when Windows runtime checks require manual testing on the host OS).

## Backend / Frontend Separation
- Keep file I/O, Markdown parsing/indexing (unless explicitly client-side in architecture), OS integration, and heavy processing inside Go backend services.
- Keep presentation, UI state, and view rendering inside the frontend directory.
- Preserve strict type contracts across Go service methods and generated Wails v3 frontend bindings.