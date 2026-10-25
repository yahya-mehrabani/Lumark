import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  cleanMarkdownHeadingText,
  extractHeadingsFromMarkdown,
  extractHeadingsFromElement,
  buildTocTree,
} from './tocGenerator';
import { useTableOfContents } from './useTableOfContents';

describe('Heading AST & DOM Extractor (US-021.1)', () => {
  describe('cleanMarkdownHeadingText', () => {
    it('strips inline markdown styles, links, code, and HTML tags', () => {
      expect(cleanMarkdownHeadingText('## Heading with **Bold** and *Italic* ##')).toBe(
        'Heading with Bold and Italic'
      );
      expect(cleanMarkdownHeadingText('Section with [Link Text](https://example.com)')).toBe(
        'Section with Link Text'
      );
      expect(cleanMarkdownHeadingText('Command `npm install` and <span>Badge</span>')).toBe(
        'Command npm install and Badge'
      );
      expect(cleanMarkdownHeadingText('Image ![alt logo](logo.png) in title')).toBe(
        'Image alt logo in title'
      );
      expect(cleanMarkdownHeadingText('  Spaced   Heading   ')).toBe('Spaced Heading');
      expect(cleanMarkdownHeadingText('')).toBe('');
    });
  });

  describe('extractHeadingsFromMarkdown', () => {
    it('extracts h1 through h6 ATX headings with correct levels and IDs', () => {
      const markdown = `
# Title Level 1
## Section Level 2
### Subsection Level 3
#### Detail Level 4
##### Subdetail Level 5
###### Micro Level 6
`;
      const items = extractHeadingsFromMarkdown(markdown);
      expect(items).toHaveLength(6);
      expect(items[0]).toEqual({ id: 'title-level-1', text: 'Title Level 1', level: 1 });
      expect(items[1]).toEqual({ id: 'section-level-2', text: 'Section Level 2', level: 2 });
      expect(items[2]).toEqual({ id: 'subsection-level-3', text: 'Subsection Level 3', level: 3 });
      expect(items[3]).toEqual({ id: 'detail-level-4', text: 'Detail Level 4', level: 4 });
      expect(items[4]).toEqual({ id: 'subdetail-level-5', text: 'Subdetail Level 5', level: 5 });
      expect(items[5]).toEqual({ id: 'micro-level-6', text: 'Micro Level 6', level: 6 });
    });

    it('ignores headings located inside fenced code blocks', () => {
      const markdown = `
# Real Heading 1

\`\`\`markdown
# Fake Heading in Code Block
## Another Fake Heading
\`\`\`

~~~python
# Python Comment Not Heading
~~~

## Real Heading 2
`;
      const items = extractHeadingsFromMarkdown(markdown);
      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({ id: 'real-heading-1', text: 'Real Heading 1', level: 1 });
      expect(items[1]).toEqual({ id: 'real-heading-2', text: 'Real Heading 2', level: 2 });
    });

    it('disambiguates duplicate headings deterministically matching SlugTracker', () => {
      const markdown = `
# Overview
## Details
Paragraph text.
## Details
More details.
## Details
Final details.
`;
      const items = extractHeadingsFromMarkdown(markdown);
      expect(items).toHaveLength(4);
      expect(items[0]).toEqual({ id: 'overview', text: 'Overview', level: 1 });
      expect(items[1]).toEqual({ id: 'details', text: 'Details', level: 2 });
      expect(items[2]).toEqual({ id: 'details-1', text: 'Details', level: 2 });
      expect(items[3]).toEqual({ id: 'details-2', text: 'Details', level: 2 });
    });

    it('supports setext-style headings (=== and ---)', () => {
      const markdown = `
Setext Level 1
==============

Some text.

Setext Level 2
--------------
`;
      const items = extractHeadingsFromMarkdown(markdown);
      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({ id: 'setext-level-1', text: 'Setext Level 1', level: 1 });
      expect(items[1]).toEqual({ id: 'setext-level-2', text: 'Setext Level 2', level: 2 });
    });

    it('supports HTML headings with explicit or generated IDs', () => {
      const markdown = `
<h1 id="custom-anchor">Explicit HTML Title</h1>
<h2>Standard HTML Subheading</h2>
`;
      const items = extractHeadingsFromMarkdown(markdown);
      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({
        id: 'custom-anchor',
        text: 'Explicit HTML Title',
        level: 1,
      });
      expect(items[1]).toEqual({
        id: 'standard-html-subheading',
        text: 'Standard HTML Subheading',
        level: 2,
      });
    });

    it('preserves Persian and Arabic scripts in heading IDs and labels', () => {
      const markdown = `
# راهنمای کاربری
## ویژگی‌های پیشرفته
### مستندات فارسی
`;
      const items = extractHeadingsFromMarkdown(markdown);
      expect(items).toHaveLength(3);
      expect(items[0]).toEqual({
        id: 'راهنمای-کاربری',
        text: 'راهنمای کاربری',
        level: 1,
      });
      expect(items[1]).toEqual({
        id: 'ویژگی-های-پیشرفته',
        text: 'ویژگی‌های پیشرفته',
        level: 2,
      });
      expect(items[2]).toEqual({
        id: 'مستندات-فارسی',
        text: 'مستندات فارسی',
        level: 3,
      });
    });

    it('returns empty array when markdown is empty or contains zero headings', () => {
      expect(extractHeadingsFromMarkdown('')).toEqual([]);
      expect(extractHeadingsFromMarkdown('   \n  \t  ')).toEqual([]);
      expect(extractHeadingsFromMarkdown('Just ordinary paragraph text with no headings.')).toEqual(
        []
      );
    });
  });

  describe('extractHeadingsFromElement', () => {
    it('extracts headings from rendered DOM while stripping anchor symbols and skipping aria-hidden', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <h1 id="intro" class="markdown-heading">
          <a href="#intro" class="heading-anchor" aria-hidden="true">#</a>
          Introduction
        </h1>
        <h2 id="setup" class="markdown-heading">
          <a href="#setup" class="heading-anchor" aria-hidden="true">#</a>
          Setup &amp; Config
        </h2>
        <h3 id="hidden" aria-hidden="true">
          Hidden Heading
        </h3>
      `;

      const items = extractHeadingsFromElement(container);
      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({ id: 'intro', text: 'Introduction', level: 1 });
      expect(items[1]).toEqual({ id: 'setup', text: 'Setup & Config', level: 2 });
    });

    it('returns empty array when container is null', () => {
      expect(extractHeadingsFromElement(null)).toEqual([]);
    });
  });

  describe('buildTocTree', () => {
    it('builds a hierarchical tree from flat heading items', () => {
      const items = [
        { id: 'h1-1', text: 'Chapter 1', level: 1 as const },
        { id: 'h2-1', text: 'Section 1.1', level: 2 as const },
        { id: 'h3-1', text: 'Subsection 1.1.1', level: 3 as const },
        { id: 'h2-2', text: 'Section 1.2', level: 2 as const },
        { id: 'h1-2', text: 'Chapter 2', level: 1 as const },
      ];

      const tree = buildTocTree(items);
      expect(tree).toHaveLength(2);

      // Chapter 1
      expect(tree[0].id).toBe('h1-1');
      expect(tree[0].children).toHaveLength(2);
      expect(tree[0].children[0].id).toBe('h2-1');
      expect(tree[0].children[0].children).toHaveLength(1);
      expect(tree[0].children[0].children[0].id).toBe('h3-1');
      expect(tree[0].children[1].id).toBe('h2-2');
      expect(tree[0].children[1].children).toHaveLength(0);

      // Chapter 2
      expect(tree[1].id).toBe('h1-2');
      expect(tree[1].children).toHaveLength(0);
    });

    it('handles skipped levels cleanly (e.g., h1 followed by h3)', () => {
      const items = [
        { id: 'h1', text: 'Top', level: 1 as const },
        { id: 'h3', text: 'Deep Child', level: 3 as const },
      ];

      const tree = buildTocTree(items);
      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe('h1');
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].id).toBe('h3');
    });

    it('handles documents starting with h2 or multiple root-level headings', () => {
      const items = [
        { id: 'h2-a', text: 'Section A', level: 2 as const },
        { id: 'h2-b', text: 'Section B', level: 2 as const },
      ];

      const tree = buildTocTree(items);
      expect(tree).toHaveLength(2);
      expect(tree[0].id).toBe('h2-a');
      expect(tree[1].id).toBe('h2-b');
    });

    it('returns empty array for empty items list', () => {
      expect(buildTocTree([])).toEqual([]);
    });
  });

  describe('useTableOfContents hook', () => {
    it('returns items, tree, and hasHeadings correctly for provided markdown', () => {
      const markdown = `
# Main Title
## Subsection A
## Subsection B
`;
      const { result } = renderHook(() => useTableOfContents({ markdown }));

      expect(result.current.hasHeadings).toBe(true);
      expect(result.current.items).toHaveLength(3);
      expect(result.current.tree).toHaveLength(1);
      expect(result.current.tree[0].children).toHaveLength(2);
    });

    it('returns hasHeadings: false when markdown contains no headings', () => {
      const { result } = renderHook(() =>
        useTableOfContents({ markdown: 'Just some text.' })
      );

      expect(result.current.hasHeadings).toBe(false);
      expect(result.current.items).toHaveLength(0);
      expect(result.current.tree).toHaveLength(0);
    });
  });
});
