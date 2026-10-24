import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MermaidBlock } from './components/MermaidBlock';
import { renderMermaid, detectAppTheme } from './mermaid-adapter';

describe('Mermaid Diagram Types & Theme Synchronization (US-013.3)', () => {
  it('renders a flowchart diagram cleanly into SVG', async () => {
    const code = `
flowchart TD
  A[Start] --> B{Process}
  B -->|OK| C[Done]
`;
    render(<MermaidBlock rawCode={code} />);

    await waitFor(() => {
      const container = screen.getByTestId('mermaid-container');
      expect(container.querySelector('svg')).toBeInTheDocument();
      expect(container.querySelector('svg')?.textContent).toContain('Start');
    });
  });

  it('renders a sequence diagram cleanly into SVG', async () => {
    const code = `
sequenceDiagram
  Alice->>Bob: Hello Bob
  Bob-->>Alice: Hi Alice
`;
    render(<MermaidBlock rawCode={code} />);

    await waitFor(() => {
      const container = screen.getByTestId('mermaid-container');
      expect(container.querySelector('svg')).toBeInTheDocument();
      expect(container.querySelector('svg')?.textContent).toContain('Alice');
    });
  });

  it('renders a class diagram cleanly into SVG', async () => {
    const code = `
classDiagram
  class User {
    +String name
    +login()
  }
`;
    render(<MermaidBlock rawCode={code} />);

    await waitFor(() => {
      const container = screen.getByTestId('mermaid-container');
      expect(container.querySelector('svg')).toBeInTheDocument();
      expect(container.querySelector('svg')?.textContent).toContain('User');
    });
  });

  it('renders a state diagram cleanly into SVG', async () => {
    const code = `
stateDiagram-v2
  [*] --> Idle
  Idle --> Processing: Event
  Processing --> [*]: Complete
`;
    render(<MermaidBlock rawCode={code} />);

    await waitFor(() => {
      const container = screen.getByTestId('mermaid-container');
      expect(container.querySelector('svg')).toBeInTheDocument();
      expect(container.querySelector('svg')?.textContent).toContain('Idle');
    });
  });

  it('renders an entity-relationship (ER) diagram cleanly into SVG', async () => {
    const code = `
erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
`;
    render(<MermaidBlock rawCode={code} />);

    await waitFor(() => {
      const container = screen.getByTestId('mermaid-container');
      expect(container.querySelector('svg')).toBeInTheDocument();
      expect(container.querySelector('svg')?.textContent).toContain('CUSTOMER');
    });
  });

  it('renders a Gantt chart cleanly into SVG', async () => {
    const code = `
gantt
  title Project Schedule
  dateFormat YYYY-MM-DD
  section Tasks
  Task 1: a1, 2026-10-01, 10d
  Task 2: after a1, 5d
`;
    render(<MermaidBlock rawCode={code} />);

    await waitFor(() => {
      const container = screen.getByTestId('mermaid-container');
      expect(container.querySelector('svg')).toBeInTheDocument();
      expect(container.querySelector('svg')?.textContent).toContain('Task 1');
    });
  });

  it('adapts diagram styling and attributes when rendered with light vs dark themes', async () => {
    const code = 'graph TD; NodeA --> NodeB;';

    const lightResult = await renderMermaid(code, { theme: 'default' });
    expect(lightResult.svg).toContain('<svg');

    const darkResult = await renderMermaid(code, { theme: 'dark' });
    expect(darkResult.svg).toContain('<svg');
  });

  it('detects app theme correctly from documentElement data-theme attribute', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    expect(detectAppTheme()).toBe('default');

    document.documentElement.setAttribute('data-theme', 'dark');
    expect(detectAppTheme()).toBe('dark');

    document.documentElement.removeAttribute('data-theme');
  });

  it('dynamically adapts MermaidBlock when document theme attribute changes', async () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const code = 'graph TD; Alpha --> Beta;';

    render(<MermaidBlock rawCode={code} />);

    await waitFor(() => {
      const container = screen.getByTestId('mermaid-container');
      expect(container).toHaveAttribute('data-mermaid-theme', 'dark');
    });

    // Switch app theme to light
    await act(async () => {
      document.documentElement.setAttribute('data-theme', 'light');
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    await waitFor(() => {
      const container = screen.getByTestId('mermaid-container');
      expect(container).toHaveAttribute('data-mermaid-theme', 'default');
    });

    document.documentElement.removeAttribute('data-theme');
  });
});
