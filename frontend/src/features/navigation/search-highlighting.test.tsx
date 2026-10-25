import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MarkdownViewer } from '../rendering/MarkdownViewer';

describe('Search Highlighting & Keyboard Shortcuts (US-022.3)', () => {
  const sampleMarkdown = `
# Markdown In-Document Search Specification

This document describes the in-document text search engine.
Search must be fast, responsive, and completely non-destructive.

## Multiple Matches
Search for search and search again. Every search match is highlighted.
`;

  beforeEach(() => {
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = () => {};
    }
  });

  it('opens search bar when Ctrl+F or Cmd+F is pressed', () => {
    render(
      <MarkdownViewer
        document={{
          filename: 'test.md',
          filePath: '/path/test.md',
          content: sampleMarkdown,
        }}
      />
    );

    expect(screen.queryByTestId('search-bar')).not.toBeInTheDocument();

    // Trigger Ctrl+F
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true })
      );
    });

    expect(screen.getByTestId('search-bar')).toBeInTheDocument();
    const input = screen.getByTestId('search-input') as HTMLInputElement;
    expect(document.activeElement).toBe(input);
  });

  it('opens and closes search bar via toolbar Find button', () => {
    render(
      <MarkdownViewer
        document={{
          filename: 'test.md',
          filePath: '/path/test.md',
          content: sampleMarkdown,
        }}
      />
    );

    const toggleBtn = screen.getByTestId('doc-search-toggle');
    expect(screen.queryByTestId('search-bar')).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('search-bar')).toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    expect(toggleBtn.className).toContain('active');

    // Click to close
    fireEvent.click(toggleBtn);
    expect(screen.queryByTestId('search-bar')).not.toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('highlights all matching text in document without corrupting underlying DOM', () => {
    render(
      <MarkdownViewer
        document={{
          filename: 'test.md',
          filePath: '/path/test.md',
          content: sampleMarkdown,
        }}
      />
    );

    const contentEl = screen.getByTestId('markdown-content');
    const originalText = contentEl.textContent;

    // Open search
    fireEvent.click(screen.getByTestId('doc-search-toggle'));

    const input = screen.getByTestId('search-input');
    // Type query "search"
    act(() => {
      fireEvent.change(input, { target: { value: 'search' } });
    });

    // Check matches
    const marks = contentEl.querySelectorAll('mark[data-search-match="true"]');
    expect(marks.length).toBe(7);

    // Active match is 1st match
    expect(marks[0].classList.contains('active')).toBe(true);
    expect(marks[0].getAttribute('data-search-active')).toBe('true');
    expect(screen.getByTestId('search-counter')).toHaveTextContent('1 of 7');

    // Verify text content is completely preserved
    expect(contentEl.textContent).toBe(originalText);
  });

  it('cycles through matches using Enter, Shift+Enter, F3, and Shift+F3', () => {
    render(
      <MarkdownViewer
        document={{
          filename: 'test.md',
          filePath: '/path/test.md',
          content: sampleMarkdown,
        }}
      />
    );

    fireEvent.click(screen.getByTestId('doc-search-toggle'));
    const input = screen.getByTestId('search-input');

    act(() => {
      fireEvent.change(input, { target: { value: 'search' } });
    });

    const marks = screen.getByTestId('markdown-content').querySelectorAll('mark[data-search-match="true"]');
    expect(marks.length).toBe(7);

    // Enter -> match 2
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
    });
    expect(screen.getByTestId('search-counter')).toHaveTextContent('2 of 7');
    expect(marks[1].classList.contains('active')).toBe(true);
    expect(marks[0].classList.contains('active')).toBe(false);

    // F3 -> match 3
    act(() => {
      fireEvent.keyDown(input, { key: 'F3', shiftKey: false });
    });
    expect(screen.getByTestId('search-counter')).toHaveTextContent('3 of 7');
    expect(marks[2].classList.contains('active')).toBe(true);

    // Shift+Enter -> match 2
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    });
    expect(screen.getByTestId('search-counter')).toHaveTextContent('2 of 7');
    expect(marks[1].classList.contains('active')).toBe(true);

    // Shift+F3 -> match 1
    act(() => {
      fireEvent.keyDown(input, { key: 'F3', shiftKey: true });
    });
    expect(screen.getByTestId('search-counter')).toHaveTextContent('1 of 7');
    expect(marks[0].classList.contains('active')).toBe(true);
  });

  it('indexes text inside code blocks after code block highlights mount', async () => {
    const codeMarkdown = `
# Code Document

\`\`\`javascript
function calculateScore(query) {
  return query ? 100 : 0;
}
\`\`\`
`;

    render(
      <MarkdownViewer
        document={{
          filename: 'code.md',
          filePath: '/path/code.md',
          content: codeMarkdown,
        }}
      />
    );

    // Wait for code block Shiki highlighter to finish rendering
    await waitFor(() => {
      expect(screen.getByTestId('shiki-wrapper')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('doc-search-toggle'));
    const input = screen.getByTestId('search-input');

    act(() => {
      fireEvent.change(input, { target: { value: 'calculateScore' } });
    });

    const marks = screen.getByTestId('markdown-content').querySelectorAll('mark[data-search-match="true"]');
    expect(marks.length).toBe(1);
    expect(screen.getByTestId('search-counter')).toHaveTextContent('1 of 1');
  });

  it('closes search bar on Escape and immediately clears all highlights', () => {
    render(
      <MarkdownViewer
        document={{
          filename: 'test.md',
          filePath: '/path/test.md',
          content: sampleMarkdown,
        }}
      />
    );

    fireEvent.click(screen.getByTestId('doc-search-toggle'));
    const input = screen.getByTestId('search-input');

    act(() => {
      fireEvent.change(input, { target: { value: 'search' } });
    });

    const contentEl = screen.getByTestId('markdown-content');
    expect(contentEl.querySelectorAll('mark[data-search-match="true"]').length).toBe(7);

    // Press Escape
    act(() => {
      fireEvent.keyDown(input, { key: 'Escape' });
    });

    expect(screen.queryByTestId('search-bar')).not.toBeInTheDocument();
    expect(contentEl.querySelectorAll('mark[data-search-match="true"]').length).toBe(0);
  });

  it('preserves plain text copying across highlighted matches', () => {
    render(
      <MarkdownViewer
        document={{
          filename: 'test.md',
          filePath: '/path/test.md',
          content: 'Here is a test sentence with highlighted text for testing.',
        }}
      />
    );

    const contentEl = screen.getByTestId('markdown-content');
    const originalText = contentEl.textContent;

    fireEvent.click(screen.getByTestId('doc-search-toggle'));
    const input = screen.getByTestId('search-input');

    act(() => {
      fireEvent.change(input, { target: { value: 'highlighted' } });
    });

    // Verify mark exists
    expect(contentEl.querySelectorAll('mark[data-search-match="true"]').length).toBe(1);

    // Simulating selection or copying across the element: text content contains NO tags
    expect(contentEl.textContent).toBe(originalText);
    expect(contentEl.textContent).not.toContain('<mark>');
    expect(contentEl.textContent).not.toContain('</mark>');
  });
});
