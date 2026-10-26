# Markdown Viewer (`markdown-go`)

A dedicated, fast, cross-platform desktop application for reading Markdown documents as richly formatted documents—offline, securely, and with native operating-system integration.

> **Status:** Version `0.1.0` MVP Implementation Complete. Release Hardened and Verified.

---

## 1. Project Overview

`markdown-go` is a dedicated, fast, cross-platform desktop application for reading local Markdown files as richly formatted documents—offline, securely, and with native operating-system integration:
- **Rich Document Rendering:** CommonMark, GitHub Flavored Markdown (tables, task lists, strikethrough), LaTeX math (KaTeX), syntax-highlighted code blocks (Shiki), and Mermaid diagrams.
- **First-Class Bidirectional Support:** Per-block auto-detection for Persian/Arabic RTL mixed with English LTR, explicit HTML `dir` support, and scoped CSS direction control.
- **Deep Desktop Integration:** File associations for `.md`/`.markdown`, command-line opening, single-instance routing, multi-document tabs, and native window behaviors.
- **Local-First & Safe by Default:** Completely offline rendering with zero telemetry, strict HTML/CSS sanitization, safe SVG handling, and sandboxed WebView boundaries.

---

## 2. Technology Baseline

- **Backend/Native Layer:** Go `1.26.10` with Wails v3 (`v3.0.0-beta.34`)
- **Frontend Layer:** React 18, TypeScript, Vite, KaTeX, Mermaid, Shiki
- **Target Platforms:** Windows 10/11 (x64), macOS (Apple Silicon arm64), Linux (Ubuntu 24.04 LTS x64)

---

## 3. Build & Packaging Commands

```bash
# Run local development dev server
npm run dev

# Run comprehensive automated test suites
npm test                # Frontend unit & component tests
go test ./...           # Go backend unit tests
npm run test:security   # Adversarial security test corpus
npm run test:fixtures   # Golden document fixture suite
npm run test:offline    # Network isolation & offline integrity check
npm run benchmark       # Performance benchmark suite (PRD §12.1)

# Build production installation packages (Linux)
npm run build:deb       # Debian package (build/bin/markdown-viewer.deb)
npm run build:appimage  # Portable AppImage bundle
npm run test:package:linux # Automated package verification
```

---

## 4. Documentation & Verification Records

- **Release Acceptance Checklist:** [docs/release-checklist.md](docs/release-checklist.md) (All 18 P0 items verified)
- **Packaging & OS Integration:** [docs/packaging.md](docs/packaging.md)
- **Platform Support Matrix:** [docs/architecture/PLATFORM-SUPPORT.md](docs/architecture/PLATFORM-SUPPORT.md)
- **Markdown Specification:** [docs/markdown-support.md](docs/markdown-support.md)
- **Security & Sanitization Policy:** [docs/security.md](docs/security.md)
- **Product Requirements:** [PRD.md](PRD.md)
- **Changelog:** [CHANGELOG.md](CHANGELOG.md)
