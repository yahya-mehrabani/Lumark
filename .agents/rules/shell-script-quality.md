---
trigger: glob
globs: **/*.sh
---

# Shell Script Standards

- Match the script's shebang (`#!/usr/bin/env bash` or `#!/bin/sh`).
- ALWAYS double-quote variables (`"$var"`) and command substitutions.
- Use Bash arrays for dynamic args. NEVER use `eval` or unsafe string concatenation.
- Do not blindly inject `set -euo pipefail` if legacy logic relies on non-zero exits.
- Validate with `shellcheck` and format with `shfmt -w`. Only format touched scripts.
- **NEVER execute scripts containing `rm -rf`, `sudo`, package installs, or environment mutations without user permission.**