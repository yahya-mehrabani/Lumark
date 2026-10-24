import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as fs from 'fs';
import * as path from 'path';
import { MarkdownViewer } from '../MarkdownViewer';
import { MermaidBlock } from '../components/MermaidBlock';

describe('Adversarial Security Test Corpus & Fault Isolation Runner (US-016.2)', () => {
  const fixturesDir = path.resolve(__dirname, '../../../../../fixtures/security');

  beforeEach(() => {
    // Reset any global window attack flags before each test
    delete (window as any).__malicious_executed;
    delete (window as any).__xss_payload_fired;
    delete (window as any).__svg_script_executed;
    delete (window as any).__cdata_script;
    delete (window as any).__img_onerror_fired;
    delete (window as any).__img_onload_fired;
    delete (window as any).__onmouseover_fired;
    delete (window as any).__onclick_fired;
    delete (window as any).__onfocus_fired;
    delete (window as any).__svg_onload_fired;
  });

  describe('XSS & Script Injection Corpus (xss-corpus / xss-scripts.md)', () => {
    const fixturePath = path.join(fixturesDir, 'xss-scripts.md');
    const fixtureContent = fs.readFileSync(fixturePath, 'utf8');

    it('loads xss-scripts.md and renders without throwing an exception', () => {
      expect(() => {
        render(<MarkdownViewer content={fixtureContent} />);
      }).not.toThrow();
    });

    it('completely strips all <script> tags from rendered DOM (AC 1)', () => {
      const { container } = render(<MarkdownViewer content={fixtureContent} />);
      const scripts = container.querySelectorAll('script');
      expect(scripts.length).toBe(0);
      expect((window as any).__malicious_executed).toBeUndefined();
      expect((window as any).__svg_script_executed).toBeUndefined();
    });

    it('strips forbidden executable elements: <iframe>, <object>, <embed>, <form>, <base>, <meta>', () => {
      const { container } = render(<MarkdownViewer content={fixtureContent} />);

      expect(container.querySelectorAll('iframe').length).toBe(0);
      expect(container.querySelectorAll('object').length).toBe(0);
      expect(container.querySelectorAll('embed').length).toBe(0);
      expect(container.querySelectorAll('form').length).toBe(0);
      expect(container.querySelectorAll('base').length).toBe(0);
      expect(container.querySelectorAll('meta').length).toBe(0);
    });

    it('preserves safe surrounding prose and formatting intact', () => {
      render(<MarkdownViewer content={fixtureContent} />);
      expect(screen.getByText(/Safe surrounding text that/)).toBeInTheDocument();
      expect(screen.getByText('must remain visible')).toBeInTheDocument();
    });
  });

  describe('Event Handlers Corpus (event-handlers.md)', () => {
    const fixturePath = path.join(fixturesDir, 'event-handlers.md');
    const fixtureContent = fs.readFileSync(fixturePath, 'utf8');

    it('strips all inline event handlers across all rendered elements (AC 1)', () => {
      const { container } = render(<MarkdownViewer content={fixtureContent} />);

      // Query all elements and assert no attribute starts with 'on'
      const allElements = container.querySelectorAll('*');
      for (const el of Array.from(allElements)) {
        for (const attr of Array.from(el.attributes)) {
          expect(attr.name.toLowerCase()).not.toMatch(/^on/);
        }
      }

      // Assert global attack flags were never modified
      expect((window as any).__malicious_executed).toBeUndefined();
      expect((window as any).__img_onerror_fired).toBeUndefined();
      expect((window as any).__img_onload_fired).toBeUndefined();
      expect((window as any).__onclick_fired).toBeUndefined();
      expect((window as any).__onmouseover_fired).toBeUndefined();
    });

    it('preserves safe paragraphs and markup while discarding event handlers', () => {
      render(<MarkdownViewer content={fixtureContent} />);
      expect(screen.getByText(/This paragraph contains safe prose/)).toBeInTheDocument();
      expect(screen.getByText('emphasized text')).toBeInTheDocument();
    });
  });

  describe('Protocol Smuggling Corpus (protocols.md)', () => {
    const fixturePath = path.join(fixturesDir, 'protocols.md');
    const fixtureContent = fs.readFileSync(fixturePath, 'utf8');

    it('neutralizes or blocks dangerous protocol links (AC 3)', () => {
      const { container } = render(<MarkdownViewer content={fixtureContent} />);

      // Links with javascript:, data:text/html, vbscript:, file:, etc.
      const links = container.querySelectorAll('a');
      for (const link of Array.from(links)) {
        const href = link.getAttribute('href') || '';
        expect(href).not.toMatch(/^javascript:/i);
        expect(href).not.toMatch(/^vbscript:/i);
        expect(href).not.toMatch(/^data:text\/html/i);
      }
    });

    it('prevents code execution or unhandled navigation when clicking blocked links', async () => {
      const openExternalMock = vi.fn();
      render(
        <MarkdownViewer
          content={fixtureContent}
          onOpenExternalUrl={openExternalMock}
        />
      );

      const jsLink = screen.getByText('Click for JavaScript Payload');
      fireEvent.click(jsLink);

      // Verify no malicious script executed and external launcher was not invoked
      expect((window as any).__malicious_executed).toBeUndefined();
      expect(openExternalMock).not.toHaveBeenCalledWith(expect.stringMatching(/javascript:/i));
    });

    it('permits safe HTTPS, HTTP, and in-document anchor links', () => {
      render(<MarkdownViewer content={fixtureContent} />);

      const httpsLink = screen.getByText('Safe HTTPS Link');
      expect(httpsLink).toHaveAttribute('href', 'https://example.com/safe-page');

      const anchorLink = screen.getByText('Safe In-Document Anchor');
      expect(anchorLink).toHaveAttribute('href', '#safe-section');
    });
  });

  describe('CSS Escape & Overlay Hijacking Corpus (css-overlays.md)', () => {
    const fixturePath = path.join(fixturesDir, 'css-overlays.md');
    const fixtureContent = fs.readFileSync(fixturePath, 'utf8');

    it('scopes all styles to .markdown-content and neutralizes fixed positioning (AC 2)', () => {
      const { container } = render(
        <div className="app-shell">
          <div className="tab-bar">Tab Bar Chrome</div>
          <MarkdownViewer content={fixtureContent} />
        </div>
      );

      // Verify style tags exist and are scoped
      const styleTags = container.querySelectorAll('style');
      expect(styleTags.length).toBeGreaterThan(0);

      for (const style of Array.from(styleTags)) {
        const css = style.innerHTML;
        // Verify no unscoped body, html, or :root rules
        expect(css).not.toMatch(/\bbody\s*\{/);
        expect(css).not.toMatch(/\bhtml\s*\{/);
        expect(css).not.toMatch(/\b:root\s*\{/);
        // Verify @import is stripped
        expect(css).not.toMatch(/@import/);
        // Verify position: fixed was converted to absolute
        expect(css).not.toMatch(/position:\s*fixed/);
        // Verify external url() was stripped
        expect(css).not.toMatch(/url\(/i);
      }

      // App chrome remains intact and visible
      expect(screen.getByText('Tab Bar Chrome')).toBeInTheDocument();
    });

    it('preserves legitimate scoped CSS callouts', () => {
      const { container } = render(<MarkdownViewer content={fixtureContent} />);
      const safeCallout = container.querySelector('.safe-callout');
      expect(safeCallout).toBeInTheDocument();
      expect(screen.getByText(/This styled container is safe/)).toBeInTheDocument();
    });
  });

  describe('Mermaid Script Injection Corpus (mermaid-injection.md)', () => {
    const fixturePath = path.join(fixturesDir, 'mermaid-injection.md');
    const fixtureContent = fs.readFileSync(fixturePath, 'utf8');

    it('renders mermaid diagrams without executing injected scripts or click callbacks', async () => {
      const { container } = render(<MarkdownViewer content={fixtureContent} />);

      await waitFor(
        () => {
          const loading = container.querySelectorAll('[data-testid="mermaid-loading"]');
          expect(loading.length).toBe(0);
        },
        { timeout: 8000 }
      );

      // Verify no script tags exist inside SVG containers
      const svgScripts = container.querySelectorAll('.mermaid-svg-wrapper script');
      expect(svgScripts.length).toBe(0);

      // Verify no javascript: or data: hrefs in SVG links
      const svgLinks = container.querySelectorAll('.mermaid-svg-wrapper a');
      for (const link of Array.from(svgLinks)) {
        const href = link.getAttribute('href') || link.getAttribute('xlink:href') || '';
        expect(href).not.toMatch(/javascript:/i);
        expect(href).not.toMatch(/data:text\/html/i);
      }

      expect((window as any).__malicious_executed).toBeUndefined();
    }, 10000);

    it('neutralizes malicious callback functions in Mermaid definitions', async () => {
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const maliciousMermaid = `
flowchart TD
  NodeA[Legitimate Node] --> NodeB[Target Node]
  click NodeA "javascript:alert('pwned')" "Malicious Link"
  click NodeB call alert() "Malicious Callback"
      `;

      const { container } = render(<MermaidBlock rawCode={maliciousMermaid} />);

      await waitFor(
        () => {
          const loading = container.querySelector('[data-testid="mermaid-loading"]');
          expect(loading).toBeNull();
        },
        { timeout: 6000 }
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg?.innerHTML).not.toContain('<script');
      expect(svg?.innerHTML).not.toMatch(/javascript:/i);
      expect((window as any).__malicious_executed).toBeUndefined();
      expect(alertMock).not.toHaveBeenCalled();
      alertMock.mockRestore();
    }, 10000);
  });

  describe('Pathological Deep Nesting Corpus (dos-corpus / deep-nesting-dos.md)', () => {
    const fixturePath = path.join(fixturesDir, 'deep-nesting-dos.md');
    const fixtureContent = fs.readFileSync(fixturePath, 'utf8');

    it('renders 120-level blockquotes, 100-level lists, and oversized line within bounded time (AC 4)', () => {
      const startTime = performance.now();

      const { container } = render(<MarkdownViewer content={fixtureContent} />);

      const elapsed = performance.now() - startTime;
      expect(elapsed).toBeLessThan(1000); // Must finish within 1 second

      // Verify deeply nested list item is in DOM
      expect(screen.getByText('Level 100 deep target')).toBeInTheDocument();

      // Verify blockquote rendered
      expect(screen.getByText(/Nested text at level 120/)).toBeInTheDocument();

      // Verify trailing content rendered after pathological structures
      expect(screen.getByText(/This text follows the pathological structures/)).toBeInTheDocument();
      expect(container.querySelector('.markdown-content')).toBeInTheDocument();
    });
  });
});
