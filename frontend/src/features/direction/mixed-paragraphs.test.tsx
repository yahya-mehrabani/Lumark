import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MarkdownViewer } from '../rendering/MarkdownViewer';
import { detectFirstStrongDirection } from './autoDirection';

describe('CSS Bidi Rules & Mixed-Paragraph Direction Independence (US-017.3 / FR-DIR-001)', () => {
  describe('CSS Bidi Rules & Font Stack Verification', () => {
    const cssPath = path.resolve(__dirname, '../rendering/markdown.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    it('applies unicode-bidi: isolate to block elements to prevent cross-element bidi bleeding (AC 5)', () => {
      expect(cssContent).toContain('unicode-bidi: isolate;');
      expect(cssContent).toContain('.markdown-content p');
      expect(cssContent).toContain('.markdown-content blockquote');
      expect(cssContent).toContain('.markdown-content [dir="auto"]');
    });

    it('includes Persian font fallbacks (Vazirmatn, Tahoma) in typography font-family stack', () => {
      expect(cssContent).toContain('"Vazirmatn"');
      expect(cssContent).toContain('"Tahoma"');
    });

    it('configures text alignment and layout rules for RTL and LTR elements', () => {
      expect(cssContent).toContain('.markdown-content [dir="rtl"]');
      expect(cssContent).toContain('direction: rtl;');
      expect(cssContent).toContain('text-align: right;');

      expect(cssContent).toContain('.markdown-content [dir="ltr"]');
      expect(cssContent).toContain('direction: ltr;');
      expect(cssContent).toContain('text-align: left;');
    });

    it('configures RTL-specific blockquote borders and list padding', () => {
      expect(cssContent).toContain('.markdown-content blockquote[dir="rtl"]');
      expect(cssContent).toContain('border-right: 4px solid #38bdf8;');
      expect(cssContent).toContain('.markdown-content ul[dir="rtl"]');
      expect(cssContent).toContain('padding-right: 2em;');
    });
  });

  describe('Multi-Paragraph Mixed Persian/English Independence', () => {
    it('sets direction independently per paragraph in mixed-language document (AC 1, AC 2, AC 5)', () => {
      const mixedMarkdown = `
این یک پاراگراف به زبان شیرین فارسی است که باید در جهت راست‌به‌چپ قرار گیرد.

This is an English paragraph that must be aligned to the left and read left-to-right.

پاراگراف سوم دوباره به زبان فارسی نوشته شده و شامل اصطلاحات فنی انگلیسی مانند Docker و Kubernetes است.

Finally, an English conclusion paragraph summarizing the architectural invariants.
`;

      const { container } = render(<MarkdownViewer content={mixedMarkdown} />);
      const paragraphs = Array.from(container.querySelectorAll('p'));

      expect(paragraphs.length).toBe(4);

      // All block paragraphs receive dir="auto"
      for (const p of paragraphs) {
        expect(p).toHaveAttribute('dir', 'auto');
      }

      // Strong directional classifications are independent per paragraph
      expect(detectFirstStrongDirection(paragraphs[0].textContent || '')).toBe('rtl');
      expect(detectFirstStrongDirection(paragraphs[1].textContent || '')).toBe('ltr');
      expect(detectFirstStrongDirection(paragraphs[2].textContent || '')).toBe('rtl');
      expect(detectFirstStrongDirection(paragraphs[3].textContent || '')).toBe('ltr');
    });

    it('preserves punctuation positioning at the correct end of lines in mixed sentences (AC 1, AC 4)', () => {
      const mixedSentenceMarkdown = `
از ابزار Docker استفاده کنید.

Use Docker for فارسی documents.
`;

      const { container } = render(<MarkdownViewer content={mixedSentenceMarkdown} />);
      const paragraphs = Array.from(container.querySelectorAll('p'));

      expect(paragraphs.length).toBe(2);

      const persianText = paragraphs[0].textContent || '';
      const englishText = paragraphs[1].textContent || '';

      // First strong character of sentence determines paragraph flow
      expect(detectFirstStrongDirection(persianText)).toBe('rtl');
      expect(detectFirstStrongDirection(englishText)).toBe('ltr');

      // Trailing punctuation stays intact in string without corruption
      expect(persianText.endsWith('.')).toBe(true);
      expect(englishText.endsWith('.')).toBe(true);
    });

    it('renders mixed headings, lists, and blockquotes with independent auto direction', () => {
      const complexMixedMarkdown = `
# راهنمای جامع فارسی
## English Technical Guide

> نقل قول مهم: همیشه تست‌ها را اجرا کنید.
> English quote: Always run your tests before committing.

- آیتم فارسی اول
- English second item
- آیتم سوم با دستور \`npm test\`
`;

      const { container } = render(<MarkdownViewer content={complexMixedMarkdown} />);

      const h1 = container.querySelector('h1');
      const h2 = container.querySelector('h2');
      const blockquotes = container.querySelectorAll('blockquote');
      const listItems = container.querySelectorAll('li');

      expect(h1).toHaveAttribute('dir', 'auto');
      expect(h2).toHaveAttribute('dir', 'auto');
      expect(detectFirstStrongDirection(h1?.textContent || '')).toBe('rtl');
      expect(detectFirstStrongDirection(h2?.textContent || '')).toBe('ltr');

      expect(blockquotes.length).toBeGreaterThanOrEqual(1);
      for (const bq of blockquotes) {
        expect(bq).toHaveAttribute('dir', 'auto');
      }

      expect(listItems.length).toBe(3);
      expect(detectFirstStrongDirection(listItems[0].textContent || '')).toBe('rtl');
      expect(detectFirstStrongDirection(listItems[1].textContent || '')).toBe('ltr');
      expect(detectFirstStrongDirection(listItems[2].textContent || '')).toBe('rtl');
    });

    it('respects explicit author dir attributes alongside auto-detected blocks', () => {
      const explicitMixed = `
<p dir="ltr">Persian letters in explicit LTR block: سلام</p>
<p dir="rtl">English letters in explicit RTL block: Hello</p>
<p>فارسی در پاراگراف خودکار</p>
`;

      const { container } = render(<MarkdownViewer content={explicitMixed} />);
      const paragraphs = Array.from(container.querySelectorAll('p'));

      expect(paragraphs.length).toBe(3);
      expect(paragraphs[0]).toHaveAttribute('dir', 'ltr');
      expect(paragraphs[1]).toHaveAttribute('dir', 'rtl');
      expect(paragraphs[2]).toHaveAttribute('dir', 'auto');
      expect(detectFirstStrongDirection(paragraphs[2].textContent || '')).toBe('rtl');
    });
  });
});
