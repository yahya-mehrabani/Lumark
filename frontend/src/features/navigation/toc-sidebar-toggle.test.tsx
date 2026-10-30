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

    it('toggles open/close via Ctrl+L and Cmd+L keyboard shortcuts', () => {
      const { result } = renderHook(() =>
        useTocToggle({ initialOpen: true, hasHeadings: true })
      );

      expect(result.current.isOpen).toBe(true);

      // Press Ctrl+L
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'l',
            ctrlKey: true,
            bubbles: true,
          })
        );
      });
      expect(result.current.isOpen).toBe(false);

      // Press Cmd+L (Mac metaKey)
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'L',
            metaKey: true,
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

    it('prevents global settings from overriding active tab TOC toggle state after initial mount', async () => {
      const markdown = '# Heading 1\n## Heading 2';
      render(<MarkdownViewer document={{ filename: 'active-tab.md', content: markdown }} />);

      // Initially open from default settings
      expect(screen.getByTestId('toc-sidebar')).toBeInTheDocument();

      // Disable TOC in global settings
      await act(async () => {
        await settingsStore.updateSettings({ showTableOfContents: false });
      });

      // Active mounted tab retains its independent state (still open!)
      expect(screen.getByTestId('toc-sidebar')).toBeInTheDocument();

      // User can still manually toggle it in this tab
      const toggleBtn = screen.getByTestId('doc-toc-toggle');
      fireEvent.click(toggleBtn);
      expect(screen.queryByTestId('toc-sidebar')).not.toBeInTheDocument();
    });

    it('applies updated global setting as default for newly opened tabs without affecting active tabs', async () => {
      const markdown = '# Heading 1\n## Heading 2';

      // Open Tab 1 under default setting (showTableOfContents: true)
      render(<MarkdownViewer document={{ filename: 'tab1.md', content: markdown }} />);
      expect(screen.getByTestId('toc-sidebar')).toBeInTheDocument();

      // Change global setting to false
      await act(async () => {
        await settingsStore.updateSettings({ showTableOfContents: false });
      });

      // Tab 1 is still open
      expect(screen.getByTestId('toc-sidebar')).toBeInTheDocument();

      // Now open a newly opened tab (Tab 2)
      render(<MarkdownViewer document={{ filename: 'tab2.md', content: markdown }} />);

      // Since global setting is false, newly opened tab has TOC closed by default
      const sidebars = screen.getAllByTestId('toc-sidebar');
      // Only Tab 1 has an active TOC sidebar (1 sidebar rendered total)
      expect(sidebars).toHaveLength(1);
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

    it('verifies toc.css enforces pointer-events: none on spy-label and toc-text to eliminate hover loop flickering', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const cssContent = fs.readFileSync(path.resolve(__dirname, 'toc.css'), 'utf-8');

      // Ensure spy-label and toc-text are set to pointer-events: none
      expect(cssContent).toMatch(/\.spy-label[^{]*\{[^}]*pointer-events:\s*none/);
      expect(cssContent).toMatch(/\.spy-item:hover\s+\.spy-label[^{]*\{[^}]*pointer-events:\s*none/);
      // Ensure spy-label is not given pointer-events: auto anywhere
      expect(cssContent).not.toMatch(/\.spy-label[^{]*\{[^}]*pointer-events:\s*auto/);
      expect(cssContent).not.toMatch(/\.toc-text[^{]*\{[^}]*pointer-events:\s*auto/);
    });

    it('TOC Counter has dir="ltr" to prevent bidi number reversal in RTL layout (Issue 2)', () => {
      const items: TocItem[] = [
        { id: 'h1', text: 'Heading 1', level: 1 },
        { id: 'h2', text: 'Heading 2', level: 2 },
      ];
      render(<TableOfContents items={items} isOpen={true} position="right" />);
      const counter = screen.getByTestId('toc-counter');
      expect(counter).toHaveAttribute('dir', 'ltr');
      expect(counter).toHaveTextContent('01 / 02');
    });

    it('verifies toc.css sets 2px logical rail border and zeroed start-radius on active items (Issues 3, 4, 5)', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const cssContent = fs.readFileSync(path.resolve(__dirname, 'toc.css'), 'utf-8');

      expect(cssContent).toMatch(/border-inline-start:\s*2px\s+solid\s+var\(--border-subtle\)/);
      expect(cssContent).toMatch(/border-inline-start:\s*2px\s+solid\s+var\(--accent-teal\)/);
      expect(cssContent).toMatch(/border-start-start-radius:\s*0/);
      expect(cssContent).toMatch(/border-end-start-radius:\s*0/);
    });

    it('Responsive TOC: automatically hides TOC when screen is narrow (< 1240px) and restores when wide without touching manual state (Issue 13)', async () => {
      await settingsStore.resetSettings();
      let changeListener: ((e: MediaQueryListEvent) => void) | null = null;
      let matchesState = false;

      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(max-width: 1240px)' ? matchesState : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((event: string, handler: any) => {
          if (event === 'change') changeListener = handler;
        }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const markdown = '# Head 1\n## Head 2';
      render(
        <MarkdownViewer
          document={{ filename: 'responsive.md', content: markdown }}
        />
      );

      // Wide screen: TOC is visible by default
      expect(screen.getByTestId('toc-sidebar')).toBeInTheDocument();

      // Screen shrinks (< 1240px)
      act(() => {
        matchesState = true;
        changeListener?.({ matches: true } as MediaQueryListEvent);
      });

      // TOC is now hidden visually
      expect(screen.queryByTestId('toc-sidebar')).not.toBeInTheDocument();

      // Screen expands again (>= 1240px)
      act(() => {
        matchesState = false;
        changeListener?.({ matches: false } as MediaQueryListEvent);
      });

      // TOC automatically reappears!
      expect(screen.getByTestId('toc-sidebar')).toBeInTheDocument();
    });
  });
});
