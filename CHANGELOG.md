# Changelog

All notable user-visible changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [0.1.0] - 2026-10-26

### Added
- **Core Native Application & Lifecycle (Phase 1 & 2):**
  - Go backend with Wails v3 (`v3.0.0-beta.34`) and React 18 TypeScript frontend.
  - Native document loading service with UTF-8 normalization, BOM stripping, and 20 MiB safety boundary.
  - Local single-instance IPC coordinator with CLI argument forwarding and working directory preservation.
  - Multi-document tab management with state persistence and duplicate document focusing.
  - System file picker dialog and drag-and-drop zone.
- **Rendering Engine (Phase 3 & 4):**
  - CommonMark and GitHub Flavored Markdown (GFM tables, strikethrough, task lists, autolinks).
  - Shiki syntax highlighting with dual themes and exact copy-to-clipboard action.
  - KaTeX math formula rendering with bundled local WOFF2 fonts and currency dollar avoidance.
  - Mermaid diagram rendering with isolated error fallback.
  - Local asset resolver with relative directory sandboxing and missing image fallbacks.
  - Stable heading anchor slug generation with disambiguation and heading navigation.
- **Bidirectional Text Support (Phase 4):**
  - Automatic direction engine with first strong character detection (`dir="auto"`).
  - Explicit HTML `dir` attribute and scoped CSS direction precedence engine.
  - User direction preference setting and non-prose LTR isolation for code, math, and diagrams.
- **Reading Experience & Durability (Phase 5):**
  - Interactive Table of Contents sidebar with active heading highlight.
  - In-document text search with match counts, active cycling, and highlight cleanup.
  - Viewport zoom controls (50% to 300%) with Ctrl+0/Ctrl+=/Ctrl+- shortcuts and print styling.
  - Light, Dark, and System theme switching with CSS variables.
  - Versioned local settings service (`~/.config/markdown-viewer/settings.json`) with atomic writes and schema recovery.
  - Recent files tracking (up to 20 files) and startup tab restoration.
  - Debounced file watcher service for live document reloads.
- **Packaging, Platform Integration & Hardening (Phase 6):**
  - Linux Debian package (`.deb`) with maintainer scripts (`postinst`, `postrm`), FreeDesktop 1.5 `.desktop` launcher (`%F`), and scalable SVG icon.
  - Linux portable `.AppDir` bundle pipeline.
  - Windows NSIS installer script (`packaging/windows/installer.nsi`) and application manifest.
  - macOS application bundle (`packaging/darwin/Info.plist`), UTIs, and code signing documentation.
  - Automated 10-point file association matrix test suite (`scripts/test-association-matrix.sh`) — 10/10 passed.
  - Performance benchmark suite (`scripts/benchmark.sh`) validating PRD §12.1 targets (< 2.5s cold start, 2.2ms 1 MiB read, 7.2ms 5 MiB read, bounded memory).
  - Offline integrity test suite (`scripts/test-offline.sh`) verifying zero external network calls.
  - 18-point Release Acceptance Checklist verified and established in `docs/release-checklist.md`.
