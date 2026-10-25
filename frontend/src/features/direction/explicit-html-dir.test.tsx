import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownViewer } from '../rendering/MarkdownViewer';
import { resolveExplicitDir } from './resolver';

describe('US-018.1: Explicit HTML dir attribute and DirectionResolver', () => {
  describe('resolveExplicitDir utility', () => {
    it('resolves explicit dir="rtl" attribute', () => {
      expect(resolveExplicitDir({ dir: 'rtl' })).toBe('rtl');
    });

    it('resolves explicit dir="ltr" attribute', () => {
      expect(resolveExplicitDir({ dir: 'ltr' })).toBe('ltr');
    });

    it('resolves explicit dir="auto" attribute', () => {
      expect(resolveExplicitDir({ dir: 'auto' })).toBe('auto');
    });

    it('normalizes case for dir attribute (RTL / LTR / AUTO)', () => {
      expect(resolveExplicitDir({ dir: 'RTL' })).toBe('rtl');
      expect(resolveExplicitDir({ dir: 'LTR' })).toBe('ltr');
      expect(resolveExplicitDir({ dir: 'Auto' })).toBe('auto');
    });

    it('ignores invalid dir attribute values', () => {
      expect(resolveExplicitDir({ dir: 'upward' })).toBeUndefined();
      expect(resolveExplicitDir({ dir: 'inherit' })).toBeUndefined();
      expect(resolveExplicitDir({ dir: '' })).toBeUndefined();
    });

    it('extracts explicit direction from inline style attribute', () => {
      expect(resolveExplicitDir({ style: 'direction: rtl; color: red;' })).toBe('rtl');
      expect(resolveExplicitDir({ style: 'font-weight: bold; direction: ltr;' })).toBe('ltr');
      expect(resolveExplicitDir({ style: 'DIRECTION: RTL' })).toBe('rtl');
    });

    it('returns undefined when neither dir nor direction style is present', () => {
      expect(resolveExplicitDir({})).toBeUndefined();
      expect(resolveExplicitDir({ class: 'my-text', style: 'color: blue;' })).toBeUndefined();
      expect(resolveExplicitDir(undefined)).toBeUndefined();
    });
  });

  describe('MarkdownViewer rendering with explicit HTML dir attributes', () => {
    it('preserves explicit dir="rtl" on English paragraphs and does not override with auto', () => {
      const markdown = '<p dir="rtl">English text with explicit RTL</p>';
      render(<MarkdownViewer content={markdown} />);

      const p = screen.getByText('English text with explicit RTL');
      expect(p.getAttribute('dir')).toBe('rtl');
    });

    it('preserves explicit dir="ltr" on Persian paragraphs and does not override with auto', () => {
      const markdown = '<p dir="ltr">متن فارسی با جهت صریح چپ‌به‌راست</p>';
      render(<MarkdownViewer content={markdown} />);

      const p = screen.getByText('متن فارسی با جهت صریح چپ‌به‌راست');
      expect(p.getAttribute('dir')).toBe('ltr');
    });

    it('cascades explicit dir="rtl" from parent container to child paragraphs without dir="auto" override (AC 1 & AC 3)', () => {
      const markdown = `
<div dir="rtl">
  <p>English text inside explicit RTL container</p>
</div>
      `;
      render(<MarkdownViewer content={markdown} />);

      const p = screen.getByText('English text inside explicit RTL container');
      const container = p.parentElement;
      expect(container?.getAttribute('dir')).toBe('rtl');

      // Child paragraph must NOT have received dir="auto", which would have forced LTR
      expect(p.getAttribute('dir')).not.toBe('auto');
    });

    it('allows a child paragraph to explicitly override parent container direction (AC 3)', () => {
      const markdown = `
<div dir="rtl" data-testid="outer-rtl">
  <p dir="ltr">Nested paragraph overriding to LTR</p>
</div>
      `;
      render(<MarkdownViewer content={markdown} />);

      const p = screen.getByText('Nested paragraph overriding to LTR');
      expect(p.getAttribute('dir')).toBe('ltr');
    });

    it('allows a child paragraph to explicitly opt into auto-detection via dir="auto" inside parent container', () => {
      const markdown = `
<div dir="rtl">
  <p dir="auto">English paragraph explicitly opting into auto</p>
</div>
      `;
      render(<MarkdownViewer content={markdown} />);

      const p = screen.getByText('English paragraph explicitly opting into auto');
      expect(p.getAttribute('dir')).toBe('auto');
    });

    it('applies dir="auto" to un-directed block elements outside any explicit direction container', () => {
      const markdown = `
# سرتیتر فارسی

این یک پاراگراف بدون جهت صریح است.

This is an un-directed English paragraph.
      `;
      render(<MarkdownViewer content={markdown} />);

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1.getAttribute('dir')).toBe('auto');

      const persianP = screen.getByText('این یک پاراگراف بدون جهت صریح است.');
      expect(persianP.getAttribute('dir')).toBe('auto');

      const englishP = screen.getByText('This is an un-directed English paragraph.');
      expect(englishP.getAttribute('dir')).toBe('auto');
    });

    it('preserves explicit dir on headings, blockquotes, and table cells', () => {
      const markdown = `
<h2 dir="rtl">English Heading RTL</h2>

<blockquote dir="ltr">
متن فارسی در نقل‌قول
</blockquote>

| Column 1 |
| :--- |
| <span dir="rtl">English in cell</span> |
      `;
      render(<MarkdownViewer content={markdown} />);

      const h2 = screen.getByRole('heading', { level: 2 });
      expect(h2.getAttribute('dir')).toBe('rtl');

      const bq = document.querySelector('blockquote');
      expect(bq?.getAttribute('dir')).toBe('ltr');

      const span = screen.getByText('English in cell');
      expect(span.getAttribute('dir')).toBe('rtl');
    });

    it('respects inline style direction: rtl', () => {
      const markdown = '<p style="direction: rtl;">English paragraph with inline style direction</p>';
      render(<MarkdownViewer content={markdown} />);

      const p = screen.getByText('English paragraph with inline style direction');
      expect(p.getAttribute('dir')).toBe('rtl');
    });
  });
});
