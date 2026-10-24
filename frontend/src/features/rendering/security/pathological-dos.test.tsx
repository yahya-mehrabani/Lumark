import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownViewer } from '../MarkdownViewer';

describe('Pathological Nesting, Fuzzing & Fault Isolation (US-016.3)', () => {
  describe('Extreme Structural Nesting Checks', () => {
    it('renders 200 levels of nested blockquotes within bounded time without stack overflow (AC 4)', () => {
      const depth = 200;
      const nestedBlockquotes = '> '.repeat(depth) + 'Deepest blockquote content at level 200';

      const startTime = performance.now();
      const { container } = render(<MarkdownViewer content={nestedBlockquotes} />);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(1000); // Must terminate within 1000ms
      expect(screen.getByText('Deepest blockquote content at level 200')).toBeInTheDocument();
      expect(container.querySelectorAll('blockquote').length).toBeGreaterThan(0);
    });

    it('renders 150 levels of nested lists within bounded time without stack overflow (AC 4)', () => {
      const depth = 150;
      let nestedList = '';
      for (let i = 1; i <= depth; i++) {
        nestedList += `${'  '.repeat(i - 1)}- Item level ${i}\n`;
      }
      nestedList += `${'  '.repeat(depth)}- Final nested target level 150\n`;

      const startTime = performance.now();
      const { container } = render(<MarkdownViewer content={nestedList} />);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(1000);
      expect(screen.getByText('Final nested target level 150')).toBeInTheDocument();
      expect(container.querySelectorAll('li').length).toBeGreaterThan(0);
    });

    it('renders 100 levels of deeply nested inline formatting and spans', () => {
      const depth = 100;
      let nestedInline = 'Terminal inline payload';
      for (let i = 0; i < depth; i++) {
        nestedInline = `<span><em><strong>${nestedInline}</strong></em></span>`;
      }

      const startTime = performance.now();
      render(<MarkdownViewer content={nestedInline} />);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(1000);
      expect(screen.getByText('Terminal inline payload')).toBeInTheDocument();
    });

    it('handles 50 levels of deeply nested HTML table structures safely', () => {
      const depth = 50;
      let nestedTable = 'Deep cell';
      for (let i = 0; i < depth; i++) {
        nestedTable = `<table><tbody><tr><td>${nestedTable}</td></tr></tbody></table>`;
      }

      const startTime = performance.now();
      const { container } = render(<MarkdownViewer content={nestedTable} />);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(1000);
      expect(screen.getByText('Deep cell')).toBeInTheDocument();
      expect(container.querySelector('.markdown-content')).toBeInTheDocument();
    });
  });

  describe('Oversized Single-Line Inputs & ReDoS Resistance', () => {
    it('handles a 100,000-character continuous alphanumeric line without freezing', () => {
      const hugeLine = 'A'.repeat(100_000);

      const startTime = performance.now();
      const { container } = render(<MarkdownViewer content={hugeLine} />);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(1000);
      expect(container.querySelector('p')).toBeInTheDocument();
      expect(container.textContent).toContain('AAAA');
    });

    it('handles 5,000 repeating delimiter characters without catastrophic regex backtracking', () => {
      const repeatingDelimiters = '*'.repeat(2_500) + 'text' + '*'.repeat(2_500);

      const startTime = performance.now();
      render(<MarkdownViewer content={repeatingDelimiters} />);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(1000);
    });

    it('handles 30,000 dollar signs without triggering exponential math escaping backtracking', () => {
      const manyDollars = '$'.repeat(30_000);

      const startTime = performance.now();
      render(<MarkdownViewer content={manyDollars} />);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(1000);
    });

    it('handles 5,000 nested brackets and parentheses without parser freeze', () => {
      const brackets = '['.repeat(2_500) + 'test link' + ']'.repeat(2_500) + '('.repeat(1_000) + ')'.repeat(1_000);

      const startTime = performance.now();
      render(<MarkdownViewer content={brackets} />);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(1000);
    });
  });

  describe('Fuzzing & Malformed Syntax Fault Isolation', () => {
    const fuzzedInputs = [
      // Repeated unmatched links
      '[unclosed target](http://example.com '.repeat(300),
      // Corrupted HTML entity sequences
      '&amp;&quot;&lt;&gt;&#x1234;&#99999999;&garbage;'.repeat(500),
      // Unclosed nested HTML tags
      '<div><section><article><p><span><b><i>'.repeat(100) + 'Unclosed tag barrage',
      // Table with 300 columns and empty cells
      '| ' + 'col | '.repeat(200) + '\n| ' + '--- | '.repeat(200) + '\n| ' + 'val | '.repeat(200),
      // Alternating math and code fences without closing
      '$$\n```\n$$\n```\n'.repeat(50) + 'Broken fences',
      // Oversized HTML attribute values (50KB attribute)
      `<div title="${'X'.repeat(50_000)}" data-test="${'Y'.repeat(50_000)}">Large attribute test</div>`,
      // Malformed Unicode surrogate pairs and control chars
      '\uD800\uDBFF\uDC00\uDFFF\u0000\u0008\u000B\u000C\u000E\u001F'.repeat(200),
    ];

    it.each(fuzzedInputs)(
      'terminates cleanly on malformed fuzz payload %# within bounded time',
      (payload) => {
        const startTime = performance.now();
        expect(() => {
          render(<MarkdownViewer content={payload} />);
        }).not.toThrow();
        const elapsed = performance.now() - startTime;

        expect(elapsed).toBeLessThan(1000);
      }
    );
  });
});
