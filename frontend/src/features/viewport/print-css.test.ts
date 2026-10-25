import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Print Media CSS Rules & Page Styling (US-024.1, FR-NAV-006)', () => {
  const printCssPath = path.resolve(__dirname, '../../styles/print.css');
  const printCss = fs.readFileSync(printCssPath, 'utf-8');

  it('contains @media print block and @page configuration', () => {
    expect(printCss).toContain('@media print');
    expect(printCss).toContain('@page');
    expect(printCss).toMatch(/margin:\s*15mm\s+20mm\s+15mm\s+20mm/);
    expect(printCss).toMatch(/size:\s*auto/);
  });

  describe('Application Chrome Hiding', () => {
    const requiredHiddenSelectors = [
      '.app-chrome',
      '.app-header',
      '.header-actions',
      '.tab-bar',
      '.tab-bar-container',
      '.app-status-bar',
      '.document-header-bar',
      '.doc-zoom-controls',
      '.doc-theme-toggle-btn',
      '.doc-search-toggle-btn',
      '.doc-toc-toggle-btn',
      '.search-bar',
      '.search-bar-floating',
      '.toc-sidebar',
      '.toc-backdrop',
      '.copy-code-btn',
      '.dropzone-overlay',
      '.toast',
      '[data-app-chrome]',
    ];

    for (const selector of requiredHiddenSelectors) {
      it(`hides ${selector} in @media print with display: none !important`, () => {
        expect(printCss).toContain(selector);
      });
    }

    it('enforces display: none !important and visibility: hidden on chrome selectors', () => {
      expect(printCss).toMatch(/display:\s*none\s*!important/);
      expect(printCss).toMatch(/visibility:\s*hidden\s*!important/);
    });
  });

  describe('Theme and Background Reset to Pure White', () => {
    it('forces pure white background and dark text on document containers', () => {
      expect(printCss).toContain('background: #ffffff !important');
      expect(printCss).toContain('color: #111827 !important');
      expect(printCss).toContain('.markdown-content');
      expect(printCss).toContain('.markdown-viewport');
      expect(printCss).toContain('.app-shell-root');
    });

    it('resets CSS variables on [data-theme="dark"] to print-safe light tokens', () => {
      expect(printCss).toContain('[data-theme="dark"]');
      expect(printCss).toContain('--bg-primary: #ffffff !important');
      expect(printCss).toContain('--text-primary: #111827 !important');
    });

    it('eliminates box-shadow and resets borders and overflow', () => {
      expect(printCss).toContain('box-shadow: none !important');
      expect(printCss).toContain('overflow: visible !important');
    });
  });

  describe('Page Break Rules', () => {
    it('prevents page breaks after headings to avoid orphaned headers', () => {
      expect(printCss).toMatch(/page-break-after:\s*avoid\s*!important/);
      expect(printCss).toMatch(/break-after:\s*avoid\s*!important/);
    });

    it('prevents page breaks inside pre code blocks, tables, images, and diagrams', () => {
      expect(printCss).toMatch(/page-break-inside:\s*avoid\s*!important/);
      expect(printCss).toMatch(/break-inside:\s*avoid\s*!important/);
      expect(printCss).toContain('pre');
      expect(printCss).toContain('table');
      expect(printCss).toContain('.mermaid-container');
      expect(printCss).toContain('.katex-display');
    });
  });

  describe('Document Typography, Table, and Code Formatting', () => {
    it('formats tables cleanly with borders and full width', () => {
      expect(printCss).toContain('border-collapse: collapse !important');
      expect(printCss).toContain('border: 1px solid #d1d5db !important');
    });

    it('formats code blocks with clear background and wrapping', () => {
      expect(printCss).toContain('background-color: #f9fafb !important');
      expect(printCss).toContain('white-space: pre-wrap !important');
      expect(printCss).toContain('word-break: break-word !important');
    });

    it('underlines links and renders readable link text', () => {
      expect(printCss).toContain('text-decoration: underline !important');
    });

    it('hides scrollbars in print output', () => {
      expect(printCss).toContain('::-webkit-scrollbar');
      expect(printCss).toContain('display: none !important');
    });
  });
});
