# Markdown Viewer — Product Requirements Document

**Document type:** Product Requirements Document (PRD) and implementation contract  
**Status:** Baseline for implementation planning  
**Version:** 1.0  
**Created:** 2026-10-23  
**Product name:** Markdown Viewer (working name; branding is configurable)  
**Primary audience:** AI coding agents and engineers responsible for decomposing this document into epics, stories, tasks, and acceptance tests

---

## How to Use This Document

This document is the product's source of truth for the initial release. An implementation agent must convert it into an ordered, dependency-aware plan before undertaking substantial implementation work.

1. Read the entire PRD before creating the implementation plan.
2. Decompose requirements into epics, user stories, technical tasks, and test tasks. Preserve requirement IDs such as `FR-OPEN-001` in the resulting work items.
3. Identify blocking decisions, platform-specific risks, and external dependencies before implementation. Use the decisions and defaults specified here unless they are impossible or demonstrably unsafe.
4. Implement incrementally. Each story must include observable acceptance criteria and automated tests where practical.
5. Do not silently drop, reinterpret, or replace requirements. When a requirement conflicts with the selected framework, security, platform behavior, or another requirement, document the conflict and propose a decision before proceeding.
6. Keep product behavior independent of implementation choices wherever practical. Technology substitutions belong in **Section 1 only**, with an Architecture Decision Record (ADR) explaining material consequences. If a technology change requires product-level behavior changes, identify those separately rather than editing unrelated sections.
7. Keep documentation, dependency versions, generated files, installer configuration, and CI workflows synchronized with the implementation.
8. Do not claim cross-platform support solely because code compiles. File associations, opening files from the shell, rendering, packaging, accessibility, and uninstall behavior must be tested on actual target operating systems or appropriately provisioned CI runners.

### Requirement priority

- **P0 — Release blocker:** Required for the first public MVP.
- **P1 — Important:** Include in the MVP unless a documented schedule or platform constraint requires deferral.
- **P2 — Later:** Explicitly out of the initial MVP, but should not be made unnecessarily difficult by the architecture.

### Requirement traceability

Every functional requirement must map to at least one implementation story and one verification method. A requirement is not complete merely because its code exists; its acceptance criteria must pass.

---

# 1. Technology and Implementation Baseline — Replaceable Section

> **Purpose of this section:** Keep framework, language, build tooling, and library choices in one place. If the project later changes from Go/Wails to Rust/Tauri, Electron, or another framework, update this section first, write an ADR, and then adjust only the platform adapters and implementation details that are genuinely affected. Do not rewrite product requirements that are framework-independent.

## 1.1 Selected baseline

The initial implementation uses **Go + Wails v2 + React + TypeScript**. This is a baseline, not a product requirement. Versions must be pinned in repository files and validated by CI.

| Layer | Baseline choice | Responsibility | Substitution boundary |
|---|---|---|---|
| Primary application language | Go | Native application services, file access, lifecycle, settings, OS integration | Replaceable with another backend language if all behavioral contracts remain satisfied |
| Desktop framework | Wails v2, starting from the latest compatible stable v2 release; currently documented as v2.17.0 | Native window, menus, dialogs, Go/frontend bridge, packaging integration | Replaceable; keep platform capabilities behind interfaces |
| Frontend language | TypeScript with strict compiler settings | UI, document rendering orchestration, view state | Replaceable only with a documented ADR; product behavior remains unchanged |
| UI framework | React | Application shell, tabs, settings, navigation and reusable components | Replaceable |
| Frontend build tool | Vite | Development server and production frontend build | Replaceable |
| Package manager | npm with a committed lockfile | Reproducible frontend dependency installation | Replaceable if the lockfile and CI workflows are updated consistently |
| Markdown renderer | `react-markdown` with remark/rehype plugins | Parsing and safe rendering of Markdown and extensions | Replaceable behind a rendering adapter and a fixture-based compatibility suite |
| GitHub Flavored Markdown | `remark-gfm` | Tables, task lists, strikethrough, autolinks and related GFM behavior | Replaceable |
| Math | `remark-math` + `rehype-katex` and locally bundled KaTeX assets | Inline and block math | Replaceable |
| Diagrams | Mermaid | Mermaid code-fence rendering | Replaceable behind a diagram renderer adapter |
| Code highlighting | Shiki preferred; another maintained local highlighter is acceptable if performance or WebView compatibility requires it | Syntax highlighting without sending code to a remote service | Replaceable behind a code-highlighting adapter |
| HTML sanitization | `rehype-sanitize` plus a carefully designed allowlist and CSS sanitization policy | Prevent executable or unsafe embedded content | The security policy is mandatory; the implementation library is replaceable |
| Go/frontend contract | Wails-generated bindings where appropriate, plus stable typed DTOs | Explicit boundary between UI and native services | Contract must survive framework changes |
| Go tests | `go test`, `go vet`, race detection where applicable | Unit and integration testing | Replaceable tooling; verification outcomes remain required |
| Frontend tests | Vitest + React Testing Library | Unit and component behavior | Replaceable |
| End-to-end checks | Playwright for browser-testable UI behavior plus packaged-app manual/automated smoke tests per OS | Validate actual user flows | Replaceable; actual native-platform checks remain mandatory |
| CI and release automation | GitHub Actions | Test, build, package, and publish artifacts | Replaceable |

### Version policy

- At the time this PRD was written, the official Go downloads page lists Go 1.27.3 as the current stable patch release. Start with the latest stable Go release that is compatible with the selected Wails version and all target build environments.
- The official Wails site documents v2.17.0 and labels v3 as beta. Use the latest compatible stable Wails v2 release for the MVP unless a documented technical spike proves otherwise.
- Do not blindly upgrade the major version of Go, Wails, React, Mermaid, or any rendering/security dependency. Pin versions, commit lockfiles, record upgrades, and run the complete platform and security test suites.
- If the newest Go release is incompatible with Wails or a platform toolchain, pin the newest compatible supported Go release and explain the choice in `docs/decisions/`.
- Runtime users must not need Go, Node.js, npm, or a development toolchain installed.

Official starting references:

- Go releases: <https://go.dev/dl/> and <https://go.dev/doc/devel/release>
- Wails v2 introduction: <https://v2.wails.io/docs/introduction/>
- Wails v2 installation and platform requirements: <https://v2.wails.io/docs/gettingstarted/installation/>
- Wails runtime: <https://v2.wails.io/docs/reference/runtime/intro/>
- Wails project: <https://wails.io/>
- React Markdown: <https://github.com/remarkjs/react-markdown>
- Remark GFM: <https://github.com/remarkjs/remark-gfm>
- Mermaid: <https://mermaid.js.org/>
- KaTeX: <https://katex.org/>
- Shiki: <https://shiki.style/>

## 1.2 Architecture constraints implied by the baseline

1. The production app must embed its compiled frontend assets in the application binary/package. It must not require a frontend development server at runtime.
2. Node.js and npm are build-time dependencies only.
3. The app must not require a separately installed Go runtime.
4. Wails uses the platform's web rendering engine rather than shipping Chromium. The minimum supported WebView/runtime and required Linux libraries must be documented and verified. This is an explicit deployment trade-off, not an accidental implementation detail.
5. All rendering dependencies—including Mermaid, KaTeX, syntax-highlighting grammars and fonts shipped by the app—must be local. Rendering ordinary documents must not require internet access.
6. Native features must be exposed through narrow application services. React components must not directly manipulate arbitrary OS paths, invoke shell commands, or implement platform-specific installation behavior.
7. Markdown parsing and presentation must be isolated behind a frontend document-rendering module so the framework and parser can be changed without rewriting tabs, navigation, preferences, or native file-open handling.
8. Avoid a backend HTTP server or localhost service unless a proven framework requirement makes it unavoidable. Do not introduce a server merely to transfer document contents between layers.
9. Do not introduce a database in the MVP. Use a versioned, local settings file for small pieces of UI state and recent-file metadata.
10. Do not use Rust or Python as secondary runtimes in the MVP. They add no justified value to the required feature set.

## 1.3 Initial supported platforms

The release matrix is a product target and must be finalized during the first technical spike against currently supported OS versions and the selected Wails toolchain.

