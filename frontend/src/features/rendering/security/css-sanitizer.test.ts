import { describe, it, expect } from 'vitest';
import {
  sanitizeCss,
  sanitizeInlineStyle,
  rehypeScopedCss,
  DEFAULT_SCOPE_SELECTOR,
} from './cssSanitizer';
import type { Root as HastRoot } from 'hast';

describe('AST-Based CSS Sanitizer & Selector Scoper (US-015.2)', () => {
  describe('Selector Scoping', () => {
    it('prepends .markdown-content to class selectors', () => {
      const input = '.sidebar { color: blue; }';
      const output = sanitizeCss(input);
      expect(output).toBe('.markdown-content .sidebar { color: blue; }');
    });

    it('scopes multi-selector rules separated by commas', () => {
      const input = 'h1, h2, .custom-text { font-weight: bold; }';
      const output = sanitizeCss(input);
      expect(output).toBe('.markdown-content h1, .markdown-content h2, .markdown-content .custom-text { font-weight: bold; }');
    });

    it('rewrites body, html, and :root selectors to .markdown-content', () => {
      const input = 'body { font-size: 14px; } html { line-height: 1.5; } :root { color: #333; }';
      const output = sanitizeCss(input);
      expect(output).toContain('.markdown-content { font-size: 14px; }');
      expect(output).toContain('.markdown-content { line-height: 1.5; }');
      expect(output).toContain('.markdown-content { color: #333; }');
    });

    it('prevents styles from escaping container by scoping chrome selectors', () => {
      const input = '.tab-bar { display: none; } #window-title { color: red; }';
      const output = sanitizeCss(input);
      expect(output).toContain('.markdown-content .tab-bar');
      expect(output).toContain('.markdown-content #window-title');
      expect(output).not.toMatch(/^\.tab-bar/);
    });

    it('supports custom container selector prefix', () => {
      const input = '.box { padding: 10px; }';
      const output = sanitizeCss(input, '.custom-viewport');
      expect(output).toBe('.custom-viewport .box { padding: 10px; }');
    });
  });

  describe('At-Rules and Overlay Neutralization', () => {
    it('completely strips @import at-rules (AC 6)', () => {
      const input = '@import url("http://evil.com/style.css"); .safe { color: red; }';
      const output = sanitizeCss(input);
      expect(output).not.toContain('@import');
      expect(output).not.toContain('evil.com');
      expect(output).toBe('.markdown-content .safe { color: red; }');
    });

    it('strips @font-face and @keyframes at-rules', () => {
      const input = `
@font-face { font-family: "EvilFont"; src: url("http://evil.com/font.woff"); }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.my-card { margin: 10px; }
`;
      const output = sanitizeCss(input);
      expect(output).not.toContain('@font-face');
      expect(output).not.toContain('@keyframes');
      expect(output).toBe('.markdown-content .my-card { margin: 10px; }');
    });

    it('converts position: fixed to position: absolute to prevent viewport overlays (AC 5)', () => {
      const input = '.overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; }';
      const output = sanitizeCss(input);
      expect(output).not.toContain('position: fixed');
      expect(output).toContain('position: absolute');
      expect(output).toContain('.markdown-content .overlay');
    });

    it('strips position: sticky', () => {
      const input = '.sticky-elem { position: sticky; top: 10px; }';
      const output = sanitizeCss(input);
      expect(output).not.toContain('position: sticky');
      expect(output).toContain('top: 10px');
    });

    it('clamps excessive z-index declarations to max 10', () => {
      const input = '.high-z { z-index: 999999; } .low-z { z-index: 5; }';
      const output = sanitizeCss(input);
      expect(output).toContain('z-index: 10');
      expect(output).toContain('z-index: 5');
      expect(output).not.toContain('999999');
    });

    it('strips remote url() declarations from background images', () => {
      const input = '.leak { background-image: url("http://evil.com/track.png"); color: green; }';
      const output = sanitizeCss(input);
      expect(output).not.toContain('background-image');
      expect(output).not.toContain('evil.com');
      expect(output).toContain('color: green');
    });

    it('strips executable expressions, javascript: and -moz-binding', () => {
      const input = `
.xss {
  width: expression(alert(1));
  background: url("javascript:alert(2)");
  behavior: url(evil.htc);
  -moz-binding: url("http://evil.com/xbl");
  color: black;
}
`;
      const output = sanitizeCss(input);
      expect(output).not.toContain('expression');
      expect(output).not.toContain('javascript');
      expect(output).not.toContain('behavior');
      expect(output).not.toContain('-moz-binding');
      expect(output).toContain('.markdown-content .xss');
      expect(output).toContain('color: black');
    });

    it('removes rule completely if all declarations are stripped', () => {
      const input = '.empty-threat { @import url("evil.css"); behavior: url(x); position: sticky; }';
      const output = sanitizeCss(input);
      expect(output).toBe('');
    });
  });

  describe('Inline Style Sanitization', () => {
    it('sanitizes inline styles and neutralizes position: fixed', () => {
      const input = 'color: red; position: fixed; top: 0; font-weight: bold;';
      const output = sanitizeInlineStyle(input);
      expect(output).toContain('color: red');
      expect(output).toContain('position: absolute');
      expect(output).toContain('top: 0');
      expect(output).toContain('font-weight: bold');
      expect(output).not.toContain('fixed');
    });

    it('strips url() declarations and clamps z-index from inline styles', () => {
      const input = 'background-image: url("http://evil.com/tracker.png"); z-index: 5000; color: purple;';
      const output = sanitizeInlineStyle(input);
      expect(output).not.toContain('background-image');
      expect(output).toContain('z-index: 10');
      expect(output).toContain('color: purple');
    });

    it('returns empty string for invalid inline styles', () => {
      expect(sanitizeInlineStyle('')).toBe('');
      expect(sanitizeInlineStyle('   ')).toBe('');
      expect(sanitizeInlineStyle('position: sticky;')).toBe('');
    });
  });

  describe('Graceful Degradation on Malformed CSS (AC 7 & AUD-010)', () => {
    it('returns empty string for malformed or unparseable CSS without throwing', () => {
      expect(() => sanitizeCss('div { unclosed syntax !! @@##')).not.toThrow();
      expect(sanitizeCss('div { unclosed syntax !! @@##')).toBe('');
    });

    it('returns empty string for empty or non-string inputs', () => {
      expect(sanitizeCss('')).toBe('');
      expect(sanitizeCss('   \n  ')).toBe('');
    });
  });

  describe('Rehype Plugin Transform (rehypeScopedCss)', () => {
    it('transforms <style> tags and inline style attributes in Hast tree', () => {
      const tree: HastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'style',
            properties: {},
            children: [
              {
                type: 'text',
                value: '.banner { color: red; position: fixed; }',
              },
            ],
          },
          {
            type: 'element',
            tagName: 'div',
            properties: {
              className: ['my-div'],
              style: 'color: blue; z-index: 999;',
            },
            children: [],
          },
        ],
      };

      const plugin = rehypeScopedCss();
      plugin(tree);

      const styleNode = tree.children[0] as any;
      expect(styleNode.children[0].value).toBe(
        `${DEFAULT_SCOPE_SELECTOR} .banner { color: red; position: absolute; }`
      );

      const divNode = tree.children[1] as any;
      expect(divNode.properties.style).toBe('color: blue; z-index: 10');
    });
  });
});
