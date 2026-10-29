import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MarkdownViewer } from './MarkdownViewer';
import { settingsStore } from '../preferences/settingsStore';
import { AppShell } from '../shell/AppShell';
import { TabStore } from '../tabs/tabStore';

describe('Step 3: Layout, TOC & Scrollbar Refactoring Integration Tests', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await settingsStore.resetSettings();
  });

  const sampleMarkdown = `
# Executive Summary
First paragraph of the executive summary.

## Product Overview
Detailed product overview paragraph.

## Architecture
Architecture details.
`;

  it('renders TOC on the LEFT and scrollbar on the RIGHT by default', () => {
    render(
      <MarkdownViewer
        document={{
          filename: 'doc.md',
          filePath: '/path/to/doc.md',
          content: sampleMarkdown,
        }}
        showToc={true}
      />
    );

    const toc = screen.getByTestId('toc-sidebar');
    expect(toc).toHaveAttribute('data-position', 'left');
    expect(toc).toHaveClass('toc-left');

    const scrollbar = screen.getByTestId('reading-scrollbar-container');
    expect(scrollbar).toHaveAttribute('data-side', 'right');
    expect(scrollbar).toHaveClass('scrollbar-right');
  });

  it('renders TOC on the RIGHT and scrollbar on the LEFT when tocPosition is "right"', async () => {
    await act(async () => {
      await settingsStore.updateSettings({ tocPosition: 'right' });
    });

    render(
      <MarkdownViewer
        document={{
          filename: 'doc.md',
          filePath: '/path/to/doc.md',
          content: sampleMarkdown,
        }}
        showToc={true}
      />
    );

    const toc = screen.getByTestId('toc-sidebar');
    expect(toc).toHaveAttribute('data-position', 'right');
    expect(toc).toHaveClass('toc-right');

    const scrollbar = screen.getByTestId('reading-scrollbar-container');
    expect(scrollbar).toHaveAttribute('data-side', 'left');
    expect(scrollbar).toHaveClass('scrollbar-left');
  });

  it('resolves tocPosition "auto" to LEFT for LTR documents and RIGHT for RTL documents', async () => {
    await act(async () => {
      await settingsStore.updateSettings({ tocPosition: 'auto' });
    });

    // 1. LTR document -> Left TOC, Right scrollbar
    const { unmount } = render(
      <MarkdownViewer
        document={{
          filename: 'ltr.md',
          filePath: '/path/to/ltr.md',
          content: sampleMarkdown,
        }}
        showToc={true}
      />
    );

    let toc = screen.getByTestId('toc-sidebar');
    expect(toc).toHaveAttribute('data-position', 'left');
    let scrollbar = screen.getByTestId('reading-scrollbar-container');
    expect(scrollbar).toHaveAttribute('data-side', 'right');

    unmount();

    // 2. RTL document (Persian/Arabic) -> Right TOC, Left scrollbar
    const rtlMarkdown = `
# خلاصه اجرایی
این یک متن آزمایشی به زبان فارسی است.

## معرفی محصول
توضیحات بیشتر در مورد محصول.
`;

    render(
      <MarkdownViewer
        document={{
          filename: 'rtl.md',
          filePath: '/path/to/rtl.md',
          content: rtlMarkdown,
        }}
        showToc={true}
      />
    );

    toc = screen.getByTestId('toc-sidebar');
    expect(toc).toHaveAttribute('data-position', 'right');
    scrollbar = screen.getByTestId('reading-scrollbar-container');
    expect(scrollbar).toHaveAttribute('data-side', 'left');
  });

  it('renders and updates the section counter (e.g. "01 / 03", "02 / 03") when headings are selected', () => {
    render(
      <MarkdownViewer
        document={{
          filename: 'doc.md',
          filePath: '/path/to/doc.md',
          content: sampleMarkdown,
        }}
        showToc={true}
      />
    );

    const counter = screen.getByTestId('toc-counter');
    expect(counter).toBeInTheDocument();

    // Clicking section 1 sets counter to 01 / 03
    const firstLink = screen.getByTestId('toc-link-executive-summary');
    fireEvent.click(firstLink);
    expect(counter).toHaveTextContent('01 / 03');

    // Clicking section 2 sets counter to 02 / 03
    const secondLink = screen.getByTestId('toc-link-product-overview');
    fireEvent.click(secondLink);
    expect(counter).toHaveTextContent('02 / 03');
  });

  it('floating toolbar omits breadcrumbs and print button, and keeps zoom, search, outline, and focus mode', () => {
    render(
      <MarkdownViewer
        document={{
          filename: 'doc.md',
          filePath: '/path/to/doc.md',
          content: sampleMarkdown,
        }}
      />
    );

    // Breadcrumb and Print button must NOT be present in toolbar
    expect(screen.queryByTestId('pill-breadcrumb')).not.toBeInTheDocument();
    expect(screen.queryByTestId('doc-print-btn')).not.toBeInTheDocument();

    // Zoom, Search, Outline, Focus must be present
    expect(screen.getByTestId('doc-zoom-controls')).toBeInTheDocument();
    expect(screen.getByTestId('doc-search-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('doc-toc-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('doc-focus-toggle')).toBeInTheDocument();
  });

  it('renders status bar with file path on the left and reading time on the right, without tabs count or Markdown text', () => {
    const store = new TabStore();
    render(<AppShell store={store} />);

    act(() => {
      store.openTab({
        filePath: '/home/user/document.md',
        filename: 'document.md',
        content: '# Title\n\n' + 'Word '.repeat(500), // ~500 words = 3 min read
      });
    });

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('/home/user/document.md');
    expect(status).toHaveTextContent('3 min read');

    // Forbidden strings
    expect(status).not.toHaveTextContent('1 tab open');
    expect(status).not.toHaveTextContent('tabs open');
    expect(status).not.toHaveTextContent('Markdown');
  });
});