- **Windows:** Windows 10 22H2 and Windows 11, x64. Validate ARM64 separately before claiming support.
- **macOS:** Current macOS release and the two immediately preceding major releases, on Apple Silicon. Support Intel only if the selected toolchain and test infrastructure can verify it; otherwise clearly document the limitation.
- **Linux:** Ubuntu 24.04 LTS x64 as the primary supported distribution. Add Fedora or other distributions only after runtime-library compatibility is tested. Package the application with a clear list of required system libraries.

The project must record the exact minimum OS versions in release documentation. The list above is not permission to claim untested support.

## 1.4 Mandatory feasibility spike before product implementation

Before building the full UI, create a small disposable spike with the selected toolchain and verify:

- A packaged application opens on each target OS.
- Frontend assets are embedded and no development server is needed.
- The app can receive one file path from a shell/open-with action and display that file.
- A second launch can deliver one or more paths to the running application, or a documented fallback exists.
- The installer can register `.md` and `.markdown` without forcibly replacing the user's chosen default app.
- Relative local images render safely.
- A Markdown fixture with RTL, CSS direction, raw HTML, Mermaid, KaTeX, tables and highlighted code renders on each target WebView.
- The installed app can be uninstalled without deleting user-created documents or unrelated registry/system settings.

Write the result to `docs/decisions/ADR-0001-desktop-stack.md`. Resolve critical feasibility failures before proceeding.

---

# 2. Product Overview

## 2.1 Product vision

Deliver a fast, dependable, cross-platform desktop application for reading Markdown documents as richly formatted documents—not editing them. It should support technical documentation and multilingual content, including Persian/Arabic RTL text mixed with English LTR text, diagrams, formulas, code blocks, HTML fragments and local assets.

The app should install easily, require minimal runtime dependencies, appear in the operating system's application list, and be selectable as the default application for `.md` files. Opening a Markdown file from the file manager or command line must be a first-class user journey.

## 2.2 Problem statement

Markdown content is commonly consumed through editors, browser previews, repository websites, or online tools. These options can introduce unnecessary complexity, require an editor-oriented workflow, rely on internet services, render extensions inconsistently, handle RTL content poorly, or fail to provide a straightforward default-app experience.

The product solves this by providing a dedicated, local-first viewer with a consistent interaction model and support for common Markdown extensions and mixed-direction content.

## 2.3 Product principles

1. **Viewer first:** do not become a Markdown editor or general-purpose code IDE in the MVP.
2. **Local-first:** document rendering, formulas, diagrams, syntax highlighting, and settings work offline.
3. **Safe by default:** Markdown is content, not trusted application code.
4. **Predictable rendering:** prefer established Markdown specifications and explicit extension behavior over custom syntax.
5. **RTL is a core feature:** direction is resolved per block and can be controlled by the document or user preferences.
6. **Native integration matters:** install, launch, open-with, file association, and uninstall behavior are part of product quality.
7. **Small runtime footprint:** avoid bundling a full browser unless technical evidence shows that platform WebViews fail the product's requirements.
8. **Portable architecture:** renderer, document model, settings, and native integration must remain logically separated.
9. **No account required:** no login, cloud synchronization, telemetry, or remote processing in the MVP.
10. **Graceful degradation:** unsupported extensions or malformed diagrams must produce readable fallbacks and actionable errors, never a blank or crashed application.

## 2.4 Goals and success metrics

The MVP is successful when users can install the app, set it as the default Markdown viewer, and read ordinary and advanced Markdown documents without needing an editor or internet connection.

Success metrics:

- All P0 acceptance criteria pass on every supported OS.
- `.md` and `.markdown` files can be opened through the OS file manager and from the command line.
- The installer registers file types without silently overriding a user's existing default selection.
- A single-file launch and a multiple-file launch work reliably; launching another file while the app is open brings the existing window forward and opens the requested file(s).
- Core fixtures for CommonMark/GFM, Mermaid, KaTeX, code blocks, HTML sanitization, CSS direction and RTL/LTR pass across the target OS matrix.
- The application renders all shipped examples offline.
- No known critical/high security issue remains open at release.
- The application does not modify the contents of the documents it opens.

## 2.5 Non-goals for the MVP

- Editing or saving Markdown content.
- WYSIWYG editing, source editor, split source/preview mode, or collaboration.
- Cloud synchronization, user accounts, remote document storage, or telemetry.
- A plugin marketplace or user-installed JavaScript extensions.
- Arbitrary execution of JavaScript, shell commands, HTML event handlers, or embedded applications.
- Full browser features, developer tools for end users, or a general-purpose web browser.
- Automatic conversion of arbitrary office documents or PDFs into Markdown.
- Automatic download of external images, scripts, fonts, MathJax assets, themes, or rendering libraries.
- Support for every Markdown dialect or proprietary extension.
- Automatic changes to the OS default-app choice without user consent.

---

# 3. Target Users and Main Scenarios

## 3.1 Primary users

- Developers reading repository `README.md` files, architecture documents, release notes and technical specifications.
- Technical writers and documentation readers.
- Users who work with multilingual documentation, especially Persian/Arabic and English content in the same file.
- Users who receive `.md` files and want to open them directly from the file manager.
- Users who need a local viewer for formula-heavy or diagram-heavy documentation without a web service.

## 3.2 Main scenarios

1. A user double-clicks a `.md` file and sees a rendered document.
2. A user selects the app under **Open with** or sets it as the default handler for Markdown files.
3. A user opens several Markdown files and switches between them using tabs.
4. A user reads a Persian document containing English headings, code, links, formulas and tables; paragraph direction is correct without manual edits.
5. A document author explicitly sets `dir="rtl"`, `dir="ltr"`, or CSS direction and expects those choices to be respected.
6. A user reads a document containing Mermaid code fences and LaTeX formulas while offline.
7. A user follows a relative link to another local Markdown document or opens an external HTTPS link in the system browser.
8. A user searches within a large document, jumps to a heading, changes zoom or theme, and returns to reading.
9. A document contains invalid Markdown, missing images, malformed Mermaid, or unsafe HTML. The app presents available content and safely reports the problem.
10. A user uninstalls the app without losing source documents or having unrelated defaults changed.

---

# 4. Scope and Release Boundaries

## 4.1 P0 — MVP release blockers

- Packaged desktop app for all declared target platforms.
- Open `.md` files through file picker, drag-and-drop, OS file association, and command-line/open-file invocation.
- Multiple document tabs and same-instance open-file routing.
- CommonMark-style rendering and GitHub Flavored Markdown (GFM) basics.
- Mermaid diagrams.
- Inline and display LaTeX math using KaTeX.
- Syntax-highlighted code blocks with language labels and copy-to-clipboard.
- Raw HTML support subject to sanitization and safe CSS restrictions.
- RTL/LTR handling: auto detection by block, explicit HTML `dir`, permitted CSS direction/text alignment, and a user-level default.
- Local relative images and local Markdown links.
- External links open in the OS browser through a restricted URL policy.
- Search in current document; table of contents for headings.
- Zoom, light/dark/system theme, readable typography and keyboard navigation.
- Settings and recent files persisted locally.
- Installer/uninstaller and file-association integration appropriate to each OS.
- Offline rendering, safe failure handling, test fixtures, packaging documentation and release automation.

## 4.2 P1 — Include unless a documented blocker exists

- Drag-and-drop multiple files.
- Recently opened document list with missing-file handling.
- Automatic refresh when a file changes on disk, with debounce and scroll-position preservation where practical.
- Print through the system's print workflow where supported by the chosen WebView.
- Per-document zoom override, with a user default.
- Configurable default direction: Auto, RTL, LTR.
- Copy code-block content and copy a heading link/anchor.
- Accessible keyboard shortcut list and menu commands.
- Basic error reporting within the UI without transmitting any data externally.

## 4.3 P2 — Not part of MVP

- PDF export, image export, and document batch export.
- Side-by-side comparison or live preview of a file being edited externally beyond simple automatic refresh.
- Workspace management, notes, bookmarks across documents, full-text index across files.
- User-defined themes or plugin packages.
- Built-in updater, crash-report upload, analytics, or cloud features.
- Bundled Chromium/Electron mode.

---

# 5. UX and Information Architecture

## 5.1 Main window

The initial window must contain:

- Native/application menu with File, View, Navigate, Help and platform-appropriate menu items.
- Tab bar showing open documents.
- Main rendered-document viewport.
- Optional document outline/table of contents panel.
- Status information, such as current filename and non-intrusive rendering warnings.
- Empty state when no document is open.

