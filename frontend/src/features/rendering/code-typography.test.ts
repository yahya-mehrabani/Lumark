import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

/**
 * Code block typography contracts (Persian readability inside fenced code blocks).
 * Root cause: JetBrains Mono / generic monospace stacks contain no Arabic-script
 * glyphs, so Persian text inside <pre>/<code> fell back to an unreadable system
 * font. Vazirmatn must sit in every code font stack, and line-height must leave
 * room for Persian ascenders/descenders (1.6).
 */
describe('Code Block Persian Typography Contracts', () => {
  const markdownCssPath = path.resolve(__dirname, './markdown.css');
  const themeCssPath = path.resolve(__dirname, '../viewport/theme.css');
  const markdownCss = fs.readFileSync(markdownCssPath, 'utf-8');
  const themeCss = fs.readFileSync(themeCssPath, 'utf-8');

  it('adds Vazirmatn fallback to the --font-mono design token', () => {
    expect(themeCss).toContain("'JetBrains Mono', 'Vazirmatn', monospace");
  });

  const extractRule = (css: string, selector: string): string => {
    const index = css.indexOf(selector);
    if (index === -1) return '';
    const openBrace = css.indexOf('{', index);
    let depth = 0;
    let end = openBrace;
    for (let i = openBrace; i < css.length; i++) {
      if (css[i] === '{') depth++;
      if (css[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    return css.slice(index, end);
  };

  it('ensures pre, code, and .shiki have font-mono with Vazirmatn and !important', () => {
    const rule = extractRule(markdownCss, 'pre,\ncode,\n.shiki {');
    expect(rule).toContain("font-family: var(--font-mono), 'Vazirmatn', monospace !important;");
  });

  it('fenced <pre> uses font-mono with Vazirmatn fallback and 1.6 line-height', () => {
    const rule = extractRule(markdownCss, '.code-scroll-container pre,\n.markdown-content pre {');
    expect(rule).toContain("font-family: var(--font-mono), 'Vazirmatn', monospace !important;");
    expect(rule).toContain('line-height: 1.6;');
  });

  it('fenced <pre><code> uses font-mono with Vazirmatn fallback', () => {
    const rule = extractRule(
      markdownCss,
      '.code-scroll-container code,\n.markdown-content pre code {'
    );
    expect(rule).toContain("font-family: var(--font-mono), 'Vazirmatn', monospace !important;");
  });

  it('inline code uses font-mono with Vazirmatn fallback', () => {
    const rule = extractRule(markdownCss, '.markdown-content code:not(pre code) {');
    expect(rule).toContain("font-family: var(--font-mono), 'Vazirmatn', monospace !important;");
  });

  it('line-number gutter matches fenced block line-height (1.6) for row alignment', () => {
    const rule = extractRule(markdownCss, '.code-line-numbers {');
    expect(rule).toContain('line-height: 1.6;');
    expect(rule).toContain("font-family: var(--font-mono), 'Vazirmatn', monospace !important;");
  });
});
