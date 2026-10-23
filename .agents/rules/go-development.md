---
trigger: model_decision
description: Trigger when editing, reviewing, testing, or debugging Go files (.go), updating go.mod/go.sum, running go test/vet/golangci-lint/govulncheck, or resolving Go toolchain and concurrency issues.
---

# Go Development Standards

## Toolchain and Module Verification
- Before writing or modifying Go code, inspect `go.mod`, `go.sum`, package layout, and the active Go version via `go version`.
- Respect the minimum Go version declared in `go.mod` and framework prerequisites (e.g., Wails v3 requires Go 1.25+).
- Write idiomatic Go using standard library packages first before reaching for third-party libraries.
- Avoid premature interfaces, speculative generics, global mutable state, and over-engineered package hierarchies.

## Formatting and Code Hygiene
- Always run `gofmt` (and `goimports` if available) on modified `.go` files before completing a task.
- Never reformat untouched files outside the scope of the current task.
- Match the repository's established naming conventions, receiver types, package boundaries, and comment styles.

## Error Handling and Concurrency
- Handle all errors explicitly; never discard errors with `_` unless documented with a clear technical reason.
- Wrap errors with `fmt.Errorf("context: %w", err)` to preserve error chains for `errors.Is` and `errors.As`.
- Pass `context.Context` as the first parameter in I/O, network, long-running, or cancellable operations.
- Prevent goroutine leaks: ensure every spawned goroutine has a deterministic termination path, cancellation signal, and proper synchronization (`sync.Mutex`, `errgroup`, or channels).
- Always close or clean up OS resources, files, and streams using `defer`.

## Dependency Management
- NEVER modify `go.mod` or `go.sum` unless the task explicitly requires adding, updating, or removing a dependency.
- Never use `@latest` when adding application dependencies without verifying version compatibility.
- Never downgrade or upgrade the `go` or `toolchain` directive in `go.mod` silently.
- When imports or dependencies legitimately change, run `go mod tidy` and inspect `git diff go.mod go.sum` to confirm no unintended changes occurred.

## Testing and Static Analysis
- Add or update unit tests (preferring table-driven tests with `t.Run`) for every behavior change or bug fix.
- Test exported contracts, observable state, and edge cases rather than private implementation internals.
- Execute targeted package tests (`go test ./path/to/pkg`) during iteration, followed by `go test ./...` and `go vet ./...` from the module root.
- Run `golangci-lint run` when available. Note: This environment uses `golangci-lint` v2; if editing `.golangci.yml`, strictly use v2 schema syntax.
- Run `govulncheck ./...` when modifying security-sensitive code or external dependencies.