The layout must adapt to narrow windows. The document remains the primary visual focus. Avoid editor-like panels, terminal UI, or excess chrome.

## 5.2 Empty state

The empty state must offer clear actions to:

- Open a Markdown file.
- Drop one or more files into the window.
- View recently opened files, if any.
- See a short keyboard-shortcut hint.

Do not display fabricated sample documents as though they were user files. A bundled sample can be offered explicitly as a demo, but it is not required for the MVP.

## 5.3 Tabs

- Each open document has one tab, identified by filename and optionally parent-folder context when filenames are duplicated.
- Tabs support switching and closing.
- A tab must show a readable status when the file is missing, inaccessible, or changed on disk.
- Opening a file already open should focus the existing tab instead of duplicating it. Path comparison must account for platform-specific path rules and symlinks as far as practical.
- Closing the last tab returns to the empty state; it does not implicitly exit unless a platform-specific convention requires that behavior.
- The app must not modify a document during tab close or app shutdown.

## 5.4 Document view

- Rendered content uses a readable maximum line width, configurable through a small set of preferences if feasible.
- Images scale to available width while preserving aspect ratio and provide a way to inspect the original image when practical.
- Tables must scroll horizontally rather than forcing the entire window wider.
- Code blocks must have a clear visual distinction, horizontal scrolling when needed, language identification when available, and a copy action.
- Mermaid diagrams must fit the viewport and provide a way to inspect a large diagram without clipping. If diagram zoom/pan is not feasible for the selected renderer, use a bounded, horizontally/vertically scrollable container.
- Math must remain legible and scroll horizontally if a long display formula exceeds the viewport.
- External content must not cause uncontrolled layout changes or navigation away from the current document.

## 5.5 Table of contents

- Generate the outline from rendered headings (`h1`–`h6`) that have visible text.
- Clicking an outline entry scrolls to the corresponding heading and updates the active item when practical.
- Duplicate headings must receive stable unique slugs.
- Author-specified HTML IDs should be preserved if safe and unique.
- The outline must not include hidden or sanitized-away content.
- If no headings exist, hide or disable the outline action.

## 5.6 Search

- Search is scoped to the active document in the MVP.
- Support next/previous match, match count, and Escape to close.
- Search must include visible textual content and code; it may exclude SVG path data and complex diagram internals.
- Search must not expose hidden or removed script/style content.
- Search highlights must not permanently mutate the rendered document or interfere with selection/copying.
- Case sensitivity can be a toggle if straightforward; otherwise default to case-insensitive search and document it.

## 5.7 Themes and typography

- Provide Light, Dark and System themes.
- Use platform-native preference where reliable for System theme.
- Theme switching must not alter document content or authored direction.
- Provide zoom controls and standard shortcuts; a sensible initial zoom is 100%.
- Persist zoom/theme/direction preferences across sessions.
- Use system fonts with sensible fallback stacks, including fonts capable of rendering Persian and Arabic; do not require downloading fonts.
- The app must not force English-only shaping or break joining characters in Persian/Arabic.

---

# 6. Functional Requirements

## 6.1 Application lifecycle and file opening

### FR-OPEN-001 — Open a document (P0)
The user can open a document through a native file picker. The picker should prioritize supported extensions (`.md`, `.markdown`, `.mdown`, `.mkd`) while still allowing the user to select another text file if explicitly supported by the UI.

**Acceptance criteria**
- Selecting a readable file displays its rendered content in a tab.
- Canceling the dialog causes no state change.
- An unreadable or unsupported file produces a clear error message and leaves already-open documents intact.
- Paths containing Unicode, spaces, non-Latin characters and platform-specific characters work.

### FR-OPEN-002 — Drag and drop (P0)
Users can drop one or more supported Markdown files onto the window. Files dropped onto the tab bar or document area must be handled consistently.

**Acceptance criteria**
- Valid files open as tabs in the order provided by the OS where that order is available.
- Invalid files do not crash the application or discard valid files from the same drop operation.
- The app reports failures non-intrusively.

### FR-OPEN-003 — OS file associations (P0)
The installer registers the application as a candidate handler for `.md`, `.markdown`, `.mdown`, and `.mkd`, using platform-appropriate registration and MIME/UTI metadata. The app must appear in the OS application list and relevant Open With/Choose Another App flows.

**Acceptance criteria**
- After installation, a user can select the app to open a Markdown file from the file manager.
- The installer does not forcibly replace a user's current default handler.
- The file manager passes the selected file path correctly.
- Association registration is verified from a fresh install, upgrade and uninstall on every supported OS.
- Uninstall removes only registrations owned by this product and must not erase unrelated settings or user documents.

### FR-OPEN-004 — Open from command line or OS launch event (P0)
The application accepts one or more file paths from the process arguments or the platform's open-file event mechanism.

**Acceptance criteria**
- A single file argument opens the file.
- Multiple file arguments open all valid supported files.
- Invalid arguments produce useful diagnostics without crashing.
- Paths with spaces and Unicode work without manual quoting changes beyond normal shell rules.
- Launching the app with no file opens the last appropriate state or the empty state according to the saved preference.

### FR-OPEN-005 — Single-instance file routing (P0)
The app should run as one instance per user session by default. If the user launches a file while the application is already running, the existing instance receives the file paths, restores/focuses its window and opens the requested files.

**Acceptance criteria**
- Launching a second file from the OS opens it in the already-running window.
- Multiple simultaneous launch requests are queued or processed safely; no file path is silently lost.
- If the primary instance is closing or unavailable, the new process must either take over safely or start a new instance with an explainable fallback.
- IPC/instance coordination is local-only, access-controlled to the current user, and does not use a public network listener.

### FR-OPEN-006 — Recent files (P1)
Store a bounded list of recently opened file paths, most-recent first. The maximum list size is configurable only if needed; default to 20.

**Acceptance criteria**
- Reopening a recent file updates its recency rather than creating duplicates.
- Missing or inaccessible files are marked as unavailable and can be removed from the list.
- The app stores paths and timestamps only; it must not store document contents or extracted text.

### FR-OPEN-007 — File changed on disk (P1)
When an open file changes externally, notify the user and refresh the rendered view after a short debounce. Default behavior may automatically reload if no in-app operation could lose data, because the app is read-only.

**Acceptance criteria**
- Repeated write events are coalesced.
- The active scroll position is preserved where headings/content remain stable.
- Deleted or moved files show an unavailable state rather than an unhandled exception.
- Reloading one tab does not reset unrelated tabs.

## 6.2 Markdown parsing and rendering

### FR-RENDER-001 — Common Markdown (P0)
Render standard Markdown constructs: headings, paragraphs, emphasis, strong emphasis, blockquotes, ordered/unordered lists, nested lists, thematic breaks, links, images, inline code, fenced code blocks and tables when supported by the selected Markdown dialect.

### FR-RENDER-002 — GitHub Flavored Markdown (P0)
Support GFM tables, task lists, strikethrough, autolink literals and other standard GFM features supported by the selected parser.

**Acceptance criteria for FR-RENDER-001/002**
- A curated fixture suite covers each supported construct, nested combinations, empty input, Unicode, malformed input and long lines.
- The parser does not execute Markdown text as code.
- Feature behavior is documented in `docs/markdown-support.md`.

### FR-RENDER-003 — Code highlighting (P0)
Fenced code blocks should receive syntax highlighting for commonly used languages. The highlighter and all language grammars must run locally.

**Acceptance criteria**
- A code block with a known language gets highlighting and retains the original text for selection/copy.
- An unknown language renders as readable plain text.
- Very large code blocks must not freeze the whole UI indefinitely; highlighting may be skipped above a documented threshold.
- Code content is never evaluated.

### FR-RENDER-004 — Copy code (P0)
Every fenced code block provides a copy action. The copied value is the original code text, not rendered HTML or syntax-highlighter markup.

**Acceptance criteria**
- Copy preserves tabs, spaces, newlines and Unicode.
- Success/failure feedback is accessible and does not obscure the document.

### FR-RENDER-005 — Mermaid diagrams (P0)
Recognize fenced blocks labeled `mermaid` and render them as diagrams using a locally bundled Mermaid version.

