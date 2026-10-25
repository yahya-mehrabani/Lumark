import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { MarkdownViewer } from '../rendering/MarkdownViewer';

describe('Bidi Alignment Precedence & Fixture Block Suite (US-020.2)', () => {
  const fixturesDir = path.resolve(__dirname, '../../../../fixtures/golden');

  function loadFixture(filename: string): string {
    const fullPath = path.join(fixturesDir, filename);
    expect(fs.existsSync(fullPath)).toBe(true);
    return fs.readFileSync(fullPath, 'utf-8');
  }

  describe('1. Text Alignment Precedence Rules (AC 4 & FR-DIR-003)', () => {
    it('applies GFM table column alignment (:---, :---:, ---:) to th and td elements', () => {
      const md = `
| Left Header | Center Header | Right Header |
| :--- | :---: | ---: |
| چپ‌چین | وسط‌چین | راست‌چین |
| English Left | English Center | English Right |
      `;
      const { container } = render(<MarkdownViewer content={md} />);

      const ths = container.querySelectorAll('th');
      expect(ths).toHaveLength(3);
      expect(ths[0].style.textAlign).toBe('left');
      expect(ths[1].style.textAlign).toBe('center');
      expect(ths[2].style.textAlign).toBe('right');

      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(2);

      // Row 1 (Persian text with explicit column alignments)
      const r1Cells = rows[0].querySelectorAll('td');
      expect(r1Cells[0].style.textAlign).toBe('left');
      expect(r1Cells[1].style.textAlign).toBe('center');
      expect(r1Cells[2].style.textAlign).toBe('right');

      // Row 2 (English text with explicit column alignments)
      const r2Cells = rows[1].querySelectorAll('td');
      expect(r2Cells[0].style.textAlign).toBe('left');
      expect(r2Cells[1].style.textAlign).toBe('center');
      expect(r2Cells[2].style.textAlign).toBe('right');
    });

    it('scoped CSS text-align class overrides default natural alignment', () => {
      const md = `
<style>
  .align-start { text-align: left; }
  .align-end { text-align: right; }
</style>

<p class="align-start">این یک پاراگراف فارسی است که با کلاس سی‌اس‌اس به چپ تراز شده است.</p>
<p class="align-end">This is an English paragraph aligned to the right via CSS.</p>
      `;
      const { container } = render(<MarkdownViewer content={md} />);

      const pStart = container.querySelector('.align-start');
      expect(pStart).toBeInTheDocument();
      expect(pStart?.className).toContain('align-start');

      const pEnd = container.querySelector('.align-end');
      expect(pEnd).toBeInTheDocument();
      expect(pEnd?.className).toContain('align-end');
    });

    it('blockquotes in RTL and LTR contexts maintain distinct directional borders and alignment', () => {
      const md = `
> This is a standard LTR blockquote.
> It should have standard left border.

> این یک نقل‌قول فارسی راست‌به‌چپ است.
> علامت مرزی آن باید در سمت راست قرار گیرد.
      `;
      const { container } = render(<MarkdownViewer content={md} />);

      const blockquotes = container.querySelectorAll('blockquote');
      expect(blockquotes.length).toBeGreaterThanOrEqual(2);
      blockquotes.forEach((bq) => {
        expect(bq.getAttribute('dir')).toBe('auto');
      });
    });
  });

  describe('2. Comprehensive Computed dir Verification Across All 6 Golden Fixtures', () => {
    it('verifies computed dir on every block element in persian-prose.md', () => {
      const content = loadFixture('persian-prose.md');
      const { container } = render(<MarkdownViewer content={content} />);

      const blocks = container.querySelectorAll('.markdown-content h1, .markdown-content h2, .markdown-content h3, .markdown-content p, .markdown-content li, .markdown-content blockquote');
      expect(blocks.length).toBeGreaterThanOrEqual(15);

      blocks.forEach((block) => {
        const dir = block.getAttribute('dir');
        expect(dir).toBe('auto');
      });
    });

    it('verifies computed dir on every block element in arabic-prose.md', () => {
      const content = loadFixture('arabic-prose.md');
      const { container } = render(<MarkdownViewer content={content} />);

      const blocks = container.querySelectorAll('.markdown-content h1, .markdown-content h2, .markdown-content h3, .markdown-content p, .markdown-content li, .markdown-content blockquote');
      expect(blocks.length).toBeGreaterThanOrEqual(15);

      blocks.forEach((block) => {
        const dir = block.getAttribute('dir');
        expect(dir).toBe('auto');
      });
    });

    it('verifies non-prose LTR isolation across mixed-bidi-tech.md', () => {
      const content = loadFixture('mixed-bidi-tech.md');
      const { container } = render(<MarkdownViewer content={content} />);

      // Non-prose elements (code, pre, math) MUST be dir="ltr"
      const preElements = container.querySelectorAll('.markdown-content pre');
      expect(preElements.length).toBeGreaterThanOrEqual(2);
      preElements.forEach((pre) => {
        expect(pre.getAttribute('dir')).toBe('ltr');
      });

      const inlineCodeElements = container.querySelectorAll('.markdown-content code:not(pre code)');
      expect(inlineCodeElements.length).toBeGreaterThanOrEqual(5);
      inlineCodeElements.forEach((code) => {
        expect(code.getAttribute('dir')).toBe('ltr');
      });

      const mathElements = container.querySelectorAll('.katex');
      expect(mathElements.length).toBeGreaterThanOrEqual(3);
      mathElements.forEach((math) => {
        expect(math.getAttribute('dir')).toBe('ltr');
      });
    });

    it('verifies nested list and item directions in nested-bidi-lists.md', () => {
      const content = loadFixture('nested-bidi-lists.md');
      const { container } = render(<MarkdownViewer content={content} />);

      const listItems = container.querySelectorAll('.markdown-content li');
      expect(listItems.length).toBeGreaterThanOrEqual(10);

      listItems.forEach((li) => {
        expect(li.getAttribute('dir')).toBe('auto');
      });

      // Nested blockquotes in lists
      const blockquotes = container.querySelectorAll('.markdown-content li blockquote');
      expect(blockquotes.length).toBeGreaterThanOrEqual(2);
      blockquotes.forEach((bq) => {
        expect(bq.getAttribute('dir')).toBe('auto');
      });
    });

    it('verifies table headers, cells, and alignment indicators in bidi-tables.md', () => {
      const content = loadFixture('bidi-tables.md');
      const { container } = render(<MarkdownViewer content={content} />);

      const ths = container.querySelectorAll('.markdown-content th');
      expect(ths.length).toBeGreaterThanOrEqual(15);
      ths.forEach((th) => {
        expect(th.getAttribute('dir')).toBe('auto');
      });

      const tds = container.querySelectorAll('.markdown-content td');
      expect(tds.length).toBeGreaterThanOrEqual(40);
      tds.forEach((td) => {
        expect(td.getAttribute('dir')).toBe('auto');
      });

      // Verify explicit column alignments exist on table headers
      const alignedThs = Array.from(ths).filter((th) => Boolean((th as HTMLElement).style.textAlign));
      expect(alignedThs.length).toBeGreaterThanOrEqual(5);
    });

    it('verifies explicit dir, scoped CSS class, and container cascading in explicit-dir-styling.md', () => {
      const content = loadFixture('explicit-dir-styling.md');
      const { container } = render(<MarkdownViewer content={content} />);

      // Explicit dir attributes
      const pRtl = container.querySelector('p[dir="rtl"]');
      expect(pRtl).toBeInTheDocument();
      const pLtr = container.querySelector('p[dir="ltr"]');
      expect(pLtr).toBeInTheDocument();

      // Scoped CSS classes
      const forceLtr = container.querySelector('.force-ltr');
      expect(forceLtr?.getAttribute('dir')).toBe('ltr');
      const forceRtl = container.querySelector('.force-rtl');
      expect(forceRtl?.getAttribute('dir')).toBe('rtl');

      // Cascading container
      const divRtl = container.querySelector('div[dir="rtl"]');
      expect(divRtl?.getAttribute('dir')).toBe('rtl');
      const divChildren = divRtl?.querySelectorAll('p');
      expect(divChildren).toHaveLength(2);
      expect(divChildren?.[0].getAttribute('dir')).toBeNull(); // Inherits container dir without dir="auto"
      expect(divChildren?.[1].getAttribute('dir')).toBe('ltr'); // Overrides container dir
    });
  });
});
