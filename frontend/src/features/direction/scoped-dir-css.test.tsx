import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownViewer } from '../rendering/MarkdownViewer';
import { parseCssDirectionRules } from './resolver';

describe('US-018.2: Scoped class-based direction CSS', () => {
  describe('parseCssDirectionRules parser', () => {
    it('extracts direction: ltr from single class selector', () => {
      const css = '.force-ltr { direction: ltr; }';
      const rules = parseCssDirectionRules(css);
      expect(rules.get('force-ltr')).toEqual({ direction: 'ltr', textAlign: undefined });
    });

    it('extracts direction: rtl and text-align: right', () => {
      const css = '.force-rtl { direction: rtl; text-align: right; }';
      const rules = parseCssDirectionRules(css);
      expect(rules.get('force-rtl')).toEqual({ direction: 'rtl', textAlign: 'right' });
    });

    it('handles !important on direction declarations', () => {
      const css = '.important-ltr { direction: ltr !important; }';
      const rules = parseCssDirectionRules(css);
      expect(rules.get('important-ltr')?.direction).toBe('ltr');
    });

    it('extracts multiple classes from comma-separated selector list', () => {
      const css = '.panel-rtl, .sidebar-rtl { direction: rtl; text-align: right; }';
      const rules = parseCssDirectionRules(css);
      expect(rules.get('panel-rtl')?.direction).toBe('rtl');
      expect(rules.get('sidebar-rtl')?.direction).toBe('rtl');
      expect(rules.get('panel-rtl')?.textAlign).toBe('right');
    });

    it('ignores container scope selector .markdown-content and extracts inner class', () => {
      const css = '.markdown-content .custom-box { direction: rtl; }';
      const rules = parseCssDirectionRules(css);
      expect(rules.has('markdown-content')).toBe(false);
      expect(rules.get('custom-box')?.direction).toBe('rtl');
    });

    it('handles empty or malformed CSS without throwing', () => {
      expect(parseCssDirectionRules('').size).toBe(0);
      expect(parseCssDirectionRules('   ').size).toBe(0);
      expect(parseCssDirectionRules('{ broken css @@@ ::: }').size).toBe(0);
    });
  });

  describe('MarkdownViewer rendering with scoped CSS direction classes', () => {
    it('applies LTR base direction to Persian paragraph styled with .force-ltr class (AC 2)', () => {
      const markdown = `
<style>
  .force-ltr { direction: ltr; text-align: left; }
</style>

<p class="force-ltr">متن فارسی که با کلاس سی‌اس‌اس به چپ‌به‌راست اجبار شده است</p>
      `;
      render(<MarkdownViewer content={markdown} />);

      const p = screen.getByText('متن فارسی که با کلاس سی‌اس‌اس به چپ‌به‌راست اجبار شده است');
      expect(p.getAttribute('dir')).toBe('ltr');
      expect(p.className).toContain('force-ltr');
    });

    it('applies RTL base direction to English paragraph styled with .force-rtl class', () => {
      const markdown = `
<style>
  .force-rtl { direction: rtl; text-align: right; }
</style>

<p class="force-rtl">English paragraph forced to right-to-left layout via CSS class</p>
      `;
      render(<MarkdownViewer content={markdown} />);

      const p = screen.getByText('English paragraph forced to right-to-left layout via CSS class');
      expect(p.getAttribute('dir')).toBe('rtl');
      expect(p.className).toContain('force-rtl');
    });

    it('resolves direction when element has multiple classes including direction class', () => {
      const markdown = `
<style>
  .bidi-ltr { direction: ltr; }
</style>

<p class="custom-card highlight bidi-ltr">متن فارسی در کارت چندکلاسه</p>
      `;
      render(<MarkdownViewer content={markdown} />);

      const p = screen.getByText('متن فارسی در کارت چندکلاسه');
      expect(p.getAttribute('dir')).toBe('ltr');
    });

    it('cascades container class direction to child paragraphs without dir="auto" override', () => {
      const markdown = `
<style>
  .rtl-container { direction: rtl; }
</style>

<div class="rtl-container">
  <p>English text inside CSS-directed RTL container</p>
</div>
      `;
      render(<MarkdownViewer content={markdown} />);

      const p = screen.getByText('English text inside CSS-directed RTL container');
      const container = p.parentElement;
      expect(container?.getAttribute('dir')).toBe('rtl');
      // Child paragraph inherits container direction and must not get dir="auto"
      expect(p.getAttribute('dir')).not.toBe('auto');
    });

    it('allows a child paragraph with .force-ltr to override parent container with .force-rtl', () => {
      const markdown = `
<style>
  .force-rtl { direction: rtl; }
  .force-ltr { direction: ltr; }
</style>

<div class="force-rtl">
  <p class="force-ltr">English text explicitly styled with LTR class inside RTL box</p>
</div>
      `;
      render(<MarkdownViewer content={markdown} />);

      const p = screen.getByText('English text explicitly styled with LTR class inside RTL box');
      expect(p.getAttribute('dir')).toBe('ltr');
    });

    it('enforces precedence: explicit HTML dir attribute overrides CSS direction class', () => {
      const markdown = `
<style>
  .force-ltr { direction: ltr; }
</style>

<p class="force-ltr" dir="rtl">English text with explicit HTML dir="rtl" beating CSS class</p>
      `;
      render(<MarkdownViewer content={markdown} />);

      const p = screen.getByText('English text with explicit HTML dir="rtl" beating CSS class');
      // HTML dir takes precedence over CSS class
      expect(p.getAttribute('dir')).toBe('rtl');
    });

    it('ensures injected style rules are scoped to .markdown-content (AC 5)', () => {
      const markdown = `
<style>
  .sidebar-test { direction: rtl; }
</style>

<p class="sidebar-test">Scoped text</p>
      `;
      const { container } = render(<MarkdownViewer content={markdown} />);

      const styleEl = container.querySelector('style');
      expect(styleEl).not.toBeNull();
      // Scoped CSS sanitizer must have prefixed selector with .markdown-content
      expect(styleEl?.innerHTML).toContain('.markdown-content .sidebar-test');
      expect(styleEl?.innerHTML).not.toMatch(/^\.sidebar-test\b/m);
    });
  });
});