**Acceptance criteria**
- Include fixtures for at least flowchart, sequence diagram, class diagram, state diagram, ER diagram and Gantt chart, subject to Mermaid's current support.
- Invalid Mermaid produces a localized in-app error/fallback displaying the source code and a concise explanation.
- Rendering one invalid diagram must not prevent other diagrams or document text from rendering.
- Mermaid must not initiate remote requests.
- Configure the renderer for untrusted content: strict security settings, no user-defined JavaScript callbacks, and no active links/actions from diagram source unless explicitly implemented under a reviewed security policy.
- Diagram labels and generated SVG must be sanitized or rendered using a proven safe configuration.
- Diagram rendering is lazy or deferred when outside the visible viewport, where practical.

### FR-RENDER-006 — LaTeX math (P0)
Recognize inline and display math using the chosen remark/rehype math syntax, and render formulas with locally bundled KaTeX assets.

**Acceptance criteria**
- Cover inline `$...$`, display `$$...$$`, and fenced/display forms supported by the chosen parser.
- Ordinary dollar signs in prose are not incorrectly converted into math where the parser's documented syntax rules say otherwise.
- Unsupported commands or malformed formulas show a safe, readable fallback.
- Formula rendering works offline and does not fetch fonts or scripts remotely.
- MathML/accessibility support exposed by KaTeX is retained where possible.

### FR-RENDER-007 — Raw HTML fragments (P0)
Support useful inline/block HTML in Markdown, including `div`, `span`, semantic text tags, lists, tables, image elements and direction-related attributes, subject to the sanitization policy in Section 8.

**Acceptance criteria**
- Safe HTML fragments render within the document viewport.
- Script elements, event-handler attributes, `javascript:` URLs, `srcdoc`, embedded objects, iframes, forms and other active/unsafe elements are removed or neutralized.
- The sanitizer preserves only explicitly allowed tags and attributes.
- An HTML fragment must not be able to navigate the app's top-level WebView or invoke native APIs.
- Raw HTML rendering is covered by positive and adversarial fixtures.

### FR-RENDER-008 — Headings and anchors (P0)
Create stable anchors for Markdown headings and preserve safe author-defined HTML IDs where possible.

**Acceptance criteria**
- Duplicate headings generate deterministic unique anchors.
- Table-of-contents navigation uses the same IDs as rendered headings.
- Unsafe or duplicate IDs are normalized or replaced.

### FR-RENDER-009 — Graceful partial rendering (P0)
A malformed extension must not make the entire document unavailable. Render everything that can be safely rendered and present errors near the affected component or in a non-intrusive warning panel.

## 6.3 RTL, LTR and mixed-direction content

### FR-DIR-001 — Automatic direction (P0)
Support automatic direction detection for textual blocks such as paragraphs, headings, list items, blockquotes, table cells and captions. Use standards-compliant HTML bidirectional behavior where possible (for example, `dir="auto"`) rather than a fragile character-by-character CSS heuristic.

**Acceptance criteria**
- Persian/Arabic-first blocks render RTL.
- English-first blocks render LTR.
- Blocks with leading punctuation, digits, emojis or neutral characters use the first strong directional character according to Unicode bidi behavior.
- Mixed Persian and English text remains readable and punctuation does not unpredictably jump to the wrong side.
- Direction can differ between adjacent paragraphs in the same document.

### FR-DIR-002 — Explicit HTML direction (P0)
Respect valid author markup using `dir="rtl"`, `dir="ltr"`, and `dir="auto"` on allowed elements. Explicit document-authored direction takes precedence over automatic direction and over the app's default direction.

### FR-DIR-003 — CSS direction and alignment (P0)
Respect allowed author CSS that sets `direction: rtl|ltr`, `text-align: right|left|center|start|end`, and other explicitly allowlisted layout properties. This includes safe inline style declarations and safe rules inside an embedded `<style>` element, scoped to the document content.

**Acceptance criteria**
- A class defined within an allowed `<style>` block can apply RTL/LTR direction to matching document elements.
- Unsafe declarations and at-rules are removed without discarding unrelated safe text content.
- CSS from one document cannot affect application chrome, tabs, settings or another tab.
- CSS cannot load external resources, execute script-like behavior, hide security warnings, or create overlays that escape the document viewport.
- Author-defined direction is resolved before automatic direction is applied. Automatic direction must not override explicit `dir` or CSS direction rules.

### FR-DIR-004 — User default direction (P0)
Provide three settings: Auto (default), RTL, and LTR. This setting applies only where the document does not supply an explicit direction through allowed markup/CSS.

### FR-DIR-005 — Non-prose direction (P0)
Code blocks, Mermaid source/diagrams, and mathematical expressions default to LTR unless a documented component-specific layout requires another direction. Their contents must not be corrupted by bidi formatting.

### FR-DIR-006 — Direction regression fixtures (P0)
Maintain fixtures covering Persian-only, Arabic-only, English-only, mixed-direction paragraphs, nested direction blocks, tables, links, numbers, punctuation, code, formulae, lists and CSS class-based direction. Run them on each supported platform because WebView behavior can differ.

## 6.4 Local assets and links

### FR-ASSET-001 — Relative local images (P0)
Resolve relative image references against the directory of the Markdown document. Support common raster formats and SVG only if rendered under a safe policy.

**Acceptance criteria**
- Spaces, Unicode characters and common relative path forms work.
- Missing assets produce an informative placeholder that includes the asset name/path in a safe form.
- Image dimensions are constrained to the viewport and preserve aspect ratio.
- The renderer must not execute SVG scripts or load arbitrary active content from SVG.
- The app must not permit a Markdown reference to turn into arbitrary native command execution or silent protocol launch.

### FR-ASSET-002 — Local Markdown links (P0)
Resolve relative links to other local Markdown files. Clicking a supported Markdown link opens the target in a new or existing tab according to the tab behavior rules. Preserve anchors where possible.

**Acceptance criteria**
- A relative link is resolved relative to the current document.
- A link to a missing file produces a clear error or unavailable state.
- Query and fragment portions are handled predictably; query strings may be ignored for local file lookup if documented.
- A link cannot use a disguised executable protocol to run code.

### FR-ASSET-003 — Other local links (P1)
Non-Markdown local files should open using the system default application only after validating the target scheme and, where needed, asking the user. Do not attempt to render arbitrary local binary files inside the Markdown WebView.

### FR-LINK-001 — External links (P0)
Allow ordinary HTTPS/HTTP and mailto links subject to scheme validation. External links open through the operating system's default handler rather than navigating the app's main WebView away from the current document.

**Acceptance criteria**
- Only explicitly allowed schemes are passed to the OS-open operation.
- `javascript:`, `data:`, `file:`, custom unknown protocols and malformed URLs are blocked by default.
- External navigation preserves the current document and tabs.
- The app does not send document content or telemetry when opening a link.

### FR-ASSET-004 — Remote resources (P0)
Remote images and external CSS are blocked by default to protect privacy and enable offline rendering. If a future setting allows remote images, it must be off by default, clearly explained and implemented with a narrow image-only policy. Remote JavaScript and remote stylesheet imports are never allowed in Markdown.

## 6.5 Navigation and reading tools

### FR-NAV-001 — Table of contents (P0)
Provide a document outline based on headings, with click-to-scroll navigation and stable anchors.

### FR-NAV-002 — Find in document (P0)
Provide in-document search with next/previous navigation, match count and keyboard shortcut. Documented exclusions such as text inside an SVG path are acceptable.

### FR-NAV-003 — Zoom (P0)
Provide increase, decrease and reset-to-default zoom commands. Support keyboard shortcuts and menu actions. Keep the chosen zoom within reasonable configured lower/upper limits to prevent unusable layout values.

### FR-NAV-004 — Theme (P0)
Support Light, Dark and System theme. Mermaid and syntax highlighting themes must adapt consistently where supported.

### FR-NAV-005 — Copy and selection (P0)
Allow users to select and copy rendered text, links, tables and code. Native right-click context behavior should be preserved or replaced only by a clearly better accessible context menu.

### FR-NAV-006 — Print (P1)
Where platform support is stable, provide a print command using the native WebView print workflow. Print CSS must remove app chrome, retain readable typography, render links sensibly, and avoid splitting headings from the first paragraph where possible. If print is not reliable on a platform, document the limitation and disable the command there rather than pretending it works.

## 6.6 Settings and persistence

### FR-SET-001 — Preferences (P0)
Persist these preferences locally:

