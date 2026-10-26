import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarkdownViewer } from '../rendering/MarkdownViewer';

describe('Table of Contents Click Navigation & Synchronization (Item 2)', () => {
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView =
      scrollIntoViewMock as unknown as typeof Element.prototype.scrollIntoView;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('scrolls target heading and synchronizes active outline state on outline item click', () => {
    const markdown = `
# Getting Started

Welcome to the guide.

## Installation

Run the installer.

## Configuration

Set options.
`;

    render(
      <MarkdownViewer
        document={{ filename: 'guide.md', content: markdown }}
        showToc={true}
      />
    );

    const installLink = screen.getByTestId('toc-link-installation');
    expect(installLink).toBeInTheDocument();
    expect(installLink).not.toHaveClass('active');

    const installHeading = document.getElementById('installation');
    expect(installHeading).not.toBeNull();

    // Click Installation outline link
    fireEvent.click(installLink);

    // Verify smooth scroll targeted the right heading
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewMock.mock.instances[0]).toBe(installHeading);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });

    // Verify active class immediately updated
    expect(installLink).toHaveClass('active');
    expect(installLink).toHaveAttribute('aria-current', 'location');
  });

  it('correctly targets duplicate and non-ASCII headings without drift', () => {
    const markdown = `
# مستندات راهنما

متن مقدمه.

# مستندات راهنما

متن دوم.
`;

    render(
      <MarkdownViewer
        document={{ filename: 'persian.md', content: markdown }}
        showToc={true}
      />
    );

    const link1 = screen.getByTestId('toc-link-مستندات-راهنما');
    const link2 = screen.getByTestId('toc-link-مستندات-راهنما-1');

    const heading1 = document.getElementById('مستندات-راهنما');
    const heading2 = document.getElementById('مستندات-راهنما-1');

    expect(heading1).not.toBeNull();
    expect(heading2).not.toBeNull();
    expect(heading1).not.toBe(heading2);

    // Click duplicate heading
    fireEvent.click(link2);

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewMock.mock.instances[0]).toBe(heading2);
    expect(link2).toHaveClass('active');
    expect(link1).not.toHaveClass('active');
  });

  it('preserves target heading IDs across outline toggle re-renders', () => {
    const markdown = `
# Section A

Content A.

# Section B

Content B.
`;

    render(
      <MarkdownViewer
        document={{ filename: 'toggle.md', content: markdown }}
      />
    );

    // Initial render with TOC closed
    const contentBody = screen.getByTestId('markdown-content');
    const h1List = contentBody.querySelectorAll('h1');
    expect(h1List[0].id).toBe('section-a');
    expect(h1List[1].id).toBe('section-b');

    // Toggle TOC open
    const toggleBtn = screen.getByTestId('doc-toc-toggle');
    fireEvent.click(toggleBtn);

    // Ensure heading IDs in DOM remain identical and match TOC links
    const h1ListAfter = screen.getByTestId('markdown-content').querySelectorAll('h1');
    expect(h1ListAfter[0].id).toBe('section-a');
    expect(h1ListAfter[1].id).toBe('section-b');

    const linkB = screen.getByTestId('toc-link-section-b');
    fireEvent.click(linkB);

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewMock.mock.instances[0]).toBe(h1ListAfter[1]);
  });
});
