---
trigger: glob
globs: **/*.sh
---

# Shell Script Standards

- Inspect the existing script's shebang (`#!/usr/bin/env bash` or `#!/bin/sh`) and adhere strictly to its target shell dialect.
- Always double-quote variable expansions (`"$var"`) and command substitutions to prevent word splitting and globbing bugs.
- Use Bash arrays (`args=("--flag" "$value")`) when constructing dynamic command arguments; NEVER use unsafe string concatenation or `eval`.
- Handle command exit codes and unset variables explicitly. Do not blindly inject `set -euo pipefail` into legacy scripts without verifying whether existing logic relies on non-zero return codes.
- Validate all modified scripts with `shellcheck <script.sh>` and resolve reported warnings before finishing.
- Format modified scripts with `shfmt -w <script.sh>` while matching the repository's indentation style.
- Check and format only the scripts touched by your task; do not bulk-reformat unrelated scripts.
- NEVER execute scripts containing `rm -rf`, `sudo`, system package installations, or environment mutations without explicit user review and permission.