import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fs from 'fs';
import * as path from 'path';
import { MarkdownViewer } from '../MarkdownViewer';

describe('HTML & CSS Sanitization and Scope Isolation Engine (US-015.4)', () => {
  beforeEach(() => {
    // Reset any global window attack flags before each test
    delete (window as any).__malicious_executed;
    delete (window as any).__img_onerror_fired;
  });

  describe('Golden Fixture End-to-End Validation (fixtures/golden/html-css-sanitization.md)', () => {
    const fixturePath = path.resolve(
      __dirname,
      '../../../../../fixtures/golden/html-css-sanitization.md'
    );
    const fixtureContent = fs.readFileSync(fixturePath, 'utf8');

    it('renders the golden fixture without errors and with safe HTML intact (AC 1)', () => {
      const { container } = render(
        <MarkdownViewer
          document={{
            filename: 'html-css-sanitization.md',
            filePath: fixturePath,
            content: fixtureContent,
          }}
        />
      );

      // Verify header is present and chrome is intact
      expect(screen.getByTestId('document-header')).toBeInTheDocument();

      // AC 1: Safe HTML with dir, class, and style intact
      const rtlDiv = container.querySelector('div[dir="rtl"]');
      expect(rtlDiv).toBeInTheDocument();
      expect(rtlDiv).toHaveClass('highlight');

      const persianSpan = screen.getByText('متن فارسی با جهت راست به چپ و رنگ قرمز');
      expect(persianSpan).toBeInTheDocument();
      expect(persianSpan.style.color).toBe('red');

      // Verify table and details elements
      expect(screen.getByText('HTML Sanitization')).toBeInTheDocument();
      expect(screen.getByText('CSS Scoping')).toBeInTheDocument();
      expect(screen.getByText('Sanitization Rules')).toBeInTheDocument();
    });

    it('completely strips <script> tags and prevents script execution (AC 2)', () => {
      const { container } = render(<MarkdownViewer content={fixtureContent} />);

      // Verify no script tags exist in the entire container
      const scripts = container.querySelectorAll('script');
      expect(scripts.length).toBe(0);

      // Verify malicious code never executed
      expect((window as any).__malicious_executed).toBeUndefined();
      expect(screen.queryByText(/XSS payload/)).toBeNull();
    });

    it('strips inline event handlers like onerror from <img> tags (AC 3)', () => {
      const { container } = render(
        <MarkdownViewer
          document={{
            filename: 'html-css-sanitization.md',
            filePath: fixturePath,
            dir: path.dirname(fixturePath),
            content: fixtureContent,
          }}
        />
      );

      const img = container.querySelector('img[alt="Safe Image"]') as HTMLImageElement;
      expect(img).toBeInTheDocument();

      // Verify onerror attribute was stripped
      expect(img.getAttribute('onerror')).toBeNull();
      expect((window as any).__img_onerror_fired).toBeUndefined();
      expect(img.src).toContain('assets/safe.png');
    });

    it('scopes author <style> blocks to .markdown-content (AC 4)', () => {
      const { container } = render(<MarkdownViewer content={fixtureContent} />);

      const styleElem = container.querySelector('style');
      expect(styleElem).toBeInTheDocument();
      const styleContent = styleElem?.textContent || styleElem?.innerHTML || '';

      // Verify .sidebar is scoped
      expect(styleContent).toContain('.markdown-content .sidebar');
      expect(styleContent).not.toMatch(/^\s*\.sidebar\b/m);

      // Verify body selector is rewritten to container
      expect(styleContent).toContain('.markdown-content {');
      expect(styleContent).not.toMatch(/\bbody\s*\{/);
    });

    it('converts position: fixed in <style> to position: absolute to prevent viewport overlays (AC 5)', () => {
      const { container } = render(<MarkdownViewer content={fixtureContent} />);

      const styleElem = container.querySelector('style');
      const styleContent = styleElem?.textContent || styleElem?.innerHTML || '';

      expect(styleContent).toContain('position: absolute');
      expect(styleContent).not.toContain('position: fixed');
      expect(styleContent).toContain('.markdown-content .fullscreen-overlay');
    });

    it('completely strips @import at-rules from author stylesheets (AC 6)', () => {
      const { container } = render(<MarkdownViewer content={fixtureContent} />);

      const styleElem = container.querySelector('style');
      const styleContent = styleElem?.textContent || styleElem?.innerHTML || '';

      expect(styleContent).not.toContain('@import');
      expect(styleContent).not.toContain('external-leak.css');
    });

    it('strips active executables (iframe, form, button, input) from raw HTML', () => {
      const { container } = render(<MarkdownViewer content={fixtureContent} />);

      expect(container.querySelectorAll('iframe').length).toBe(0);
      expect(container.querySelectorAll('form').length).toBe(0);
      expect(container.querySelectorAll('button').length).toBe(0);
      expect(container.querySelectorAll('input').length).toBe(0);

      expect(screen.queryByText('Hidden malicious frame')).toBeNull();
      expect(screen.queryByText('Submit Creds')).toBeNull();
    });

    it('strips javascript: protocol from raw <a> tags while preserving safe links', () => {
      const { container } = render(<MarkdownViewer content={fixtureContent} />);

      const badLink = container.querySelector('a.bad-link');
      expect(badLink).toBeInTheDocument();
      expect(badLink?.getAttribute('href')).toBe('#');

      const goodLink = container.querySelector('a.good-link');
      expect(goodLink).toBeInTheDocument();
      expect(goodLink?.getAttribute('href')).toBe('https://example.com');
    });

    it('gracefully renders malformed HTML/CSS without blanking document (AC 7 & AUD-010)', () => {
      render(<MarkdownViewer content={fixtureContent} />);

      // Subsequent content must render cleanly
      expect(
        screen.getByText('Document rendering must continue smoothly despite malformed markup.')
      ).toBeInTheDocument();
    });
  });

  describe('Adversarial & Edge-Case Sanitization Tests', () => {
    it('neutralizes position: fixed in inline style attributes', () => {
      const md = '<div style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;">Overlay Box</div>';
      render(<MarkdownViewer content={md} />);

      const div = screen.getByText('Overlay Box');
      expect(div.style.position).toBe('absolute');
    });

    it('clamps excessive z-index in inline styles to max 10', () => {
      const md = '<span style="z-index: 999999; color: purple;">High Z-Index</span>';
      render(<MarkdownViewer content={md} />);

      const span = screen.getByText('High Z-Index');
      expect(span.style.zIndex).toBe('10');
      expect(span.style.color).toBe('purple');
    });

    it('strips remote url() declarations from inline background styles', () => {
      const md = '<div style="background-image: url(\'http://attacker.com/leak.png\'); color: green;">No Leak</div>';
      render(<MarkdownViewer content={md} />);

      const div = screen.getByText('No Leak');
      expect(div.style.backgroundImage).toBe('');
      expect(div.style.color).toBe('green');
    });

    it('strips unknown, executable, and proprietary CSS properties', () => {
      const md = `
<style>
  .evil-decl {
    -webkit-box-reflect: below;
    behavior: url(evil.htc);
    -moz-binding: url(evil.xml);
    width: expression(alert(1));
    color: teal;
  }
</style>
<div class="evil-decl">Filtered Properties</div>
`;
      const { container } = render(<MarkdownViewer content={md} />);
      const styleElem = container.querySelector('style');
      const styleContent = styleElem?.textContent || styleElem?.innerHTML || '';

      expect(styleContent).not.toContain('-webkit-box-reflect');
      expect(styleContent).not.toContain('behavior');
      expect(styleContent).not.toContain('-moz-binding');
      expect(styleContent).not.toContain('expression');
      expect(styleContent).toContain('.markdown-content .evil-decl');
      expect(styleContent).toContain('color: teal');
    });

    it('preserves KaTeX math formulas when combined with safe HTML and CSS', () => {
      const md = `
<div class="math-card" style="border: 1px solid black; padding: 10px;">
  Mathematical Formulas Card
</div>

Here is an inline formula: $E = mc^2$ and a display formula:

$$\\int_{0}^{\\infty} e^{-x} dx = 1$$
`;
      const { container } = render(<MarkdownViewer content={md} />);

      // Verify KaTeX math rendered cleanly alongside styled div
      expect(container.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(2);
      expect(container.querySelectorAll('math').length).toBeGreaterThanOrEqual(2);

      const mathCard = container.querySelector('.math-card') as HTMLElement;
      expect(mathCard).toBeInTheDocument();
      expect(mathCard.style.padding).toBe('10px');
    });

    it('isolates tab navigation and window controls from document styles', () => {
      const md = `
<style>
  .tab-bar, .app-shell, .window-controls {
    display: none !important;
  }
</style>
`;
      const { container } = render(<MarkdownViewer content={md} />);
      const styleElem = container.querySelector('style');
      const styleContent = styleElem?.textContent || styleElem?.innerHTML || '';

      expect(styleContent).toContain('.markdown-content .tab-bar');
      expect(styleContent).toContain('.markdown-content .app-shell');
      expect(styleContent).toContain('.markdown-content .window-controls');
      expect(styleContent).not.toMatch(/^\s*\.tab-bar/m);
    });
  });
});
