---
trigger: glob
globs: **/Taskfile*.{yml,yaml}
---

# Build and Taskfile Management

- Read root `Taskfile.yml` and `build/` platform taskfiles before modifying build steps.
- Extend existing tasks; do NOT duplicate tasks or write parallel shell scripts.
- Preserve standard Wails v3 task names and variables (`BIN_DIR`, `APP_NAME`).
- Ensure tasks remain compatible with both Linux and Windows pipelines.
- After editing, validate syntax with `wails3 task --list` or run a non-destructive task.
- Explicitly state which platforms were tested and which remain unverified.