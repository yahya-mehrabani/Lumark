import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, renderHook, act, fireEvent } from '@testing-library/react';
import { useScrollSpy } from './useScrollSpy';
import { useTocToggle } from './useTocToggle';
import { TableOfContents } from './TableOfContents';
import { TocItem } from './types';
import { MarkdownViewer } from '../rendering/MarkdownViewer';
import { settingsStore } from '../preferences';

describe('Active Heading Scroll Spy & Sidebar Toggle (US-021.3)', () => {
  let observeMock: ReturnType<typeof vi.fn>;
  let unobserveMock: ReturnType<typeof vi.fn>;
  let disconnectMock: ReturnType<typeof vi.fn>;
  let observerCallback: IntersectionObserverCallback;

  beforeEach(() => {
    observeMock = vi.fn();
    unobserveMock = vi.fn();
    disconnectMock = vi.fn();

    // Mock IntersectionObserver
    window.IntersectionObserver = vi.fn(function (
      this: any,
      callback: IntersectionObserverCallback
    ) {
      observerCallback = callback;
      this.observe = observeMock;
      this.unobserve = unobserveMock;
      this.disconnect = disconnectMock;
    }) as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useScrollSpy hook', () => {
    it('observes heading elements and updates activeId on intersection', () => {
      const heading1 = document.createElement('h1');
      heading1.id = 'sec-1';
      document.body.appendChild(heading1);

      const heading2 = document.createElement('h2');
      heading2.id = 'sec-2';
      document.body.appendChild(heading2);

      const { result } = renderHook(() =>
        useScrollSpy({ itemIds: ['sec-1', 'sec-2'] })
      );

      expect(observeMock).toHaveBeenCalledWith(heading1);
      expect(observeMock).toHaveBeenCalledWith(heading2);

      // Simulate IntersectionObserver event triggering intersection on heading2
      act(() => {
        observerCallback(
          [
            {
              target: heading1,
              isIntersecting: false,
              boundingClientRect: { top: -200 } as DOMRectReadOnly,
            } as unknown as IntersectionObserverEntry,
            {
              target: heading2,
              isIntersecting: true,
              boundingClientRect: { top: 50 } as DOMRectReadOnly,
            } as unknown as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver
        );
      });

      expect(result.current.activeId).toBe('sec-2');

      document.body.removeChild(heading1);
      document.body.removeChild(heading2);
    });

    it('falls back to the heading directly above viewport when no heading is currently intersecting', () => {
      const heading1 = document.createElement('h1');
      heading1.id = 'sec-alpha';
      heading1.getBoundingClientRect = () => ({ top: 40 } as DOMRect);
      document.body.appendChild(heading1);

      const heading2 = document.createElement('h2');
      heading2.id = 'sec-beta';
      heading2.getBoundingClientRect = () => ({ top: 400 } as DOMRect);
      document.body.appendChild(heading2);

      const { result } = renderHook(() =>
        useScrollSpy({ itemIds: ['sec-alpha', 'sec-beta'] })
      );

      // Trigger observer with no intersecting items (e.g., scrolled between sections)
      act(() => {
        observerCallback(
          [
            {
              target: heading1,
              isIntersecting: false,
              boundingClientRect: { top: 40 } as DOMRectReadOnly,
            } as unknown as IntersectionObserverEntry,
            {
              target: heading2,
              isIntersecting: false,
              boundingClientRect: { top: 400 } as DOMRectReadOnly,
            } as unknown as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver
        );
      });

      expect(result.current.activeId).toBe('sec-alpha');

      document.body.removeChild(heading1);
      document.body.removeChild(heading2);
    });
  });

  describe('useTocToggle hook', () => {
    it('manages open/close state programmatically', () => {
      const onToggle = vi.fn();
      const { result } = renderHook(() =>
        useTocToggle({ initialOpen: true, hasHeadings: true, onToggle })
      );

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.toggle();
      });
      expect(result.current.isOpen).toBe(false);
      expect(onToggle).toHaveBeenCalledWith(false);

      act(() => {
        result.current.open();
      });
      expect(result.current.isOpen).toBe(true);
      expect(onToggle).toHaveBeenCalledWith(true);

      act(() => {
        result.current.close();
      });
      expect(result.current.isOpen).toBe(false);
      expect(onToggle).toHaveBeenCalledWith(false);
    });

    it('toggles open/close via Ctrl+Shift+O and Cmd+Shift+O keyboard shortcuts', () => {
      const { result } = renderHook(() =>
        useTocToggle({ initialOpen: true, hasHeadings: true })
      );

      expect(result.current.isOpen).toBe(true);

      // Press Ctrl+Shift+O
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
      expect(result.current.isOpen).toBe(false);

      // Press Cmd+Shift+O (Mac metaKey)
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'O',
            metaKey: true,
            shiftKey: true,
            bubbles: true,
          })
        );
      });
      expect(result.current.isOpen).toBe(true);

      // Press Alt+T alternative shortcut
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 't',
            altKey: true,
            bubbles: true,
          })
        );
      });
      expect(result.current.isOpen).toBe(false);
    });

    it('cleanly disables and forces collapsed state when document has zero headings', () => {
      const { result } = renderHook(() =>
        useTocToggle({ initialOpen: true, hasHeadings: false })
      );

      // Even though initialOpen is true, hasHeadings: false forces isOpen: false
      expect(result.current.isOpen).toBe(false);
      expect(result.current.isAvailable).toBe(false);

      // Calling toggle() or open() must not open when hasHeadings is false
      act(() => {
        result.current.toggle();
      });
      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.open();
      });
      expect(result.current.isOpen).toBe(false);

      // Keyboard shortcut must also be ignored
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
      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('Component Toggle & Layout Preservation', () => {
    it('collapses and restores TableOfContents cleanly when isOpen changes', () => {
      const items: TocItem[] = [
        { id: 'heading-1', text: 'Main Title', level: 1 },
        { id: 'heading-2', text: 'Sub Title', level: 2 },
      ];

      const { rerender } = render(
        <div data-testid="viewer-layout">
          <TableOfContents items={items} isOpen={true} />
        </div>
      );

      expect(screen.getByTestId('toc-sidebar')).toBeInTheDocument();

      // Collapse sidebar
      rerender(
        <div data-testid="viewer-layout">
          <TableOfContents items={items} isOpen={false} />
        </div>
      );

      expect(screen.queryByTestId('toc-sidebar')).not.toBeInTheDocument();
      expect(screen.getByTestId('viewer-layout')).toBeInTheDocument();

      // Restore sidebar
      rerender(
        <div data-testid="viewer-layout">
          <TableOfContents items={items} isOpen={true} />
        </div>
      );

      expect(screen.getByTestId('toc-sidebar')).toBeInTheDocument();
    });
  });

  describe('Default Visibility & Settings Store Integration (Issue 2)', () => {
    beforeEach(() => {
      settingsStore.resetSettings();
    });

    it('renders TOC by default when document is mounted with default settings (showTableOfContents: true)', () => {
      const markdown = '# Document Heading\n\nSome text.';
      render(<MarkdownViewer document={{ filename: 'test.md', content: markdown }} />);

      expect(screen.getByTestId('toc-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('toc-link-document-heading')).toBeInTheDocument();
    });

    it('synchronizes TOC visibility dynamically when settingsStore showTableOfContents changes', async () => {
      const markdown = '# Heading 1\n## Heading 2';
      render(<MarkdownViewer document={{ filename: 'test.md', content: markdown }} />);

      // Initially open
      expect(screen.getByTestId('toc-sidebar')).toBeInTheDocument();

      // Disable TOC in settings
      await act(async () => {
        await settingsStore.updateSettings({ showTableOfContents: false });
      });
      expect(screen.queryByTestId('toc-sidebar')).not.toBeInTheDocument();

      // Re-enable TOC in settings
      await act(async () => {
        await settingsStore.updateSettings({ showTableOfContents: true });
      });
      expect(screen.getByTestId('toc-sidebar')).toBeInTheDocument();
    });

    it('allows user to manually toggle TOC ON inside a document when global setting showTableOfContents is false', async () => {
      await act(async () => {
        await settingsStore.updateSettings({ showTableOfContents: false });
      });

      const markdown = '# Document Heading\n\nSome text.';
      render(<MarkdownViewer document={{ filename: 'test.md', content: markdown }} />);

      // Initially closed due to global default
      expect(screen.queryByTestId('toc-sidebar')).not.toBeInTheDocument();

      // Per-document toggle button must remain functional
      const toggleBtn = screen.getByTestId('doc-toc-toggle');
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn).not.toBeDisabled();

      fireEvent.click(toggleBtn);

      // TOC should now be visible
      expect(screen.getByTestId('toc-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('toc-link-document-heading')).toBeInTheDocument();

      // Toggle off again
      fireEvent.click(toggleBtn);
      expect(screen.queryByTestId('toc-sidebar')).not.toBeInTheDocument();
    });
  });

  describe('TOC Item Layout and Truncation (Issues 3 & 5)', () => {
    it('renders long heading labels without native title attribute on link and label', () => {
      const longTitle = 'Very Long Section Title That Should Not Bleed Off Screen Or Cause Visual Regressions';
      const items: TocItem[] = [
        { id: 'long-section', text: longTitle, level: 1 },
        { id: 'short-section', text: 'Short', level: 2 },
      ];

      render(<TableOfContents items={items} isOpen={true} />);

      const link = screen.getByTestId('toc-link-long-section');
      expect(link).not.toHaveAttribute('title');

      const label = link.querySelector('.spy-label');
      expect(label).not.toHaveAttribute('title');
      expect(label).toHaveTextContent(longTitle);
    });

    it('renders multiple TOC items with distinct link containers ensuring no DOM overlapping', () => {
      const items: TocItem[] = [
        { id: 'h1', text: 'Heading 1', level: 1 },
        { id: 'h2', text: 'Heading 2', level: 2 },
        { id: 'h3', text: 'Heading 3', level: 3 },
      ];

      const { container } = render(<TableOfContents items={items} isOpen={true} />);

      const links = container.querySelectorAll('.spy-item');
      expect(links).toHaveLength(3);

      const labels = container.querySelectorAll('.spy-label');
      expect(labels).toHaveLength(3);

      // Verify each item has a distinct container and correct test ID
      expect(screen.getByTestId('toc-link-h1')).toBeInTheDocument();
      expect(screen.getByTestId('toc-link-h2')).toBeInTheDocument();
      expect(screen.getByTestId('toc-link-h3')).toBeInTheDocument();
    });
  });
});
