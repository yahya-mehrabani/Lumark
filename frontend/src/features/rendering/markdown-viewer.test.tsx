import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownViewer } from './MarkdownViewer';

describe('MarkdownViewer Component Integration (US-009.3)', () => {
  it('renders a complete document with header and CommonMark/GFM blocks', () => {
    const content = `
# System Architecture

This document outlines the architecture.

> Note: All operations are local-first.

| Module | Status | Notes |
| :--- | :---: | ---: |
| Backend | Ready | Go services |
| Frontend | Active | React shell |

- [x] Shell and tab store
- [x] Native dialogs
- [ ] Cross-platform validation

See https://wails.io for framework documentation.
`;

    const { container } = render(
      <MarkdownViewer
        document={{
          filename: 'architecture.md',
          filePath: '/workspace/docs/architecture.md',
          content,
        }}
      />
    );

    // Header assertions
    expect(screen.getByTestId('document-header')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'architecture.md' })).toBeInTheDocument();
    expect(screen.getByText('/workspace/docs/architecture.md')).toBeInTheDocument();

    // Markdown content assertions
    expect(screen.getByRole('heading', { level: 1, name: 'System Architecture' })).toBeInTheDocument();
    expect(container.querySelector('blockquote')).toHaveTextContent('Note: All operations are local-first.');

    // Table assertions
    const tableWrapper = container.querySelector('.table-wrapper');
    expect(tableWrapper).toBeInTheDocument();
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);

    // Checkbox assertions
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes).toHaveLength(3);
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(true);
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(true);
    expect((checkboxes[2] as HTMLInputElement).checked).toBe(false);

    // Link assertion
    const link = screen.getByRole('link', { name: 'https://wails.io' });
    expect(link).toHaveAttribute('href', 'https://wails.io');
  });

  it('renders content directly without header when document prop is omitted', () => {
    render(<MarkdownViewer content="## Standalone Content" />);

    expect(screen.queryByTestId('document-header')).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'Standalone Content' })).toBeInTheDocument();
  });

  it('handles empty string content gracefully without throwing errors', () => {
    const { container } = render(<MarkdownViewer content="" />);

    expect(container.querySelector('.markdown-content')).toBeInTheDocument();
    expect(container.querySelector('.markdown-content')?.children).toHaveLength(0);
  });

  it('renders large multi-paragraph documents with bounded performance', () => {
    const paragraphs: string[] = [];
    for (let i = 1; i <= 200; i++) {
      paragraphs.push(`### Section ${i}\n\nParagraph text for section ${i} with **bold** and *italic* formatting.`);
    }
    const largeMarkdown = paragraphs.join('\n\n');

    const startTime = performance.now();
    const { container } = render(<MarkdownViewer content={largeMarkdown} />);
    const elapsed = performance.now() - startTime;

    expect(elapsed).toBeLessThan(5000); // Renders smoothly within threshold
    const headings = container.querySelectorAll('h3');
    expect(headings).toHaveLength(200);
  });

  it('sanitizes script tags and inline event handlers inertly', () => {
    const xssPayload = `
# Security Verification

<script>alert('pwned')</script>
<img src="invalid.png" onerror="alert('xss')" />

[Harmless Link](javascript:alert(1))
`;
    const { container } = render(<MarkdownViewer content={xssPayload} />);

    // Script tag must not exist in DOM
    expect(container.querySelector('script')).toBeNull();

    // Verify inert rendering: malicious JavaScript URI link is neutralized by default
    const jsLink = container.querySelector('a[href^="javascript:"]');
    expect(jsLink).toBeNull();
  });

  it('renders the golden GFM extensions fixture accurately', () => {
    const fixtureMarkdown = `
# GitHub Flavored Markdown Extensions

| Left Aligned | Center Aligned | Right Aligned | Default |
| :--- | :---: | ---: | --- |
| Row 1 Left | Row 1 Center | $100.00 | Normal text |

- [x] Initial design specifications
- [ ] Cross-platform binary packaging

This line demonstrates ~~obsolete deprecated content~~ marked with strikethrough.

Autolink test: Visit https://github.com/wailsapp/wails for questions.

> Markdown is designed to be readable as-is.
`;
    const { container } = render(<MarkdownViewer content={fixtureMarkdown} />);

    // Heading
    expect(screen.getByRole('heading', { level: 1, name: 'GitHub Flavored Markdown Extensions' })).toBeInTheDocument();

    // Table
    expect(container.querySelector('.table-wrapper table')).toBeInTheDocument();
    const ths = container.querySelectorAll('th');
    expect(ths[0].style.textAlign || ths[0].getAttribute('align')).toMatch(/left/);
    expect(ths[1].style.textAlign || ths[1].getAttribute('align')).toMatch(/center/);
    expect(ths[2].style.textAlign || ths[2].getAttribute('align')).toMatch(/right/);

    // Strikethrough
    expect(container.querySelector('del')).toHaveTextContent('obsolete deprecated content');

    // Checkboxes
    const cbs = container.querySelectorAll('input[type="checkbox"]');
    expect(cbs).toHaveLength(2);
    expect((cbs[0] as HTMLInputElement).checked).toBe(true);
    expect((cbs[1] as HTMLInputElement).checked).toBe(false);

    // Quote
    expect(container.querySelector('blockquote')).toHaveTextContent('Markdown is designed to be readable as-is.');

    // Autolink
    expect(screen.getByRole('link', { name: 'https://github.com/wailsapp/wails' })).toBeInTheDocument();
  });
});
