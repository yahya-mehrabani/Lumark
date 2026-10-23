---
trigger: manual
---

# Architecture and Requirements Review

**MODE: STRICT READ-ONLY.** When invoked via `@architecture-review`, DO NOT edit, create, or delete any files unless the user explicitly writes "implement" or "apply changes" in the same prompt.

## Review Checklist
1. **PRD & Scope Alignment:** Compare the target feature or code against the approved PRD. Flag any out-of-scope additions (e.g., unsupported platforms or unapproved dependencies).
2. **Boundary Integrity:** Inspect separation of concerns between Go backend services, Wails v3 bindings, and frontend UI components.
3. **Complexity & Coupling:** Identify unnecessary abstractions, duplicated state between Go and Frontend, tight coupling, or dead code.
4. **Reliability & Concurrency:** Check error propagation across the Go/JS boundary, resource cleanup (`defer`), context cancellation, and goroutine safety.
5. **Cross-Platform Risks:** Audit filesystem paths, OS commands, file watchers, and WebView differences between Ubuntu Linux and Windows.
6. **Test Coverage:** Identify missing unit or integration tests for critical paths and edge cases.

## Required Output Structure
Provide your analysis in the following exact sections:
1. **Current Design Summary:** Brief overview of relevant files, symbols, and data flow.
2. **Confirmed Issues (Must Fix):** Concrete bugs, PRD violations, or architectural flaws with exact `file:line` references.
3. **Risks & Trade-offs:** Cross-platform or maintainability concerns.
4. **Minimal Recommended Solution:** The smallest coherent design change to address the findings.
5. **Validation Plan:** Exact commands and platform checks required to verify the proposed changes.