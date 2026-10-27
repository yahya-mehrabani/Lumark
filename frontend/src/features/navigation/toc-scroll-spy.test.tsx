import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TableOfContents } from './TableOfContents';
import { TocItem } from './types';

describe('TableOfContents Sidebar Component (US-021.2)', () => {
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView =
      scrollIntoViewMock as unknown as typeof Element.prototype.scrollIntoView;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a nested outline reflecting h1 through h6 levels', () => {
    const items: TocItem[] = [
      { id: 'intro', text: 'Introduction', level: 1 },
      { id: 'getting-started', text: 'Getting Started', level: 2 },
      { id: 'installation', text: 'Installation', level: 3 },
      { id: 'summary', text: 'Summary', level: 1 },
    ];

    render(<TableOfContents items={items} />);

    expect(screen.getByTestId('toc-sidebar')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /Table of Contents/i })).toBeInTheDocument();

    const introItem = screen.getByTestId('toc-item-intro');
    expect(introItem).toHaveClass('toc-level-1');
    expect(introItem).toHaveAttribute('data-level', '1');

    const gettingStartedItem = screen.getByTestId('toc-item-getting-started');
    expect(gettingStartedItem).toHaveClass('toc-level-2');

    const installationItem = screen.getByTestId('toc-item-installation');
    expect(installationItem).toHaveClass('toc-level-3');

    // Sublist nesting
    const sublists = document.querySelectorAll('.toc-sublist');
    expect(sublists.length).toBeGreaterThanOrEqual(1);
  });

  it('smoothly scrolls to target heading element upon clicking a TOC link', () => {
    // Create target DOM heading
    const targetHeading = document.createElement('h2');
    targetHeading.id = 'architecture';
    targetHeading.textContent = 'Architecture';
    document.body.appendChild(targetHeading);

    const onSelectHeading = vi.fn();
    const items: TocItem[] = [
      { id: 'overview', text: 'Overview', level: 1 },
      { id: 'architecture', text: 'Architecture', level: 2 },
    ];

    render(<TableOfContents items={items} onSelectHeading={onSelectHeading} />);

    const link = screen.getByTestId('toc-link-architecture');
    fireEvent.click(link);

    expect(onSelectHeading).toHaveBeenCalledTimes(1);
    expect(onSelectHeading).toHaveBeenCalledWith('architecture');
    expect(scrollIntoViewMock).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth' })
    );

    document.body.removeChild(targetHeading);
  });

  it('highlights active heading matching activeId with active class and aria-current="location"', () => {
    const items: TocItem[] = [
      { id: 'chapter-1', text: 'Chapter 1', level: 1 },
      { id: 'chapter-2', text: 'Chapter 2', level: 1 },
      { id: 'chapter-3', text: 'Chapter 3', level: 1 },
    ];

    const { rerender } = render(
      <TableOfContents items={items} activeId="chapter-2" />
    );

    const link1 = screen.getByTestId('toc-link-chapter-1');
    const link2 = screen.getByTestId('toc-link-chapter-2');
    const link3 = screen.getByTestId('toc-link-chapter-3');

    expect(link1).not.toHaveClass('active');
    expect(link1).not.toHaveAttribute('aria-current');

    expect(link2).toHaveClass('active');
    expect(link2).toHaveAttribute('aria-current', 'location');
    expect(screen.getByTestId('toc-item-chapter-2')).toHaveClass('active');

    expect(link3).not.toHaveClass('active');

    // Rerender with activeId updated
    rerender(<TableOfContents items={items} activeId="chapter-3" />);
    expect(link2).not.toHaveClass('active');
    expect(link3).toHaveClass('active');
    expect(link3).toHaveAttribute('aria-current', 'location');
  });

  it('displays empty state notice when document has zero headings', () => {
    render(<TableOfContents items={[]} />);

    expect(screen.getByTestId('toc-empty')).toBeInTheDocument();
    expect(screen.getByText(/No headings found in document/i)).toBeInTheDocument();
    expect(screen.queryByTestId('toc-list')).not.toBeInTheDocument();
  });

  it('renders nothing when isOpen is false', () => {
    const items: TocItem[] = [{ id: 'title', text: 'Title', level: 1 }];
    render(<TableOfContents items={items} isOpen={false} />);

    expect(screen.queryByTestId('toc-sidebar')).not.toBeInTheDocument();
  });

  it('invokes onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<TableOfContents items={[]} onClose={onClose} />);

    const closeBtn = screen.getByTestId('toc-close-button');
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('handles Persian and Arabic headings with dir="auto"', () => {
    const items: TocItem[] = [
      { id: 'راهنمای-کاربری', text: 'راهنمای کاربری', level: 1 },
      { id: 'ویژگی-های-پیشرفته', text: 'ویژگی‌های پیشرفته', level: 2 },
    ];

    render(<TableOfContents items={items} />);

    const persianLink = screen.getByTestId('toc-link-راهنمای-کاربری');
    expect(persianLink).toBeInTheDocument();
    const textSpan = persianLink.querySelector('.toc-text');
    expect(textSpan).toHaveAttribute('dir', 'auto');
  });
});
