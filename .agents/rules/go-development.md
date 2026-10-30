---
trigger: model_decision
description: Trigger when editing, reviewing, or testing Go files, updating go.mod, or running Go toolchain commands.
---

# Go Development Standards

## Toolchain & Hygiene
- Inspect `go.mod`, `go.sum`, and `go version` first. Respect the minimum Go version.
- Write idiomatic Go. Avoid premature interfaces, generics, or global state.
- Run `gofmt` and `goimports` on modified files. Do not reformat unrelated files.
- **NEVER** modify `go.mod`/`go.sum` unless explicitly required. Run `go mod tidy` and check the diff.

## Errors & Concurrency
- Handle all errors explicitly. NEVER discard with `_` without a documented reason.
- Wrap errors using `fmt.Errorf("context: %w", err)`.
- Pass `context.Context` as the first parameter for I/O or cancellable operations.
- Prevent goroutine leaks with clear termination paths, `sync.Mutex`, `errgroup`, or channels.
- Close/clean up resources with `defer`.

## Testing & Static Analysis
- Add table-driven unit tests (`t.Run`) for all behavior changes and bug fixes.
- Test exported contracts and edge cases, not internals.
- Run: `go test ./...`, `go vet ./...`, and `golangci-lint run` (Note: uses v2 schema).
- Run `govulncheck ./...` for security-sensitive changes.