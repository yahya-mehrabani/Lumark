import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MarkdownViewer } from '../rendering/MarkdownViewer';
import { rehypeAutoDirection, DEFAULT_AUTO_DIR_TAGS } from './autoDirectionPlugin';
import type { Root as HastRoot } from 'hast';

describe('Block-Level Direction in Markdown AST & DOM (US-017.2 / FR-DIR-001)', () => {
  describe('Rehype Plugin Unit Tests', () => {
    it('applies dir="auto" to target block tags in HAST tree', () => {
      const plugin = rehypeAutoDirection();
      const tree: HastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'p',
            properties: {},
            children: [{ type: 'text', value: 'این یک پاراگراف است.' }],
          },
          {
            type: 'element',
            tagName: 'h1',
            properties: {},
            children: [{ type: 'text', value: 'عنوان اصلی' }],
          },
          {
            type: 'element',
            tagName: 'blockquote',
            properties: {},
            children: [{ type: 'text', value: 'نقل قول' }],
          },
          {
            type: 'element',
            tagName: 'li',
            properties: {},
            children: [{ type: 'text', value: 'آیتم لیست' }],
          },
          {
            type: 'element',
            tagName: 'th',
            properties: {},
            children: [{ type: 'text', value: 'سرستون' }],
          },
          {
            type: 'element',
            tagName: 'td',
            properties: {},
            children: [{ type: 'text', value: 'داده' }],
          },
        ],
      };

      plugin(tree);

      for (const child of tree.children) {
        if (child.type === 'element') {
          expect(child.properties.dir).toBe('auto');
        }
      }
    });

    it('preserves author explicit dir="rtl" and dir="ltr" attributes (FR-DIR-002)', () => {
      const plugin = rehypeAutoDirection();
      const tree: HastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'p',
            properties: { dir: 'rtl' },
            children: [{ type: 'text', value: 'صریحاً راست به چپ' }],
          },
          {
            type: 'element',
            tagName: 'p',
            properties: { dir: 'ltr' },
            children: [{ type: 'text', value: 'Explicitly left to right' }],
          },
          {
            type: 'element',
            tagName: 'h2',
            properties: { dir: 'rtl' },
            children: [{ type: 'text', value: 'عنوان راست به چپ' }],
          },
        ],
      };

      plugin(tree);

      const [p1, p2, h2] = tree.children as any[];
      expect(p1.properties.dir).toBe('rtl');
      expect(p2.properties.dir).toBe('ltr');
      expect(h2.properties.dir).toBe('rtl');
    });

    it('does not attach dir="auto" to non-target tags (span, strong, code, a, div)', () => {
      const plugin = rehypeAutoDirection();
      const tree: HastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'div',
            properties: {},
            children: [
              {
                type: 'element',
                tagName: 'span',
                properties: {},
                children: [{ type: 'text', value: 'متن' }],
              },
              {
                type: 'element',
                tagName: 'code',
                properties: {},
                children: [{ type: 'text', value: 'code snippet' }],
              },
              {
                type: 'element',
                tagName: 'a',
                properties: { href: 'https://example.com' },
                children: [{ type: 'text', value: 'لینک' }],
              },
            ],
          },
        ],
      };

      plugin(tree);

      const div = tree.children[0] as any;
      expect(div.properties.dir).toBeUndefined();
      expect(div.children[0].properties.dir).toBeUndefined();
      // Non-prose code node receives explicit dir="ltr" per FR-DIR-005 & US-019.1 (not dir="auto")
      expect(div.children[1].properties.dir).toBe('ltr');
      expect(div.children[2].properties.dir).toBeUndefined();
    });

    it('covers all standard block tags in DEFAULT_AUTO_DIR_TAGS', () => {
      const expectedTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'td', 'th', 'caption'];
      for (const tag of expectedTags) {
        expect(DEFAULT_AUTO_DIR_TAGS.has(tag)).toBe(true);
      }
    });
  });

  describe('MarkdownViewer End-to-End DOM Rendering Integration', () => {
    it('renders paragraphs with dir="auto" attribute in DOM', () => {
      const markdown = `
این یک پاراگراف فارسی است.

This is an English paragraph.
`;
      const { container } = render(<MarkdownViewer content={markdown} />);
      const paragraphs = container.querySelectorAll('p');

      expect(paragraphs.length).toBe(2);
      expect(paragraphs[0]).toHaveAttribute('dir', 'auto');
      expect(paragraphs[1]).toHaveAttribute('dir', 'auto');
    });

    it('renders all headings (h1 through h6) with dir="auto" attribute', () => {
      const markdown = `
# عنوان یک
## Heading Two
### عنوان سه
#### Heading Four
##### عنوان پنج
###### Heading Six
`;
      const { container } = render(<MarkdownViewer content={markdown} />);

      for (let level = 1; level <= 6; level++) {
        const heading = container.querySelector(`h${level}`);
        expect(heading).not.toBeNull();
        expect(heading).toHaveAttribute('dir', 'auto');
      }
    });

    it('renders list items with dir="auto" attribute', () => {
      const markdown = `
- آیتم اول فارسی
- Second English item
- آیتم سوم با ابزار Docker
`;
      const { container } = render(<MarkdownViewer content={markdown} />);
      const listItems = container.querySelectorAll('li');

      expect(listItems.length).toBe(3);
      for (const li of listItems) {
        expect(li).toHaveAttribute('dir', 'auto');
      }
    });

    it('renders blockquotes with dir="auto" attribute', () => {
      const markdown = `
> این یک نقل قول به زبان فارسی است.
`;
      const { container } = render(<MarkdownViewer content={markdown} />);
      const blockquote = container.querySelector('blockquote');

      expect(blockquote).not.toBeNull();
      expect(blockquote).toHaveAttribute('dir', 'auto');
    });

    it('renders table headers and cells with dir="auto" attribute', () => {
      const markdown = `
| ستون اول | Column Two |
| :--- | :--- |
| داده فارسی | English Data |
`;
      const { container } = render(<MarkdownViewer content={markdown} />);
      const ths = container.querySelectorAll('th');
      const tds = container.querySelectorAll('td');

      expect(ths.length).toBe(2);
      for (const th of ths) {
        expect(th).toHaveAttribute('dir', 'auto');
      }

      expect(tds.length).toBe(2);
      for (const td of tds) {
        expect(td).toHaveAttribute('dir', 'auto');
      }
    });

    it('preserves raw HTML explicit dir attribute in MarkdownViewer', () => {
      const markdown = `
<p dir="rtl">صریحاً راست‌چین شده</p>
<p dir="ltr">Explicitly Left To Right</p>
`;
      const { container } = render(<MarkdownViewer content={markdown} />);
      const paragraphs = container.querySelectorAll('p');

      expect(paragraphs.length).toBe(2);
      expect(paragraphs[0]).toHaveAttribute('dir', 'rtl');
      expect(paragraphs[1]).toHaveAttribute('dir', 'ltr');
    });
  });
});
