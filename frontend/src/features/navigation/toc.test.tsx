import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { MarkdownViewer } from '../rendering/MarkdownViewer';
import { TableOfContents } from './TableOfContents';
import { extractHeadingsFromMarkdown, buildTocTree } from './tocGenerator';

describe('Table of Contents Acceptance Criteria & Integration Suite (US-021.4)', () => {
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView =
      scrollIntoViewMock as unknown as typeof Element.prototype.scrollIntoView;

    // Mock IntersectionObserver
    window.IntersectionObserver = vi.fn(function (this: any) {
      this.observe = vi.fn();
      this.unobserve = vi.fn();
      this.disconnect = vi.fn();
    }) as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Criterion 1: Opening a document with headings generates a matching tree structure in the TOC panel', () => {
    const markdown = `
# Executive Summary
## Market Analysis
### Regional Demographics
### Competitor Landscape
## Technical Architecture
### Data Storage
`;
    render(
      <MarkdownViewer
        document={{ filename: 'report.md', content: markdown }}
        showToc={true}
      />
    );

    const tocSidebar = screen.getByTestId('toc-sidebar');
    expect(tocSidebar).toBeInTheDocument();

    const tocList = screen.getByTestId('toc-list');
    expect(tocList).toBeInTheDocument();

    // Verify all 6 headings appear in the outline
    expect(within(tocSidebar).getByText('Executive Summary')).toBeInTheDocument();
    expect(within(tocSidebar).getByText('Market Analysis')).toBeInTheDocument();
    expect(within(tocSidebar).getByText('Regional Demographics')).toBeInTheDocument();
    expect(within(tocSidebar).getByText('Competitor Landscape')).toBeInTheDocument();
    expect(within(tocSidebar).getByText('Technical Architecture')).toBeInTheDocument();
    expect(within(tocSidebar).getByText('Data Storage')).toBeInTheDocument();

    // Verify hierarchical nesting
    const summaryItem = screen.getByTestId('toc-item-executive-summary');
    expect(summaryItem).toHaveClass('toc-level-1');
    const marketItem = screen.getByTestId('toc-item-market-analysis');
    expect(marketItem).toHaveClass('toc-level-2');
  });

  it('Criterion 2 & Instruction 2: Large document with 10+ headings renders TOC and scrolls when 5th heading is clicked', () => {
    const headings = [
      'Chapter 1: Getting Started',
      'Chapter 2: Installation',
      'Chapter 3: Configuration',
      'Chapter 4: Basic Concepts',
      'Chapter 5: Advanced Navigation',
      'Chapter 6: Data Pipelines',
      'Chapter 7: Security Architecture',
      'Chapter 8: Performance Tuning',
      'Chapter 9: Extensibility',
      'Chapter 10: Troubleshooting',
      'Chapter 11: API Reference',
      'Chapter 12: Changelog',
    ];

    const markdown = headings.map((h, i) => `## ${h}\n\nContent for section ${i + 1}.\n`).join('\n');

    render(
      <MarkdownViewer
        document={{ filename: 'guide.md', content: markdown }}
        showToc={true}
      />
    );

    const tocSidebar = screen.getByTestId('toc-sidebar');
    expect(tocSidebar).toBeInTheDocument();

    // Verify all 12 headings rendered in TOC
    headings.forEach((h) => {
      expect(within(tocSidebar).getByText(h)).toBeInTheDocument();
    });

    // Locate 5th heading link in TOC (Chapter 5: Advanced Navigation)
    const fifthHeadingLink = screen.getByTestId('toc-link-chapter-5-advanced-navigation');
    expect(fifthHeadingLink).toHaveAttribute('href', '#chapter-5-advanced-navigation');

    // Click 5th heading link
    fireEvent.click(fifthHeadingLink);

    // Verify smooth scroll was dispatched
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('Criterion 3: Scrolling down updates the highlighted TOC item to match the current viewport section', () => {
    const items = extractHeadingsFromMarkdown(`
# Section 1
## Section 2
## Section 3
`);
    const tree = buildTocTree(items);

    const { rerender } = render(
      <TableOfContents items={items} tree={tree} activeId="section-1" />
    );

    expect(screen.getByTestId('toc-link-section-1')).toHaveClass('active');
    expect(screen.getByTestId('toc-link-section-2')).not.toHaveClass('active');

    // Simulate user scrolling to Section 2
    rerender(
      <TableOfContents items={items} tree={tree} activeId="section-2" />
    );

    expect(screen.getByTestId('toc-link-section-1')).not.toHaveClass('active');
    expect(screen.getByTestId('toc-link-section-2')).toHaveClass('active');
    expect(screen.getByTestId('toc-link-section-2')).toHaveAttribute(
      'aria-current',
      'location'
    );
  });

  it('Criterion 4: Documents with identical heading titles link to distinct unique anchors', () => {
    const markdown = `
# Developer Guide

### Example
First example code.

### Example
Second example code.

### Example
Third example code.
`;

    render(
      <MarkdownViewer
        document={{ filename: 'duplicates.md', content: markdown }}
        showToc={true}
      />
    );

    const links = screen.getAllByRole('link', { name: /Example/i });
    // There are 3 duplicate example headings in TOC
    const tocLinks = links.filter((l) => l.getAttribute('data-testid')?.startsWith('toc-link-'));
    expect(tocLinks).toHaveLength(3);

    expect(tocLinks[0]).toHaveAttribute('href', '#example');
    expect(tocLinks[1]).toHaveAttribute('href', '#example-1');
    expect(tocLinks[2]).toHaveAttribute('href', '#example-2');

    // Clicking the 2nd duplicate heading scrolls to #example-1
    fireEvent.click(tocLinks[1]);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('Criterion 5: Documents without headings collapse the TOC sidebar cleanly and disable the toggle', () => {
    const plainMarkdown = `
This is a document containing multiple paragraphs of text,
a bullet list:
- Item 1
- Item 2

And a code block:
\`\`\`js
console.log('No headings here');
\`\`\`
`;

    render(
      <MarkdownViewer
        document={{ filename: 'plain.md', content: plainMarkdown }}
      />
    );

    // Outline button should be disabled
    const toggleBtn = screen.getByTestId('doc-toc-toggle');
    expect(toggleBtn).toBeDisabled();
    expect(toggleBtn).toHaveAttribute('title', 'No headings in document');

    // Outline sidebar must not be present
    expect(screen.queryByTestId('toc-sidebar')).not.toBeInTheDocument();
  });

  it('Bidirectional Support: Preserves Persian and Arabic script headings in TOC outline and anchors', () => {
    const persianMarkdown = `
# مستندات جامع سامانه
## راهنمای نصب و راه‌اندازی
### پیکربندی شبکه
`;

    render(
      <MarkdownViewer
        document={{ filename: 'farsi.md', content: persianMarkdown }}
        showToc={true}
      />
    );

    const tocSidebar = screen.getByTestId('toc-sidebar');
    expect(within(tocSidebar).getByText('مستندات جامع سامانه')).toBeInTheDocument();
    expect(within(tocSidebar).getByText('راهنمای نصب و راه‌اندازی')).toBeInTheDocument();
    expect(within(tocSidebar).getByText('پیکربندی شبکه')).toBeInTheDocument();

    const link = screen.getByTestId('toc-link-راهنمای-نصب-و-راه-اندازی');
    expect(link).toHaveAttribute('href', '#راهنمای-نصب-و-راه-اندازی');

    fireEvent.click(link);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('Keyboard Navigation: Toggles outline on Ctrl+Shift+O keyboard shortcut', () => {
    const markdown = `
# Title
## Section
`;
    render(
      <MarkdownViewer
        document={{ filename: 'shortcuts.md', content: markdown }}
      />
    );

    // Initially closed
    expect(screen.queryByTestId('toc-sidebar')).not.toBeInTheDocument();

    // Press Ctrl+Shift+O to open
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'o',
          ctrlKey: true,
          shiftKey: true,
          bubbles: true,
        })
      );
    });

    expect(screen.getByTestId('toc-sidebar')).toBeInTheDocument();

    // Press Ctrl+Shift+O again to close
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'o',
          ctrlKey: true,
          shiftKey: true,
          bubbles: true,
        })
      );
    });

    expect(screen.queryByTestId('toc-sidebar')).not.toBeInTheDocument();
  });
});
