---
trigger: model_decision
description: Trigger when working on Wails v3 app initialization, Go service bindings, desktop windows/dialogs/events, wails3 CLI commands (dev, build, doctor, task), or cross-platform packaging.
---

# Wails v3 Development Standards

## Strict Wails v3 Version Guard
- This project uses **Wails v3** exclusively.
- NEVER use Wails v2 APIs, `wails.json` schemas, `wails.Run(&options.App{...})` v2 patterns, or `@wailsapp/runtime` v2 imports.
- Before diagnosing toolchain or build failures, verify the environment with `go version` (must be Go 1.25+) and `wails3 doctor`.

## Application and Service Architecture
- Follow the project's established `application.New(...)` initialization, service registration (`application.NewService(...)`), window creation, and event emission patterns.
- Expose only necessary public methods on registered Go service structs; keep internal helpers unexported so Wails binding generation remains clean.
- Return explicit `error` values from bound Go service methods and handle rejected promises properly on the frontend.
- Use Wails v3 runtime APIs for dialogs, menus, window controls, and custom events consistently with existing codebase usage.

## Generated Bindings Discipline
- NEVER manually edit auto-generated Wails v3 binding files in the frontend directory.
- Whenever you add, rename, or change the signature of an exported Go service method or struct, regenerate bindings using the project's documented `wails3` / Taskfile command and verify frontend TypeScript compilation.

## Build and CLI Workflow
- Inspect `Taskfile.yml` and the `build/` directory before running any build or packaging command.
- Do NOT execute `wails3 dev` as a blocking foreground command in the agent terminal during automated verification; instead, validate using `wails3 build`, `go test ./...`, and frontend build/typecheck scripts.
- Use `wails3 task` or the repository's configured task runner commands for platform-specific builds.
- Remember that a passing Windows cross-build inside WSL only validates compilation, not native Windows WebView2 runtime behavior.