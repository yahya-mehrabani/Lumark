# Mermaid Diagrams Golden Fixture Suite

This document tests offline rendering of Mermaid diagrams across all core supported diagram types per FR-RENDER-005, FR-RENDER-009, and PRD Section 5.4.

## 1. Flowchart Diagram

```mermaid
flowchart TD
  Start([Start Process]) --> Input[/User Inputs Markdown/]
  Input --> Check{Valid Syntax?}
  Check -->|Yes| AST[Build Document AST]
  Check -->|No| Error[Display Syntax Error Card]
  AST --> Render[Render Sanitized SVG]
  Error --> Fallback[Show Raw Source]
  Render --> End([Document View Ready])
  Fallback --> End
```

## 2. Sequence Diagram

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant UI as AppShell (React)
  participant Renderer as MermaidBlock
  participant Adapter as MermaidAdapter (Strict)

  User->>UI: Open Markdown with Mermaid fence
  UI->>Renderer: Mount MermaidBlock(rawCode)
  Renderer->>Adapter: renderMermaid(rawCode, options)
  Adapter-->>Renderer: Return sanitized SVG string
  Renderer-->>UI: Display responsive SVG in LTR container
  UI-->>User: Rendered vector diagram
```

## 3. Class Diagram

```mermaid
classDiagram
  class DocumentService {
    +OpenFile(path: string) Document
    +SaveSettings(settings: Settings) bool
  }
  class TabManager {
    +ActiveTabId: string
    +OpenTab(doc: Document) void
    +CloseTab(id: string) void
  }
  class MarkdownViewer {
    +content: string
    +render() JSX
  }
  DocumentService <|-- TabManager : communicates with
  TabManager *-- MarkdownViewer : displays
```

## 4. State Diagram

```mermaid
stateDiagram-v2
  [*] --> Uninitialized
  Uninitialized --> Loading : Load Document
  Loading --> Rendered : Valid Markdown & Mermaid
  Loading --> ErrorFallback : Syntax Exception Caught
  Rendered --> [*] : Close Tab
  ErrorFallback --> [*] : Close Tab
```

## 5. Entity-Relationship (ER) Diagram

```mermaid
erDiagram
  WORKSPACE ||--|{ DOCUMENT : contains
  DOCUMENT ||--o{ DIAGRAM : embeds
  DOCUMENT {
    string id
    string title
    string filepath
  }
  DIAGRAM {
    string diagramType
    string rawSource
    boolean isValid
  }
```

## 6. Gantt Chart

```mermaid
gantt
  title Markdown Viewer Development Roadmap
  dateFormat YYYY-MM-DD
  section Core Infrastructure
  Native Lifecycle & Tabs       :done, p1, 2026-10-01, 2026-10-10
  CommonMark & Core Pipeline    :done, p2, 2026-10-11, 2026-10-20
  section Advanced Features
  Mermaid Offline Rendering     :active, p3, 2026-10-21, 2026-10-25
  LaTeX Math & KaTeX            :p4, 2026-10-26, 2026-10-31
```
