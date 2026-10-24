# US-005: Native Document Service & Secure File Loading

- **Story ID:** `US-005`
- **Parent Epic:** [EPIC-002: Core Native Application Lifecycle & Tab Management](../epics/EPIC-002-native-lifecycle-tabs.md)
- **Status:** `IN_PROGRESS` (Phase 2 core native service implementation in progress)
- **Assigned Phase:** Phase 2 (Core Application Structure)

---

## 1. Objective and Expected Outcome

Implement the Go backend `DocumentService` in `internal/documents/` to:
1. Accept an absolute file path and validate that its extension is supported (`.md`, `.markdown`, `.mdown`, `.mkd`).
2. Enforce the 20 MiB document size limit, returning a clear error if exceeded.
3. Read raw file bytes, strip or normalize UTF-8 BOM, validate UTF-8 encoding, and replace invalid bytes with the Unicode replacement character (`\uFFFD`) without crashing.
4. Return a structured `DocumentDTO` (path, fileName, content, fileSizeBytes, lastModified, isReadOnly).

---

## 2. Source PRD Requirements

- **FR-OPEN-001:** Open a document (File reading and Unicode handling).
- **FR-ERR-001 & FR-ERR-002:** Actionable errors and fault isolation.
- **PRD Section 7.3:** Pipeline steps 1 & 2 (Byte reading, size check, UTF-8 decode/replacement).
- **PRD Section 9.5:** Document size limit (20 MiB maximum).
- **PRD Section 12.4:** Compatibility (Graceful UTF-8, BOM handling).

---

## 3. Dependencies

- **Prerequisites:** [EPIC-001](../epics/EPIC-001-feasibility-spike.md) (Feasibility spike validated).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - `internal/documents/service.go` and `dto.go`.
  - Comprehensive unit test suite covering empty files, BOMs, oversized files, invalid extensions, and permission errors.
- **Explicit Exclusions:**
  - Frontend UI components (handled in US-007).
  - File watching on disk (handled in US-027).

---

## 5. Observable Acceptance Criteria

1. Loading a valid UTF-8 `.md` file returns exact text and metadata.
2. Loading a file > 20 MiB returns structured error code `FILE_TOO_LARGE` without allocating the entire file into memory.
3. Loading a file with UTF-8 BOM (`\xEF\xBB\xBF`) strips the BOM cleanly from content.
4. Loading a file with invalid byte sequences replaces them with `\uFFFD` and returns a non-fatal warning flag.
5. Path normalization preserves Linux case-sensitivity and converts Windows backslashes appropriately.

---

## 6. Implementation Tasks

### Task US-005.1: Define DocumentDTO and DocumentService interface
- **Task ID:** `US-005.1`
- **Status:** `DONE`
- **Dependencies:** None
- **Completion Criteria:** Interface defined with `ReadDocument(path string) (*DocumentDTO, error)`.
- **Verification Command:** `go vet ./internal/documents/... && golangci-lint run ./internal/documents/...`
- **Expected Observable Result:** Interface and DTO types compile cleanly with zero staticcheck/lint warnings.
- **Evidence to Record:** Compiler and linter execution logs.
- **Environment Handling:** Standard Go toolchain environment.

### Task US-005.2: Implement file validation and size limiter
- **Task ID:** `US-005.2`
- **Status:** `DRAFT`
- **Dependencies:** `US-005.1`
- **Completion Criteria:** File stat checks file size <= 20*1024*1024 bytes and extension in allowed list.
- **Verification Command:** `go test -v -run TestFileValidation ./internal/documents/...`
- **Expected Observable Result:** Tests confirm rejection of files > 20 MiB and unsupported extensions.
- **Evidence to Record:** Go test execution output.
- **Environment Handling:** Standard Go toolchain environment.

### Task US-005.3: Implement UTF-8 reader with BOM stripping and replacement
- **Task ID:** `US-005.3`
- **Status:** `DRAFT`
- **Dependencies:** `US-005.2`
- **Completion Criteria:** Reader handles UTF-8 BOM, replaces corrupted bytes, returns normalized string.
- **Verification Command:** `go test -v -run TestUTF8Reader ./internal/documents/...`
- **Expected Observable Result:** Tests confirm BOM stripping and replacement of invalid UTF-8 bytes with U+FFFD.
- **Evidence to Record:** Go test execution output.
- **Environment Handling:** Standard Go toolchain environment.

### Task US-005.4: Write comprehensive Go unit test suite
- **Task ID:** `US-005.4`
- **Status:** `DRAFT`
- **Dependencies:** `US-005.3`
- **Completion Criteria:** Unit tests pass with 100% coverage of error branches.
- **Verification Command:** `go test -v -race ./internal/documents/...`
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Run unit tests: `go test -v -race ./internal/documents/...`.
2. Test fixture with BOM: verify leading characters match text, not `\uFEFF`.
3. Test 25 MiB dummy file: verify rejection with `FILE_TOO_LARGE`.

---

## 8. Known Risks and Blockers

- Symlink loops or dangling symlinks. Ensure `filepath.EvalSymlinks` is handled safely without infinite recursion.

---

## 9. Implementation Notes and Validation Evidence

- **Execution Date:** 2026-10-24
- **Active Task:** `US-005.1` (Completed)
- **Changed Files:** `internal/documents/dto.go`, `internal/documents/service.go`

### Task US-005.1 Verification Evidence
```text
$ go vet ./internal/documents/... && golangci-lint run ./internal/documents/...
0 issues.

$ go test ./internal/documents/...
?   	markdown-viewer/internal/documents	[no test files]
```
Verification verdict: PASS (DocumentDTO, DocumentError, and DocumentService interface compiled and verified with zero linter warnings).
