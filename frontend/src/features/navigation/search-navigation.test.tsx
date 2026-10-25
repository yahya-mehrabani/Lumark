import React, { useRef } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import {
  applyHighlights,
  clearHighlights,
  updateActiveHighlight,
} from './searchHighlighter';
import { findMatches } from './searchIndexer';
import { useSearch } from './useSearch';

describe('Search Navigation & Highlighting Engine (US-022.2)', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  });

  describe('applyHighlights & clearHighlights', () => {
    it('wraps matching occurrences in <mark class="search-match"> and sets active match', () => {
      container.innerHTML = '<p>The quick brown fox jumps over the lazy dog. The fox is fast.</p>';
      const originalText = container.textContent;

      const matches = findMatches(container, 'fox');
      expect(matches).toHaveLength(2);

      const marks = applyHighlights(container, matches, 0);
      expect(marks).toHaveLength(2);

      // Verify first match is active
      expect(marks[0].classList.contains('active')).toBe(true);
      expect(marks[0].getAttribute('data-search-active')).toBe('true');
      expect(marks[0].getAttribute('data-match-index')).toBe('0');
      expect(marks[0].textContent).toBe('fox');

      // Verify second match is not active
      expect(marks[1].classList.contains('active')).toBe(false);
      expect(marks[1].getAttribute('data-search-active')).toBeNull();
      expect(marks[1].getAttribute('data-match-index')).toBe('1');
      expect(marks[1].textContent).toBe('fox');

      // Verify overall text content is preserved exactly
      expect(container.textContent).toBe(originalText);
    });

    it('clearHighlights removes all mark tags and normalizes text nodes cleanly', () => {
      container.innerHTML = '<p>Alpha beta gamma delta epsilon.</p>';
      const originalText = container.textContent;
      const initialNodeCount = container.querySelector('p')?.childNodes.length;

      const matches = findMatches(container, 'beta');
      applyHighlights(container, matches, 0);

      expect(container.querySelectorAll('mark[data-search-match]').length).toBe(1);

      clearHighlights(container);

      // Verify all mark elements removed
      expect(container.querySelectorAll('mark[data-search-match]').length).toBe(0);
      // Verify text content is identical
      expect(container.textContent).toBe(originalText);
      // Verify text nodes are normalized back to a single text node
      expect(container.querySelector('p')?.childNodes.length).toBe(initialNodeCount);
    });

    it('handles multiple matches within the same text node without offset drift', () => {
      container.innerHTML = '<p>cat cat cat</p>';
      const matches = findMatches(container, 'cat');
      expect(matches).toHaveLength(3);

      const marks = applyHighlights(container, matches, 1);
      expect(marks).toHaveLength(3);

      expect(marks[0].getAttribute('data-match-index')).toBe('0');
      expect(marks[1].getAttribute('data-match-index')).toBe('1');
      expect(marks[2].getAttribute('data-match-index')).toBe('2');

      expect(marks[0].classList.contains('active')).toBe(false);
      expect(marks[1].classList.contains('active')).toBe(true);
      expect(marks[2].classList.contains('active')).toBe(false);

      expect(container.textContent).toBe('cat cat cat');
    });
  });

  describe('updateActiveHighlight', () => {
    it('transfers active state and invokes scrollIntoView', () => {
      container.innerHTML = '<p>one two three one two three</p>';
      const matches = findMatches(container, 'two');
      applyHighlights(container, matches, 0);

      const mark0 = container.querySelector('mark[data-match-index="0"]') as HTMLElement;
      const mark1 = container.querySelector('mark[data-match-index="1"]') as HTMLElement;

      const scrollSpy0 = vi.fn();
      const scrollSpy1 = vi.fn();
      mark0.scrollIntoView = scrollSpy0;
      mark1.scrollIntoView = scrollSpy1;

      expect(mark0.classList.contains('active')).toBe(true);
      expect(mark1.classList.contains('active')).toBe(false);

      // Navigate from 0 to 1
      const activeEl = updateActiveHighlight(container, 0, 1);
      expect(activeEl).toBe(mark1);

      expect(mark0.classList.contains('active')).toBe(false);
      expect(mark0.getAttribute('data-search-active')).toBeNull();
      expect(mark1.classList.contains('active')).toBe(true);
      expect(mark1.getAttribute('data-search-active')).toBe('true');
      expect(scrollSpy1).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    });
  });

  describe('useSearch Hook Lifecycle & Navigation', () => {
    interface TestComponentProps {
      initialOpen?: boolean;
    }

    const TestSearchComponent: React.FC<TestComponentProps> = ({ initialOpen }) => {
      const docRef = useRef<HTMLDivElement>(null);
      const search = useSearch({ containerRef: docRef, initialOpen });

      return (
        <div>
          <div ref={docRef} data-testid="doc-container">
            <h1>Document Title</h1>
            <p>First paragraph with test keyword.</p>
            <p>Second paragraph with test keyword and more text.</p>
            <p>Third paragraph with test keyword.</p>
          </div>

          <div data-testid="search-status">
            <span data-testid="is-open">{search.isOpen ? 'OPEN' : 'CLOSED'}</span>
            <span data-testid="match-count">{search.totalMatches}</span>
            <span data-testid="current-index">{search.currentIndex}</span>
            <span data-testid="case-sens">{search.caseSensitive ? 'CS' : 'CI'}</span>
          </div>

          <button onClick={search.openSearch} data-testid="btn-open">
            Open
          </button>
          <button onClick={search.closeSearch} data-testid="btn-close">
            Close
          </button>
          <button onClick={() => search.setQuery('test')} data-testid="btn-search-test">
            Search test
          </button>
          <button onClick={() => search.setQuery('KEYWORD')} data-testid="btn-search-keyword">
            Search KEYWORD
          </button>
          <button onClick={search.nextMatch} data-testid="btn-next">
            Next
          </button>
          <button onClick={search.prevMatch} data-testid="btn-prev">
            Prev
          </button>
          <button onClick={search.toggleCaseSensitive} data-testid="btn-toggle-case">
            Toggle Case
          </button>
        </div>
      );
    };

    it('initializes with closed search and 0 matches', () => {
      render(<TestSearchComponent />);
      expect(screen.getByTestId('is-open')).toHaveTextContent('CLOSED');
      expect(screen.getByTestId('match-count')).toHaveTextContent('0');
      expect(screen.getByTestId('current-index')).toHaveTextContent('0');
    });

    it('performs search, updates match count, and cycles forwards and backwards with wrap-around', () => {
      render(<TestSearchComponent />);

      // Search 'test'
      act(() => {
        screen.getByTestId('btn-search-test').click();
      });

      expect(screen.getByTestId('match-count')).toHaveTextContent('3');
      expect(screen.getByTestId('current-index')).toHaveTextContent('0');

      const containerEl = screen.getByTestId('doc-container');
      const marks = containerEl.querySelectorAll('mark[data-search-match]');
      expect(marks.length).toBe(3);
      expect(marks[0].classList.contains('active')).toBe(true);

      // Next match: 0 -> 1
      act(() => {
        screen.getByTestId('btn-next').click();
      });
      expect(screen.getByTestId('current-index')).toHaveTextContent('1');
      expect(marks[0].classList.contains('active')).toBe(false);
      expect(marks[1].classList.contains('active')).toBe(true);

      // Next match: 1 -> 2
      act(() => {
        screen.getByTestId('btn-next').click();
      });
      expect(screen.getByTestId('current-index')).toHaveTextContent('2');

      // Next match: 2 -> 0 (wrap-around)
      act(() => {
        screen.getByTestId('btn-next').click();
      });
      expect(screen.getByTestId('current-index')).toHaveTextContent('0');
      expect(marks[0].classList.contains('active')).toBe(true);

      // Previous match: 0 -> 2 (reverse wrap-around)
      act(() => {
        screen.getByTestId('btn-prev').click();
      });
      expect(screen.getByTestId('current-index')).toHaveTextContent('2');
      expect(marks[2].classList.contains('active')).toBe(true);

      // Previous match: 2 -> 1
      act(() => {
        screen.getByTestId('btn-prev').click();
      });
      expect(screen.getByTestId('current-index')).toHaveTextContent('1');
    });

    it('toggles case sensitivity and re-indexes matches accurately', () => {
      render(<TestSearchComponent />);

      act(() => {
        screen.getByTestId('btn-search-keyword').click();
      });
      // Case-insensitive by default: matches 3 'keyword' occurrences
      expect(screen.getByTestId('match-count')).toHaveTextContent('3');

      // Toggle case-sensitive: 'KEYWORD' does not match lowercase 'keyword'
      act(() => {
        screen.getByTestId('btn-toggle-case').click();
      });
      expect(screen.getByTestId('case-sens')).toHaveTextContent('CS');
      expect(screen.getByTestId('match-count')).toHaveTextContent('0');

      // Toggle back to case-insensitive: matches restored
      act(() => {
        screen.getByTestId('btn-toggle-case').click();
      });
      expect(screen.getByTestId('case-sens')).toHaveTextContent('CI');
      expect(screen.getByTestId('match-count')).toHaveTextContent('3');
    });

    it('closeSearch clears all mark highlights and resets state', () => {
      render(<TestSearchComponent />);

      act(() => {
        screen.getByTestId('btn-open').click();
        screen.getByTestId('btn-search-test').click();
      });

      expect(screen.getByTestId('is-open')).toHaveTextContent('OPEN');
      const containerEl = screen.getByTestId('doc-container');
      expect(containerEl.querySelectorAll('mark[data-search-match]').length).toBe(3);

      act(() => {
        screen.getByTestId('btn-close').click();
      });

      expect(screen.getByTestId('is-open')).toHaveTextContent('CLOSED');
      expect(screen.getByTestId('match-count')).toHaveTextContent('0');
      expect(containerEl.querySelectorAll('mark[data-search-match]').length).toBe(0);
    });
  });
});