- Theme: System (default), Light, Dark.
- Default direction: Auto (default), RTL, LTR.
- Default zoom: 100% initially.
- Restore previously open tabs on startup: enabled by default only if reliable and not confusing; make it a setting.
- Recent-file list and its maximum size (default 20).
- Remote image loading preference only if that feature is later added; default disabled.

### FR-SET-002 — Settings migration (P0)
Store settings in a versioned format. A future schema change must migrate old settings safely. If settings are invalid or corrupted, back them up if practical, reset to defaults and keep the app usable.

### FR-SET-003 — Data minimization (P0)
Store no document contents, extracted document text, browsing history, credentials or analytics. Recent files store only paths and timestamps, and may be cleared by the user.

### FR-SET-004 — Reset settings (P1)
Offer a reset-to-defaults action. It must clearly state that it resets application preferences, not source documents.

## 6.7 Errors and diagnostics

### FR-ERR-001 — Actionable errors (P0)
Errors must identify the failed operation in plain language and provide a useful next action where possible. Do not display raw stack traces to ordinary users.

### FR-ERR-002 — Fault isolation (P0)
File-read errors, Mermaid errors, KaTeX errors, image errors and malformed HTML must be isolated to the affected file/component where possible. A bad document must not corrupt saved settings or prevent reopening the app.

### FR-ERR-003 — Local diagnostics (P1)
Provide an optional local diagnostics view or log file suitable for support. Logs must exclude document text and avoid including sensitive full paths unless explicitly enabled by the user. Logs must rotate and remain bounded in size.

---

# 7. Markdown Compatibility Contract

## 7.1 Supported content classes

The renderer must support these classes through documented behavior and tests:

- Common Markdown block and inline syntax.
- GFM tables, task lists, strikethrough and autolinks.
- Nested ordered/unordered lists and blockquotes.
- Fenced code blocks and inline code.
- Mermaid code fences.
- Inline and display LaTeX math supported by KaTeX.
- Safe inline and block HTML fragments.
- Safe direction-related attributes and a limited CSS subset.
- Relative local images and relative local Markdown links.
- Unicode text and mixed RTL/LTR content.

## 7.2 Explicitly unsupported or constrained content

- Arbitrary JavaScript, inline event handlers, executable HTML, iframes, forms, embedded objects and browser plugin content.
- Remote JavaScript, remote CSS, CSS `@import`, and CSS `url()` capable of accessing remote or local resources outside the asset resolver policy.
- Embedded websites and arbitrary HTML applications.
- Browser-specific extensions not listed in the support contract.
- Unsupported KaTeX commands: present a fallback rather than attempting remote MathJax rendering.
- Unknown code-fence languages: show plain text.

## 7.3 Rendering pipeline contract

Implement the renderer as an explicit, testable pipeline. A recommended logical order is:

1. Read document bytes through the native file service with size and error checks.
2. Decode as UTF-8; for invalid sequences, render replacement characters and provide a non-blocking warning. Do not crash on a BOM.
3. Parse Markdown with the selected Markdown parser and enabled dialect plugins.
4. Parse raw HTML only when enabled by the product policy.
5. Sanitize HTML with an allowlist.
6. Sanitize CSS separately using a parser and declaration/selector allowlist; do not use regular expressions as the only CSS sanitizer.
7. Render Markdown nodes with custom components for Mermaid, code blocks, math, images, links and headings.
8. Apply direction rules without overriding explicit author direction.
9. Resolve local references via the document asset resolver.
10. Render within a contained document viewport and handle component errors locally.

The exact library-specific plugin order may differ when required by the chosen libraries. The implementation must prove the final behavior with fixtures and must not reduce security to achieve compatibility.

## 7.4 CSS allowlist baseline

At minimum, support safe declarations needed for direction and ordinary document layout, subject to implementation testing:

- `direction`: `ltr`, `rtl`.
- `text-align`: `left`, `right`, `center`, `justify`, `start`, `end`.
- Basic font properties: `font-weight`, `font-style`, `font-size`, `font-family` only if values are safely constrained.
- Text decoration and line-height where values are constrained.
- Safe margins, padding, borders, color and background color, provided values cannot reference external resources.
- Display/width constraints only as needed for common document markup and only within a document container.

Reject or strip by default:

- `@import`, external font loading, arbitrary `url()`, `expression()`, `behavior`, `-moz-binding`, browser-specific executable properties and unknown at-rules.
- Fixed-position overlays, viewport-wide positioning, z-index escalation and CSS designed to cover application chrome.
- selectors that can target outside the generated `.markdown-content` root.
- scriptable or unsupported pseudo-elements/selectors when they could bypass isolation or security policy.

The CSS policy must be implemented and tested independently of Markdown parsing. If a CSS declaration is rejected, safe surrounding text must still render.

---

# 8. Security and Privacy Requirements

The app renders files that may be downloaded from untrusted sources. Treat each document as untrusted input.

## 8.1 Security invariants (P0)

1. Markdown and HTML never execute arbitrary script in the application origin.
2. A document cannot call Go bindings or native runtime methods directly.
3. A document cannot navigate the main app window to an external URL without the application's controlled link handler.
4. A document cannot run shell commands, open arbitrary protocols silently, or invoke native applications through a crafted link.
5. Remote content is not fetched automatically.
6. CSS cannot escape the document container or manipulate application chrome.
7. SVG must be treated as potentially active content. Sanitize it, rasterize through a trusted local mechanism, or disable SVG rendering if a defensible policy cannot be implemented.
8. File paths received from OS events, command-line arguments, Markdown links and drop events must be validated and handled as data, never concatenated into shell commands.
9. Local file access must be scoped to explicit user actions and the asset/link policy. Do not expose arbitrary filesystem read APIs to the frontend.
10. Logs and settings must not store document content.

## 8.2 WebView boundary

- Do not expose privileged native APIs to raw document nodes.
- Prefer rendering content as inert DOM inside the normal application frontend rather than navigating the WebView to the Markdown file URL.
- External link handling must be intercepted and validated before invoking the OS browser.
- Use the narrowest possible CSP and native bridge permissions supported by the selected framework. Document any limitation imposed by Wails/WebView.
- Do not use a custom protocol or local server that gives a document unrestricted filesystem access.

## 8.3 Sanitization test corpus

Include adversarial fixtures for, at minimum:

- `<script>` and nested scripts.
- `onerror`, `onclick` and other event-handler attributes.
- `javascript:` URLs and mixed-case/whitespace obfuscations.
- `data:` URLs and unknown protocols.
- malicious SVG elements, event handlers and references.
- `<iframe>`, `<object>`, `<embed>`, `<form>`, `<base>` and `<meta http-equiv>`.
- CSS `@import`, `url()`, fixed overlays and selectors targeting app chrome.
- Mermaid click directives or equivalent interactive actions.
- malformed deeply nested HTML and oversized attributes.
- extremely large or deeply nested Markdown input.

Tests must assert that unsafe behavior is neutralized, not merely that rendering did not throw an exception.

## 8.4 Privacy

- No telemetry, analytics, user tracking, remote error reporting, or automatic update checks in the MVP.
- No network requests are required for normal rendering.
- External HTTP/HTTPS links open only after a user click.
- No document is uploaded or shared automatically.
- Settings live in the operating system's user application-data location and can be reset/removed using the normal OS conventions.
- Dependencies must be audited for runtime network behavior, tracking and license obligations.

---

# 9. Technical Architecture Guidance

This section provides implementation guidance, not permission to couple product behavior to a specific UI library. Keep interfaces narrow and components independently testable.

## 9.1 Logical components

### Native/application layer (Go in the selected baseline)

- **Application lifecycle:** startup, shutdown, command-line parsing and window restoration.
- **Open-file router:** normalize/validate file paths and route requests from file picker, drag-and-drop, OS association and single-instance IPC into a shared open-document command.
- **Document service:** read local UTF-8 Markdown files, expose metadata and content, handle I/O errors and file-change events.
- **Asset resolver:** resolve relative local image and link references according to policy; return controlled file/resource results without exposing arbitrary filesystem operations.
- **Settings service:** load, validate, migrate and persist preferences.
- **Recent-files service:** bounded list, path normalization and missing-file status.
- **Native integration adapter:** dialogs, clipboard, window focus, external URL opening, menus, print and file-open integration.
- **Instance coordinator:** per-user single-instance coordination and safe local IPC.
- **Logging/diagnostics:** local bounded logs without document text.

