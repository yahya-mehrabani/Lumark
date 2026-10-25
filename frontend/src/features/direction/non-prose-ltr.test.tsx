import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Root as HastRoot } from 'hast';
import { MarkdownViewer } from '../rendering/MarkdownViewer';
import {
  rehypeDirectionResolver,
  isNonProseNode,
  NON_PROSE_TAGS,
  NON_PROSE_CLASSES,
} from './resolver';

describe('US-019.1: Enforce LTR on Non-Prose AST Nodes (FR-DIR-005)', () => {
  describe('1. AST Helper & Tag Class Classification', () => {
    it('identifies pre, code, and math as non-prose tags', () => {
      expect(NON_PROSE_TAGS.has('pre')).toBe(true);
      expect(NON_PROSE_TAGS.has('code')).toBe(true);
      expect(NON_PROSE_TAGS.has('math')).toBe(true);
      expect(NON_PROSE_TAGS.has('p')).toBe(false);
      expect(NON_PROSE_TAGS.has('h1')).toBe(false);
    });

    it('identifies math, katex, mermaid, and code container classes as non-prose', () => {
      expect(NON_PROSE_CLASSES.has('math')).toBe(true);
      expect(NON_PROSE_CLASSES.has('math-inline')).toBe(true);
      expect(NON_PROSE_CLASSES.has('math-display')).toBe(true);
      expect(NON_PROSE_CLASSES.has('katex')).toBe(true);
      expect(NON_PROSE_CLASSES.has('katex-display')).toBe(true);
      expect(NON_PROSE_CLASSES.has('mermaid')).toBe(true);
      expect(NON_PROSE_CLASSES.has('mermaid-container')).toBe(true);
      expect(NON_PROSE_CLASSES.has('code-block-container')).toBe(true);
    });

    it('isNonProseNode returns true for non-prose HAST elements', () => {
      expect(isNonProseNode({ type: 'element', tagName: 'pre', properties: {}, children: [] })).toBe(true);
      expect(isNonProseNode({ type: 'element', tagName: 'code', properties: {}, children: [] })).toBe(true);
      expect(isNonProseNode({ type: 'element', tagName: 'span', properties: { className: ['katex'] }, children: [] })).toBe(true);
      expect(isNonProseNode({ type: 'element', tagName: 'div', properties: { className: ['mermaid-container'] }, children: [] })).toBe(true);
      expect(isNonProseNode({ type: 'element', tagName: 'p', properties: {}, children: [] })).toBe(false);
    });
  });

  describe('2. RehypeDirectionResolver AST Transformation', () => {
    it('assigns dir="ltr" to pre and code elements in HAST tree', () => {
      const plugin = rehypeDirectionResolver();
      const tree: HastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'pre',
            properties: {},
            children: [
              {
                type: 'element',
                tagName: 'code',
                properties: {},
                children: [{ type: 'text', value: 'fmt.Println("Hello, World!")' }],
              },
            ],
          },
        ],
      };

      plugin(tree);

      const pre = tree.children[0] as any;
      expect(pre.properties.dir).toBe('ltr');
      expect(pre.children[0].properties.dir).toBe('ltr');
    });

    it('assigns dir="ltr" to math and diagram elements in HAST tree', () => {
      const plugin = rehypeDirectionResolver();
      const tree: HastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'span',
            properties: { className: ['math', 'math-inline'] },
            children: [{ type: 'text', value: 'E = mc^2' }],
          },
          {
            type: 'element',
            tagName: 'div',
            properties: { className: ['math', 'math-display'] },
            children: [{ type: 'text', value: '\\int f(x) dx' }],
          },
          {
            type: 'element',
            tagName: 'div',
            properties: { className: ['mermaid-container'] },
            children: [{ type: 'text', value: 'graph TD; A-->B;' }],
          },
        ],
      };

      plugin(tree);

      expect((tree.children[0] as any).properties.dir).toBe('ltr');
      expect((tree.children[1] as any).properties.dir).toBe('ltr');
      expect((tree.children[2] as any).properties.dir).toBe('ltr');
    });

    it('enforces LTR on non-prose nodes even when nested inside an explicit RTL container', () => {
      const plugin = rehypeDirectionResolver();
      const tree: HastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'div',
            properties: { dir: 'rtl' },
            children: [
              {
                type: 'element',
                tagName: 'pre',
                properties: {},
                children: [
                  {
                    type: 'element',
                    tagName: 'code',
                    properties: {},
                    children: [{ type: 'text', value: 'const x = 42;' }],
                  },
                ],
              },
            ],
          },
        ],
      };

      plugin(tree);

      const container = tree.children[0] as any;
      expect(container.properties.dir).toBe('rtl');
      const pre = container.children[0];
      expect(pre.properties.dir).toBe('ltr');
      expect(pre.children[0].properties.dir).toBe('ltr');
    });

    it('enforces LTR on inline code within an auto-directed RTL paragraph', () => {
      const plugin = rehypeDirectionResolver();
      const tree: HastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'p',
            properties: {},
            children: [
              { type: 'text', value: 'متن فارسی با دستور ' },
              {
                type: 'element',
                tagName: 'code',
                properties: {},
                children: [{ type: 'text', value: 'git commit -m "feat"' }],
              },
              { type: 'text', value: ' ادامه دارد.' },
            ],
          },
        ],
      };

      plugin(tree);

      const p = tree.children[0] as any;
      expect(p.properties.dir).toBe('auto');
      const code = p.children[1];
      expect(code.properties.dir).toBe('ltr');
    });
  });

  describe('3. End-to-End MarkdownViewer DOM Verification', () => {
    it('renders fenced code block with strict LTR isolation and dir="ltr"', () => {
      const md = `
# عنوان فارسی

این یک پاراگراف به زبان فارسی است.

\`\`\`go
package main

import "fmt"

func main() {
    fmt.Println("سلام دنیا! x = 10 > 5")
}
\`\`\`
      `;

      render(<MarkdownViewer content={md} />);
      const codeBlockContainer = screen.getByTestId('code-block-container');
      expect(codeBlockContainer).toBeInTheDocument();
      expect(codeBlockContainer.getAttribute('dir')).toBe('ltr');

      const codeScroll = screen.getByTestId('code-scroll-container');
      expect(codeScroll.getAttribute('dir')).toBe('ltr');
    });

    it('renders inline code inside Persian text with explicit dir="ltr"', () => {
      const md = 'برای اجرای آزمون‌ها، دستور `npm run test:unit` را وارد کنید.';
      const { container } = render(<MarkdownViewer content={md} />);

      const p = container.querySelector('p');
      expect(p).toHaveAttribute('dir', 'auto');

      const code = container.querySelector('code');
      expect(code).toBeInTheDocument();
      expect(code).toHaveAttribute('dir', 'ltr');
      expect(code).toHaveTextContent('npm run test:unit');
    });

    it('renders KaTeX inline formula with dir="ltr" in Persian context', () => {
      const md = 'معادله مشهور اینشتین به صورت $E = mc^2$ تعریف می‌شود.';
      const { container } = render(<MarkdownViewer content={md} />);

      const p = container.querySelector('p');
      expect(p).toHaveAttribute('dir', 'auto');

      const katexSpan = container.querySelector('.katex');
      expect(katexSpan).toBeInTheDocument();
      expect(katexSpan).toHaveAttribute('dir', 'ltr');
    });

    it('renders KaTeX display equation with dir="ltr" in RTL section', () => {
      const md = `
## فرمول ریاضی

$$
f(x) = \\int_{-\\infty}^\\infty g(t) dt
$$
      `;

      const { container } = render(<MarkdownViewer content={md} />);
      const displayMath = container.querySelector('.katex-display');
      expect(displayMath).toBeInTheDocument();
      expect(displayMath).toHaveAttribute('dir', 'ltr');
    });

    it('renders Mermaid diagram with dir="ltr" inside Persian document', async () => {
      const md = `
# معماری سیستم

\`\`\`mermaid
graph TD
    A[شروع] --> B[پردازش]
    B --> C[پایان]
\`\`\`
      `;

      render(<MarkdownViewer content={md} />);
      const mermaidContainer = await screen.findByTestId('mermaid-container');
      expect(mermaidContainer).toBeInTheDocument();
      expect(mermaidContainer.getAttribute('dir')).toBe('ltr');
    });

    it('isolates code block inside explicit dir="rtl" blockquote', () => {
      const md = `
<blockquote dir="rtl">
متن داخل نقل قول راست‌به‌چپ:

\`\`\`python
def calculate_total(items):
    return sum(item.price for item in items)
\`\`\`
</blockquote>
      `;

      render(<MarkdownViewer content={md} />);
      const codeBlockContainer = screen.getByTestId('code-block-container');
      expect(codeBlockContainer).toHaveAttribute('dir', 'ltr');
    });
  });
});
