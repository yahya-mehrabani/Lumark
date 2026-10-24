import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { MarkdownViewer } from './MarkdownViewer';
import { STRICT_KATEX_OPTIONS, renderMath, isMathValid } from './katex-adapter';

describe('KaTeX Math Rendering Pipeline & Golden Fixture (US-014.4)', () => {
  const fixturePath = path.resolve(__dirname, '../../../../fixtures/golden/math-katex.md');
  const mathFixtureContent = fs.readFileSync(fixturePath, 'utf-8');

  describe('1. Golden math-katex.md Fixture End-to-End Rendering', () => {
    it('renders all mathematical constructs from golden fixture without crashing', () => {
      const { container } = render(
        <MarkdownViewer
          document={{
            filename: 'math-katex.md',
            content: mathFixtureContent,
          }}
        />
      );

      // Verify overall rendered container
      expect(container).toBeInTheDocument();
      const contentEl = screen.getByTestId('markdown-content');
      expect(contentEl).toBeInTheDocument();

      // Verify headings inside markdown content
      expect(within(contentEl).getByRole('heading', { level: 1 })).toHaveTextContent('KaTeX Math Golden Fixture Suite');
      expect(within(contentEl).getByRole('heading', { level: 2, name: /1\. Inline Mathematical Formulas/i })).toBeInTheDocument();
      expect(within(contentEl).getByRole('heading', { level: 2, name: /2\. Display Mathematical Equations/i })).toBeInTheDocument();
      expect(within(contentEl).getByRole('heading', { level: 2, name: /3\. Currency Coexistence in Prose/i })).toBeInTheDocument();
      expect(within(contentEl).getByRole('heading', { level: 2, name: /4\. Wide Display Equation for Horizontal Scrolling/i })).toBeInTheDocument();
      expect(within(contentEl).getByRole('heading', { level: 2, name: /5\. Graceful Error Handling and Partial Rendering/i })).toBeInTheDocument();
      expect(within(contentEl).getByRole('heading', { level: 2, name: /6\. Persian \/ Multilingual Context with Math/i })).toBeInTheDocument();

      // Verify inline and display KaTeX elements
      const katexElements = container.querySelectorAll('.katex');
      expect(katexElements.length).toBeGreaterThanOrEqual(8);

      const displayElements = container.querySelectorAll('.katex-display');
      expect(displayElements.length).toBeGreaterThanOrEqual(4);
    });

    it('retains MathML accessibility markup with TeX annotations per PRD FR-RENDER-006', () => {
      const { container } = render(
        <MarkdownViewer
          document={{
            filename: 'math-katex.md',
            content: mathFixtureContent,
          }}
        />
      );

      // MathML container
      const mathmlElements = container.querySelectorAll('.katex-mathml');
      expect(mathmlElements.length).toBeGreaterThan(0);

      // MathML annotation tags containing source TeX
      const annotations = container.querySelectorAll('annotation[encoding="application/x-tex"]');
      expect(annotations.length).toBeGreaterThan(0);

      // Find specific formulas in annotations
      const annotationTexts = Array.from(annotations).map((el) => el.textContent?.trim());
      expect(annotationTexts).toContain('E = mc^2');
      expect(annotationTexts).toContain('a^2 + b^2 = c^2');
      expect(annotationTexts).toContain('\\alpha + \\beta = \\gamma');
    });

    it('preserves currency notation without false math conversion ($10 and $20, $100 and $200)', () => {
      const { container } = render(
        <MarkdownViewer
          document={{
            filename: 'math-katex.md',
            content: mathFixtureContent,
          }}
        />
      );

      // Verify currency text is present as plain text, not rendered as math
      const text = container.textContent || '';
      expect(text).toContain('The base package costs $10 and $20 for the upgrade.');
      expect(text).toContain('Enterprise tier pricing starts at $100 and $200 per seat.');
      expect(text).toContain('Minor fees are $5.00 and $10.00 respectively.');
      expect(text).toContain('with currency amounts of $50 per license.');

      // Check that $10 and $20 are not inside .katex
      const katexElements = container.querySelectorAll('.katex');
      for (const el of Array.from(katexElements)) {
        expect(el.textContent).not.toContain('$10 and $20');
        expect(el.textContent).not.toContain('$100 and $200');
        expect(el.textContent).not.toContain('$5.00 and $10.00');
      }
    });

    it('renders scrollable wide display equations inside .katex-display', () => {
      const { container } = render(
        <MarkdownViewer
          document={{
            filename: 'math-katex.md',
            content: mathFixtureContent,
          }}
        />
      );

      const displayContainers = container.querySelectorAll('.katex-display');
      expect(displayContainers.length).toBeGreaterThan(0);

      // Find the wide polynomial display block
      let foundWideEquation = false;
      for (const el of Array.from(displayContainers)) {
        if (el.textContent?.includes('P(x)') && el.textContent?.includes('binom')) {
          foundWideEquation = true;
          break;
        }
      }
      expect(foundWideEquation).toBe(true);
    });

    it('isolates malformed formulas with safe .katex-error badges while preserving adjacent content', () => {
      const { container } = render(
        <MarkdownViewer
          document={{
            filename: 'math-katex.md',
            content: mathFixtureContent,
          }}
        />
      );

      // Verify the malformed formula rendered as error badge
      const errorBadges = container.querySelectorAll('.katex-error');
      expect(errorBadges.length).toBeGreaterThanOrEqual(1);
      const malformedBadge = Array.from(errorBadges).find((el) => el.textContent?.includes('\\frac{1}{'));
      expect(malformedBadge).toBeDefined();

      // Verify valid adjacent formula in the same section rendered cleanly
      const validFormulas = Array.from(container.querySelectorAll('.katex'));
      const hasAdjacentSqrt = validFormulas.some((el) => el.textContent?.includes('x2+1') || el.textContent?.includes('x^2 + 1'));
      expect(hasAdjacentSqrt).toBe(true);

      // Verify subsequent section rendered cleanly (FR-RENDER-009)
      const contentEl = screen.getByTestId('markdown-content');
      expect(within(contentEl).getByRole('heading', { level: 2, name: /6\. Persian \/ Multilingual Context with Math/i })).toBeInTheDocument();
    });

    it('renders math formulas correctly within Persian RTL prose', () => {
      const { container } = render(
        <MarkdownViewer
          document={{
            filename: 'math-katex.md',
            content: mathFixtureContent,
          }}
        />
      );

      const persianParagraph = Array.from(container.querySelectorAll('li, p')).find((el) =>
        el.textContent?.includes('فرمول هم‌ارزی جرم و انرژی')
      );
      expect(persianParagraph).toBeDefined();
      expect(persianParagraph?.querySelector('.katex')).toBeInTheDocument();
    });
  });

  describe('2. KaTeX Configuration & Strict Security Controls', () => {
    it('enforces strict configuration defaults per PRD FR-RENDER-006', () => {
      expect(STRICT_KATEX_OPTIONS.output).toBe('htmlAndMathml');
      expect(STRICT_KATEX_OPTIONS.trust).toBe(false);
      expect(STRICT_KATEX_OPTIONS.throwOnError).toBe(false);
      expect(STRICT_KATEX_OPTIONS.strict).toBe(false);
      expect(STRICT_KATEX_OPTIONS.errorColor).toBe('#cc0000');
    });

    it('validates syntax correctly with isMathValid', () => {
      expect(isMathValid('x^2 + y^2 = r^2')).toBe(true);
      expect(isMathValid('\\frac{a}{b}')).toBe(true);
      expect(isMathValid('\\int_0^1 f(x) dx')).toBe(true);
      expect(isMathValid('\\frac{a}{')).toBe(false);
      expect(isMathValid('\\undefinedMacro{foo}')).toBe(false);
    });

    it('generates HTML and MathML through renderMath adapter function', () => {
      const result = renderMath('E = mc^2', { displayMode: false });
      expect(result).toContain('class="katex"');
      expect(result).toContain('class="katex-mathml"');
      expect(result).toContain('<annotation encoding="application/x-tex">E = mc^2</annotation>');
    });
  });

  describe('3. CSS & Offline Assets Verification', () => {
    it('verifies that katex.css defines horizontal overflow scrolling on .katex-display', () => {
      const cssPath = path.resolve(__dirname, '../../styles/katex.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      expect(cssContent).toContain('.katex-display');
      expect(cssContent).toMatch(/overflow-x:\s*auto;/);
      expect(cssContent).toMatch(/padding:\s*0\.5rem\s*0;/);
    });

    it('verifies that markdown.css styles .katex-error warning badge', () => {
      const cssPath = path.resolve(__dirname, './markdown.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      expect(cssContent).toContain('.markdown-content .katex-error');
      expect(cssContent).toContain('content: "⚠️ Math Error: "');
    });

    it('verifies that offline font assets are locally bundled and contain zero remote URLs', () => {
      const cssPath = path.resolve(__dirname, '../../styles/katex.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      // Verify font URLs in CSS point exclusively to local relative woff2 assets
      const fontUrlMatches = Array.from(cssContent.matchAll(/url\(([^)]+)\)/g));
      expect(fontUrlMatches.length).toBeGreaterThan(0);

      for (const match of fontUrlMatches) {
        const url = match[1];
        expect(url).not.toMatch(/^["']?https?:\/\//i);
        expect(url).not.toMatch(/^["']?\/\//i);
        expect(url).toContain('../assets/fonts/katex/');
      }

      // Local font directory
      const fontsDir = path.resolve(__dirname, '../../assets/fonts/katex');
      const fontFiles = fs.readdirSync(fontsDir);
      expect(fontFiles.length).toBe(20);
      for (const font of fontFiles) {
        expect(font.endsWith('.woff2')).toBe(true);
      }
    });
  });
});
