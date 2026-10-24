import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  renderMath,
  isMathValid,
  renderMathToElement,
  STRICT_KATEX_OPTIONS,
} from './katex-adapter';

describe('KaTeX Adapter & Offline Bundling (US-014.1)', () => {
  it('has strict default configuration conforming to PRD FR-RENDER-006', () => {
    expect(STRICT_KATEX_OPTIONS.throwOnError).toBe(false);
    expect(STRICT_KATEX_OPTIONS.output).toBe('htmlAndMathml');
    expect(STRICT_KATEX_OPTIONS.trust).toBe(false);
    expect(STRICT_KATEX_OPTIONS.strict).toBe(false);
  });

  it('renders inline math into HTML with MathML accessibility layer', () => {
    const html = renderMath('a^2 + b^2 = c^2');
    expect(html).toContain('class="katex"');
    expect(html).toContain('<math');
    expect(html).toContain('c</mi><mn>2</mn>');
    expect(html).toContain('class="katex-html"');
  });

  it('renders display math when displayMode is true', () => {
    const html = renderMath('\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}', {
      displayMode: true,
    });
    expect(html).toContain('class="katex-display"');
    expect(html).toContain('<math');
    expect(html).toContain('display="block"');
  });

  it('handles empty or whitespace-only math without crashing', () => {
    expect(renderMath('')).toBe('');
    expect(renderMath('   ')).toBe('');
    expect(isMathValid('')).toBe(true);
  });

  it('provides safe inline error fallback on malformed LaTeX when throwOnError is false', () => {
    // Malformed: unclosed group/fraction
    const invalidFormula = '\\frac{1}{';
    expect(() => renderMath(invalidFormula, { throwOnError: false })).not.toThrow();

    const output = renderMath(invalidFormula, { throwOnError: false });
    expect(output).toContain('katex-error');
    expect(output).toContain('\\frac{1}{');
  });

  it('throws error on malformed LaTeX when throwOnError is explicitly true', () => {
    const invalidFormula = '\\frac{1}{';
    expect(() => renderMath(invalidFormula, { throwOnError: true })).toThrow();
  });

  it('validates syntax correctly with isMathValid', () => {
    expect(isMathValid('E = mc^2')).toBe(true);
    expect(isMathValid('\\sum_{i=1}^n i = \\frac{n(n+1)}{2}')).toBe(true);
    expect(isMathValid('\\frac{1}{')).toBe(false);
    expect(isMathValid('\\unknownmacro{foo}')).toBe(false);
  });

  it('renders directly into a DOM element with renderMathToElement', () => {
    const el = document.createElement('div');
    renderMathToElement('x + y = z', el);
    expect(el.querySelector('.katex')).not.toBeNull();
    expect(el.querySelector('math')).not.toBeNull();

    // Error handling in element
    renderMathToElement('\\frac{1}{', el, { throwOnError: false });
    expect(el.querySelector('.katex-error')).not.toBeNull();
  });

  it('verifies all 20 KaTeX WOFF2 fonts are locally bundled in assets/fonts/katex', () => {
    const fontsDir = path.resolve(__dirname, '../../assets/fonts/katex');
    expect(fs.existsSync(fontsDir)).toBe(true);

    const fontFiles = fs.readdirSync(fontsDir);
    const woff2Files = fontFiles.filter((f) => f.endsWith('.woff2'));

    expect(woff2Files.length).toBe(20);

    const expectedKeyFonts = [
      'KaTeX_Main-Regular.woff2',
      'KaTeX_Main-Bold.woff2',
      'KaTeX_Main-Italic.woff2',
      'KaTeX_Math-Italic.woff2',
      'KaTeX_AMS-Regular.woff2',
      'KaTeX_Size1-Regular.woff2',
      'KaTeX_Size4-Regular.woff2',
    ];

    for (const font of expectedKeyFonts) {
      expect(woff2Files).toContain(font);
    }
  });

  it('verifies styles/katex.css references local relative fonts with zero external network URLs', () => {
    const cssPath = path.resolve(__dirname, '../../styles/katex.css');
    expect(fs.existsSync(cssPath)).toBe(true);

    const cssContent = fs.readFileSync(cssPath, 'utf8');

    // Must reference local relative font paths
    expect(cssContent).toContain('url("../assets/fonts/katex/KaTeX_Main-Regular.woff2")');
    expect(cssContent).toContain('format("woff2")');

    // Must NOT contain any remote external CDN/HTTP font URLs
    const fontUrlMatches = Array.from(cssContent.matchAll(/url\(([^)]+)\)/g));
    expect(fontUrlMatches.length).toBeGreaterThan(0);

    for (const match of fontUrlMatches) {
      const url = match[1];
      expect(url).not.toMatch(/^["']?https?:\/\//i);
      expect(url).not.toMatch(/^["']?\/\//i);
      expect(url).toContain('../assets/fonts/katex/');
    }
  });
});
