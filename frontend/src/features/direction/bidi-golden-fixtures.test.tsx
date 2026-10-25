import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { MarkdownViewer } from '../rendering/MarkdownViewer';

describe('Bidi Golden Fixtures Suite (US-020.1)', () => {
  const fixturesDir = path.resolve(__dirname, '../../../../fixtures/golden');

  function loadFixture(filename: string): string {
    const fullPath = path.join(fixturesDir, filename);
    expect(fs.existsSync(fullPath)).toBe(true);
    return fs.readFileSync(fullPath, 'utf-8');
  }

  describe('1. persian-prose.md Golden Fixture', () => {
    it('renders pure Persian prose with correct headings, paragraphs, lists, and quotes', () => {
      const content = loadFixture('persian-prose.md');
      const { container } = render(
        <MarkdownViewer
          document={{
            filename: 'persian-prose.md',
            content,
          }}
        />
      );

      const contentEl = screen.getByTestId('markdown-content');
      expect(contentEl).toBeInTheDocument();

      // Heading 1
      const h1 = within(contentEl).getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('راهنمای جامع معماری و نگارش نرم‌افزار');
      expect(h1.getAttribute('dir')).toBe('auto');

      // Section Headings (h2)
      const h2s = within(contentEl).getAllByRole('heading', { level: 2 });
      expect(h2s.length).toBeGreaterThanOrEqual(4);
      expect(h2s[0]).toHaveTextContent('۱. مبانی نظری و نگارش فارسی');
      expect(h2s[0].getAttribute('dir')).toBe('auto');

      // Paragraphs
      const paragraphs = container.querySelectorAll('.markdown-content p');
      expect(paragraphs.length).toBeGreaterThanOrEqual(6);
      paragraphs.forEach((p) => {
        expect(p.getAttribute('dir')).toBe('auto');
      });

      // Persian list items
      const listItems = container.querySelectorAll('.markdown-content li');
      expect(listItems.length).toBeGreaterThanOrEqual(6);
      listItems.forEach((li) => {
        expect(li.getAttribute('dir')).toBe('auto');
      });

      // Persian blockquotes
      const blockquotes = container.querySelectorAll('.markdown-content blockquote');
      expect(blockquotes.length).toBeGreaterThanOrEqual(1);
      blockquotes.forEach((bq) => {
        expect(bq.getAttribute('dir')).toBe('auto');
      });
    });
  });

  describe('2. arabic-prose.md Golden Fixture', () => {
    it('renders pure Arabic prose with diacritics, proper headings, and lists', () => {
      const content = loadFixture('arabic-prose.md');
      const { container } = render(
        <MarkdownViewer
          document={{
            filename: 'arabic-prose.md',
            content,
          }}
        />
      );

      const contentEl = screen.getByTestId('markdown-content');
      expect(contentEl).toBeInTheDocument();

      // Heading 1
      const h1 = within(contentEl).getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('وثيقة المواصفات الفنية للنظام البرمجي');
      expect(h1.getAttribute('dir')).toBe('auto');

      // Section Headings (h2)
      const h2s = within(contentEl).getAllByRole('heading', { level: 2 });
      expect(h2s.length).toBeGreaterThanOrEqual(4);
      expect(h2s[0]).toHaveTextContent('١. النظرة العامة والمفاهيم الأساسية');
      expect(h2s[0].getAttribute('dir')).toBe('auto');

      // Arabic paragraphs with Tashkeel
      const paragraphs = container.querySelectorAll('.markdown-content p');
      expect(paragraphs.length).toBeGreaterThanOrEqual(6);
      paragraphs.forEach((p) => {
        expect(p.getAttribute('dir')).toBe('auto');
      });

      // Verify Tashkeel / diacritics presence in DOM
      expect(contentEl.textContent).toContain('الفَتْحَة');
      expect(contentEl.textContent).toContain('والضَّمَّة');

      // Arabic lists and blockquotes
      const lists = container.querySelectorAll('.markdown-content ul, .markdown-content ol');
      expect(lists.length).toBeGreaterThanOrEqual(2);
      const blockquotes = container.querySelectorAll('.markdown-content blockquote');
      expect(blockquotes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('3. mixed-bidi-tech.md Golden Fixture', () => {
    it('renders mixed technical content with LTR code, KaTeX, and Mermaid isolation', async () => {
      const content = loadFixture('mixed-bidi-tech.md');
      const { container } = render(
        <MarkdownViewer
          document={{
            filename: 'mixed-bidi-tech.md',
            content,
          }}
        />
      );

      const contentEl = screen.getByTestId('markdown-content');
      expect(contentEl).toBeInTheDocument();

      // Heading 1
      const h1 = within(contentEl).getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('مستندات فنی و راهنمای مهندسی معماری مختلط');
      expect(h1.getAttribute('dir')).toBe('auto');

      // Inline code blocks have dir="ltr"
      const inlineCodes = container.querySelectorAll('.markdown-content code:not(pre code)');
      expect(inlineCodes.length).toBeGreaterThanOrEqual(5);
      inlineCodes.forEach((code) => {
        expect(code.getAttribute('dir')).toBe('ltr');
      });

      // Fenced code blocks have dir="ltr" on pre, code, and container
      const codeBlocks = container.querySelectorAll('.code-block-container');
      expect(codeBlocks.length).toBeGreaterThanOrEqual(2);
      codeBlocks.forEach((block) => {
        expect(block.getAttribute('dir')).toBe('ltr');
        const pre = block.querySelector('pre');
        expect(pre?.getAttribute('dir')).toBe('ltr');
      });

      // KaTeX math formulas render with dir="ltr"
      const katexElements = container.querySelectorAll('.katex');
      expect(katexElements.length).toBeGreaterThanOrEqual(3);
      katexElements.forEach((katex) => {
        expect(katex.getAttribute('dir')).toBe('ltr');
      });

      // Mermaid diagram rendered or loading with dir="ltr"
      const mermaidContainer = await screen.findByTestId('mermaid-container');
      expect(mermaidContainer).toBeInTheDocument();
      expect(mermaidContainer.getAttribute('dir')).toBe('ltr');
    });
  });

  describe('4. nested-bidi-lists.md Golden Fixture', () => {
    it('renders complex nested lists and blockquotes with appropriate direction', () => {
      const content = loadFixture('nested-bidi-lists.md');
      const { container } = render(
        <MarkdownViewer
          document={{
            filename: 'nested-bidi-lists.md',
            content,
          }}
        />
      );

      const contentEl = screen.getByTestId('markdown-content');
      expect(contentEl).toBeInTheDocument();

      // Lists and nested items
      const lists = container.querySelectorAll('.markdown-content ol, .markdown-content ul');
      expect(lists.length).toBeGreaterThanOrEqual(4);

      // Checkboxes from task list
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes.length).toBeGreaterThanOrEqual(4);

      // Nested blockquotes in lists
      const blockquotes = container.querySelectorAll('.markdown-content blockquote');
      expect(blockquotes.length).toBeGreaterThanOrEqual(3);
      blockquotes.forEach((bq) => {
        expect(bq.getAttribute('dir')).toBe('auto');
      });
    });
  });

  describe('5. bidi-tables.md Golden Fixture', () => {
    it('renders bilingual tables with proper cell alignments and elements', () => {
      const content = loadFixture('bidi-tables.md');
      const { container } = render(
        <MarkdownViewer
          document={{
            filename: 'bidi-tables.md',
            content,
          }}
        />
      );

      const contentEl = screen.getByTestId('markdown-content');
      expect(contentEl).toBeInTheDocument();

      // Tables
      const tables = container.querySelectorAll('table');
      expect(tables.length).toBeGreaterThanOrEqual(4);

      // Check table headers and rows
      const ths = container.querySelectorAll('th');
      expect(ths.length).toBeGreaterThanOrEqual(15);

      // Table cells with code tokens retain dir="ltr"
      const tableCodes = container.querySelectorAll('td code');
      expect(tableCodes.length).toBeGreaterThanOrEqual(10);
      tableCodes.forEach((code) => {
        expect(code.getAttribute('dir')).toBe('ltr');
      });
    });
  });

  describe('6. explicit-dir-styling.md Golden Fixture', () => {
    it('renders explicit HTML dir attributes, scoped CSS, and cascading rules', () => {
      const content = loadFixture('explicit-dir-styling.md');
      const { container } = render(
        <MarkdownViewer
          document={{
            filename: 'explicit-dir-styling.md',
            content,
          }}
        />
      );

      const contentEl = screen.getByTestId('markdown-content');
      expect(contentEl).toBeInTheDocument();

      // Explicit HTML dir attributes
      const pRtl = container.querySelector('p[dir="rtl"]');
      expect(pRtl).toBeInTheDocument();
      expect(pRtl?.textContent).toContain('This is an English paragraph explicitly marked with dir="rtl"');

      const pLtr = container.querySelector('p[dir="ltr"]');
      expect(pLtr).toBeInTheDocument();
      expect(pLtr?.textContent).toContain('این یک پاراگراف به زبان فارسی است');

      // Scoped class elements
      const forceLtr = container.querySelector('.force-ltr');
      expect(forceLtr).toBeInTheDocument();
      expect(forceLtr?.getAttribute('dir')).toBe('ltr');

      const forceRtl = container.querySelector('.force-rtl');
      expect(forceRtl).toBeInTheDocument();
      expect(forceRtl?.getAttribute('dir')).toBe('rtl');

      // Container cascading
      const divRtl = container.querySelector('div[dir="rtl"]');
      expect(divRtl).toBeInTheDocument();
      expect(divRtl?.getAttribute('dir')).toBe('rtl');
      const divChildren = divRtl?.querySelectorAll('p');
      expect(divChildren?.length).toBe(2);
      // Child 1 inherits parent RTL, not overridden by dir="auto"
      expect(divChildren?.[0].getAttribute('dir')).not.toBe('auto');
      expect(divChildren?.[0].closest('[dir]')?.getAttribute('dir')).toBe('rtl');
      // Child 2 explicitly overrides parent direction to LTR
      expect(divChildren?.[1].getAttribute('dir')).toBe('ltr');
    });
  });
});