### Frontend layer (React/TypeScript in the selected baseline)

- **Application shell:** window layout, menu state, tab bar, navigation and empty state.
- **Document tabs state:** current tab, open documents, errors, reload state and scroll restoration.
- **Markdown renderer:** Markdown parsing, custom component renderers and error boundaries.
- **Direction resolver:** explicit HTML direction, allowed CSS direction, auto-direction and user-default handling.
- **Diagram renderer:** lazy Mermaid rendering, strict configuration, error fallback and generated SVG sanitization.
- **Math renderer:** KaTeX integration, local assets and fallback behavior.
- **Code renderer:** syntax highlighting, language label and copy action.
- **Local asset components:** image loading, placeholder state and safe link behavior.
- **Search/outline UI:** heading outline, anchor navigation and in-document search.
- **Preferences UI:** theme, direction, zoom, startup behavior, recent files and reset.

## 9.2 Suggested repository layout

The exact layout may change with the framework template, but maintain the separation below:

```text
/
  app.go
  main.go
  go.mod
  wails.json (or selected Wails configuration)
  frontend/
    package.json
    package-lock.json
    vite.config.ts
    tsconfig.json
    src/
      app/
      components/
      features/
        documents/
        rendering/
        direction/
        navigation/
        preferences/
      services/
      styles/
      test-fixtures/
      test/
  internal/
    application/
    documents/
    assets/
    settings/
    recents/
    instance/
    platform/
      windows/
      darwin/
      linux/
    diagnostics/
  build/
    windows/
    darwin/
    linux/
    icons/
  docs/
    decisions/
    markdown-support.md
    security.md
    testing.md
    packaging.md
  .github/workflows/
```

Do not blindly reproduce this tree if it conflicts with Wails conventions. Preserve the logical boundaries and document any material deviation.

## 9.3 Frontend/native contract

- Define explicit typed request and response models for document operations and settings.
- Return structured errors with a stable error code and safe user-facing message; do not return raw OS errors directly to the UI without normalization.
- Do not expose generic methods such as `ReadArbitraryPath(path)` or `ExecuteCommand(command)` to the frontend.
- Expose narrow operations such as `OpenDocument`, `ReadDocument`, `GetSettings`, `SaveSettings`, `ListRecentFiles`, `ResolveDocumentAsset`, `OpenExternalURL` and `FocusWindow` as needed.
- All paths should be represented as native paths on the Go side and as opaque strings only at the boundary.
- Avoid storing duplicate sources of truth for tab state. Define which layer owns file bytes, document metadata, user preferences and tab navigation state.

## 9.4 State and lifecycle

- Separate persistent preferences from session-only UI state.
- Keep the UI responsive during file I/O, Mermaid rendering and highlighting. Long-running operations must not block the native UI event thread.
- Cancel or ignore stale asynchronous results when a tab closes or its document is reloaded.
- Handle race conditions between file watcher events, manual reloads, tab close and application shutdown.
- On shutdown, flush settings safely and release instance-coordination resources.

## 9.5 Document size and resource limits

- Establish a maximum supported Markdown file size of **20 MiB for the initial release**. The exact limit can be adjusted after benchmarks but must be documented and tested.
- Files above the limit must produce a clear message rather than attempting unbounded allocation.
- Guard against pathological nesting, excessive Mermaid blocks and huge code fences.
- Lazy-load or defer expensive Mermaid/highlighting work where practical.
- Cache Mermaid renders only within the process and with bounded memory. Cache keys must include source and relevant theme/configuration inputs.
- Never persist generated HTML or document contents to disk in the MVP.

---

# 10. Data Model and Local Persistence

## 10.1 Settings schema

Use a versioned settings structure, conceptually similar to:

```json
{
  "schemaVersion": 1,
  "theme": "system",
  "defaultDirection": "auto",
  "defaultZoom": 1.0,
  "restoreOpenTabs": true,
  "recentFiles": [
    {
      "path": "/absolute/path/to/document.md",
      "lastOpenedAt": "2026-10-23T10:00:00Z"
    }
  ]
}
```

This is illustrative, not a requirement to use those exact field names. Use an appropriate platform user-data directory. Paths and timestamps must be normalized and validated. The schema must be documented.

## 10.2 Persistence rules

- Save preferences atomically where practical: write to a temporary file, sync if appropriate, then replace the existing file.
- Handle corrupted or partially written settings without a startup crash.
- Bound the recent-file list; avoid repeated duplicate paths.
- Store absolute normalized paths when needed to reopen recent documents, but do not store their contents.
- Do not serialize transient UI state indiscriminately. Persist only what improves the reading experience and can be restored reliably.
- Do not use a database until requirements demonstrate a need for indexing, metadata queries, or more complex persisted state.

---

# 11. Packaging, Installation and Operating-System Integration

Packaging is part of the product, not an optional release activity.

## 11.1 General installer requirements

- Provide a signed or clearly publisher-identified installable artifact where signing is available.
- Install the app into an appropriate application directory.
- Create correct application metadata and icons.
- Register supported Markdown file extensions as an available handler.
- Do not force the app to become the default handler without a user action.
- Add the app to normal application menus/lists where the OS package convention supports it.
- Provide a clean uninstall path.
- Do not require a developer runtime or development tools to be installed by end users.
- Do not require network access during normal operation. Any required runtime prerequisite (notably a native WebView) must be detected, documented and handled with a user-friendly installer message.

## 11.2 Windows

- Build a Windows installer, with NSIS as the initial packaging candidate for Wails v2.
- Support x64 for the MVP. ARM64 is a separate qualification target.
- Register a product-owned ProgID and the supported Markdown extensions through installer configuration or a narrowly scoped platform adapter.
- Register the app as an available Open With handler and provide correct executable/icon metadata.
- Do not silently overwrite `UserChoice` or force a default handler. Windows owns default-app choice and may require the user to confirm it in Settings.
- Ensure the file path is received whether launched through the Start menu, command line, file manager or Open With.
- Verify WebView2 availability. If absent, show or trigger an approved installation flow; do not fail with an unexplained blank window.
- Uninstall must remove product-owned registrations and shortcuts, not user documents or unrelated settings.

## 11.3 macOS

- Package as a valid `.app` bundle; provide a `.dmg` or another standard delivery format.
- Declare supported document types in the bundle's metadata for the supported Markdown extensions and MIME/UTI types as appropriate.
- Handle files opened through Finder, Dock, Open With, command line and Launch Services.
- Preserve correct Unicode paths and handle multiple files passed to the application.
- Sign and notarize distribution builds when the release process has suitable Apple credentials. If not yet available, document the Gatekeeper limitations of unsigned builds.
- Verify that the app appears in Open With and can be selected as the default in Finder/System Settings workflows.

## 11.4 Linux

- Publish at least one package for the primary supported distribution. The initial recommended package is `.deb` for Ubuntu 24.04 LTS; an AppImage can be added as a convenience artifact after file-association behavior is verified.
- Provide a `.desktop` entry, application icon and valid MIME type associations for Markdown files.
- Run the appropriate desktop database update commands during install/uninstall where packaging conventions require them.
- Do not associate with generic `text/plain` by default, because that could claim ordinary text files.
- Clearly list required GTK/WebKitGTK and other runtime libraries.
- Test file-manager open actions, command-line arguments, recent-file behavior and uninstall on the declared distribution.
- Do not claim universal Linux compatibility based solely on a successful build on Ubuntu.

## 11.5 Association test matrix

For each OS, validate:

1. Fresh install when another Markdown viewer is already installed.
2. Fresh install when no Markdown handler is configured.
3. Choosing this app through Open With / Choose Another App.
4. Setting it as the default through the OS's supported settings flow.
5. Opening one file from a file manager.
6. Opening several files if the OS supports the workflow.
7. Opening a file while the app is already running.
8. Upgrade installation over a previous version.
9. Uninstall and verify that owned associations/shortcuts are removed safely.
10. Reinstall after uninstall.

Record the result by OS version, architecture, installer type and test date.

---

# 12. Quality Attributes and Non-Functional Requirements

## 12.1 Performance

Test on a documented reference machine for each platform. Initial targets are goals that must be validated, not unsupported marketing claims.

