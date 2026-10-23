# Markdown Viewer (`markdown-go`)

A dedicated, fast, cross-platform desktop application for reading Markdown documents as richly formatted documents—offline, securely, and with native operating-system integration.

> **Status:** Planning Baseline Completed. Application implementation has not yet started.

---

## 1. Project Overview

`markdown-go` is designed as a **viewer first** (read-only) application for local Markdown files, featuring:
- **Rich Document Rendering:** CommonMark, GitHub Flavored Markdown (tables, task lists, strikethrough), LaTeX math (KaTeX), syntax-highlighted code blocks (Shiki), and Mermaid diagrams.
- **First-Class Bidirectional Support:** Per-block auto-detection for Persian/Arabic RTL mixed with English LTR, explicit HTML `dir` support, and scoped CSS direction control.
- **Deep Desktop Integration:** File associations for `.md`/`.markdown`, command-line opening, single-instance routing, multi-document tabs, and native window behaviors.
- **Local-First & Safe by Default:** Completely offline rendering with zero telemetry, strict HTML/CSS sanitization, safe SVG handling, and sandboxed WebView boundaries.

---

## 2. Technology Baseline

- **Backend/Native Layer:** Go with Wails (evaluating [Wails v3](https://v3.wails.io) candidate vs [Wails v2](https://wails.io) fallback in [ADR-0001](docs/decisions/ADR-0001-technology-baseline.md))
- **Frontend Layer:** React, TypeScript, and Vite
- **Target Platforms:** Windows 10/11 (x64), macOS (Apple Silicon arm64), Linux (Ubuntu 24.04 LTS x64)


---

## 3. Implementation Workflow & Source of Truth

The repository operates on a durable, file-based AI pair-programming workflow:
- **Product Requirements:** [PRD.md](PRD.md)
- **Agent Operating Rules:** [AGENTS.md](AGENTS.md)
- **Implementation Index:** [docs/implementation/INDEX.md](docs/implementation/INDEX.md)
- **Implementation Roadmap:** [docs/implementation/ROADMAP.md](docs/implementation/ROADMAP.md)
- **Work Backlog:** [docs/implementation/BACKLOG.md](docs/implementation/BACKLOG.md)
- **Requirement Traceability:** [docs/implementation/REQUIREMENT-TRACEABILITY.md](docs/implementation/REQUIREMENT-TRACEABILITY.md)
- **Current Execution State:** [docs/implementation/CURRENT-STATE.md](docs/implementation/CURRENT-STATE.md)
- **Implementation Protocol:** [docs/implementation/IMPLEMENTATION-PROTOCOL.md](docs/implementation/IMPLEMENTATION-PROTOCOL.md)
- **Execution Work Log:** [docs/implementation/WORK-LOG.md](docs/implementation/WORK-LOG.md)

---

## 4. Current Repository State

- Application source code and build targets have **not** been initialized.
- The project is at the boundary between **Phase 0 (Planning)** and **Phase 1 (Technical Feasibility Spike)**.
- See [docs/implementation/CURRENT-STATE.md](docs/implementation/CURRENT-STATE.md) for the active status and next action.
