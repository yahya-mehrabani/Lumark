import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { Root as HastRoot } from 'hast';
import { MarkdownViewer } from '../rendering/MarkdownViewer';
import {
  getActiveDirectionPreference,
  setActiveDirectionPreference,
  resetDirectionPreference,
  subscribeDirectionPreference,
} from './directionPreferences';
import { rehypeDirectionResolver } from './resolver';

describe('US-019.2: User Direction Preference & Document Fallback (FR-DIR-004)', () => {
  beforeEach(() => {
    resetDirectionPreference();
  });

  describe('1. Preference Store & Reactive Subscriptions', () => {
    it('defaults active direction preference to "auto"', () => {
      expect(getActiveDirectionPreference()).toBe('auto');
    });

    it('updates active preference to "rtl" and "ltr"', () => {
      setActiveDirectionPreference('rtl');
      expect(getActiveDirectionPreference()).toBe('rtl');

      setActiveDirectionPreference('ltr');
      expect(getActiveDirectionPreference()).toBe('ltr');
    });

    it('notifies subscribers upon preference change', () => {
      const history: string[] = [];
      const unsubscribe = subscribeDirectionPreference((pref) => history.push(pref));

      setActiveDirectionPreference('rtl');
      setActiveDirectionPreference('ltr');
      setActiveDirectionPreference('auto');

      unsubscribe();
      setActiveDirectionPreference('rtl');

      expect(history).toEqual(['rtl', 'ltr', 'auto']);
    });
  });

  describe('2. RehypeDirectionResolver Preference Evaluation on AST Nodes', () => {
    it('applies dir="rtl" to neutral block when user preference is "rtl"', () => {
      const plugin = rehypeDirectionResolver({ userPreference: 'rtl' });
      const tree: HastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'p',
            properties: {},
            children: [{ type: 'text', value: '1234567890' }],
          },
          {
            type: 'element',
            tagName: 'p',
            properties: {},
            children: [{ type: 'text', value: '--- © 2026 ---' }],
          },
        ],
      };

      plugin(tree);

      expect((tree.children[0] as any).properties.dir).toBe('rtl');
      expect((tree.children[1] as any).properties.dir).toBe('rtl');
    });

    it('applies dir="ltr" to neutral block when user preference is "ltr"', () => {
      const plugin = rehypeDirectionResolver({ userPreference: 'ltr' });
      const tree: HastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'p',
            properties: {},
            children: [{ type: 'text', value: '1234567890' }],
          },
        ],
      };

      plugin(tree);

      expect((tree.children[0] as any).properties.dir).toBe('ltr');
    });

    it('applies dir="auto" to neutral block when user preference is "auto"', () => {
      const plugin = rehypeDirectionResolver({ userPreference: 'auto' });
      const tree: HastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'p',
            properties: {},
            children: [{ type: 'text', value: '1234567890' }],
          },
        ],
      };

      plugin(tree);

      expect((tree.children[0] as any).properties.dir).toBe('auto');
    });

    it('auto-detection with strong characters takes precedence over user preference', () => {
      const pluginRtl = rehypeDirectionResolver({ userPreference: 'rtl' });
      const tree: HastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'p',
            properties: {},
            children: [{ type: 'text', value: 'English text starting with Latin strong letter.' }],
          },
          {
            type: 'element',
            tagName: 'p',
            properties: {},
            children: [{ type: 'text', value: 'متن فارسی با شروع حرف قوی راست‌به‌چپ.' }],
          },
        ],
      };

      pluginRtl(tree);

      // Strong character blocks keep dir="auto" so browser UBA resolves based on first strong char
      expect((tree.children[0] as any).properties.dir).toBe('auto');
      expect((tree.children[1] as any).properties.dir).toBe('auto');
    });

    it('explicit HTML author markup overrides user preference', () => {
      const plugin = rehypeDirectionResolver({ userPreference: 'rtl' });
      const tree: HastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'p',
            properties: { dir: 'ltr' },
            children: [{ type: 'text', value: '12345' }],
          },
        ],
      };

      plugin(tree);

      expect((tree.children[0] as any).properties.dir).toBe('ltr');
    });

    it('scoped CSS class direction overrides user preference', () => {
      const plugin = rehypeDirectionResolver({ userPreference: 'rtl' });
      const tree: HastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'style',
            properties: {},
            children: [{ type: 'text', value: '.force-ltr { direction: ltr; }' }],
          },
          {
            type: 'element',
            tagName: 'p',
            properties: { className: ['force-ltr'] },
            children: [{ type: 'text', value: '12345' }],
          },
        ],
      };

      plugin(tree);

      expect((tree.children[1] as any).properties.dir).toBe('ltr');
    });

    it('non-prose elements remain strictly dir="ltr" under RTL user preference', () => {
      const plugin = rehypeDirectionResolver({ userPreference: 'rtl' });
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
                children: [{ type: 'text', value: '12345' }],
              },
            ],
          },
          {
            type: 'element',
            tagName: 'span',
            properties: { className: ['katex'] },
            children: [{ type: 'text', value: '12345' }],
          },
        ],
      };

      plugin(tree);

      const pre = tree.children[0] as any;
      expect(pre.properties.dir).toBe('ltr');
      expect(pre.children[0].properties.dir).toBe('ltr');
      expect((tree.children[1] as any).properties.dir).toBe('ltr');
    });
  });

  describe('3. MarkdownViewer End-to-End DOM Integration', () => {
    it('aligns neutral blocks to the right when user preference is RTL (AC 1)', () => {
      setActiveDirectionPreference('rtl');
      const md = '1234567890';

      const { container } = render(<MarkdownViewer content={md} />);
      const content = screen.getByTestId('markdown-content');
      expect(content).toHaveAttribute('dir', 'rtl');

      const p = container.querySelector('p');
      expect(p).toHaveAttribute('dir', 'rtl');
    });

    it('aligns neutral blocks to the left when user preference is LTR (AC 2)', () => {
      setActiveDirectionPreference('ltr');
      const md = '1234567890';

      const { container } = render(<MarkdownViewer content={md} />);
      const content = screen.getByTestId('markdown-content');
      expect(content).toHaveAttribute('dir', 'ltr');

      const p = container.querySelector('p');
      expect(p).toHaveAttribute('dir', 'ltr');
    });

    it('supports directionPreference prop directly on MarkdownViewer', () => {
      const md = '987654321';
      const { container } = render(<MarkdownViewer content={md} directionPreference="rtl" />);

      const content = screen.getByTestId('markdown-content');
      expect(content).toHaveAttribute('dir', 'rtl');

      const p = container.querySelector('p');
      expect(p).toHaveAttribute('dir', 'rtl');
    });

    it('code blocks remain strictly LTR even when user preference is RTL (AC 3)', () => {
      setActiveDirectionPreference('rtl');
      const md = `
12345

\`\`\`python
def greet():
    print("12345 -> hello")
\`\`\`
      `;

      render(<MarkdownViewer content={md} />);
      const codeContainer = screen.getByTestId('code-block-container');
      expect(codeContainer).toHaveAttribute('dir', 'ltr');
    });

    it('dynamically responds to setActiveDirectionPreference updates', () => {
      const md = '99999999';
      const { rerender, container } = render(<MarkdownViewer content={md} />);

      const content = screen.getByTestId('markdown-content');
      expect(content).not.toHaveAttribute('dir');

      act(() => {
        setActiveDirectionPreference('rtl');
      });

      rerender(<MarkdownViewer content={md} />);
      expect(content).toHaveAttribute('dir', 'rtl');
      expect(container.querySelector('p')).toHaveAttribute('dir', 'rtl');

      act(() => {
        setActiveDirectionPreference('ltr');
      });

      rerender(<MarkdownViewer content={md} />);
      expect(content).toHaveAttribute('dir', 'ltr');
      expect(container.querySelector('p')).toHaveAttribute('dir', 'ltr');
    });
  });
});
