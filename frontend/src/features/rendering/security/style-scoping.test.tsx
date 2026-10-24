import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownViewer } from '../MarkdownViewer';

describe('Markdown Pipeline Style Scoping & Sanitizer Integration (US-015.3)', () => {
  it('scopes author <style> blocks to .markdown-content container (AC 4)', () => {
    const markdown = `
# Scoped Document

<style>
  .sidebar { color: blue; }
  .user-card { margin: 15px; }
</style>

<div className="sidebar">Sidebar Content</div>
`;

    const { container } = render(<MarkdownViewer content={markdown} />);

    const styleElem = container.querySelector('style');
    expect(styleElem).not.toBeNull();
    const styleContent = styleElem?.textContent || styleElem?.innerHTML || '';

    expect(styleContent).toContain('.markdown-content .sidebar');
    expect(styleContent).toContain('.markdown-content .user-card');
    expect(styleContent).not.toMatch(/^\s*\.sidebar/m);
  });

  it('neutralizes position: fixed in <style> blocks to position: absolute (AC 5)', () => {
    const markdown = `
<style>
  .fullscreen-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
  }
</style>
`;

    const { container } = render(<MarkdownViewer content={markdown} />);
    const styleElem = container.querySelector('style');
    const styleContent = styleElem?.textContent || styleElem?.innerHTML || '';

    expect(styleContent).toContain('position: absolute');
    expect(styleContent).not.toContain('position: fixed');
    expect(styleContent).toContain('.markdown-content .fullscreen-overlay');
  });

  it('completely strips @import at-rules from rendered <style> blocks (AC 6)', () => {
    const markdown = `
<style>
  @import url("http://evil.com/style.css");
  .safe-box { color: green; }
</style>
`;

    const { container } = render(<MarkdownViewer content={markdown} />);
    const styleElem = container.querySelector('style');
    const styleContent = styleElem?.textContent || styleElem?.innerHTML || '';

    expect(styleContent).not.toContain('@import');
    expect(styleContent).not.toContain('evil.com');
    expect(styleContent).toContain('.markdown-content .safe-box');
  });

  it('sanitizes inline style attributes on HTML elements', () => {
    const markdown = `
<div style="color: red; position: fixed; top: 0; z-index: 9999;">
  Inline Styled Content
</div>
`;

    render(<MarkdownViewer content={markdown} />);
    const div = screen.getByText('Inline Styled Content');

    expect(div).toBeInTheDocument();
    // Verify position fixed is converted to absolute
    expect(div.style.position).toBe('absolute');
    expect(div.style.color).toBe('red');
    // Verify z-index is clamped to <= 10
    expect(div.style.zIndex).toBe('10');
  });

  it('renders safe HTML with direction, class, and styling intact (AC 1)', () => {
    const markdown = `
<div dir="rtl" class="highlight">
  <span style="color: red;">Persian Text</span>
</div>
`;

    const { container } = render(<MarkdownViewer content={markdown} />);
    const div = container.querySelector('div[dir="rtl"]');
    expect(div).toBeInTheDocument();
    expect(div).toHaveClass('highlight');

    const span = screen.getByText('Persian Text');
    expect(span.style.color).toBe('red');
  });

  it('prevents author styles from escaping to application chrome or header bar', () => {
    const markdown = `
<style>
  .document-header-bar { display: none; }
  .tab-bar { opacity: 0; }
  header { background: red; }
</style>

# Document Title
`;

    const { container } = render(
      <MarkdownViewer
        document={{
          filename: 'test.md',
          filePath: '/path/test.md',
          content: markdown,
        }}
      />
    );

    // Header bar must remain present and visible in the DOM
    const header = screen.getByTestId('document-header');
    expect(header).toBeInTheDocument();

    const styleElem = container.querySelector('style');
    const styleContent = styleElem?.textContent || styleElem?.innerHTML || '';

    // Verify all chrome-targeting selectors are prepended with .markdown-content
    expect(styleContent).toContain('.markdown-content .document-header-bar');
    expect(styleContent).toContain('.markdown-content .tab-bar');
    expect(styleContent).toContain('.markdown-content header');
  });

  it('gracefully handles malformed CSS without crashing the document render (AC 7 & AUD-010)', () => {
    const markdown = `
# Valid Header

<style>
  div { malformed syntax @#$$%^ unclosed
</style>

<p>Paragraph after malformed CSS</p>
`;

    render(<MarkdownViewer content={markdown} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Valid Header');
    expect(screen.getByText('Paragraph after malformed CSS')).toBeInTheDocument();
  });
});
