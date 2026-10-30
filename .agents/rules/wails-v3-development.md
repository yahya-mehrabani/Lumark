---
trigger: model_decision
description: Trigger when working on Wails v3 app init, Go service bindings, windows/dialogs/events, wails3 CLI, or packaging.
---

# Wails v3 Development Standards

## Strict Version Guard
- **Wails v3 ONLY.** NEVER use v2 APIs, `wails.json` schemas, `wails.Run(...)`, or `@wailsapp/runtime` v2.
- Verify environment: `go version` (1.25+) and `wails3 doctor`.

## App & Services
- Follow existing `application.New(...)`, `NewService(...)`, and event emission patterns.
- Expose only necessary public Go methods. Keep helpers unexported to avoid binding clutter.
- Always return explicit `error` from Go methods; handle promise rejections in frontend.
- Use Wails v3 runtime APIs for dialogs, menus, and window controls.

## Generated Bindings
- **NEVER manually edit auto-generated binding files.**
- If Go signatures change, regenerate bindings via Taskfile/`wails3` and verify TypeScript compilation.

## Build & CLI
- Read `Taskfile.yml` and `build/` before building.
- **NEVER run `wails3 dev` as a blocking command** in the agent terminal. Validate via `wails3 build`, `go test ./...`, and frontend build scripts.
- WSL cross-builds only validate compilation, NOT native Windows WebView2 behavior.