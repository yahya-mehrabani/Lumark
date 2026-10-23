# Module Boundaries and Interface Contracts

## 1. Architectural Layers and Responsibilities

The system is strictly partitioned into two primary execution realms connected via a typed RPC bridge:
1. **The Go Native Backend (Privileged Host):** Responsible for OS interactions, file I/O, IPC coordination, settings persistence, and system dialogs.
2. **The React/TypeScript Frontend (Sandboxed UI):** Responsible for UI layout, tab presentation, document rendering orchestration, bidirectional text alignment, and search/outline interactions.

---

## 2. Go Native Backend Modules (`internal/`)

### 2.1 `internal/application/` (Lifecycle & CLI)
- **Responsibilities:**
  - Application startup, argument parsing (`flag` package or equivalent).
  - Normalizing CLI arguments into absolute file paths.
  - Window creation, size/position persistence, and graceful termination.
  - Initializing services and passing them to Wails runtime.

### 2.2 `internal/instance/` (Single-Instance Coordinator)
- **Responsibilities:**
  - Detecting running instances per user session.
  - Forwarding file paths to existing instance via local IPC (Windows Named Pipe, Linux/macOS Unix Domain Socket).
  - Bringing existing window to focus via OS-specific APIs.
- **Boundary Rules:**
  - Local-only, current-user permissions only. No network listening.

### 2.3 `internal/documents/` (Document Service)
- **Responsibilities:**
  - Validating requested file paths (supported extensions: `.md`, `.markdown`, `.mdown`, `.mkd`).
  - Enforcing 20 MiB document size limit.
  - Reading raw file bytes, UTF-8 validation, and BOM handling.
  - Returning typed `DocumentDTO` (metadata, path, name, UTF-8 content).
- **Boundary Rules:**
  - Strictly read-only. No write or delete methods.

### 2.4 `internal/assets/` (Asset & Link Resolver)
- **Responsibilities:**
  - Resolving relative local image and link references against the active document's parent directory.
  - Path traversal defense: ensuring resolved paths stay within permitted filesystem boundaries.
  - Returning controlled binary data or custom local URI for image rendering.

### 2.5 `internal/settings/` (Settings Service)
- **Responsibilities:**
  - Loading, validating, migrating, and atomically saving preferences in OS user config directory (`~/.config/markdown-viewer/settings.json` or `%APPDATA%\MarkdownViewer\settings.json`).
  - Handling file corruption by backing up and restoring sensible defaults.

### 2.6 `internal/recents/` (Recent Files Service)
- **Responsibilities:**
  - Maintaining an ordered list of up to 20 recently opened files.
  - Verifying file existence on disk without reading file contents.
  - Storing paths and timestamps only.

### 2.7 `internal/platform/` (Platform Integration Adapters)
- **Responsibilities:**
  - Native file picker dialogs.
  - System clipboard interaction.
  - Launching external URLs in the OS default browser after strict scheme validation (`http:`, `https:`, `mailto:` only).
  - Triggering native WebView print where supported.

---

## 3. Frontend Modules (`frontend/src/`)

### 3.1 `features/shell/` (Application Shell & Tabs)
- **Responsibilities:**
  - Top-level layout (menu bar, tab strip, document viewport, TOC sidebar, status bar).
  - Empty state when no documents are open (drop target, open button, recent files list).
  - Tab state management (active tab, tab switching, closing, missing file indicators).

### 3.2 `features/rendering/` (Markdown Pipeline Engine)
- **Responsibilities:**
  - Orchestrating the 10-step rendering pipeline:
    1. Receive UTF-8 content from Go bridge.
    2. Parse Markdown AST (`remark`).
    3. Process GFM extensions (tables, task lists, strikethrough).
    4. Process math AST (`remark-math`).
    5. Convert to HTML AST (`rehype`).
    6. Sanitize HTML via allowlist (`rehype-sanitize`).
    7. Sanitize and scope embedded CSS via dedicated AST parser.
    8. Render custom React components for code, math, diagrams, images, and links.
    9. Apply block-level bidirectional direction (`dir="auto"` or resolved).
    10. Render within contained `.markdown-viewport`.

### 3.3 `features/direction/` (Bidirectional Layout Engine)
- **Responsibilities:**
  - Determining element direction using standard Unicode bidirectional rules.
  - Respecting precedence: Author explicit `dir` / scoped CSS > Auto-detection > User default preference.
  - Preserving LTR layout for code blocks, math, and Mermaid diagrams.

### 3.4 `features/navigation/` (TOC & Search)
- **Responsibilities:**
  - Extracting `h1`-`h6` headings to build document table of contents.
  - Generating deterministic, unique URL-safe slugs for headings.
  - Scoped document text search with non-destructive highlights, match counter, and next/prev scrolling.

### 3.5 `features/preferences/` (Settings Modal & Themes)
- **Responsibilities:**
  - Preference UI (Theme: System/Light/Dark, Direction: Auto/RTL/LTR, Default Zoom, Tab restore).
  - Zoom controls (shortcuts: `Ctrl/Cmd` + `+`, `-`, `0`).

---

## 4. Go/Frontend RPC Contract (Wails Bindings)

The frontend communicates with Go exclusively through typed methods. Arbitrary filesystem access or shell execution is strictly prohibited.

```typescript
// Core Data Transfer Objects (DTOs)

export interface DocumentDTO {
  path: string;           // Absolute normalized file path
  fileName: string;       // File base name
  content: string;        // Validated UTF-8 document content
  fileSizeBytes: number;  // Size in bytes
  lastModified: string;   // ISO timestamp
  isReadOnly: boolean;    // OS file permissions
}

export interface SettingsDTO {
  schemaVersion: number;
  theme: 'system' | 'light' | 'dark';
  defaultDirection: 'auto' | 'rtl' | 'ltr';
  defaultZoom: number;
  restoreOpenTabs: boolean;
  openTabs: string[];     // Paths to restore if enabled
  maxRecentFiles: number;
}

export interface RecentFileDTO {
  path: string;
  lastOpenedAt: string;
  existsOnDisk: boolean;
}

export interface AppErrorDTO {
  code: string;           // E.g., 'FILE_NOT_FOUND', 'FILE_TOO_LARGE', 'INVALID_SCHEME'
  message: string;        // Human-readable, safe error message
  details?: string;       // Non-sensitive technical detail
}

// Service Interface exposed by Go to Frontend
export interface IAppService {
  OpenDocument(filePath: string): Promise<DocumentDTO>;
  OpenFileDialog(): Promise<string[] | null>;
  GetSettings(): Promise<SettingsDTO>;
  SaveSettings(settings: SettingsDTO): Promise<void>;
  GetRecentFiles(): Promise<RecentFileDTO[]>;
  ClearRecentFiles(): Promise<void>;
  ResolveAsset(docPath: string, relativePath: string): Promise<string>;
  OpenExternalURL(url: string): Promise<void>;
  PrintDocument(): Promise<void>;
}
```

---

## 5. Security & Boundary Enforcement Rules

1. **No Arbitrary File Reads:** `OpenDocument` only accepts file paths ending with validated extensions and verifies file boundaries before reading.
2. **No Shell Concatenation:** File paths and URLs are never interpolated into shell strings; OS executions use `exec.Command` with discrete arguments.
3. **Link Interception:** All `<a href="...">` clicks inside the document view are intercepted. External links (`http`, `https`, `mailto`) are forwarded to `OpenExternalURL` to open in the user's default browser. Relative `.md` links trigger internal tab opens. Any `javascript:`, `data:`, or unauthorized protocol links are blocked.