- Time from application launch to interactive empty state: target **under 2.5 seconds** on a typical supported desktop, excluding first-time OS prerequisite installation.
- Render a 1 MiB Markdown file without Mermaid or massive syntax-highlighted blocks: target **under 1 second** after file contents are available.
- Render a 5 MiB Markdown file with ordinary Markdown: target **under 3 seconds** on the reference machine.
- The UI must remain responsive during file reading, rendering and search. Progress indicators or deferred rendering are required when a task takes noticeably more than a short interaction.
- Mermaid rendering must be lazy/deferred where practical and isolated so a slow diagram does not block the full document.
- Opening a file already open should focus the existing tab with no unnecessary second parse.
- Memory must remain bounded; benchmark documents containing multiple large code blocks and at least 20 Mermaid blocks.

Performance claims must be revised from measured results, with test input and environment documented. Do not weaken security or silently omit supported features simply to meet a target.

## 12.2 Reliability

- No uncaught renderer or file-I/O error may crash the complete app under normal invalid-input conditions.
- A malformed settings file must not prevent startup.
- Closing or reopening tabs must not display stale content from a previous document.
- File watcher loops, single-instance IPC and caches must release resources on shutdown.
- The app must not modify source file timestamps or content merely by viewing a file.

## 12.3 Accessibility

- All primary operations must be keyboard accessible.
- Focus must be visible and not lost when switching tabs or closing dialogs.
- Interactive elements must have accessible names and appropriate roles/states.
- Theme contrast and focus indicators should target WCAG 2.2 AA where practical.
- Do not use color as the only indication of an error, active tab or search result.
- Respect the OS reduced-motion preference; avoid unnecessary animation.
- Support screen-reader navigation for headings, links, tables, code-copy controls, search and preferences.
- Verify at least one screen reader per major platform where feasible.

## 12.4 Compatibility

- Render UTF-8 text, BOM-prefixed files and invalid UTF-8 gracefully.
- Handle filenames and folders containing spaces, non-Latin characters and emoji where supported by the OS.
- Normalize path handling according to platform conventions without corrupting case-sensitive Linux paths.
- Keep native UI strings localizable even if the MVP ships with English UI only.
- Document any difference caused by browser/WebView engines.

## 12.5 Maintainability

- Enable strict TypeScript checks and Go static checks.
- Avoid large monolithic components and cross-layer imports.
- Isolate third-party rendering libraries behind adapters/custom renderer components.
- Keep dependency licenses and update policy documented.
- Use deterministic builds as far as the toolchain supports.
- No secrets or signing credentials in the repository.
- Avoid hard-coded user-specific paths or assumptions about the developer's machine.

---

# 13. Testing Strategy

## 13.1 Testing layers

### Go unit tests

Cover:

- path normalization and supported extension validation;
- file reads, oversize input and invalid encoding behavior;
- settings validation, corruption handling, migration and atomic persistence;
- recent-file ordering, deduplication and size limit;
- URL scheme validation;
- document asset resolution and path edge cases;
- command-line argument parsing;
- single-instance request validation and routing logic;
- platform-independent parts of file-change handling.

### Frontend unit/component tests

Cover:

- Markdown pipeline and custom components;
- direction detection/precedence behavior;
- table-of-contents slugging and duplicate headings;
- search and keyboard interactions;
- Mermaid success/failure isolation;
- math success/fallback behavior;
- code-copy exactness;
- theme and zoom preferences;
- safe links and local asset placeholders;
- tab state and stale asynchronous response handling.

### Integration tests

Cover:

- Go/frontend bridge request and response contracts;
- file-open routing from a simulated OS event;
- settings round-trip and schema migration;
- local image/Markdown link resolution;
- document reload after file change;
- error handling when a file disappears while open.

### End-to-end and packaged tests

At minimum:

1. Install app and open a Markdown file through the OS.
2. Launch app with a path argument.
3. Launch a second path while the app is running; verify same-instance routing.
4. Open two documents, switch tabs, close one and preserve the other.
5. Render the complete feature fixture offline.
6. Verify RTL/LTR markup and CSS direction on each target OS.
7. Verify safe behavior for adversarial HTML/CSS/SVG/Mermaid fixtures.
8. Verify recent files, settings persistence, theme and zoom after restart.
9. Verify installer/uninstaller and associations.
10. Verify the app opens after reboot/log-in if OS policies permit; otherwise test a fresh launch.

## 13.2 Golden fixtures

Keep test fixtures in a versioned directory. Each fixture should declare expected features and known platform differences. Include at least:

- Basic CommonMark.
- GFM table/task-list/strikethrough/autolink.
- Persian-only document.
- Arabic-only document.
- Mixed Persian/English technical document.
- Explicit `dir` nesting.
- CSS class-based direction using a safe embedded `<style>` block.
- Code fences for common languages and unknown language.
- Mermaid fixture set and malformed Mermaid.
- KaTeX inline/display formulae and malformed formula.
- Local images, relative Markdown links, missing asset and path edge cases.
- Safe raw HTML and malicious HTML.
- Oversized file and deeply nested input.
- Unicode filenames and folder paths.

## 13.3 Continuous integration

CI must run on pull requests and release branches:

- Go formatting (`gofmt`), tests, `go vet`, and any applicable static analysis.
- Frontend linting, type checking, unit tests and production build.
- Dependency audit/license report as configured by the project.
- Build on each supported OS using platform-appropriate runners.
- Package artifacts on release tags.
- Preserve logs and test results as CI artifacts without uploading user documents.

A green Linux build does not satisfy Windows/macOS packaging requirements, and vice versa.

---

# 14. Suggested Implementation Roadmap

The AI agent should turn this roadmap into concrete epics and dependency-aware tasks. Adjust order only when dependencies or a technical spike justify it.

## Phase 0 — Repository and decision baseline

1. Inspect repository state and existing conventions; do not overwrite unrelated work.
2. Create `docs/decisions/ADR-0001-desktop-stack.md` with the chosen Go/Wails baseline, version compatibility results and known trade-offs.
3. Create `docs/markdown-support.md`, `docs/security.md`, `docs/testing.md` and `docs/packaging.md` skeletons.
4. Define the supported OS/build matrix and CI runners.
5. Agree on requirement-to-story traceability format.

**Exit criteria:** a buildable minimal application and documented confirmed support matrix.

## Phase 1 — Packaged application feasibility

1. Generate a minimal Wails v2 React/TypeScript app.
2. Embed production frontend assets.
3. Implement a minimal native file-open request and display the file path/content.
4. Prototype single-instance routing.
5. Prototype file association in each platform's package/installer.
6. Verify relative local image loading and the native WebView runtime.

**Exit criteria:** each declared target OS can install, launch and open one associated Markdown file. Do not start advanced rendering before this works.

## Phase 2 — Core application structure

1. Define service interfaces and DTOs.
2. Implement settings and recent files.
3. Implement command-line parsing, OS file-open routing, single-instance coordination and multi-file opens.
4. Implement tab state, empty state, error states and basic menus.
5. Add basic logging and graceful shutdown.

**Exit criteria:** files can be opened from every supported input route without losing tabs or duplicating the app unexpectedly.

## Phase 3 — Baseline Markdown rendering

1. Integrate parser and GFM.
2. Implement base typography and responsive document viewport.
3. Implement code blocks, highlighting and copy.
4. Implement headings, stable anchors, outline and in-document search.
5. Add local image/link resolution.
6. Add renderer fixtures and visual regression checks where practical.

**Exit criteria:** basic technical documentation renders well and tests cover the core syntax.

## Phase 4 — Advanced rendering and direction

1. Add Mermaid with strict security configuration and local assets.
2. Add KaTeX with local fonts/CSS and fallback behavior.
3. Add safe raw HTML with a documented allowlist.
4. Implement CSS sanitization and style scoping.
5. Implement explicit direction and CSS precedence.
6. Implement auto direction and the user direction default.
7. Run RTL/LTR and security fixtures across all target WebViews.

**Exit criteria:** supported fixture suite passes on each target OS and no unsafe markup executes.

## Phase 5 — Reading experience and durability

1. Add theme, zoom and preferences UI.
2. Add recent files and startup restore behavior.
3. Add file-change detection and reload where feasible.
4. Add print if stable on all declared platforms or document per-platform support.
5. Complete keyboard accessibility, error states and performance tuning.

**Exit criteria:** normal reading journeys pass end-to-end and performance goals are measured.

## Phase 6 — Distribution and release hardening

