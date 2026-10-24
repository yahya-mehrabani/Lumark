import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MarkdownViewer } from './MarkdownViewer';
import { MermaidBlock } from './components/MermaidBlock';

const goldenMermaidFixture = `# Mermaid Diagrams Golden Fixture Suite

This document tests offline rendering of Mermaid diagrams across all core supported diagram types per FR-RENDER-005, FR-RENDER-009, and PRD Section 5.4.

## 1. Flowchart Diagram

\`\`\`mermaid
flowchart TD
  Start([Start Process]) --> Input[/User Inputs Markdown/]
  Input --> Check{Valid Syntax?}
  Check -->|Yes| AST[Build Document AST]
  Check -->|No| Error[Display Syntax Error Card]
  AST --> Render[Render Sanitized SVG]
  Error --> Fallback[Show Raw Source]
  Render --> End([Document View Ready])
  Fallback --> End
\`\`\`

## 2. Sequence Diagram

\`\`\`mermaid
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
\`\`\`

## 3. Class Diagram

\`\`\`mermaid
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
\`\`\`

## 4. State Diagram

\`\`\`mermaid
stateDiagram-v2
  [*] --> Uninitialized
  Uninitialized --> Loading : Load Document
  Loading --> Rendered : Valid Markdown & Mermaid
  Loading --> ErrorFallback : Syntax Exception Caught
  Rendered --> [*] : Close Tab
  ErrorFallback --> [*] : Close Tab
\`\`\`

## 5. Entity-Relationship (ER) Diagram

\`\`\`mermaid
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
\`\`\`

## 6. Gantt Chart

\`\`\`mermaid
gantt
  title Markdown Viewer Development Roadmap
  dateFormat YYYY-MM-DD
  section Core Infrastructure
  Native Lifecycle & Tabs       :done, p1, 2026-10-01, 2026-10-10
  CommonMark & Core Pipeline    :done, p2, 2026-10-11, 2026-10-20
  section Advanced Features
  Mermaid Offline Rendering     :active, p3, 2026-10-21, 2026-10-25
  LaTeX Math & KaTeX            :p4, 2026-10-26, 2026-10-31
\`\`\`
`;

describe('Mermaid Full Pipeline Integration & Golden Fixtures (US-013.4)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders all 6 diagram types from the golden fixture suite without errors', async () => {
    render(<MarkdownViewer content={goldenMermaidFixture} />);

    // Assert document headings are visible
    expect(screen.getByRole('heading', { name: /Mermaid Diagrams Golden Fixture Suite/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /1\. Flowchart Diagram/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /2\. Sequence Diagram/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /3\. Class Diagram/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /4\. State Diagram/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /5\. Entity-Relationship \(ER\) Diagram/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /6\. Gantt Chart/i })).toBeInTheDocument();

    // Wait for all 6 diagrams to render into vector SVG
    await waitFor(
      () => {
        const containers = screen.getAllByTestId('mermaid-container');
        expect(containers).toHaveLength(6);
        for (const container of containers) {
          expect(container.querySelector('svg')).toBeInTheDocument();
        }
      },
      { timeout: 5000 }
    );
  });

  it('neutralizes click directives and dangerous links so clicking triggers zero script execution (AC 4, SEC-INVAR-07)', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const maliciousCode = `
flowchart TD
  NodeA[Legitimate Node] --> NodeB[Target Node]
  click NodeA "javascript:alert('pwned')" "Malicious Link"
  click NodeB call alert() "Malicious Callback"
`;

    render(<MermaidBlock rawCode={maliciousCode} />);

    await waitFor(() => {
      const container = screen.getByTestId('mermaid-container');
      expect(container.querySelector('svg')).toBeInTheDocument();

      // Assert no javascript: href exists in the rendered SVG
      const links = container.querySelectorAll('a');
      for (const link of Array.from(links)) {
        const href = link.getAttribute('href') || link.getAttribute('xlink:href') || '';
        expect(href).not.toMatch(/javascript:/i);
      }
    });

    const container = screen.getByTestId('mermaid-container');
    const svgNode = container.querySelector('svg');
    if (svgNode) {
      fireEvent.click(svgNode);
    }

    // Verify window.alert was never called
    expect(alertMock).not.toHaveBeenCalled();
    alertMock.mockRestore();
  });

  it('enforces horizontal scrolling container for large diagrams (AC 5, PRD §5.4)', async () => {
    const wideDiagram = `
flowchart LR
  Step1 --> Step2 --> Step3 --> Step4 --> Step5 --> Step6 --> Step7 --> Step8 --> Step9 --> Step10
`;
    render(<MermaidBlock rawCode={wideDiagram} />);

    await waitFor(() => {
      const container = screen.getByTestId('mermaid-container');
      expect(container).toHaveStyle({ overflowX: 'auto', maxWidth: '100%' });
      expect(container).toHaveAttribute('dir', 'ltr');
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('renders multiple diagrams independently where an invalid diagram does not affect valid ones (AC 3)', async () => {
    const mixedDocument = `
# Multi-diagram document

\`\`\`mermaid
flowchart TD
  Alpha --> Beta
\`\`\`

\`\`\`mermaid
flowchart TD; BrokenSyntax -->;
\`\`\`

\`\`\`mermaid
flowchart LR
  Gamma --> Delta
\`\`\`
`;

    render(<MarkdownViewer content={mixedDocument} />);

    await waitFor(() => {
      const validContainers = screen.getAllByTestId('mermaid-container');
      expect(validContainers).toHaveLength(2);

      const errorCards = screen.getAllByTestId('mermaid-error-card');
      expect(errorCards).toHaveLength(1);
      expect(errorCards[0]).toHaveTextContent('Mermaid Syntax Error');
      expect(errorCards[0]).toHaveTextContent('flowchart TD; BrokenSyntax -->;');
    });
  });

  it('handles empty and whitespace-only diagram blocks safely', async () => {
    render(<MermaidBlock rawCode="      " />);

    await waitFor(() => {
      const container = screen.getByTestId('mermaid-container');
      expect(container).toBeInTheDocument();
      expect(screen.queryByTestId('mermaid-error-card')).not.toBeInTheDocument();
    });
  });
});
