---
trigger: glob
globs: frontend/**
---

# Frontend & Backend Integration

## Package Management
- Inspect `package.json`, lockfiles, and `tsconfig.json` before commands.
- **Strictly use the committed lockfile's package manager.** NEVER mix `npm`, `pnpm`, or `yarn`.

## UI & Patterns
- Follow established UI framework, component structure, and styling conventions.

## Wails Bindings
- Import backend services **exclusively** through generated Wails v3 bindings.
- **NEVER fabricate backend methods or edit generated binding files.**
- Handle async backend calls with loading states and user-visible error handling.

## Verification
- After frontend changes or binding updates, ALWAYS run typecheck and build (`npm run build` or `tsc --noEmit`).