1. Finalize Windows installer and associations.
2. Finalize macOS app bundle/disk image, signing and file types.
3. Finalize Linux package and desktop/MIME integration.
4. Verify upgrade/uninstall/reinstall flows.
5. Verify offline behavior and absence of unexpected network requests.
6. Run security, compatibility and resource-limit suites.
7. Produce a release checklist, checksums, dependency/license report and user-facing installation instructions.

**Exit criteria:** release package passes the full test matrix and all P0 requirements are traceably complete.

---

# 15. Definition of Done

A story or requirement is done only when all applicable conditions below are met:

- Behavior matches its acceptance criteria.
- Unit/integration/E2E tests are added or the reason automated coverage is not practical is documented.
- Type checks, linting, tests and builds pass.
- The feature has no known critical/high security defect.
- Errors and invalid inputs are handled gracefully.
- Keyboard and accessibility behavior are checked for interactive UI.
- Documentation and feature-support notes are updated.
- Requirement IDs are linked from the task/PR.
- No unrelated generated files, local paths, secrets or temporary artifacts are committed.
- The feature does not introduce runtime network dependencies contrary to this PRD.
- Cross-platform implications are checked and unsupported platform behavior is clearly documented.

## 15.1 Release acceptance checklist

The MVP cannot be declared complete until all P0 rows below are verified:

- [ ] App builds and installs on every declared target OS.
- [ ] User can open a file using the picker, drop action, command-line argument and OS file association.
- [ ] Opening a file in a running instance routes correctly to that instance.
- [ ] Multiple tabs work and duplicate paths are handled predictably.
- [ ] CommonMark and GFM fixture suites pass.
- [ ] Mermaid diagrams render offline; invalid diagrams fail safely.
- [ ] KaTeX formulas render offline; malformed formulas fail safely.
- [ ] Syntax-highlighted code and exact copy behavior work.
- [ ] Safe raw HTML renders; malicious HTML, SVG, CSS and protocols are neutralized.
- [ ] Automatic, explicit HTML and CSS-driven RTL/LTR all work.
- [ ] Relative local images and Markdown links work within the documented policy.
- [ ] External links open through the OS handler without replacing the current document.
- [ ] Search, outline, zoom, theme and preferences work.
- [ ] Corrupt settings, missing files and large input are handled safely.
- [ ] No unnecessary network calls occur while reading local documents.
- [ ] Installer, file associations, upgrades, uninstall and reinstall pass on each target OS.
- [ ] Performance has been measured and recorded on documented reference hardware.
- [ ] User-facing installation, supported feature and security documentation is complete.

---

# 16. Open Decisions and Defaults

The agent should not block implementation on choices that already have a default below. If evidence shows the default is unsuitable, create an ADR and state its impact.

| Decision | Default for MVP | When to revisit |
|---|---|---|
| Application name | “Markdown Viewer” working name | Before public release/branding |
| Primary backend language | Go | Only if an implementation constraint is proven |
| Desktop framework | Wails v2 stable line | If platform WebView, file association or packaging spike fails |
| Frontend | React + TypeScript + Vite | Only through a documented ADR |
| Markdown dialect | CommonMark + GFM | New dialect requests require fixtures and security review |
| Raw HTML | Supported after sanitization | Never enable unrestricted raw HTML execution |
| CSS in Markdown | Allowlisted declarations and scoped styles | Extend only with tests and a security review |
| Default direction | Auto | User can select RTL or LTR in preferences |
| Direction precedence | Explicit `dir` / permitted author CSS, then automatic direction, then user default where applicable | Change only if a reproducible standards/platform issue requires it |
| Default theme | System | User preference can override it |
| External images | Disabled | A future image-only opt-in may be considered |
| Local images | Relative references resolved from document directory | Broader filesystem access requires a threat-model review |
| Document tabs | Supported | No need to make workspaces first-class in MVP |
| Persistence | Versioned local settings file; no database | Reconsider only if requirements expand substantially |
| Telemetry | None | Requires explicit product decision and privacy review |
| Updates | Manual download/reinstall for MVP | Add auto-update only with signing and update-security design |
| Installer | Native package per platform | Choose formats based on real user distribution needs |
| App default handler | Register as a candidate; user chooses default | Never forcibly override OS default selection |
| Maximum input size | 20 MiB | Adjust only after performance/security tests |
| UI localization | English UI for initial MVP; multilingual document content is required | Add localized UI as a separate feature |

---

# 17. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| WebView rendering differences | RTL/CSS, SVG, print or layout may differ across OSs | Build a shared fixture suite and test on actual target OS versions early |
| File association behavior differs by OS | Core launch journey may fail despite successful app build | Treat associations as native packaging work, prototype in Phase 1 and test install/upgrade/uninstall |
| Unsafe raw HTML/CSS/SVG | Local code execution, privacy or UI integrity risk | Explicit allowlists, separate CSS sanitization, link interception, adversarial fixtures and no remote resource loading |
| Mermaid performance/security | Large or malicious diagrams can freeze or affect the UI | Lazy rendering, strict configuration, sanitized SVG and bounded resource behavior |
| Large documents freeze UI | Poor UX or process termination | Input size limits, deferred rendering, bounded caches and performance benchmarks |
| Frontend/native API becomes tightly coupled to Wails | Framework migration is expensive | Narrow service contracts and an implementation-specific adapter boundary |
| Linux WebKit dependencies vary | Installation failures on some distributions | Declare a narrow primary support matrix and publish packages against supported distro versions |
| Go/Wails version incompatibility | Build failures or platform issues | Pin compatible versions after spike; upgrade deliberately with CI coverage |
| CSS direction conflicts with auto direction | Text appears incorrectly aligned | Define precedence, keep direction resolver isolated and add fixtures for inline/class CSS |
| File paths with Unicode/spaces fail | Users cannot open real documents | Explicit test matrix across shell, CLI, links, assets, settings and IPC |

---

# 18. Required Deliverables From the Implementation Agent

The implementation agent is expected to produce and maintain these artifacts alongside the app:

1. **Implementation plan:** epics, stories and tasks in dependency order; each work item references PRD IDs and includes acceptance criteria.
2. **Architecture decision record:** selected Go/Wails versions, platform feasibility results and material trade-offs.
3. **Working source repository:** complete Go backend and frontend, with reproducible local setup instructions.
4. **Automated tests:** Go unit tests, frontend unit tests, renderer fixture suite, integration tests and platform smoke tests.
5. **Build and release workflows:** CI for all supported OSs plus versioned release packaging.
6. **Installers/packages:** Windows, macOS and Linux artifacts matching the declared support matrix.
7. **Feature compatibility document:** exact Markdown syntax/extensions supported and any known differences.
8. **Security document:** threat assumptions, sanitizer allowlist, URL policy, SVG policy, local file-access rules and test results.
9. **Packaging document:** prerequisites, installation, default-app selection, upgrades, uninstall and troubleshooting for each platform.
10. **Release evidence:** completed acceptance checklist, test/build artifacts, measured performance, dependency/license information and known limitations.

The agent must not report the project as complete while P0 requirements remain unimplemented, untested, or silently deferred.

---

# 19. Reference Documentation

The following sources are starting points for implementation research. The agent must check the documentation for the exact pinned versions rather than relying on examples from a different major version.

- Go download and release information: <https://go.dev/dl/> · <https://go.dev/doc/devel/release>
- Wails v2 overview: <https://v2.wails.io/docs/introduction/>
- Wails v2 installation/platform requirements: <https://v2.wails.io/docs/gettingstarted/installation/>
- Wails v2 application architecture: <https://v2.wails.io/docs/howdoesitwork/>
- Wails v2 runtime APIs: <https://v2.wails.io/docs/reference/runtime/intro/>
- React Markdown documentation: <https://github.com/remarkjs/react-markdown>
- Unified/remark ecosystem: <https://unifiedjs.com/>
- GitHub Flavored Markdown specification: <https://github.github.com/gfm/>
- Mermaid documentation: <https://mermaid.js.org/>
- KaTeX documentation: <https://katex.org/docs>
- Shiki documentation: <https://shiki.style/>
- MDN bidirectional text and `dir`: <https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/dir>
- MDN CSS `direction`: <https://developer.mozilla.org/en-US/docs/Web/CSS/direction>
- OWASP Cross Site Scripting Prevention Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html>
- OWASP Content Security Policy Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html>

---

**End of PRD**
