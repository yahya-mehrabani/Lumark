---
trigger: glob
globs: frontend/**
---

# Frontend Development and Backend Integration

- Inspect `frontend/package.json`, the existing lockfile (`package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock`), and `tsconfig.json` before running commands or editing code.
- Strictly use the package manager matching the committed lockfile; NEVER switch between `npm` and `pnpm` or generate a second lockfile.
- Follow the project's established UI framework, component structure, state patterns, and styling conventions.
- Import and call backend services exclusively through the generated Wails v3 bindings and official `@wailsio/runtime` APIs.
- NEVER fabricate backend method names, bypass generated bindings, or edit files inside generated binding directories.
- Handle asynchronous backend calls with proper loading states and user-visible error handling.
- After modifying frontend code or updating Go bindings, run the frontend typecheck and build scripts defined in `package.json` (e.g., `npm run build` or `tsc --noEmit`) to verify type safety.