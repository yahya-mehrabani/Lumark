import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MermaidBlock, MermaidErrorBoundary } from './components/MermaidBlock';
import { MarkdownViewer } from './MarkdownViewer';

describe('Mermaid Error Boundary & Fault Isolation (US-013.2)', () => {
  it('renders a valid diagram successfully into sanitized SVG container', async () => {
    const validCode = `
graph LR
  Client[Web Client] --> Server[Go Backend]
`;
    render(<MermaidBlock rawCode={validCode} />);

    await waitFor(() => {
      const container = screen.getByTestId('mermaid-container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('dir', 'ltr');
      expect(container).toHaveStyle({ overflowX: 'auto' });
      expect(screen.getByTestId('mermaid-svg-wrapper')).toBeInTheDocument();
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('renders a formatted error card displaying syntax error and preserving raw code on invalid syntax', async () => {
    const invalidCode = 'graph TD; A -->;';
    const onError = vi.fn();

    render(<MermaidBlock rawCode={invalidCode} onError={onError} />);

    await waitFor(() => {
      const errorCard = screen.getByTestId('mermaid-error-card');
      expect(errorCard).toBeInTheDocument();
      expect(screen.getByTestId('mermaid-error-title')).toHaveTextContent('Mermaid Syntax Error');
      expect(screen.getByTestId('mermaid-error-message')).not.toBeEmptyDOMElement();
      expect(screen.getByTestId('mermaid-raw-source')).toHaveTextContent(invalidCode);
    });

    expect(onError).toHaveBeenCalled();
  });

  it('isolates diagram errors so one broken diagram does not break valid diagrams', async () => {
    const validCode = 'graph TD; Start --> Finish;';
    const invalidCode = 'graph TD; MissingNode -->;';

    render(
      <div>
        <div data-testid="block-1">
          <MermaidBlock rawCode={validCode} />
        </div>
        <div data-testid="block-2">
          <MermaidBlock rawCode={invalidCode} />
        </div>
      </div>
    );

    await waitFor(() => {
      const block1 = screen.getByTestId('block-1');
      const block2 = screen.getByTestId('block-2');

      // Block 1 renders valid diagram SVG
      expect(block1.querySelector('[data-testid="mermaid-container"]')).toBeInTheDocument();
      expect(block1.querySelector('svg')).toBeInTheDocument();

      // Block 2 renders localized error card
      expect(block2.querySelector('[data-testid="mermaid-error-card"]')).toBeInTheDocument();
      expect(block2.querySelector('[data-testid="mermaid-raw-source"]')).toHaveTextContent(invalidCode);
    });
  });

  it('catches unexpected React rendering errors via MermaidErrorBoundary', () => {
    const ThrowingComponent = () => {
      throw new Error('Fatal DOM explosion in diagram child');
    };

    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <MermaidErrorBoundary fallbackRawCode="graph TD; Broken;">
        <ThrowingComponent />
      </MermaidErrorBoundary>
    );

    expect(screen.getByTestId('mermaid-error-card')).toBeInTheDocument();
    expect(screen.getByTestId('mermaid-error-title')).toHaveTextContent('Mermaid Syntax Error');
    expect(screen.getByTestId('mermaid-error-message')).toHaveTextContent('Fatal DOM explosion in diagram child');
    expect(screen.getByTestId('mermaid-raw-source')).toHaveTextContent('graph TD; Broken;');

    spy.mockRestore();
  });

  it('integrates seamlessly in MarkdownViewer with mixed Markdown, valid diagram, and broken diagram', async () => {
    const markdown = `
# Architecture Document

Here is our system design:

\`\`\`mermaid
graph TD
  User --> Frontend
  Frontend --> Backend
\`\`\`

Here is a broken diagram:

\`\`\`mermaid
graph TD; Invalid -->;
\`\`\`

End of document.
`;

    render(<MarkdownViewer content={markdown} />);

    // Main heading rendered
    expect(screen.getByRole('heading', { name: /Architecture Document/i })).toBeInTheDocument();
    expect(screen.getByText('Here is our system design:')).toBeInTheDocument();
    expect(screen.getByText('End of document.')).toBeInTheDocument();

    await waitFor(() => {
      // Valid diagram rendered
      expect(screen.getByTestId('mermaid-container')).toBeInTheDocument();
      // Broken diagram shows isolated error card without blanking the document
      expect(screen.getByTestId('mermaid-error-card')).toBeInTheDocument();
      expect(screen.getByTestId('mermaid-raw-source')).toHaveTextContent('graph TD; Invalid -->;');
    });
  });
});
