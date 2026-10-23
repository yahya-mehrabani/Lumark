---
trigger: glob
globs: **/Taskfile*.{yml,yaml}
---

# Build and Taskfile Management

- Read the root `Taskfile.yml` and any included platform taskfiles inside `build/` before modifying build, dev, binding generation, or packaging steps.
- Extend or parameterize existing tasks rather than creating duplicate tasks or parallel shell scripts.
- Preserve standard Wails v3 task names, variables (`BIN_DIR`, `APP_NAME`, etc.), and task dependencies expected by `wails3 build` and `wails3 dev`.
- Ensure any modification to common tasks remains compatible with both Linux and Windows build pipelines.
- After editing a Taskfile, validate syntax and execution using `wails3 task --list` or by running the specific non-destructive task you modified.
- Clearly state which target platform tasks were executed and which remain unverified.