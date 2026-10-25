import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  escapeRegExp,
  isIgnoredElement,
  collectSearchableTextNodes,
  findMatches,
} from './searchIndexer';
import { SearchBar } from './SearchBar';

describe('Search Indexer Unit Tests (US-022.1)', () => {
  describe('escapeRegExp', () => {
    it('escapes all regular expression metacharacters', () => {
      const raw = '.*+?^${}()|[]\\';
      const escaped = escapeRegExp(raw);
      expect(escaped).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
      const regex = new RegExp(escaped);
      expect(regex.test(raw)).toBe(true);
    });

    it('returns empty string unmodified', () => {
      expect(escapeRegExp('')).toBe('');
    });
  });

  describe('isIgnoredElement', () => {
    it('returns true for script, style, noscript, and svg tags', () => {
      const script = document.createElement('script');
      const style = document.createElement('style');
      const noscript = document.createElement('noscript');
      const svg = document.createElement('svg');

      expect(isIgnoredElement(script)).toBe(true);
      expect(isIgnoredElement(style)).toBe(true);
      expect(isIgnoredElement(noscript)).toBe(true);
      expect(isIgnoredElement(svg)).toBe(true);
    });

    it('returns true for elements contained inside an svg subtree', () => {
      const svg = document.createElement('svg');
      const path = document.createElement('path');
      svg.appendChild(path);
      document.body.appendChild(svg);

      expect(isIgnoredElement(path)).toBe(true);
      document.body.removeChild(svg);
    });

    it('returns true for elements with hidden attribute or aria-hidden="true"', () => {
      const divHidden = document.createElement('div');
      divHidden.setAttribute('hidden', '');
      expect(isIgnoredElement(divHidden)).toBe(true);

      const divAria = document.createElement('div');
      divAria.setAttribute('aria-hidden', 'true');
      expect(isIgnoredElement(divAria)).toBe(true);
    });

    it('returns false for normal visible elements', () => {
      const p = document.createElement('p');
      const code = document.createElement('code');
      const pre = document.createElement('pre');
      const h1 = document.createElement('h1');

      expect(isIgnoredElement(p)).toBe(false);
      expect(isIgnoredElement(code)).toBe(false);
      expect(isIgnoredElement(pre)).toBe(false);
      expect(isIgnoredElement(h1)).toBe(false);
    });
  });

  describe('collectSearchableTextNodes', () => {
    it('collects text nodes from paragraphs, headings, and code blocks while omitting script/style/svg', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <h1>Heading Title</h1>
        <p>Paragraph with <strong>bold</strong> text.</p>
        <pre><code>const x = 42;</code></pre>
        <script>console.log("secret");</script>
        <style>.test { color: red; }</style>
        <svg><text>Diagram Label</text></svg>
        <div hidden><p>Hidden content</p></div>
      `;

      const nodes = collectSearchableTextNodes(container);
      const textContents = nodes.map((n) => n.textContent?.trim()).filter(Boolean);

      expect(textContents).toContain('Heading Title');
      expect(textContents).toContain('Paragraph with');
      expect(textContents).toContain('bold');
      expect(textContents).toContain('text.');
      expect(textContents).toContain('const x = 42;');

      expect(textContents).not.toContain('console.log("secret");');
      expect(textContents).not.toContain('.test { color: red; }');
      expect(textContents).not.toContain('Diagram Label');
      expect(textContents).not.toContain('Hidden content');
    });
  });

  describe('findMatches', () => {
    it('returns empty array when query or root is empty', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>Some text</p>';

      expect(findMatches(null, 'test')).toEqual([]);
      expect(findMatches(container, '')).toEqual([]);
      expect(findMatches(container, '   ')).toEqual([]);
    });

    it('finds single match with accurate character offsets', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>Hello world from test</p>';

      const matches = findMatches(container, 'world');
      expect(matches).toHaveLength(1);
      expect(matches[0].index).toBe(0);
      expect(matches[0].text).toBe('world');
      expect(matches[0].startOffset).toBe(6);
      expect(matches[0].endOffset).toBe(11);
      expect(matches[0].node.textContent).toBe('Hello world from test');
    });

    it('finds multiple matches in a single text node', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>test alpha test beta test</p>';

      const matches = findMatches(container, 'test');
      expect(matches).toHaveLength(3);
      expect(matches[0].startOffset).toBe(0);
      expect(matches[0].endOffset).toBe(4);
      expect(matches[1].startOffset).toBe(11);
      expect(matches[1].endOffset).toBe(15);
      expect(matches[2].startOffset).toBe(21);
      expect(matches[2].endOffset).toBe(25);
    });

    it('performs case-insensitive search by default', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>MARKDOWN Markdown markdown</p>';

      const matches = findMatches(container, 'markdown');
      expect(matches).toHaveLength(3);
      expect(matches[0].text).toBe('MARKDOWN');
      expect(matches[1].text).toBe('Markdown');
      expect(matches[2].text).toBe('markdown');
    });

    it('respects caseSensitive option when enabled', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>MARKDOWN Markdown markdown</p>';

      const matches = findMatches(container, 'Markdown', { caseSensitive: true });
      expect(matches).toHaveLength(1);
      expect(matches[0].text).toBe('Markdown');
    });

    it('handles regex special characters safely', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>Array[0] in func(arg) with price $10.00 and *pointer*</p>';

      const bracketMatches = findMatches(container, '[0]');
      expect(bracketMatches).toHaveLength(1);
      expect(bracketMatches[0].text).toBe('[0]');

      const dollarMatches = findMatches(container, '$10.00');
      expect(dollarMatches).toHaveLength(1);
      expect(dollarMatches[0].text).toBe('$10.00');

      const starMatches = findMatches(container, '*pointer*');
      expect(starMatches).toHaveLength(1);
      expect(starMatches[0].text).toBe('*pointer*');
    });

    it('indexes matches inside code blocks', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <p>Prose mentions function.</p>
        <pre><code>function calculateTotal() { return 42; }</code></pre>
      `;

      const matches = findMatches(container, 'function');
      expect(matches).toHaveLength(2);
      expect(matches[1].node.parentElement?.tagName).toBe('CODE');
    });

    it('indexes Persian and RTL unicode text matches', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <p dir="rtl">این یک متن آزمایشی برای جستجو در مستندات فارسی است.</p>
      `;

      const matches = findMatches(container, 'فارسی');
      expect(matches).toHaveLength(1);
      expect(matches[0].text).toBe('فارسی');
      expect(matches[0].node.textContent?.slice(matches[0].startOffset, matches[0].endOffset)).toBe(
        'فارسی'
      );
    });
  });

  describe('SearchBar Component Rendering & Interactions', () => {
    it('returns null when isOpen is false', () => {
      const { container } = render(
        <SearchBar
          isOpen={false}
          query="test"
          onQueryChange={vi.fn()}
          currentIndex={0}
          totalMatches={2}
          onNext={vi.fn()}
          onPrevious={vi.fn()}
          onClose={vi.fn()}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders input, buttons, and match count when open', () => {
      render(
        <SearchBar
          isOpen={true}
          query="markdown"
          onQueryChange={vi.fn()}
          currentIndex={1}
          totalMatches={5}
          onNext={vi.fn()}
          onPrevious={vi.fn()}
          onClose={vi.fn()}
          caseSensitive={false}
          onToggleCaseSensitive={vi.fn()}
        />
      );

      expect(screen.getByTestId('search-bar')).toBeInTheDocument();
      const input = screen.getByTestId('search-input') as HTMLInputElement;
      expect(input.value).toBe('markdown');
      expect(screen.getByTestId('search-counter')).toHaveTextContent('2 of 5');
      expect(screen.getByTestId('search-prev-btn')).toBeEnabled();
      expect(screen.getByTestId('search-next-btn')).toBeEnabled();
      expect(screen.getByTestId('search-close-btn')).toBeInTheDocument();
      expect(screen.getByTestId('search-case-toggle')).toBeInTheDocument();
    });

    it('shows "No matches" and disables navigation when query has 0 matches', () => {
      render(
        <SearchBar
          isOpen={true}
          query="notfound"
          onQueryChange={vi.fn()}
          currentIndex={0}
          totalMatches={0}
          onNext={vi.fn()}
          onPrevious={vi.fn()}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByTestId('search-counter')).toHaveTextContent('No matches');
      expect(screen.getByTestId('search-prev-btn')).toBeDisabled();
      expect(screen.getByTestId('search-next-btn')).toBeDisabled();
    });

    it('dispatches Enter, Shift+Enter, F3, and Escape keyboard events', () => {
      const onNext = vi.fn();
      const onPrevious = vi.fn();
      const onClose = vi.fn();

      render(
        <SearchBar
          isOpen={true}
          query="test"
          onQueryChange={vi.fn()}
          currentIndex={0}
          totalMatches={3}
          onNext={onNext}
          onPrevious={onPrevious}
          onClose={onClose}
        />
      );

      const input = screen.getByTestId('search-input');

      // Enter -> onNext
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
      expect(onNext).toHaveBeenCalledTimes(1);

      // Shift+Enter -> onPrevious
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
      expect(onPrevious).toHaveBeenCalledTimes(1);

      // F3 -> onNext
      fireEvent.keyDown(input, { key: 'F3', shiftKey: false });
      expect(onNext).toHaveBeenCalledTimes(2);

      // Shift+F3 -> onPrevious
      fireEvent.keyDown(input, { key: 'F3', shiftKey: true });
      expect(onPrevious).toHaveBeenCalledTimes(2);

      // Escape -> onClose
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('toggles case sensitivity button', () => {
      const onToggleCase = vi.fn();
      render(
        <SearchBar
          isOpen={true}
          query="abc"
          onQueryChange={vi.fn()}
          currentIndex={0}
          totalMatches={1}
          onNext={vi.fn()}
          onPrevious={vi.fn()}
          onClose={vi.fn()}
          caseSensitive={true}
          onToggleCaseSensitive={onToggleCase}
        />
      );

      const toggleBtn = screen.getByTestId('search-case-toggle');
      expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');
      expect(toggleBtn.className).toContain('active');

      fireEvent.click(toggleBtn);
      expect(onToggleCase).toHaveBeenCalledTimes(1);
    });
  });
});
