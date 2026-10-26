import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MarkdownViewer } from '../rendering/MarkdownViewer';

describe('In-Document Search Acceptance Suite (US-022.4 / FR-NAV-002)', () => {
  const sampleDocument = `
# Markdown Navigation Guide

Welcome to the markdown reader search test suite.
Search is an essential navigation tool for large markdown documents.

## Section One: Overview
This section outlines search features.
We support fast search, responsive navigation, and match highlights.

## Section Two: Advanced Details
Advanced search details include case sensitivity and keyboard shortcuts.
Another search keyword appears here.

## بخش فارسی (Persian Section)
این یک مستند آزمایشی برای قابلیت جستجو در متون فارسی است.
جستجو باید در متون راست‌به‌چپ نیز به درستی کار کند.
`;

  beforeEach(() => {
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = () => {};
    }
  });

  it('Criterion 1: Pressing Ctrl/Cmd+F focuses search bar; typing query highlights all matching words', () => {
    render(
      <MarkdownViewer
        document={{
          filename: 'guide.md',
          filePath: '/docs/guide.md',
          content: sampleDocument,
        }}
      />
    );

    expect(screen.queryByTestId('search-bar')).not.toBeInTheDocument();

    // Trigger shortcut Ctrl+F
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true })
      );
    });

    // Verify search bar is visible and input is focused
    const searchBar = screen.getByTestId('search-bar');
    expect(searchBar).toBeInTheDocument();
    const input = screen.getByTestId('search-input') as HTMLInputElement;
    expect(document.activeElement).toBe(input);

    // Type query "search"
    act(() => {
      fireEvent.change(input, { target: { value: 'search' } });
    });

    // Check all matching words highlighted in document
    const contentEl = screen.getByTestId('markdown-content');
    const marks = contentEl.querySelectorAll('mark[data-search-match="true"]');
    expect(marks.length).toBeGreaterThan(0);
    expect(marks[0].textContent?.toLowerCase()).toBe('search');
  });

  it('Criterion 2: Status displays accurate match count ("1 of 6"); pressing Enter cycles through matches', () => {
    render(
      <MarkdownViewer
        document={{
          filename: 'guide.md',
          filePath: '/docs/guide.md',
          content: sampleDocument,
        }}
      />
    );

    // Open search via button
    fireEvent.click(screen.getByTestId('doc-search-toggle'));
    const input = screen.getByTestId('search-input');

    act(() => {
      fireEvent.change(input, { target: { value: 'search' } });
    });

    const marks = screen.getByTestId('markdown-content').querySelectorAll('mark[data-search-match="true"]');
    const totalCount = marks.length;
    expect(totalCount).toBeGreaterThanOrEqual(5);

    // Initial counter: "1 of N"
    expect(screen.getByTestId('search-counter')).toHaveTextContent(`1 of ${totalCount}`);
    expect(marks[0].classList.contains('active')).toBe(true);

    // Press Enter to cycle to next match
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
    });
    expect(screen.getByTestId('search-counter')).toHaveTextContent(`2 of ${totalCount}`);
    expect(marks[1].classList.contains('active')).toBe(true);
    expect(marks[0].classList.contains('active')).toBe(false);

    // Press Shift+Enter to cycle back to previous match
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    });
    expect(screen.getByTestId('search-counter')).toHaveTextContent(`1 of ${totalCount}`);
    expect(marks[0].classList.contains('active')).toBe(true);
  });

  it('Criterion 3: Active match smoothly scrolls into the center of the viewport', () => {
    render(
      <MarkdownViewer
        document={{
          filename: 'guide.md',
          filePath: '/docs/guide.md',
          content: sampleDocument,
        }}
      />
    );

    fireEvent.click(screen.getByTestId('doc-search-toggle'));
    const input = screen.getByTestId('search-input');

    act(() => {
      fireEvent.change(input, { target: { value: 'search' } });
    });

    const marks = screen.getByTestId('markdown-content').querySelectorAll('mark[data-search-match="true"]');
    const scrollMock = vi.fn();
    marks[1].scrollIntoView = scrollMock;

    // Cycle to match 2
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
    });

    expect(scrollMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    });
  });

  it('Criterion 4: Copying text across a highlighted search match copies original text without injected tags', () => {
    render(
      <MarkdownViewer
        document={{
          filename: 'guide.md',
          filePath: '/docs/guide.md',
          content: sampleDocument,
        }}
      />
    );

    const contentEl = screen.getByTestId('markdown-content');
    const originalText = contentEl.textContent;

    fireEvent.click(screen.getByTestId('doc-search-toggle'));
    const input = screen.getByTestId('search-input');

    act(() => {
      fireEvent.change(input, { target: { value: 'search' } });
    });

    // Text content when copied or selected contains NO HTML mark tags
    expect(contentEl.textContent).toBe(originalText);
    expect(contentEl.textContent).not.toContain('<mark');
    expect(contentEl.textContent).not.toContain('</mark>');
  });

  it('Criterion 5: Pressing Escape closes the search bar and removes all highlights immediately', () => {
    render(
      <MarkdownViewer
        document={{
          filename: 'guide.md',
          filePath: '/docs/guide.md',
          content: sampleDocument,
        }}
      />
    );

    fireEvent.click(screen.getByTestId('doc-search-toggle'));
    const input = screen.getByTestId('search-input');

    act(() => {
      fireEvent.change(input, { target: { value: 'search' } });
    });

    const contentEl = screen.getByTestId('markdown-content');
    expect(contentEl.querySelectorAll('mark[data-search-match="true"]').length).toBeGreaterThan(0);

    // Press Escape
    act(() => {
      fireEvent.keyDown(input, { key: 'Escape' });
    });

    // Search bar is removed from DOM
    expect(screen.queryByTestId('search-bar')).not.toBeInTheDocument();
    // All highlights are removed immediately
    expect(contentEl.querySelectorAll('mark[data-search-match="true"]').length).toBe(0);
  });

  it('Persian / RTL Text: highlights occurrences in RTL sections with accurate Unicode offsets', () => {
    render(
      <MarkdownViewer
        document={{
          filename: 'guide.md',
          filePath: '/docs/guide.md',
          content: sampleDocument,
        }}
      />
    );

    fireEvent.click(screen.getByTestId('doc-search-toggle'));
    const input = screen.getByTestId('search-input');

    act(() => {
      fireEvent.change(input, { target: { value: 'جستجو' } });
    });

    const marks = screen.getByTestId('markdown-content').querySelectorAll('mark[data-search-match="true"]');
    expect(marks.length).toBe(2);
    expect(marks[0].textContent).toBe('جستجو');
    expect(marks[1].textContent).toBe('جستجو');
    expect(screen.getByTestId('search-counter')).toHaveTextContent('1 of 2');
  });

  it('Case Sensitivity Toggle: updates matches dynamically between case-insensitive and case-sensitive', () => {
    render(
      <MarkdownViewer
        document={{
          filename: 'guide.md',
          filePath: '/docs/guide.md',
          content: sampleDocument,
        }}
      />
    );

    fireEvent.click(screen.getByTestId('doc-search-toggle'));
    const input = screen.getByTestId('search-input');

    // Search 'Navigation'
    act(() => {
      fireEvent.change(input, { target: { value: 'Navigation' } });
    });

    // In sampleDocument: 'Navigation' in title, 'navigation' in 2 prose lines -> 3 matches case-insensitive
    const marksCI = screen.getByTestId('markdown-content').querySelectorAll('mark[data-search-match="true"]');
    expect(marksCI.length).toBe(3);
    expect(screen.getByTestId('search-counter')).toHaveTextContent('1 of 3');

    // Toggle Case Sensitivity
    const toggleBtn = screen.getByTestId('search-case-toggle');
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');

    // Case-sensitive: only 1 'Navigation'
    const marksCS = screen.getByTestId('markdown-content').querySelectorAll('mark[data-search-match="true"]');
    expect(marksCS.length).toBe(1);
    expect(marksCS[0].textContent).toBe('Navigation');
    expect(screen.getByTestId('search-counter')).toHaveTextContent('1 of 1');
  });

  it('Layout positioning: adds has-toc-open class to search bar when outline panel is open', () => {
    render(
      <MarkdownViewer
        document={{
          filename: 'guide.md',
          filePath: '/docs/guide.md',
          content: sampleDocument,
        }}
      />
    );

    // Open search
    fireEvent.click(screen.getByTestId('doc-search-toggle'));
    const searchBar = screen.getByTestId('search-bar');
    expect(searchBar).not.toHaveClass('has-toc-open');

    // Open TOC / Outline
    const tocToggle = screen.getByTestId('doc-toc-toggle');
    fireEvent.click(tocToggle);
    expect(searchBar).toHaveClass('has-toc-open');

    // Close TOC / Outline
    fireEvent.click(tocToggle);
    expect(searchBar).not.toHaveClass('has-toc-open');
  });
});
